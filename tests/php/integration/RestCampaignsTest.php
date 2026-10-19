<?php
/**
 * Campaign REST routes.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Rest\Campaigns_Controller;

/** The campaign routes are manager-only, validate input and match their schema. */
class RestCampaignsTest extends \WP_UnitTestCase {
	/**
	 * Campaign storage.
	 *
	 * @var Campaign_Repository
	 */
	private $repo;

	/** Create a REST server and sign in as a store manager. */
	public function set_up() {
		parent::set_up();
		global $wp_rest_server;
		$wp_rest_server = null;
		rest_get_server();
		$this->repo = new Campaign_Repository();
		$this->sign_in_manager();
	}

	/** Sign in as an administrator with the WooCommerce capability. */
	private function sign_in_manager() {
		$id = self::factory()->user->create( array( 'role' => 'administrator' ) );
		get_user_by( 'id', $id )->add_cap( 'manage_woocommerce' );
		wp_set_current_user( $id );
	}

	/**
	 * Dispatch a request.
	 *
	 * @param string $method HTTP method.
	 * @param string $route  Route.
	 * @param array  $body   JSON body (non-GET) or query params (GET).
	 * @return \WP_REST_Response
	 */
	private function send( $method, $route, array $body = array() ) {
		$request = new \WP_REST_Request( $method, $route );
		if ( 'GET' === $method ) {
			$request->set_query_params( $body );
		} elseif ( ! empty( $body ) ) {
			$request->set_header( 'content-type', 'application/json' );
			$request->set_body( wp_json_encode( $body ) );
		}
		return rest_get_server()->dispatch( $request );
	}

	/**
	 * Create a campaign through the REST API.
	 *
	 * @param string $template Template id.
	 * @return int
	 */
	private function make_campaign( $template = 'holiday' ) {
		$response = $this->send( 'POST', '/mmbb/v1/campaigns', array( 'template' => $template ) );
		$this->assertSame( 201, $response->get_status() );
		$data = $response->get_data();
		return $data['id'];
	}

	/**
	 * Create a published simple product.
	 *
	 * @return int
	 */
	private function make_product() {
		$product = new \WC_Product_Simple();
		$product->set_name( 'Bar' );
		$product->set_regular_price( '4.50' );
		$product->set_status( 'publish' );
		$product->save();
		return $product->get_id();
	}

	/**
	 * Every route with a valid body. `{id}` is replaced by an existing campaign.
	 *
	 * @return array
	 */
	public function route_provider() {
		return array(
			'list'      => array( 'GET', '/mmbb/v1/campaigns', array() ),
			'create'    => array( 'POST', '/mmbb/v1/campaigns', array( 'template' => 'blank' ) ),
			'get'       => array( 'GET', '/mmbb/v1/campaigns/{id}', array() ),
			'put'       => array( 'PUT', '/mmbb/v1/campaigns/{id}', array( 'config' => array() ) ),
			'patch'     => array( 'PATCH', '/mmbb/v1/campaigns/{id}', array( 'config' => array() ) ),
			'delete'    => array( 'DELETE', '/mmbb/v1/campaigns/{id}', array() ),
			'duplicate' => array( 'POST', '/mmbb/v1/campaigns/{id}/duplicate', array() ),
			'publish'   => array( 'POST', '/mmbb/v1/campaigns/{id}/publish', array( 'placement' => 'none' ) ),
			'preview'   => array( 'GET', '/mmbb/v1/campaigns/{id}/preview', array() ),
			'bulk'      => array(
				'POST',
				'/mmbb/v1/campaigns/bulk',
				array(
					'action' => 'pause',
					'ids'    => array( '{id}' ),
				),
			),
		);
	}

	/**
	 * Replace the `{id}` placeholder with a real campaign id.
	 *
	 * @param string $route Route.
	 * @param array  $body  Body.
	 * @param int    $id    Campaign id.
	 * @return array Route and body.
	 */
	private function fill_id( $route, array $body, $id ) {
		if ( isset( $body['ids'] ) ) {
			$body['ids'] = array( $id );
		}
		return array( str_replace( '{id}', (string) $id, $route ), $body );
	}

