import { __, _n, _x, sprintf } from '@wordpress/i18n';
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
		const label = __(
			'Fixed box',
			'productboxes-mix-and-match-box-builder'
		);
		return sizes.length ? label + ' \u00b7 ' + sizes.join( ' / ' ) : label;
	}
	if ( config.type === 'bundle' ) {
		const bundle = config.bundle || {};
		return sprintf(
			/* translators: 1: Number of items in the bundle, 2: Bundle price. */
			__(
				'Bundle price \u00b7 any %1$d for %2$s',
				'productboxes-mix-and-match-box-builder'
			),
			bundle.qty || 0,
			formatMoney( toMinor( bundle.price || 0, decimals ) )
		);
	}
	return sprintf(
		/* translators: %d: Largest number of items in the box. */
		__(
			'Tiered mix \u00b7 up to %d',
			'productboxes-mix-and-match-box-builder'
		),
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
		__( '%s%% off', 'productboxes-mix-and-match-box-builder' ),
		tiers.map( ( t ) => t.value ).join( ' / ' )
	);
}

export function typeLabel( type ) {
	const labels = {
		tiered: __( 'Tiered mix', 'productboxes-mix-and-match-box-builder' ),
		fixed: __( 'Fixed box', 'productboxes-mix-and-match-box-builder' ),
		bundle: __( 'Bundle price', 'productboxes-mix-and-match-box-builder' ),
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
				'productboxes-mix-and-match-box-builder'
			),
			start,
			end
		);
	}
	if ( start ) {
		return sprintf(
			/* translators: %s: Start date. */
			__( 'Starts %s', 'productboxes-mix-and-match-box-builder' ),
			start
		);
	}
	if ( end ) {
		return sprintf(
			/* translators: %s: End date. */
			__( 'Until %s', 'productboxes-mix-and-match-box-builder' ),
			end
		);
	}
	return campaign.status === 'draft'
		? __( 'Not scheduled', 'productboxes-mix-and-match-box-builder' )
		: __( 'Always on', 'productboxes-mix-and-match-box-builder' );
}

// Every status pairs a word with its colour.
export function statusInfo( status ) {
	const info = {
		draft: {
			tone: 'neutral',
			label: __( 'Draft', 'productboxes-mix-and-match-box-builder' ),
		},
		scheduled: {
			tone: 'info',
			label: __( 'Scheduled', 'productboxes-mix-and-match-box-builder' ),
		},
		active: {
			tone: 'success',
			label: __( 'Active', 'productboxes-mix-and-match-box-builder' ),
		},
		ending_soon: {
			tone: 'warning',
			label: __(
				'Ending soon',
				'productboxes-mix-and-match-box-builder'
			),
		},
		ended: {
			tone: 'neutral',
			label: __( 'Ended', 'productboxes-mix-and-match-box-builder' ),
		},
		paused: {
			tone: 'neutral',
			label: __( 'Paused', 'productboxes-mix-and-match-box-builder' ),
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
			text: __( 'Not placed', 'productboxes-mix-and-match-box-builder' ),
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

/**
 * The name of each way a discount can work, as the Create a box modal says it.
 *
 * @param {string} type tiered, fixed or bundle.
 * @return {string} Name.
 */
export function boxTypeTitle( type ) {
	const titles = {
		tiered: __(
			'Bigger box, bigger discount',
			'productboxes-mix-and-match-box-builder'
		),
		fixed: __(
			'Pick a box size',
			'productboxes-mix-and-match-box-builder'
		),
		bundle: __(
			'Set price bundle',
			'productboxes-mix-and-match-box-builder'
		),
	};
	return titles[ type ] || titles.tiered;
}

/**
 * Line under a box's name in the Boxes list: "Bigger box, bigger discount · up to 12",
 * "Pick a box size · 4 / 6", "Bundle price · 3 for $45.00".
 *
 * @param {Object}   config      Box config.
 * @param {Function} formatMoney Formats minor units.
 * @param {number}   decimals    Store currency decimals.
 * @return {string} Summary line.
 */
export function boxSummary( config, formatMoney, decimals ) {
	if ( config.type === 'fixed' ) {
		const sizes = ( config.sizes || [] ).map( ( size ) => size.qty );
		const title = boxTypeTitle( 'fixed' );
		return sizes.length ? title + ' \u00b7 ' + sizes.join( ' / ' ) : title;
	}
	if ( config.type === 'bundle' ) {
		const bundle = config.bundle || {};
		if ( ! bundle.price || bundle.price <= 0 ) {
			return sprintf(
				/* translators: %d: Number of items in the bundle. */
				__(
					'Bundle price \u00b7 %d items',
					'productboxes-mix-and-match-box-builder'
				),
				bundle.qty || 0
			);
		}
		return sprintf(
			/* translators: 1: Number of items in the bundle, 2: Bundle price. */
			__(
				'Bundle price \u00b7 %1$d for %2$s',
				'productboxes-mix-and-match-box-builder'
			),
			bundle.qty || 0,
			formatMoney( toMinor( bundle.price, decimals ) )
		);
	}
	return sprintf(
		/* translators: %d: Largest number of items in the box. */
		__(
			'Bigger box, bigger discount \u00b7 up to %d',
			'productboxes-mix-and-match-box-builder'
		),
		( config.box && config.box.capacity ) || 0
	);
}

/**
 * Line under a box's name on Home: "Up to 12 items · 10 / 15 / 25% off",
 * "Sizes 4 / 6", "3 items for one price".
 *
 * @param {Object} config Box config.
 * @return {string} Detail line.
 */
export function boxDetails( config ) {
	if ( config.type === 'fixed' ) {
		const sizes = ( config.sizes || [] ).map( ( size ) => size.qty );
		return sizes.length
			? sprintf(
					/* translators: %s: Box sizes joined with slashes, such as 4 / 6. */
					__( 'Sizes %s', 'productboxes-mix-and-match-box-builder' ),
					sizes.join( ' / ' )
			  )
			: boxTypeTitle( 'fixed' );
	}
	if ( config.type === 'bundle' ) {
		const qty = ( config.bundle && config.bundle.qty ) || 0;
		return sprintf(
			/* translators: %d: Number of items in the bundle. */
			_n(
				'%d item for one price',
				'%d items for one price',
				qty,
				'productboxes-mix-and-match-box-builder'
			),
			qty
		);
	}
	const capacity = ( config.box && config.box.capacity ) || 0;
	const upTo = sprintf(
		/* translators: %d: Largest number of items in the box. */
		_n(
			'Up to %d item',
			'Up to %d items',
			capacity,
			'productboxes-mix-and-match-box-builder'
		),
		capacity
	);
	const tiers = tierSummary( config );
	return tiers ? upTo + ' \u00b7 ' + tiers : upTo;
}

/**
 * Where a box is shown: the page path, or nothing when it is on no page yet.
 *
 * @param {Object} placement The `placement` object from the REST API.
 * @return {string} Path such as /holiday-treat-box/, or an empty string.
 */
export function shownOnPath( placement ) {
	// A saved page that no longer holds the block or shortcode doesn't count.
	if ( ! placement || placement.method === 'none' || ! placement.page_url ) {
		return '';
	}
	try {
		return new URL( placement.page_url ).pathname || placement.page_url;
	} catch ( e ) {
		return placement.page_title || placement.page_url;
	}
}
