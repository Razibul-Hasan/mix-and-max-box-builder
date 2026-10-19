<?php
/**
 * Catalog REST routes: products, terms and pages.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Rest\Pages_Controller;
use MixMax\BoxBuilder\Rest\Products_Controller;
use MixMax\BoxBuilder\Rest\Terms_Controller;

/** The catalog routes are manager-only, validate input and match their schemas. */
class RestCatalogTest extends \WP_UnitTestCase {
	/** Create a REST server and sign in as a store manager. */
	public function set_up() {
		parent::set_up();
		global $wp_rest_server;
		$wp_rest_server = null;
		rest_get_server();
		$this->sign_in_manager();
	}

	/** Sign in as an administrator with the WooCommerce capability. */
	private function sign_in_manager() {
		$id = self::factory()->user->create( array( 'role' => 'administrator' ) );
		get_user_by( 'id', $id )->add_cap( 'manage_woocommerce' );
		wp_set_current_user( $id );
	}

	/**
	 * Dispatch a GET request.
	 *
	 * @param string $route  Route.
	 * @param array  $params Query params.
	 * @return \WP_REST_Response
	 */
	private function get( $route, array $params = array() ) {
		$request = new \WP_REST_Request( 'GET', $route );
		$request->set_query_params( $params );
		return rest_get_server()->dispatch( $request );
	}

	/**
	 * Create a published simple product.
	 *
	 * @param string $name  Name.
	 * @param string $price Regular price.
	 * @return \WC_Product_Simple
	 */
	private function make_simple( $name, $price = '4.50' ) {
		$product = new \WC_Product_Simple();
		$product->set_name( $name );
		$product->set_regular_price( $price );
		$product->set_status( 'publish' );
		$product->save();
		return $product;
	}

	/** Every route rejects logged-out and non-manager requests. */
	public function test_permissions() {
		foreach ( array( '/mmbb/v1/products', '/mmbb/v1/terms', '/mmbb/v1/pages' ) as $route ) {
			wp_set_current_user( 0 );
			$this->assertSame( 401, $this->get( $route )->get_status(), $route );

			wp_set_current_user( self::factory()->user->create( array( 'role' => 'subscriber' ) ) );
			$this->assertSame( 403, $this->get( $route )->get_status(), $route );
		}
	}

	/** Bad arguments are rejected with 400. */
	public function test_invalid_args() {
		$this->assertSame( 400, $this->get( '/mmbb/v1/products', array( 'per_page' => 500 ) )->get_status() );
		$this->assertSame( 400, $this->get( '/mmbb/v1/products', array( 'include' => array( 'abc' ) ) )->get_status() );
		$this->assertSame( 400, $this->get( '/mmbb/v1/products', array( 'category' => 999999 ) )->get_status() );
		$this->assertSame( 400, $this->get( '/mmbb/v1/terms', array( 'taxonomy' => 'nope' ) )->get_status() );
		$this->assertSame( 400, $this->get( '/mmbb/v1/terms', array( 'per_page' => 500 ) )->get_status() );
		$this->assertSame( 400, $this->get( '/mmbb/v1/pages', array( 'per_page' => 500 ) )->get_status() );
		$this->assertSame( 400, $this->get( '/mmbb/v1/pages', array( 'page' => 0 ) )->get_status() );
	}

	/** Simple products and variations are listed; variable parents and external products are not. */
	public function test_products_happy_path() {
		$simple = $this->make_simple( 'Plain bar' );

		$variable = new \WC_Product_Variable();
		$variable->set_name( 'Variable bar' );
		$variable->set_status( 'publish' );
		$variable->save();

		$variation = new \WC_Product_Variation();
		$variation->set_parent_id( $variable->get_id() );
		$variation->set_regular_price( '6.00' );
		$variation->set_status( 'publish' );
		$variation->save();

		$external = new \WC_Product_External();
		$external->set_name( 'External bar' );
		$external->set_regular_price( '3.00' );
		$external->set_status( 'publish' );
		$external->save();

		$response = $this->get( '/mmbb/v1/products', array( 'per_page' => 50 ) );
		$this->assertSame( 200, $response->get_status() );

		$by_id = array();
		foreach ( $response->get_data() as $item ) {
			$by_id[ $item['id'] ] = $item;
		}
		$this->assertArrayHasKey( $simple->get_id(), $by_id );
		$this->assertArrayHasKey( $variation->get_id(), $by_id );
		$this->assertArrayNotHasKey( $variable->get_id(), $by_id );
		$this->assertArrayNotHasKey( $external->get_id(), $by_id );

		$this->assertSame( 'simple', $by_id[ $simple->get_id() ]['type'] );
		$this->assertSame( 0, $by_id[ $simple->get_id() ]['parent'] );
		$this->assertSame( 'variation', $by_id[ $variation->get_id() ]['type'] );
		$this->assertSame( $variable->get_id(), $by_id[ $variation->get_id() ]['parent'] );
		if ( 2 === wc_get_price_decimals() ) {
			$this->assertSame( 450, $by_id[ $simple->get_id() ]['price'] );
			$this->assertSame( 450, $by_id[ $simple->get_id() ]['regular_price'] );
			$this->assertSame( 600, $by_id[ $variation->get_id() ]['price'] );
		}

		$headers = $response->get_headers();
		$this->assertSame( (string) count( $by_id ), $headers['X-WP-Total'] );
		$this->assertSame( '1', $headers['X-WP-TotalPages'] );
	}

