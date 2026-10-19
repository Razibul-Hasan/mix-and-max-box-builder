<?php
/**
 * Guard the class references that module lists rely on.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** Every `Name::class` in the module lists must resolve to a real class file. */
class ClassReferencesTest extends TestCase {
	/**
	 * Files to scan and the namespace each one declares.
	 *
	 * @return array
	 */
	public function source_provider() {
		return array(
			'plugin' => array( 'includes/class-plugin.php', 'MixMax\\BoxBuilder' ),
			'rest'   => array( 'includes/rest/class-rest.php', 'MixMax\\BoxBuilder\\Rest' ),
		);
	}

	/**
	 * Each referenced class has a file the autoloader would find, declaring that class.
	 *
	 * @dataProvider source_provider
	 *
	 * @param string $source    Path relative to the plugin root.
	 * @param string $ns Namespace of the scanned file.
	 */
	public function test_class_references_resolve_to_files( $source, $ns ) {
		$root = dirname( __DIR__, 3 );
		$code = file_get_contents( $root . '/' . $source ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$this->assertIsString( $code, $source );

		preg_match_all( '/([A-Za-z_\\\\]+)::class/', $code, $matches );
		$this->assertNotEmpty( $matches[1], $source );

		$prefix = 'MixMax\\BoxBuilder\\';
		foreach ( $matches[1] as $reference ) {
			if ( 'self' === $reference ) {
				continue;
			}
			$fqcn = $ns . '\\' . $reference;

			$this->assertSame( 0, strpos( $fqcn, $prefix ), $fqcn );
			$parts   = explode( '\\', strtolower( substr( $fqcn, strlen( $prefix ) ) ) );
			$name    = array_pop( $parts );
			$parts[] = 'class-' . $name . '.php';
			$file    = $root . '/includes/' . str_replace( '_', '-', implode( '/', $parts ) );

			$this->assertTrue( is_readable( $file ), 'No class file for ' . $fqcn . ' (expected ' . $file . ')' );

			$segments = explode( '\\', $fqcn );
			$short    = end( $segments );
			$this->assertMatchesRegularExpression(
				'/\bclass\s+' . preg_quote( $short, '/' ) . '\b/',
				(string) file_get_contents( $file ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
				$fqcn . ' is not declared in ' . $file
			);
		}
	}
}
