<?php
/**
 * Ordering of the migration steps.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Installer;
use MixMax\BoxBuilder\Upgrades;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** Steps run oldest first, and only those newer than the stored version. */
class UpgradesTest extends TestCase {
	/** A new site runs every step in version order, whatever order they are listed in. */
	public function test_a_new_site_runs_every_step_in_order() {
		$this->assertSame(
			array( '0.9.0', '2.0.0', '2.0.10', '2.1.0' ),
			Upgrades::pending( '0', array( '2.1.0', '0.9.0', '2.0.10', '2.0.0' ) )
		);
	}

	/** Steps at or below the stored version are skipped. */
	public function test_finished_steps_are_skipped() {
		$this->assertSame( array( '2.0.10', '2.1.0' ), Upgrades::pending( '2.0.0', array( '0.9.0', '2.0.0', '2.0.10', '2.1.0' ) ) );
		$this->assertSame( array(), Upgrades::pending( '2.1.0', array( '0.9.0', '2.0.0', '2.1.0' ) ) );
	}

	/** A site that was downgraded (stored version ahead of the code) runs nothing. */
	public function test_a_newer_stored_version_runs_nothing() {
		$this->assertSame( array(), Upgrades::pending( '99.0.0', array( '2.0.0' ) ) );
	}

	/** The schema version constant is the newest step, so maybe_upgrade() notices every new step. */
	public function test_schema_version_matches_the_newest_step() {
		$versions = array_keys( Upgrades::steps() );
		usort( $versions, 'version_compare' );
		$this->assertSame( Installer::DB_VERSION, end( $versions ) );
		foreach ( Upgrades::steps() as $version => $step ) {
			$this->assertTrue( is_callable( $step, true ), $version );
			$this->assertTrue( method_exists( $step[0], $step[1] ), $version );
		}
	}
}
