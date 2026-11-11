<?php
/**
 * Ordered, repeatable data migrations between schema versions.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/**
 * Run each migration step newer than the stored schema version, oldest first.
 *
 * Rules for every step:
 * - It is safe to run twice. A second run changes nothing.
 * - It never drops or renames a stored key. New fields get defaults; old keys stay readable.
 * - Table changes go through dbDelta() in Installer::schema(), not here.
 * - Every query with a variable uses $wpdb->prepare().
 *
 * To add a step: add a `version => method` row to steps() and raise Installer::DB_VERSION to that version.
 */
final class Upgrades {
	/** Option that holds the schema version of the current site. */
	const OPTION = 'mmbb_db_version';

	/**
	 * Every migration step, keyed by the schema version it brings the site to.
	 *
	 * @return array<string, callable>
	 */
	public static function steps() {
		return array(
			'2.0.0' => array( self::class, 'step_2_0_0' ),
		);
	}

	/**
	 * The versions whose steps still have to run, oldest first.
	 *
	 * @param string   $from     Stored schema version. '0' on a new site.
	 * @param string[] $versions Versions that have a step.
	 * @return string[]
	 */
	public static function pending( $from, array $versions ) {
		$pending = array();
		foreach ( $versions as $version ) {
			if ( version_compare( (string) $from, (string) $version, '<' ) ) {
				$pending[] = (string) $version;
			}
		}
		usort( $pending, 'version_compare' );
		return $pending;
	}

	/**
	 * Run the pending steps for the current site and record each one as it finishes.
	 *
	 * The version is saved after every step, so a run that stops half way resumes at the step that failed.
	 *
	 * @param array<string, callable>|null $steps Steps to use instead of steps(). For tests.
	 * @return string[] The versions whose steps ran.
	 */
	public static function run( $steps = null ) {
		$steps = null === $steps ? self::steps() : $steps;
		$ran   = array();
		foreach ( self::pending( (string) get_option( self::OPTION, '0' ), array_keys( $steps ) ) as $version ) {
			call_user_func( $steps[ $version ] );
			update_option( self::OPTION, $version, false );
			$ran[] = $version;
		}
		return $ran;
	}

	/**
	 * 2.0.0: the redesign.
	 *
	 * Empty for now. Redesign Part 6 adds the design settings defaults and Part 11 the rest of the
	 * migration for boxes saved by 1.0.0.
	 */
	private static function step_2_0_0() {
	}
}
