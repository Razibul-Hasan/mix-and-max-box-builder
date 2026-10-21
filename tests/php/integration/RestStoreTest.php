<?php
/**
 * REST routes for settings, setup, stats and analytics.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Settings\Settings;

/** Permissions, validation and response shape of the store-level routes. */
class RestStoreTest extends \WP_UnitTestCase {
	/** Make sure the routes exist. */
	public function set_up() {
		parent::set_up();
		\MixMax\BoxBuilder\Installer::install();
		do_action( 'rest_api_init' );
	}

	/**
	 * Sign in as a store manager.
	 *
	 * @return int User id.
	 */
	private function be_manager() {
		$id = self::factory()->user->create( array( 'role' => 'administrator' ) );
		get_user_by( 'id', $id )->add_cap( 'manage_woocommerce' );
		wp_set_current_user( $id );
		return $id;
	}

	/**
	 * Dispatch a request.
	 *
	 * @param string $method HTTP method.
	 * @param string $route  Route.
	 * @param array  $params Parameters.
	 * @return \WP_REST_Response
	 */
	private function request( $method, $route, array $params = array() ) {
		$request = new \WP_REST_Request( $method, '/mmbb/v1/' . $route );
		foreach ( $params as $key => $value ) {
			$request->set_param( $key, $value );
		}
		return rest_get_server()->dispatch( $request );
	}

	/**
	 * Route and method pairs that need the manager capability.
	 *
	 * @return array
	 */
	public function protected_routes() {
		return array(
			'settings get'  => array( 'GET', 'settings' ),
			'settings post' => array( 'POST', 'settings' ),
			'setup get'     => array( 'GET', 'setup' ),
			'setup post'    => array( 'POST', 'setup', array( 'test_done' => true ) ),
			'stats get'     => array( 'GET', 'stats' ),
			'analytics get' => array( 'GET', 'analytics' ),
		);
	}

	/**
	 * Logged-out visitors get 401.
	 *
	 * @dataProvider protected_routes
	 *
	 * @param string $method HTTP method.
	 * @param string $route  Route.
	 * @param array  $params Parameters.
	 */
	public function test_logged_out_gets_401( $method, $route, array $params = array() ) {
		wp_set_current_user( 0 );
		$this->assertSame( 401, $this->request( $method, $route, $params )->get_status() );
	}

