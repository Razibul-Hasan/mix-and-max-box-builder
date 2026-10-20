import { useEffect, useState } from '@wordpress/element';
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

export { tierLabel, tierList as previewTiers } from '../../shared/tiers';
