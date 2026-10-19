<?php
/**
 * Install and upgrade site data without overwriting merchant settings.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/** Manage activation, upgrades, new network sites and deactivation. */
final class Installer {
	/** Database schema version; bump when the schema registry changes. */
	const DB_VERSION = '0.1.0';

	/** Register upgrade and network-site hooks. */
	public function register() {
		add_action( 'admin_init', array( self::class, 'maybe_upgrade' ) );
		add_action( 'wp_initialize_site', array( self::class, 'initialize_site' ), 200 );
	}

	/**
	 * Install data for the activated site or all sites on network activation.
	 *
	 * @param bool $network_wide Whether this is network activation.
	 */
	public static function activate( $network_wide = false ) {
		if ( $network_wide && is_multisite() ) {
			Sites::for_each( array( self::class, 'install' ) );
			return;
		}
		self::install();
	}

	/** Upgrade only when a stored plugin or database version is older. */
	public static function maybe_upgrade() {
		if ( version_compare( (string) get_option( 'mmbb_version', '0' ), MMBB_VERSION, '<' ) || version_compare( (string) get_option( 'mmbb_db_version', '0' ), self::DB_VERSION, '<' ) ) {
			self::install();
		}
	}

	/** Create registered tables and seed defaults for the current site. */
	public static function install() {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		foreach ( self::schema() as $statement ) {
			dbDelta( $statement );
		}

		// Phase 3 supplies the remaining settings alongside their validation.
		add_option( 'mmbb_settings', array( 'delete_data' => false ), '', true );
		if ( version_compare( (string) get_option( 'mmbb_version', '0' ), MMBB_VERSION, '<' ) ) {
			update_option( 'mmbb_version', MMBB_VERSION, false );
		}
		if ( version_compare( (string) get_option( 'mmbb_db_version', '0' ), self::DB_VERSION, '<' ) ) {
			update_option( 'mmbb_db_version', self::DB_VERSION, false );
		}
	}

	/**
	 * Table creation statements, extended in Phase 3.
	 *
	 * @return string[]
	 */
	private static function schema() {
		return array();
	}

	/**
	 * Initialize a new site when the plugin is network active.
	 *
	 * @param \WP_Site $site Newly initialized site.
	 */
	public static function initialize_site( $site ) {
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		if ( ! is_plugin_active_for_network( MMBB_BASENAME ) ) {
			return;
		}
		switch_to_blog( (int) $site->blog_id );
		try {
			self::install();
		} finally {
			restore_current_blog();
		}
	}

	/**
	 * Clear plugin schedules while retaining all merchant data.
	 *
	 * @param bool $network_wide Whether this is network deactivation.
	 */
	public static function deactivate( $network_wide = false ) {
		if ( $network_wide && is_multisite() ) {
			Sites::for_each( array( self::class, 'clear_schedules' ) );
			return;
		}
		self::clear_schedules();
	}

	/** Clear the schedule registry, populated when analytics ships in Phase 9. */
	public static function clear_schedules() {
		$hooks = array();
		foreach ( $hooks as $hook ) {
			wp_clear_scheduled_hook( $hook );
			if ( function_exists( 'as_unschedule_all_actions' ) ) {
				as_unschedule_all_actions( $hook );
			}
		}
	}
}
