<?php
/**
 * Plugin settings: one option, `mmbb_settings`.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Settings;

defined( 'ABSPATH' ) || exit;

/** Defaults, sanitizing and reading for the settings option. */
final class Settings {
	const OPTION = 'mmbb_settings';

	const SUMMARY_LAYOUTS = array( 'panel', 'bar', 'both' );
	const CART_DISPLAYS   = array( 'bundle', 'items' );
	const COLUMNS         = array( 3, 4, 5 );

	/** Register the option so it is typed, sanitized and defaulted. */
	public function register() {
		add_action( 'init', array( $this, 'register_setting' ) );
	}

	/** Register the setting with WordPress. */
	public function register_setting() {
		register_setting(
			'mmbb_settings_group',
			self::OPTION,
			array(
				'type'              => 'object',
				'description'       => __( 'Mix and Max Box Builder settings.', 'mix-and-max-box-builder' ),
				'sanitize_callback' => array( self::class, 'sanitize' ),
				'show_in_rest'      => false,
				'default'           => self::defaults(),
			)
		);
	}

	/**
	 * Every setting with its default value.
	 *
	 * Empty button and hint texts mean "use the built-in, translated text".
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			'enabled'                  => true,
			'default_page_id'          => 0,
			'columns'                  => 4,
			'summary_layout'           => 'both',
			'stickers'                 => true,
			'low_stock'                => array(
				'enabled'   => true,
				'threshold' => 5,
			),
			'unlock_toast'             => true,
			'cta_label'                => '',
			'empty_slot_hint'          => '',
			'cart_display'             => 'bundle',
			'edit_from_cart'           => true,
			'allow_coupons'            => false,
			'reduce_item_stock'        => true,
			'email_list_items'         => true,
			'email_gift_message'       => true,
			'assets_only_on_builder'   => true,
			'analytics_enabled'        => true,
			'analytics_retention_days' => 90,
			'delete_data'              => false,
		);
	}

	/**
	 * Read the whole option merged over the defaults.
	 *
	 * @return array
	 */
	public static function all() {
		$stored = get_option( self::OPTION, array() );
		return self::merge( self::defaults(), is_array( $stored ) ? $stored : array() );
	}

	/**
	 * Read one setting.
	 *
	 * @param string $key Setting key, for example `allow_coupons`.
	 * @return mixed Null for an unknown key.
	 */
	public static function get( $key ) {
		$all = self::all();
		return array_key_exists( $key, $all ) ? $all[ $key ] : null;
	}

	/**
	 * Save changes onto the stored settings (used by the REST route).
	 *
	 * @param array $changes Partial settings.
	 * @return array The saved settings.
	 */
	public static function update( array $changes ) {
		$stored = get_option( self::OPTION, array() );
		$merged = self::merge( is_array( $stored ) ? $stored : array(), $changes );
		update_option( self::OPTION, $merged );
		return self::all();
	}

	/**
	 * Sanitize settings. Unknown keys are dropped. Only keys present in the
	 * input are returned, so a partial value never fills in defaults on its own.
	 *
	 * @param mixed $input Raw value.
	 * @return array
	 */
	public static function sanitize( $input ) {
		if ( ! is_array( $input ) ) {
			return array();
		}
		$defaults = self::defaults();
		$out      = array();
		foreach ( $defaults as $key => $default ) {
			if ( ! array_key_exists( $key, $input ) ) {
				continue;
			}
			$value = $input[ $key ];
			switch ( $key ) {
				case 'default_page_id':
					$out[ $key ] = max( 0, absint( $value ) );
					break;
				case 'columns':
					$out[ $key ] = in_array( (int) $value, self::COLUMNS, true ) ? (int) $value : $default;
					break;
				case 'summary_layout':
					$out[ $key ] = in_array( $value, self::SUMMARY_LAYOUTS, true ) ? $value : $default;
					break;
				case 'cart_display':
					$out[ $key ] = in_array( $value, self::CART_DISPLAYS, true ) ? $value : $default;
					break;
				case 'cta_label':
					$out[ $key ] = self::text( $value, 32 );
					break;
				case 'empty_slot_hint':
					$out[ $key ] = self::text( $value, 60 );
					break;
				case 'analytics_retention_days':
					$out[ $key ] = max( 7, min( 730, absint( $value ) ) );
					break;
				case 'low_stock':
					$low         = is_array( $value ) ? $value : array();
					$out[ $key ] = array(
						'enabled'   => isset( $low['enabled'] ) ? self::bool( $low['enabled'], $default['enabled'] ) : $default['enabled'],
						'threshold' => isset( $low['threshold'] ) ? max( 1, min( 100, absint( $low['threshold'] ) ) ) : $default['threshold'],
					);
					break;
				default:
					$out[ $key ] = self::bool( $value, $default );
			}
		}
		return $out;
	}

	/**
	 * Merge changes onto a base, one level deep for `low_stock`, and sanitize them.
	 *
	 * @param array $base    Base settings.
	 * @param array $changes Changes.
	 * @return array
	 */
	private static function merge( array $base, array $changes ) {
		$changes = self::sanitize( $changes );
		if ( isset( $changes['low_stock'] ) && isset( $base['low_stock'] ) && is_array( $base['low_stock'] ) ) {
			$changes['low_stock'] += $base['low_stock'];
		}
		return $changes + $base;
	}

	/**
	 * Read a boolean from loose input.
	 *
	 * @param mixed $value    Raw value.
	 * @param bool  $fallback Fallback for unrecognised input.
	 * @return bool
	 */
	private static function bool( $value, $fallback ) {
		$parsed = filter_var( $value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE );
		return null === $parsed ? (bool) $fallback : $parsed;
	}

	/**
	 * Single-line text clamped to a length.
	 *
	 * @param mixed $value  Raw value.
	 * @param int   $length Maximum characters.
	 * @return string
	 */
	private static function text( $value, $length ) {
		if ( ! is_scalar( $value ) ) {
			return '';
		}
		return mb_substr( sanitize_text_field( (string) $value ), 0, $length );
	}
}
