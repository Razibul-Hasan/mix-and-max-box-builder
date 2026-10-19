import { useId } from '@wordpress/element';
import { cx, useControlled } from './utils';

export default function Toggle( {
	checked,
	defaultChecked = false,
	onChange,
	label,
	description,
	disabled,
	id,
} ) {
	const auto = useId();
	const fid = id || auto;
	const [ on, setOn ] = useControlled( checked, defaultChecked, onChange );
	return (
		<div className={ cx( 'mmbb-toggle', disabled && 'is-disabled' ) }>
			{ label || description ? (
				<div className="mmbb-toggle__text">
					{ label ? (
						<label
							id={ fid + '-l' }
							htmlFor={ fid }
							className="mmbb-toggle__label"
						>
							{ label }
						</label>
					) : null }
					{ description ? (
						<p id={ fid + '-d' } className="mmbb-toggle__desc">
							{ description }
						</p>
					) : null }
				</div>
			) : null }
			<button
				type="button"
				role="switch"
				id={ fid }
				aria-checked={ !! on }
				disabled={ disabled }
				aria-labelledby={ label ? fid + '-l' : undefined }
				aria-describedby={ description ? fid + '-d' : undefined }
				className="mmbb-toggle__switch"
				onClick={ () => setOn( ! on ) }
			>
				<span className="mmbb-toggle__knob" />
			</button>
		</div>
	);
}
