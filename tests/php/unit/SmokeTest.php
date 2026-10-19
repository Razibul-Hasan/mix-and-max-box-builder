<?php
/**
 * Check the pure PHP test environment.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use PHPUnit\Framework\TestCase;

/** Pure tests must work without loading WordPress. */
class SmokeTest extends TestCase {
	/** Verify that the unit suite stays isolated from WordPress. */
	public function test_wordpress_is_not_loaded() {
		$this->assertFalse( function_exists( 'add_action' ) );
		$this->assertTrue( defined( 'ABSPATH' ) );
	}
}
