<?php
/**
 * The wp-admin menu and the mount point for the admin app.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Admin;

defined( 'ABSPATH' ) || exit;

/** Add the Mix and Max menu with its four pages. */
final class Menu {
	const CAPABILITY = 'manage_woocommerce';
	const SLUG       = 'mmbb';

	/**
	 * Hook suffix of each page, keyed by page id. Filled when the menu is built.
	 *
	 * @var string[]
	 */
	private static $hooks = array();

	/** Register hooks. */
	public function register() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
	}

	/**
	 * Page ids and their menu slugs, in menu order.
	 *
	 * @return string[] Page id => menu slug.
	 */
	public static function slugs() {
		return array(
			'dashboard' => self::SLUG,
			'campaigns' => 'mmbb-campaigns',
			'analytics' => 'mmbb-analytics',
			'settings'  => 'mmbb-settings',
		);
	}

	/**
	 * Admin address of every page.
	 *
	 * @return string[] Page id => URL.
	 */
	public static function urls() {
		$urls = array();
		foreach ( self::slugs() as $id => $slug ) {
			$urls[ $id ] = admin_url( 'admin.php?page=' . $slug );
		}
		return $urls;
	}

	/**
	 * Find the page id for a hook suffix, or an empty string for any other screen.
	 *
	 * @param string $hook_suffix Hook suffix of the current admin screen.
	 * @return string
	 */
	public static function page_for_hook( $hook_suffix ) {
		$page = array_search( $hook_suffix, self::$hooks, true );
		return false === $page ? '' : (string) $page;
	}

	/** Add the top-level menu and the four pages. */
	public function add_menu() {
		$labels = array(
			'dashboard' => __( 'Dashboard', 'mix-and-max-box-builder' ),
			'campaigns' => __( 'Campaigns', 'mix-and-max-box-builder' ),
			'analytics' => __( 'Analytics', 'mix-and-max-box-builder' ),
			'settings'  => __( 'Settings', 'mix-and-max-box-builder' ),
		);

		// WooCommerce puts Products at 55.5, so 56 sits right after it.
		self::$hooks['dashboard'] = (string) add_menu_page(
			__( 'Mix and Max', 'mix-and-max-box-builder' ),
			__( 'Mix and Max', 'mix-and-max-box-builder' ),
			self::CAPABILITY,
			self::SLUG,
			function () {
				$this->render( 'dashboard' );
			},
			'dashicons-archive',
			56
		);

		foreach ( self::slugs() as $id => $slug ) {
			if ( 'dashboard' === $id ) {
				// The first submenu repeats the top-level page under its own name.
				add_submenu_page( self::SLUG, $labels[ $id ], $labels[ $id ], self::CAPABILITY, $slug );
				continue;
			}
			self::$hooks[ $id ] = (string) add_submenu_page(
				self::SLUG,
				$labels[ $id ],
				$labels[ $id ],
				self::CAPABILITY,
				$slug,
				function () use ( $id ) {
					$this->render( $id );
				}
			);
		}
	}

	/**
	 * Mark our screens so the stylesheet can remove wp-admin's content padding.
	 *
	 * @param string $classes Space-separated body classes.
	 * @return string
	 */
	public function body_class( $classes ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && in_array( $screen->id, self::$hooks, true ) ) {
			$classes .= ' mmbb-admin-page';
		}
		return $classes;
	}

	/**
	 * Print the mount point. The app renders into it.
	 *
	 * @param string $page Page id.
	 */
	public function render( $page ) {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to access this page.', 'mix-and-max-box-builder' ), 403 );
		}
		printf(
			'<div id="mmbb-admin" class="mmbb-root" data-page="%s"></div>',
			esc_attr( $page )
		);
	}
}
