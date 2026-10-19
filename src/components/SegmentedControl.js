import Icon from './Icon';
import { cx, useControlled } from './utils';

export default function SegmentedControl( {
	options = [],
	value,
	defaultValue,
	onChange,
	size = 'md',
	label,
	fullWidth,
} ) {
	const first =
		options[ 0 ] &&
		( options[ 0 ].value !== undefined
			? options[ 0 ].value
			: options[ 0 ] );
	const [ v, set ] = useControlled(
		value,
		defaultValue !== undefined ? defaultValue : first,
		onChange
	);
	return (
		<div
			className={ cx(
				'mmbb-seg',
				'mmbb-seg--' + size,
				fullWidth && 'mmbb-seg--full'
			) }
			role="radiogroup"
			aria-label={ label }
		>
			{ options.map( ( o ) => {
				const ov = o.value !== undefined ? o.value : o;
				const ol = o.label !== undefined ? o.label : o;
				return (
					<button
						key={ ov }
						type="button"
						role="radio"
						aria-checked={ v === ov }
						onClick={ () => set( ov ) }
					>
						{ o.icon ? <Icon name={ o.icon } size={ 16 } /> : null }
						{ ol }
					</button>
				);
			} ) }
		</div>
	);
}
