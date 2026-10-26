<?php
/**
 * Plugin Name: Mix and Max Box Builder — Plugin Check dev ignores
 * Description: Development only. Makes Plugin Check skip the dev files that .distignore keeps out of the release zip, so the in-place checkout can be checked from wp-admin. Copy into wp-content/mu-plugins/. Never ships.
 *
 * @package MixMax\BoxBuilder
 */

defined( 'ABSPATH' ) || exit;

/**
 * Directories inside the plugin that never ship (mirrors .distignore).
 *
 * @return string[]
 */
function mmbb_dev_plugin_check_directories() {
	return array( '.claude', '.git', 'build-cache', 'coverage', 'design', 'docs', 'tests', 'tools' );
}

/**
 * Root files inside the plugin that never ship (mirrors .distignore).
 *
 * @return string[]
 */
function mmbb_dev_plugin_check_files() {
	return array(
		'.distignore',
		'.editorconfig',
		'.eslintrc.json',
		'.gitattributes',
		'.gitignore',
		'.phpcs-cache',
		'.phpunit.result.cache',
		'.prettierrc.json',
		'.stylelintrc.json',
		'.wp-env.json',
		'.wp-env.override.json',
		'AGENTS.md',
		'CLAUDE.md',
		'composer.json',
		'composer.lock',
		'jest-unit.config.js',
		'mix-and-max-box-builder.zip',
		'package-lock.json',
		'phpcs.xml.dist',
		'phpunit.xml.dist',
	);
}

add_filter(
	'wp_plugin_check_ignore_directories',
	static function ( $dirs ) {
		// Plugin Check matches "/$dir/" anywhere in the path, so the plugin slug keeps this scoped to us.
		foreach ( mmbb_dev_plugin_check_directories() as $dir ) {
			$dirs[] = 'mix-and-max-box-builder/' . $dir;
		}
		return $dirs;
	}
);

add_filter(
	'wp_plugin_check_ignore_files',
	static function ( $files ) {
		// Plugin Check matches "/$file" at the end of the path.
		foreach ( mmbb_dev_plugin_check_files() as $file ) {
			$files[] = 'mix-and-max-box-builder/' . $file;
		}
		return $files;
	}
);
