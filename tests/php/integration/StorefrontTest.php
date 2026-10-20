<?php
/**
 * The storefront block, shortcode, payload and asset loading.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Settings\Settings;
use MixMax\BoxBuilder\Storefront\Payload;
use MixMax\BoxBuilder\Storefront\Storefront;

/** Rendering, escaping, caching and who sees what. */
class StorefrontTest extends \WP_UnitTestCase {
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
	 * A live campaign.
	 *
	 * @var array
	 */
	private $campaign;

	/** A live campaign with a sold-out product, a sale product and a plain one. */
	public function set_up() {
		parent::set_up();
		$this->repo = new Campaign_Repository();

		for ( $i = 1; $i <= 3; $i++ ) {
			$product = new \WC_Product_Simple();
			$product->set_name( 'Cookie ' . $i );
			$product->set_regular_price( '10.00' );
			$product->set_status( 'publish' );
			$this->products[ $i ] = $product;
		}
		$this->products[2]->set_sale_price( '8.00' );
		$this->products[3]->set_manage_stock( true );
		$this->products[3]->set_stock_quantity( 0 );
		$this->products[3]->set_stock_status( 'outofstock' );
		foreach ( $this->products as $product ) {
			$product->save();
		}

		$campaign = $this->repo->create_from_template( 'blank', 'Test <b>box</b>' );
		$this->repo->save(
			$campaign['id'],
			array(
				'tiers'    => array(
					array(
						'qty'           => 2,
						'discount_type' => 'percent',
						'value'         => 10,
					),
				),
				'products' => array(
					'ids' => array(
						$this->products[1]->get_id(),
						$this->products[2]->get_id(),
						$this->products[3]->get_id(),
					),
				),
			)
		);
		$this->campaign = $this->repo->publish( $campaign['id'] );
	}

	/** A live campaign renders the mount point and queues the assets. */
	public function test_shortcode_renders_mount_point() {
		$html = do_shortcode( '[mmbb_box id="' . $this->campaign['id'] . '"]' );
		$this->assertStringContainsString( 'class="mmbb-root mmbb-builder"', $html );
		$this->assertStringContainsString( 'data-mmbb-id="mmbb-', $html );
		$this->assertStringNotContainsString( '<b>box</b>', $html, 'The title is escaped.' );
		$this->assertTrue( wp_script_is( Storefront::HANDLE, 'enqueued' ) );
		$this->assertTrue( wp_style_is( Storefront::HANDLE, 'enqueued' ) );
	}

	/** Two builders on one page get two instances and two payloads. */
	public function test_two_builders_get_distinct_instances() {
		$one = do_shortcode( '[mmbb_box id="' . $this->campaign['id'] . '"]' );
		$two = do_shortcode( '[mmbb_box id="' . $this->campaign['id'] . '" layout="bar" columns="3" hero="false"]' );
		preg_match( '/data-mmbb-id="([^"]+)"/', $one, $a );
		preg_match( '/data-mmbb-id="([^"]+)"/', $two, $b );
		$this->assertNotSame( $a[1], $b[1] );

		$inline = implode( '', (array) wp_scripts()->get_data( Storefront::HANDLE, 'before' ) );
		$this->assertStringContainsString( '"' . $a[1] . '"', $inline );
		$this->assertStringContainsString( '"' . $b[1] . '"', $inline );
	}

	/** Shoppers see nothing for a campaign that is not live; managers get a note. */
	public function test_unpublished_campaign() {
		$this->repo->unpublish( $this->campaign['id'] );
		wp_set_current_user( 0 );
		$this->assertSame( '', do_shortcode( '[mmbb_box id="' . $this->campaign['id'] . '"]' ) );

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		$html = do_shortcode( '[mmbb_box id="' . $this->campaign['id'] . '"]' );
		$this->assertStringContainsString( 'mmbb-builder-notice', $html );
		$this->assertStringContainsString( 'action=edit', $html );
	}

	/** The payload resolves products, hides stock counts above the threshold and marks sold out. */
	public function test_payload_products() {
		$payload  = Payload::build( $this->repo->find( $this->campaign['id'] ) );
		$products = array();
		foreach ( $payload['products'] as $row ) {
			$products[ $row['name'] ] = $row;
		}

		$this->assertCount( 3, $products );
		$this->assertSame( 1000, $products['Cookie 1']['price'] );
		$this->assertNull( $products['Cookie 1']['stock'] );
		$this->assertSame( 800, $products['Cookie 2']['price'] );
		$this->assertSame( 1000, $products['Cookie 2']['compare_at'] );
		$this->assertSame( '-20%', $products['Cookie 2']['badge'] );
		$this->assertSame( 0, $products['Cookie 3']['stock'] );
		$this->assertArrayHasKey( 'cart', $payload );
		$this->assertArrayNotHasKey( 'price_html', $products['Cookie 1'] );
	}

	/** The preview payload carries no cart nonce. */
	public function test_preview_payload_has_no_cart() {
		$payload = Payload::build( $this->repo->find( $this->campaign['id'] ), array( 'preview' => true ) );
		$this->assertArrayNotHasKey( 'cart', $payload );
		$this->assertTrue( $payload['preview'] );
	}

	/** Saving a product busts the cached list. */
	public function test_product_save_busts_the_cache() {
		$campaign = $this->repo->find( $this->campaign['id'] );
		Payload::products( $campaign, Settings::all() );
		$this->products[1]->set_name( 'Renamed' );
		$this->products[1]->save();

		$names = wp_list_pluck( Payload::products( $campaign, Settings::all() ), 'name' );
		$this->assertContains( 'Renamed', $names );
	}

	/** The block renders through the same path. */
	public function test_block_renders() {
		$html = do_blocks( '<!-- wp:mmbb/box-builder {"campaignId":' . $this->campaign['id'] . '} /-->' );
		$this->assertStringContainsString( 'mmbb-builder', $html );
		$this->assertTrue( wp_script_is( Storefront::HANDLE, 'enqueued' ) );
	}

	/** A page with no builder loads nothing, unless the merchant turned the option off. */
	public function test_assets_only_on_builder() {
		wp_dequeue_script( Storefront::HANDLE );
		wp_dequeue_style( Storefront::HANDLE );
		Settings::update( array( 'assets_only_on_builder' => true ) );
		( new Storefront() )->maybe_enqueue_everywhere();
		$this->assertFalse( wp_script_is( Storefront::HANDLE, 'enqueued' ) );

		Settings::update( array( 'assets_only_on_builder' => false ) );
		( new Storefront() )->maybe_enqueue_everywhere();
		$this->assertTrue( wp_script_is( Storefront::HANDLE, 'enqueued' ) );
	}

	/** Only a box from the same campaign preloads from `?mmbb_edit=`. */
	public function test_edit_preload_needs_a_matching_box() {
		$campaign          = $this->repo->find( $this->campaign['id'] );
		$_GET['mmbb_edit'] = 'nope';
		$this->assertNull( Payload::edit_box( $campaign ) );
		unset( $_GET['mmbb_edit'] );
	}
}
