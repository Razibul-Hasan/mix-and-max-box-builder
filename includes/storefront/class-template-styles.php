<?php
/**
 * Storefront template defaults and safe CSS custom properties.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Storefront;

defined( 'ABSPATH' ) || exit;

/** Resolve one design object into the variables shared by every template. */
final class Template_Styles {
	/** Template defaults that are intentionally independent of stored campaign data. */
	const DEFAULTS = array(
		'spotlight' => array( '#ff4f1f', '#ffffff', '#f3f4f6', '#111111', '#555b66', '#0a7a3b', 'bricolage-grotesque', 'bricolage-grotesque' ),
		'clean'     => array( '#111111', '#ffffff', '#f3f4f6', '#111111', '#5b6069', '#0a7a3b', 'inter-tight', 'inter-tight' ),
		'steps'     => array( '#5b3df5', '#f6f4ff', '#ffffff', '#1b1240', '#625a8a', '#0a7a3b', 'plus-jakarta-sans', 'plus-jakarta-sans' ),
		'gift'      => array( '#f2c14e', '#0f3d2e', '#f6efe3', '#f6efe3', '#c8d6cf', '#f2c14e', 'fraunces', 'dm-sans' ),
		'bold'      => array( '#2b4bff', '#f2f3f5', '#ffffff', '#0e0e10', '#5b6069', '#0a7a3b', 'bricolage-grotesque', 'bricolage-grotesque' ),
		'pastel'    => array( '#8b5cf6', '#fff8f3', '#f1e9ff', '#2d2433', '#6d6373', '#6d28d9', 'outfit', 'outfit' ),
		'editorial' => array( '#c2410c', '#f5f1ea', '#ffffff', '#1a1a1a', '#655f57', '#9a3412', 'fraunces', 'inter' ),
		'night'     => array( '#c8ff2e', '#0c0c10', '#18181d', '#f4f4f5', '#a1a1aa', '#c8ff2e', 'space-grotesk', 'space-grotesk' ),
		'split'     => array( '#ff6b4a', '#ffffff', '#fff0ec', '#111111', '#5b6069', '#c2410c', 'bricolage-grotesque', 'inter' ),
		'compact'   => array( '#e11d74', '#f4f4f2', '#ffffff', '#111111', '#666666', '#be185d', 'bricolage-grotesque', 'inter' ),
	);

	/** Local font slug to a safe CSS family stack. */
	const FONTS = array(
		'theme'               => 'inherit',
		'bricolage-grotesque' => '"Bricolage Grotesque",system-ui,sans-serif',
		'inter-tight'         => '"MMBB Inter Tight",system-ui,sans-serif',
		'plus-jakarta-sans'   => '"MMBB Plus Jakarta Sans",system-ui,sans-serif',
		'fraunces'            => '"MMBB Fraunces",Georgia,serif',
		'dm-sans'             => '"MMBB DM Sans",system-ui,sans-serif',
		'outfit'              => '"MMBB Outfit",system-ui,sans-serif',
		'inter'               => '"MMBB Inter",system-ui,sans-serif',
		'space-grotesk'       => '"MMBB Space Grotesk",system-ui,sans-serif',
		'figtree'             => 'Figtree,system-ui,sans-serif',
		'system'              => 'system-ui,-apple-system,"Segoe UI",sans-serif',
	);

