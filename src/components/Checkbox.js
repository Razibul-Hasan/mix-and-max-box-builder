import { useEffect, useRef } from '@wordpress/element';
import Icon from './Icon';
import { cx } from './utils';

export default function Checkbox( {
	checked,
	defaultChecked,
	onChange,
	label,
	description,
	indeterminate,
	disabled,
	className,
	...rest
} ) {
	const ref = useRef( null );
	useEffect( () => {
		if ( ref.current ) {
			ref.current.indeterminate = !! indeterminate;
		}
	}, [ indeterminate ] );
	return (
		<label
			className={ cx(
				'mmbb-check',
				disabled && 'is-disabled',
				className
			) }
		>
			<input
				ref={ ref }
				type="checkbox"
				checked={ checked }
				defaultChecked={ defaultChecked }
				disabled={ disabled }
				onChange={ ( e ) =>
					onChange && onChange( e.target.checked, e )
				}
				{ ...rest }
			/>
			<span className="mmbb-check__box" aria-hidden="true">
				<Icon name="check" size={ 14 } strokeWidth={ 2.75 } />
			</span>
			{ label || description ? (
				<span className="mmbb-check__text">
					{ label }
					{ description ? <small>{ description }</small> : null }
				</span>
			) : null }
		</label>
	);
}
