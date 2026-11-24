<?php
/**
 * Divi theme compatibility.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Compatibility\Themes;

use MixMax\BoxBuilder\Campaigns\Page_Content;
use MixMax\BoxBuilder\Compatibility\Integration;
use MixMax\BoxBuilder\Storefront\Storefront;

defined( 'ABSPATH' ) || exit;

/**
 * Divi styles the builder's own elements and covers its overlays:
 *
 * - `#left-area ul` and `#left-area ol` (and the same for `.entry-content` and Divi Builder
 *   layouts) add bullets or numbers, a 26px line height and 23px of padding to every list.
 *   The ID beats every class rule, so the tier ladders, slots and steps grew markers and gaps.
 * - `p` and `h1`-`h6` get bottom padding, headings drop to weight 500, `dt` turns bold, `small`
 *   loses its smaller size, and `body` sets weight 500, which every box inherited.
 * - The fixed header sits at z-index 99999 (the top bar at 100000), above the phone drawer.
 *   On Divi Builder pages the content and columns are stacking contexts (z-index 1 and 2), so
 *   no z-index on the drawer alone could lift it over the header.
 * - The sticky summary slid under the fixed header.
 * - A Text module wraps the shortcode in a paragraph, which leaves empty padded paragraphs
 *   above and below the box.
 *
 * It also keeps the Divi Builder working when a box is published to a Divi Builder page, and
 * gives a page made only for a box Divi's no-sidebar layout, so the box gets the full column.
 *
 * Inside the Divi Builder the box cannot run: the Visual Builder swaps WordPress's React for
 * React 16, which has no createRoot, and renders shortcodes through admin-ajax, so the storefront
 * script and its payload never print. There the box is a placeholder that shows the box's
 * preview page in a frame instead (see Renderer::render()).
 */
final class Divi extends Integration {
	/** Body class for these rules. WordPress names the theme `Divi`, and classes are case-sensitive. */
	const BODY_CLASS = 'mmbb-theme-divi';

	/** Handle of the small script that sizes placeholder frames inside the Divi Builder. */
	const BUILDER_HANDLE = 'mmbb-divi-builder';

	/**
	 * Divi 4 admin-ajax actions that render module or page content for the Visual Builder.
	 * Taken from Divi 4.27: et_fb_ajax_render_shortcode(), et_fb_get_html_from_shortcode(),
	 * et_builder_is_loading_data() and ET_Builder_Framework's builder actions.
	 */
	const BUILDER_AJAX_ACTIONS = array(
		'et_fb_ajax_render_shortcode',
		'et_fb_get_html_from_shortcode',
		'et_fb_retrieve_builder_data',
		'et_fb_update_builder_assets',
		'et_pb_process_computed_property',
		'et_pb_execute_content_shortcodes',
	);

	/**
	 * Whether Divi, or a child theme of it, is active.
	 *
	 * @return bool
	 */
	public function is_active() {
		return $this->theme_is( 'Divi' ) || $this->theme_is( 'divi' );
	}

	/** Add the hooks. */
	public function register() {
		add_filter( 'body_class', array( $this, 'body_class' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'assets' ), 20 );
		add_filter( 'mmbb_page_marker', array( $this, 'page_marker' ), 10, 2 );
		add_action( 'mmbb_box_page_created', array( $this, 'page_layout' ) );
		add_filter( 'mmbb_is_page_builder_request', array( $this, 'page_builder_request' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'builder_assets' ) );
		add_action( 'mmbb_campaign_saved', array( $this, 'migrate_text_module' ), 20, 2 );
	}

