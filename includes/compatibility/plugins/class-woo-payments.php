<?php
/**
 * WooPayments (woocommerce-payments) compatibility.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility\Plugins;

use MixMax\BoxBuilder\Cart\Container_Products;
use MixMax\BoxBuilder\Compatibility\Integration;
use MixMax\BoxBuilder\Currency;

defined( 'ABSPATH' ) || exit;

/**
 * WooPayments brings Multi-Currency and express checkout (Apple Pay, Google Pay, Link).
 *
 * - A box line is priced by this plugin, in the shopper's currency, from product prices
 *   WooPayments has already converted. WooPayments must not convert that price again.
 * - Amounts a merchant typed into a campaign (fixed discount, box price, gift wrap fee) are
 *   in the store currency and are converted the way WooPayments converts the products.
 * - Product lists are cached with their prices, so the cache is kept per currency.
 * - A box is built in the builder, so its hidden container product gets no express button.
 */
final class Woo_Payments extends Integration {
	/** In-memory product meta that marks a price this plugin has already set. Never saved. */
	const PRICED = '_mmbb_price_final';

	/**
	 * Whether WooPayments is active.
	 *
	 * @return bool
	 */
	public function is_active() {
		return class_exists( 'WC_Payments' );
	}

	/** Add the hooks. */
	public function register() {
		add_filter( 'mmbb_convert_amount', array( $this, 'convert_amount' ), 10, 2 );
		add_filter( 'mmbb_products_cache_context', array( $this, 'cache_context' ) );
		add_action( 'woocommerce_before_calculate_totals', array( $this, 'mark_priced_lines' ), 30 );
		add_filter( 'wcpay_multi_currency_should_convert_product_price', array( $this, 'should_convert_product_price' ), 20, 2 );
		add_filter( 'wcpay_payment_request_is_product_supported', array( $this, 'is_product_supported' ), 20, 2 );
	}

	/**
	 * The Multi-Currency service, but only while it is converting prices in this request.
	 *
	 * WooPayments converts on the storefront and Store API only (not in wp-admin), so
	 * campaign amounts follow the same rule: converted exactly when the products are.
	 *
	 * @return object|null
	 */
	private function converting() {
		if ( ! function_exists( 'WC_Payments_Multi_Currency' ) || ! class_exists( '\WCPay\MultiCurrency\MultiCurrency' ) || ! \WCPay\MultiCurrency\MultiCurrency::is_enabled() ) {
			return null;
		}
		try {
			$multi_currency = \WC_Payments_Multi_Currency();
			$prices         = $multi_currency->get_frontend_prices();
		} catch ( \Throwable $error ) {
			return null;
		}
		if ( false === has_filter( 'woocommerce_product_get_price', array( $prices, 'get_product_price_string' ) ) ) {
			return null;
		}
		return $multi_currency;
	}

	/**
	 * Convert a store-currency campaign amount the way WooPayments converts product prices.
	 *
	 * @param int|float|string $amount Amount in the store currency.
	 * @param string           $kind   price, discount or fee.
	 * @return int|float|string
	 */
	public function convert_amount( $amount, $kind ) {
		$multi_currency = $this->converting();
		if ( null === $multi_currency || ! is_numeric( $amount ) ) {
			return $amount;
		}
		// Box prices follow product rounding and charm pricing. Discounts and fees are plain rounded amounts, like coupons.
		$type = Currency::PRICE === $kind ? 'product' : 'coupon';
		try {
			return $multi_currency->get_price( (float) $amount, $type );
		} catch ( \Throwable $error ) {
			return $amount;
		}
	}

	/**
	 * Keep cached product lists apart per currency.
	 *
	 * @param string $context Cache context from other integrations.
	 * @return string
	 */
	public function cache_context( $context ) {
		$multi_currency = $this->converting();
		if ( null === $multi_currency ) {
			return $context;
		}
		try {
			return $context . '|currency:' . $multi_currency->get_selected_currency()->get_code();
		} catch ( \Throwable $error ) {
			return $context;
		}
	}

	/**
	 * Mark every box line once its price is set, so WooPayments leaves that price alone.
	 *
	 * Runs after this plugin has priced the cart. The price it set already comes from
	 * converted product prices, and converting it a second time would multiply it.
	 *
	 * @param \WC_Cart $cart Cart.
	 */
	public function mark_priced_lines( $cart ) {
		if ( ! $cart instanceof \WC_Cart ) {
			return;
		}
		foreach ( $cart->get_cart() as $line ) {
			if ( ( isset( $line['mmbb_box'] ) || isset( $line['mmbb_parent'] ) ) && isset( $line['data'] ) && $line['data'] instanceof \WC_Product ) {
				$line['data']->update_meta_data( self::PRICED, 'yes' );
			}
		}
	}

	/**
	 * Tell Multi-Currency not to convert a price this plugin already set.
	 *
	 * @param bool        $convert Whether to convert.
	 * @param \WC_Product $product Product.
	 * @return bool
	 */
	public function should_convert_product_price( $convert, $product ) {
		if ( ! $convert || ! $product instanceof \WC_Product ) {
			return $convert;
		}
		if ( Container_Products::is_container( $product ) || 'yes' === $product->get_meta( self::PRICED ) ) {
			return false;
		}
		return $convert;
	}

	/**
	 * A box is built in the builder, so its container product never gets an express button.
	 *
	 * @param bool             $supported Whether the product is supported.
	 * @param \WC_Product|null $product   Product.
	 * @return bool
	 */
	public function is_product_supported( $supported, $product ) {
		if ( $product instanceof \WC_Product && Container_Products::is_container( $product ) ) {
			return false;
		}
		return $supported;
	}
}
