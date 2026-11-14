<?php
/**
 * Compatibility with other plugins and themes.
 *
 * To support another plugin or theme, add a class that extends Integration and list
 * it in integrations() below. docs/COMPATIBILITY.md has the steps and a template.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility;

defined( 'ABSPATH' ) || exit;

/** Load each integration whose plugin or theme is active. */
final class Compatibility {
	/** Register hooks. */
	public function register() {
		add_action( 'init', array( $this, 'load' ), 1 );
		add_filter( 'body_class', array( $this, 'theme_body_classes' ) );
	}

	/**
	 * Every integration this plugin ships, plugins first, then themes.
	 *
	 * Add new ones here. A class is only created and registered when its is_active()
	 * says the plugin or theme is in use.
	 *
	 * @return string[] Class names that extend Integration.
	 */
	public static function integrations() {
		return array(
			// Plugins.
			Plugins\Woo_Payments::class,
			// Themes.
		);
	}

	/** Create each integration and register the ones that are active. */
	public function load() {
		/**
		 * Filter the integration classes. Add your own from another plugin or a theme:
		 * the class must extend MixMax\BoxBuilder\Compatibility\Integration.
		 *
		 * @param string[] $classes Class names.
		 */
		$classes = apply_filters( 'mmbb_compatibility_integrations', self::integrations() );
		if ( ! is_array( $classes ) ) {
			return;
		}

		foreach ( $classes as $class ) {
			if ( ! is_string( $class ) || ! class_exists( $class ) || ! is_subclass_of( $class, Integration::class ) ) {
				continue;
			}
			$integration = new $class();
			if ( $integration->is_active() ) {
				$integration->register();
			}
		}
	}

	/**
	 * Name the active theme on the page, so a style fix can target one theme:
	 * `.mmbb-theme-astra .mmbb-builder { ... }`.
	 *
	 * @param string[] $classes Body classes.
	 * @return string[]
	 */
	public function theme_body_classes( $classes ) {
		$classes[] = 'mmbb-theme-' . sanitize_html_class( get_stylesheet() );
		if ( get_template() !== get_stylesheet() ) {
			$classes[] = 'mmbb-theme-' . sanitize_html_class( get_template() );
		}
		return $classes;
	}
}
