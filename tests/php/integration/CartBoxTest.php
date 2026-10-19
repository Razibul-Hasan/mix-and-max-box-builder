<?php
/**
 * Cart, orders and stock for boxes.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Cart\Order_Boxes;
use MixMax\BoxBuilder\Settings\Settings;

/** The add-to-cart endpoint, server pricing, coupons, order meta and stock. */
class CartBoxTest extends \WP_UnitTestCase {
	/**
	 * Campaign storage.
	 *
	 * @var Campaign_Repository
	 */
	private $repo;

	/**
	 * Products the campaign offers.
	 *
	 * @var \WC_Product[]
	 */
	private $products = array();

	/**
	 * The live campaign.
	 *
	 * @var array
	 */
	private $campaign;

	/** A live tiered campaign with three stocked products, and an empty cart. */
	public function set_up() {
		parent::set_up();
		if ( ! WC()->cart instanceof \WC_Cart ) {
			wc_load_cart();
		}
		WC()->cart->empty_cart();

		add_filter( 'wp_doing_ajax', '__return_true' );
		add_filter(
			'wp_die_ajax_handler',
			static function () {
				return static function ( $message = '' ) {
					throw new \WPDieException( (string) $message );
				};
			}
		);

		$this->repo = new Campaign_Repository();
		for ( $i = 1; $i <= 3; $i++ ) {
			$product = new \WC_Product_Simple();
			$product->set_name( 'Cookie ' . $i );
			$product->set_regular_price( '10.00' );
			$product->set_manage_stock( true );
			$product->set_stock_quantity( 20 );
			$product->set_status( 'publish' );
			$product->save();
			$this->products[ $i ] = $product;
		}

		$campaign = $this->repo->create_from_template( 'blank', 'Test box' );
		$this->repo->save(
			$campaign['id'],
			array(
				'type'     => 'tiered',
				'box'      => array(
					'capacity'         => 6,
					'min_items'        => 1,
					'allow_duplicates' => true,
					'max_per_product'  => 6,
				),
				'tiers'    => array(
					array(
						'qty'           => 2,
						'discount_type' => 'percent',
						'value'         => 10,
					),
					array(
						'qty'           => 4,
						'discount_type' => 'percent',
						'value'         => 20,
					),
				),
				'products' => array(
					'ids' => array(
						$this->products[1]->get_id(),
						$this->products[2]->get_id(),
						$this->products[3]->get_id(),
					),
				),
				'extras'   => array(
					'gift_message' => true,
					'gift_wrap'    => array(
						'enabled' => true,
						'fee'     => 3,
					),
				),
			)
		);
		$this->campaign = $this->repo->publish( $campaign['id'] );
	}

	/** Reset the superglobals a test filled. */
	public function tear_down() {
		$_POST    = array();
		$_REQUEST = array();
		if ( WC()->cart instanceof \WC_Cart ) {
			WC()->cart->empty_cart();
		}
		parent::tear_down();
	}

	/**
	 * Call the add-to-cart endpoint and return its decoded JSON.
	 *
	 * @param array $overrides Request fields to change. A `null` removes the field.
	 * @return array
	 */
	private function add( array $overrides = array() ) {
		$request  = array_merge(
			array(
				'nonce'       => wp_create_nonce( 'mmbb_add_box' ),
				'campaign_id' => $this->campaign['id'],
				'items'       => array(
					array(
						'product_id' => $this->products[1]->get_id(),
						'qty'        => 2,
					),
				),
			),
			$overrides
		);
		$_POST    = array_filter(
			$request,
			static function ( $value ) {
				return null !== $value;
			}
		);
		$_REQUEST = $_POST; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Test request; the handler under test verifies the nonce.

		ob_start();
		try {
			do_action( 'wc_ajax_mmbb_add_box' );
		} catch ( \WPDieException $e ) {
			unset( $e );
		}
		$decoded = json_decode( (string) ob_get_clean(), true );
		return is_array( $decoded ) ? $decoded : array();
	}

