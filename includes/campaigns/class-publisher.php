<?php
/**
 * Go live: place the builder on a page, create the container product, publish.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Campaigns;

defined( 'ABSPATH' ) || exit;

/** Puts a validated campaign live. The caller has checked the config and the user's capabilities. */
final class Publisher {
	/**
	 * Campaign storage.
	 *
	 * @var Campaign_Repository
	 */
	private $repo;

	/**
	 * Create the publisher.
	 *
	 * @param Campaign_Repository|null $repo Storage. Defaults to a new repository.
	 */
	public function __construct( $repo = null ) {
		$this->repo = $repo instanceof Campaign_Repository ? $repo : new Campaign_Repository();
	}

	/**
	 * Publish a campaign.
	 *
	 * Order matters: the container product comes first, so a failure there leaves no
	 * stray page behind. Nothing is published until the page is in place.
	 *
	 * @param int   $campaign_id Campaign id.
	 * @param array $args        { placement: new_page|existing_page|none, page_id, page_title, page_slug }.
	 * @return array|\WP_Error The published campaign.
	 */
	public function publish( $campaign_id, array $args ) {
		$campaign = $this->repo->find( $campaign_id );
		if ( ! $campaign ) {
			return new \WP_Error( 'mmbb_not_found', __( 'Campaign not found.', 'mix-and-max-box-builder' ), array( 'status' => 404 ) );
		}

		$placement = isset( $args['placement'] ) ? (string) $args['placement'] : 'none';

		$container = $this->ensure_container( $campaign['id'] );
		if ( is_wp_error( $container ) ) {
			return $container;
		}

		$page_id = 0;
		if ( 'new_page' === $placement ) {
			$page_id = $this->create_page( $campaign['id'], $args );
		} elseif ( 'existing_page' === $placement ) {
			$page_id = $this->add_to_page( $campaign['id'], isset( $args['page_id'] ) ? (int) $args['page_id'] : 0 );
		}
		if ( is_wp_error( $page_id ) ) {
			return $page_id;
		}

		if ( $page_id > 0 ) {
			$saved = $this->repo->save( $campaign['id'], array( 'placement' => array( 'page_id' => $page_id ) ) );
			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
		}

		return $this->repo->publish( $campaign['id'] );
	}

	/**
	 * Ask Phase 7's container service for the product. Without one the campaign
	 * still goes live, and the cart work adds the product when it arrives.
	 *
	 * @param int $campaign_id Campaign id.
	 * @return int|\WP_Error Product id, or 0 when no service is installed.
	 */
	private function ensure_container( $campaign_id ) {
		/**
		 * Create or find the hidden container product for a campaign.
		 *
		 * Return the product id, a WP_Error to stop the publish, or null when nothing
		 * handles it. The cart module registers a callback here.
		 *
		 * @param int|\WP_Error|null $result      Product id, error or null.
		 * @param int                $campaign_id Campaign id.
		 */
		$result = apply_filters( 'mmbb_ensure_container_product', null, $campaign_id );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		if ( is_numeric( $result ) && (int) $result > 0 ) {
			$set = $this->repo->set_container_product( $campaign_id, (int) $result );
			return is_wp_error( $set ) ? $set : (int) $result;
		}
		return 0;
	}

	/**
	 * Create a page that holds only the builder block.
	 *
	 * @param int   $campaign_id Campaign id.
	 * @param array $args        Publish arguments.
	 * @return int|\WP_Error Page id.
	 */
	private function create_page( $campaign_id, array $args ) {
		if ( ! current_user_can( 'publish_pages' ) ) {
			return new \WP_Error( 'mmbb_cannot_publish_page', __( 'You are not allowed to publish pages.', 'mix-and-max-box-builder' ), array( 'status' => 403 ) );
		}

		$title = sanitize_text_field( isset( $args['page_title'] ) ? (string) $args['page_title'] : '' );
		$slug  = sanitize_title( isset( $args['page_slug'] ) ? (string) $args['page_slug'] : '' );

		$post = array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_title'   => $title,
			'post_content' => wp_slash( Page_Content::block( $campaign_id ) ),
		);
		if ( '' !== $slug ) {
			$post['post_name'] = $slug;
		}

		$page_id = wp_insert_post( $post, true );
		return is_wp_error( $page_id ) ? $page_id : (int) $page_id;
	}

	/**
	 * Put the builder first on a page you already have: the block for block content,
	 * the shortcode for classic content.
	 *
	 * @param int $campaign_id Campaign id.
	 * @param int $page_id     Page id.
	 * @return int|\WP_Error Page id.
	 */
	private function add_to_page( $campaign_id, $page_id ) {
		$page = get_post( $page_id );
		if ( ! $page || 'page' !== $page->post_type || 'trash' === $page->post_status ) {
			return new \WP_Error( 'mmbb_invalid_page', __( 'Choose an existing page for the builder.', 'mix-and-max-box-builder' ), array( 'status' => 400 ) );
		}
		if ( ! current_user_can( 'edit_post', $page->ID ) ) {
			return new \WP_Error( 'mmbb_cannot_edit_page', __( 'You are not allowed to edit that page.', 'mix-and-max-box-builder' ), array( 'status' => 403 ) );
		}

		$content = Page_Content::prepend( $page->post_content, $campaign_id, has_blocks( $page->post_content ) || '' === trim( $page->post_content ) );
		if ( $content !== $page->post_content ) {
			$result = wp_update_post(
				array(
					'ID'           => $page->ID,
					'post_content' => wp_slash( $content ),
				),
				true
			);
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}
		return (int) $page->ID;
	}
}
