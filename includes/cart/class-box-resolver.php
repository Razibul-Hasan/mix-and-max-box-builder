<?php
/**
 * Turn a shopper's picks into trusted box items: checked against the campaign and priced by WooCommerce.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Cart;

use MixMax\BoxBuilder\Campaigns\Status;
use MixMax\BoxBuilder\Pricing;
use MixMax\BoxBuilder\Quotes;

defined( 'ABSPATH' ) || exit;

/** The server's view of a box. Nothing a browser sends is trusted, least of all a price. */
final class Box_Resolver {
	/**
	 * Check picks and quote the box.
	 *
	 * @param array  $campaign    Campaign from the repository.
	 * @param array  $picks       List of { product_id, variation_id, qty } (raw numbers are fine).
	 * @param array  $options     { size: int, gift_wrap: bool }.
	 * @param string $exclude_key Cart item key whose own quantities do not count against stock (an edit or a repricing).
	 * @param int    $multiplier  How many boxes the line holds, for the stock check.
	 * @return array { error: string|null, items: array[], quote: array|null }. `error` is a code from Messages.
	 */
	public static function resolve( array $campaign, array $picks, array $options = array(), $exclude_key = '', $multiplier = 1 ) {
		$fail = static function ( $code ) {
			return array(
				'error' => $code,
				'items' => array(),
				'quote' => null,
			);
		};

		if ( ! Status::is_live( $campaign['status'] ) ) {
			return $fail( 'campaign_unavailable' );
		}
		$config = $campaign['config'];

		$rows = Box_Rules::merge( $picks );
		if ( empty( $rows ) ) {
			return $fail( 'empty' );
		}

		$allowed  = self::allowed_ids( $config );
		$in_cart  = self::cart_quantities( $exclude_key );
		$decimals = wc_get_price_decimals();
		$items    = array();

		foreach ( $rows as $row ) {
			$key = Box_Rules::key( $row['product_id'], $row['variation_id'] );
			if ( ! in_array( $key, $allowed, true ) ) {
				return $fail( 'foreign_product' );
			}

			$product = wc_get_product( $key );
			if ( ! $product instanceof \WC_Product || ! self::is_offerable( $product, $row ) ) {
				return $fail( 'unavailable_product' );
			}
			$items[] = array(
				'product_id'       => $row['variation_id'] > 0 ? (int) $product->get_parent_id() : (int) $product->get_id(),
				'variation_id'     => $row['variation_id'] > 0 ? (int) $product->get_id() : 0,
				'qty'              => (int) $row['qty'],
				'unit_price_minor' => Pricing::to_minor( $product->get_price(), $decimals ),
			);
		}

		$rule_error = Box_Rules::check( $config, $rows );
		if ( null !== $rule_error ) {
			return $fail( $rule_error );
		}

		foreach ( $items as $item ) {
			$key     = Box_Rules::key( $item['product_id'], $item['variation_id'] );
			$product = wc_get_product( $key );
			$wanted  = $item['qty'] * max( 1, (int) $multiplier ) + ( isset( $in_cart[ $key ] ) ? $in_cart[ $key ] : 0 );
			if ( ! $product->is_in_stock() || ! $product->has_enough_stock( $wanted ) ) {
				return $fail( 'out_of_stock' );
			}
		}

		$quote = Quotes::quote(
			$config,
			$items,
			array(
				'size'      => isset( $options['size'] ) ? (int) $options['size'] : 0,
				'gift_wrap' => ! empty( $options['gift_wrap'] ),
			)
		);
		if ( empty( $quote['valid'] ) ) {
			return $fail( self::quote_error( $quote ) );
		}

		return array(
			'error' => null,
			'items' => $items,
			'quote' => $quote,
		);
	}

	/**
	 * Map the pricing engine's first error to a Messages code.
	 *
	 * @param array $quote Quote.
	 * @return string
	 */
	private static function quote_error( array $quote ) {
		$known = array( 'empty', 'below_minimum', 'over_capacity', 'invalid_size', 'wrong_count' );
		$first = isset( $quote['errors'][0] ) ? $quote['errors'][0] : '';
		return in_array( $first, $known, true ) ? $first : 'invalid_box';
	}