	/**
	 * Whether this request is the Divi Builder showing or rendering a layout: the Divi 4 Visual
	 * Builder and its preview, the admin-ajax calls that render modules for it, and Divi 5's builder.
	 *
	 * The query args count only for people who can edit posts, as Divi checks, so a shopper who
	 * adds `?et_fb=1` to a link still gets the real box.
	 *
	 * @return bool
	 */
	public static function is_builder_request() {
		if ( function_exists( 'et_core_is_fb_enabled' ) && \et_core_is_fb_enabled() ) {
			return true;
		}
		if ( ! current_user_can( 'edit_posts' ) ) {
			return false;
		}
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Read only to choose what to render; nothing is saved.
		if ( isset( $_GET['et_fb'] ) || isset( $_GET['et_pb_preview'] ) ) {
			return true;
		}
		$action = wp_doing_ajax() && isset( $_REQUEST['action'] ) ? sanitize_key( wp_unslash( $_REQUEST['action'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		if ( '' !== $action && in_array( $action, self::BUILDER_AJAX_ACTIONS, true ) ) {
			return true;
		}
		return self::is_divi_5() && self::is_divi_5_builder_request();
	}

	/**
	 * Whether Divi 5 runs. Divi 4 defines neither of these.
	 *
	 * @return bool
	 */
	public static function is_divi_5() {
		return defined( 'ET_BUILDER_5_DIR' ) || ( function_exists( 'et_builder_d5_enabled' ) && \et_builder_d5_enabled() );
	}

	/**
	 * Divi 5's Visual Builder still opens with `?et_fb=1` (checked above), but it renders modules
	 * through its REST API, under the `divi/v1` namespace, instead of admin-ajax.
	 *
	 * TODO(divi-5): confirm the route prefix against a Divi 5 release. Divi 5 shows a shortcode
	 * through its Shortcode or Code module (Divi 4 layouts go through its compatibility layer). A
	 * native Divi 5 module for the box would need Divi 5's module registration API (a module.json
	 * on the server plus a module package registered in the builder's JS); not guessed here.
	 *
	 * @return bool
	 */
	private static function is_divi_5_builder_request() {
		if ( ! defined( 'REST_REQUEST' ) || ! REST_REQUEST ) {
			return false;
		}
		$route = isset( $GLOBALS['wp']->query_vars['rest_route'] ) ? (string) $GLOBALS['wp']->query_vars['rest_route'] : '';
		return 0 === strpos( ltrim( $route, '/' ), 'divi/v1/' );
	}

	/**
	 * On `mmbb_is_page_builder_request`.
	 *
	 * @param bool $is_builder Whether something else already said yes.
	 * @return bool
	 */
	public function page_builder_request( $is_builder ) {
		return $is_builder || self::is_builder_request();
	}

	/** In the Divi Builder, size each placeholder's frame to the box preview inside it. */
	public function builder_assets() {
		if ( ! self::is_builder_request() ) {
			return;
		}
		wp_register_script( self::BUILDER_HANDLE, false, array(), MMBB_VERSION, true );
		wp_enqueue_script( self::BUILDER_HANDLE );
		wp_add_inline_script( self::BUILDER_HANDLE, self::frame_script() );
	}

	/**
	 * Listen for the height the box preview reports (`mmbb:preview:height`, sent by PreviewHost)
	 * and size the frame it came from. A message counts only from a placeholder frame's own
	 * window and origin. Divi puts rendered modules in with innerHTML, which never runs scripts,
	 * so this runs on the builder page and finds the frames itself.
	 *
	 * @return string
	 */
	public static function frame_script() {
		return '(function(){addEventListener("message",function(e){var d=e.data;'
			. 'if(!d||typeof d!=="object"||d.type!=="mmbb:preview:height"){return;}'
			. 'var h=Math.ceil(Number(d.height));if(!(h>0)){return;}'
			. 'document.querySelectorAll("iframe.mmbb-builder-placeholder__frame").forEach(function(f){'
			. 'if(f.contentWindow!==e.source){return;}var o="";try{o=new URL(f.src,location.href).origin;}catch(x){return;}'
			. 'if(o!==e.origin){return;}f.style.height=Math.min(h,20000)+"px";});});})();';
	}

	/**
	 * Name Divi in lower case, whatever its folder is called.
	 *
	 * @param string[] $classes Body classes.
	 * @return string[]
	 */
	public function body_class( $classes ) {
		$classes[] = self::BODY_CLASS;
		return $classes;
	}

	/** Add the fixes after the storefront assets, only where a box renders. */
	public function assets() {
		if ( ! wp_style_is( Storefront::HANDLE, 'enqueued' ) && ! wp_style_is( Storefront::HANDLE, 'registered' ) ) {
			return;
		}
		wp_add_inline_style( Storefront::HANDLE, self::css() . self::list_rules() );
		wp_add_inline_script( Storefront::HANDLE, self::header_script() );
	}

	/**
	 * The builder's own list rules with ID weight, from the build step.
	 *
	 * @return string Empty when the file is missing, for example in a source checkout.
	 */
	public static function list_rules() {
		$file = MMBB_PATH . 'build/list-boost.css';
		if ( ! is_readable( $file ) ) {
			return '';
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local build file, not a remote URL.
		$css = file_get_contents( $file );
		return is_string( $css ) ? $css : '';
	}

	/**
	 * The style fixes.
	 *
	 * Lists need ID weight to beat `#left-area ul` (1,0,1): `:is(.mmbb-root,#mmbb-boost)` matches
	 * every builder and weighs as an ID, so the reset weighs 1,1,1. The builder's own list rules
	 * come back after it at 1,2,0 from build/list-boost.css. Everything else Divi sets is a bare
	 * element rule, so those resets wrap the body class in :where() and weigh `.mmbb-root` plus
	 * the element: above Divi, below the builder's own `.mmbb-root .mmbb-*` rules.
	 *
	 * @return string
	 */
	public static function css() {
		$body = '.' . self::BODY_CLASS;
		$low  = ':where(' . $body . ') .mmbb-root';
		$id   = '.mmbb-root:is(.mmbb-root,#mmbb-boost)';
		// Divi's page and layout wrappers that are, or can be set to be, stacking contexts.
		$wrappers = '.et-l,.et_builder_inner_content,.et_pb_section,.et_pb_row,.et_pb_row_inner,.et_pb_column,.et_pb_module';

		return $low . '.mmbb-builder{font-weight:400}'
			. $id . ' :is(ul,ol){list-style:none;padding:0;line-height:inherit}'
			. $low . ' :is(h1,h2,h3,h4,h5,h6){padding-bottom:0;font-weight:700}'
			. $low . ' p{padding-bottom:0}'
			. $low . ' dt{font-weight:inherit}'
			. $low . ' small{font-size:smaller}'
			// Above the fixed header (99999) and the top bar (100000).
			. $body . ' .mmbb-root .mmbb-drawer{z-index:100001}'
			. $body . ' .mmbb-root .mmbb-builder__toast{z-index:100000}'
			// While the drawer is open, lift the Divi wrappers it sits in over the header too.
			. $body . ' :is(' . $wrappers . '):has(.mmbb-drawer){z-index:100001!important}'
			// Keep the sticky summary clear of the fixed header. The script below measures it.
			. $body . ' .mmbb-root .mmbb-builder__aside{top:calc(var(--space-4) + var(--mmbb-divi-header,0px))}'
			// The empty paragraphs a Text module leaves around the shortcode.
			. $body . ' p:empty:has(+.mmbb-root.mmbb-builder),' . $body . ' .mmbb-root.mmbb-builder+p:empty{display:none}'
			// Divi does not clip sideways overflow, so anything past the box's edge (a long word or
			// price on a very small phone) would let the whole page scroll sideways. clip, unlike
			// hidden, is not a scroll container, so the sticky bar and summary still stick.
			. $low . '.mmbb-builder{overflow-x:clip}'
			// Divi's content column is 80% of a phone screen (312px of 390px), too tight for two
			// product columns. A wide or full box takes the screen less a 16px gutter instead. A box
			// set to the content width keeps the theme's column.
			. '@media (max-width:767px){' . $body . ' :is(.entry-content,.et_pb_code_inner,.et_pb_text_inner)>.mmbb-root.mmbb-builder:not([data-width=content]){width:calc(100vw - 32px);max-width:none;margin-inline:calc(50% - 50vw + 16px)}}'
			. $body . ' .mmbb-preview-main{width:100%;padding:24px}';
	}

	/**
	 * Keep `--mmbb-divi-header` at the bottom edge of Divi's fixed header, or of a sticky
	 * Theme Builder header, so the sticky summary stops below it. The header shrinks as the page
	 * scrolls and is not fixed on phones or with the vertical menu, so it is measured, not assumed.
	 *
	 * @return string
	 */
	public static function header_script() {
		return '(function(){var d=document,root=d.documentElement,queued=0;'
			. 'function update(){queued=0;var max=0;'
			. 'd.querySelectorAll("#main-header,#top-header,.et_pb_sticky").forEach(function(el){'
			. 'var cs=getComputedStyle(el);if(cs.position!=="fixed"||cs.display==="none"||cs.visibility==="hidden"){return;}'
			. 'var r=el.getBoundingClientRect();if(r.width<window.innerWidth/2||r.top>64||r.bottom<=0){return;}'
			. 'max=Math.max(max,r.bottom);});'
			. 'root.style.setProperty("--mmbb-divi-header",Math.round(max)+"px");}'
			. 'function later(){if(!queued){queued=requestAnimationFrame(update);}}'
			. 'addEventListener("scroll",later,{passive:true});addEventListener("resize",later);d.addEventListener("transitionend",later);'
			. 'if(d.readyState==="loading"){d.addEventListener("DOMContentLoaded",update);}else{update();}})();';
	}

	/**
	 * On a Divi Builder page, put the shortcode in a Divi section with a Code module. Divi keeps
	 * the whole layout in the content, and a bare shortcode before its sections sits outside the
	 * layout grid and is not a module the Divi Builder can show or move.
	 *
	 * TODO(divi-5): Divi 5 keeps layouts as block markup. This Divi 4 section reaches it through
	 * Divi 5's Divi 4 compatibility layer; a native Divi 5 section needs Divi 5's block format.
	 *
	 * @param string   $marker Block or shortcode.
	 * @param \WP_Post $page   The page.
	 * @return string
	 */
	public function page_marker( $marker, $page ) {
		if ( ! $page instanceof \WP_Post || 'on' !== get_post_meta( $page->ID, '_et_pb_use_builder', true ) ) {
			return $marker;
		}
		if ( ! preg_match( '/\[mmbb_box\s+id="(\d+)"\]/', (string) $marker, $match ) && ! preg_match( '/"campaignId":(\d+)/', (string) $marker, $match ) ) {
			return $marker;
		}
		return self::section( Page_Content::shortcode( (int) $match[1] ) );
	}

	/**
	 * A full-width Divi section that holds a shortcode in a Code module. A Code module runs
	 * the shortcode as it is; a Text module would wrap it in a paragraph.
	 *
	 * @param string $shortcode The shortcode.
	 * @return string
	 */
	public static function section( $shortcode ) {
		$attr = self::version_attribute();
		return '[et_pb_section fb_built="1"' . $attr . '][et_pb_row' . $attr . '][et_pb_column type="4_4"' . $attr . ']'
			. self::code_module( $shortcode )
			. '[/et_pb_column][/et_pb_row][/et_pb_section]';
	}

	/**
	 * A Divi Code module that holds a shortcode.
	 *
	 * @param string $shortcode The shortcode.
	 * @return string
	 */
	public static function code_module( $shortcode ) {
		return '[et_pb_code' . self::version_attribute() . ']' . $shortcode . '[/et_pb_code]';
	}

	/**
	 * ` _builder_version="x.y.z"` for the running Divi, or empty outside Divi.
	 *
	 * @return string
	 */
	private static function version_attribute() {
		$version = defined( 'ET_BUILDER_PRODUCT_VERSION' ) ? preg_replace( '/[^0-9.]/', '', (string) \ET_BUILDER_PRODUCT_VERSION ) : '';
		return '' !== $version ? ' _builder_version="' . $version . '"' : '';
	}

	/**
	 * On `mmbb_campaign_saved`: when the box's page uses the Divi Builder and the box's shortcode
	 * sits in a Text module, move it to a Code module. A Text module wraps the shortcode in a
	 * paragraph and runs its text filters over the box. Runs on every save and changes nothing
	 * once the shortcode is out of the Text module.
	 *
	 * @param int   $campaign_id Campaign id.
	 * @param array $config      The saved config.
	 */
	public function migrate_text_module( $campaign_id, $config ) {
		$page_id = isset( $config['placement']['page_id'] ) ? absint( $config['placement']['page_id'] ) : 0;
		if ( $page_id < 1 || 'on' !== get_post_meta( $page_id, '_et_pb_use_builder', true ) ) {
			return;
		}
		$page = get_post( $page_id );
		if ( ! $page instanceof \WP_Post || 'trash' === $page->post_status || ! current_user_can( 'edit_post', $page->ID ) ) {
			return;
		}
		$content = self::migrate_shortcode( $page->post_content, (int) $campaign_id );
		if ( $content === $page->post_content ) {
			return;
		}
		wp_update_post(
			array(
				'ID'           => $page->ID,
				'post_content' => wp_slash( $content ),
			)
		);
	}

	/**
	 * Take one box's shortcode out of the Divi Text modules that hold only it (in a paragraph, or
	 * bare). A section that holds nothing but that Text module becomes Divi::section(), the way
	 * Divi lays out a classic page it converts. Anywhere else the Text module becomes a Code module
	 * in place, so the section around it and its settings stay: a section cannot sit in a column.
	 * Other shortcodes, other boxes and Text modules with more in them are left alone. Pure.
	 *
	 * @param string $content     Divi layout content.
	 * @param int    $campaign_id Box id.
	 * @return string
	 */
	public static function migrate_shortcode( $content, $campaign_id ) {
		$content = (string) $content;
		$id      = abs( (int) $campaign_id );
		if ( $id < 1 || false === strpos( $content, '[et_pb_text' ) ) {
			return $content;
		}
		$box     = '\[mmbb_box\s(?:[^\]]*\s)?id=["\']?' . $id . '["\']?(?=[\s\]])[^\]]*\]';
		$text    = '\[et_pb_text(?:\s[^\]]*)?\]\s*(?:<p>\s*)?(' . $box . ')(?:\s*<\/p>)?\s*\[\/et_pb_text\]';
		$section = '\[et_pb_section(?:\s[^\]]*)?\]\s*\[et_pb_row(?:\s[^\]]*)?\]\s*\[et_pb_column(?:\s[^\]]*)?\]\s*'
			. $text
			. '\s*\[\/et_pb_column\]\s*\[\/et_pb_row\]\s*\[\/et_pb_section\]';

		$content = (string) preg_replace_callback(
			'/' . $section . '/',
			static function ( $found ) {
				return self::section( $found[1] );
			},
			$content
		);
		return (string) preg_replace_callback(
			'/' . $text . '/',
			static function ( $found ) {
				return self::code_module( $found[1] );
			},
			$content
		);
	}

	/**
	 * Give a page made only for a box Divi's no-sidebar layout. With Divi's default right sidebar
	 * the content column is 754px, just under the width where the box switches to its phone
	 * layout, so desktop shoppers got the phone layout.
	 *
	 * @param int $page_id Page id.
	 */
	public function page_layout( $page_id ) {
		if ( '' === (string) get_post_meta( $page_id, '_et_pb_page_layout', true ) ) {
			update_post_meta( $page_id, '_et_pb_page_layout', 'et_no_sidebar' );
		}
	}
}
