<?php
/**
 * Check the required WooCommerce runtime and explain failures in admin.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/** Prevent modules from loading with a missing or unsupported dependency. */
final class Requirements {
	/**
	 * Whether the required WooCommerce version has loaded.
	 *
	 * @return bool
	 */
	public static function is_met() {
		return class_exists( 'WooCommerce' ) && defined( 'WC_VERSION' ) && version_compare( WC_VERSION, '9.0', '>=' );
	}

	/** Register notices only when the requirement check fails. */
	public function register() {
		add_action( 'admin_notices', array( $this, 'notice' ) );
		add_action( 'network_admin_notices', array( $this, 'notice' ) );
	}

	/** Display a dismissible dependency notice on relevant screens only. */
	public function notice() {
		if ( self::is_met() || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		$screen = get_current_screen();
		if ( ! $screen || ( ! in_array( $screen->id, array( 'plugins', 'plugins-network' ), true ) && ! preg_match( '/_page_mmbb(?:-campaigns|-analytics|-settings)?$/D', $screen->id ) ) ) {
			return;
		}

		echo '<div class="notice notice-warning is-dismissible mmbb-requirements-notice"><p>';
		echo esc_html__( 'Mix and Max Box Builder requires WooCommerce 9.0 or later. Install or update WooCommerce, then activate it to continue.', 'mix-and-max-box-builder' );
		echo '</p></div>';
	}
}
