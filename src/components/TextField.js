import { useId } from '@wordpress/element';
import Icon from './Icon';
import { cx } from './utils';

export default function TextField( {
	label,
	help,
	error,
	prefix,
	suffix,
	multiline,
	id,
	className,
	rows,
	...rest
} ) {
	const auto = useId();
	const fid = id || auto;
	const descId = help || error ? fid + '-desc' : undefined;
	const Tag = multiline ? 'textarea' : 'input';
	return (
		<div className={ cx( 'mmbb-field', error && 'has-error', className ) }>
			{ label ? (
				<label className="mmbb-field__label" htmlFor={ fid }>
					{ label }
				</label>
			) : null }
			<div className="mmbb-input">
				{ prefix ? (
					<span className="mmbb-input__affix">
						{ typeof prefix === 'string' &&
						Icon.names.includes( prefix ) ? (
							<Icon name={ prefix } size={ 18 } />
						) : (
							prefix
						) }
					</span>
				) : null }
				<Tag
					id={ fid }
					aria-invalid={ error ? true : undefined }
					aria-describedby={ descId }
					rows={ multiline ? rows || 3 : undefined }
					{ ...rest }
				/>
				{ suffix ? (
					<span className="mmbb-input__affix">{ suffix }</span>
				) : null }
			</div>
			{ error || help ? (
				<p
					id={ descId }
					className={ cx( 'mmbb-field__help', error && 'is-error' ) }
				>
					{ error ? (
						<Icon name="alert" size={ 14 } strokeWidth={ 2 } />
					) : null }
					{ error || help }
				</p>
			) : null }
		</div>
	);
}
