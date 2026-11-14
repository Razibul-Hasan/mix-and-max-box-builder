<?php
/**
 * Plugin and theme compatibility.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Cart\Container_Products;
use MixMax\BoxBuilder\Compatibility\Compatibility;
use MixMax\BoxBuilder\Compatibility\Integration;
use MixMax\BoxBuilder\Compatibility\Plugins\Woo_Payments;
use MixMax\BoxBuilder\Currency;
use MixMax\BoxBuilder\Quotes;
use MixMax\BoxBuilder\Settings\Settings;
use MixMax\BoxBuilder\Storefront\Payload;

require_once dirname( __DIR__, 2 ) . '/fixtures/compat/class-active-integration.php';
require_once dirname( __DIR__, 2 ) . '/fixtures/compat/class-inactive-integration.php';

/** The loader, the WooPayments integration and the currency hook. */
class CompatibilityTest extends \WP_UnitTestCase {
	/** Start each test with no registered integration. */
	public function set_up() {
		parent::set_up();
		Mmbb_Test_Active_Integration::$registered = 0;
	}

	/** Only integrations whose plugin or theme is active are registered. */
	public function test_loader_registers_only_active_integrations() {
		$filter = static function () {
			return array(
				Mmbb_Test_Active_Integration::class,
				Mmbb_Test_Inactive_Integration::class,
				'Not_A_Class',
				\stdClass::class,
			);
		};
		add_filter( 'mmbb_compatibility_integrations', $filter );
		( new Compatibility() )->load();
		remove_filter( 'mmbb_compatibility_integrations', $filter );

		$this->assertSame( 1, Mmbb_Test_Active_Integration::$registered );
	}

	/** Every shipped integration extends the base class. */
	public function test_shipped_integrations_extend_the_base_class() {
		foreach ( Compatibility::integrations() as $class ) {
			$this->assertTrue( is_subclass_of( $class, Integration::class ), $class );
		}
	}

	/** The active theme is named on the page for theme-specific style fixes. */
	public function test_body_class_names_the_active_theme() {
		$classes = ( new Compatibility() )->theme_body_classes( array() );
		$this->assertContains( 'mmbb-theme-' . sanitize_html_class( get_stylesheet() ), $classes );
	}

	/** Without a multi-currency plugin an amount passes through unchanged. */
	public function test_amount_is_unchanged_without_an_integration() {
		$this->assertSame( 5, Currency::convert( 5, Currency::DISCOUNT ) );
	}

	/** A filter result that is not a number is ignored. */
	public function test_non_numeric_filter_result_is_ignored() {
		$filter = static function () {
			return 'nope';
		};
		add_filter( 'mmbb_convert_amount', $filter );
		$this->assertSame( 5, Currency::convert( 5, Currency::FEE ) );
		remove_filter( 'mmbb_convert_amount', $filter );
	}

	/** The server quote uses the converted gift wrap fee, so it matches the converted product prices. */
	public function test_quote_uses_converted_campaign_amounts() {
		$config  = array(
			'type'   => 'tiered',
			'box'    => array(
				'capacity'  => 6,
				'min_items' => 1,
			),
			'tiers'  => array(),
			'extras' => array(
				'gift_wrap' => array(
					'enabled' => true,
					'fee'     => 3,
				),
			),
		);
		$items   = array(
			array(
				'product_id'       => 1,
				'variation_id'     => 0,
				'qty'              => 2,
				'unit_price_minor' => 1000,
			),
		);
		$options = array(
			'gift_wrap' => true,
			'decimals'  => 2,
		);

		$this->assertSame( 300, Quotes::quote( $config, $items, $options )['fee'] );

		$double = static function ( $amount ) {
			return $amount * 2;
		};
		add_filter( 'mmbb_convert_amount', $double );
		$quote = Quotes::quote( $config, $items, $options );
		remove_filter( 'mmbb_convert_amount', $double );

		$this->assertSame( 600, $quote['fee'] );
		$this->assertSame( 2600, $quote['total'] );
	}

