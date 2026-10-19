<?php
/**
 * Register modules after plugin dependencies have loaded.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/** Coordinate dependency checks and module registration. */
final class Plugin {
	/** Register modules in dependency order. */
	public function register() {
		if ( ! Requirements::is_met() ) {
			( new Requirements() )->register();
			return;
		}

		$modules = array(
			Installer::class,
			Settings\Settings::class,
			Campaigns\Post_Type::class,
			Rest\Rest::class,
			Assets::class,
			Admin\Menu::class,
			Admin\Admin_Assets::class,
		);

		foreach ( $modules as $module ) {
			( new $module() )->register();
		}
	}
}
