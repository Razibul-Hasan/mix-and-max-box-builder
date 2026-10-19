<?php
/**
 * Load the Composer WordPress test library using wp-env's test database config.
 *
 * @package MixMax\BoxBuilder
 */

defined( 'ABSPATH' ) || exit;

$mmbb_root = dirname( __DIR__, 3 );

define( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH', $mmbb_root . '/vendor/yoast/phpunit-polyfills' );

require $mmbb_root . '/vendor/wp-phpunit/wp-phpunit/includes/functions.php';

tests_add_filter(
	'muplugins_loaded',
	static function () {
		require WP_PLUGIN_DIR . '/woocommerce/woocommerce.php';
		require dirname( __DIR__, 3 ) . '/mix-and-max-box-builder.php';
	}
);

require $mmbb_root . '/vendor/wp-phpunit/wp-phpunit/includes/bootstrap.php';
