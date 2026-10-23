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
	const DB_VERSION = '0.9.0';

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

		add_option( 'mmbb_settings', Settings\Settings::defaults(), '', true );
		if ( version_compare( (string) get_option( 'mmbb_version', '0' ), MMBB_VERSION, '<' ) ) {
			update_option( 'mmbb_version', MMBB_VERSION, false );
		}
		if ( version_compare( (string) get_option( 'mmbb_db_version', '0' ), self::DB_VERSION, '<' ) ) {
			update_option( 'mmbb_db_version', self::DB_VERSION, false );
		}
	}

	/**
	 * Table creation statements for dbDelta().
	 *
	 * @return string[]
	 */
	private static function schema() {
		global $wpdb;
		$collate = $wpdb->get_charset_collate();

		return array(
			"CREATE TABLE {$wpdb->prefix}mmbb_events (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  campaign_id bigint(20) unsigned NOT NULL,
  event varchar(20) NOT NULL,
  session char(32) NOT NULL,
  product_id bigint(20) unsigned DEFAULT NULL,
  qty smallint(5) unsigned NOT NULL DEFAULT 0,
  value decimal(19,4) DEFAULT NULL,
  order_id bigint(20) unsigned DEFAULT NULL,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY campaign_event_created (campaign_id,event,created_at),
  KEY order_id (order_id)
) {$collate};",
			"CREATE TABLE {$wpdb->prefix}mmbb_stats_daily (
  day date NOT NULL,
  campaign_id bigint(20) unsigned NOT NULL,
  views int(10) unsigned NOT NULL DEFAULT 0,
  started int(10) unsigned NOT NULL DEFAULT 0,
  tier_reached int(10) unsigned NOT NULL DEFAULT 0,
  carts int(10) unsigned NOT NULL DEFAULT 0,
  orders int(10) unsigned NOT NULL DEFAULT 0,
  items int(10) unsigned NOT NULL DEFAULT 0,
  revenue decimal(19,4) NOT NULL DEFAULT 0,
  discount decimal(19,4) NOT NULL DEFAULT 0,
  products longtext DEFAULT NULL,
  PRIMARY KEY  (day,campaign_id)
) {$collate};",
			"CREATE TABLE {$wpdb->prefix}mmbb_purchases (
  order_id bigint(20) unsigned NOT NULL,
  line_id bigint(20) unsigned NOT NULL,
  campaign_id bigint(20) unsigned NOT NULL,
  day date NOT NULL,
  boxes int(10) unsigned NOT NULL DEFAULT 1,
  items int(10) unsigned NOT NULL DEFAULT 0,
  tier smallint(5) unsigned NOT NULL DEFAULT 0,
  tier_data longtext DEFAULT NULL,
  value decimal(19,4) NOT NULL DEFAULT 0,
  discount decimal(19,4) NOT NULL DEFAULT 0,
  refunded tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY  (order_id,line_id),
  KEY campaign_day (campaign_id,day)
) {$collate};",
		);
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

	/** Clear the plugin's recurring schedules. */
	public static function clear_schedules() {
		$hooks = array( 'mmbb_rollup_daily' );
		foreach ( $hooks as $hook ) {
			wp_clear_scheduled_hook( $hook );
			if ( function_exists( 'as_unschedule_all_actions' ) && self::has_action_scheduler_tables() ) {
				as_unschedule_all_actions( $hook );
			}
		}
	}

	/**
	 * Whether Action Scheduler has its tables on the current site.
	 *
	 * A multisite subsite that never ran WooCommerce has none, and querying them would raise a database error.
	 *
	 * @return bool
	 */
	private static function has_action_scheduler_tables() {
		global $wpdb;
		$table = $wpdb->prefix . 'actionscheduler_actions';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Existence check of another plugin's table; it must read the live schema.
		return $table === $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) );
	}
}
