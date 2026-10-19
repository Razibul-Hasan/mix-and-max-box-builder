import { __, _x, sprintf } from '@wordpress/i18n';
import { toMinor } from '../shared/pricing';

const OFFSET = /^([+-])(\d{2}):?(\d{2})$/;

/**
 * Format a date as "Nov 1" (adds the year when it is not this year) on the store's
 * clock. `timezone` is an IANA name or a fixed offset such as +02:00.
 *
 * @param {string} iso              ISO 8601 date-time.
 * @param {Object} options          Display options.
 * @param {string} options.locale   BCP 47 locale such as en-US.
 * @param {string} options.timezone IANA zone name or a fixed offset.
 * @param {Date}   options.now      Current time; sets which year is "this year".
 * @return {string} Short date, or an empty string for an invalid date.
 */
export function formatShortDate( iso, { locale, timezone, now = new Date() } ) {
	const date = new Date( iso );
	if ( Number.isNaN( date.getTime() ) ) {
		return '';
	}
	let zone = timezone || 'UTC';
	let shifted = date;
	const offset = OFFSET.exec( zone );
	if ( offset ) {
		const minutes =
			( offset[ 1 ] === '-' ? -1 : 1 ) *
			( Number( offset[ 2 ] ) * 60 + Number( offset[ 3 ] ) );
		shifted = new Date( date.getTime() + minutes * 60000 );
		zone = 'UTC';
	}
	const fields = { month: 'short', day: 'numeric' };
	const build = ( tz, extra ) => {
		try {
			return new Intl.DateTimeFormat( locale, {
				...fields,
				...extra,
				timeZone: tz,
			} );
		} catch ( e ) {
			return new Intl.DateTimeFormat( 'en-US', {
				...fields,
				...extra,
				timeZone: 'UTC',
			} );
		}
	};
	const year = build( zone, { year: 'numeric', month: 'numeric' } )
		.formatToParts( shifted )
		.find( ( part ) => part.type === 'year' );
	const thisYear = String( now.getUTCFullYear() );
	const showYear = year && year.value !== thisYear;
	return build( zone, showYear ? { year: 'numeric' } : {} ).format( shifted );
}

export function formatCount( value, locale ) {
	try {
		return new Intl.NumberFormat( locale ).format( value || 0 );
	} catch ( e ) {
		return String( value || 0 );
	}
}

// Conversion arrives as a percentage number; zero means nothing to report yet.
export function formatPercent( value, locale ) {
	if ( ! value || value <= 0 ) {
		return '\u2014';
	}
	let text;
	try {
		text = new Intl.NumberFormat( locale, {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1,
		} ).format( value );
	} catch ( e ) {
		text = value.toFixed( 1 );
	}
	return text + '%';
}

/**
 * "Tiered mix · up to 12", "Fixed box · 4 / 6", "Bundle price · any 3 for $18".
 *
 * @param {Object}   config      Campaign config.
 * @param {Function} formatMoney Formats minor units.
 * @param {number}   decimals    Store currency decimals.
 * @return {string} Summary line.
 */
export function typeSummary( config, formatMoney, decimals ) {
	if ( config.type === 'fixed' ) {
		const sizes = ( config.sizes || [] ).map( ( size ) => size.qty );
		const label = __( 'Fixed box', 'mix-and-max-box-builder' );
		return sizes.length ? label + ' \u00b7 ' + sizes.join( ' / ' ) : label;
	}
	if ( config.type === 'bundle' ) {
		const bundle = config.bundle || {};
		return sprintf(
			/* translators: 1: Number of items in the bundle, 2: Bundle price. */
			__(
				'Bundle price \u00b7 any %1$d for %2$s',
				'mix-and-max-box-builder'
			),
			bundle.qty || 0,
			formatMoney( toMinor( bundle.price || 0, decimals ) )
		);
	}
	return sprintf(
		/* translators: %d: Largest number of items in the box. */
		__( 'Tiered mix \u00b7 up to %d', 'mix-and-max-box-builder' ),
		( config.box && config.box.capacity ) || 0
	);
}

