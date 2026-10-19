<?php
/**
 * REST route that lists pages, for choosing where a builder is placed.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

defined( 'ABSPATH' ) || exit;

/** `GET /mmbb/v1/pages`: pages and whether they already hold a builder. */
class Pages_Controller extends Base_Controller {
	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'pages';

	/** Register the route. */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->get_collection_params(),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);
	}

	/**
	 * Collection arguments.
	 *
	 * @return array
	 */
	public function get_collection_params() {
		return array_merge(
			array(
				'search' => array(
					'description'       => __( 'Limit results to pages matching a search term.', 'mix-and-max-box-builder' ),
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'validate_callback' => 'rest_validate_request_arg',
				),
			),
			$this->paging_args( 20, 100 )
		);
	}

	/**
	 * List pages.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$args = array(
			'post_type'      => 'page',
			'post_status'    => array( 'publish', 'draft', 'private' ),
			'orderby'        => 'title',
			'order'          => 'ASC',
			'posts_per_page' => (int) $request['per_page'],
			'paged'          => (int) $request['page'],
		);
		if ( '' !== (string) $request['search'] ) {
			$args['s'] = $request['search'];
		}

		$query = new \WP_Query( $args );
		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = $this->prepare_page( $post );
		}

		return $this->with_paging( rest_ensure_response( $items ), $query->found_posts, $query->max_num_pages );
	}

	/**
	 * Shape one page.
	 *
	 * @param \WP_Post $post Page.
	 * @return array
	 */
	private function prepare_page( $post ) {
		$title     = '' !== trim( (string) $post->post_title ) ? $post->post_title : __( '(no title)', 'mix-and-max-box-builder' );
		$edit_link = get_edit_post_link( $post->ID, 'raw' );

		return array(
			'id'          => (int) $post->ID,
			'title'       => html_entity_decode( $title, ENT_QUOTES, 'UTF-8' ),
			'status'      => $post->post_status,
			'link'        => (string) get_permalink( $post ),
			'edit_link'   => $edit_link ? $edit_link : '',
			'has_builder' => has_block( 'mmbb/box-builder', $post ) || has_shortcode( $post->post_content, 'mmbb_box' ),
		);
	}

	/**
	 * Item schema.
	 *
	 * @return array
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->schema;
		}

		$this->schema = array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'mmbb_page',
			'type'       => 'object',
			'properties' => array(
				'id'          => array(
					'description' => __( 'Page ID.', 'mix-and-max-box-builder' ),
					'type'        => 'integer',
					'context'     => array( 'view' ),
				),
				'title'       => array(
					'description' => __( 'Page title.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
				'status'      => array(
					'description' => __( 'Page status.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
				'link'        => array(
					'description' => __( 'Public URL.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
				'edit_link'   => array(
					'description' => __( 'Editor URL, empty when the user cannot edit the page.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
				'has_builder' => array(
					'description' => __( 'Whether the page already contains a box builder.', 'mix-and-max-box-builder' ),
					'type'        => 'boolean',
					'context'     => array( 'view' ),
				),
			),
		);

		return $this->schema;
	}
}
