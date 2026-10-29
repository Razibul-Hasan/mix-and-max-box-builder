<?php
/**
 * Builder colours from the campaign design.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Storefront;

defined( 'ABSPATH' ) || exit;

/**
 * Turns the design's accent and theme into token overrides. The JS twin is
 * src/shared/colors.js; both run tests/fixtures/color-cases.json.
 */
final class Colors {
	/** Surfaces and inks from tokens.css, needed to mix the accent's soft tint. */
	const LIGHT_SURFACE = '#ffffff';
	const DARK_SURFACE  = '#1a1a18';
	const DARK_INK      = '#141414';
	const LIGHT_INK     = '#f3f3ef';
	const WHITE         = '#ffffff';
	const BLACK         = '#000000';

	/** Theme palette slugs that usually hold the brand colour, best first. */
	const THEME_SLUGS = array( 'primary', 'accent', 'accent-1', 'brand', 'secondary' );

	/** Custom discount ladder colours => the properties the storefront CSS reads. */
	const LADDER = array(
		'ladder_top'       => '--ladder-top',
		'ladder_top_text'  => '--on-ladder-top',
		'ladder_near'      => '--ladder-near',
		'ladder_near_text' => '--on-ladder-near',
		'ladder_base'      => '--ladder-base',
		'ladder_base_text' => '--on-ladder-base',
	);

	/** Custom countdown colours => the properties the countdown CSS reads. */
	const COUNTDOWN = array(
		'countdown_bg'   => '--countdown',
		'countdown_text' => '--on-countdown',
	);

	/**
	 * Normalise a hex colour to #rrggbb.
	 *
	 * @param mixed $value Raw value.
	 * @return string Lower-case #rrggbb, or '' when the value is not a hex colour.
	 */
	public static function normalize_hex( $value ) {
		if ( ! is_scalar( $value ) || ! preg_match( '/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i', trim( (string) $value ), $match ) ) {
			return '';
		}
		$hex = strtolower( $match[1] );
		if ( 3 === strlen( $hex ) ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}
		return '#' . $hex;
	}

	/**
	 * Resolve the colours of a builder.
	 *
	 * @param array  $design       Campaign design: accent, accent_color, theme, theme_canvas, theme_surface, ladder, countdown and their colours.
	 * @param string $theme_accent The active theme's main colour, or ''.
	 * @return array { dark: bool, vars: array<string, string> }.
	 */
	public static function resolve( array $design, $theme_accent = '' ) {
		$vars    = array();
		$theme   = isset( $design['theme'] ) ? $design['theme'] : 'light';
		$dark    = 'dark' === $theme;
		$surface = $dark ? self::DARK_SURFACE : self::LIGHT_SURFACE;

		if ( 'custom' === $theme ) {
			$canvas = self::normalize_hex( isset( $design['theme_canvas'] ) ? $design['theme_canvas'] : '' );
			$card   = self::normalize_hex( isset( $design['theme_surface'] ) ? $design['theme_surface'] : '' );
			if ( '' !== $canvas && '' !== $card ) {
				$ink     = self::ink_on( $card, self::DARK_INK, self::LIGHT_INK );
				$dark    = self::LIGHT_INK === $ink;
				$surface = $card;
				$vars    = array(
					'--canvas'         => $canvas,
					'--surface'        => $card,
					'--surface-sunken' => self::mix( $ink, $card, 0.06 ),
					'--surface-hover'  => self::mix( $ink, $card, 0.03 ),
					'--line'           => self::mix( $ink, $card, 0.12 ),
					'--line-strong'    => self::mix( $ink, $card, 0.5 ),
					'--ink'            => $ink,
					'--ink-muted'      => self::mix( $ink, $card, 0.72 ),
					'--ink-subtle'     => self::mix( $ink, $card, 0.62 ),
					'--on-ink'         => $card,
				);
			}
		}

		$accent = '';
		$choice = isset( $design['accent'] ) ? $design['accent'] : 'max';
		if ( 'custom' === $choice ) {
			$accent = self::normalize_hex( isset( $design['accent_color'] ) ? $design['accent_color'] : '' );
		} elseif ( 'theme' === $choice ) {
			$accent = self::normalize_hex( $theme_accent );
		}
		if ( '' !== $accent ) {
			$vars['--max']        = $accent;
			$vars['--on-max']     = self::ink_on( $accent, self::DARK_INK, self::WHITE );
			$vars['--max-strong'] = $dark ? self::readable_on( $accent, self::WHITE, 75, $surface ) : self::readable_on( $accent, self::BLACK, 80, $surface );
			$vars['--max-soft']   = self::mix( $accent, $surface, $dark ? 0.22 : 0.14 );
		}

		if ( isset( $design['ladder'] ) && 'custom' === $design['ladder'] ) {
			foreach ( self::LADDER as $key => $name ) {
				$hex = self::normalize_hex( isset( $design[ $key ] ) ? $design[ $key ] : '' );
				if ( '' !== $hex ) {
					$vars[ $name ] = $hex;
				}
			}
		}

		if ( isset( $design['countdown'] ) && 'custom' === $design['countdown'] ) {
			foreach ( self::COUNTDOWN as $key => $name ) {
				$hex = self::normalize_hex( isset( $design[ $key ] ) ? $design[ $key ] : '' );
				if ( '' !== $hex ) {
					$vars[ $name ] = $hex;
				}
			}
		}

		return array(
			'dark' => $dark,
			'vars' => $vars,
		);
	}

