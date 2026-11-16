<?php
/**
 * Extendable theme compatibility.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility\Themes;

use MixMax\BoxBuilder\Compatibility\Integration;
use MixMax\BoxBuilder\Storefront\Storefront;

defined( 'ABSPATH' ) || exit;

/**
 * Extendable is a block theme. Its theme.json styles every link (underlined, dashed on hover),
 * every heading (size, weight, tracking, case and the Inter family), every label, and gives
 * buttons and text fields their own padding, border, radius and shadow. Nearly all of it is
 * zero-specificity, so the builder's own rules already win where they set a value; these fixes
 * cover what the builder leaves to inherit, so the merchant's design settings win the rest.
 */
final class Extendable extends Integration {
	/**
	 * Whether Extendable, or a child theme of it, is active.
	 *
	 * @return bool
	 */
	public function is_active() {
		return $this->theme_is( 'extendable' );
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
		wp_add_inline_style( Storefront::HANDLE, self::css() );
	}

	/**
	 * The style fixes.
	 *
	 * The body class is wrapped in :where() so each rule weighs `.mmbb-root` plus the element:
	 * above the theme's `:root :where()` element styles, and below the builder's own
	 * `.mmbb-root .mmbb-*` rules, which still win. Lists with attribute selectors use :where()
	 * too, since inside :is() an attribute counts as a class and would tie with the builder.
	 *
	 * @return string
	 */
	public static function css() {
		$root = ':where(.mmbb-theme-extendable) .mmbb-root';
		return $root . ' a{text-decoration:none;text-underline-offset:auto}'
			. $root . ' :is(h1,h2,h3,h4,h5,h6){margin-block:0;color:inherit;font-family:inherit;text-transform:none}'
			. $root . ' :is(p,ul,ol,figure){margin-block:0}'
			. $root . ' :is(ul,ol){padding-inline-start:0;list-style:none}'
			. $root . ' img{margin:0;max-width:100%;height:auto}'
			. $root . ' label{font-size:inherit;font-weight:inherit;line-height:inherit;letter-spacing:inherit}'
			. $root . ' :where(button,[type=button],[type=submit]){font-family:inherit;text-transform:none;letter-spacing:normal;box-shadow:none}'
			. $root . ' :where(select,textarea,input:not([type=checkbox],[type=radio],[type=range])){font-family:inherit;box-shadow:none;text-transform:none;letter-spacing:normal}'
			. ':where(.mmbb-theme-extendable) .is-layout-constrained>.mmbb-root.mmbb-builder:not([data-width=content]){max-width:none}'
			. ':where(.mmbb-theme-extendable) .mmbb-preview-main{width:100%;padding:24px}';
	}
}
