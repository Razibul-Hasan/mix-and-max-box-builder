<?php
/**
 * Network lifecycle coverage, enabled by WP_MULTISITE in wp-env.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Installer;
use MixMax\BoxBuilder\Settings\Settings;
use MixMax\BoxBuilder\Uninstaller;

/**
 * Check per-site initialization and consent.
 *
 * @group ms-required
 */
class MultisiteLifecycleTest extends \WP_UnitTestCase {
	/** Skip network-specific fixtures in the standard single-site environment. */
	public function set_up() {
		parent::set_up();
		$this->skipWithoutMultisite();
	}

	/** Network activation seeds each site and restores the caller's context. */
	public function test_network_activation_and_per_site_uninstall() {
		$original = get_current_blog_id();
		$other    = self::factory()->blog->create();
		Installer::activate( true );
		$this->assertSame( $original, get_current_blog_id() );
		update_option( 'mmbb_settings', array( 'delete_data' => false ) );
		update_option( 'mmbb_test', 'keep' );

		switch_to_blog( $other );
		try {
			$this->assertSame( MMBB_VERSION, get_option( 'mmbb_version' ) );
			$this->assertSame( Installer::DB_VERSION, get_option( 'mmbb_db_version' ) );
			$this->assertSame( Settings::defaults(), get_option( 'mmbb_settings' ) );
			update_option( 'mmbb_settings', array( 'delete_data' => true ) );
			update_option( 'mmbb_test', 'delete' );
		} finally {
			restore_current_blog();
		}

		Uninstaller::uninstall();
		$this->assertSame( $original, get_current_blog_id() );
		$this->assertSame( 'keep', get_option( 'mmbb_test' ) );
		switch_to_blog( $other );
		try {
			$this->assertFalse( get_option( 'mmbb_settings' ) );
			$this->assertFalse( get_option( 'mmbb_test' ) );
		} finally {
			restore_current_blog();
		}
	}

	/** Newly created sites get defaults only while network activation is enabled. */
	public function test_new_sites_receive_defaults_when_network_active() {
		$original = get_current_blog_id();
		$active   = get_site_option( 'active_sitewide_plugins', array() );
		update_site_option( 'active_sitewide_plugins', array( MMBB_BASENAME => time() ) + $active );
		try {
			$site_id = self::factory()->blog->create();
			$this->assertSame( $original, get_current_blog_id() );
			switch_to_blog( $site_id );
			try {
				$this->assertSame( MMBB_VERSION, get_option( 'mmbb_version' ) );
				$this->assertSame( Settings::defaults(), get_option( 'mmbb_settings' ) );
			} finally {
				restore_current_blog();
			}
		} finally {
			update_site_option( 'active_sitewide_plugins', $active );
		}
	}
}