	/** The include filter narrows the list and the category filter resolves term IDs. */
	public function test_products_filters() {
		$one = $this->make_simple( 'First bar' );
		$two = $this->make_simple( 'Second bar' );

		$response = $this->get( '/mmbb/v1/products', array( 'include' => array( $two->get_id() ) ) );
		$this->assertSame( 200, $response->get_status() );
		$ids = wp_list_pluck( $response->get_data(), 'id' );
		$this->assertSame( array( $two->get_id() ), $ids );

		$term = wp_insert_term( 'Filter cat', 'product_cat' );
		$one->set_category_ids( array( $term['term_id'] ) );
		$one->save();

		$response = $this->get( '/mmbb/v1/products', array( 'category' => $term['term_id'] ) );
		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( array( $one->get_id() ), wp_list_pluck( $response->get_data(), 'id' ) );
		$this->assertSame( array( 'Filter cat' ), $response->get_data()[0]['categories'] );
	}

	/** Product items carry exactly the keys the schema documents. */
	public function test_products_match_schema() {
		$this->make_simple( 'Schema bar' );
		$data = $this->get( '/mmbb/v1/products' )->get_data();
		$this->assertNotEmpty( $data );

		$controller = new Products_Controller();
		$schema     = $controller->get_item_schema();
		$this->assertEqualSets( array_keys( $schema['properties'] ), array_keys( $data[0] ) );
	}

	/** Terms are listed with the right taxonomy and match their schema. */
	public function test_terms_happy_path() {
		$cat = wp_insert_term( 'Chocolate & nuts', 'product_cat' );
		$tag = wp_insert_term( 'Gift', 'product_tag' );

		$response = $this->get( '/mmbb/v1/terms' );
		$this->assertSame( 200, $response->get_status() );
		$data = $response->get_data();
		$this->assertContains( $cat['term_id'], wp_list_pluck( $data, 'id' ) );
		$this->assertNotContains( $tag['term_id'], wp_list_pluck( $data, 'id' ) );
		$this->assertContains( 'Chocolate & nuts', wp_list_pluck( $data, 'name' ) );
		$this->assertArrayHasKey( 'X-WP-Total', $response->get_headers() );

		$tags = $this->get( '/mmbb/v1/terms', array( 'taxonomy' => 'product_tag' ) )->get_data();
		$this->assertSame( array( $tag['term_id'] ), wp_list_pluck( $tags, 'id' ) );
		$this->assertSame( 'product_tag', $tags[0]['taxonomy'] );

		$controller = new Terms_Controller();
		$schema     = $controller->get_item_schema();
		$this->assertEqualSets( array_keys( $schema['properties'] ), array_keys( $tags[0] ) );
	}

	/** Pages report whether they hold a builder block or shortcode. */
	public function test_pages_happy_path() {
		$block     = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => 'Block page',
				'post_content' => '<!-- wp:mmbb/box-builder {"campaignId":1} /-->',
			)
		);
		$shortcode = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => 'Shortcode page',
				'post_content' => '[mmbb_box id="1"]',
			)
		);
		$plain     = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_status'  => 'draft',
				'post_title'   => 'Plain page',
				'post_content' => 'Hello',
			)
		);

		$response = $this->get( '/mmbb/v1/pages', array( 'per_page' => 100 ) );
		$this->assertSame( 200, $response->get_status() );

		$by_id = array();
		foreach ( $response->get_data() as $item ) {
			$by_id[ $item['id'] ] = $item;
		}
		$this->assertTrue( $by_id[ $block ]['has_builder'] );
		$this->assertTrue( $by_id[ $shortcode ]['has_builder'] );
		$this->assertFalse( $by_id[ $plain ]['has_builder'] );
		$this->assertSame( 'draft', $by_id[ $plain ]['status'] );
		$this->assertNotSame( '', $by_id[ $plain ]['edit_link'] );
		$this->assertArrayHasKey( 'X-WP-Total', $response->get_headers() );

		$controller = new Pages_Controller();
		$schema     = $controller->get_item_schema();
		$this->assertEqualSets( array_keys( $schema['properties'] ), array_keys( $by_id[ $plain ] ) );
	}
}
