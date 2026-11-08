<?php
/**
 * Plugin Name: ProductBoxes live preview switcher
 * Description: Live preview only. A toolbar button that moves between the demo store and the ProductBoxes admin.
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
 * Add the switcher and its menu of demo screens.
 *
 * @param WP_Admin_Bar $bar Toolbar.
 */
function mmbb_demo_bar( $bar ) {
	if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- WooCommerce's capability, the same one the plugin's screens use.
		return;
	}
	$links = wp_parse_args(
		get_option( 'mmbb_demo_links', array() ),
		array(
			'holiday'  => 0,
			'spa'      => 0,
			'trio'     => 0,
			'campaign' => 0,
		)
	);

	$bar->add_node(
		array(
			'id'    => 'mmbb-demo',
			'title' => is_admin() ? 'View the demo store &rarr;' : 'Open the box builder admin &rarr;',
			'href'  => is_admin() ? home_url( '/' ) : admin_url( 'admin.php?page=mmbb' ),
		)
	);

	$groups = array(
		'mmbb-demo-store' => array(
			array( 'holiday', 'Storefront: Holiday treat box (tiered discounts)', $links['holiday'] ? get_permalink( $links['holiday'] ) : '' ),
			array( 'spa', 'Storefront: Spa kit (fixed sizes, dark theme)', $links['spa'] ? get_permalink( $links['spa'] ) : '' ),
			array( 'trio', 'Storefront: Tea trio (bundle price)', $links['trio'] ? get_permalink( $links['trio'] ) : '' ),
			array( 'cart', 'Cart', function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : '' ),
		),
		'mmbb-demo-admin' => array(
			array( 'dashboard', 'Admin: Dashboard', admin_url( 'admin.php?page=mmbb' ) ),
			array( 'campaigns', 'Admin: Campaigns', admin_url( 'admin.php?page=mmbb-campaigns' ) ),
			array( 'edit', 'Admin: Edit the holiday box', $links['campaign'] ? admin_url( 'admin.php?page=mmbb-campaigns&action=edit&id=' . (int) $links['campaign'] ) : '' ),
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
			if ( '' !== $item[2] ) {
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
}

/** Make the switcher stand out, on phones too. */
function mmbb_demo_bar_style() {
	if ( ! is_admin_bar_showing() ) {
		return;
	}
	wp_add_inline_style(
		'admin-bar',
		'#wpadminbar #wp-admin-bar-mmbb-demo > .ab-item{background:#f04e12;color:#fff;font-weight:600;padding:0 14px}'
		. '#wpadminbar #wp-admin-bar-mmbb-demo:hover > .ab-item,#wpadminbar #wp-admin-bar-mmbb-demo > .ab-item:focus{background:#c93d0b;color:#fff}'
		. '@media screen and (max-width:782px){#wpadminbar li#wp-admin-bar-mmbb-demo{display:block}'
		. '#wpadminbar #wp-admin-bar-mmbb-demo > .ab-item{width:auto;font-size:14px;line-height:46px;height:46px;padding:0 12px;text-indent:0}}'
	);
}
