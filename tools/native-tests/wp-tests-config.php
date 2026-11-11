<?php
/**
 * WordPress test-library config for running the integration suite without Docker.
 *
 * It uses the WordPress install this checkout sits in (wp-content/plugins/<slug>) and a
 * separate test database, never the site's own. Development only; never ships.
 *
 * Environment variables (defaults suit a Local site): MMBB_TEST_DB_NAME (mmbb_test),
 * MMBB_TEST_DB_USER (root), MMBB_TEST_DB_PASSWORD (root), MMBB_TEST_DB_HOST (127.0.0.1:10005),
 * MMBB_TEST_PHP_BINARY (the PHP running the tests). Set PHPRC to the folder holding php.ini so
 * the install sub-process loads the same extensions.
 *
 * @package MixMax\BoxBuilder
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals -- These are the WordPress test library's own constants.

/**
 * Read an environment variable with a fallback.
 *
 * @param string $name     Variable name.
 * @param string $fallback Value when it is not set.
 * @return string
 */
function mmbb_test_env( $name, $fallback ) {
	$value = getenv( $name );
	return false === $value || '' === $value ? $fallback : $value;
}

define( 'ABSPATH', dirname( __DIR__, 5 ) . '/' );

define( 'DB_NAME', mmbb_test_env( 'MMBB_TEST_DB_NAME', 'mmbb_test' ) );
define( 'DB_USER', mmbb_test_env( 'MMBB_TEST_DB_USER', 'root' ) );
define( 'DB_PASSWORD', mmbb_test_env( 'MMBB_TEST_DB_PASSWORD', 'root' ) );
define( 'DB_HOST', mmbb_test_env( 'MMBB_TEST_DB_HOST', '127.0.0.1:10005' ) );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );

$table_prefix = 'wptests_'; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- The test library reads this config variable, as wp-config.php does.

define( 'WP_TESTS_DOMAIN', 'example.org' );
define( 'WP_TESTS_EMAIL', 'admin@example.org' );
define( 'WP_TESTS_TITLE', 'ProductBoxes tests' );
define( 'WP_PHP_BINARY', mmbb_test_env( 'MMBB_TEST_PHP_BINARY', PHP_BINARY ) );
define( 'WPLANG', '' );

define( 'WP_DEBUG', true );
