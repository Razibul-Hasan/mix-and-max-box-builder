<?php
/**
 * Ordered, repeatable data migrations between schema versions.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

use MixMax\BoxBuilder\Campaigns\Config;
use MixMax\BoxBuilder\Campaigns\Post_Type;
use MixMax\BoxBuilder\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Run each migration step newer than the stored schema version, oldest first.
 *
 * Rules for every step:
 * - It is safe to run twice. A second run changes nothing.
 * - It never drops or renames a stored key. New fields get defaults; old keys stay readable.
 * - Table changes go through dbDelta() in Installer::schema(), not here.
 * - Every query with a variable uses $wpdb->prepare().
 *
 * To add a step: add a `version => method` row to steps() and raise Installer::DB_VERSION to that version.
 */
final class Upgrades {
	/** Option that holds the schema version of the current site. */
	const OPTION = 'mmbb_db_version';

	/**
	 * Every migration step, keyed by the schema version it brings the site to.
	 *
	 * @return array<string, callable>
	 */
	public static function steps() {
		return array(
			'2.0.0' => array( self::class, 'step_2_0_0' ),
			'2.0.1' => array( self::class, 'step_2_0_1' ),
			'2.0.2' => array( self::class, 'step_2_0_2' ),
		);
	}

	/**
	 * The versions whose steps still have to run, oldest first.
	 *
	 * @param string   $from     Stored schema version. '0' on a new site.
	 * @param string[] $versions Versions that have a step.
	 * @return string[]
	 */
	public static function pending( $from, array $versions ) {
		$pending = array();
		foreach ( $versions as $version ) {
			if ( version_compare( (string) $from, (string) $version, '<' ) ) {
				$pending[] = (string) $version;
			}
		}
		usort( $pending, 'version_compare' );
		return $pending;
	}

	/**
	 * Run the pending steps for the current site and record each one as it finishes.
	 *
	 * The version is saved after every step, so a run that stops half way resumes at the step that failed.
	 *
	 * @param array<string, callable>|null $steps Steps to use instead of steps(). For tests.
	 * @return string[] The versions whose steps ran.
	 */
	public static function run( $steps = null ) {
		$steps = null === $steps ? self::steps() : $steps;
		$ran   = array();
		foreach ( self::pending( (string) get_option( self::OPTION, '0' ), array_keys( $steps ) ) as $version ) {
			call_user_func( $steps[ $version ] );
			update_option( self::OPTION, $version, false );
			self::debug_log( sprintf( 'Database upgrade %s completed.', $version ) );
			$ran[] = $version;
		}
		return $ran;
	}

	/**
	 * Log a completed step only on sites that explicitly enable WordPress debugging.
	 *
	 * @param string $message Debug message without the plugin prefix.
	 */
	private static function debug_log( $message ) {
		if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
			return;
		}
		error_log( '[ProductBoxes] ' . $message ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Required debug-only migration record.
	}

	/**
	 * 2.0.0: the redesign.
	 *
	 * Reserved as the first redesign schema marker. Later ordered steps migrate the stored data.
	 */
	private static function step_2_0_0() {
	}

