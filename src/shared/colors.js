/**
 * Builder colours from the campaign design. The PHP twin is
 * MixMax\BoxBuilder\Storefront\Colors; both run tests/fixtures/color-cases.json.
 *
 * The result is { dark, vars }: whether the builder uses the dark token set, and
 * the CSS custom properties that override tokens.css on the `.mmbb-root` element.
 */

// Surfaces and inks from tokens.css, needed to mix the accent's soft tint.
const LIGHT_SURFACE = '#ffffff';
const DARK_SURFACE = '#1a1a18';
const DARK_INK = '#141414';
const LIGHT_INK = '#f3f3ef';
const WHITE = '#ffffff';
const BLACK = '#000000';

// Custom discount ladder colours => the properties the storefront CSS reads.
const LADDER = {
	ladder_top: '--ladder-top',
	ladder_top_text: '--on-ladder-top',
	ladder_near: '--ladder-near',
	ladder_near_text: '--on-ladder-near',
	ladder_base: '--ladder-base',
	ladder_base_text: '--on-ladder-base',
};

// Custom countdown colours => the properties the countdown CSS reads.
const COUNTDOWN = {
	countdown_bg: '--countdown',
	countdown_text: '--on-countdown',
};

function customVars( vars, design, map ) {
	Object.keys( map ).forEach( ( key ) => {
		const hex = normalizeHex( design[ key ] );
		if ( hex ) {
			vars[ map[ key ] ] = hex;
		}
	} );
}

/**
 * Normalise a hex colour to #rrggbb, or return '' when it is not one.
 *
 * @param {*} value Raw value.
 * @return {string} Lower-case #rrggbb or ''.
 */
export function normalizeHex( value ) {
	const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(
		String( value ?? '' ).trim()
	);
	if ( ! match ) {
		return '';
	}
	let hex = match[ 1 ].toLowerCase();
	if ( hex.length === 3 ) {
		hex = hex
			.split( '' )
			.map( ( c ) => c + c )
			.join( '' );
	}
	return '#' + hex;
}

function channels( hex ) {
	return [ 1, 3, 5 ].map( ( i ) => parseInt( hex.slice( i, i + 2 ), 16 ) );
}

function toHex( rgb ) {
	return (
		'#' +
		rgb
			.map( ( c ) => Math.round( c ).toString( 16 ).padStart( 2, '0' ) )
			.join( '' )
	);
}

/**
 * Mix two colours in sRGB.
 *
 * @param {string} a      #rrggbb.
 * @param {string} b      #rrggbb.
 * @param {number} weight Share of `a`, 0 to 1.
 * @return {string} #rrggbb.
 */
export function mix( a, b, weight ) {
	const ca = channels( a );
	const cb = channels( b );
	return toHex( ca.map( ( c, i ) => c * weight + cb[ i ] * ( 1 - weight ) ) );
}

function luminance( hex ) {
	const [ r, g, b ] = channels( hex ).map( ( c ) => {
		const s = c / 255;
		return s <= 0.03928
			? s / 12.92
			: Math.pow( ( s + 0.055 ) / 1.055, 2.4 );
	} );
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast( a, b ) {
	const la = luminance( a );
	const lb = luminance( b );
	return ( Math.max( la, lb ) + 0.05 ) / ( Math.min( la, lb ) + 0.05 );
}

// The ink, dark or light, that reads best on a background.
function inkOn( background, dark, light ) {
	return contrast( background, dark ) >= contrast( background, light )
		? dark
		: light;
}

/**
 * The accent pushed toward black or white until it reads as text on the surface
 * (4.5:1), so pale accents such as yellow still give legible savings copy.
 *
 * @param {string} accent  #rrggbb.
 * @param {string} toward  BLACK or WHITE.
 * @param {number} start   First share of the accent, in percent.
 * @param {string} surface #rrggbb the text sits on.
 * @return {string} #rrggbb.
 */
function readableOn( accent, toward, start, surface ) {
	for ( let percent = start; percent > 0; percent -= 10 ) {
		const shade = mix( accent, toward, percent / 100 );
		if ( contrast( shade, surface ) >= 4.5 ) {
			return shade;
		}
	}
	return toward;
}

/**
 * Resolve the colours of a builder.
 *
 * @param {Object} design      Campaign design: accent, accent_color, theme, theme_canvas, theme_surface, ladder, countdown and their colours.
 * @param {string} themeAccent The active theme's main colour, or ''.
 * @return {{dark: boolean, vars: Object<string, string>}} Result.
 */
export function resolveColors( design, themeAccent = '' ) {
	const vars = {};
	let dark = design.theme === 'dark';
	let surface = dark ? DARK_SURFACE : LIGHT_SURFACE;

	if ( design.theme === 'custom' ) {
		const canvas = normalizeHex( design.theme_canvas );
		const card = normalizeHex( design.theme_surface );
		if ( canvas && card ) {
			const ink = inkOn( card, DARK_INK, LIGHT_INK );
			dark = ink === LIGHT_INK;
			surface = card;
			Object.assign( vars, {
				'--canvas': canvas,
				'--surface': card,
				'--surface-sunken': mix( ink, card, 0.06 ),
				'--surface-hover': mix( ink, card, 0.03 ),
				'--line': mix( ink, card, 0.12 ),
				'--line-strong': mix( ink, card, 0.5 ),
				'--ink': ink,
				'--ink-muted': mix( ink, card, 0.72 ),
				'--ink-subtle': mix( ink, card, 0.62 ),
				'--on-ink': card,
			} );
		}
	}

	let accent = '';
	if ( design.accent === 'custom' ) {
		accent = normalizeHex( design.accent_color );
	} else if ( design.accent === 'theme' ) {
		accent = normalizeHex( themeAccent );
	}
	if ( accent ) {
		Object.assign( vars, {
			'--max': accent,
			'--on-max': inkOn( accent, DARK_INK, WHITE ),
			'--max-strong': dark
				? readableOn( accent, WHITE, 75, surface )
				: readableOn( accent, BLACK, 80, surface ),
			'--max-soft': mix( accent, surface, dark ? 0.22 : 0.14 ),
		} );
	}

	if ( design.ladder === 'custom' ) {
		customVars( vars, design, LADDER );
	}
	if ( design.countdown === 'custom' ) {
		customVars( vars, design, COUNTDOWN );
	}

	return { dark, vars };
}
