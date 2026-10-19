<?php
/**
 * Autoload the plugin's namespaced classes without runtime dependencies.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/** Map WordPress-style class names to files in includes/. */
final class Autoloader {
	/** Register the plugin's loader. */
	public static function register() {
		spl_autoload_register( array( self::class, 'load' ) );
	}

	/**
	 * Load a class belonging to the plugin namespace.
	 *
	 * @param string $class_name Fully qualified class name.
	 */
	public static function load( $class_name ) {
		$prefix = __NAMESPACE__ . '\\';
		if ( 0 !== strpos( $class_name, $prefix ) ) {
			return;
		}

		$relative = substr( $class_name, strlen( $prefix ) );
		if ( ! preg_match( '/^[a-zA-Z0-9_]+(?:\\\\[a-zA-Z0-9_]+)*$/D', $relative ) ) {
			return;
		}

		$parts   = explode( '\\', strtolower( $relative ) );
		$name    = array_pop( $parts );
		$parts[] = 'class-' . $name . '.php';
		$file    = __DIR__ . '/' . str_replace( '_', '-', implode( '/', $parts ) );
		if ( is_readable( $file ) ) {
			require_once $file;
		}
	}
}