	/**
	 * Merge template defaults with the sanitized merchant settings.
	 *
	 * @param array $design Public campaign design.
	 * @return array { template: string, vars: array }.
	 */
	public static function resolve( array $design ) {
		$template = isset( self::DEFAULTS[ $design['template'] ] ) ? $design['template'] : 'spotlight';
		$defaults = self::DEFAULTS[ $template ];
		$colors   = isset( $design['colors'] ) && is_array( $design['colors'] ) ? $design['colors'] : array();
		$type     = isset( $design['typography'] ) && is_array( $design['typography'] ) ? $design['typography'] : array();
		$buttons  = isset( $design['buttons'] ) && is_array( $design['buttons'] ) ? $design['buttons'] : array();
		$cards    = isset( $design['cards'] ) && is_array( $design['cards'] ) ? $design['cards'] : array();
		$spacing  = isset( $design['spacing'] ) && is_array( $design['spacing'] ) ? $design['spacing'] : array();

		$accent     = self::value( $colors, 'accent', $defaults[0] );
		$button     = self::value( $colors, 'button_text', self::ink( $accent ) );
		$background = self::value( $colors, 'background', $defaults[1] );
		$surface    = self::value( $colors, 'surface', $defaults[2] );
		$text       = self::value( $colors, 'text', $defaults[3] );
		$muted      = self::value( $colors, 'muted', $defaults[4] );
		$savings    = self::value( $colors, 'savings', $defaults[5] );
		$head_font  = self::font( self::value( $type, 'heading_font', $defaults[6] ), $defaults[6] );
		$body_font  = self::font( self::value( $type, 'body_font', $defaults[7] ), $defaults[7] );
		$head_slug  = self::font_slug( self::value( $type, 'heading_font', $defaults[6] ), $defaults[6] );
		$body_slug  = self::font_slug( self::value( $type, 'body_font', $defaults[7] ), $defaults[7] );
		$btn_size   = self::value( $buttons, 'size', 'm' );
		$btn_height = array(
			's' => '40px',
			'm' => '46px',
			'l' => '54px',
		);
		$shadow     = array(
			'none'   => 'none',
			'soft'   => '0 8px 24px -12px rgb(0 0 0 / 25%)',
			'strong' => '0 18px 40px -14px rgb(0 0 0 / 40%)',
		);
		$ratio      = str_replace( '/', ' / ', self::value( $cards, 'image_ratio', '1/1' ) );
		$padding    = isset( $spacing['padding'] ) && is_array( $spacing['padding'] ) ? $spacing['padding'] : array();

		$vars = array(
			'--mmbb-accent'         => $accent,
			'--mmbb-button-text'    => $button,
			'--mmbb-bg'             => $background,
			'--mmbb-surface'        => $surface,
			'--mmbb-text'           => $text,
			'--mmbb-muted'          => $muted,
			'--mmbb-savings'        => $savings,
			'--mmbb-font-heading'   => $head_font,
			'--mmbb-font-body'      => $body_font,
			'--mmbb-heading-size'   => (int) self::value( $type, 'heading_size', 68 ) . 'px',
			'--mmbb-heading-weight' => (int) self::value( $type, 'heading_weight', 800 ),
			'--mmbb-btn-radius'     => (int) self::value( $buttons, 'radius', 22 ) . 'px',
			'--mmbb-btn-height'     => isset( $btn_height[ $btn_size ] ) ? $btn_height[ $btn_size ] : $btn_height['m'],
			'--mmbb-card-radius'    => (int) self::value( $cards, 'radius', 18 ) . 'px',
			'--mmbb-card-shadow'    => isset( $shadow[ self::value( $cards, 'shadow', 'none' ) ] ) ? $shadow[ self::value( $cards, 'shadow', 'none' ) ] : 'none',
			'--mmbb-cols'           => (int) self::value( $cards, 'columns', 3 ),
			'--mmbb-ratio'          => $ratio,
			'--mmbb-fit'            => self::value( $cards, 'image_fit', 'cover' ),
			'--mmbb-pad-top'        => self::value( $padding, 'top', '56px' ),
			'--mmbb-pad-right'      => self::value( $padding, 'right', '64px' ),
			'--mmbb-pad-bottom'     => self::value( $padding, 'bottom', '56px' ),
			'--mmbb-pad-left'       => self::value( $padding, 'left', '64px' ),
			'--max'                 => $accent,
			'--on-max'              => $button,
			'--canvas'              => $background,
			'--surface'             => $surface,
			'--ink'                 => $text,
			'--ink-muted'           => $muted,
			'--max-strong'          => $savings,
			'--font-display'        => $head_font,
			'--font-sans'           => $body_font,
		);

		return array(
			'template' => $template,
			'vars'     => $vars,
			'fonts'    => array_values( array_unique( array_filter( array( $head_slug, $body_slug ) ) ) ),
		);
	}

