import { useControlled } from './utils';

export default function Chips( {
	options = [],
	value,
	defaultValue,
	onChange,
	label,
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
		<div className="mmbb-chips" role="radiogroup" aria-label={ label }>
			{ options.map( ( o ) => {
				const ov = o.value !== undefined ? o.value : o;
				const ol = o.label !== undefined ? o.label : o;
				return (
					<button
						key={ ov }
						type="button"
						role="radio"
						aria-checked={ v === ov }
						className="mmbb-chip"
						onClick={ () => set( ov ) }
					>
						{ ol }
						{ o.count !== null && o.count !== undefined ? (
							<span className="mmbb-chip__count">
								{ o.count }
							</span>
						) : null }
					</button>
				);
			} ) }
		</div>
	);
}

/* ---------------- Layout & navigation ---------------- */
