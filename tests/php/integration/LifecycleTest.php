<?php
/**
 * Exercise lifecycle operations against WordPress and WooCommerce.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Installer;
use MixMax\BoxBuilder\Uninstaller;

/** Installation must be repeatable and uninstall must respect ownership and consent. */
class LifecycleTest extends \WP_UnitTestCase {
	/** Prepare WooCommerce tables outside per-test transactions. */
	public static function set_up_before_class() {
		parent::set_up_before_class();
		\WC_Install::install();
	}

	/** Register the future campaign type only as a fixture for lifecycle tests. */
	public function set_up() {
		parent::set_up();
		register_post_type( 'mmbb_campaign', array( 'public' => false ) );
	}

	/** Remove the test-only type registration. */
	public function tear_down() {
		unregister_post_type( 'mmbb_campaign' );
		parent::tear_down();
	}

	/** Activation installs versions and safe defaults with no rewrite flush. */
	public function test_activation_seeds_versions_and_settings() {
		delete_option( 'mmbb_version' );
		delete_option( 'mmbb_db_version' );
		delete_option( 'mmbb_settings' );
		update_option( 'rewrite_rules', array( 'mmbb-test' => 'index.php' ) );

		Installer::activate();

		$this->assertSame( MMBB_VERSION, get_option( 'mmbb_version' ) );
		$this->assertSame( Installer::DB_VERSION, get_option( 'mmbb_db_version' ) );
		$this->assertSame( array( 'delete_data' => false ), get_option( 'mmbb_settings' ) );
		$this->assertSame( array( 'mmbb-test' => 'index.php' ), get_option( 'rewrite_rules' ) );
	}

	/** An upgrade updates old versions once and preserves merchant preferences. */
	public function test_upgrade_is_idempotent() {
		$settings = array(
			'delete_data' => true,
			'enabled'     => false,
		);
		update_option( 'mmbb_version', '0.0.1' );
		update_option( 'mmbb_db_version', '0.0.1' );
		update_option( 'mmbb_settings', $settings );

		Installer::maybe_upgrade();
		$this->assertSame( MMBB_VERSION, get_option( 'mmbb_version' ) );
		$this->assertSame( Installer::DB_VERSION, get_option( 'mmbb_db_version' ) );
		$this->assertSame( $settings, get_option( 'mmbb_settings' ) );

		global $wpdb;
		$queries = $wpdb->num_queries;
		Installer::maybe_upgrade();
		$this->assertSame( $queries, $wpdb->num_queries );
		$this->assertSame( $settings, get_option( 'mmbb_settings' ) );
	}

	/** A downgraded plugin must not lower the saved schema version. */
	public function test_install_does_not_downgrade_versions() {
		update_option( 'mmbb_version', '99.0.0' );
		update_option( 'mmbb_db_version', '99.0.0' );
		Installer::install();
		$this->assertSame( '99.0.0', get_option( 'mmbb_version' ) );
		$this->assertSame( '99.0.0', get_option( 'mmbb_db_version' ) );
	}

	/** Deactivating and reactivating retain existing data and settings. */
	public function test_deactivation_and_reactivation_preserve_data() {
		Installer::activate();
		update_option( 'mmbb_settings', array( 'delete_data' => true ) );
		update_option( 'mmbb_test', 'keep' );
		Installer::deactivate();
		Installer::activate();
		$this->assertSame( 'keep', get_option( 'mmbb_test' ) );
		$this->assertSame( array( 'delete_data' => true ), get_option( 'mmbb_settings' ) );
	}

	/**
	 * Missing, false and invalid preferences must not authorize deletion.
	 *
	 * @dataProvider retained_settings
	 * @param mixed $settings Stored deletion preference.
	 */
	public function test_uninstall_without_opt_in_keeps_data( $settings ) {
		Installer::activate();
		if ( null === $settings ) {
			delete_option( 'mmbb_settings' );
		} else {
			update_option( 'mmbb_settings', $settings );
		}
		update_option( 'mmbb_test', 'keep' );
		set_transient( 'mmbb_test', 'keep', HOUR_IN_SECONDS );
		$campaign = self::factory()->post->create( array( 'post_type' => 'mmbb_campaign' ) );
		add_post_meta( $campaign, '_mmbb_config', 'keep' );
		$product = new \WC_Product_Simple();
		$product->update_meta_data( '_mmbb_campaign_id', $campaign );
		$product->save();

		Uninstaller::uninstall();

		$this->assertSame( 'keep', get_option( 'mmbb_test' ) );
		$this->assertSame( MMBB_VERSION, get_option( 'mmbb_version' ) );
		$this->assertSame( 'keep', get_transient( 'mmbb_test' ) );
		$this->assertNotNull( get_post( $campaign ) );
		$this->assertSame( 'keep', get_post_meta( $campaign, '_mmbb_config', true ) );
		$this->assertNotNull( get_post( $product->get_id() ) );
	}

	/**
	 * Preferences which are not an explicit opt-in.
	 *
	 * @return array[]
	 */
	public function retained_settings() {
		return array(
			'missing option' => array( null ),
			'default'        => array( array( 'delete_data' => false ) ),
			'missing key'    => array( array() ),
			'string false'   => array( array( 'delete_data' => 'false' ) ),
			'malformed'      => array( 'invalid' ),
		);
	}

	/** Opt-in removes owned data while preserving orders and unrelated records. */
	public function test_opt_in_uninstall_removes_only_owned_data() {
		update_option( 'mmbb_settings', array( 'delete_data' => true ) );
		update_option( 'mmbb_test', 'delete' );
		update_option( 'mmbbXtest', 'keep' );
		set_transient( 'mmbb_test', 'delete', HOUR_IN_SECONDS );
		set_transient( 'mmbbXtest', 'keep', HOUR_IN_SECONDS );
		$campaign = self::factory()->post->create( array( 'post_type' => 'mmbb_campaign' ) );
		add_post_meta( $campaign, '_mmbb_config', 'delete' );
		$container = new \WC_Product_Simple();
		$container->update_meta_data( '_mmbb_campaign_id', $campaign );
		$container->save();
		$product = new \WC_Product_Simple();
		$product->save();
		$order = wc_create_order();
		// Even an order with the ownership marker must survive.
		$order->update_meta_data( '_mmbb_campaign_id', $campaign );
		$order->update_meta_data( 'mmbb_test', 'keep' );
		$order->save();

		Uninstaller::uninstall();

		$this->assertFalse( get_option( 'mmbb_settings' ) );
		$this->assertFalse( get_option( 'mmbb_test' ) );
		$this->assertFalse( get_transient( 'mmbb_test' ) );
		$this->assertSame( 'keep', get_option( 'mmbbXtest' ) );
		$this->assertSame( 'keep', get_transient( 'mmbbXtest' ) );
		$this->assertNull( get_post( $campaign ) );
		$this->assertSame( '', get_post_meta( $campaign, '_mmbb_config', true ) );
		$this->assertNull( get_post( $container->get_id() ) );
		$this->assertNotNull( get_post( $product->get_id() ) );
		$saved_order = wc_get_order( $order->get_id() );
		$this->assertInstanceOf( \WC_Order::class, $saved_order );
		$this->assertSame( 'keep', $saved_order->get_meta( 'mmbb_test' ) );
	}
}
