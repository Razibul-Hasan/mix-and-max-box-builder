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
		\MixMax\BoxBuilder\Installer::install();
		update_option( Settings::OPTION, Settings::defaults() );
		if ( ! WC()->cart instanceof \WC_Cart ) {
			wc_load_cart();
		}
		WC()->cart->empty_cart();

		add_filter( 'wp_doing_ajax', '__return_true' );
		add_filter(
			'wp_die_ajax_handler',
			static function () {
				return static function ( $message = '' ) {
					throw new \WPDieException( esc_html( (string) $message ) );
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

	/** The box image picked in the builder becomes the container's photo; a photo set in WooCommerce is kept without one. */
	public function test_container_takes_the_builder_image() {
		$campaign = $this->repo->find( $this->campaign['id'] );
		$product  = wc_get_product( $campaign['config']['container_product_id'] );
		$manual   = self::factory()->attachment->create_object( 'manual.jpg', 0, array( 'post_mime_type' => 'image/jpeg' ) );
		$picked   = self::factory()->attachment->create_object( 'picked.jpg', 0, array( 'post_mime_type' => 'image/jpeg' ) );

		$product->set_image_id( $manual );
		$product->save();
		$this->repo->save( $this->campaign['id'], array(), 'Test box' );
		$this->assertSame( $manual, (int) wc_get_product( $product->get_id() )->get_image_id() );

		$this->repo->save( $this->campaign['id'], array( 'image_id' => $picked ), 'Test box' );
		$this->assertSame( $picked, (int) wc_get_product( $product->get_id() )->get_image_id() );
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

	/** A cached builder cannot add a box while the store-wide switch is off. */
	public function test_disabled_setting_rejects_add_to_cart() {
		Settings::update( array( 'enabled' => false ) );
		$result = $this->add();

		$this->assertFalse( $result['success'] );
		$this->assertSame( 'campaign_unavailable', $result['data']['code'] );
		$this->assertCount( 0, WC()->cart->get_cart() );
	}

	/** No endpoint hands out add-to-cart nonces. */
	public function test_there_is_no_nonce_endpoint() {
		$this->assertFalse( has_action( 'wc_ajax_mmbb_nonce' ) );
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

	/** Coupons skip box lines unless this campaign allows them. */
	public function test_coupons_are_excluded_by_default() {
		$this->add();
		$line   = $this->box_line();
		$coupon = new \WC_Coupon();

		$this->assertFalse( apply_filters( 'woocommerce_coupon_is_valid_for_product', true, $line['data'], $coupon, $line ) );

		$config                         = $this->campaign['config'];
		$config['box']['allow_coupons'] = true;
		$this->campaign                 = $this->repo->save( $this->campaign['id'], $config );
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

	/** A one-line box grants download access to its downloadable items, once, and lists the links. */
	public function test_one_line_box_grants_item_downloads() {
		// Remote or unlisted file URLs are refused while WooCommerce restricts download directories.
		update_option( 'wc_downloads_approved_directories_mode', 'disabled' );
		$item = wc_get_product( $this->products[1]->get_id() );
		$item->set_downloadable( true );
		$item->set_virtual( true );
		$item->set_downloads(
			array(
				array(
					'name' => 'Guide',
					'file' => wp_get_upload_dir()['baseurl'] . '/guide.pdf',
				),
			)
		);
		$item->save();

		$this->add();
		$order = $this->order_from_cart();
		$order->set_billing_email( 'buyer@example.com' );
		// Links show only once downloads are permitted, as on WooCommerce's own downloads table.
		$order->set_status( 'completed' );
		$order->save();

		wc_downloadable_product_permissions( $order->get_id(), true );
		wc_downloadable_product_permissions( $order->get_id(), true );

		$store = \WC_Data_Store::load( 'customer-download' );
		$this->assertCount(
			1,
			$store->get_downloads(
				array(
					'order_id'   => $order->get_id(),
					'product_id' => $item->get_id(),
				)
			)
		);

		$links = wc_get_order( $order->get_id() )->get_downloadable_items();
		$this->assertCount( 1, $links );
		$this->assertSame( 'Guide', $links[0]['download_name'] );
	}

	/** With the setting off, item stock is left alone. */
	public function test_stock_reduction_can_be_turned_off() {
		Settings::update( array( 'reduce_item_stock' => false ) );
		$this->add();
		$order = $this->order_from_cart();

		wc_reduce_stock_levels( $order->get_id() );
		$this->assertSame( 20, wc_get_product( $this->products[1]->get_id() )->get_stock_quantity() );
	}

	/**
	 * Give the store one shipping method, so WooCommerce asks whether a cart needs shipping at all.
	 * Without a method, needs_shipping() is always false and a virtual-box test proves nothing.
	 */
	private function enable_shipping() {
		$zone = new \WC_Shipping_Zone( 0 );
		$zone->add_shipping_method( 'flat_rate' );
		$this->assertGreaterThan( 0, wc_get_shipping_method_count( true, true ) );
	}

	/** A box of physical products needs shipping. */
	public function test_a_box_of_physical_products_needs_shipping() {
		$this->enable_shipping();
		$this->add();
		WC()->cart->calculate_totals();
		$this->assertFalse( $this->box_line()['data']->is_virtual() );
		$this->assertTrue( WC()->cart->needs_shipping() );
	}

	/** A box of downloads is virtual, so no shipping is charged. */
	public function test_a_box_of_virtual_products_is_virtual() {
		$this->enable_shipping();
		$this->products[1]->set_virtual( true );
		$this->products[1]->save();
		$this->add();
		WC()->cart->calculate_totals();
		$this->assertTrue( $this->box_line()['data']->is_virtual() );
		$this->assertFalse( WC()->cart->needs_shipping() );
	}

	/** One physical product is enough to make the box ship. */
	public function test_a_mixed_box_still_ships() {
		$this->enable_shipping();
		$this->products[1]->set_virtual( true );
		$this->products[1]->save();
		$this->add(
			array(
				'items' => array(
					array(
						'product_id' => $this->products[1]->get_id(),
						'qty'        => 1,
					),
					array(
						'product_id' => $this->products[2]->get_id(),
						'qty'        => 1,
					),
				),
			)
		);
		WC()->cart->calculate_totals();
		$this->assertFalse( $this->box_line()['data']->is_virtual() );
		$this->assertTrue( WC()->cart->needs_shipping() );
	}

	/** Gift wrap is a physical extra, so it keeps a virtual box shippable. */
	public function test_gift_wrap_keeps_a_virtual_box_shippable() {
		$this->enable_shipping();
		$this->products[1]->set_virtual( true );
		$this->products[1]->save();
		$this->add( array( 'gift' => array( 'enabled' => true ) ) );
		WC()->cart->calculate_totals();
		$this->assertFalse( $this->box_line()['data']->is_virtual() );
	}

	/** Gift wrap on an items-mode box is a physical extra, so a wrapped box still ships. */
	public function test_items_mode_gift_wrap_keeps_a_virtual_box_shippable() {
		$this->enable_shipping();
		Settings::update( array( 'cart_display' => 'items' ) );
		$this->products[1]->set_virtual( true );
		$this->products[1]->save();
		$this->add( array( 'gift' => array( 'enabled' => '1' ) ) );
		WC()->cart->calculate_totals();
		$this->assertFalse( $this->box_line()['data']->is_virtual() );
		$this->assertTrue( WC()->cart->needs_shipping() );
	}

	/** In items mode the header is only a fee line; the item lines decide shipping. */
	public function test_items_mode_header_is_virtual_and_items_decide_shipping() {
		$this->enable_shipping();
		Settings::update( array( 'cart_display' => 'items' ) );
		$this->add();
		WC()->cart->calculate_totals();
		$this->assertTrue( $this->box_line()['data']->is_virtual() );
		$this->assertTrue( WC()->cart->needs_shipping() );
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

	/** Adding the same items-mode box twice creates two complete groups. */
	public function test_identical_items_mode_boxes_stay_complete() {
		Settings::update( array( 'cart_display' => 'items' ) );
		$this->assertTrue( $this->add()['success'] );
		$this->assertTrue( $this->add()['success'] );
		$this->assertCount( 4, WC()->cart->get_cart() );
		$this->assertEqualsWithDelta( 36.0, (float) WC()->cart->get_cart_contents_total(), 0.001 );
	}

	/** Failed edits preserve the original box and total. */
	public function test_failed_edit_preserves_the_original_box() {
		$this->add();
		$first            = $this->box_line();
		$reject_container = static function ( $purchasable, $product ) {
			return $product->get_meta( '_mmbb_campaign_id' ) ? false : $purchasable;
		};
		add_filter( 'woocommerce_is_purchasable', $reject_container, 100, 2 );
		try {
			$result = $this->add( array( 'edit_key' => $first['key'] ) );
		} finally {
			remove_filter( 'woocommerce_is_purchasable', $reject_container, 100 );
		}
		$this->assertFalse( $result['success'] );
		$this->assertCount( 1, WC()->cart->get_cart() );
		$this->assertSame( $first['key'], $this->box_line()['key'] );
	}

	/** An edit key cannot replace a box belonging to another campaign. */
	public function test_edit_key_must_belong_to_the_campaign() {
		$this->add();
		$first  = $this->box_line();
		$other  = $this->repo->create_from_template( 'blank' );
		$result = $this->add(
			array(
				'campaign_id' => $other['id'],
				'edit_key'    => $first['key'],
			)
		);
		$this->assertFalse( $result['success'] );
		$this->assertSame( $first['key'], $this->box_line()['key'] );
	}

	/** Proportional rounding must never give the final child a negative price. */
	public function test_items_mode_rounding_keeps_prices_nonnegative() {
		Settings::update( array( 'cart_display' => 'items' ) );
		$fourth = new \WC_Product_Simple();
		$fourth->set_name( 'Fourth cookie' );
		$this->products[4] = $fourth;
		$picks             = array();
		foreach ( $this->products as $product ) {
			$product->set_regular_price( '0.01' );
			$product->save();
			$picks[] = array(
				'product_id' => $product->get_id(),
				'qty'        => 1,
			);
		}
		$this->repo->save(
			$this->campaign['id'],
			array(
				'type'     => 'bundle',
				'bundle'   => array(
					'qty'   => 4,
					'price' => 0.02,
				),
				'products' => array( 'ids' => array_column( $picks, 'product_id' ) ),
			)
		);
		$this->assertTrue( $this->add( array( 'items' => $picks ) )['success'] );
		$this->assertCount( 5, WC()->cart->get_cart() );
		foreach ( WC()->cart->get_cart() as $line ) {
			$this->assertGreaterThanOrEqual( 0, (float) $line['data']->get_price() );
		}
		$this->assertEqualsWithDelta( 0.02, (float) WC()->cart->get_cart_contents_total(), 0.0001 );
	}

	/** Sibling variations must not each claim all of their parent's shared stock. */
	public function test_variations_share_their_parents_stock_limit() {
		$parent = new \WC_Product_Variable();
		$parent->set_name( 'Shared stock' );
		$parent->set_manage_stock( true );
		$parent->set_stock_quantity( 3 );
		$parent->save();
		$picks = array();
		$ids   = array();
		for ( $i = 0; $i < 2; $i++ ) {
			$variation = new \WC_Product_Variation();
			$variation->set_parent_id( $parent->get_id() );
			$variation->set_regular_price( '10' );
			$variation->save();
			$ids[]   = $variation->get_id();
			$picks[] = array(
				'product_id'   => $parent->get_id(),
				'variation_id' => $variation->get_id(),
				'qty'          => 2,
			);
		}
		$this->repo->save( $this->campaign['id'], array( 'products' => array( 'ids' => $ids ) ) );
		$result = $this->add( array( 'items' => $picks ) );
		$this->assertFalse( $result['success'] );
		$this->assertSame( 'out_of_stock', $result['data']['code'] );
		$this->assertCount( 0, WC()->cart->get_cart() );
	}

	/** The actual Store API carries our metadata and marks items-mode lines read-only. */
	public function test_store_api_exposes_box_data_and_locks_items_mode_quantities() {
		Settings::update( array( 'cart_display' => 'items' ) );
		$this->add();
		do_action( 'rest_api_init' );
		$response = rest_get_server()->dispatch( new \WP_REST_Request( 'GET', '/wc/store/v1/cart' ) );
		$this->assertSame( 200, $response->get_status() );
		$data  = json_decode( wp_json_encode( $response->get_data() ), true );
		$items = $data['items'];
		$this->assertCount( 2, $items );
		foreach ( $items as $item ) {
			$this->assertArrayHasKey( 'mmbb', (array) $item['extensions'] );
			$this->assertFalse( $item['quantity_limits']['editable'] );
		}
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
	/** Successful AJAX additions are recorded server-side using only a salted session. */
	public function test_add_to_cart_event_is_server_owned() {
		global $wpdb;
		$session = str_repeat( 'd', 32 );
		$result  = $this->add( array( 'analytics_session' => $session ) );
		$this->assertTrue( $result['success'] );
		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM %i WHERE campaign_id = %d AND event = %s', $wpdb->prefix . 'mmbb_events', $this->campaign['id'], 'add_to_cart' ), ARRAY_A );
		$this->assertSame( \MixMax\BoxBuilder\Analytics\Collector::session_hash( $session ), $row['session'] );
		$this->assertNotSame( $session, $row['session'] );
	}

	/**
	 * A saved fixed-cart coupon.
	 *
	 * @param string $code   Coupon code.
	 * @param float  $amount Amount off the cart.
	 * @return \WC_Coupon
	 */
	private function cart_coupon( $code, $amount ) {
		$coupon = new \WC_Coupon();
		$coupon->set_code( $code );
		$coupon->set_discount_type( 'fixed_cart' );
		$coupon->set_amount( $amount );
		$coupon->save();
		return $coupon;
	}

	/** A fixed-cart coupon skips box lines unless the campaign allows coupons. */
	public function test_fixed_cart_coupons_skip_box_lines_unless_allowed() {
		$this->add();
		$other = WC()->cart->add_to_cart( $this->products[3]->get_id(), 1 );
		$this->cart_coupon( 'fivecart', 5 );
		$this->assertTrue( WC()->cart->apply_coupon( 'fivecart' ) );
		WC()->cart->calculate_totals();
		wc_clear_notices();

		$box = $this->box_line();
		$this->assertEqualsWithDelta( 18.0, (float) $box['line_total'], 0.001, 'The box keeps its own price.' );
		$this->assertEqualsWithDelta( 5.0, (float) WC()->cart->get_cart_item( $other )['line_subtotal'] - (float) WC()->cart->get_cart_item( $other )['line_total'], 0.001, 'The other line takes the whole coupon.' );

		$config                         = $this->campaign['config'];
		$config['box']['allow_coupons'] = true;
		$this->repo->save( $this->campaign['id'], $config );
		WC()->cart->calculate_totals();
		$this->assertLessThan( 18.0, (float) $this->box_line()['line_total'], 'Allowed, the coupon reaches the box too.' );
	}

	/** Coupons applied to an order (by the merchant, in admin) skip box lines too. */
	public function test_order_coupons_skip_box_lines() {
		$this->add();
		$order = $this->order_from_cart();
		$lines = array_values( $order->get_items() );

		$this->assertFalse( \MixMax\BoxBuilder\Cart\Cart_Lines::coupons_allowed( $lines[0] ) );
		$plain = new \WC_Order_Item_Product();
		$plain->set_product( $this->products[3] );
		$this->assertNull( \MixMax\BoxBuilder\Cart\Cart_Lines::coupons_allowed( $plain ) );
	}

	/** A one-line box is taxed like its items when they share a tax class, and as standard when they mix. */
	public function test_bundle_box_takes_its_items_tax_class() {
		foreach ( array( 1, 2 ) as $i ) {
			$this->products[ $i ]->set_tax_class( 'reduced-rate' );
			$this->products[ $i ]->save();
		}
		$this->add(
			array(
				'items' => array(
					array(
						'product_id' => $this->products[1]->get_id(),
						'qty'        => 1,
					),
					array(
						'product_id' => $this->products[2]->get_id(),
						'qty'        => 1,
					),
				),
			)
		);
		$this->assertSame( 'reduced-rate', $this->box_line()['data']->get_tax_class() );

		WC()->cart->empty_cart();
		$this->add(
			array(
				'items' => array(
					array(
						'product_id' => $this->products[1]->get_id(),
						'qty'        => 1,
					),
					array(
						'product_id' => $this->products[3]->get_id(),
						'qty'        => 1,
					),
				),
			)
		);
		$this->assertSame( '', $this->box_line()['data']->get_tax_class(), 'Mixed classes keep the container product\'s own.' );
	}

	/** Refunding a box with "restock" puts its items back once; a later cancel does not add them again. */
	public function test_refund_restock_returns_box_items_once() {
		$this->add();
		$order = $this->order_from_cart();
		wc_reduce_stock_levels( $order->get_id() );
		$this->assertSame( 18, wc_get_product( $this->products[1]->get_id() )->get_stock_quantity() );

		$item_id = array_keys( $order->get_items() )[0];
		$refund  = wc_create_refund(
			array(
				'order_id'      => $order->get_id(),
				'amount'        => 0,
				'line_items'    => array(
					$item_id => array(
						'qty'          => 1,
						'refund_total' => 0,
					),
				),
				'restock_items' => true,
			)
		);
		$this->assertNotWPError( $refund );
		$this->assertSame( 20, wc_get_product( $this->products[1]->get_id() )->get_stock_quantity() );

		wc_increase_stock_levels( wc_get_order( $order->get_id() ) );
		$this->assertSame( 20, wc_get_product( $this->products[1]->get_id() )->get_stock_quantity() );
	}

	/** Order meta saved under another language's keys is still found, ordered and formatted. */
	public function test_order_meta_saved_in_another_language_is_found() {
		$item = new \WC_Order_Item_Product();
		$item->set_product( $this->products[1] );
		$item->add_meta_data(
			Order_Boxes::META_BOX,
			wp_json_encode(
				array(
					'campaign_id' => $this->campaign['id'],
					'items'       => array(
						array(
							'product_id'   => $this->products[1]->get_id(),
							'variation_id' => 0,
							'qty'          => 2,
						),
					),
				)
			)
		);
		$item->add_meta_data( 'Contenu', 'raw text', true );
		$item->add_meta_data( Order_Boxes::META_LABELS, wp_json_encode( array( 'contents' => 'Contenu' ) ), true );
		$item->save();

		$meta = array_values( wp_list_filter( $item->get_formatted_meta_data(), array( 'key' => 'Contenu' ) ) );
		$this->assertCount( 1, $meta );
		$this->assertStringContainsString( '2 × Cookie 1', $meta[0]->display_value );
		$this->assertNotContains( Order_Boxes::META_LABELS, wp_list_pluck( $item->get_formatted_meta_data(), 'key' ) );
	}
}
