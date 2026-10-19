<?php
/**
 * The pricing engine. Pure PHP: no WordPress calls, mirrored by src/shared/pricing.js.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Quote a box. All amounts in and out are integer minor units (cents).
 *
 * Campaign config amounts (fixed discounts, box prices, fees) are store-currency
 * numbers such as 4.5, converted to minor units with the `decimals` option.
 */
final class Pricing {
	/**
	 * Price a box.
	 *
	 * @param array $config  Campaign config (see Campaigns\Config).
	 * @param array $items   List of { product_id, variation_id, qty, unit_price_minor }.
	 * @param array $options { size, gift_wrap, decimals }.
	 * @return array { valid, errors, count, subtotal, discount, fee, total, tier, next }.
	 */
	public static function quote( array $config, array $items, array $options = array() ) {
		$decimals = isset( $options['decimals'] ) ? max( 0, (int) $options['decimals'] ) : 2;
		$type     = isset( $config['type'] ) ? $config['type'] : 'tiered';

		$count    = 0;
		$subtotal = 0;
		foreach ( $items as $item ) {
			$qty = isset( $item['qty'] ) ? (int) $item['qty'] : 0;
			if ( $qty < 1 ) {
				continue;
			}
			$unit      = isset( $item['unit_price_minor'] ) ? max( 0, (int) $item['unit_price_minor'] ) : 0;
			$count    += $qty;
			$subtotal += $qty * $unit;
		}

		$errors = array();
		$tier   = null;
		$next   = null;

		if ( 'fixed' === $type ) {
			$tier = self::find_size( $config, isset( $options['size'] ) ? (int) $options['size'] : 0 );
			if ( null === $tier ) {
				$errors[] = 'invalid_size';
			} elseif ( (int) $tier['qty'] !== $count ) {
				$errors[] = 'wrong_count';
				$tier     = null;
			}
		} elseif ( 'bundle' === $type ) {
			$bundle = isset( $config['bundle'] ) ? $config['bundle'] : array();
			$qty    = isset( $bundle['qty'] ) ? (int) $bundle['qty'] : 0;
			if ( $count !== $qty ) {
				$errors[] = 'wrong_count';
			} else {
				$tier = array(
					'qty'           => $qty,
					'discount_type' => 'box_price',
					'value'         => isset( $bundle['price'] ) ? $bundle['price'] : 0,
				);
			}
		} else {
			$box      = isset( $config['box'] ) ? $config['box'] : array();
			$capacity = isset( $box['capacity'] ) ? (int) $box['capacity'] : 12;
			$minimum  = isset( $box['min_items'] ) ? (int) $box['min_items'] : 1;
			$tiers    = isset( $config['tiers'] ) ? $config['tiers'] : array();
			if ( 0 === $count ) {
				$errors[] = 'empty';
			} elseif ( $count < $minimum ) {
				$errors[] = 'below_minimum';
			} elseif ( $count > $capacity ) {
				$errors[] = 'over_capacity';
			}
			if ( $count <= $capacity ) {
				$next = self::find_next( $tiers, $count );
			}
			if ( empty( $errors ) ) {
				$tier = self::find_tier( $tiers, $count );
			}
		}

		$valid    = empty( $errors );
		$discount = 0;
		$fee      = 0;
		if ( $valid ) {
			if ( null !== $tier ) {
				$discount = self::discount( $tier['discount_type'], $tier['value'], $subtotal, $decimals );
			}
			$wrap = isset( $config['extras']['gift_wrap'] ) ? $config['extras']['gift_wrap'] : array();
			if ( ! empty( $options['gift_wrap'] ) && ! empty( $wrap['enabled'] ) ) {
				$fee = self::to_minor( isset( $wrap['fee'] ) ? $wrap['fee'] : 0, $decimals );
			}
		}

		return array(
			'valid'    => $valid,
			'errors'   => $errors,
			'count'    => $count,
			'subtotal' => $subtotal,
			'discount' => $discount,
			'fee'      => $fee,
			'total'    => $subtotal - $discount + $fee,
			'tier'     => $valid && null !== $tier ? self::pick( $tier ) : null,
			'next'     => $next,
		);
	}

	/**
	 * Convert a store-currency number to minor units, rounding half up.
	 *
	 * @param int|float $amount   Amount such as 4.5.
	 * @param int       $decimals Currency decimals.
	 * @return int
	 */
	public static function to_minor( $amount, $decimals ) {
		return max( 0, (int) floor( (float) $amount * pow( 10, $decimals ) + 0.5 ) );
	}

	/**
	 * Discount in minor units. Never exceeds the subtotal.
	 *
	 * @param string    $type     percent, fixed_amount or box_price.
	 * @param int|float $value    Percent, or store-currency amount.
	 * @param int       $subtotal Subtotal in minor units.
	 * @param int       $decimals Currency decimals.
	 * @return int
	 */
	private static function discount( $type, $value, $subtotal, $decimals ) {
		if ( 'percent' === $type ) {
			$discount = (int) floor( $subtotal * (float) $value / 100 + 0.5 );
		} elseif ( 'fixed_amount' === $type ) {
			$discount = self::to_minor( $value, $decimals );
		} else {
			$discount = $subtotal - self::to_minor( $value, $decimals );
		}
		return max( 0, min( $discount, $subtotal ) );
	}

	/**
	 * Highest tier whose quantity is at or below the count.
	 *
	 * @param array $tiers Tiers.
	 * @param int   $count Items in the box.
	 * @return array|null
	 */
	private static function find_tier( array $tiers, $count ) {
		$found = null;
		foreach ( $tiers as $tier ) {
			if ( $tier['qty'] <= $count && ( null === $found || $tier['qty'] > $found['qty'] ) ) {
				$found = $tier;
			}
		}
		return $found;
	}

	/**
	 * Lowest tier still to reach.
	 *
	 * @param array $tiers Tiers.
	 * @param int   $count Items in the box.
	 * @return array|null { qty, needed, discount_type, value }.
	 */
	private static function find_next( array $tiers, $count ) {
		$found = null;
		foreach ( $tiers as $tier ) {
			if ( $tier['qty'] > $count && ( null === $found || $tier['qty'] < $found['qty'] ) ) {
				$found = $tier;
			}
		}
		if ( null === $found ) {
			return null;
		}
		return array(
			'qty'           => (int) $found['qty'],
			'needed'        => (int) $found['qty'] - $count,
			'discount_type' => $found['discount_type'],
			'value'         => $found['value'],
		);
	}

	/**
	 * Fixed-box size by quantity.
	 *
	 * @param array $config Config.
	 * @param int   $qty    Chosen size.
	 * @return array|null
	 */
	private static function find_size( array $config, $qty ) {
		$sizes = isset( $config['sizes'] ) ? $config['sizes'] : array();
		foreach ( $sizes as $size ) {
			if ( (int) $size['qty'] === $qty ) {
				return $size;
			}
		}
		return null;
	}

	/**
	 * Reduce a tier or size to its public fields.
	 *
	 * @param array $tier Tier.
	 * @return array
	 */
	private static function pick( array $tier ) {
		return array(
			'qty'           => (int) $tier['qty'],
			'discount_type' => $tier['discount_type'],
			'value'         => $tier['value'],
		);
	}
}
