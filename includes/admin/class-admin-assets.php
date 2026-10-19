<?php
/**
 * Scripts, styles and data for the admin app, loaded only on our pages.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Admin;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Assets;
use MixMax\BoxBuilder\Campaigns\Templates;

/** Enqueue the admin app on the four Mix and Max screens and nowhere else. */
final class Admin_Assets {
	/** Register hooks. */
	public function register() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	/**
	 * Enqueue the app when the current screen is one of ours.
	 *
	 * @param string $hook_suffix Hook suffix of the current admin screen.
	 */
	public function enqueue( $hook_suffix ) {
		$page = Menu::page_for_hook( (string) $hook_suffix );
		if ( '' === $page || ! current_user_can( Menu::CAPABILITY ) ) {
			return;
		}

		$asset_file = MMBB_PATH . 'build/admin.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset = require $asset_file;

		wp_enqueue_style( 'mmbb-components' );
		wp_enqueue_style( 'mmbb-admin', MMBB_URL . 'build/admin.css', array( 'mmbb-components' ), $asset['version'] );
		wp_style_add_data( 'mmbb-admin', 'rtl', 'replace' );

		wp_enqueue_script( 'mmbb-admin', MMBB_URL . 'build/admin.js', $asset['dependencies'], $asset['version'], true );
		wp_set_script_translations( 'mmbb-admin', 'mix-and-max-box-builder', MMBB_PATH . 'languages' );
		wp_add_inline_script( 'mmbb-admin', 'window.mmbbAdmin = ' . wp_json_encode( self::get_data( $page ) ) . ';', 'before' );
	}

	/**
	 * Data the app reads from window.mmbbAdmin.
	 *
	 * @param string $page Page id.
	 * @return array
	 */
	public static function get_data( $page ) {
		$urls                = Menu::urls();
		$urls['newCampaign'] = add_query_arg( 'action', 'new', $urls['campaigns'] );

		$templates = array();
		foreach ( Templates::all() as $template ) {
			$templates[] = array(
				'id'          => $template['id'],
				'title'       => $template['title'],
				'typeLabel'   => $template['type_label'],
				'description' => $template['description'],
				'art'         => $template['art'],
			);
		}

		return array(
			'page'      => $page,
			'urls'      => $urls,
			'templates' => $templates,
			'money'     => Assets::get_money_settings(),
			'adminUrl'  => admin_url(),
			'storeUrl'  => home_url( '/' ),
			'version'   => MMBB_VERSION,
			'wcVersion' => defined( 'WC_VERSION' ) ? WC_VERSION : '',
			'timezone'  => wp_timezone_string(),
			'locale'    => str_replace( '_', '-', get_user_locale() ),
		);
	}
}
