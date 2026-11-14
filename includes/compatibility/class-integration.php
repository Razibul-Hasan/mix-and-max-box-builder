<?php
/**
 * Base class for one plugin or theme integration.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility;

defined( 'ABSPATH' ) || exit;

/**
 * An integration is loaded only when the plugin or theme it is for is active, so it
 * can hook that code freely without touching stores that do not use it.
 */
abstract class Integration {
	/**
	 * Whether the plugin or theme this integration is for is active.
	 *
	 * Called on `init`, after every plugin has loaded. Check with class_exists(),
	 * function_exists() or Integration::theme_is() and do not call into the other code here.
	 *
	 * @return bool
	 */
	abstract public function is_active();

	/** Add the hooks. Only called when is_active() is true. */
	abstract public function register();

	/**
	 * Whether a theme, or a child of it, is the active theme.
	 *
	 * @param string $slug Theme folder name, such as "astra".
	 * @return bool
	 */
	protected function theme_is( $slug ) {
		return get_template() === $slug || get_stylesheet() === $slug;
	}
}
