<?php
/**
 * Plugin Name: ProductBoxes live preview switcher
 * Description: Live preview only. A toolbar button that moves between the demo store and the ProductBoxes admin, and a "Hire an expert" link.
 *
 * The blueprint installs this as a must-use plugin. It is never shipped in the plugin zip.
 *
 * @package MixMax\BoxBuilder
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_bar_menu', 'mmbb_demo_bar', 100 );
add_action( 'wp_enqueue_scripts', 'mmbb_demo_bar_style' );
add_action( 'admin_enqueue_scripts', 'mmbb_demo_bar_style' );

/**
 * Add the switcher with its menu of demo screens, and the expert link.
 *
 * @param WP_Admin_Bar $bar Toolbar.
 */
function mmbb_demo_bar( $bar ) {
	if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- WooCommerce's capability, the same one the plugin's screens use.
		return;
	}
	$links    = get_option( 'mmbb_demo_links', array() );
	$gallery  = isset( $links['gallery'] ) ? (int) $links['gallery'] : 0;
	$pages    = isset( $links['pages'] ) && is_array( $links['pages'] ) ? $links['pages'] : array();
	$campaign = isset( $links['campaign'] ) ? (int) $links['campaign'] : 0;

	$bar->add_node(
		array(
			'id'    => 'mmbb-demo',
			'title' => is_admin() ? 'View the demo store &rarr;' : 'Open the box builder admin &rarr;',
			'href'  => is_admin() ? ( $gallery ? get_permalink( $gallery ) : home_url( '/' ) ) : admin_url( 'admin.php?page=mmbb' ),
		)
	);

	$store = array( array( 'gallery', 'All 10 templates', $gallery ? get_permalink( $gallery ) : home_url( '/' ) ) );
	foreach ( $pages as $index => $page ) {
		$store[] = array(
			'page-' . $index,
			sprintf( '%02d · %s — %s', $index + 1, $page['name'], $page['title'] ),
			get_permalink( (int) $page['page_id'] ),
		);
	}
	$store[] = array( 'cart', 'Cart', function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : '' );

	$groups = array(
		'mmbb-demo-store' => $store,
		'mmbb-demo-admin' => array(
			array( 'dashboard', 'Admin: Dashboard', admin_url( 'admin.php?page=mmbb' ) ),
			array( 'campaigns', 'Admin: Campaigns', admin_url( 'admin.php?page=mmbb-campaigns' ) ),
			array( 'edit', 'Admin: Edit the coffee box', $campaign ? admin_url( 'admin.php?page=mmbb-campaigns&action=edit&id=' . $campaign ) : '' ),
			array( 'new', 'Admin: Create a campaign', admin_url( 'admin.php?page=mmbb-campaigns&action=new' ) ),
			array( 'analytics', 'Admin: Analytics', admin_url( 'admin.php?page=mmbb-analytics' ) ),
			array( 'settings', 'Admin: Settings', admin_url( 'admin.php?page=mmbb-settings' ) ),
		),
	);
	foreach ( $groups as $group => $items ) {
		$bar->add_group(
			array(
				'parent' => 'mmbb-demo',
				'id'     => $group,
				'meta'   => array( 'class' => 'mmbb-demo-admin' === $group ? 'ab-sub-secondary' : '' ),
			)
		);
		foreach ( $items as $item ) {
			if ( '' !== $item[2] && false !== $item[2] ) {
				$bar->add_node(
					array(
						'parent' => $group,
						'id'     => 'mmbb-demo-' . $item[0],
						'title'  => esc_html( $item[1] ),
						'href'   => $item[2],
					)
				);
			}
		}
	}

	$bar->add_node(
		array(
			'id'     => 'mmbb-demo-expert',
			'parent' => 'top-secondary',
			'title'  => 'Hire an expert &rarr;',
			'href'   => 'https://bestwebexpert.com/',
			'meta'   => array(
				'target' => '_blank',
				'rel'    => 'noopener',
			),
		)
	);
}

/** Make the switcher and the expert link stand out, on phones too. */
function mmbb_demo_bar_style() {
	if ( ! is_admin_bar_showing() ) {
		return;
	}
	wp_add_inline_style(
		'admin-bar',
		'#wpadminbar #wp-admin-bar-mmbb-demo > .ab-item{background:#f04e12;color:#fff;font-weight:600;padding:0 14px}'
		. '#wpadminbar #wp-admin-bar-mmbb-demo:hover > .ab-item,#wpadminbar #wp-admin-bar-mmbb-demo > .ab-item:focus{background:#c93d0b;color:#fff}'
		. '#wpadminbar #wp-admin-bar-mmbb-demo-expert > .ab-item{background:#16a34a;color:#fff;font-weight:600;padding:0 14px}'
		. '#wpadminbar #wp-admin-bar-mmbb-demo-expert:hover > .ab-item,#wpadminbar #wp-admin-bar-mmbb-demo-expert > .ab-item:focus{background:#15803d;color:#fff}'
		. '@media screen and (max-width:782px){#wpadminbar li#wp-admin-bar-mmbb-demo{display:block}'
		. '#wpadminbar #wp-admin-bar-mmbb-demo > .ab-item{width:auto;font-size:14px;line-height:46px;height:46px;padding:0 12px;text-indent:0}}'
	);
}