	/**
	 * The active theme's main colour from its palette (theme.json or editor-color-palette).
	 *
	 * @return string #rrggbb, or '' when the theme names none.
	 */
	public static function theme_accent() {
		if ( ! function_exists( 'wp_get_global_settings' ) ) {
			return '';
		}
		$palette = wp_get_global_settings( array( 'color', 'palette', 'theme' ) );
		if ( ! is_array( $palette ) ) {
			return '';
		}
		$by_slug = array();
		foreach ( $palette as $entry ) {
			if ( is_array( $entry ) && isset( $entry['slug'], $entry['color'] ) ) {
				$hex = self::normalize_hex( $entry['color'] );
				if ( '' !== $hex ) {
					$by_slug[ (string) $entry['slug'] ] = $hex;
				}
			}
		}
		foreach ( self::THEME_SLUGS as $slug ) {
			if ( isset( $by_slug[ $slug ] ) ) {
				return $by_slug[ $slug ];
			}
		}
		return '';
	}

	/**
	 * Custom properties as a `style` attribute value. Names and values come from resolve(), so they are safe.
	 *
	 * @param array $vars Property => #rrggbb.
	 * @return string
	 */
	public static function style( array $vars ) {
		$out = array();
		foreach ( $vars as $name => $value ) {
			$out[] = $name . ':' . $value;
		}
		return implode( ';', $out );
	}

	/**
	 * Mix two colours in sRGB.
	 *
	 * @param string $a      #rrggbb.
	 * @param string $b      #rrggbb.
	 * @param float  $weight Share of `a`, 0 to 1.
	 * @return string #rrggbb.
	 */
	public static function mix( $a, $b, $weight ) {
		$ca  = self::channels( $a );
		$cb  = self::channels( $b );
		$out = '#';
		foreach ( $ca as $i => $c ) {
			$out .= sprintf( '%02x', (int) round( $c * $weight + $cb[ $i ] * ( 1 - $weight ) ) );
		}
		return $out;
	}

	/**
	 * Red, green and blue, 0 to 255.
	 *
	 * @param string $hex #rrggbb.
	 * @return int[]
	 */
	private static function channels( $hex ) {
		return array( hexdec( substr( $hex, 1, 2 ) ), hexdec( substr( $hex, 3, 2 ) ), hexdec( substr( $hex, 5, 2 ) ) );
	}

	/**
	 * WCAG relative luminance.
	 *
	 * @param string $hex #rrggbb.
	 * @return float
	 */
	private static function luminance( $hex ) {
		$linear = array();
		foreach ( self::channels( $hex ) as $c ) {
			$s        = $c / 255;
			$linear[] = $s <= 0.03928 ? $s / 12.92 : pow( ( $s + 0.055 ) / 1.055, 2.4 );
		}
		return 0.2126 * $linear[0] + 0.7152 * $linear[1] + 0.0722 * $linear[2];
	}

	/**
	 * WCAG contrast ratio.
	 *
	 * @param string $a #rrggbb.
	 * @param string $b #rrggbb.
	 * @return float
	 */
	private static function contrast( $a, $b ) {
		$la = self::luminance( $a );
		$lb = self::luminance( $b );
		return ( max( $la, $lb ) + 0.05 ) / ( min( $la, $lb ) + 0.05 );
	}

	/**
	 * The ink, dark or light, that reads best on a background.
	 *
	 * @param string $background #rrggbb.
	 * @param string $dark       Dark ink.
	 * @param string $light      Light ink.
	 * @return string
	 */
	private static function ink_on( $background, $dark, $light ) {
		return self::contrast( $background, $dark ) >= self::contrast( $background, $light ) ? $dark : $light;
	}

	/**
	 * The accent pushed toward black or white until it reads as text on the surface
	 * (4.5:1), so pale accents such as yellow still give legible savings copy.
	 *
	 * @param string $accent  #rrggbb.
	 * @param string $toward  self::BLACK or self::WHITE.
	 * @param int    $start   First share of the accent, in percent.
	 * @param string $surface #rrggbb the text sits on.
	 * @return string #rrggbb.
	 */
	private static function readable_on( $accent, $toward, $start, $surface ) {
		for ( $percent = $start; $percent > 0; $percent -= 10 ) {
			$shade = self::mix( $accent, $toward, $percent / 100 );
			if ( self::contrast( $shade, $surface ) >= 4.5 ) {
				return $shade;
			}
		}
		return $toward;
	}
}
