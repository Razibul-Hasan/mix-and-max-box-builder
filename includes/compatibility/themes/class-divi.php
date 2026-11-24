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
 */
final class Divi extends Integration {
	/** Body class for these rules. WordPress names the theme `Divi`, and classes are case-sensitive. */
	const BODY_CLASS = 'mmbb-theme-divi';

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
		$version = defined( 'ET_BUILDER_PRODUCT_VERSION' ) ? preg_replace( '/[^0-9.]/', '', (string) \ET_BUILDER_PRODUCT_VERSION ) : '';
		$attr    = '' !== $version ? ' _builder_version="' . $version . '"' : '';
		return '[et_pb_section fb_built="1"' . $attr . '][et_pb_row' . $attr . '][et_pb_column type="4_4"' . $attr . '][et_pb_code' . $attr . ']'
			. $shortcode
			. '[/et_pb_code][/et_pb_column][/et_pb_row][/et_pb_section]';
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