	/**
	 * Subscribers get 403.
	 *
	 * @dataProvider protected_routes
	 *
	 * @param string $method HTTP method.
	 * @param string $route  Route.
	 * @param array  $params Parameters.
	 */
	public function test_subscriber_gets_403( $method, $route, array $params = array() ) {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'subscriber' ) ) );
		$this->assertSame( 403, $this->request( $method, $route, $params )->get_status() );
	}

	/**
	 * Schema property keys of a route.
	 *
	 * @param string $route Route.
	 * @return string[]
	 */
	private function schema_keys( $route ) {
		$response = $this->request( 'OPTIONS', $route );
		$data     = $response->get_data();
		return array_keys( $data['schema']['properties'] );
	}

	/** Settings: invalid columns are rejected. */
	public function test_settings_post_rejects_invalid_columns() {
		$this->be_manager();
		$this->assertSame( 400, $this->request( 'POST', 'settings', array( 'columns' => 7 ) )->get_status() );
	}

	/** Settings: every constrained field is validated by the REST schema. */
	public function test_settings_post_rejects_invalid_values() {
		$this->be_manager();
		$invalid = array(
			array( 'default_page_id' => -1 ),
			array( 'summary_layout' => 'drawer' ),
			array( 'cart_display' => 'separate' ),
			array( 'cta_label' => str_repeat( 'x', 33 ) ),
			array( 'empty_slot_hint' => str_repeat( 'x', 61 ) ),
			array( 'analytics_retention_days' => 6 ),
			array( 'analytics_retention_days' => 731 ),
			array( 'low_stock' => array( 'threshold' => 0 ) ),
			array( 'low_stock' => array( 'threshold' => 101 ) ),
			array( 'low_stock' => array( 'extra' => true ) ),
			array( 'enabled' => 'sometimes' ),
		);
		foreach ( $invalid as $params ) {
			$this->assertSame( 400, $this->request( 'POST', 'settings', $params )->get_status(), wp_json_encode( $params ) );
		}
	}

	/** Settings: text is sanitized before it reaches the option. */
	public function test_settings_post_sanitizes_text() {
		$this->be_manager();
		$response = $this->request(
			'POST',
			'settings',
			array(
				'cta_label'       => '<b>Add my box</b>',
				'empty_slot_hint' => "Pick\n<script>bad()</script> an item",
			)
		);
		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( 'Add my box', $response->get_data()['cta_label'] );
		$this->assertSame( 'Pick an item', $response->get_data()['empty_slot_hint'] );
	}

	/** Settings: a partial POST changes only what it names. */
	public function test_settings_post_keeps_other_settings() {
		$this->be_manager();
		$before   = Settings::all();
		$response = $this->request( 'POST', 'settings', array( 'allow_coupons' => true ) );
		$this->assertSame( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertTrue( $data['allow_coupons'] );
		$expected                  = $before;
		$expected['allow_coupons'] = true;
		$this->assertSame( $expected, $data );
		$this->assertEqualSets( $this->schema_keys( 'settings' ), array_keys( $data ) );
		$this->assertSame( $data, $this->request( 'GET', 'settings' )->get_data() );
	}

	/** Setup: test_done is required. */
	public function test_setup_post_requires_test_done() {
		$this->be_manager();
		$this->assertSame( 400, $this->request( 'POST', 'setup' )->get_status() );
	}

	/** Setup: has_campaign flips once a campaign exists. */
	public function test_setup_reports_campaign() {
		$this->be_manager();
		$data = $this->request( 'GET', 'setup' )->get_data();
		$this->assertEqualSets( $this->schema_keys( 'setup' ), array_keys( $data ) );
		$this->assertFalse( $data['has_campaign'] );
		$this->assertFalse( $data['live'] );
		$this->assertFalse( $data['complete'] );
		$this->assertSame( 6, count( $data['steps'] ) );

		( new Campaign_Repository() )->create_from_template( 'blank' );
		$data = $this->request( 'GET', 'setup' )->get_data();
		$this->assertTrue( $data['has_campaign'] );
	}

	/** Setup: POST test_done stores the option. */
	public function test_setup_finds_a_box_order_without_the_test_option() {
		$this->be_manager();
		delete_option( 'mmbb_setup_test_done' );
		$ordinary = wc_create_order();
		$ordinary->save();
		$this->assertFalse( $this->request( 'GET', 'setup' )->get_data()['test_order'] );
		$box = wc_create_order();
		$box->update_meta_data( '_mmbb_has_box', 1 );
		$box->save();
		$this->assertTrue( $this->request( 'GET', 'setup' )->get_data()['test_order'] );
	}

	/** Setup: POST test_done stores the option. */
	public function test_setup_post_sets_test_done() {
		$this->be_manager();
		$response = $this->request( 'POST', 'setup', array( 'test_done' => true ) );
		$this->assertSame( 200, $response->get_status() );
		$this->assertEquals( 1, get_option( 'mmbb_setup_test_done' ) );
		$this->assertTrue( $response->get_data()['test_order'] );

		$this->request( 'POST', 'setup', array( 'test_done' => false ) );
		$this->assertEquals( 0, get_option( 'mmbb_setup_test_done' ) );
	}

	/** Stats: unknown ranges are rejected. */
	public function test_stats_rejects_invalid_range() {
		$this->be_manager();
		$this->assertSame( 400, $this->request( 'GET', 'stats', array( 'range' => '1y' ) )->get_status() );
	}

	/** Stats: seven days give seven entries. */
	public function test_stats_7d_has_seven_days() {
		$this->be_manager();
		$response = $this->request( 'GET', 'stats', array( 'range' => '7d' ) );
		$this->assertSame( 200, $response->get_status() );
		$data = $response->get_data();
		$this->assertEqualSets( $this->schema_keys( 'stats' ), array_keys( $data ) );
		$this->assertCount( 7, $data['revenue_series'] );
		$this->assertCount( 7, $data['kpis']['revenue']['series'] );
		$this->assertSame( $data['to'], $data['revenue_series'][6]['date'] );
		$this->assertSame( $data['from'], $data['revenue_series'][0]['date'] );
	}

	/** Analytics: a custom range without dates is rejected. */
	public function test_analytics_custom_requires_dates() {
		$this->be_manager();
		$response = $this->request( 'GET', 'analytics', array( 'range' => 'custom' ) );
		$this->assertSame( 400, $response->get_status() );
		$this->assertSame( 'mmbb_invalid_range', $response->get_data()['code'] );
	}

	/** Analytics: the end date must not precede the start date. */
	public function test_analytics_custom_rejects_reversed_dates() {
		$this->be_manager();
		$response = $this->request(
			'GET',
			'analytics',
			array(
				'range' => 'custom',
				'from'  => '2026-03-10',
				'to'    => '2026-03-01',
			)
		);
		$this->assertSame( 400, $response->get_status() );
		$this->assertSame( 'mmbb_invalid_range', $response->get_data()['code'] );
	}

	/** Analytics: a malformed date is rejected. */
	public function test_analytics_rejects_malformed_date() {
		$this->be_manager();
		$response = $this->request(
			'GET',
			'analytics',
			array(
				'range' => 'custom',
				'from'  => 'tomorrow',
				'to'    => '2026-03-01',
			)
		);
		$this->assertSame( 400, $response->get_status() );
	}

	/** Analytics: a custom range over 366 days is rejected. */
	public function test_analytics_custom_rejects_long_span() {
		$this->be_manager();
		$response = $this->request(
			'GET',
			'analytics',
			array(
				'range' => 'custom',
				'from'  => '2024-01-01',
				'to'    => '2025-06-01',
			)
		);
		$this->assertSame( 400, $response->get_status() );
		$this->assertSame( 'mmbb_invalid_range', $response->get_data()['code'] );
	}

	/** Analytics: a custom range and compare give the final shape. */
	public function test_analytics_custom_range_shape() {
		$this->be_manager();
		$response = $this->request(
			'GET',
			'analytics',
			array(
				'range'   => 'custom',
				'from'    => '2026-03-01',
				'to'      => '2026-03-05',
				'compare' => true,
			)
		);
		$this->assertSame( 200, $response->get_status() );
		$data = $response->get_data();
		$this->assertEqualSets( $this->schema_keys( 'analytics' ), array_keys( $data ) );
		$this->assertCount( 5, $data['series'] );
		$this->assertCount( 5, $data['funnel'] );
		$this->assertSame( 0, $data['kpis']['revenue']['previous'] );
	}

	/** Analytics: without compare the previous values are null. */
	public function test_analytics_default_range() {
		$this->be_manager();
		$data = $this->request( 'GET', 'analytics' )->get_data();
		$this->assertSame( '30d', $data['range'] );
		$this->assertCount( 30, $data['series'] );
		$this->assertNull( $data['kpis']['boxes']['previous'] );
		$this->assertNull( $data['series'][0]['previous'] );
	}
}