	/**
	 * The first box line in the cart.
	 *
	 * @return array|null
	 */
	private function box_line() {
		foreach ( WC()->cart->get_cart() as $key => $line ) {
			if ( isset( $line['mmbb_box'] ) ) {
				$line['key'] = $key;
				return $line;
			}
		}
		return null;
	}

	/**
	 * Put the current cart's box on a new order, as checkout does.
	 *
	 * @return \WC_Order
	 */
	private function order_from_cart() {
		$order = wc_create_order();
		foreach ( WC()->cart->get_cart() as $key => $line ) {
			$item = new \WC_Order_Item_Product();
			$item->set_product( $line['data'] );
			$item->set_quantity( $line['quantity'] );
			do_action( 'woocommerce_checkout_create_order_line_item', $item, $key, $line, $order );
			$order->add_item( $item );
		}
		$order->save();
		return $order;
	}

	/** Publishing gives the campaign a hidden, unmanaged, zero-priced container product. */
	public function test_container_product_is_created_hidden() {
		$campaign = $this->repo->find( $this->campaign['id'] );
		$product  = wc_get_product( $campaign['config']['container_product_id'] );

		$this->assertInstanceOf( \WC_Product::class, $product );
		$this->assertSame( 'hidden', $product->get_catalog_visibility() );
		$this->assertFalse( $product->managing_stock() );
		$this->assertSame( 'Test box', $product->get_name() );
		$this->assertSame( (int) $campaign['id'], (int) $product->get_meta( '_mmbb_campaign_id' ) );
	}

	/** The container follows the campaign name and goes to the trash with it. */
	public function test_container_follows_the_campaign() {
		$this->repo->save( $this->campaign['id'], array(), 'Renamed box' );
		$campaign = $this->repo->find( $this->campaign['id'] );
		$id       = $campaign['config']['container_product_id'];
		$this->assertSame( 'Renamed box', wc_get_product( $id )->get_name() );

		$this->repo->delete( $this->campaign['id'] );
		$this->assertSame( 'trash', get_post_status( $id ) );
	}

	/** Nothing can put the container in a cart except the builder. */
	public function test_container_is_not_purchasable_outside_the_builder() {
		$campaign = $this->repo->find( $this->campaign['id'] );
		$product  = wc_get_product( $campaign['config']['container_product_id'] );
		$this->assertFalse( $product->is_purchasable() );
		$this->assertFalse( WC()->cart->add_to_cart( $product->get_id() ) );
	}

	/** A valid box becomes one priced line with its contents. */
	public function test_a_valid_box_is_added() {
		$result = $this->add();

		$this->assertTrue( $result['success'] );
		$this->assertArrayHasKey( 'cart_url', $result['data'] );
		$this->assertArrayHasKey( 'cart_hash', $result['data'] );
		$this->assertCount( 1, WC()->cart->get_cart() );

		$line = $this->box_line();
		$this->assertSame( 2000, $line['mmbb_box']['quote']['subtotal'] );
		$this->assertSame( 200, $line['mmbb_box']['quote']['discount'] );
		$this->assertSame( 1800, $line['mmbb_box']['quote']['total'] );

		WC()->cart->calculate_totals();
		$this->assertEqualsWithDelta( 18.0, (float) WC()->cart->get_cart_contents_total(), 0.001 );
	}

	/** The cart shows contents and the discount. */
	public function test_the_line_lists_its_contents_and_discount() {
		$this->add();
		$line = $this->box_line();
		$data = wp_list_pluck( apply_filters( 'woocommerce_get_item_data', array(), $line ), 'value', 'key' );

		$this->assertStringContainsString( '2 × Cookie 1', $data['Contents'] );
		$this->assertStringContainsString( '10%', $data['Box discount'] );
		$this->assertStringContainsString( 'Add 2 more items to get 20% off', $data['Next discount'] );
	}

	/** A bad nonce answers with the code the front end retries on. */
	public function test_an_expired_nonce_is_reported() {
		$result = $this->add( array( 'nonce' => 'expired' ) );

		$this->assertFalse( $result['success'] );
		$this->assertSame( 'mmbb_nonce_expired', $result['data']['code'] );
		$this->assertCount( 0, WC()->cart->get_cart() );
	}

