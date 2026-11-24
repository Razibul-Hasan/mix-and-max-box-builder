<?php
/**
 * SiteGround Optimizer (sg-cachepress) compatibility.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility\Plugins;

use MixMax\BoxBuilder\Assets;
use MixMax\BoxBuilder\Compatibility\Integration;
use MixMax\BoxBuilder\Storefront\Storefront;

defined( 'ABSPATH' ) || exit;

/**
 * SiteGround Optimizer minifies, combines and defers JavaScript. It must leave this plugin's scripts alone.
 *
 * - The scripts are already minified by the build. Their file names do not end in ".min.js",
 *   so SG Optimizer minifies them again. On SiteGround hosting it does that with the server's
 *   own minifier, which renames variables a second time and breaks the bundle
 *   ("Cannot access 'c' before initialization"), so the box never mounts.
 * - Combining or deferring them would change their order relative to React and to the
 *   inline scripts that carry the box payload and settings.
 *
 * SG Optimizer's exclude filters take and return a list of script handles.
 */
final class Siteground_Optimizer extends Integration {
	/**
	 * Whether SiteGround Optimizer is active.
	 *
	 * @return bool
	 */
	public function is_active() {
		return defined( 'SiteGround_Optimizer\VERSION' );
	}

	/** Add the hooks. */
	public function register() {
		add_filter( 'sgo_js_minify_exclude', array( $this, 'exclude' ) );
		add_filter( 'sgo_javascript_combine_exclude', array( $this, 'exclude' ) );
		add_filter( 'sgo_js_async_exclude', array( $this, 'exclude' ) );
	}

	/**
	 * Script handles SG Optimizer must leave untouched.
	 *
	 * @return string[]
	 */
	public static function handles() {
		return array( Storefront::HANDLE, Assets::HANDLE );
	}

	/**
	 * Add this plugin's script handles to an SG Optimizer exclude list.
	 *
	 * @param string[]|mixed $handles Handles other code already excluded.
	 * @return string[]
	 */
	public function exclude( $handles ) {
		if ( ! is_array( $handles ) ) {
			$handles = array();
		}
		return array_values( array_unique( array_merge( $handles, self::handles() ) ) );
	}
}
