import { useId } from '@wordpress/element';
import Icon from './Icon';
import { cx } from './utils';

export default function SelectField( {
	label,
	help,
	options = [],
	id,
	className,
	...rest
} ) {
	const auto = useId();
	const fid = id || auto;
	return (
		<div className={ cx( 'mmbb-field', className ) }>
			{ label ? (
				<label className="mmbb-field__label" htmlFor={ fid }>
					{ label }
				</label>
			) : null }
			<div className="mmbb-input mmbb-input--select">
				<select
					id={ fid }
					aria-describedby={ help ? fid + '-desc' : undefined }
					{ ...rest }
				>
					{ options.map( ( o ) => {
						const v = typeof o === 'string' ? o : o.value;
						const l = typeof o === 'string' ? o : o.label;
						return (
							<option key={ v } value={ v }>
								{ l }
							</option>
						);
					} ) }
				</select>
				<Icon name="chevronDown" size={ 16 } />
			</div>
			{ help ? (
				<p id={ fid + '-desc' } className="mmbb-field__help">
					{ help }
				</p>
			) : null }
		</div>
	);
}