	/** WooPayments is not installed in the test site, so its integration stays off. */
	public function test_woopayments_is_inactive_without_the_plugin() {
		$this->assertFalse( ( new Woo_Payments() )->is_active() );
	}

	/** Campaign amounts and caches are untouched when Multi-Currency is not converting. */
	public function test_woopayments_leaves_amounts_alone_without_multi_currency() {
		$integration = new Woo_Payments();
		$this->assertSame( 4.5, $integration->convert_amount( 4.5, Currency::PRICE ) );
		$this->assertSame( 'x', $integration->cache_context( 'x' ) );
	}

	/** A product with its price already set by this plugin is excluded from conversion. */
	public function test_woopayments_skips_conversion_for_boxes_and_containers() {
		$integration = new Woo_Payments();

		$plain = new \WC_Product_Simple();
		$plain->set_regular_price( '10' );
		$this->assertTrue( $integration->should_convert_product_price( true, $plain ) );
		$this->assertFalse( $integration->should_convert_product_price( false, $plain ) );

		$priced = new \WC_Product_Simple();
		$priced->update_meta_data( Woo_Payments::PRICED, 'yes' );
		$this->assertFalse( $integration->should_convert_product_price( true, $priced ) );

		$container = new \WC_Product_Simple();
		$container->update_meta_data( Container_Products::META, 7 );
		$this->assertFalse( $integration->should_convert_product_price( true, $container ) );
		$this->assertFalse( $integration->is_product_supported( true, $container ) );
		$this->assertTrue( $integration->is_product_supported( true, $plain ) );
	}

	/** Every box line in the cart is marked after pricing; other lines are not. */
	public function test_woopayments_marks_box_lines_only() {
		$box   = new \WC_Product_Simple();
		$child = new \WC_Product_Simple();
		$other = new \WC_Product_Simple();

		$cart                = new \WC_Cart();
		$cart->cart_contents = array(
			'a' => array(
				'mmbb_box' => array(),
				'data'     => $box,
			),
			'b' => array(
				'mmbb_parent' => 'a',
				'data'        => $child,
			),
			'c' => array( 'data' => $other ),
		);
		( new Woo_Payments() )->mark_priced_lines( $cart );

		$this->assertSame( 'yes', $box->get_meta( Woo_Payments::PRICED ) );
		$this->assertSame( 'yes', $child->get_meta( Woo_Payments::PRICED ) );
		$this->assertSame( '', $other->get_meta( Woo_Payments::PRICED ) );
	}

	/** Cached product lists are kept apart when an integration names a context. */
	public function test_product_cache_is_split_by_context() {
		\MixMax\BoxBuilder\Installer::install();
		update_option( Settings::OPTION, Settings::defaults() );
		$repo    = new Campaign_Repository();
		$product = new \WC_Product_Simple();
		$product->set_name( 'Cookie' );
		$product->set_regular_price( '10.00' );
		$product->set_status( 'publish' );
		$product->save();
		$created = $repo->create_from_template( 'blank', 'Cache box' );
		$repo->save( $created['id'], array( 'products' => array( 'ids' => array( $product->get_id() ) ) ) );
		$campaign = $repo->find( $created['id'] );

		$context = static function () {
			return '|currency:EUR';
		};
		add_filter( 'mmbb_products_cache_context', $context );
		Payload::products( $campaign, Settings::defaults() );
		remove_filter( 'mmbb_products_cache_context', $context );

		$base   = Payload::TRANSIENT_PREFIX . (int) $campaign['id'] . '_' . (int) get_option( Payload::GENERATION_OPTION, 0 );
		$suffix = '_' . substr( md5( '|currency:EUR' ), 0, 10 );
		$this->assertIsArray( get_transient( $base . $suffix ) );
		$this->assertFalse( get_transient( $base ) );
	}
}
