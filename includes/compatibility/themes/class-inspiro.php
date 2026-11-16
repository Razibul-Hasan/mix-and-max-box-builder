<?php
/**
 * Inspiro theme compatibility.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility\Themes;

use MixMax\BoxBuilder\Compatibility\Integration;
use MixMax\BoxBuilder\Storefront\Storefront;

defined( 'ABSPATH' ) || exit;

/**
 * Inspiro sets a 1.9 line height and margins on headings, paragraphs and lists inside
 * `.entry-content`, shows every `label` as a block with a bottom margin, and styles every
 * `input` and `textarea` (11px 10px padding, 2px border, white background, square corners,
 * and a full-width, bottom-margin block for text fields). That bloats the gift checkbox, the
 * range track and the form fields. This undoes those rules inside the builder only, so the
 * merchant's design settings win.
 */
final class Inspiro extends Integration {
	/**
	 * Whether Inspiro, or a child theme of it, is active.
	 *
	 * @return bool
	 */
	public function is_active() {
		return $this->theme_is( 'inspiro' );
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
	 * enough to beat Inspiro's `.entry-content` and element rules, and low enough that the
	 * builder's own `.mmbb-root .mmbb-*` rules still win over these resets. Selector lists
	 * with attribute selectors also use :where(): in :is() an attribute counts as a class, which
	 * ties with the builder's rules and, loading later, wipes out their padding and display.
	 *
	 * @return string
	 */
	public static function css() {
		$root = ':where(.mmbb-theme-inspiro) .mmbb-root';
		return $root . '{line-height:1.5}'
			. $root . ' a{text-decoration:none;box-shadow:none;background-image:none}'
			. $root . ' :is(h1,h2,h3,h4,h5,h6){margin-block:0;padding:0;clear:none;color:inherit;line-height:1.3}'
			. $root . ' :is(p,ul,ol,figure){margin-block:0}'
			. $root . ' :is(ul,ol){margin-inline:0;padding-inline-start:0;list-style:none}'
			. $root . ' li{list-style:none}'
			. $root . ' img{margin:0;max-width:100%;height:auto}'
			. $root . ' label{display:inline-block;margin:0}'
			. $root . ' :where(button,[type=button],[type=submit]){display:inline-flex;min-height:0;padding:0;font-family:inherit;font-size:inherit;font-weight:inherit;white-space:normal;text-transform:none;letter-spacing:normal;box-shadow:none}'
			. $root . ' :where(input,textarea):where([type=checkbox],[type=radio],[type=range]){margin:0;box-shadow:none;border-radius:revert}'
			. $root . ' :where(select,textarea,input:not([type=checkbox],[type=radio],[type=range])){margin-bottom:0;box-shadow:none;text-transform:none;letter-spacing:normal}'
			. ':where(.mmbb-theme-inspiro) .entry-content>.mmbb-root{width:100%;max-width:100%}'
			. ':where(.mmbb-theme-inspiro) .mmbb-preview-main{width:100%;padding:24px}';
	}
}
