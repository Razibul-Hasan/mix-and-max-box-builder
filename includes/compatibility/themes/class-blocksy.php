<?php
/**
 * Blocksy theme compatibility.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility\Themes;

use MixMax\BoxBuilder\Compatibility\Integration;
use MixMax\BoxBuilder\Storefront\Storefront;

defined( 'ABSPATH' ) || exit;

/**
 * Blocksy styles links inside `.entry-content` (underline, background-image underline),
 * puts margins on headings, paragraphs and lists, sizes every text field and select to its
 * own form settings, and lifts submit buttons on hover. This undoes those rules inside the
 * builder only, so the merchant's design settings win.
 */
final class Blocksy extends Integration {
	/**
	 * Whether Blocksy, or a child theme of it, is active.
	 *
	 * @return bool
	 */
	public function is_active() {
		return $this->theme_is( 'blocksy' );
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
	 * enough to beat Blocksy's `.entry-content` and layout rules, and low enough that the
	 * builder's own `.mmbb-root .mmbb-*` rules still win over these resets.
	 *
	 * @return string
	 */
	public static function css() {
		$root = ':where(.mmbb-theme-blocksy) .mmbb-root';
		return $root . ' a{text-decoration:none;background-image:none;box-shadow:none}'
			. $root . ' :is(h1,h2,h3,h4,h5,h6){margin-block:0;padding:0;clear:none}'
			. $root . ' :is(p,ul,ol,figure){margin-block:0}'
			. $root . ' :is(ul,ol){padding-inline-start:0;list-style:none}'
			. $root . ' img{margin:0;max-width:100%;height:auto}'
			. $root . ' :is(button,[type=button],[type=submit]){min-height:0;text-transform:none;letter-spacing:normal;box-shadow:none}'
			. $root . ' :is(button,[type=button],[type=submit]):is(:hover,:focus){transform:none}'
			. $root . ' :is(button,[type=button],[type=submit])::before{display:none}'
			. $root . ' :is(select,textarea,input:not([type=checkbox],[type=radio],[type=range])){box-shadow:none;text-transform:none;letter-spacing:normal}'
			. $root . ' label{margin:0}'
			. ':where(.mmbb-theme-blocksy) .entry-content>.mmbb-root,:where(.mmbb-theme-blocksy) [class*=ct-container] .mmbb-root{width:100%;max-width:100%}'
			. ':where(.mmbb-theme-blocksy) .mmbb-preview-main{width:100%;padding:24px}';
	}
}
