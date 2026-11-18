<?php
/**
 * The author's other plugins, listed on the Our Plugins page.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Admin;

defined( 'ABSPATH' ) || exit;

/** The list of plugins shown on the Our Plugins page. */
final class Our_Plugins {
	/**
	 * The plugins to show; filter `mmbb_our_plugins` to change them.
	 *
	 * @return array[] Each: name, description, slug, url (WordPress.org page), plus the
	 *                 install state: status (active, installed or missing) and action_url.
	 */
	public static function plugins() {
		$plugins = array(
			array(
				'name'        => 'ProductReels',
				'description' => 'Shoppable video reels for WooCommerce. Turn product videos, reviews and tutorials into interactive reels with product tags and add-to-cart buttons.',
				'slug'        => 'productreels',
				'url'         => 'https://wordpress.org/plugins/productreels/',
			),
			array(
				'name'        => 'MigrateLift',
				'description' => 'WordPress migration, backup and restore. Move your site to a new host or domain, restore from an archive, or clone to staging, all from the dashboard.',
				'slug'        => 'migrate-lift',
				'url'         => 'https://wordpress.org/plugins/migrate-lift/',
			),
		);

		/**
		 * Filter the plugins listed on the Our Plugins page.
		 *
		 * @param array[] $plugins Plugin entries.
		 */
		$plugins = (array) apply_filters( 'mmbb_our_plugins', $plugins );

		return array_map( array( self::class, 'with_state' ), $plugins );
	}

	/**
	 * Add whether the plugin is active, installed or missing, and where its button goes.
	 *
	 * @param array $plugin Plugin entry.
	 * @return array
	 */
	private static function with_state( $plugin ) {
		$slug = isset( $plugin['slug'] ) ? sanitize_key( $plugin['slug'] ) : '';
		$file = '';
		if ( $slug && function_exists( 'get_plugins' ) ) {
			foreach ( array_keys( get_plugins() ) as $candidate ) {
				if ( 0 === strpos( $candidate, $slug . '/' ) ) {
					$file = $candidate;
					break;
				}
			}
		}

		$plugin['logo'] = $slug && is_readable( MMBB_PATH . 'assets/images/' . $slug . '.png' ) ? MMBB_URL . 'assets/images/' . $slug . '.png' : '';

		$plugin['status']     = 'missing';
		$plugin['action_url'] = $plugin['url'];
		if ( $file && function_exists( 'is_plugin_active' ) && is_plugin_active( $file ) ) {
			$plugin['status'] = 'active';
		} elseif ( $file ) {
			$plugin['status'] = 'installed';
			if ( current_user_can( 'activate_plugins' ) ) {
				$plugin['action_url'] = wp_nonce_url( self_admin_url( 'plugins.php?action=activate&plugin=' . rawurlencode( $file ) ), 'activate-plugin_' . $file );
			}
		} elseif ( $slug && current_user_can( 'install_plugins' ) ) {
			$plugin['can_install'] = true;
		}
		return $plugin;
	}
}
