<?php
/**
 * Verify shared asset registration against WordPress and WooCommerce.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Assets;

/** Asset registration must leave unrelated pages unloaded. */
class AssetsTest extends \WP_UnitTestCase {
	/** Register dependencies, translations and money data without enqueueing. */
	public function test_assets_are_registered_without_enqueueing() {
		$assets = new Assets();
		$assets->register_assets();
		$this->assertTrue( wp_style_is( 'mmbb-tokens', 'registered' ) );
		$this->assertTrue( wp_style_is( 'mmbb-components', 'registered' ) );
		$this->assertFalse( wp_style_is( 'mmbb-components', 'enqueued' ) );
		$this->assertFalse( wp_style_is( 'mmbb-tokens', 'enqueued' ) );
		$this->assertTrue( wp_script_is( 'mmbb-components', 'registered' ) );
		$this->assertFalse( wp_script_is( 'mmbb-components', 'enqueued' ) );
		$this->assertSame( array( 'mmbb-tokens' ), wp_styles()->registered['mmbb-components']->deps );
		$this->assertSame( 'mix-and-max-box-builder', wp_scripts()->registered['mmbb-components']->textdomain );
		$asset = require MMBB_PATH . 'build/components.asset.php';
		$this->assertSame( $asset['version'], wp_styles()->registered['mmbb-components']->ver );
		$this->assertSame( $asset['dependencies'], wp_scripts()->registered['mmbb-components']->deps );
	}

	/** Money settings follow the store and decode HTML entities before JSON. */
	public function test_money_settings_follow_woocommerce() {
		update_option( 'woocommerce_currency', 'GBP' );
		update_option( 'woocommerce_currency_pos', 'right_space' );
		update_option( 'woocommerce_price_num_decimals', 0 );
		update_option( 'woocommerce_price_decimal_sep', ',' );
		update_option( 'woocommerce_price_thousand_sep', '.' );
		$this->assertSame(
			array(
				'symbol'            => '£',
				'position'          => 'right_space',
				'decimals'          => 0,
				'decimalSeparator'  => ',',
				'thousandSeparator' => '.',
			),
			Assets::get_money_settings()
		);
	}
}
