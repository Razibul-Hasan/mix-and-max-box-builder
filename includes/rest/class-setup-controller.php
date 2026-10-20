<?php
/**
 * REST route for the dashboard setup checklist.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Status;

defined( 'ABSPATH' ) || exit;

/** Reports which setup steps are done. */
class Setup_Controller extends Base_Controller {
	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'setup';

	/** Register the route. */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => array(
						'test_done' => array(
							'description'       => __( 'Whether the test order step is done.', 'mix-and-max-box-builder' ),
							'type'              => 'boolean',
							'required'          => true,
							'sanitize_callback' => 'rest_sanitize_request_arg',
							'validate_callback' => 'rest_validate_request_arg',
						),
					),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);
	}

	/**
	 * Return the checklist state.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		return rest_ensure_response( $this->payload() );
	}

	/**
	 * Mark the test order step done or not done.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function update_item( $request ) {
		update_option( 'mmbb_setup_test_done', rest_sanitize_boolean( $request['test_done'] ) ? 1 : 0, false );
		return rest_ensure_response( $this->payload() );
	}

	/**
	 * Work out every step.
	 *
	 * @return array
	 */
	protected function payload() {
		$campaigns    = $this->all_campaigns();
		$has_campaign = count( $campaigns ) > 0;
		$has_products = false;
		$live         = false;
		foreach ( $campaigns as $campaign ) {
			$products = isset( $campaign['config']['products'] ) && is_array( $campaign['config']['products'] ) ? $campaign['config']['products'] : array();
			if ( ! empty( $products['ids'] ) || ! empty( $products['term_ids'] ) ) {
				$has_products = true;
			}
			if ( Status::is_live( $campaign['status'] ) ) {
				$live = true;
			}
		}

		$woocommerce = class_exists( 'WooCommerce' ) && defined( 'WC_VERSION' ) && version_compare( WC_VERSION, '9.0', '>=' );
		$placed      = $this->is_placed();
		$test_order  = $this->has_test_order();

		$flags = array(
			'woocommerce' => $woocommerce,
			'campaign'    => $has_campaign,
			'products'    => $has_products,
			'placed'      => $placed,
			'test_order'  => $test_order,
			'live'        => $live,
		);
		$steps = array();
		$next  = null;
		foreach ( $flags as $id => $done ) {
			$steps[] = array(
				'id'   => $id,
				'done' => $done,
			);
			if ( null === $next && ! $done ) {
				$next = $id;
			}
		}

		return array(
			'woocommerce'  => $woocommerce,
			'has_campaign' => $has_campaign,
			'has_products' => $has_products,
			'placed'       => $placed,
			'test_order'   => $test_order,
			'live'         => $live,
			'steps'        => $steps,
			'next'         => $next,
			'complete'     => null === $next,
		);
	}

	/**
	 * Every campaign, paged through the repository.
	 *
	 * @return array
	 */
	protected function all_campaigns() {
		$repo  = new Campaign_Repository();
		$all   = array();
		$page  = 1;
		$pages = 1;
		do {
			$result = $repo->query(
				array(
					'page'     => $page,
					'per_page' => 50,
				)
			);
			$all    = array_merge( $all, $result['items'] );
			$pages  = (int) $result['pages'];
			++$page;
		} while ( $page <= $pages );
		return $all;
	}

	/**
	 * Whether a published page or post shows the block or shortcode.
	 *
	 * @return bool
	 */
	protected function is_placed() {
		foreach ( array( 'mmbb/box-builder', 'mmbb_box' ) as $needle ) {
			$posts = get_posts(
				array(
					'post_type'      => array( 'page', 'post' ),
					'post_status'    => 'publish',
					'posts_per_page' => 20,
					's'              => $needle,
					'no_found_rows'  => true,
				)
			);
			foreach ( $posts as $post ) {
				if ( has_block( 'mmbb/box-builder', $post ) || has_shortcode( $post->post_content, 'mmbb_box' ) ) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Whether a test order was confirmed or a box order exists.
	 *
	 * @return bool
	 */
	protected function has_test_order() {
		if ( get_option( 'mmbb_setup_test_done' ) ) {
			return true;
		}
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return false;
		}
		$args = array(
			'limit'        => 1,
			'return'       => 'ids',
			'mmbb_has_box' => true,
		);
		if ( \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled() ) {
			$args['meta_query'] = array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- One indexed existence check through WooCommerce's datastore.
				array(
					'key'     => '_mmbb_has_box',
					'compare' => 'EXISTS',
				),
			);
		}
		$orders = wc_get_orders( $args );
		return ! empty( $orders );
	}

	/**
	 * Translate our order query through WooCommerce's legacy datastore API.
	 *
	 * @param array $query      WordPress query arguments from WooCommerce.
	 * @param array $variables Order query variables.
	 * @return array
	 */
	public static function legacy_order_query( $query, $variables ) {
		if ( ! empty( $variables['mmbb_has_box'] ) ) {
			$query['meta_query'][] = array(
				'key'     => '_mmbb_has_box',
				'compare' => 'EXISTS',
			);
		}
		return $query;
	}

	/**
	 * Setup schema.
	 *
	 * @return array
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->add_additional_fields_schema( $this->schema );
		}

		$this->schema = array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'mmbb_setup',
			'type'       => 'object',
			'properties' => array(
				'woocommerce'  => array( 'type' => 'boolean' ),
				'has_campaign' => array( 'type' => 'boolean' ),
				'has_products' => array( 'type' => 'boolean' ),
				'placed'       => array( 'type' => 'boolean' ),
				'test_order'   => array( 'type' => 'boolean' ),
				'live'         => array( 'type' => 'boolean' ),
				'steps'        => array(
					'type'  => 'array',
					'items' => array(
						'type'       => 'object',
						'properties' => array(
							'id'   => array( 'type' => 'string' ),
							'done' => array( 'type' => 'boolean' ),
						),
					),
				),
				'next'         => array( 'type' => array( 'string', 'null' ) ),
				'complete'     => array( 'type' => 'boolean' ),
			),
		);
		return $this->add_additional_fields_schema( $this->schema );
	}
}