	/**
	 * 2.0.1: move the store-wide coupon preference onto each existing box.
	 */
	private static function step_2_0_1() {
		$allow_coupons = (bool) Settings::get( 'allow_coupons' );
		$ids           = get_posts(
			array(
				'post_type'      => Post_Type::NAME,
				'post_status'    => array( 'draft', 'publish', 'trash' ),
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);
		foreach ( $ids as $id ) {
			$raw = get_post_meta( $id, Post_Type::META_CONFIG, true );
			$old = json_decode( (string) $raw, true );
			if ( ! is_array( $old ) ) {
				continue;
			}
			$old_box = isset( $old['box'] ) && is_array( $old['box'] ) ? $old['box'] : array();
			if ( array_key_exists( 'allow_coupons', $old_box ) ) {
				continue;
			}
			$old['box']                  = $old_box;
			$old['box']['allow_coupons'] = $allow_coupons;
			update_post_meta( $id, Post_Type::META_CONFIG, wp_slash( wp_json_encode( $old ) ) );
		}
	}

	/**
	 * 2.0.2: map the 1.0 presentation fields into the optional design object.
	 */
	private static function step_2_0_2() {
		$settings = Settings::all();
		$ids      = get_posts(
			array(
				'post_type'      => Post_Type::NAME,
				'post_status'    => array( 'draft', 'publish', 'trash' ),
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
			)
		);
		foreach ( $ids as $id ) {
			$raw = get_post_meta( $id, Post_Type::META_CONFIG, true );
			$old = json_decode( (string) $raw, true );
			if ( ! is_array( $old ) ) {
				continue;
			}
			$legacy = isset( $old['design'] ) && is_array( $old['design'] ) ? $old['design'] : array();
			$config = Config::sanitize( $old );

			if ( ! array_key_exists( 'template', $legacy ) ) {
				$config['design']['template'] = 'spotlight';
			}
			self::copy_missing( $config['design']['colors'], $legacy, 'colors', 'accent', 'accent_color' );
			self::copy_missing( $config['design']['colors'], $legacy, 'colors', 'background', 'theme_canvas' );
			self::copy_missing( $config['design']['colors'], $legacy, 'colors', 'surface', 'theme_surface' );

			$legacy_columns = isset( $legacy['columns'] ) ? (int) $legacy['columns'] : 0;
			if ( ! self::has_nested( $legacy, 'cards', 'columns' ) ) {
				$config['design']['cards']['columns'] = in_array( $legacy_columns, Settings::COLUMNS, true ) ? $legacy_columns : (int) $settings['columns'];
			}

			if ( ! self::has_nested( $legacy, 'summary', 'position' ) ) {
				$layout                                  = isset( $legacy['layout'] ) && 'default' !== $legacy['layout'] ? $legacy['layout'] : $settings['summary_layout'];
				$config['design']['summary']['position'] = 'bar' === $layout ? 'bar' : 'right';
			}
			if ( ! self::has_nested( $legacy, 'summary', 'show_ladder' ) ) {
				$config['design']['summary']['show_ladder'] = isset( $legacy['show_ladder'] ) ? (bool) $legacy['show_ladder'] : true;
			}
			if ( ! array_key_exists( 'show_stickers', $legacy ) ) {
				$config['design']['show_stickers'] = ! empty( $settings['stickers'] );
			}

			self::copy_missing( $config['design']['content'], $legacy, 'content', 'headline', 'headline' );
			self::copy_missing( $config['design']['content'], $legacy, 'content', 'intro', 'intro' );
			if ( ! self::has_nested( $legacy, 'content', 'cart_label' ) ) {
				$config['design']['content']['cart_label'] = ! empty( $legacy['cta_label'] ) ? (string) $legacy['cta_label'] : (string) $settings['cta_label'];
			}
			update_post_meta( $id, Post_Type::META_CONFIG, wp_slash( wp_json_encode( $config ) ) );
		}
	}

	/**
	 * Copy one legacy design value into a nested redesign section when no new value exists.
	 *
	 * @param array  $target     Nested redesign section, passed by reference.
	 * @param array  $legacy     Raw design object saved before the redesign.
	 * @param string $section    Redesign section name.
	 * @param string $target_key Redesign key.
	 * @param string $legacy_key Legacy key.
	 */
	private static function copy_missing( array &$target, array $legacy, $section, $target_key, $legacy_key ) {
		if ( self::has_nested( $legacy, $section, $target_key ) ) {
			return;
		}
		$target[ $target_key ] = isset( $legacy[ $legacy_key ] ) ? (string) $legacy[ $legacy_key ] : '';
	}

	/**
	 * Whether a raw legacy design object already contains a nested redesign value.
	 *
	 * @param array  $design  Raw design object.
	 * @param string $section Nested section name.
	 * @param string $key     Value name.
	 * @return bool
	 */
	private static function has_nested( array $design, $section, $key ) {
		return isset( $design[ $section ] ) && is_array( $design[ $section ] ) && array_key_exists( $key, $design[ $section ] );
	}
}
