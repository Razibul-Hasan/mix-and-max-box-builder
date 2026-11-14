<?php
/**
 * The editor's live preview: a real storefront page shown in an iframe.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Storefront;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Page_Content;
use MixMax\BoxBuilder\Campaigns\Placement;

defined( 'ABSPATH' ) || exit;

/**
 * Turns a storefront request into a preview of one box when it carries
 * `mmbb_preview=<id>` and a valid nonce, and the visitor may manage the store.
 * Anything else renders the page normally.
 */
final class Preview {
	/** Query arg that names the box to preview. */
	const QUERY_ARG = 'mmbb_preview';

	/** Query arg that carries the nonce. */
	const NONCE_ARG = '_wpnonce';

	/** Capability needed to see a preview. */
	const CAPABILITY = 'manage_woocommerce';

	/**
	 * Id of the box this request previews, 0 when it is not a preview.
	 *
	 * @var int
	 */
	private static $box_id = 0;

	/**
	 * Whether the box was already printed by the preview itself.
	 *
	 * @var bool
	 */
	private static $printed = false;

	/** Register hooks. */
	public function register() {
		// Before _wp_admin_bar_init (priority 0), so the admin bar and its page offset never load.
		add_action( 'template_redirect', array( $this, 'maybe_start' ), -1 );
	}

	/**
	 * Nonce action for one box.
	 *
	 * @param int $box_id Box id.
	 * @return string
	 */
	public static function nonce_action( $box_id ) {
		return 'mmbb_preview_' . absint( $box_id );
	}

	/**
	 * The preview address: the page that shows the box, or the home page. Only the
	 * id and a nonce are added.
	 *
	 * @param array $campaign Campaign from the repository.
	 * @return string
	 */
	public static function url( array $campaign ) {
		$page = Placement::page( $campaign );
		$base = $page && 'publish' === $page->post_status ? get_permalink( $page ) : '';
		if ( ! $base ) {
			$base = home_url( '/' );
		}
		return add_query_arg(
			array(
				self::QUERY_ARG => (int) $campaign['id'],
				self::NONCE_ARG => wp_create_nonce( self::nonce_action( $campaign['id'] ) ),
			),
			$base
		);
	}

	/**
	 * The box id from a verified preview request, or 0.
	 *
	 * @return int
	 */
	public static function requested_id() {
		if ( ! isset( $_GET[ self::QUERY_ARG ], $_GET[ self::NONCE_ARG ] ) ) {
			return 0;
		}
		$id    = absint( wp_unslash( $_GET[ self::QUERY_ARG ] ) );
		$nonce = sanitize_text_field( wp_unslash( $_GET[ self::NONCE_ARG ] ) );
		if ( $id < 1 || ! wp_verify_nonce( $nonce, self::nonce_action( $id ) ) ) {
			return 0;
		}
		if ( ! current_user_can( self::CAPABILITY ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- WooCommerce registers this capability.
			return 0;
		}
		return $id;
	}

	/**
	 * Whether this request previews the given box.
	 *
	 * @param int $box_id Box id.
	 * @return bool
	 */
	public static function is_preview_of( $box_id ) {
		return self::$box_id > 0 && self::$box_id === (int) $box_id;
	}

	/** Id of the box being previewed, 0 outside a preview. */
	public static function box_id() {
		return self::$box_id;
	}

	/** Forget the preview. For tests. */
	public static function reset() {
		self::$box_id  = 0;
		self::$printed = false;
	}

	/** On `template_redirect`: start preview mode when the request is a verified preview. */
	public function maybe_start() {
		$id = self::requested_id();
		if ( ! $id || ! ( new Campaign_Repository() )->find( $id ) ) {
			return;
		}
		self::start( $id );
	}

	/**
	 * Preview mode for one box.
	 *
	 * @param int $box_id Box id, already verified.
	 */
	public static function start( $box_id ) {
		self::$box_id  = (int) $box_id;
		self::$printed = false;

		show_admin_bar( false );
		nocache_headers();
		if ( ! headers_sent() ) {
			header( 'X-Frame-Options: SAMEORIGIN' );
			header( "Content-Security-Policy: frame-ancestors 'self'" );
		}
		add_filter( 'wp_robots', 'wp_robots_no_robots' );
		add_action( 'wp_enqueue_scripts', array( self::class, 'enqueue' ) );

		if ( self::page_holds_box() ) {
			return;
		}
		if ( is_singular() ) {
			// After blocks and shortcodes have run, so the builder's markup is left alone.
			add_filter( 'the_content', array( self::class, 'prepend' ), 20 );
			add_action( 'wp_footer', array( self::class, 'print_fallback' ), 5 );
		} else {
			// The blog, an archive or the home page: show the box alone, not a list of posts.
			add_filter( 'template_include', array( self::class, 'template' ), 99 );
		}
	}

	/**
	 * Swap the theme's template for the box-only preview page.
	 *
	 * @param string $template Template the theme chose.
	 * @return string
	 */
	public static function template( $template ) {
		return self::$box_id > 0 ? MMBB_PATH . 'includes/storefront/preview-template.php' : $template;
	}

	/** The preview template prints the box itself, so the fallbacks stay quiet. */
	public static function mark_printed() {
		self::$printed = true;
	}

	/** Load the storefront script and tell it which box it previews and who may talk to it. */
	public static function enqueue() {
		if ( ! Storefront::enqueue() ) {
			return;
		}
		$admin  = wp_parse_url( admin_url() );
		$origin = isset( $admin['scheme'], $admin['host'] ) ? $admin['scheme'] . '://' . $admin['host'] . ( isset( $admin['port'] ) ? ':' . $admin['port'] : '' ) : '';
		wp_add_inline_script(
			Storefront::HANDLE,
			'window.mmbbPreview = ' . wp_json_encode(
				array(
					'boxId'  => self::$box_id,
					'origin' => $origin,
				)
			) . ';',
			'before'
		);
	}

	/**
	 * Whether the page being shown already places the box.
	 *
	 * @return bool
	 */
	private static function page_holds_box() {
		$post = get_queried_object();
		return $post instanceof \WP_Post && Page_Content::contains( $post->post_content, self::$box_id );
	}

	/**
	 * Put the box at the top of the main content, once.
	 *
	 * @param string $content Post content.
	 * @return string
	 */
	public static function prepend( $content ) {
		// Excerpts run `the_content` too and then strip the markup, which would use up the one chance to print.
		if ( self::$printed || ! is_main_query() || ! in_the_loop() || doing_filter( 'get_the_excerpt' ) || doing_filter( 'the_excerpt' ) ) {
			return $content;
		}
		self::$printed = true;
		return Renderer::render( self::$box_id ) . $content;
	}

	/** A page with no main content loop still shows the box, at the end. */
	public static function print_fallback() {
		if ( self::$printed ) {
			return;
		}
		self::$printed = true;
		echo Renderer::render( self::$box_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Renderer::render() escapes everything it prints.
	}
}
