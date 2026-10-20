<?php
/**
 * The private `mmbb_campaign` post type.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Campaigns;

defined( 'ABSPATH' ) || exit;

/** Campaigns are stored as posts, but have no public face and no WordPress UI. */
final class Post_Type {
	const NAME = 'mmbb_campaign';

	/** Post meta holding the JSON config. */
	const META_CONFIG = '_mmbb_config';

	/** Post meta set to 1 while a campaign is paused. */
	const META_PAUSED = '_mmbb_paused';

	/** Register hooks. */
	public function register() {
		add_action( 'init', array( $this, 'register_post_type' ) );
	}

	/** Register the post type. */
	public function register_post_type() {
		$cap = 'manage_woocommerce';

		register_post_type(
			self::NAME,
			array(
				'labels'              => array(
					'name'          => __( 'Campaigns', 'mix-and-max-box-builder' ),
					'singular_name' => __( 'Campaign', 'mix-and-max-box-builder' ),
				),
				'public'              => false,
				'show_ui'             => false,
				'show_in_menu'        => false,
				'show_in_nav_menus'   => false,
				'show_in_admin_bar'   => false,
				'show_in_rest'        => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'has_archive'         => false,
				'rewrite'             => false,
				'query_var'           => false,
				'can_export'          => false,
				'delete_with_user'    => false,
				'supports'            => array( 'title' ),
				// These are primitive WooCommerce capabilities, not post-specific meta capabilities.
				'map_meta_cap'        => false,
				'capabilities'        => array(
					'edit_post'              => $cap,
					'read_post'              => $cap,
					'delete_post'            => $cap,
					'edit_posts'             => $cap,
					'edit_others_posts'      => $cap,
					'delete_posts'           => $cap,
					'publish_posts'          => $cap,
					'read_private_posts'     => $cap,
					'delete_private_posts'   => $cap,
					'delete_published_posts' => $cap,
					'delete_others_posts'    => $cap,
					'edit_private_posts'     => $cap,
					'edit_published_posts'   => $cap,
					'create_posts'           => $cap,
				),
			)
		);
	}
}
