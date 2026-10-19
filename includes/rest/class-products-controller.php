<?php
/**
 * REST route that lists products a campaign can offer.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

use MixMax\BoxBuilder\Pricing;

defined( 'ABSPATH' ) || exit;

/** `GET /mmbb/v1/products`: simple products and single variations. */
class Products_Controller extends Base_Controller {
	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'products';

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
				'search'   => array(
					'description'       => __( 'Limit results to products matching a search term.', 'mix-and-max-box-builder' ),
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'validate_callback' => 'rest_validate_request_arg',
				),
				'category' => array(
					'description'       => __( 'Limit results to a product category ID.', 'mix-and-max-box-builder' ),
					'type'              => 'integer',
					'minimum'           => 1,
					'sanitize_callback' => 'absint',
					'validate_callback' => 'rest_validate_request_arg',
				),
				'tag'      => array(
					'description'       => __( 'Limit results to a product tag ID.', 'mix-and-max-box-builder' ),
					'type'              => 'integer',
					'minimum'           => 1,
					'sanitize_callback' => 'absint',
					'validate_callback' => 'rest_validate_request_arg',
				),
				'include'  => array(
					'description'       => __( 'Limit results to these product IDs.', 'mix-and-max-box-builder' ),
					'type'              => 'array',
					'items'             => array( 'type' => 'integer' ),
					'default'           => array(),
					'sanitize_callback' => array( $this, 'sanitize_ids' ),
					'validate_callback' => 'rest_validate_request_arg',
				),
			),
			$this->paging_args( 20, 50 )
		);
	}

	/**
	 * Reduce a list to unique positive integers.
	 *
	 * @param mixed $value Raw value.
	 * @return int[]
	 */
	public function sanitize_ids( $value ) {
		$ids = array_values( array_unique( array_filter( array_map( 'absint', (array) $value ) ) ) );
		return $ids;
	}

	/**
	 * List products.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_items( $request ) {
		$args = array(
			'status'   => 'publish',
			'type'     => array( 'simple', 'variation' ),
			'limit'    => (int) $request['per_page'],
			'page'     => (int) $request['page'],
			'paginate' => true,
			'orderby'  => 'title',
			'order'    => 'ASC',
		);

		if ( '' !== (string) $request['search'] ) {
			$args['s'] = $request['search'];
		}

		$filters = array(
			'category' => 'product_cat',
			'tag'      => 'product_tag',
		);
		foreach ( $filters as $param => $taxonomy ) {
			if ( empty( $request[ $param ] ) ) {
				continue;
			}
			$term = get_term( (int) $request[ $param ], $taxonomy );
			if ( ! $term instanceof \WP_Term ) {
				return $this->error(
					'mmbb_invalid_term',
					__( 'That category or tag does not exist.', 'mix-and-max-box-builder' ),
					400
				);
			}
			$args[ $param ] = array( $term->slug );
			// Variations carry no terms of their own, so a term filter can only match simple products.
			$args['type'] = array( 'simple' );
		}

		if ( ! empty( $request['include'] ) ) {
			$args['include'] = $request['include'];
		}

		$result = wc_get_products( $args );
		$items  = array();
		foreach ( $result->products as $product ) {
			$items[] = $this->prepare_product( $product );
		}

		return $this->with_paging( rest_ensure_response( $items ), $result->total, $result->max_num_pages );
	}

	/**
	 * Shape one product.
	 *
	 * @param \WC_Product $product Product or variation.
	 * @return array
	 */
	private function prepare_product( $product ) {
		$decimals = wc_get_price_decimals();
		$parent   = $product->is_type( 'variation' ) ? wc_get_product( $product->get_parent_id() ) : null;
		$source   = $parent instanceof \WC_Product ? $parent : $product;

		$image_id = $product->get_image_id();
		if ( ! $image_id && $parent instanceof \WC_Product ) {
			$image_id = $parent->get_image_id();
		}
		$image = null;
		if ( $image_id ) {
			$src = wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' );
			if ( $src ) {
				$srcset = wp_get_attachment_image_srcset( $image_id, 'woocommerce_thumbnail' );
				$image  = array(
					'src'    => $src,
					'srcset' => $srcset ? $srcset : '',
					'alt'    => $product->get_name(),
				);
			}
		}

		$category_names = array();
		foreach ( $source->get_category_ids() as $term_id ) {
			$term = get_term( $term_id, 'product_cat' );
			if ( $term instanceof \WP_Term ) {
				$category_names[] = html_entity_decode( $term->name, ENT_QUOTES, 'UTF-8' );
			}
		}

		return array(
			'id'             => (int) $product->get_id(),
			'parent'         => (int) $product->get_parent_id(),
			'name'           => html_entity_decode( $product->get_name(), ENT_QUOTES, 'UTF-8' ),
			'sku'            => (string) $product->get_sku(),
			'type'           => $product->is_type( 'variation' ) ? 'variation' : 'simple',
			'price'          => Pricing::to_minor( $product->get_price(), $decimals ),
			'price_html'     => $product->get_price_html(),
			'regular_price'  => Pricing::to_minor( $product->get_regular_price(), $decimals ),
			'stock_status'   => (string) $product->get_stock_status(),
			'stock_quantity' => $product->managing_stock() ? $product->get_stock_quantity() : null,
			'purchasable'    => (bool) $product->is_purchasable(),
			'image'          => $image,
			'categories'     => $category_names,
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
			'title'      => 'mmbb_product',
			'type'       => 'object',
			'properties' => array(
				'id'             => array(
					'description' => __( 'Product or variation ID.', 'mix-and-max-box-builder' ),
					'type'        => 'integer',
					'context'     => array( 'view' ),
				),
				'parent'         => array(
					'description' => __( 'Parent product ID, 0 for simple products.', 'mix-and-max-box-builder' ),
					'type'        => 'integer',
					'context'     => array( 'view' ),
				),
				'name'           => array(
					'description' => __( 'Product name.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
				'sku'            => array(
					'description' => __( 'SKU.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
				'type'           => array(
					'description' => __( 'Product type.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'enum'        => array( 'simple', 'variation' ),
					'context'     => array( 'view' ),
				),
				'price'          => array(
					'description' => __( 'Current price in minor currency units.', 'mix-and-max-box-builder' ),
					'type'        => 'integer',
					'context'     => array( 'view' ),
				),
				'price_html'     => array(
					'description' => __( 'Formatted price markup.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
				'regular_price'  => array(
					'description' => __( 'Regular price in minor currency units.', 'mix-and-max-box-builder' ),
					'type'        => 'integer',
					'context'     => array( 'view' ),
				),
				'stock_status'   => array(
					'description' => __( 'Stock status.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'context'     => array( 'view' ),
				),
				'stock_quantity' => array(
					'description' => __( 'Units in stock, null when stock is not managed.', 'mix-and-max-box-builder' ),
					'type'        => array( 'integer', 'null' ),
					'context'     => array( 'view' ),
				),
				'purchasable'    => array(
					'description' => __( 'Whether the product can be bought.', 'mix-and-max-box-builder' ),
					'type'        => 'boolean',
					'context'     => array( 'view' ),
				),
				'image'          => array(
					'description' => __( 'Product image, null when there is none.', 'mix-and-max-box-builder' ),
					'type'        => array( 'object', 'null' ),
					'context'     => array( 'view' ),
					'properties'  => array(
						'src'    => array( 'type' => 'string' ),
						'srcset' => array( 'type' => 'string' ),
						'alt'    => array( 'type' => 'string' ),
					),
				),
				'categories'     => array(
					'description' => __( 'Category names.', 'mix-and-max-box-builder' ),
					'type'        => 'array',
					'items'       => array( 'type' => 'string' ),
					'context'     => array( 'view' ),
				),
			),
		);

		return $this->schema;
	}
}
