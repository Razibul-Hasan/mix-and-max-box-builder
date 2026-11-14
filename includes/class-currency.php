<?php
/**
 * Money amounts a merchant typed, moved into the shopper's currency.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Campaign amounts (fixed discounts, box prices, fees) are typed in the store currency.
 * Product prices, on the other hand, come from WooCommerce already in the shopper's
 * currency when a multi-currency plugin is active. This class is the one place where
 * the two meet, so a compatibility integration only has to hook `mmbb_convert_amount`.
 */
final class Currency {
	/** A price the shopper pays for a whole box (box price, bundle price). */
	const PRICE = 'price';

	/** An amount taken off the box (fixed amount discount). */
	const DISCOUNT = 'discount';

	/** An amount added to the box (gift wrap fee). */
	const FEE = 'fee';

	/**
	 * Move one store-currency amount into the shopper's currency.
	 *
	 * @param int|float|string $amount Amount in the store currency.
	 * @param string           $kind   One of the class constants.
	 * @return int|float|string The amount to use. Unchanged when no integration converts it.
	 */
	public static function convert( $amount, $kind ) {
		/**
		 * Convert a store-currency amount from a campaign into the shopper's currency.
		 *
		 * Multi-currency integrations hook this. Return the amount unchanged when
		 * prices are not being converted in the current request.
		 *
		 * @param int|float|string $amount Amount in the store currency.
		 * @param string           $kind   price, discount or fee.
		 */
		$converted = apply_filters( 'mmbb_convert_amount', $amount, $kind );
		return is_numeric( $converted ) ? $converted : $amount;
	}

	/**
	 * Convert every money amount in a campaign config.
	 *
	 * @param array $config Campaign config.
	 * @return array The config with its amounts in the shopper's currency.
	 */
	public static function localize_config( array $config ) {
		return self::map_amounts( $config, array( self::class, 'convert' ) );
	}

	/**
	 * Run a callback over every money amount in a config. Percentages, counts and
	 * everything else are left alone.
	 *
	 * @param array    $config   Campaign config.
	 * @param callable $callback Receives ( amount, kind ) and returns the new amount.
	 * @return array
	 */
	public static function map_amounts( array $config, $callback ) {
		foreach ( array( 'tiers', 'sizes' ) as $key ) {
			if ( empty( $config[ $key ] ) || ! is_array( $config[ $key ] ) ) {
				continue;
			}
			foreach ( $config[ $key ] as $index => $row ) {
				if ( ! is_array( $row ) || ! isset( $row['value'], $row['discount_type'] ) ) {
					continue;
				}
				if ( 'fixed_amount' === $row['discount_type'] ) {
					$config[ $key ][ $index ]['value'] = call_user_func( $callback, $row['value'], self::DISCOUNT );
				} elseif ( 'box_price' === $row['discount_type'] ) {
					$config[ $key ][ $index ]['value'] = call_user_func( $callback, $row['value'], self::PRICE );
				}
			}
		}

		if ( isset( $config['bundle']['price'] ) ) {
			$config['bundle']['price'] = call_user_func( $callback, $config['bundle']['price'], self::PRICE );
		}

		if ( isset( $config['extras']['gift_wrap']['fee'] ) ) {
			$config['extras']['gift_wrap']['fee'] = call_user_func( $callback, $config['extras']['gift_wrap']['fee'], self::FEE );
		}

		return $config;
	}
}
