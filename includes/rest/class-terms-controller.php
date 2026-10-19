<?php
/**
 * REST route that lists product categories and tags.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

defined( 'ABSPATH' ) || exit;

/** `GET /mmbb/v1/terms`: product category or tag terms. */
class Terms_Controller extends Base_Controller {
	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'terms';

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
				'taxonomy' => array(
					'description'       => __( 'Taxonomy to list.', 'mix-and-max-box-builder' ),
					'type'              => 'string',
					'enum'              => array( 'product_cat', 'product_tag' ),
					'default'           => 'product_cat',
					'sanitize_callback' => 'sanitize_key',
					'validate_callback' => 'rest_validate_request_arg',
				),
				'search'   => array(
					'description'       => __( 'Limit results to terms matching a search term.', 'mix-and-max-box-builder' ),
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'validate_callback' => 'rest_validate_request_arg',
				),
			),
			$this->paging_args( 50, 100 )
		);
	}

	/**
	 * List terms.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$taxonomy = (string) $request['taxonomy'];
		$search   = (string) $request['search'];
		$per_page = (int) $request['per_page'];
		$page     = (int) $request['page'];

		$terms = get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => false,
				'number'     => $per_page,
				'offset'     => ( $page - 1 ) * $per_page,
				'search'     => $search,
				'orderby'    => 'name',
				'order'      => 'ASC',
			)
		);
		$terms = is_array( $terms ) ? $terms : array();

		$total = wp_count_terms(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => false,
				'search'     => $search,
			)
		);
		$total = is_numeric( $total ) ? (int) $total : 0;

		$items = array();
		foreach ( $terms as $term ) {
			$items[] = array(
				'id'       => (int) $term->term_id,
				'name'     => html_entity_decode( $term->name, ENT_QUOTES, 'UTF-8' ),
				'slug'     => $term->slug,
				'parent'   => (int) $term->parent,
				'count'    => (int) $term->count,
				'taxonomy' => $term->taxonomy,
			);
		}

		return $this->with_paging( rest_ensure_response( $items ), $total, (int) ceil( $total / $per_page ) );
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
			'title'      => 'mmbb_term',
			'type'       => 'object',
			'properties' => array(
				'id'       => array(
					'description' => __( 'Term ID.', 'mix-and-max-box-builder' ),
					'type'        => 'integer',
					'context'     => array( 'view' ),
				),
				'name'     => array(
					'description' => __( 'Term name.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
				'slug'     => array(
					'description' => __( 'Term slug.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
				'parent'   => array(
					'description' => __( 'Parent term ID, 0 for top level.', 'mix-and-max-box-builder' ),
					'type'        => 'integer',
					'context'     => array( 'view' ),
				),
				'count'    => array(
					'description' => __( 'Number of products using the term.', 'mix-and-max-box-builder' ),
					'type'        => 'integer',
					'context'     => array( 'view' ),
				),
				'taxonomy' => array(
					'description' => __( 'Taxonomy name.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
			),
		);

		return $this->schema;
	}
}
