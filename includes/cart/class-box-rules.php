<?php
/**
 * Box rules that need no WordPress: merging rows, capacity, duplicates and caps. Pure PHP.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Cart;

defined( 'ABSPATH' ) || exit;

/** Checks a list of picked items against a campaign config's box rules. */
final class Box_Rules {
	/**
	 * Merge rows for the same product or variation and drop empty ones.
	 *
	 * The key is the variation id when there is one, otherwise the product id.
	 *
	 * @param array $rows List of { product_id, variation_id, qty }.
	 * @return array[] List of { product_id, variation_id, qty }, in first-seen order.
	 */
	public static function merge( array $rows ) {
		$merged = array();
		foreach ( $rows as $row ) {
			$product_id   = isset( $row['product_id'] ) ? (int) $row['product_id'] : 0;
			$variation_id = isset( $row['variation_id'] ) ? (int) $row['variation_id'] : 0;
			$qty          = isset( $row['qty'] ) ? (int) $row['qty'] : 0;
			if ( $product_id < 1 || $variation_id < 0 || $qty < 1 ) {
				continue;
			}
			$key = self::key( $product_id, $variation_id );
			if ( isset( $merged[ $key ] ) ) {
				$merged[ $key ]['qty'] += $qty;
				continue;
			}
			$merged[ $key ] = array(
				'product_id'   => $product_id,
				'variation_id' => $variation_id,
				'qty'          => $qty,
			);
		}
		return array_values( $merged );
	}

	/**
	 * The id a pick is known by in a campaign: the variation when there is one.
	 *
	 * @param int $product_id   Product id.
	 * @param int $variation_id Variation id, or 0.
	 * @return int
	 */
	public static function key( $product_id, $variation_id ) {
		return $variation_id > 0 ? (int) $variation_id : (int) $product_id;
	}

	/**
	 * The most of one product the box may hold: the box-wide limit, lowered by a per-product cap.
	 *
	 * @param array $config Campaign config.
	 * @param int   $key    Product or variation id.
	 * @return int
	 */
	public static function limit_for( array $config, $key ) {
		$box   = $config['box'];
		$limit = (int) $box['max_per_product'];
		if ( empty( $box['allow_duplicates'] ) ) {
			$limit = 1;
		}
		$caps = isset( $config['products']['caps'] ) ? $config['products']['caps'] : array();
		if ( isset( $caps[ $key ] ) ) {
			$limit = min( $limit, (int) $caps[ $key ] );
		}
		return max( 1, $limit );
	}

	/**
	 * Check merged rows against capacity, duplicates and caps.
	 *
	 * Minimum, size and count rules belong to the pricing engine, which reports them in its quote.
	 *
	 * @param array   $config Campaign config.
	 * @param array[] $rows   Merged rows (see merge()).
	 * @return string|null `over_capacity`, `duplicate` or `over_cap`; null when the rows pass.
	 */
	public static function check( array $config, array $rows ) {
		$count = 0;
		foreach ( $rows as $row ) {
			$count += (int) $row['qty'];
		}

		$capacity = (int) $config['box']['capacity'];
		if ( 'fixed' === $config['type'] ) {
			foreach ( $config['sizes'] as $size ) {
				$capacity = max( $capacity, (int) $size['qty'] );
			}
		} elseif ( 'bundle' === $config['type'] ) {
			$capacity = (int) $config['bundle']['qty'];
		}
		if ( $count > $capacity ) {
			return 'over_capacity';
		}

		foreach ( $rows as $row ) {
			$key   = self::key( $row['product_id'], $row['variation_id'] );
			$limit = self::limit_for( $config, $key );
			if ( (int) $row['qty'] > $limit ) {
				return empty( $config['box']['allow_duplicates'] ) ? 'duplicate' : 'over_cap';
			}
		}
		return null;
	}
}
