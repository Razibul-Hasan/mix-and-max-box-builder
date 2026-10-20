<?php
/**
 * Settings option and the plugin's database tables.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Installer;
use MixMax\BoxBuilder\Settings\Settings;

/** Settings sanitize on write and merge defaults on read; both tables exist after install. */
class SettingsAndSchemaTest extends \WP_UnitTestCase {
	/** Defaults are returned when nothing is stored. */
	public function test_get_returns_defaults() {
		delete_option( 'mmbb_settings' );
		$this->assertSame( Settings::defaults(), Settings::all() );
		$this->assertTrue( Settings::get( 'reduce_item_stock' ) );
		$this->assertFalse( Settings::get( 'allow_coupons' ) );
		$this->assertFalse( Settings::get( 'delete_data' ) );
		$this->assertNull( Settings::get( 'nope' ) );
	}

	/** The documented defaults. */
	public function test_default_values() {
		$defaults = Settings::defaults();
		$this->assertTrue( $defaults['assets_only_on_builder'] );
		$this->assertTrue( $defaults['analytics_enabled'] );
		$this->assertSame( 90, $defaults['analytics_retention_days'] );
		$this->assertSame( 'bundle', $defaults['cart_display'] );
		$this->assertTrue( $defaults['edit_from_cart'] );
	}

	/** The option is registered with a sanitize callback. */
	public function test_setting_is_registered() {
		$registered = get_registered_settings();
		$this->assertArrayHasKey( 'mmbb_settings', $registered );
		$this->assertSame( 'object', $registered['mmbb_settings']['type'] );
		$this->assertSame( Settings::defaults(), $registered['mmbb_settings']['default'] );
	}

	/** Writing through update_option sanitizes the value. */
	public function test_values_are_sanitized_on_write() {
		update_option(
			'mmbb_settings',
			array(
				'columns'                  => 9,
				'summary_layout'           => 'hologram',
				'cart_display'             => 'items',
				'cta_label'                => '<b>Add</b> ' . str_repeat( 'x', 80 ),
				'analytics_retention_days' => 1,
				'allow_coupons'            => 'true',
				'low_stock'                => array(
					'enabled'   => 'no',
					'threshold' => 5000,
				),
				'unknown'                  => 'drop me',
			)
		);
		$settings = Settings::all();

		$this->assertSame( 4, $settings['columns'] );
		$this->assertSame( 'both', $settings['summary_layout'] );
		$this->assertSame( 'items', $settings['cart_display'] );
		$this->assertSame( 32, strlen( $settings['cta_label'] ) );
		$this->assertStringStartsWith( 'Add xxx', $settings['cta_label'] );
		$this->assertSame( 7, $settings['analytics_retention_days'] );
		$this->assertTrue( $settings['allow_coupons'] );
		$this->assertSame(
			array(
				'enabled'   => false,
				'threshold' => 100,
			),
			$settings['low_stock']
		);
		$this->assertArrayNotHasKey( 'unknown', $settings );
	}

	/** Updating merges a partial change and keeps everything else. */
	public function test_update_merges() {
		update_option( 'mmbb_settings', Settings::defaults() );
		Settings::update( array( 'allow_coupons' => true ) );
		$settings = Settings::update( array( 'low_stock' => array( 'threshold' => 2 ) ) );

		$this->assertTrue( $settings['allow_coupons'] );
		$this->assertSame( 2, $settings['low_stock']['threshold'] );
		$this->assertTrue( $settings['low_stock']['enabled'] );
		$this->assertTrue( $settings['reduce_item_stock'] );
	}

	/** Changing a nested threshold must preserve the merchant's disabled toggle. */
	public function test_partial_low_stock_update_preserves_disabled_preference() {
		Settings::update(
			array(
				'low_stock' => array(
					'enabled'   => false,
					'threshold' => 3,
				),
			)
		);
		$settings = Settings::update( array( 'low_stock' => array( 'threshold' => 8 ) ) );
		$this->assertSame(
			array(
				'enabled'   => false,
				'threshold' => 8,
			),
			$settings['low_stock']
		);
	}

	/** Installing creates both tables with their keys, and running it twice is safe. */
	public function test_installer_creates_tables() {
		global $wpdb;
		$events = $wpdb->prefix . 'mmbb_events';
		$stats  = $wpdb->prefix . 'mmbb_stats_daily';

		Installer::install();
		Installer::install();

		// WP_UnitTestCase creates temporary tables, which SHOW TABLES does not list.
		$this->assertSame( $events, $wpdb->get_var( $wpdb->prepare( 'SHOW CREATE TABLE %i', $events ) ) );
		$this->assertSame( $stats, $wpdb->get_var( $wpdb->prepare( 'SHOW CREATE TABLE %i', $stats ) ) );

		$columns = $wpdb->get_col( $wpdb->prepare( 'SHOW COLUMNS FROM %i', $events ) );
		$this->assertSame( array( 'id', 'campaign_id', 'event', 'session', 'product_id', 'qty', 'value', 'order_id', 'created_at' ), $columns );

		$keys = array_unique( $wpdb->get_col( $wpdb->prepare( 'SHOW INDEX FROM %i', $events ), 2 ) );
		$this->assertEqualSets( array( 'PRIMARY', 'campaign_event_created', 'order_id' ), $keys );

		$columns = $wpdb->get_col( $wpdb->prepare( 'SHOW COLUMNS FROM %i', $stats ) );
		$this->assertSame( array( 'day', 'campaign_id', 'views', 'started', 'tier_reached', 'carts', 'orders', 'items', 'revenue', 'discount', 'products' ), $columns );

		$primary = $wpdb->get_col( $wpdb->prepare( 'SHOW INDEX FROM %i WHERE Key_name = %s', $stats, 'PRIMARY' ), 4 );
		$this->assertSame( array( 'day', 'campaign_id' ), $primary );
	}

	/** Installing records the schema version that includes the tables. */
	public function test_install_records_db_version() {
		delete_option( 'mmbb_db_version' );
		Installer::maybe_upgrade();
		$this->assertSame( Installer::DB_VERSION, get_option( 'mmbb_db_version' ) );
		$this->assertTrue( version_compare( Installer::DB_VERSION, '0.3.0', '>=' ) );
	}
}
