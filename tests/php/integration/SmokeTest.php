<?php
/**
 * Check the WordPress and WooCommerce test environment.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

/** WordPress and WooCommerce must both be available. */
class SmokeTest extends \WP_UnitTestCase {
	/** Verify that wp-env loaded WordPress and WooCommerce. */
	public function test_wordpress_and_woocommerce_are_loaded() {
		$this->assertTrue( function_exists( 'add_action' ) );
		$this->assertInstanceOf( \WooCommerce::class, WC() );
		$this->assertTrue( version_compare( WC_VERSION, '9.0', '>=' ) );
		if ( '1' === getenv( 'MMBB_TEST_HPOS' ) ) {
			$this->assertTrue( \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled() );
		}
	}
}
