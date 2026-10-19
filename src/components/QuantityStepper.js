import { __ } from '@wordpress/i18n';
import Icon from './Icon';
import { cx, useControlled } from './utils';

export default function QuantityStepper( {
	value,
	defaultValue = 0,
	min = 0,
	max = 99,
	onChange,
	size = 'md',
	fullWidth,
	label = __( 'Quantity', 'mix-and-max-box-builder' ),
	className,
} ) {
	const [ v, set ] = useControlled( value, defaultValue, onChange );
	const clamp = ( n ) => set( Math.max( min, Math.min( max, n ) ) );
	return (
		<div
			className={ cx(
				'mmbb-stepper',
				'mmbb-stepper--' + size,
				fullWidth && 'mmbb-stepper--full',
				className
			) }
			role="group"
			aria-label={ label }
		>
			<button
				type="button"
				onClick={ () => clamp( v - 1 ) }
				disabled={ v <= min }
				aria-label={
					v === 1 && min === 0
						? __( 'Remove', 'mix-and-max-box-builder' )
						: __( 'Decrease', 'mix-and-max-box-builder' )
				}
			>
				<Icon
					name={ v === 1 && min === 0 ? 'trash' : 'minus' }
					size={ 16 }
					strokeWidth={ 2 }
				/>
			</button>
			<output aria-live="polite">{ v }</output>
			<button
				type="button"
				onClick={ () => clamp( v + 1 ) }
				disabled={ v >= max }
				aria-label={ __( 'Increase', 'mix-and-max-box-builder' ) }
			>
				<Icon name="plus" size={ 16 } strokeWidth={ 2 } />
			</button>
		</div>
	);
}
