<?php
/**
 * Plain-text descriptions of a box, shared by the cart, the order and the add-to-cart errors.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Cart;

defined( 'ABSPATH' ) || exit;

/** Every string here is translated and returns plain text (callers escape on output). */
final class Box_Text {
	/**
	 * A translated message for an error code, with the HTTP status to answer with.
	 *
	 * @return array[] Map of code to { message, status }.
	 */
	public static function errors() {
		return array(
			'mmbb_nonce_expired'   => array(
				'message' => __( 'This page has expired. Reload it and try again.', 'mix-and-max-box-builder' ),
				'status'  => 403,
			),
			'campaign_not_found'   => array(
				'message' => __( 'That box is not available.', 'mix-and-max-box-builder' ),
				'status'  => 404,
			),
			'campaign_unavailable' => array(
				'message' => __( 'This box is not on sale right now.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'empty'                => array(
				'message' => __( 'Add some items to your box first.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'below_minimum'        => array(
				'message' => __( 'Add a few more items to reach the minimum for this box.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'over_capacity'        => array(
				'message' => __( 'That is more items than the box can hold.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'duplicate'            => array(
				'message' => __( 'Each item can go in the box only once.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'over_cap'             => array(
				'message' => __( 'You have added too many of one item.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'invalid_size'         => array(
				'message' => __( 'Choose one of the box sizes.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'wrong_count'          => array(
				'message' => __( 'Fill every slot in the box.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'foreign_product'      => array(
				'message' => __( 'One of those items is not part of this box.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'unavailable_product'  => array(
				'message' => __( 'One of those items is no longer available.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'out_of_stock'         => array(
				'message' => __( 'One of those items is out of stock.', 'mix-and-max-box-builder' ),
				'status'  => 409,
			),
			'invalid_box'          => array(
				'message' => __( 'That box cannot be added to the cart.', 'mix-and-max-box-builder' ),
				'status'  => 400,
			),
			'cart_unavailable'     => array(
				'message' => __( 'The cart is not available right now.', 'mix-and-max-box-builder' ),
				'status'  => 500,
			),
		);
	}

	/**
	 * A message for a code, falling back to the generic one.
	 *
	 * @param string $code Error code.
	 * @return array { code, message, status }.
	 */
	public static function error( $code ) {
		$all = self::errors();
		if ( ! isset( $all[ $code ] ) ) {
			$code = 'invalid_box';
		}
		return array(
			'code'    => $code,
			'message' => $all[ $code ]['message'],
			'status'  => $all[ $code ]['status'],
		);
	}

	/**
	 * Money as plain text in the store's format, for example "$3.00".
	 *
	 * @param int $minor Amount in minor units.
	 * @return string
	 */
	public static function money( $minor ) {
		return html_entity_decode( wp_strip_all_tags( wc_price( Box_Resolver::to_decimal( $minor ) ) ), ENT_QUOTES, 'UTF-8' );
	}

	/**
	 * "2 × Brown Butter Chip, 1 × Smoky Earl Grey".
	 *
	 * @param array[] $items List of { product_id, variation_id, qty }.
	 * @return string
	 */
	public static function contents( array $items ) {
		return implode( ', ', self::content_lines( $items ) );
	}

	/**
	 * One plain-text line per picked product, suitable for emails and order screens.
	 *
	 * @param array[] $items List of { product_id, variation_id, qty }.
	 * @return string[]
	 */
	public static function content_lines( array $items ) {
		$parts = array();
		foreach ( $items as $item ) {
			$product = wc_get_product( Box_Rules::key( (int) $item['product_id'], (int) $item['variation_id'] ) );
			$name    = $product instanceof \WC_Product
				? html_entity_decode( wp_strip_all_tags( $product->get_name() ), ENT_QUOTES, 'UTF-8' )
				: __( 'Item no longer sold', 'mix-and-max-box-builder' );
			/* translators: 1: quantity, 2: product name */
			$parts[] = sprintf( _x( '%1$d × %2$s', 'box item line', 'mix-and-max-box-builder' ), (int) $item['qty'], $name );
		}
		return $parts;
	}

	/**
	 * "10% (−$3.00)" for a percent tier, "−$3.00" otherwise. Empty when there is no discount.
	 *
	 * @param array $quote Quote.
	 * @return string
	 */
	public static function discount( array $quote ) {
		if ( empty( $quote['discount'] ) ) {
			return '';
		}
		$saved = '−' . self::money( $quote['discount'] );
		if ( ! empty( $quote['tier'] ) && 'percent' === $quote['tier']['discount_type'] ) {
			/* translators: 1: percent, such as 10%, 2: amount taken off, such as −$3.00 */
			return sprintf( __( '%1$s (%2$s)', 'mix-and-max-box-builder' ), self::percent( $quote['tier']['value'] ), $saved );
		}
		return $saved;
	}

	/**
	 * A percentage such as "12.5%".
	 *
	 * @param int|float $value Percent.
	 * @return string
	 */
	public static function percent( $value ) {
		$decimals = floor( (float) $value ) === (float) $value ? 0 : 2;
		/* translators: %s: a number, such as 10 or 12.5 */
		return sprintf( __( '%s%%', 'mix-and-max-box-builder' ), number_format_i18n( (float) $value, $decimals ) );
	}

	/**
	 * "Add 1 more item to get 15% off", or an empty string when no tier is left.
	 *
	 * @param array $quote Quote.
	 * @return string
	 */
	public static function nudge( array $quote ) {
		if ( empty( $quote['next'] ) ) {
			return '';
		}
		$next = $quote['next'];
		$left = (int) $next['needed'];
		if ( 'percent' === $next['discount_type'] ) {
			/* translators: %s: a percentage, such as 15% */
			$reward = sprintf( __( '%s off', 'mix-and-max-box-builder' ), self::percent( $next['value'] ) );
		} elseif ( 'fixed_amount' === $next['discount_type'] ) {
			/* translators: %s: an amount of money, such as $5.00 */
			$reward = sprintf( __( '%s off', 'mix-and-max-box-builder' ), self::money( \MixMax\BoxBuilder\Pricing::to_minor( $next['value'], wc_get_price_decimals() ) ) );
		} else {
			/* translators: %s: an amount of money, such as $20.00 */
			$reward = sprintf( __( 'a box price of %s', 'mix-and-max-box-builder' ), self::money( \MixMax\BoxBuilder\Pricing::to_minor( $next['value'], wc_get_price_decimals() ) ) );
		}
		return sprintf(
			/* translators: 1: number of items still to add, 2: the reward, such as 15% off */
			_n( 'Add %1$d more item to get %2$s', 'Add %1$d more items to get %2$s', $left, 'mix-and-max-box-builder' ),
			$left,
			$reward
		);
	}
}
