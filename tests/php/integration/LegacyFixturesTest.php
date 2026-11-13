<?php
/**
 * Data saved by 1.0.0 must keep working: boxes, settings and an order with a box.
 *
 * The fixtures in tests/fixtures/legacy/ hold the exact rows 1.0.0 stored. `expected.json`
 * holds what 1.0.0 answered for them. Later versions may add keys, but every value
 * recorded there has to stay the same.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Cart\Box_Resolver;
use MixMax\BoxBuilder\Installer;
use MixMax\BoxBuilder\Settings\Settings;
use MixMax\BoxBuilder\Storefront\Payload;

/** Load the 1.0.0 fixtures, upgrade, then price, render and buy each box. */
class LegacyFixturesTest extends \WP_UnitTestCase {
	/**
	 * What 1.0.0 answered for the fixtures.
	 *
	 * @var array
	 */
	private $expected;

	/** Store the 1.0.0 rows as that version left them, then let the upgrade routine run. */
	public function set_up() {
		parent::set_up();
		Installer::install();

		$settings = $this->fixture( 'settings.json' );
		update_option( Settings::OPTION, $settings['mmbb_settings'] );

		foreach ( $this->fixture( 'products.json' ) as $row ) {
			$this->insert_post( $row['id'], 'product', $row['name'], $row['status'] );
			$product = new \WC_Product_Simple( $row['id'] );
			$product->set_regular_price( $row['regular_price'] );
			$product->set_sale_price( $row['sale_price'] );
			$product->set_manage_stock( $row['manage_stock'] );
			$product->set_stock_quantity( $row['stock_quantity'] );
			$product->save();
		}

		foreach ( array( 'tiered', 'fixed', 'bundle' ) as $slug ) {
			$box = $this->fixture( 'box-' . $slug . '.json' );

			// The container first: publishing a box without one would create a second container.
			$container = $box['container'];
			$this->insert_post( $container['ID'], $container['post_type'], $container['post_title'], $container['post_status'] );
			$product = new \WC_Product_Simple( $container['ID'] );
			$product->set_catalog_visibility( $container['catalog_visibility'] );
			$product->set_regular_price( $container['regular_price'] );
			$product->set_manage_stock( false );
			$product->set_stock_status( 'instock' );
			foreach ( $container['meta'] as $key => $value ) {
				$product->update_meta_data( $key, $value );
			}
			$product->save();

			$this->insert_post( $box['post']['ID'], $box['post']['post_type'], $box['post']['post_title'], $box['post']['post_status'], $box['meta'] );
		}

		// The site was on 1.0.0 (schema 0.9.0). Run the upgrade as wp-admin would.
		update_option( 'mmbb_version', '1.0.0' );
		update_option( 'mmbb_db_version', '0.9.0' );
		Installer::maybe_upgrade();

		$this->expected = $this->fixture( 'expected.json' );

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
	}

	/** Reset the superglobals and the cart a test filled. */
	public function tear_down() {
		$_POST    = array();
		$_REQUEST = array();
		// Rendering enqueued the storefront assets; later tests expect a page without them.
		wp_dequeue_script( 'mmbb-storefront' );
		wp_dequeue_style( 'mmbb-storefront' );
		if ( WC()->cart instanceof \WC_Cart ) {
			WC()->cart->empty_cart();
		}
		parent::tear_down();
	}

