<?php
/**
 * Run the shared pricing fixtures through the PHP engine.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Pricing;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** The PHP and JS engines must give identical answers for every fixture. */
class PricingTest extends TestCase {
	/**
	 * Load the shared fixtures.
	 *
	 * @return array
	 */
	public function fixture_provider() {
		$file  = dirname( __DIR__, 2 ) . '/fixtures/pricing-cases.json';
		$data  = json_decode( file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$cases = array();
		foreach ( $data['cases'] as $fixture ) {
			$cases[ $fixture['name'] ] = array( $fixture );
		}
		return $cases;
	}

	/**
	 * Every fixture produces the expected quote.
	 *
	 * @dataProvider fixture_provider
	 * @param array $fixture Fixture.
	 */
	public function test_fixture( array $fixture ) {
		$quote = Pricing::quote( $fixture['config'], $fixture['items'], $fixture['options'] );

		foreach ( array( 'count', 'subtotal', 'discount', 'fee', 'total' ) as $key ) {
			$this->assertSame( $fixture['expected'][ $key ], $quote[ $key ], $key );
		}
		$this->assertSame( $fixture['expected']['valid'], $quote['valid'] );
		$this->assertSame( $fixture['expected']['errors'], $quote['errors'] );
		$this->assertEquals( $fixture['expected']['tier'], $quote['tier'] );
		$this->assertEquals( $fixture['expected']['next'], $quote['next'] );
	}

	/** There are enough fixtures and they cover every type. */
	public function test_fixture_coverage() {
		$cases = $this->fixture_provider();
		$this->assertGreaterThanOrEqual( 25, count( $cases ) );
		$types = array();
		foreach ( $cases as $entry ) {
			$types[ $entry[0]['config']['type'] ] = true;
		}
		$types = array_keys( $types );
		sort( $types );
		$this->assertSame( array( 'bundle', 'fixed', 'tiered' ), $types );
	}
}
