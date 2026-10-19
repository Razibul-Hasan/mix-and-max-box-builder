<?php
/**
 * WordPress-aware entry point to the pricing engine.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/** Quote a box using the store's currency settings, then let developers filter it. */
final class Quotes {
	/**
	 * Quote a box.
	 *
	 * @param array $config  Campaign config.
	 * @param array $items   List of { product_id, variation_id, qty, unit_price_minor }.
	 * @param array $options { size, gift_wrap, decimals }. Decimals default to the store's.
	 * @return array See Pricing::quote().
	 */
	public static function quote( array $config, array $items, array $options = array() ) {
		if ( ! isset( $options['decimals'] ) && function_exists( 'wc_get_price_decimals' ) ) {
			$options['decimals'] = wc_get_price_decimals();
		}

		$quote = Pricing::quote( $config, $items, $options );

		/**
		 * Filter a box quote. Amounts are integer minor units.
		 *
		 * @param array $quote   The quote from the pricing engine.
		 * @param array $config  Campaign config.
		 * @param array $items   Items in the box.
		 * @param array $options Quote options.
		 */
		$filtered = apply_filters( 'mmbb_pricing_quote', $quote, $config, $items, $options );
		return is_array( $filtered ) ? $filtered : $quote;
	}
}
