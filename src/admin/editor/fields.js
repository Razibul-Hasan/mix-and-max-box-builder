import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { TextField } from '../../components';
import { toNumber } from './state';

/**
 * A text field for numbers. It keeps what the merchant types (so "1." and an empty
 * box work while editing) and reports a number, or an empty string.
 *
 * @param {Object}           props
 * @param {number|string}    props.value    Current value.
 * @param {Function}         props.onChange Receives a number or ''.
 * @param {string|undefined} props.error    Inline error.
 */
export function NumberField( { value, onChange, ...rest } ) {
	const [ text, setText ] = useState( String( value ?? '' ) );

	// Follow outside changes (Discard, the server's sanitized copy) but not our own typing.
	useEffect( () => {
		const typed = toNumber( text );
		const current = toNumber( value );
		if (
			! ( Number.isNaN( typed ) && Number.isNaN( current ) ) &&
			typed !== current
		) {
			setText( String( value ?? '' ) );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ value ] );

	return (
		<TextField
			type="text"
			inputMode="decimal"
			autoComplete="off"
			{ ...rest }
			value={ text }
			onChange={ ( event ) => {
				const raw = event.target.value;
				setText( raw );
				if ( raw.trim() === '' ) {
					onChange( '' );
				} else if ( Number.isFinite( Number( raw ) ) ) {
					onChange( Number( raw ) );
				}
			} }
		/>
	);
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
 * count. A row being edited can briefly repeat a count or be empty, so the preview
 * skips those rather than fail.
 *
 * @param {Array}    rows        Tier rows from the draft.
 * @param {Function} formatMoney Formats minor units.
 * @param {Function} toMinor     Converts a store-currency number to minor units.
 * @return {Array} List of { qty, label }.
 */
export function previewTiers( rows, formatMoney, toMinor ) {
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
