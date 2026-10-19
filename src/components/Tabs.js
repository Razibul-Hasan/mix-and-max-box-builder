import { useControlled } from './utils';

export default function Tabs( {
	tabs = [],
	value,
	defaultValue,
	onChange,
	label,
} ) {
	const [ v, set ] = useControlled(
		value,
		defaultValue !== undefined ? defaultValue : tabs[ 0 ] && tabs[ 0 ].id,
		onChange
	);
	return (
		<div className="mmbb-tabs" role="tablist" aria-label={ label }>
			{ tabs.map( ( t ) => (
				<button
					key={ t.id }
					type="button"
					role="tab"
					aria-selected={ v === t.id }
					className="mmbb-tab"
					onClick={ () => set( t.id ) }
				>
					{ t.label }
					{ t.count !== null && t.count !== undefined ? (
						<span className="mmbb-tab__count">{ t.count }</span>
					) : null }
				</button>
			) ) }
		</div>
	);
}
