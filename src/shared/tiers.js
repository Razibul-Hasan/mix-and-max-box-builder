import { __, sprintf } from '@wordpress/i18n';

function toNumber( value ) {
	if ( typeof value === 'number' ) {
		return value;
	}
	if ( typeof value !== 'string' || value.trim() === '' ) {
		return NaN;
	}
	return Number( value );
}

/**
 * The label a shopper sees for one tier or size, such as "15% off".
 *
 * @param {Object}   row         { discount_type, value }.
 * @param {Function} formatMoney Formats minor units.
 * @param {Function} toMinor     Converts a store-currency number to minor units.
 * @return {string} Label.
 */
export function tierLabel( row, formatMoney, toMinor ) {
	const value = toNumber( row.value );
	if ( ! Number.isFinite( value ) ) {
		return '';
	}
	if ( row.discount_type === 'percent' ) {
		return sprintf(
			/* translators: %s: Discount percentage. */
			__( '%s%% off', 'mix-and-max-box-builder' ),
			String( value )
		);
	}
	if ( row.discount_type === 'fixed_amount' ) {
		return sprintf(
			/* translators: %s: Discount amount with currency. */
			__( '%s off', 'mix-and-max-box-builder' ),
			formatMoney( toMinor( value ) )
		);
	}
	return sprintf(
		/* translators: %s: Price of the whole box with currency. */
		__( '%s box', 'mix-and-max-box-builder' ),
		formatMoney( toMinor( value ) )
	);
}

/**
 * Tiers as the storefront components take them: sorted, with one entry per item
 * count. A row being edited can briefly repeat a count or be empty, so those are
 * skipped rather than failing.
 *
 * @param {Array}    rows        Tier rows.
 * @param {Function} formatMoney Formats minor units.
 * @param {Function} toMinor     Converts a store-currency number to minor units.
 * @return {Array} List of { qty, label }.
 */
export function tierList( rows, formatMoney, toMinor ) {
	const seen = new Set();
	return rows
		.map( ( row ) => ( {
			qty: toNumber( row.qty ),
			label: tierLabel( row, formatMoney, toMinor ),
		} ) )
		.filter( ( tier ) => {
			if ( ! Number.isFinite( tier.qty ) || seen.has( tier.qty ) ) {
				return false;
			}
			seen.add( tier.qty );
			return true;
		} )
		.sort( ( a, b ) => a.qty - b.qty );
}

/**
 * The words on a box size's sticker.
 *
 * @param {string} tag `popular`, `best_value` or empty.
 * @return {string|undefined} Label.
 */
export function sizeTag( tag ) {
	if ( tag === 'popular' ) {
		return __( 'Most popular', 'mix-and-max-box-builder' );
	}
	return tag === 'best_value'
		? __( 'Best value', 'mix-and-max-box-builder' )
		: undefined;
}