	/**
	 * Local @font-face rules for only the families this instance uses.
	 *
	 * @param string[] $slugs Bundled font slugs.
	 * @return string
	 */
	public static function font_css( array $slugs ) {
		$files = array(
			'inter-tight'       => array( 'MMBB Inter Tight', 'inter-tight-latin-wght-normal.woff2', '100 900' ),
			'plus-jakarta-sans' => array( 'MMBB Plus Jakarta Sans', 'plus-jakarta-sans-latin-wght-normal.woff2', '200 800' ),
			'fraunces'          => array( 'MMBB Fraunces', 'fraunces-latin-wght-normal.woff2', '100 900' ),
			'dm-sans'           => array( 'MMBB DM Sans', 'dm-sans-latin-wght-normal.woff2', '100 1000' ),
			'outfit'            => array( 'MMBB Outfit', 'outfit-latin-wght-normal.woff2', '100 900' ),
			'inter'             => array( 'MMBB Inter', 'inter-latin-wght-normal.woff2', '100 900' ),
			'space-grotesk'     => array( 'MMBB Space Grotesk', 'space-grotesk-latin-wght-normal.woff2', '300 700' ),
		);
		$css   = '';
		foreach ( array_unique( $slugs ) as $slug ) {
			if ( ! isset( $files[ $slug ] ) ) {
				continue;
			}
			$font = $files[ $slug ];
			$css .= '@font-face{font-family:"' . $font[0] . '";src:url("' . esc_url( MMBB_URL . 'assets/fonts/' . $font[1] ) . '") format("woff2");font-style:normal;font-weight:' . $font[2] . ';font-display:swap}';
		}
		return $css;
	}

	/**
	 * A safe instance-scoped rule for wp_add_inline_style().
	 *
	 * @param int   $instance Rendered builder number.
	 * @param array $vars     Resolved CSS variables.
	 * @return string
	 */
	public static function rule( $instance, array $vars ) {
		$style = safecss_filter_attr( Colors::style( $vars ) );
		return '.mmbb-box-' . max( 0, (int) $instance ) . '{' . $style . '}';
	}

	/**
	 * Return a non-empty setting or its fallback.
	 *
	 * @param array  $source   Settings object.
	 * @param string $key      Setting key.
	 * @param mixed  $fallback Template fallback.
	 * @return mixed
	 */
	private static function value( array $source, $key, $fallback ) {
		return isset( $source[ $key ] ) && '' !== $source[ $key ] ? $source[ $key ] : $fallback;
	}

	/**
	 * Resolve a bundled font slug or a safe theme preset reference.
	 *
	 * @param string $value    Stored font value.
	 * @param string $fallback Template font slug.
	 * @return string
	 */
	private static function font( $value, $fallback ) {
		if ( isset( self::FONTS[ $value ] ) ) {
			return self::FONTS[ $value ];
		}
		if ( preg_match( '/^var\(--wp--preset--font-family--[a-z0-9-]+\)$/', (string) $value ) ) {
			return $value;
		}
		return self::FONTS[ $fallback ];
	}

	/**
	 * The local slug to enqueue, or an empty string for theme/system fonts.
	 *
	 * @param string $value    Stored font value.
	 * @param string $fallback Template font slug.
	 * @return string
	 */
	private static function font_slug( $value, $fallback ) {
		$slug = isset( self::FONTS[ $value ] ) && '' !== $value ? $value : $fallback;
		return in_array( $slug, array( 'theme', 'system', 'bricolage-grotesque', 'figtree' ), true ) ? '' : $slug;
	}

	/**
	 * Choose dark or light button text for a hex accent.
	 *
	 * @param string $accent Accent colour.
	 * @return string
	 */
	private static function ink( $accent ) {
		$hex = Colors::normalize_hex( $accent );
		if ( '' === $hex ) {
			return '#ffffff';
		}
		$r = hexdec( substr( $hex, 1, 2 ) );
		$g = hexdec( substr( $hex, 3, 2 ) );
		$b = hexdec( substr( $hex, 5, 2 ) );
		return ( 0.299 * $r + 0.587 * $g + 0.114 * $b ) > 160 ? '#141414' : '#ffffff';
	}
}
