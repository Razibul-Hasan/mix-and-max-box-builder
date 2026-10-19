<?php
/**
 * Verify autoloading and dependency checks without WordPress or WooCommerce.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Requirements;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** A missing dependency must not cause a fatal or require Composer at runtime. */
class AutoloaderTest extends TestCase {
	/** Resolve plugin classes through the plugin's own autoloader. */
	public function test_plugin_class_is_autoloaded_without_wordpress() {
		$this->assertTrue( class_exists( Requirements::class ) );
		$this->assertFalse( Requirements::is_met() );
	}

	/** Ignore foreign namespaces, unknown classes and invalid path fragments. */
	public function test_unrelated_and_invalid_class_names_are_ignored() {
		Autoloader::load( 'Foreign\\Requirements' );
		Autoloader::load( 'MixMax\\BoxBuilder\\..\\Requirements' );
		$this->assertFalse( class_exists( 'MixMax\\BoxBuilder\\Unknown_Class' ) );
		$this->assertFalse( class_exists( 'Foreign\\Requirements', false ) );
	}
}
