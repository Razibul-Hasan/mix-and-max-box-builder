<?php
/**
 * Bootstrap the selected PHPUnit suite.
 *
 * @package MixMax\BoxBuilder
 */

// Bootstrap entry points establish ABSPATH before guarded test files load.
if ( 'integration' === getenv( 'MMBB_TEST_SUITE' ) ) {
	$mmbb_config    = getenv( 'WP_TESTS_CONFIG_FILE_PATH' );
	$mmbb_tests_dir = getenv( 'WP_TESTS_DIR' );
	if ( ! $mmbb_config && $mmbb_tests_dir ) {
		$mmbb_config = rtrim( $mmbb_tests_dir, '/\\' ) . '/wp-tests-config.php';
	}
	if ( ! $mmbb_config || ! is_readable( $mmbb_config ) ) {
		throw new RuntimeException( 'Run integration tests through npm run test:php inside wp-env.' );
	}
	define( 'WP_TESTS_CONFIG_FILE_PATH', $mmbb_config );
	require_once $mmbb_config;
} elseif ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/vendor/autoload.php';

if ( 'integration' === getenv( 'MMBB_TEST_SUITE' ) ) {
	require __DIR__ . '/integration/bootstrap.php';
}
