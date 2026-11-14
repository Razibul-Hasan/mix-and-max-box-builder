<?php
/**
 * The versioned upgrade routine against a real database.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Installer;
use MixMax\BoxBuilder\Upgrades;

/** Steps run once, in order, and a second run changes nothing. */
class UpgradesTest extends \WP_UnitTestCase {
	/**
	 * Versions of the test steps that ran, in order.
	 *
	 * @var string[]
	 */
	private $ran = array();

	/** Prepare WooCommerce tables outside per-test transactions. */
	public static function set_up_before_class() {
		parent::set_up_before_class();
		\WC_Install::install();
	}

	/**
	 * Test steps that record when they run.
	 *
	 * @return array
	 */
	private function steps() {
		$steps = array();
		foreach ( array( '3.1.0', '3.0.0', '3.0.2' ) as $version ) {
			$steps[ $version ] = function () use ( $version ) {
				$this->ran[] = $version;
			};
		}
		return $steps;
	}

	/** Pending steps run oldest first and the stored version ends at the newest. */
	public function test_steps_run_in_order_and_record_the_version() {
		update_option( 'mmbb_db_version', '3.0.0' );

		$this->assertSame( array( '3.0.2', '3.1.0' ), Upgrades::run( $this->steps() ) );
		$this->assertSame( array( '3.0.2', '3.1.0' ), $this->ran );
		$this->assertSame( '3.1.0', get_option( 'mmbb_db_version' ) );
	}

	/** A second run finds nothing to do. */
	public function test_a_second_run_does_nothing() {
		update_option( 'mmbb_db_version', '0.9.0' );
		Upgrades::run( $this->steps() );
		$this->ran = array();

		$this->assertSame( array(), Upgrades::run( $this->steps() ) );
		$this->assertSame( array(), $this->ran );
		$this->assertSame( '3.1.0', get_option( 'mmbb_db_version' ) );
	}

	/** A step that fails leaves the version at the last finished step, so the next run resumes there. */
	public function test_a_failed_step_is_retried() {
		update_option( 'mmbb_db_version', '0.9.0' );
		$steps          = $this->steps();
		$steps['3.0.2'] = static function () {
			throw new \RuntimeException( 'step failed' );
		};

		try {
			Upgrades::run( $steps );
			$this->fail( 'The failing step should have thrown.' );
		} catch ( \RuntimeException $e ) {
			$this->assertSame( 'step failed', $e->getMessage() );
		}
		$this->assertSame( array( '3.0.0' ), $this->ran );
		$this->assertSame( '3.0.0', get_option( 'mmbb_db_version' ) );

		$this->assertSame( array( '3.0.2', '3.1.0' ), Upgrades::run( $this->steps() ) );
	}

	/** A 1.0.0 site (schema 0.9.0) is upgraded on admin_init, keeps its data, and the second pass changes nothing. */
	public function test_a_1_0_0_site_upgrades_once() {
		global $wpdb;
		Installer::install();
		$settings = array(
			'enabled'       => false,
			'allow_coupons' => true,
		);
		update_option( 'mmbb_version', '1.0.0' );
		update_option( 'mmbb_db_version', '0.9.0' );
		update_option( 'mmbb_settings', $settings );
		$campaign = self::factory()->post->create( array( 'post_type' => 'mmbb_campaign' ) );
		$config   = '{"type":"bundle","design":{"layout":"bar","headline":"Old box"}}';
		update_post_meta( $campaign, '_mmbb_config', wp_slash( $config ) );

		$this->assertSame( 10, has_action( 'admin_init', array( Installer::class, 'maybe_upgrade' ) ) );
		Installer::maybe_upgrade();

		$this->assertSame( Installer::DB_VERSION, get_option( 'mmbb_db_version' ) );
		$this->assertSame( MMBB_VERSION, get_option( 'mmbb_version' ) );
		$this->assertSame( $settings, get_option( 'mmbb_settings' ) );
		$upgraded = get_post_meta( $campaign, '_mmbb_config', true );
		$decoded  = json_decode( $upgraded, true );
		$this->assertSame( 'bar', $decoded['design']['layout'] );
		$this->assertSame( 'Old box', $decoded['design']['headline'] );
		$this->assertSame( 'spotlight', $decoded['design']['template'] );
		$this->assertSame( 'Old box', $decoded['design']['content']['headline'] );
		$this->assertTrue( $decoded['box']['allow_coupons'] );

		$options = $wpdb->get_results( "SELECT option_name, option_value, autoload FROM {$wpdb->options} WHERE option_name LIKE 'mmbb\_%' ORDER BY option_name", ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Test reads the raw stored rows.
		$queries = $wpdb->num_queries;
		Installer::maybe_upgrade();
		$this->assertSame( $queries, $wpdb->num_queries, 'The second pass runs no query.' );
		Installer::install();
		$this->assertSame( $options, $wpdb->get_results( "SELECT option_name, option_value, autoload FROM {$wpdb->options} WHERE option_name LIKE 'mmbb\_%' ORDER BY option_name", ARRAY_A ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Test reads the raw stored rows.
		$this->assertSame( $upgraded, get_post_meta( $campaign, '_mmbb_config', true ) );
	}

	/** The version options are not autoloaded. */
	public function test_version_options_are_not_autoloaded() {
		global $wpdb;
		delete_option( 'mmbb_db_version' );
		delete_option( 'mmbb_version' );
		Installer::install();

		$autoload = $wpdb->get_col( "SELECT autoload FROM {$wpdb->options} WHERE option_name IN ( 'mmbb_db_version', 'mmbb_version' )" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Test reads the raw stored rows.
		$this->assertCount( 2, $autoload );
		foreach ( $autoload as $value ) {
			$this->assertContains( $value, array( 'no', 'off', 'auto-off' ) );
		}
	}
}
