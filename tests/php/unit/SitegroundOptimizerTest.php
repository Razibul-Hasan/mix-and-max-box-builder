<?php
/**
 * SiteGround Optimizer integration: the script exclude lists.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Assets;
use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Compatibility\Plugins\Siteground_Optimizer;
use MixMax\BoxBuilder\Storefront\Storefront;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** SG Optimizer must not minify, combine or defer the plugin's scripts. */
final class SitegroundOptimizerTest extends TestCase {
	/** The storefront and components scripts are both excluded. */
	public function test_handles_are_the_storefront_and_components_scripts() {
		$this->assertSame( array( 'mmbb-storefront', 'mmbb-components' ), Siteground_Optimizer::handles() );
		$this->assertSame( array( Storefront::HANDLE, Assets::HANDLE ), Siteground_Optimizer::handles() );
	}

	/** Handles other code excluded are kept, and ours are added after them. */
	public function test_exclude_adds_to_an_existing_list() {
		$this->assertSame( array( 'foo', 'mmbb-storefront', 'mmbb-components' ), ( new Siteground_Optimizer() )->exclude( array( 'foo' ) ) );
	}

	/** A value that is not a list is treated as empty. */
	public function test_exclude_treats_a_non_array_as_empty() {
		$integration = new Siteground_Optimizer();
		$this->assertSame( array( 'mmbb-storefront', 'mmbb-components' ), $integration->exclude( null ) );
		$this->assertSame( array( 'mmbb-storefront', 'mmbb-components' ), $integration->exclude( 'foo' ) );
	}

	/** A handle already in the list is not added twice, and the result is a plain list. */
	public function test_exclude_does_not_duplicate_handles() {
		$this->assertSame(
			array( 'mmbb-storefront', 'foo', 'mmbb-components' ),
			( new Siteground_Optimizer() )->exclude( array( 'mmbb-storefront', 'foo' ) )
		);
		$this->assertSame(
			array( 'mmbb-storefront', 'mmbb-components' ),
			( new Siteground_Optimizer() )->exclude( array( 3 => 'mmbb-storefront' ) )
		);
	}
}