	/** The nonce endpoint hands out a nonce that the add endpoint accepts. */
	public function test_the_nonce_endpoint_returns_a_working_nonce() {
		ob_start();
		try {
			do_action( 'wc_ajax_mmbb_nonce' );
		} catch ( \WPDieException $e ) {
			unset( $e );
		}
		$result = json_decode( (string) ob_get_clean(), true );
		$this->assertTrue( $result['success'] );
		$this->assertNotFalse( wp_verify_nonce( $result['data']['nonce'], 'mmbb_add_box' ) );
	}

	/** Each rule refuses with its own code and leaves the cart empty. */
	public function test_invalid_boxes_are_rejected() {
		$id = $this->products[1]->get_id();

		$over = $this->add(
			array(
				'items' => array(
					array(
						'product_id' => $id,
						'qty'        => 7,
					),
				),
			)
		);
		$this->assertSame( 'over_capacity', $over['data']['code'] );

		$other = new \WC_Product_Simple();
		$other->set_name( 'Not in the campaign' );
		$other->set_regular_price( '1' );
		$other->set_status( 'publish' );
		$other->save();
		$foreign = $this->add(
			array(
				'items' => array(
					array(
						'product_id' => $other->get_id(),
						'qty'        => 1,
					),
				),
			)
		);
		$this->assertSame( 'foreign_product', $foreign['data']['code'] );

		$this->products[2]->set_stock_quantity( 1 );
		$this->products[2]->save();
		$stock = $this->add(
			array(
				'items' => array(
					array(
						'product_id' => $this->products[2]->get_id(),
						'qty'        => 2,
					),
				),
			)
		);
		$this->assertSame( 'out_of_stock', $stock['data']['code'] );

		$empty = $this->add( array( 'items' => array() ) );
		$this->assertSame( 'empty', $empty['data']['code'] );

		$this->assertCount( 0, WC()->cart->get_cart() );
	}

	/** A fixed box refuses a size it does not offer. */
	public function test_a_wrong_size_is_rejected() {
		$this->repo->save(
			$this->campaign['id'],
			array(
				'type'  => 'fixed',
				'sizes' => array(
					array(
						'qty'           => 4,
						'discount_type' => 'percent',
						'value'         => 10,
					),
				),
			)
		);

		$result = $this->add(
			array(
				'size'  => 3,
				'items' => array(
					array(
						'product_id' => $this->products[1]->get_id(),
						'qty'        => 3,
					),
				),
			)
		);
		$this->assertSame( 'invalid_size', $result['data']['code'] );
	}

	/** Prices in the request are ignored. */
	public function test_a_tampered_price_is_ignored() {
		$result = $this->add(
			array(
				'items' => array(
					array(
						'product_id'       => $this->products[1]->get_id(),
						'qty'              => 2,
						'price'            => '0.01',
						'unit_price_minor' => 1,
					),
				),
				'total' => '0.01',
			)
		);

		$this->assertTrue( $result['success'] );
		$line = $this->box_line();
		$this->assertSame( 1000, $line['mmbb_box']['items'][0]['unit_price_minor'] );
		$this->assertSame( 1800, $line['mmbb_box']['quote']['total'] );
	}

	/** A price change after the box was added reaches the cart total. */
	public function test_the_total_follows_product_prices() {
		$this->add();

		$this->products[1]->set_regular_price( '20.00' );
		$this->products[1]->save();
		WC()->cart->calculate_totals();

		$line = $this->box_line();
		$this->assertSame( 3600, $line['mmbb_box']['quote']['total'] );
		$this->assertEqualsWithDelta( 36.0, (float) $line['data']->get_price(), 0.001 );
	}

	/** A box whose item sold out is removed with a notice. */
	public function test_a_box_with_a_sold_out_item_is_removed() {
		$this->add();
		$this->products[1]->set_stock_quantity( 0 );
		$this->products[1]->save();
		WC()->cart->calculate_totals();

		$this->assertCount( 0, WC()->cart->get_cart() );
		$this->assertGreaterThan( 0, wc_notice_count( 'error' ) );
		wc_clear_notices();
	}

