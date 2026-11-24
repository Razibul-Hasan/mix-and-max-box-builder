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
use MixMax\BoxBuilder\Storefront\Preview;
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
		update_option( Settings::OPTION, Settings::defaults() );
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
		$this->assertStringContainsString( 'class="mmbb-root mmbb-builder mmbb-box-', $html );
		$this->assertStringContainsString( 'data-mmbb-id="mmbb-', $html );
		$this->assertStringContainsString( 'data-template="spotlight"', $html );
		$this->assertStringNotContainsString( '<b>box</b>', $html, 'The title is escaped.' );
		$this->assertTrue( wp_script_is( Storefront::HANDLE, 'enqueued' ) );
		$this->assertTrue( wp_style_is( Storefront::HANDLE, 'enqueued' ) );
		$inline = implode( '', (array) wp_styles()->get_data( Storefront::HANDLE, 'after' ) );
		$this->assertStringContainsString( '--mmbb-accent:#ff4f1f', $inline );
		$this->assertStringContainsString( '--mmbb-font-heading:', $inline );
	}

	/** A placement may override only the template; old markup still uses the saved template. */
	public function test_template_attribute_overrides_shortcode_and_block() {
		$id = $this->campaign['id'];

		$shortcode = do_shortcode( '[mmbb_box id="' . $id . '" template="night"]' );
		$this->assertStringContainsString( 'data-template="night"', $shortcode );

		$block = do_blocks( '<!-- wp:mmbb/box-builder {"campaignId":' . $id . ',"template":"compact"} /-->' );
		$this->assertStringContainsString( 'data-template="compact"', $block );

		$invalid = do_shortcode( '[mmbb_box id="' . $id . '" template="unknown"]' );
		$this->assertStringContainsString( 'data-template="spotlight"', $invalid );
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

	/** A template gets only its local font declarations and never a remote URL. */
	public function test_template_fonts_are_local_and_demand_loaded() {
		$config                       = $this->campaign['config'];
		$config['design']['template'] = 'clean';
		$config['design']['typography']['heading_font'] = '';
		$config['design']['typography']['body_font']    = '';
		$this->repo->save( $this->campaign['id'], $config );
		do_shortcode( '[mmbb_box id="' . $this->campaign['id'] . '"]' );
		$inline = implode( '', (array) wp_styles()->get_data( Storefront::HANDLE, 'after' ) );
		$this->assertStringContainsString( '@font-face', $inline );
		$this->assertStringContainsString( 'inter-tight-latin-wght-normal.woff2', $inline );
		$this->assertStringNotContainsString( 'fonts.googleapis.com', $inline );
		$this->assertStringNotContainsString( 'fonts.gstatic.com', $inline );
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

	/** The master switch hides builders and prevents eager asset loading. */
	public function test_disabled_setting_hides_every_builder() {
		Settings::update( array( 'enabled' => false ) );
		wp_dequeue_script( Storefront::HANDLE );
		wp_dequeue_style( Storefront::HANDLE );
		wp_set_current_user( 0 );
		$this->assertSame( '', do_shortcode( '[mmbb_box id="' . $this->campaign['id'] . '"]' ) );

		Settings::update( array( 'assets_only_on_builder' => false ) );
		( new Storefront() )->maybe_enqueue_everywhere();
		$this->assertFalse( wp_script_is( Storefront::HANDLE, 'enqueued' ) );

		$user = self::factory()->user->create( array( 'role' => 'administrator' ) );
		get_user_by( 'id', $user )->add_cap( 'manage_woocommerce' );
		wp_set_current_user( $user );
		$this->assertStringContainsString( 'Box builders are disabled', do_shortcode( '[mmbb_box id="' . $this->campaign['id'] . '"]' ) );
	}

	/**
	 * Sign in a store manager.
	 *
	 * @return int User id.
	 */
	private function sign_in_manager() {
		$user = self::factory()->user->create( array( 'role' => 'administrator' ) );
		get_user_by( 'id', $user )->add_cap( 'manage_woocommerce' );
		wp_set_current_user( $user );
		return $user;
	}

	/** In a page builder's editor a manager gets a placeholder with a preview frame, and no assets load. */
	public function test_page_builder_gets_a_placeholder() {
		wp_dequeue_script( Storefront::HANDLE );
		wp_dequeue_style( Storefront::HANDLE );
		$this->sign_in_manager();
		add_filter( 'mmbb_is_page_builder_request', '__return_true' );
		$html = do_shortcode( '[mmbb_box id="' . $this->campaign['id'] . '"]' );
		Settings::update( array( 'assets_only_on_builder' => false ) );
		( new Storefront() )->maybe_enqueue_everywhere();
		remove_filter( 'mmbb_is_page_builder_request', '__return_true' );

		$this->assertStringContainsString( 'class="mmbb-builder-placeholder"', $html );
		$this->assertStringContainsString( 'data-campaign="' . $this->campaign['id'] . '"', $html );
		$this->assertStringContainsString( '<h2 class="mmbb-builder-placeholder__title"', $html );
		$this->assertStringNotContainsString( '<b>box</b>', $html, 'The title is escaped.' );
		$this->assertStringNotContainsString( 'data-mmbb-id', $html, 'The storefront script never mounts it.' );
		$this->assertMatchesRegularExpression( '/<iframe class="mmbb-builder-placeholder__frame" src="[^"]*mmbb_preview=' . $this->campaign['id'] . '[^"]*" title="[^"]*" loading="lazy" style="[^"]*height:600px/', $html );
		$this->assertStringContainsString( Preview::BARE_ARG . '=1', $html );
		$this->assertMatchesRegularExpression( '/<a href="[^"]*page=mmbb-campaigns[^"]*action=edit[^"]*id=' . $this->campaign['id'] . '" target="_blank" rel="noopener">Edit box<\/a>/', $html );

		$this->assertFalse( wp_script_is( Storefront::HANDLE, 'enqueued' ), 'Neither the shortcode nor "load everywhere" loads the script.' );
		$this->assertFalse( wp_style_is( Storefront::HANDLE, 'enqueued' ) );
	}

	/** Someone who may edit pages but not manage the store gets the placeholder alone. */
	public function test_page_builder_placeholder_without_store_access() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );
		add_filter( 'mmbb_is_page_builder_request', '__return_true' );
		$html = do_shortcode( '[mmbb_box id="' . $this->campaign['id'] . '"]' );
		remove_filter( 'mmbb_is_page_builder_request', '__return_true' );

		$this->assertStringContainsString( 'mmbb-builder-placeholder__title', $html );
		$this->assertStringContainsString( 'mmbb-builder-placeholder__label', $html );
		$this->assertStringNotContainsString( '<iframe', $html );
		$this->assertStringNotContainsString( 'Edit box', $html );
	}

	/** The box-only preview address opens the preview template even when a page holds the box. */
	public function test_bare_preview_uses_the_box_only_template() {
		$this->sign_in_manager();
		$campaign = $this->repo->find( $this->campaign['id'] );
		$this->assertStringNotContainsString( Preview::BARE_ARG, Preview::url( $campaign ) );

		$_GET[ Preview::BARE_ARG ] = '1';
		Preview::start( $campaign['id'] );
		$this->assertSame( MMBB_PATH . 'includes/storefront/preview-template.php', apply_filters( 'template_include', 'page.php' ) );
		unset( $_GET[ Preview::BARE_ARG ] );
		Preview::reset();
		remove_filter( 'template_include', array( Preview::class, 'template' ), 99 );
		remove_action( 'wp_enqueue_scripts', array( Preview::class, 'enqueue' ) );
		remove_filter( 'wp_robots', 'wp_robots_no_robots' );
	}

	/** Managers learn how many products are hidden for having no price; shoppers see nothing. */
	public function test_no_price_notice() {
		$id = $this->campaign['id'];
		$this->sign_in_manager();
		$this->assertStringNotContainsString( 'no price', do_shortcode( '[mmbb_box id="' . $id . '"]' ), 'No notice while every product has a price.' );

		$ids = array( $this->products[1]->get_id(), $this->products[2]->get_id(), $this->products[3]->get_id() );
		for ( $i = 1; $i <= 2; $i++ ) {
			$product = new \WC_Product_Simple();
			$product->set_name( 'Unpriced ' . $i );
			$product->set_regular_price( '' );
			$product->set_status( 'publish' );
			$product->save();
			$ids[] = $product->get_id();
			if ( 1 === $i ) {
				$this->repo->save( $id, array( 'products' => array( 'ids' => $ids ) ) );
				$html = do_shortcode( '[mmbb_box id="' . $id . '"]' );
				$this->assertStringContainsString( '1 product is hidden because it has no price.', $html );
			}
		}
		$this->repo->save( $id, array( 'products' => array( 'ids' => $ids ) ) );

		$html = do_shortcode( '[mmbb_box id="' . $id . '"]' );
		$this->assertStringContainsString( '<p class="mmbb-builder-notice">2 products are hidden because they have no price.', $html );
		$this->assertLessThan( strpos( $html, 'data-mmbb-id' ), strpos( $html, 'mmbb-builder-notice' ), 'The notice sits above the box.' );
		$this->assertCount( 3, Payload::build( $this->repo->find( $id ) )['products'], 'The products themselves stay out of the box.' );

		wp_set_current_user( 0 );
		$html = do_shortcode( '[mmbb_box id="' . $id . '"]' );
		$this->assertStringNotContainsString( 'mmbb-builder-notice', $html );
		$this->assertStringContainsString( 'data-mmbb-id', $html );
	}

	/** Only a box from the same campaign preloads from `?mmbb_edit=`. */
	public function test_edit_preload_needs_a_matching_box() {
		$campaign                = $this->repo->find( $this->campaign['id'] );
		$_GET['mmbb_edit']       = 'nope';
		$_GET['mmbb_edit_nonce'] = wp_create_nonce( 'mmbb_edit_box' );
		$this->assertNull( Payload::edit_box( $campaign ) );
		unset( $_GET['mmbb_edit'], $_GET['mmbb_edit_nonce'] );
	}

	/** `?mmbb_edit=` is ignored without a valid nonce. */
	public function test_edit_preload_needs_a_nonce() {
		$campaign                = $this->repo->find( $this->campaign['id'] );
		$_GET['mmbb_edit']       = 'abc';
		$_GET['mmbb_edit_nonce'] = 'bad';
		$this->assertNull( Payload::edit_box( $campaign ) );
		unset( $_GET['mmbb_edit_nonce'] );
		$this->assertNull( Payload::edit_box( $campaign ) );
		unset( $_GET['mmbb_edit'] );
	}
}
