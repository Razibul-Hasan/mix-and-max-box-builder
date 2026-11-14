import { useEffect, useState } from '@wordpress/element';
import { NumberControl } from '../components/wp';

/**
 * Props for a collapsed PanelBody that opens by itself when one of its fields
 * has a problem, so a link to the problem always lands on a visible field.
 *
 * @param {Object}   errors    Messages keyed by field path.
 * @param {string[]} prefixes  Field path prefixes that live in this panel.
 * @param {boolean}  startOpen Whether the panel is open before anything is wrong.
 * @return {{opened: boolean, onToggle: Function}} Props for PanelBody.
 */
export function useOpenOnError( errors, prefixes, startOpen = false ) {
	const hasError = Object.keys( errors ).some( ( key ) =>
		prefixes.some( ( prefix ) => key.startsWith( prefix ) )
	);
	const [ opened, setOpened ] = useState( startOpen || hasError );
	useEffect( () => {
		if ( hasError ) {
			setOpened( true );
		}
	}, [ hasError ] );
	return { opened, onToggle: () => setOpened( ( open ) => ! open ) };
}

/**
 * A number field built on the WordPress NumberControl. It reports a number,
 * or an empty string when the box is cleared.
 *
 * @param {Object}           props
 * @param {number|string}    props.value    Current value.
 * @param {Function}         props.onChange Receives a number or ''.
 * @param {string|undefined} props.error    Inline error, shown in place of help.
 * @param {string|undefined} props.help     Help text.
 */
export function NumberField( { value, onChange, error, help, ...rest } ) {
	return (
		<NumberControl
			min={ 0 }
			{ ...rest }
			value={ value ?? '' }
			help={ error || help }
			aria-invalid={ error ? true : undefined }
			spinControls="none"
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			onChange={ ( next ) => {
				if ( next === undefined || String( next ).trim() === '' ) {
					onChange( '' );
				} else if ( Number.isFinite( Number( next ) ) ) {
					onChange( Number( next ) );
				}
			} }
		/>
	);
}

export { tierLabel, tierList as previewTiers } from '../../shared/tiers';
