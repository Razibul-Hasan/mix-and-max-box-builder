import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { TextField } from '../../components';
import { normalizeHex } from '../../shared/colors';

const FULL_HEX = /^#?[0-9a-f]{6}$/i;

/**
 * A colour picker swatch next to a hex text box. Only valid #rrggbb values reach onChange.
 *
 * @param {Object}   props
 * @param {string}   props.label    Field label.
 * @param {string}   props.value    Current colour, #rrggbb.
 * @param {Function} props.onChange Called with the new #rrggbb.
 * @param {string}   [props.help]   Help text.
 */
export default function ColorField( { label, value, onChange, help } ) {
	const [ text, setText ] = useState( value );
	useEffect( () => setText( value ), [ value ] );

	return (
		<TextField
			label={ label }
			help={ help }
			value={ text }
			maxLength={ 7 }
			spellCheck={ false }
			autoComplete="off"
			prefix={
				<input
					type="color"
					className="mmbb-color__swatch"
					value={ value }
					aria-label={ sprintf(
						/* translators: %s: Name of the colour setting, such as "Accent color". */
						__(
							'Pick %s',
							'productboxes-mix-and-match-box-builder'
						),
						label
					) }
					onChange={ ( event ) =>
						onChange( normalizeHex( event.target.value ) )
					}
				/>
			}
			onChange={ ( event ) => {
				setText( event.target.value );
				// Short forms like #abc wait for blur, so typing can go on to six digits.
				if ( FULL_HEX.test( event.target.value ) ) {
					onChange( normalizeHex( event.target.value ) );
				}
			} }
			onBlur={ () => {
				const hex = normalizeHex( text );
				if ( hex ) {
					onChange( hex );
				}
				setText( hex || value );
			} }
		/>
	);
}