	/** Gift wrap adds the campaign's fee, and the message is kept. */
	public function test_gift_wrap_and_message() {
		$this->add(
			array(
				'gift' => array(
					'enabled' => '1',
					'message' => 'Happy holidays',
				),
			)
		);
		$line = $this->box_line();

		$this->assertSame( 300, $line['mmbb_box']['quote']['fee'] );
		$this->assertSame( 2100, $line['mmbb_box']['quote']['total'] );
		$this->assertSame( 'Happy holidays', $line['mmbb_box']['gift']['message'] );
	}

	/** Coupons skip box lines unless the merchant allows them. */
	public function test_coupons_are_excluded_by_default() {
		$this->add();
		$line   = $this->box_line();
		$coupon = new \WC_Coupon();

		$this->assertFalse( apply_filters( 'woocommerce_coupon_is_valid_for_product', true, $line['data'], $coupon, $line ) );

		Settings::update( array( 'allow_coupons' => true ) );
		$this->assertTrue( apply_filters( 'woocommerce_coupon_is_valid_for_product', true, $line['data'], $coupon, $line ) );
	}

	/** The order line keeps the box, the readable rows and the order flag. */
	public function test_order_meta_is_present() {
		$this->add();
		$order = $this->order_from_cart();
		$order = wc_get_order( $order->get_id() );
		$items = array_values( $order->get_items() );

		$this->assertNotEmpty( $items[0]->get_meta( Order_Boxes::META_BOX ) );
		$this->assertStringContainsString( '2 × Cookie 1', $items[0]->get_meta( 'Contents' ) );
		$this->assertNotSame( '', $items[0]->get_meta( 'Box discount' ) );
		$this->assertSame( '1', (string) $order->get_meta( Order_Boxes::META_ORDER ) );
		$this->assertTrue( (bool) get_option( 'mmbb_setup_test_done' ) );
		$this->assertContains( Order_Boxes::META_BOX, apply_filters( 'woocommerce_hidden_order_itemmeta', array() ) );
	}

	/** Item stock goes down with the order and comes back when it is cancelled. */
	public function test_stock_is_reduced_then_restored() {
		$this->add();
		$order = $this->order_from_cart();

		wc_reduce_stock_levels( $order->get_id() );
		$this->assertSame( 18, wc_get_product( $this->products[1]->get_id() )->get_stock_quantity() );

		$order = wc_get_order( $order->get_id() );
		wc_increase_stock_levels( $order );
		$this->assertSame( 20, wc_get_product( $this->products[1]->get_id() )->get_stock_quantity() );
	}

	/** With the setting off, item stock is left alone. */
	public function test_stock_reduction_can_be_turned_off() {
		Settings::update( array( 'reduce_item_stock' => false ) );
		$this->add();
		$order = $this->order_from_cart();

		wc_reduce_stock_levels( $order->get_id() );
		$this->assertSame( 20, wc_get_product( $this->products[1]->get_id() )->get_stock_quantity() );
	}

	/** Items mode: a header line plus one line per item, removed together. */
	public function test_items_mode_adds_item_lines_under_a_header() {
		Settings::update( array( 'cart_display' => 'items' ) );
		$result = $this->add();

		$this->assertTrue( $result['success'] );
		$this->assertCount( 2, WC()->cart->get_cart() );

		WC()->cart->calculate_totals();
		$this->assertEqualsWithDelta( 18.0, (float) WC()->cart->get_cart_contents_total(), 0.001 );

		$header = $this->box_line();
		WC()->cart->remove_cart_item( $header['key'] );
		$this->assertCount( 0, WC()->cart->get_cart() );
	}

	/** Editing replaces the old line. */
	public function test_editing_a_box_replaces_the_line() {
		$this->add();
		$first = $this->box_line();

		$this->add(
			array(
				'edit_key' => $first['key'],
				'items'    => array(
					array(
						'product_id' => $this->products[2]->get_id(),
						'qty'        => 3,
					),
				),
			)
		);

		$this->assertCount( 1, WC()->cart->get_cart() );
		$line = $this->box_line();
		$this->assertSame( 3, $line['mmbb_box']['items'][0]['qty'] );
	}
}
