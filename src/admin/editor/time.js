const OFFSET = /^([+-])(\d{2}):?(\d{2})$/;
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const pad = ( n ) => String( n ).padStart( 2, '0' );

// A fixed offset such as +02:00 in minutes, or null for an IANA name.
function fixedOffset( zone ) {
	const match = OFFSET.exec( zone || '' );
	if ( ! match ) {
		return null;
	}
	return (
		( match[ 1 ] === '-' ? -1 : 1 ) *
		( Number( match[ 2 ] ) * 60 + Number( match[ 3 ] ) )
	);
}

// Minutes the zone is ahead of UTC at a given instant.
function offsetAt( ms, zone ) {
	const fixed = fixedOffset( zone );
	if ( fixed !== null ) {
		return fixed;
	}
	let parts;
	try {
		parts = new Intl.DateTimeFormat( 'en-US', {
			timeZone: zone || 'UTC',
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
		} ).formatToParts( new Date( ms ) );
	} catch ( e ) {
		return 0;
	}
	const get = ( type ) =>
		Number( parts.find( ( part ) => part.type === type ).value );
	const asUtc = Date.UTC(
		get( 'year' ),
		get( 'month' ) - 1,
		get( 'day' ),
		get( 'hour' ) % 24,
		get( 'minute' ),
		get( 'second' )
	);
	return Math.round( ( asUtc - Math.floor( ms / 1000 ) * 1000 ) / 60000 );
}

/**
 * Turn a stored UTC date into the value of a datetime-local input, on the
 * store's clock.
 *
 * @param {string|null} iso  ISO 8601 UTC date, or null.
 * @param {string}      zone IANA zone name or fixed offset such as +02:00.
 * @return {string} `YYYY-MM-DDTHH:mm`, or an empty string.
 */
export function utcToLocalInput( iso, zone ) {
	if ( ! iso ) {
		return '';
	}
	const ms = new Date( iso ).getTime();
	if ( Number.isNaN( ms ) ) {
		return '';
	}
	const shifted = new Date( ms + offsetAt( ms, zone ) * 60000 );
	return (
		shifted.getUTCFullYear() +
		'-' +
		pad( shifted.getUTCMonth() + 1 ) +
		'-' +
		pad( shifted.getUTCDate() ) +
		'T' +
		pad( shifted.getUTCHours() ) +
		':' +
		pad( shifted.getUTCMinutes() )
	);
}

/**
 * Turn a datetime-local value, read on the store's clock, into UTC for storage.
 *
 * @param {string} value `YYYY-MM-DDTHH:mm`.
 * @param {string} zone  IANA zone name or fixed offset.
 * @return {string|null} `YYYY-MM-DDTHH:mm:ssZ`, or null for an empty or invalid value.
 */
export function localInputToUtc( value, zone ) {
	const match = LOCAL.exec( value || '' );
	if ( ! match ) {
		return null;
	}
	const wall = Date.UTC(
		Number( match[ 1 ] ),
		Number( match[ 2 ] ) - 1,
		Number( match[ 3 ] ),
		Number( match[ 4 ] ),
		Number( match[ 5 ] )
	);
	if ( Number.isNaN( wall ) ) {
		return null;
	}
	// Two passes settle times next to a daylight-saving change.
	let ms = wall - offsetAt( wall, zone ) * 60000;
	ms = wall - offsetAt( ms, zone ) * 60000;
	return new Date( ms ).toISOString().replace( /\.\d{3}Z$/, 'Z' );
}
