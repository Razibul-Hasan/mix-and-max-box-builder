<?php
/**
 * Run the shared colour fixtures through the PHP resolver.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Storefront\Colors;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** The PHP and JS resolvers must give identical colours for every fixture. */
class ColorsTest extends TestCase {
	/**
	 * Load the shared fixtures.
	 *
	 * @return array
	 */
	public function fixture_provider() {
		$file  = dirname( __DIR__, 2 ) . '/fixtures/color-cases.json';
		$data  = json_decode( file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$cases = array();
		foreach ( $data['cases'] as $fixture ) {
			$cases[ $fixture['name'] ] = array( $fixture );
		}
		return $cases;
	}

	/**
	 * Every fixture resolves to the expected colours, in the same order.
	 *
	 * @dataProvider fixture_provider
	 * @param array $fixture Fixture.
	 */
	public function test_fixture( array $fixture ) {
		$this->assertSame( $fixture['expected'], Colors::resolve( $fixture['design'], $fixture['themeAccent'] ) );
	}

	/** Hex colours are normalised and anything else is rejected. */
	public function test_normalize_hex() {
		$this->assertSame( '#aabbcc', Colors::normalize_hex( '#ABC' ) );
		$this->assertSame( '#f04e12', Colors::normalize_hex( 'f04e12' ) );
		$this->assertSame( '', Colors::normalize_hex( 'red' ) );
		$this->assertSame( '', Colors::normalize_hex( '#12345' ) );
		$this->assertSame( '', Colors::normalize_hex( array( '#fff' ) ) );
	}

	/** The style attribute lists the properties in order. */
	public function test_style() {
		$this->assertSame(
			'--max:#3858e9;--on-max:#ffffff',
			Colors::style(
				array(
					'--max'    => '#3858e9',
					'--on-max' => '#ffffff',
				)
			)
		);
	}
}
