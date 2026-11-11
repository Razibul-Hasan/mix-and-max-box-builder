<?php
/**
 * The editor's live preview on the storefront.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Admin\Menu;
use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Page_Content;
use MixMax\BoxBuilder\Settings\Settings;
use MixMax\BoxBuilder\Storefront\Preview;
use MixMax\BoxBuilder\Storefront\Renderer;

/** Nonce and capability checks, preview mode and where the box shows. */
class PreviewTest extends \WP_UnitTestCase {
	/**
	 * Campaign storage.
	 *
	 * @var Campaign_Repository
	 */
	private $repo;

	/**
	 * A draft box (never published).
	 *
	 * @var int
	 */
	private $box;

	/** A draft box and a store manager. */
	public function set_up() {
		parent::set_up();
		update_option( Settings::OPTION, Settings::defaults() );
		$this->repo = new Campaign_Repository();
		$this->box  = $this->repo->create_from_template( 'holiday' )['id'];
		$this->sign_in( 'administrator' );
		Preview::reset();
	}

	/** Leave no request state behind. */
	public function tear_down() {
		unset( $_GET[ Preview::QUERY_ARG ], $_GET[ Preview::NONCE_ARG ] );
		Preview::reset();
		remove_filter( 'the_content', array( Preview::class, 'prepend' ), 20 );
		remove_action( 'wp_footer', array( Preview::class, 'print_fallback' ), 5 );
		remove_filter( 'wp_robots', 'wp_robots_no_robots' );
		parent::tear_down();
	}

	/**
	 * Sign in a user with a role, adding the store capability to administrators.
	 *
	 * @param string $role Role.
	 * @return int User id.
	 */
	private function sign_in( $role ) {
		$id = self::factory()->user->create( array( 'role' => $role ) );
		if ( 'administrator' === $role ) {
			get_user_by( 'id', $id )->add_cap( 'manage_woocommerce' );
		}
		wp_set_current_user( $id );
		return $id;
	}

	/**
	 * Put the preview args from a URL into the request.
	 *
	 * @param string $url Preview URL.
	 */
	private function request( $url ) {
		$args = array();
		wp_parse_str( (string) wp_parse_url( $url, PHP_URL_QUERY ), $args );
		foreach ( $args as $key => $value ) {
			$_GET[ $key ] = $value;
		}
	}

	/** A store manager's own preview link is accepted. */
	public function test_valid_request() {
		$this->request( Preview::url( $this->repo->find( $this->box ) ) );
		$this->assertSame( $this->box, Preview::requested_id() );
	}

	/** Logged out, the same link is an ordinary page. */
	public function test_logged_out_is_ignored() {
		$this->request( Preview::url( $this->repo->find( $this->box ) ) );
		wp_set_current_user( 0 );
		$this->assertSame( 0, Preview::requested_id() );
	}

	/** A user without the store capability gets nothing, even with their own nonce. */
	public function test_without_capability_is_ignored() {
		$this->sign_in( 'subscriber' );
		$this->request( Preview::url( $this->repo->find( $this->box ) ) );
		$this->assertSame( 0, Preview::requested_id() );
	}

	/** A wrong, missing or other box's nonce is ignored. */
	public function test_bad_nonce_is_ignored() {
		$_GET[ Preview::QUERY_ARG ] = (string) $this->box;
		$this->assertSame( 0, Preview::requested_id() );

		$_GET[ Preview::NONCE_ARG ] = 'nonsense';
		$this->assertSame( 0, Preview::requested_id() );

		$_GET[ Preview::NONCE_ARG ] = wp_create_nonce( Preview::nonce_action( $this->box + 1 ) );
		$this->assertSame( 0, Preview::requested_id() );
	}

	/** The template_redirect hook starts preview mode only for a verified request. */
	public function test_maybe_start() {
		( new Preview() )->maybe_start();
		$this->assertSame( 0, Preview::box_id() );

		$this->request( Preview::url( $this->repo->find( $this->box ) ) );
		( new Preview() )->maybe_start();
		$this->assertSame( $this->box, Preview::box_id() );
		$this->assertFalse( is_admin_bar_showing() );
		$this->assertNotFalse( has_filter( 'wp_robots', 'wp_robots_no_robots' ) );
	}

	/** A draft box renders in its own preview with checkout off, and nowhere else. */
	public function test_renderer_shows_draft_only_in_preview() {
		$this->assertStringContainsString( 'mmbb-builder-notice', Renderer::render( $this->box ) );

		Preview::start( $this->box );
		$html = Renderer::render( $this->box );
		$this->assertStringContainsString( 'data-mmbb-preview="1"', $html );
		$this->assertStringNotContainsString( 'mmbb-builder-notice', $html );

		// The script queue lives for the whole run; this builder's payload is the last one added.
		$data = (array) wp_scripts()->get_data( 'mmbb-storefront', 'before' );
		$last = (string) end( $data );
		$this->assertStringContainsString( '"preview":true', $last );
		$this->assertStringNotContainsString( '"cart":', $last );
	}

	/** On a page without the box, it goes at the top of the main content, once. */
	public function test_prepends_box_once() {
		$page = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => 'Hello',
			)
		);
		$this->go_to( get_permalink( $page ) );
		Preview::start( $this->box );
		$GLOBALS['wp_query']->in_the_loop = true;

		$first = apply_filters( 'the_content', 'Hello' );
		$this->assertStringContainsString( 'data-campaign="' . $this->box . '"', $first );
		$this->assertLessThan( strpos( $first, 'Hello' ), strpos( $first, 'mmbb-builder' ) );
		$this->assertStringNotContainsString( 'mmbb-builder', apply_filters( 'the_content', 'Again' ) );
	}

	/** A page that already holds the box is left as it is. */
	public function test_page_with_box_is_not_changed() {
		$page = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => Page_Content::shortcode( $this->box ),
			)
		);
		$this->go_to( get_permalink( $page ) );
		Preview::start( $this->box );
		$this->assertFalse( has_filter( 'the_content', array( Preview::class, 'prepend' ) ) );
	}

	/** The preview script learns its box and the admin origin. */
	public function test_preview_global() {
		Preview::start( $this->box );
		Preview::enqueue();
		$data = implode( "\n", (array) wp_scripts()->get_data( 'mmbb-storefront', 'before' ) );
		$this->assertStringContainsString( 'window.mmbbPreview = {"boxId":' . $this->box, $data );
		$admin = wp_parse_url( admin_url() );
		$this->assertStringContainsString( '"origin":"' . $admin['scheme'] . '://' . $admin['host'], str_replace( '\\/', '/', $data ) );
	}

	/** Only the box editor screen goes full screen. */
	public function test_editor_body_class() {
		( new Menu() )->add_menu();
		$boxes = get_plugin_page_hookname( 'mmbb-campaigns', 'mmbb' );
		$this->assertSame( 'campaigns', Menu::page_for_hook( $boxes ) );

		$this->assertFalse( Menu::is_editor( $boxes ) );
		$_GET['action'] = 'edit';
		$_GET['id']     = '12';
		$this->assertTrue( Menu::is_editor( $boxes ) );
		$this->assertFalse( Menu::is_editor( 'toplevel_page_mmbb' ) );
		$_GET['id'] = '0';
		$this->assertFalse( Menu::is_editor( $boxes ) );
		unset( $_GET['action'], $_GET['id'] );
	}
}
