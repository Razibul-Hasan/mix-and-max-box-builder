<?php
/**
 * Baseline compatibility for any theme.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility\Themes;

use MixMax\BoxBuilder\Compatibility\Integration;
use MixMax\BoxBuilder\Storefront\Storefront;

defined( 'ABSPATH' ) || exit;

/**
 * Most themes style bare headings, lists, links and images inside the content area. These
 * rules weigh `.mmbb-root` plus one element, so they beat those tag rules but lose to the
 * builder's own `.mmbb-root .mmbb-*` rules. Themes with their own class (Astra, Blocksy and
 * the rest) add stronger fixes after this one.
 */
final class Generic extends Integration {
	/**
	 * Always active: it only adds low-weight resets.
	 *
	 * @return bool
	 */
	public function is_active() {
		return true;
	}

	/** Add the hooks. */
	public function register() {
		add_action( 'wp_enqueue_scripts', array( $this, 'style' ), 15 );
	}

	/** Add the baseline after the storefront stylesheet, only where a box renders. */
	public function style() {
		if ( ! wp_style_is( Storefront::HANDLE, 'enqueued' ) && ! wp_style_is( Storefront::HANDLE, 'registered' ) ) {
			return;
		}
		wp_add_inline_style( Storefront::HANDLE, self::css() );
	}

	/**
	 * The baseline rules.
	 *
	 * @return string
	 */
	public static function css() {
		$root = '.mmbb-root';
		return $root . ' a{text-decoration:none}'
			. $root . ' :is(h1,h2,h3,h4,h5,h6){margin-block:0;color:inherit}'
			. $root . ' :is(p,ul,ol,figure){margin-block:0}'
			. $root . ' :is(ul,ol){padding-inline-start:0;list-style:none}'
			. $root . ' img{max-width:100%;height:auto}';
	}
}
