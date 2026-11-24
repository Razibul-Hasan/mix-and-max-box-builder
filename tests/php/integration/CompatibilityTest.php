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
use MixMax\BoxBuilder\Compatibility\Themes\Divi;
use MixMax\BoxBuilder\Currency;
use MixMax\BoxBuilder\Quotes;
use MixMax\BoxBuilder\Settings\Settings;
use MixMax\BoxBuilder\Storefront\Payload;
use MixMax\BoxBuilder\Storefront\Renderer;

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

	/** Divi is not the test site's theme, so its integration stays off. */
	public function test_divi_is_inactive_without_the_theme() {
		$this->assertFalse( ( new Divi() )->is_active() );
	}

	/** Only a Divi Builder page gets the shortcode inside a Divi section. */
	public function test_divi_wraps_the_marker_on_builder_pages_only() {
		$divi    = new Divi();
		$plain   = self::factory()->post->create_and_get( array( 'post_type' => 'page' ) );
		$builder = self::factory()->post->create_and_get(
			array(
				'post_type'    => 'page',
				'post_content' => '[et_pb_section][/et_pb_section]',
			)
		);
		update_post_meta( $builder->ID, '_et_pb_use_builder', 'on' );

		$this->assertSame( '[mmbb_box id="9"]', $divi->page_marker( '[mmbb_box id="9"]', $plain ) );
		$this->assertSame( Divi::section( '[mmbb_box id="9"]' ), $divi->page_marker( '[mmbb_box id="9"]', $builder ) );
		$this->assertSame( Divi::section( '[mmbb_box id="9"]' ), $divi->page_marker( '<!-- wp:mmbb/box-builder {"campaignId":9} /-->', $builder ) );
	}

	/** The Divi Builder's query args and render actions count as builder requests, for editors only. */
	public function test_divi_detects_builder_requests() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );
		$this->assertFalse( Divi::is_builder_request(), 'A plain request.' );
		$this->assertFalse( Divi::is_divi_5() );

		$_GET['et_fb'] = '1';
		$this->assertTrue( Divi::is_builder_request(), 'The Visual Builder.' );
		wp_set_current_user( 0 );
		$this->assertFalse( Divi::is_builder_request(), 'A shopper who adds ?et_fb=1 gets the box.' );
		unset( $_GET['et_fb'] );

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );
		$_GET['et_pb_preview'] = 'true';
		$this->assertTrue( Divi::is_builder_request(), 'The module preview.' );
		unset( $_GET['et_pb_preview'] );

		add_filter( 'wp_doing_ajax', '__return_true' );
		$_REQUEST['action'] = 'et_fb_ajax_render_shortcode';
		$this->assertTrue( Divi::is_builder_request(), 'Divi rendering a module over admin-ajax.' );
		$_REQUEST['action'] = 'et_fb_retrieve_builder_data';
		$this->assertTrue( Divi::is_builder_request() );
		$_REQUEST['action'] = 'woocommerce_get_refreshed_fragments';
		$this->assertFalse( Divi::is_builder_request(), 'Other admin-ajax calls.' );
		remove_filter( 'wp_doing_ajax', '__return_true' );
		$_REQUEST['action'] = 'et_fb_ajax_render_shortcode';
		$this->assertFalse( Divi::is_builder_request(), 'The action counts only in admin-ajax.' );
		unset( $_REQUEST['action'] );
	}

	/** The Divi integration answers `mmbb_is_page_builder_request`, which Renderer reads. */
	public function test_divi_answers_the_builder_filter() {
		$divi = new Divi();
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );
		$this->assertFalse( Renderer::is_page_builder_request() );

		add_filter( 'mmbb_is_page_builder_request', array( $divi, 'page_builder_request' ) );
		$this->assertFalse( Renderer::is_page_builder_request() );
		$_GET['et_fb'] = '1';
		$this->assertTrue( Renderer::is_page_builder_request() );
		$this->assertTrue( $divi->page_builder_request( true ), 'Another integration\'s yes is kept.' );
		unset( $_GET['et_fb'] );
		remove_filter( 'mmbb_is_page_builder_request', array( $divi, 'page_builder_request' ) );
	}

	/** Saving a box moves its shortcode out of a Text module on its Divi Builder page, once. */
	public function test_divi_moves_the_shortcode_out_of_a_text_module_on_save() {
		$admin = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin );
		$divi    = new Divi();
		$text    = '[et_pb_section fb_built="1"][et_pb_row][et_pb_column type="4_4"][et_pb_text]<p>[mmbb_box id="7"]</p>[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]';
		$other   = '[et_pb_section][et_pb_row][et_pb_column type="4_4"][et_pb_text]<p>Hello</p>[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]';
		$builder = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => $text . $other,
			)
		);
		update_post_meta( $builder, '_et_pb_use_builder', 'on' );
		$plain = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => $text,
			)
		);

		$divi->migrate_text_module( 7, array( 'placement' => array( 'page_id' => $builder ) ) );
		$after = get_post_field( 'post_content', $builder );
		$this->assertSame( Divi::section( '[mmbb_box id="7"]' ) . $other, $after );

		$modified = get_post_field( 'post_modified_gmt', $builder );
		$divi->migrate_text_module( 7, array( 'placement' => array( 'page_id' => $builder ) ) );
		$this->assertSame( $after, get_post_field( 'post_content', $builder ), 'A second save changes nothing.' );
		$this->assertSame( $modified, get_post_field( 'post_modified_gmt', $builder ) );

		$divi->migrate_text_module( 7, array( 'placement' => array( 'page_id' => $plain ) ) );
		$this->assertSame( $text, get_post_field( 'post_content', $plain ), 'A page without the Divi Builder is left alone.' );

		$divi->migrate_text_module( 8, array( 'placement' => array( 'page_id' => $builder ) ) );
		$this->assertSame( $after, get_post_field( 'post_content', $builder ), 'Another box id is left alone.' );
	}

	/** A page made for a box gets Divi's no-sidebar layout, unless it already has a layout. */
	public function test_divi_gives_a_new_box_page_no_sidebar() {
		$divi = new Divi();
		$page = self::factory()->post->create( array( 'post_type' => 'page' ) );
		$divi->page_layout( $page );
		$this->assertSame( 'et_no_sidebar', get_post_meta( $page, '_et_pb_page_layout', true ) );

		$kept = self::factory()->post->create( array( 'post_type' => 'page' ) );
		update_post_meta( $kept, '_et_pb_page_layout', 'et_left_sidebar' );
		$divi->page_layout( $kept );
		$this->assertSame( 'et_left_sidebar', get_post_meta( $kept, '_et_pb_page_layout', true ) );
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

	/** An item line keeps its regular price in the shopper's currency once it is marked. */
	public function test_woopayments_keeps_item_list_prices_converted() {
		$convert = static function ( $price, $product ) {
			// Stands in for Multi-Currency: it skips marked products, as should_convert_product_price() says.
			if ( $product instanceof \WC_Product && 'yes' === $product->get_meta( Woo_Payments::PRICED ) ) {
				return $price;
			}
			return '' === $price ? $price : (string) round( (float) $price * 0.5, 2 );
		};
		add_filter( 'woocommerce_product_get_regular_price', $convert, 99, 2 );
		add_filter( 'woocommerce_product_get_sale_price', $convert, 99, 2 );

		$child = new \WC_Product_Simple();
		$child->set_regular_price( '20.00' );
		$child->set_sale_price( '16.00' );
		$box = new \WC_Product_Simple();
		$box->set_regular_price( '20.00' );

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
		);
		$integration = new Woo_Payments();
		$integration->mark_priced_lines( $cart );
		// A second calculation must not convert again.
		$integration->mark_priced_lines( $cart );

		$regular = $child->get_regular_price();
		$sale    = $child->get_sale_price();
		remove_filter( 'woocommerce_product_get_regular_price', $convert, 99 );
		remove_filter( 'woocommerce_product_get_sale_price', $convert, 99 );

		$this->assertSame( '10', (string) (float) $regular );
		$this->assertSame( '8', (string) (float) $sale );
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
