<?php
/**
 * Autoloaded options, storefront payload size and query counts.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Installer;
use MixMax\BoxBuilder\Settings\Settings;
use MixMax\BoxBuilder\Storefront\Payload;

/** Performance budgets from the hardening phase. */
class PerformanceTest extends \WP_UnitTestCase {
	/** Only mmbb_settings autoloads, and it stays small. */
	public function test_only_settings_option_autoloads() {
		global $wpdb;
		Installer::install();
		// Touch every option the plugin writes at runtime.
		update_option( 'mmbb_setup_test_done', 1, false );
		update_option( 'mmbb_analytics_generation', 'x', false );
		update_option( 'mmbb_analytics_salt', 'x', false );
		update_option( 'mmbb_analytics_transients', array(), false );
		Payload::bust();

		$autoload = wp_autoload_values_to_autoload();
		$names    = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s AND autoload IN (" . implode( ',', array_fill( 0, count( $autoload ), '%s' ) ) . ')', // phpcs:ignore WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Placeholder list is built from a fixed array.
				array_merge( array( $wpdb->esc_like( 'mmbb_' ) . '%' ), $autoload )
			)
		);
		$this->assertSame( array( 'mmbb_settings' ), $names );
		$this->assertLessThan( 2048, strlen( maybe_serialize( get_option( Settings::OPTION ) ) ) );
	}

	/** A 200-product campaign ships a payload under about 150 KB with bounded queries. */
	public function test_payload_size_and_queries_for_200_products() {
		global $wpdb;
		update_option( Settings::OPTION, Settings::defaults() );
		$ids = array();
		for ( $i = 1; $i <= 200; $i++ ) {
			$product = new \WC_Product_Simple();
			$product->set_name( 'Product number ' . $i );
			$product->set_regular_price( '10.00' );
			$product->set_status( 'publish' );
			$ids[] = $product->save();
		}

		$repo     = new Campaign_Repository();
		$campaign = $repo->create_from_template( 'blank', 'Big box' );
		$repo->save( $campaign['id'], array( 'products' => array( 'ids' => $ids ) ) );
		$campaign = $repo->publish( $campaign['id'] );

		wp_cache_flush();
		Payload::bust();
		$before  = $wpdb->num_queries;
		$payload = Payload::build( $campaign );
		$queries = $wpdb->num_queries - $before;

		$this->assertCount( 200, $payload['products'] );
		$this->assertLessThan( 150 * 1024, strlen( wp_json_encode( $payload ) ) );
		// Posts, post meta, terms and thumbnails are primed in bulk. WooCommerce still reads each product's
		// extra meta with one query, so allow about one query per product and nothing more.
		$this->assertLessThan( 260, $queries );

		// A second build is served from the transient cache.
		$before = $wpdb->num_queries;
		Payload::build( $campaign );
		$this->assertLessThan( 20, $wpdb->num_queries - $before );
	}

	/** A normal front-end request runs no plugin queries and enqueues nothing. */
	public function test_no_assets_or_campaign_queries_on_a_normal_page() {
		$this->go_to( home_url( '/' ) );
		$seen = array();
		$spy  = static function ( $sql ) use ( &$seen ) {
			if ( false !== strpos( $sql, 'mmbb_' ) ) {
				$seen[] = $sql;
			}
			return $sql;
		};
		add_filter( 'query', $spy );
		do_action( 'wp_enqueue_scripts' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Core hook.
		remove_filter( 'query', $spy );
		$this->assertSame( array(), $seen );
		$this->assertFalse( wp_script_is( 'mmbb-storefront', 'enqueued' ) );
		$this->assertFalse( wp_style_is( 'mmbb-storefront', 'enqueued' ) );
	}
}
