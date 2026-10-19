<?php
/**
 * Delete only plugin-owned data after explicit per-site opt-in.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/** Keep uninstall callable in integration tests without executing its entry point. */
final class Uninstaller {
	/** Apply each site's own deletion preference on single-site and multisite. */
	public static function uninstall() {
		Sites::for_each( array( self::class, 'delete_site_data' ) );
	}

	/** Remove plugin data for the current site if its merchant opted in. */
	public static function delete_site_data() {
		global $wpdb;

		$settings = get_option( 'mmbb_settings', array() );
		if ( ! is_array( $settings ) || ! isset( $settings['delete_data'] ) || ! in_array( $settings['delete_data'], array( true, 1, '1' ), true ) ) {
			return;
		}

		Installer::clear_schedules();

		// Direct IDs avoid relying on the CPT or WooCommerce being registered at uninstall.
		$campaigns = $wpdb->get_col(
			$wpdb->prepare( 'SELECT ID FROM %i WHERE post_type = %s', $wpdb->posts, 'mmbb_campaign' )
		);
		foreach ( $campaigns as $campaign_id ) {
			wp_delete_post( (int) $campaign_id, true );
		}

		// Limit the ownership marker to products: never select orders or order items.
		$products = $wpdb->get_col(
			$wpdb->prepare(
				'SELECT DISTINCT p.ID FROM %i AS p INNER JOIN %i AS pm ON p.ID = pm.post_id WHERE p.post_type = %s AND pm.meta_key = %s',
				$wpdb->posts,
				$wpdb->postmeta,
				'product',
				'_mmbb_campaign_id'
			)
		);
		foreach ( $products as $product_id ) {
			$product = function_exists( 'wc_get_product' ) ? wc_get_product( (int) $product_id ) : false;
			if ( $product ) {
				$product->delete( true );
			} else {
				wp_delete_post( (int) $product_id, true );
			}
		}

		$tables = $wpdb->get_col( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $wpdb->prefix . 'mmbb_' ) . '%' ) );
		foreach ( $tables as $table ) {
			$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $table ) );
		}

		$options = $wpdb->get_col(
			$wpdb->prepare(
				'SELECT option_name FROM %i WHERE option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s OR option_name LIKE %s',
				$wpdb->options,
				$wpdb->esc_like( 'mmbb_' ) . '%',
				$wpdb->esc_like( '_transient_mmbb_' ) . '%',
				$wpdb->esc_like( '_transient_timeout_mmbb_' ) . '%',
				$wpdb->esc_like( '_site_transient_mmbb_' ) . '%',
				$wpdb->esc_like( '_site_transient_timeout_mmbb_' ) . '%'
			)
		);
		foreach ( $options as $option ) {
			if ( 0 === strpos( $option, '_transient_timeout_' ) ) {
				delete_transient( substr( $option, strlen( '_transient_timeout_' ) ) );
			} elseif ( 0 === strpos( $option, '_transient_' ) ) {
				delete_transient( substr( $option, strlen( '_transient_' ) ) );
			} elseif ( 0 === strpos( $option, '_site_transient_timeout_' ) ) {
				delete_site_transient( substr( $option, strlen( '_site_transient_timeout_' ) ) );
			} elseif ( 0 === strpos( $option, '_site_transient_' ) ) {
				delete_site_transient( substr( $option, strlen( '_site_transient_' ) ) );
			}
			delete_option( $option );
		}
	}
}