	/**
	 * Read a fixture file.
	 *
	 * @param string $name File name in tests/fixtures/legacy/.
	 * @return array
	 */
	private function fixture( $name ) {
		$json = file_get_contents( dirname( __DIR__, 2 ) . '/fixtures/legacy/' . $name ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local test fixture.
		$data = json_decode( (string) $json, true );
		$this->assertIsArray( $data, $name );
		return $data;
	}

	/**
	 * Insert a post under the id the fixture recorded, so stored references stay valid.
	 *
	 * @param int    $id     Post id.
	 * @param string $type   Post type.
	 * @param string $title  Title.
	 * @param string $status Post status.
	 * @param array  $meta   Raw meta rows, stored before the status hooks fire.
	 */
	private function insert_post( $id, $type, $title, $status, array $meta = array() ) {
		$inserted = wp_insert_post(
			array(
				'import_id'   => $id,
				'post_type'   => $type,
				'post_title'  => $title,
				'post_status' => $status,
				'meta_input'  => wp_slash( $meta ),
			),
			true
		);
		$this->assertSame( $id, $inserted, $title );
	}

	/**
	 * Assert every value 1.0.0 recorded is still there. Keys added since are allowed.
	 *
	 * @param mixed  $expected Recorded value.
	 * @param mixed  $actual   Current value.
	 * @param string $path     Where we are, for the failure message.
	 */
	private function assert_kept( $expected, $actual, $path ) {
		$is_map = is_array( $expected ) && array() !== $expected && array_keys( $expected ) !== range( 0, count( $expected ) - 1 );
		if ( ! $is_map ) {
			$this->assertEquals( $expected, $actual, $path );
			return;
		}
		$this->assertIsArray( $actual, $path );
		foreach ( $expected as $key => $value ) {
			$this->assertArrayHasKey( $key, $actual, $path . '.' . $key );
			$this->assert_kept( $value, $actual[ $key ], $path . '.' . $key );
		}
	}

	/**
	 * The three boxes, one per box type.
	 *
	 * @return array[]
	 */
	public function boxes() {
		return array(
			'tiered' => array( 'tiered' ),
			'fixed'  => array( 'fixed' ),
			'bundle' => array( 'bundle' ),
		);
	}

	/**
	 * Call the add-to-cart endpoint for a box, with the picks 1.0.0 was asked to price.
	 *
	 * @param array $box Expected box from expected.json.
	 * @return array Decoded JSON response.
	 */
	private function add_to_cart( array $box ) {
		$_POST = array(
			'nonce'       => wp_create_nonce( 'mmbb_add_box' ),
			'campaign_id' => $box['id'],
			'items'       => $box['picks'],
		);
		if ( ! empty( $box['options']['size'] ) ) {
			$_POST['size'] = $box['options']['size'];
		}
		if ( ! empty( $box['options']['gift_wrap'] ) ) {
			$_POST['gift'] = array( 'enabled' => '1' );
		}
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

	/** The upgrade keeps every legacy value and adds the per-box coupon rule once. */
	public function test_upgrade_keeps_the_stored_rows() {
		foreach ( array( 'tiered', 'fixed', 'bundle' ) as $slug ) {
			$box    = $this->fixture( 'box-' . $slug . '.json' );
			$stored = json_decode( get_post_meta( $box['post']['ID'], '_mmbb_config', true ), true );
			$legacy = json_decode( $box['meta']['_mmbb_config'], true );
			$this->assert_kept( $legacy, $stored, $slug );
			$this->assertTrue( $stored['box']['allow_coupons'], $slug );
			$this->assertSame( $box['post']['post_status'], get_post_status( $box['post']['ID'] ), $slug );
		}
		$settings = $this->fixture( 'settings.json' );
		$this->assertSame( $settings['mmbb_settings'], get_option( Settings::OPTION ) );
		$this->assertSame( Installer::DB_VERSION, get_option( 'mmbb_db_version' ) );
	}

	/** Opening and saving a migrated fixture unchanged preserves its config bytes. */
	public function test_unchanged_fixture_save_is_byte_identical() {
		$repository = new Campaign_Repository();
		foreach ( array( 'tiered', 'fixed', 'bundle' ) as $slug ) {
			$box      = $this->fixture( 'box-' . $slug . '.json' );
			$id       = $box['post']['ID'];
			$before   = get_post_meta( $id, '_mmbb_config', true );
			$campaign = $repository->find( $id );
			$repository->save( $id, $campaign['config'], $campaign['title'], true );
			$this->assertSame( $before, get_post_meta( $id, '_mmbb_config', true ), $slug );
		}
	}

	/** Every setting 1.0.0 saved reads back with the same value. */
	public function test_settings_read_back() {
		$settings = $this->fixture( 'settings.json' );
		$this->assert_kept( $settings['mmbb_settings'], Settings::all(), 'mmbb_settings' );
		$this->assertSame( 3, Settings::get( 'columns' ) );
		$this->assertTrue( Settings::get( 'allow_coupons' ) );
	}

	/**
	 * A box reads back live with every config value it had.
	 *
	 * @dataProvider boxes
	 * @param string $slug Box type.
	 */
	public function test_box_reads_back( $slug ) {
		$expected = $this->expected['boxes'][ $slug ];
		$campaign = ( new Campaign_Repository() )->find( $expected['id'] );

		$this->assertIsArray( $campaign );
		$this->assertSame( $expected['status'], $campaign['status'] );
		$this->assertSame( $slug, $campaign['config']['type'] );
		$this->assert_kept( $expected['config'], $campaign['config'], 'config' );
	}

	/**
	 * A box prices exactly as it did.
	 *
	 * @dataProvider boxes
	 * @param string $slug Box type.
	 */
	public function test_box_prices( $slug ) {
		$expected = $this->expected['boxes'][ $slug ];
		$campaign = ( new Campaign_Repository() )->find( $expected['id'] );
		$resolved = Box_Resolver::resolve( $campaign, $expected['picks'], $expected['options'] );

		$this->assertNull( $resolved['error'] );
		$this->assertSame( $expected['items'], $resolved['items'] );
		$this->assert_kept( $expected['quote'], $resolved['quote'], 'quote' );
		$this->assertSame( $expected['quote']['total'], $resolved['quote']['total'] );
		$this->assertEquals( $expected['free_gift'], $resolved['free_gift'] );
	}

	/**
	 * A box renders through the shortcode and the block, with the same products and prices.
	 *
	 * @dataProvider boxes
	 * @param string $slug Box type.
	 */
	public function test_box_renders( $slug ) {
		$expected = $this->expected['boxes'][ $slug ];
		wp_set_current_user( 0 );

		$shortcode = do_shortcode( '[mmbb_box id="' . $expected['id'] . '"]' );
		$this->assertStringContainsString( 'class="mmbb-root mmbb-builder"', $shortcode );
		$this->assertStringContainsString( 'data-campaign="' . $expected['id'] . '"', $shortcode );
		$this->assertTrue( wp_script_is( 'mmbb-storefront', 'enqueued' ) );

		$block = do_blocks( '<!-- wp:mmbb/box-builder {"campaignId":' . $expected['id'] . '} /-->' );
		$this->assertStringContainsString( 'data-campaign="' . $expected['id'] . '"', $block );

		$override = do_shortcode( '[mmbb_box id="' . $expected['id'] . '" layout="bar" columns="3" hero="false"]' );
		$this->assertStringContainsString( 'data-campaign="' . $expected['id'] . '"', $override );

		$payload = Payload::build( ( new Campaign_Repository() )->find( $expected['id'] ) );
		foreach ( $expected['payload']['keys'] as $key ) {
			$this->assertArrayHasKey( $key, $payload );
		}
		$this->assertSame( $expected['id'], $payload['id'] );
		$this->assertSame( $slug, $payload['config']['type'] );
		$this->assertCount( count( $expected['payload']['products'] ), $payload['products'] );
		foreach ( $expected['payload']['products'] as $index => $product ) {
			$this->assert_kept( $product, $payload['products'][ $index ], 'products.' . $index );
		}
	}

	/**
	 * A box goes into the cart at the price 1.0.0 charged.
	 *
	 * @dataProvider boxes
	 * @param string $slug Box type.
	 */
	public function test_box_adds_to_cart( $slug ) {
		$expected = $this->expected['boxes'][ $slug ];
		$result   = $this->add_to_cart( $expected );

		$this->assertTrue( ! empty( $result['success'] ), wp_json_encode( $result ) );

		$lines = array();
		foreach ( WC()->cart->get_cart() as $line ) {
			if ( isset( $line['mmbb_box'] ) ) {
				$lines[] = $line;
			}
		}
		$this->assertCount( 1, $lines );
		$box = $lines[0]['mmbb_box'];
		$this->assertSame( $expected['id'], $box['campaign_id'] );
		$this->assertSame( $expected['config']['container_product_id'], $lines[0]['product_id'] );
		$this->assertSame( $expected['items'], $box['items'] );
		$this->assert_kept( $expected['quote'], $box['quote'], 'quote' );

		WC()->cart->calculate_totals();
		$this->assertEqualsWithDelta( $expected['quote']['total'] / 100, (float) WC()->cart->get_cart_contents_total(), 0.001 );
	}

	/** An order placed on 1.0.0 still shows its box, and its stock is not reduced a second time. */
	public function test_order_with_a_box() {
		$fixture = $this->fixture( 'order-with-box.json' );
		$order   = wc_create_order();
		foreach ( $fixture['items'] as $row ) {
			$item = new \WC_Order_Item_Product();
			$item->set_name( $row['name'] );
			$item->set_product_id( $row['product_id'] );
			$item->set_variation_id( $row['variation_id'] );
			$item->set_quantity( $row['quantity'] );
			$item->set_subtotal( $row['subtotal'] );
			$item->set_total( $row['total'] );
			foreach ( $row['meta'] as $meta ) {
				$item->add_meta_data( $meta['key'], $meta['value'], true );
			}
			$order->add_item( $item );
		}
		foreach ( $fixture['order']['meta'] as $key => $value ) {
			$order->update_meta_data( $key, $value );
		}
		$order->set_status( $fixture['order']['status'] );
		$order->calculate_totals();
		$order->save();

		$order = wc_get_order( $order->get_id() );
		$this->assertSame( $fixture['order']['total'], $order->get_total() );
		$this->assertSame( '1', (string) $order->get_meta( '_mmbb_has_box' ) );

		$items = array_values( $order->get_items() );
		$this->assertCount( 1, $items );
		$box = json_decode( $items[0]->get_meta( '_mmbb_box' ), true );
		$this->assertSame( 9201, $box['campaign_id'] );
		$this->assertSame( 2857, $box['quote']['total'] );

		$shown = array();
		foreach ( $items[0]->get_formatted_meta_data() as $meta ) {
			$shown[ $meta->key ] = wp_strip_all_tags( str_replace( array( '<br>', '<br />', '</li>', '</p>' ), "\n", $meta->display_value ) );
		}
		$this->assertSame( array( 'Box discount', 'Contents', 'Gift message' ), array_keys( $shown ) );
		$this->assertStringContainsString( '15%', $shown['Box discount'] );
		$this->assertStringContainsString( 'Brown butter chip cookie', $shown['Contents'] );
		$this->assertStringContainsString( 'Salted caramel brownie', $shown['Contents'] );
		$this->assertStringContainsString( 'Happy holidays, Sam!', $shown['Gift message'] );

		// 1.0.0 already took these items out of stock (`_mmbb_stock_reduced`).
		$before = wc_get_product( 9101 )->get_stock_quantity();
		do_action( 'woocommerce_reduce_order_stock', $order );
		$this->assertSame( $before, wc_get_product( 9101 )->get_stock_quantity() );

		// Cancelling gives the items back once.
		do_action( 'woocommerce_restore_order_stock', $order );
		$this->assertSame( $before + 2, wc_get_product( 9101 )->get_stock_quantity() );
		$this->assertSame( wc_get_product( 9103 )->get_stock_quantity(), 25 + 2 );
	}
}
