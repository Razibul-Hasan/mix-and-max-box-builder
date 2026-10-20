<?php
/**
 * Going live through the REST route: pages, block and shortcode placement, refusals.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Page_Content;

/** Publish creates or edits a page with only our own markup, and refuses a bad config. */
class PublisherTest extends \WP_UnitTestCase {
	/**
	 * Campaign storage.
	 *
	 * @var Campaign_Repository
	 */
	private $repo;

	/** Create a REST server and sign in as an administrator who can manage the store. */
	public function set_up() {
		parent::set_up();
		global $wp_rest_server;
		$wp_rest_server = null;
		rest_get_server();
		$this->repo = new Campaign_Repository();

		$id = self::factory()->user->create( array( 'role' => 'administrator' ) );
		get_user_by( 'id', $id )->add_cap( 'manage_woocommerce' );
		wp_set_current_user( $id );
	}

	/** Remove the filter a test added. */
	public function tear_down() {
		remove_all_filters( 'mmbb_ensure_container_product' );
		parent::tear_down();
	}

	/**
	 * Create a campaign that passes validation.
	 *
	 * @return int
	 */
	private function valid_campaign() {
		$product = new \WC_Product_Simple();
		$product->set_name( 'Cookie' );
		$product->set_regular_price( '4.50' );
		$product->set_status( 'publish' );
		$product_id = $product->save();

		$campaign = $this->repo->create_from_template( 'holiday' );
		$this->repo->save( $campaign['id'], array( 'products' => array( 'ids' => array( $product_id ) ) ) );
		return $campaign['id'];
	}

	/**
	 * Send a publish request.
	 *
	 * @param int   $id   Campaign id.
	 * @param array $body Request body.
	 * @return \WP_REST_Response
	 */
	private function publish( $id, array $body ) {
		$request = new \WP_REST_Request( 'POST', '/mmbb/v1/campaigns/' . $id . '/publish' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( wp_json_encode( $body ) );
		return rest_get_server()->dispatch( $request );
	}

	/** A new page holds only the block, with the title and slug given. */
	public function test_new_page() {
		$id       = $this->valid_campaign();
		$response = $this->publish(
			$id,
			array(
				'placement'  => 'new_page',
				'page_title' => 'Holiday <b>box</b>',
				'page_slug'  => 'Holiday Box',
			)
		);

		$this->assertSame( 200, $response->get_status() );
		$data = $response->get_data();
		$this->assertSame( 'publish', $data['post_status'] );
		$this->assertSame( 'block', $data['placement']['method'] );

		$page = get_post( $data['placement']['page_id'] );
		$this->assertSame( 'page', $page->post_type );
		$this->assertSame( 'publish', $page->post_status );
		$this->assertSame( 'Holiday box', $page->post_title );
		$this->assertSame( 'holiday-box', $page->post_name );
		$this->assertSame( Page_Content::block( $id ), $page->post_content );
	}

	/** A page that already uses blocks gets the block first and keeps its content. */
	public function test_existing_block_page() {
		$id      = $this->valid_campaign();
		$content = '<!-- wp:paragraph --><p>Shop our range.</p><!-- /wp:paragraph -->';
		$page_id = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => $content,
			)
		);

		$response = $this->publish(
			$id,
			array(
				'placement' => 'existing_page',
				'page_id'   => $page_id,
			)
		);
		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( Page_Content::block( $id ) . "\n\n" . $content, get_post( $page_id )->post_content );
		$this->assertSame( $page_id, $response->get_data()['placement']['page_id'] );

		// Going live twice does not add a second block.
		$this->publish(
			$id,
			array(
				'placement' => 'existing_page',
				'page_id'   => $page_id,
			)
		);
		$this->assertSame( 1, substr_count( get_post( $page_id )->post_content, 'wp:mmbb/box-builder' ) );
	}

	/** A classic page gets the shortcode first. */
	public function test_existing_classic_page() {
		$id      = $this->valid_campaign();
		$page_id = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => 'Plain classic content.',
			)
		);

		$response = $this->publish(
			$id,
			array(
				'placement' => 'existing_page',
				'page_id'   => $page_id,
			)
		);
		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( Page_Content::shortcode( $id ) . "\n\nPlain classic content.", get_post( $page_id )->post_content );
		$this->assertSame( 'shortcode', $response->get_data()['placement']['method'] );
	}

	/** An invalid config is refused, and no page is made. */
	public function test_invalid_config_is_refused() {
		$campaign = $this->repo->create_from_template( 'holiday' );
		$before   = wp_count_posts( 'page' )->publish;

		$response = $this->publish(
			$campaign['id'],
			array(
				'placement'  => 'new_page',
				'page_title' => 'Nope',
			)
		);
		$this->assertSame( 422, $response->get_status() );
		$this->assertSame( 'mmbb_invalid_config', $response->get_data()['code'] );
		$this->assertSame( $before, wp_count_posts( 'page' )->publish );
		$this->assertSame( 'draft', $this->repo->find( $campaign['id'] )['post_status'] );
	}

	/** A user who cannot publish pages cannot create one. */
	public function test_new_page_needs_publish_pages() {
		$id   = $this->valid_campaign();
		$user = self::factory()->user->create( array( 'role' => 'contributor' ) );
		get_user_by( 'id', $user )->add_cap( 'manage_woocommerce' );
		wp_set_current_user( $user );

		$response = $this->publish(
			$id,
			array(
				'placement'  => 'new_page',
				'page_title' => 'Blocked',
			)
		);
		$this->assertSame( 403, $response->get_status() );
		$this->assertSame( 'draft', $this->repo->find( $id )['post_status'] );
	}

	/** The container service runs on publish, and its error stops the publish. */
	public function test_container_service() {
		$id = $this->valid_campaign();

		add_filter(
			'mmbb_ensure_container_product',
			static function () {
				return new \WP_Error( 'mmbb_container_failed', 'No product.', array( 'status' => 500 ) );
			}
		);
		$response = $this->publish( $id, array( 'placement' => 'none' ) );
		$this->assertSame( 500, $response->get_status() );
		$this->assertSame( 'draft', $this->repo->find( $id )['post_status'] );

		remove_all_filters( 'mmbb_ensure_container_product' );
		$product = new \WC_Product_Simple();
		$product->update_meta_data( '_mmbb_campaign_id', $id );
		$product_id = $product->save();
		add_filter(
			'mmbb_ensure_container_product',
			static function () use ( $product_id ) {
				return $product_id;
			}
		);
		$response = $this->publish( $id, array( 'placement' => 'none' ) );
		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( $product_id, $this->repo->find( $id )['config']['container_product_id'] );
	}
}