// "10 / 15 / 25% off" when every tier is a percentage; otherwise empty.
export function tierSummary( config ) {
	const tiers = config.tiers || [];
	if (
		tiers.length === 0 ||
		tiers.some( ( t ) => t.discount_type !== 'percent' )
	) {
		return '';
	}
	return sprintf(
		/* translators: %s: Percentages joined with slashes, such as 10 / 15 / 25. */
		__( '%s%% off', 'mix-and-max-box-builder' ),
		tiers.map( ( t ) => t.value ).join( ' / ' )
	);
}

export function typeLabel( type ) {
	const labels = {
		tiered: __( 'Tiered mix', 'mix-and-max-box-builder' ),
		fixed: __( 'Fixed box', 'mix-and-max-box-builder' ),
		bundle: __( 'Bundle price', 'mix-and-max-box-builder' ),
	};
	return labels[ type ] || type;
}

export function scheduleLabel( campaign, options ) {
	const schedule = ( campaign.config && campaign.config.schedule ) || {};
	const start = schedule.start
		? formatShortDate( schedule.start, options )
		: '';
	const end = schedule.end ? formatShortDate( schedule.end, options ) : '';
	if ( start && end ) {
		return sprintf(
			/* translators: 1: Start date, 2: End date. */
			_x(
				'%1$s \u2013 %2$s',
				'schedule range',
				'mix-and-max-box-builder'
			),
			start,
			end
		);
	}
	if ( start ) {
		return sprintf(
			/* translators: %s: Start date. */
			__( 'Starts %s', 'mix-and-max-box-builder' ),
			start
		);
	}
	if ( end ) {
		return sprintf(
			/* translators: %s: End date. */
			__( 'Until %s', 'mix-and-max-box-builder' ),
			end
		);
	}
	return campaign.status === 'draft'
		? __( 'Not scheduled', 'mix-and-max-box-builder' )
		: __( 'Always on', 'mix-and-max-box-builder' );
}

// Every status pairs a word with its colour.
export function statusInfo( status ) {
	const info = {
		draft: {
			tone: 'neutral',
			label: __( 'Draft', 'mix-and-max-box-builder' ),
		},
		scheduled: {
			tone: 'info',
			label: __( 'Scheduled', 'mix-and-max-box-builder' ),
		},
		active: {
			tone: 'success',
			label: __( 'Active', 'mix-and-max-box-builder' ),
		},
		ending_soon: {
			tone: 'warning',
			label: __( 'Ending soon', 'mix-and-max-box-builder' ),
		},
		ended: {
			tone: 'neutral',
			label: __( 'Ended', 'mix-and-max-box-builder' ),
		},
		paused: {
			tone: 'neutral',
			label: __( 'Paused', 'mix-and-max-box-builder' ),
		},
	};
	return info[ status ] || info.draft;
}

export const isLive = ( status ) =>
	status === 'active' || status === 'ending_soon';

// Statuses where "pause" means something.
export const canPause = ( status ) =>
	isLive( status ) || status === 'scheduled';

/**
 * Where the builder sits: a page path, the shortcode, or nowhere.
 *
 * @param {Object} placement The `placement` object from the REST API.
 * @return {{kind: string, text: string}} Placement display info.
 */
export function placementInfo( placement ) {
	if ( ! placement || placement.method === 'none' ) {
		return {
			kind: 'none',
			text: __( 'Not placed', 'mix-and-max-box-builder' ),
		};
	}
	if ( placement.method === 'shortcode' ) {
		return { kind: 'code', text: placement.shortcode };
	}
	let path = placement.page_title || '';
	try {
		path = new URL( placement.page_url ).pathname || path;
	} catch ( e ) {
		// Keep the page title.
	}
	return { kind: 'page', text: path };
}
