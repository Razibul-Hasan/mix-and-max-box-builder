<?php
/**
 * Analytics collection, reporting, retention, sales and privacy.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Analytics\Collector;
use MixMax\BoxBuilder\Analytics\Query;
use MixMax\BoxBuilder\Analytics\Rollup;
use MixMax\BoxBuilder\Analytics\Privacy;
use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Installer;
use MixMax\BoxBuilder\Settings\Settings;

/** Exercise real owned tables, WooCommerce CRUD and REST permissions. */
class AnalyticsTest extends \WP_UnitTestCase {
	/**
	 * Campaign id.
	 *
	 * @var int
	 */
	private $campaign;
	/**
	 * Product id.
	 *
	 * @var int
	 */
	private $product;
	/** Install the schema and a live campaign. */
	public function set_up() {
		parent::set_up();
		Installer::install();
		Settings::update( array( 'analytics_enabled' => true ) );
		$product = new \WC_Product_Simple();
		$product->set_name( '=Formula product' );
		$product->set_regular_price( 10 );
		$this->product  = $product->save();
		$repo           = new Campaign_Repository();
		$campaign       = $repo->create_from_template( 'blank', '=Formula campaign' );
		$this->campaign = $campaign['id'];
		$repo->save(
			$this->campaign,
			array(
				'products' => array( 'ids' => array( $this->product ) ),
				'tiers'    => array(
					array(
						'qty'           => 2,
						'discount_type' => 'percent',
						'value'         => 10,
					),
				),
			)
		);
		$repo->publish( $this->campaign );
		do_action( 'rest_api_init' );
	}
	/** Dispatch a public batch.
	 *
	 * @param array  $events Events.
	 * @param string $nonce Nonce override.
	 * @return \WP_REST_Response
	 */
	private function batch( $events, $nonce = null ) {
		$request = new \WP_REST_Request( 'POST', '/mmbb/v1/events' );
		$request->set_param( 'nonce', null === $nonce ? wp_create_nonce( 'mmbb_track' ) : $nonce );
		$request->set_param( 'session', str_repeat( 'a', 32 ) );
		$request->set_param( 'events', $events );
		return rest_get_server()->dispatch( $request );
	}
	/** A simple valid event.
	 *
	 * @param string $name Event name.
	 * @return array
	 */
	private function event( $name = 'view' ) {
		return array(
			'campaign_id' => $this->campaign,
			'event'       => $name,
			'product_id'  => $this->product,
			'qty'         => 2,
		);
	}
	/** Public writes require nonce, valid membership, settings and bounded batches. */
	public function test_collection_guards_and_rate_limit() {
		$this->assertSame( 401, $this->batch( array( $this->event() ), 'expired' )->get_status() );
		$bad               = $this->event( 'add_item' );
		$bad['product_id'] = 999999;
		$this->assertSame( 400, $this->batch( array( $bad ) )->get_status() );
		$bad        = $this->event( 'tier_reached' );
		$bad['qty'] = 99;
		$this->assertSame( 400, $this->batch( array( $bad ) )->get_status() );
		$this->assertSame( 400, $this->batch( array_fill( 0, 21, $this->event() ) )->get_status() );
		for ( $i = 0; $i < 6; ++$i ) {
			$this->assertSame( 204, $this->batch( array_fill( 0, 20, $this->event() ) )->get_status() );
		}
		$this->assertSame( 429, $this->batch( array( $this->event() ) )->get_status() );
		Settings::update( array( 'analytics_enabled' => false ) );
		$this->assertSame( 401, $this->batch( array( $this->event() ) )->get_status() );
	}
	/** Fixture order with a discounted two-item box and a gift message.
	 *
	 * @param string $day Paid store date.
	 * @return \WC_Order
	 */
	private function order( $day ) {
		$order = wc_create_order();
		$order->set_billing_email( 'box@example.org' );
		$order->set_date_paid( ( new \DateTimeImmutable( $day . ' 12:00', wp_timezone() ) )->getTimestamp() );
		$order->update_meta_data( '_mmbb_has_box', 1 );
		$line = new \WC_Order_Item_Product();
		$line->set_product_id( $this->product );
		$line->set_name( 'Box' );
		$line->set_quantity( 1 );
		$line->set_subtotal( 18 );
		$line->set_total( 16 );
		$line->add_meta_data(
			'_mmbb_box',
			wp_json_encode(
				array(
					'campaign_id' => $this->campaign,
					'items'       => array(
						array(
							'product_id' => $this->product,
							'qty'        => 2,
						),
					),
					'quote'       => array(
						'discount' => 200,
						'tier'     => array( 'qty' => 2 ),
					),
					'gift'        => array( 'message' => 'Happy birthday' ),
				)
			)
		);
		$line->add_meta_data( 'Gift message', 'Happy birthday' );
		$order->add_item( $line );
		$order->save();
		return $order;
	}
	/** Exact reports, equal-length comparisons, idempotent purchases and refunds. */
	public function test_exact_report_rollup_retention_and_refund() {
		global $wpdb;
		update_option( 'timezone_string', 'Asia/Dhaka' );
		$today = new \DateTimeImmutable( 'today', wp_timezone() );
		$day   = $today->modify( '-10 days' )->format( 'Y-m-d' );
		foreach ( array( 'view', 'view', 'add_item', 'add_item', 'tier_reached', 'add_to_cart' ) as $event ) {
			Collector::insert(
				array(
					'campaign_id' => $this->campaign,
					'event'       => $event,
					'product_id'  => $this->product,
					'created_at'  => $day . ' 07:00:00',
				),
				'session-one'
			);
		}
		Collector::insert(
			array(
				'campaign_id' => $this->campaign,
				'event'       => 'view',
				'created_at'  => $day . ' 08:00:00',
			),
			'session-two'
		);
		$order  = $this->order( $day );
		$rollup = new Rollup();
		$rollup->purchase( $order->get_id() );
		$rollup->purchase( $order->get_id() );
		$query  = new Query();
		$report = $query->report( $day, $day, $this->campaign );
		$this->assertSame( 1600, $report['kpis']['revenue']['value'] );
		$this->assertSame( 400, $report['kpis']['discount']['value'] );
		$this->assertSame( 1, $report['kpis']['boxes']['value'] );
		$this->assertEquals( 2, $report['kpis']['items_per_box']['value'] );
		$this->assertEquals( 50, $report['kpis']['conversion']['value'] );
		$this->assertSame( array( 2, 1, 1, 1, 1 ), array_column( $report['funnel'], 'count' ) );
		$this->assertSame(
			array(
				array(
					'date'     => $day,
					'revenue'  => 1600,
					'previous' => 0,
				),
			),
			$report['series']
		);
		$this->assertSame( 2, $report['top_products'][0]['count'] );
		$rollup->run();
		$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i', $wpdb->prefix . 'mmbb_stats_daily' ), ARRAY_A );
		$rollup->run();
		$this->assertSame( $rows, $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i', $wpdb->prefix . 'mmbb_stats_daily' ), ARRAY_A ) );
		Settings::update( array( 'analytics_retention_days' => 7 ) );
		$rollup->run();
		$this->assertSame( '0', $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM %i', $wpdb->prefix . 'mmbb_events' ) ) );
		$this->assertEquals( $report, $query->report( $day, $day, $this->campaign ) );
		$rollup->refund( $order->get_id() );
		$this->assertSame( 0, $query->report( $day, $day, $this->campaign )['kpis']['revenue']['value'] );
	}
	/** Export remains manager-only and escapes dangerous cells. */
	public function test_csv_export_permissions_and_formula_safety() {
		$request = new \WP_REST_Request( 'GET', '/mmbb/v1/analytics/export' );
		$this->assertSame( 401, rest_get_server()->dispatch( $request )->get_status() );
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		Collector::insert(
			array(
				'campaign_id' => $this->campaign,
				'event'       => 'view',
			),
			'one'
		);
		Query::bust();
		$response = rest_get_server()->dispatch( $request );
		$this->assertSame( 200, $response->get_status() );
		$this->assertStringContainsString( "'=Formula campaign", $response->get_data() );
		$this->assertStringContainsString( 'text/csv', $response->get_headers()['Content-Type'] );
		foreach ( array( '=x', '+x', '-x', '@x', '  =x', "\tx" ) as $value ) {
			$expected = "\tx" === $value ? $value : "'" . $value;
			$this->assertSame( $expected, \MixMax\BoxBuilder\Rest\Analytics_Controller::csv_cell( $value ) );
		}
	}
	/** Gift messages export and erase both copies, respecting WooCommerce policy. */
	public function test_privacy_tools() {
		$order   = $this->order( wp_date( 'Y-m-d' ) );
		$privacy = new Privacy();
		$this->assertCount( 1, $privacy->export( 'box@example.org' )['data'] );
		$this->assertTrue( $privacy->erase( 'box@example.org' )['items_retained'] );
		update_option( 'woocommerce_erasure_request_removes_order_data', 'yes' );
		$this->assertTrue( $privacy->erase( 'box@example.org' )['items_removed'] );
		$order = wc_get_order( $order->get_id() );
		foreach ( $order->get_items() as $item ) {
			$this->assertSame( '', $item->get_meta( 'Gift message' ) );
			$this->assertSame( '', json_decode( $item->get_meta( '_mmbb_box' ), true )['gift']['message'] );
		}
		$this->assertCount( 0, $privacy->export( 'unrelated@example.org' )['data'] );
	}
	/** Daily salts, equal-length previous periods and store-midnight boundaries. */
	public function test_previous_period_and_daily_session_salt() {
		$first = Collector::session_hash( str_repeat( 'c', 32 ) );
		$this->assertSame( $first, Collector::session_hash( str_repeat( 'c', 32 ) ) );
		update_option(
			'mmbb_analytics_salt',
			array(
				'day'   => '2000-01-01',
				'value' => 'old',
			),
			false
		);
		$this->assertNotSame( $first, Collector::session_hash( str_repeat( 'c', 32 ) ) );
		update_option( 'timezone_string', 'Asia/Dhaka' );
		$this->assertSame( array( '2026-02-28 18:00:00', '2026-03-01 18:00:00' ), Query::bounds( '2026-03-01', '2026-03-01' ) );
		Collector::insert(
			array(
				'campaign_id' => $this->campaign,
				'event'       => 'view',
				'created_at'  => '2026-02-28 18:00:00',
			),
			'one'
		);
		Collector::insert(
			array(
				'campaign_id' => $this->campaign,
				'event'       => 'view',
				'created_at'  => '2026-02-28 17:59:59',
			),
			'two'
		);
		$rollup = new Rollup();
		$order  = $this->order( '2026-03-01' );
		$rollup->purchase( $order->get_id() );
		$previous = $this->order( '2026-02-28' );
		foreach ( $previous->get_items() as $line ) {
			$line->set_total( 8 );
			$line->save(); }
		$rollup->purchase( $previous->get_id() );
		$query  = new Query();
		$report = $query->report( '2026-03-01', '2026-03-01', $this->campaign );
		$this->assertSame( 800, $report['kpis']['revenue']['previous'] );
		$this->assertEquals( 100, $report['kpis']['revenue']['delta'] );
		$this->assertEquals( 100, $report['kpis']['conversion']['value'] );
		$this->assertSame( 800, $report['series'][0]['previous'] );
		$this->assertSame( 0, $query->report( '2026-03-01', '2026-03-01', 999999 )['kpis']['boxes']['value'] );
	}
	/** Items-mode purchases include only children of that header; disabling collection also stops sales. */
	public function test_items_mode_sales_and_disabled_collection() {
		$day   = wp_date( 'Y-m-d' );
		$order = $this->order( $day );
		foreach ( $order->get_items() as $header ) {
			$header->set_total( 3 );
			$header->set_subtotal( 3 );
			$header->update_meta_data( 'mmbb_box_key', 'header-cart-key' );
			$header->save();
		}
		$child = new \WC_Order_Item_Product();
		$child->set_name( 'Contents' );
		$child->set_total( 15 );
		$child->set_subtotal( 17 );
		$child->add_meta_data( 'mmbb_box_parent', 'header-cart-key' );
		$order->add_item( $child );
		$order->save();
		$this->assertNotContains( 'mmbb_box_key', array_column( $header->get_formatted_meta_data(), 'key' ) );
		$this->assertNotContains( 'mmbb_box_parent', array_column( $child->get_formatted_meta_data(), 'key' ) );
		Settings::update( array( 'analytics_enabled' => false ) );
		$rollup = new Rollup();
		$rollup->purchase( $order->get_id() );
		$this->assertSame( 0, ( new Query() )->report( $day, $day )['kpis']['revenue']['value'] );
		Settings::update( array( 'analytics_enabled' => true ) );
		add_filter( 'mmbb_track_events', '__return_false' );
		$rollup->purchase( $order->get_id() );
		$this->assertFalse( Collector::enabled() );
		remove_filter( 'mmbb_track_events', '__return_false' );
		$rollup->purchase( $order->get_id() );
		$this->assertSame( 1800, ( new Query() )->report( $day, $day )['kpis']['revenue']['value'] );
		$refund = new \WC_Order_Refund();
		$refund->set_parent_id( $order->get_id() );
		$refund->set_amount( 18 );
		$refund->save();
		do_action( 'woocommerce_order_fully_refunded', $order->get_id(), $refund->get_id() );
		$this->assertSame( 0, ( new Query() )->report( $day, $day )['kpis']['revenue']['value'] );
	}
	/** The Campaigns list shows real all-time totals and can sort by them. */
	public function test_campaign_list_has_real_totals_and_ranks_by_them() {
		global $wpdb;
		$repo   = new Campaign_Repository();
		$second = $repo->create_from_template( 'blank', 'Second campaign' )['id'];
		$day    = wp_date( 'Y-m-d' );
		$wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Fixture rows in an owned table.
			$wpdb->prefix . 'mmbb_purchases',
			array(
				'order_id'    => 1,
				'line_id'     => 1,
				'campaign_id' => $second,
				'day'         => $day,
				'boxes'       => 3,
				'items'       => 9,
				'value'       => '45.00',
				'discount'    => '5.00',
			)
		);
		$wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Fixture rows in an owned table.
			$wpdb->prefix . 'mmbb_stats_daily',
			array(
				'day'         => $day,
				'campaign_id' => $second,
				'views'       => 12,
			)
		);
		Query::bust();
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$request = new \WP_REST_Request( 'GET', '/mmbb/v1/campaigns' );
		$request->set_param( 'orderby', 'revenue' );
		$items = rest_get_server()->dispatch( $request )->get_data()['items'];
		$this->assertSame( $second, $items[0]['id'], 'Highest revenue first.' );
		$this->assertSame( 3, $items[0]['stats']['boxes_sold'] );
		$this->assertSame( 4500, $items[0]['stats']['revenue'] );
		$this->assertEqualsWithDelta( 25.0, $items[0]['stats']['conversion'], 0.001 );
		$this->assertSame( 0, $items[1]['stats']['revenue'] );

		$request->set_param( 'order', 'asc' );
		$items = rest_get_server()->dispatch( $request )->get_data()['items'];
		$this->assertSame( $second, $items[ count( $items ) - 1 ]['id'] );
	}
	/** Recurring action is unique and deactivation clears it. */
	public function test_schedule_is_unique_and_cleared() {
		Installer::clear_schedules();
		$rollup = new Rollup();
		$rollup->schedule();
		$rollup->schedule();
		$this->assertTrue( as_has_scheduled_action( 'mmbb_rollup_daily', array(), 'mmbb' ) );
		$actions = as_get_scheduled_actions(
			array(
				'hook'     => 'mmbb_rollup_daily',
				'group'    => 'mmbb',
				'status'   => 'pending',
				'per_page' => 10,
			),
			'ids'
		);
		$this->assertCount( 1, $actions );
		Installer::clear_schedules();
		$this->assertFalse( as_has_scheduled_action( 'mmbb_rollup_daily', array(), 'mmbb' ) );
	}
}
