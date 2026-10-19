<?php
/**
 * Verify the admin menu and that admin assets load only on our pages.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Admin\Admin_Assets;
use MixMax\BoxBuilder\Admin\Menu;

/** Menu, mount point and asset scoping. */
class AdminMenuTest extends \WP_UnitTestCase {
	/**
	 * Build the menu as an administrator.
	 *
	 * @return void
	 */
	private function build_menu() {
		global $menu, $submenu;
		$menu    = array(); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		$submenu = array(); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		get_userdata( get_current_user_id() )->add_cap( 'manage_woocommerce' );
		( new Menu() )->add_menu();
	}

	/** The top-level menu has four submenus guarded by manage_woocommerce. */
	public function test_menu_has_four_pages_with_the_capability() {
		global $submenu;
		$this->build_menu();
		$this->assertArrayHasKey( 'mmbb', $submenu );
		$slugs = wp_list_pluck( $submenu['mmbb'], 2 );
		$this->assertSame( array( 'mmbb', 'mmbb-campaigns', 'mmbb-analytics', 'mmbb-settings' ), $slugs );
		foreach ( $submenu['mmbb'] as $item ) {
			$this->assertSame( 'manage_woocommerce', $item[1] );
		}
	}

	/** Every page prints the mount point; a user without the capability gets nothing. */
	public function test_render_prints_the_mount_point_only_for_allowed_users() {
		$this->build_menu();
		ob_start();
		( new Menu() )->render( 'campaigns' );
		$html = ob_get_clean();
		$this->assertStringContainsString( 'id="mmbb-admin"', $html );
		$this->assertStringContainsString( 'class="mmbb-root"', $html );
		$this->assertStringContainsString( 'data-page="campaigns"', $html );

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'subscriber' ) ) );
		$this->expectException( 'WPDieException' );
		( new Menu() )->render( 'campaigns' );
	}

	/** Our handles load on our screens and not on Posts or Plugins. */
	public function test_assets_load_only_on_our_pages() {
		if ( ! file_exists( MMBB_PATH . 'build/admin.asset.php' ) ) {
			$this->markTestSkipped( 'Run npm run build first.' );
		}
		$this->build_menu();
		( new \MixMax\BoxBuilder\Assets() )->register_assets();
		$assets = new Admin_Assets();

		foreach ( array( 'edit.php', 'plugins.php', 'index.php' ) as $hook ) {
			$assets->enqueue( $hook );
		}
		$this->assertFalse( wp_script_is( 'mmbb-admin', 'enqueued' ) );
		$this->assertFalse( wp_style_is( 'mmbb-admin', 'enqueued' ) );
		$this->assertFalse( wp_style_is( 'mmbb-components', 'enqueued' ) );

		$assets->enqueue( 'mix-and-max_page_mmbb-campaigns' );
		$this->assertTrue( wp_script_is( 'mmbb-admin', 'enqueued' ) );
		$this->assertTrue( wp_style_is( 'mmbb-admin', 'enqueued' ) );
		$this->assertTrue( wp_style_is( 'mmbb-tokens', 'enqueued' ) );
		$before = wp_scripts()->get_data( 'mmbb-admin', 'before' );
		$this->assertStringContainsString( 'window.mmbbAdmin = ', implode( '', (array) $before ) );
	}

	/** The data object carries everything the app needs. */
	public function test_data_has_the_documented_keys() {
		$data = Admin_Assets::get_data( 'dashboard' );
		foreach ( array( 'page', 'urls', 'templates', 'money', 'adminUrl', 'storeUrl', 'version', 'wcVersion', 'timezone', 'locale' ) as $key ) {
			$this->assertArrayHasKey( $key, $data );
		}
		foreach ( array( 'dashboard', 'campaigns', 'analytics', 'settings', 'newCampaign' ) as $key ) {
			$this->assertArrayHasKey( $key, $data['urls'] );
		}
		$this->assertSame( 'blank', $data['templates'][0]['id'] );
	}
}
