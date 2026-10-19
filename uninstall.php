<?php
/**
 * Remove plugin data only when each merchant has explicitly opted in.
 *
 * @package MixMax\BoxBuilder
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

require_once __DIR__ . '/includes/class-autoloader.php';
\MixMax\BoxBuilder\Autoloader::register();
\MixMax\BoxBuilder\Uninstaller::uninstall();
