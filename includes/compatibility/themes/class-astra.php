<?php
/**
 * Astra theme compatibility.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility\Themes;

use MixMax\BoxBuilder\Compatibility\Integration;
use MixMax\BoxBuilder\Storefront\Storefront;

defined( 'ABSPATH' ) || exit;

/**
 * Astra styles links, buttons, headings and lists inside `.entry-content` and gives pages a
 * boxed container. This keeps those rules away from the builder so the merchant's design
 * settings win, and lets the box use the width the page gives it.
 */
final class Astra extends Integration {
	/**
	 * Whether Astra, or a child theme of it, is active.
	 *
	 * @return bool
	 */
	public function is_active() {
		return $this->theme_is( 'astra' );
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
	 * The style fixes. Every rule starts with `.mmbb-theme-astra .mmbb-root` so it outranks
	 * Astra's `.entry-content` rules and touches nothing outside the builder.
	 *
	 * @return string
	 */
	public static function css() {
		$root = '.mmbb-theme-astra .mmbb-root';
		// Links keep the full selector to beat Astra's `.entry-content a`. The rest wrap the body
		// class in :where(), so they beat Astra's tag rules while the builder's own rules still win.
		$low = ':where(.mmbb-theme-astra) .mmbb-root';
		return $root . ' a{text-decoration:none;box-shadow:none;background-image:none}'
			. $low . ' :is(h1,h2,h3,h4,h5,h6){margin-block:0;padding:0;clear:none}'
			. $low . ' :is(p,ul,ol){margin-block:0}'
			. $low . ' :is(ul,ol){padding-inline-start:0;list-style:none}'
			. $low . ' img{margin:0;max-width:100%;height:auto}'
			. $low . ' :is(button,input,select,textarea){box-shadow:none;text-transform:none;letter-spacing:normal}'
			. $low . ' :is(button,[type=button],[type=submit]){min-height:0;line-height:inherit}'
			. '.mmbb-theme-astra .ast-container .mmbb-root,.mmbb-theme-astra .entry-content>.mmbb-root{max-width:100%}'
			. '.mmbb-theme-astra .mmbb-preview-main{width:100%;padding:24px}';
	}
}