	/**
	 * Logged-out requests get 401.
	 *
	 * @dataProvider route_provider
	 *
	 * @param string $method HTTP method.
	 * @param string $route  Route.
	 * @param array  $body   Body.
	 */
	public function test_logged_out_gets_401( $method, $route, array $body ) {
		$id = $this->make_campaign();

		list( $route, $body ) = $this->fill_id( $route, $body, $id );

		wp_set_current_user( 0 );
		$this->assertSame( 401, $this->send( $method, $route, $body )->get_status(), $method . ' ' . $route );
	}

	/**
	 * Non-managers get 403.
	 *
	 * @dataProvider route_provider
	 *
	 * @param string $method HTTP method.
	 * @param string $route  Route.
	 * @param array  $body   Body.
	 */
	public function test_subscriber_gets_403( $method, $route, array $body ) {
		$id = $this->make_campaign();

		list( $route, $body ) = $this->fill_id( $route, $body, $id );

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'subscriber' ) ) );
		$this->assertSame( 403, $this->send( $method, $route, $body )->get_status(), $method . ' ' . $route );
	}

	/** Bad arguments are rejected with 400. */
	public function test_invalid_args() {
		$this->assertSame( 400, $this->send( 'GET', '/mmbb/v1/campaigns', array( 'per_page' => 51 ) )->get_status() );
		$this->assertSame( 400, $this->send( 'GET', '/mmbb/v1/campaigns', array( 'status' => 'nope' ) )->get_status() );
		$this->assertSame( 400, $this->send( 'POST', '/mmbb/v1/campaigns', array( 'template' => 'nope' ) )->get_status() );
	}

	/** Creating returns a draft that carries exactly the documented keys. */
	public function test_create_matches_schema() {
		$response = $this->send( 'POST', '/mmbb/v1/campaigns', array( 'template' => 'holiday' ) );
		$this->assertSame( 201, $response->get_status() );

		$data       = $response->get_data();
		$controller = new Campaigns_Controller();
		$schema     = $controller->get_item_schema();
		$this->assertEqualSets( array_keys( $schema['properties'] ), array_keys( $data ) );
		$this->assertSame( 'draft', $data['status'] );
		$this->assertSame( 'tiered', $data['type'] );
	}

	/** The list returns items, totals, counts and honours filters. */
	public function test_list_and_filters() {
		$this->send( 'POST', '/mmbb/v1/campaigns', array( 'title' => 'Alpha special' ) );
		$this->send( 'POST', '/mmbb/v1/campaigns', array( 'title' => 'Beta bundle' ) );
		$this->make_campaign();

		$response = $this->send( 'GET', '/mmbb/v1/campaigns' );
		$this->assertSame( 200, $response->get_status() );
		$data = $response->get_data();
		$this->assertEqualSets( array( 'items', 'total', 'pages', 'counts' ), array_keys( $data ) );
		$this->assertSame( 3, $data['total'] );
		$this->assertArrayHasKey( 'X-WP-Total', $response->get_headers() );

		$drafts = $this->send( 'GET', '/mmbb/v1/campaigns', array( 'status' => 'draft' ) )->get_data();
		$this->assertSame( 3, $drafts['total'] );

		// "live" is accepted (active plus ending soon) and nothing is live yet.
		$live = $this->send( 'GET', '/mmbb/v1/campaigns', array( 'status' => 'live' ) );
		$this->assertSame( 200, $live->get_status() );
		$this->assertSame( 0, $live->get_data()['total'] );
		$this->assertSame( 0, $data['counts']['live'] );

		$fixed = $this->send( 'GET', '/mmbb/v1/campaigns', array( 'type' => 'fixed' ) )->get_data();
		foreach ( $fixed['items'] as $item ) {
			$this->assertSame( 'fixed', $item['type'] );
		}

		$found = $this->send( 'GET', '/mmbb/v1/campaigns', array( 'search' => 'Alpha' ) )->get_data();
		$this->assertSame( 1, $found['total'] );
		$this->assertSame( 'Alpha special', $found['items'][0]['title'] );
	}

	/** Fetching one campaign works and unknown ids are 404. */
	public function test_get_item() {
		$id       = $this->make_campaign();
		$response = $this->send( 'GET', '/mmbb/v1/campaigns/' . $id );
		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( $id, $response->get_data()['id'] );

		$missing = $this->send( 'GET', '/mmbb/v1/campaigns/999999' );
		$this->assertSame( 404, $missing->get_status() );
		$this->assertSame( 'mmbb_not_found', $missing->get_data()['code'] );
	}

	/** PATCH merges, PUT replaces and the container product cannot be set. */
	public function test_update_patch_and_put() {
		$id = $this->make_campaign();

		$patched = $this->send( 'PATCH', '/mmbb/v1/campaigns/' . $id, array( 'config' => array( 'design' => array( 'headline' => 'New' ) ) ) );
		$this->assertSame( 200, $patched->get_status() );
		$data = $patched->get_data();
		$this->assertSame( 'New', $data['config']['design']['headline'] );
		$this->assertNotEmpty( $data['config']['tiers'] );

		$put = $this->send( 'PUT', '/mmbb/v1/campaigns/' . $id, array( 'config' => array( 'type' => 'bundle' ) ) );
		$this->assertSame( 200, $put->get_status() );
		$data = $put->get_data();
		$this->assertSame( 'bundle', $data['type'] );
		$this->assertSame( array(), $data['config']['tiers'] );

		$missing = $this->send( 'PUT', '/mmbb/v1/campaigns/' . $id, array( 'title' => 'Only title' ) );
		$this->assertSame( 400, $missing->get_status() );

		$ignored = $this->send( 'PATCH', '/mmbb/v1/campaigns/' . $id, array( 'config' => array( 'container_product_id' => 123 ) ) );
		$this->assertSame( 200, $ignored->get_status() );
		$this->assertSame( 0, $ignored->get_data()['config']['container_product_id'] );
	}

	/** Titles are sanitized. */
	public function test_title_is_sanitized() {
		$id       = $this->make_campaign();
		$response = $this->send( 'PATCH', '/mmbb/v1/campaigns/' . $id, array( 'title' => '<b>X</b>' ) );
		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( 'X', $response->get_data()['title'] );
	}

	/** Deleting trashes the campaign. */
	public function test_delete_trashes_campaign() {
		$id       = $this->make_campaign();
		$response = $this->send( 'DELETE', '/mmbb/v1/campaigns/' . $id );
		$this->assertSame( 200, $response->get_status() );
		$data = $response->get_data();
		$this->assertTrue( $data['deleted'] );
		$this->assertSame( $id, $data['previous']['id'] );
		$this->assertSame( 'trash', get_post_status( $id ) );
	}

	/** Deleting also trashes the container product. */
	public function test_delete_trashes_container_product() {
		$id      = $this->make_campaign();
		$product = new \WC_Product_Simple();
		$product->set_name( 'Container' );
		$product->set_status( 'publish' );
		$product->save();
		$pid = $product->get_id();
		update_post_meta( $pid, '_mmbb_campaign_id', $id );
		$this->repo->set_container_product( $id, $pid );

		$this->assertSame( 200, $this->send( 'DELETE', '/mmbb/v1/campaigns/' . $id )->get_status() );
		$this->assertSame( 'trash', get_post_status( $pid ) );
	}

	/** Duplicating creates a new draft copy. */
	public function test_duplicate() {
		$id       = $this->make_campaign();
		$response = $this->send( 'POST', '/mmbb/v1/campaigns/' . $id . '/duplicate' );
		$this->assertSame( 201, $response->get_status() );
		$data = $response->get_data();
		$this->assertNotSame( $id, $data['id'] );
		$this->assertStringEndsWith( '(copy)', $data['title'] );
	}

	/** Publishing validates placement and config, then answers 501 until later phases. */
	public function test_publish() {
		$blank = $this->make_campaign( 'blank' );
		$route = '/mmbb/v1/campaigns/' . $blank . '/publish';

		$this->assertSame( 400, $this->send( 'POST', $route, array( 'placement' => 'sideways' ) )->get_status() );

		$post     = self::factory()->post->create( array( 'post_type' => 'post' ) );
		$response = $this->send(
			'POST',
			$route,
			array(
				'placement' => 'existing_page',
				'page_id'   => $post,
			)
		);
		$this->assertSame( 400, $response->get_status() );
		$this->assertSame( 'mmbb_invalid_page', $response->get_data()['code'] );

		$response = $this->send( 'POST', $route, array( 'placement' => 'new_page' ) );
		$this->assertSame( 400, $response->get_status() );
		$this->assertSame( 'mmbb_page_title_required', $response->get_data()['code'] );

		$response = $this->send( 'POST', $route, array( 'placement' => 'none' ) );
		$this->assertSame( 422, $response->get_status() );
		$data = $response->get_data();
		$this->assertSame( 'mmbb_invalid_config', $data['code'] );
		$codes = wp_list_pluck( $data['data']['errors'], 'code' );
		$this->assertContains( 'tiers_required', $codes );
		foreach ( $data['data']['errors'] as $error ) {
			if ( 'tiers_required' === $error['code'] ) {
				$this->assertNotSame( '', $error['message'] );
			}
		}

		$valid = $this->make_campaign( 'holiday' );
		$patch = $this->send( 'PATCH', '/mmbb/v1/campaigns/' . $valid, array( 'config' => array( 'products' => array( 'ids' => array( $this->make_product() ) ) ) ) );
		$this->assertSame( 200, $patch->get_status() );

		$response = $this->send( 'POST', '/mmbb/v1/campaigns/' . $valid . '/publish', array( 'placement' => 'none' ) );
		$this->assertSame( 501, $response->get_status() );
		$this->assertSame( 'mmbb_not_implemented', $response->get_data()['code'] );
	}

	/** Preview returns the storefront payload. */
	public function test_preview() {
		$id       = $this->make_campaign();
		$response = $this->send( 'GET', '/mmbb/v1/campaigns/' . $id . '/preview' );
		$this->assertSame( 200, $response->get_status() );
		$this->assertEqualSets( array( 'id', 'title', 'status', 'config', 'products' ), array_keys( $response->get_data() ) );
	}

	/** Bulk actions report one result per id. */
	public function test_bulk() {
		$one = $this->make_campaign();
		$two = $this->make_campaign();
		$this->repo->publish( $one );
		$this->repo->publish( $two );

		$response = $this->send(
			'POST',
			'/mmbb/v1/campaigns/bulk',
			array(
				'action' => 'pause',
				'ids'    => array( $one, $two ),
			)
		);
		$this->assertSame( 200, $response->get_status() );
		$results = $response->get_data()['results'];
		$this->assertTrue( $results[0]['ok'] );
		$this->assertTrue( $results[1]['ok'] );
		$this->assertSame( 'paused', $this->repo->find( $one )['status'] );
		$this->assertSame( 'paused', $this->repo->find( $two )['status'] );

		$response = $this->send(
			'POST',
			'/mmbb/v1/campaigns/bulk',
			array(
				'action' => 'delete',
				'ids'    => array( $one, 999999 ),
			)
		);
		$results  = $response->get_data()['results'];
		$this->assertTrue( $results[0]['ok'] );
		$this->assertFalse( $results[1]['ok'] );
		$this->assertSame( 'mmbb_not_found', $results[1]['code'] );

		$bad = $this->send(
			'POST',
			'/mmbb/v1/campaigns/bulk',
			array(
				'action' => 'explode',
				'ids'    => array( $two ),
			)
		);
		$this->assertSame( 400, $bad->get_status() );

		$empty = $this->send(
			'POST',
			'/mmbb/v1/campaigns/bulk',
			array(
				'action' => 'pause',
				'ids'    => array(),
			)
		);
		$this->assertSame( 400, $empty->get_status() );
	}
}