	/**
	 * Whether a product can go in a box right now.
	 *
	 * @param \WC_Product $product Product or variation.
	 * @param array       $row     The pick (product_id, variation_id).
	 * @return bool
	 */
	private static function is_offerable( \WC_Product $product, array $row ) {
		if ( 'publish' !== $product->get_status() || ! $product->is_purchasable() ) {
			return false;
		}
		if ( $row['variation_id'] > 0 ) {
			if ( ! $product->is_type( 'variation' ) || (int) $product->get_parent_id() !== (int) $row['product_id'] ) {
				return false;
			}
			$parent = wc_get_product( $product->get_parent_id() );
			return $parent instanceof \WC_Product && 'publish' === $parent->get_status();
		}
		return $product->is_type( 'simple' ) && (int) $product->get_id() === (int) $row['product_id'];
	}

	/**
	 * Every product or variation id the campaign offers.
	 *
	 * @param array $config Campaign config.
	 * @return int[]
	 */
	public static function allowed_ids( array $config ) {
		$products = $config['products'];
		if ( 'manual' === $products['source'] ) {
			return array_map( 'intval', $products['ids'] );
		}

		$taxonomy = 'category' === $products['source'] ? 'product_cat' : 'product_tag';
		$slugs    = array();
		foreach ( $products['term_ids'] as $term_id ) {
			$term = get_term( (int) $term_id, $taxonomy );
			if ( $term instanceof \WP_Term ) {
				$slugs[] = $term->slug;
			}
		}
		if ( empty( $slugs ) ) {
			return array();
		}

		$args = array(
			'status' => 'publish',
			'type'   => array( 'simple' ),
			'limit'  => -1,
			'return' => 'ids',
		);
		if ( 'product_cat' === $taxonomy ) {
			$args['category'] = $slugs;
		} else {
			$args['tag'] = $slugs;
		}
		return array_map( 'intval', wc_get_products( $args ) );
	}

	/**
	 * Units of each product already in the cart, by product or variation id.
	 *
	 * Bundled boxes count their items times the line quantity. Item-mode headers are skipped,
	 * because their children are ordinary lines.
	 *
	 * @param string $exclude_key Cart item key to leave out, with its children.
	 * @return int[]
	 */
	public static function cart_quantities( $exclude_key = '' ) {
		$totals = array();
		if ( ! function_exists( 'WC' ) || ! WC()->cart instanceof \WC_Cart ) {
			return $totals;
		}
		foreach ( WC()->cart->get_cart() as $key => $line ) {
			if ( '' !== $exclude_key && ( $key === $exclude_key || ( isset( $line['mmbb_parent'] ) && $line['mmbb_parent'] === $exclude_key ) ) ) {
				continue;
			}
			$line_qty = isset( $line['quantity'] ) ? (int) $line['quantity'] : 0;
			if ( isset( $line['mmbb_box'] ) && is_array( $line['mmbb_box'] ) ) {
				if ( isset( $line['mmbb_box']['mode'] ) && 'items' === $line['mmbb_box']['mode'] ) {
					continue;
				}
				foreach ( (array) $line['mmbb_box']['items'] as $item ) {
					$id            = Box_Rules::key( (int) $item['product_id'], (int) $item['variation_id'] );
					$totals[ $id ] = ( isset( $totals[ $id ] ) ? $totals[ $id ] : 0 ) + (int) $item['qty'] * $line_qty;
				}
				continue;
			}
			$id            = Box_Rules::key( isset( $line['product_id'] ) ? (int) $line['product_id'] : 0, isset( $line['variation_id'] ) ? (int) $line['variation_id'] : 0 );
			$totals[ $id ] = ( isset( $totals[ $id ] ) ? $totals[ $id ] : 0 ) + $line_qty;
		}
		return $totals;
	}

	/**
	 * Convert minor units to the decimal number WooCommerce prices use.
	 *
	 * @param int $minor Amount in minor units.
	 * @return float
	 */
	public static function to_decimal( $minor ) {
		$decimals = wc_get_price_decimals();
		return round( (int) $minor / pow( 10, $decimals ), $decimals );
	}
}
