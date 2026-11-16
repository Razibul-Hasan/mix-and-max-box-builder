<?php
/**
 * Elastra theme compatibility.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility\Themes;

use MixMax\BoxBuilder\Compatibility\Integration;
use MixMax\BoxBuilder\Storefront\Storefront;

defined( 'ABSPATH' ) || exit;

/**
 * Elastra is a block theme that styles every `button:not(.components-button):not(...)` with its
 * green primary colour, a 2px border, its own padding, radius, font size and shadow. That
 * selector weighs 0,5,1, so it beat the builder's Add to box, quantity, chip and remove buttons.
 * It also inherits a 1.75 line height and underlines links. The button fix is the builder's own
 * button rules, rebuilt with extra weight by tools/button-boost.mjs and loaded only here.
 */
final class Elastra extends Integration {
	/**
	 * Whether Elastra, or a child theme of it, is active.
	 *
	 * @return bool
	 */
	public function is_active() {
		return $this->theme_is( 'elastra' );
	}

	/** Add the hooks. */
	public function register() {
		add_action( 'wp_enqueue_scripts', array( $this, 'style' ), 20 );
	}

	/** Add the fixes after the storefront stylesheet, only where a box renders. */
	public function style() {
		if ( ! wp_style_is( Storefront::HANDLE, 'enqueued' ) && ! wp_style_is( Storefront::HANDLE, 'registered' ) ) {
			return;
		}
		wp_add_inline_style( Storefront::HANDLE, self::css() . self::button_rules() );
	}

	/**
	 * The builder's button rules with extra weight, from the build step.
	 *
	 * @return string Empty when the file is missing, for example in a source checkout.
	 */
	public static function button_rules() {
		$file = MMBB_PATH . 'build/button-boost.css';
		if ( ! is_readable( $file ) ) {
			return '';
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local build file, not a remote URL.
		$css = file_get_contents( $file );
		return is_string( $css ) ? $css : '';
	}

	/**
	 * The other style fixes. Each rule weighs `.mmbb-root` plus the element, above Elastra's
	 * `:root :where()` styles and below the builder's own `.mmbb-root .mmbb-*` rules.
	 *
	 * @return string
	 */
	public static function css() {
		$root = ':where(.mmbb-theme-elastra) .mmbb-root';
		return $root . '{line-height:1.5}'
			. $root . ' a{text-decoration:none}'
			. $root . ' :is(h1,h2,h3,h4,h5,h6){margin-block:0;color:inherit}'
			. $root . ' :is(p,ul,ol,figure){margin-block:0}'
			. $root . ' :is(ul,ol){padding-inline-start:0;list-style:none}'
			. $root . ' img{margin:0;max-width:100%;height:auto}'
			// Elastra's small drop shadow; the builder's own button rules set theirs after this.
			. '.mmbb-root.mmbb-root.mmbb-root.mmbb-root.mmbb-root.mmbb-root button{box-shadow:none}'
			// Elastra darkens every button on hover and focus with an !important filter.
			. '.mmbb-root.mmbb-root.mmbb-root.mmbb-root.mmbb-root.mmbb-root button:is(:hover,:focus){filter:none!important}'
			. ':where(.mmbb-theme-elastra) .mmbb-preview-main{width:100%;padding:24px}';
	}
}
