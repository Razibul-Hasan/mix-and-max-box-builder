/**
 * One key number: label, value and an optional change or note under it.
 *
 * @param {Object} props
 * @param {*}      props.label Short name of the number.
 * @param {*}      props.value The number, already formatted.
 * @param {*}      props.delta Change against the previous period, already formatted.
 * @param {string} props.tone  Tone of the change: positive, negative or neutral.
 * @param {*}      props.note  Muted line under the value.
 */
export default function StatCard( {
	label,
	value,
	delta,
	tone = 'positive',
	note,
} ) {
	return (
		<div className="mmbb-app-stat">
			<span className="mmbb-app-stat__label">{ label }</span>
			<span className="mmbb-app-stat__value">{ value }</span>
			{ delta ? (
				<span className={ `mmbb-app-stat__delta is-${ tone }` }>
					{ delta }
				</span>
			) : null }
			{ note ? (
				<span className="mmbb-app-stat__note">{ note }</span>
			) : null }
		</div>
	);
}

/**
 * A card that lays StatCards side by side with a rule between them.
 *
 * @param {Object} props
 * @param {string} props.label    Accessible name of the group.
 * @param {*}      props.children StatCard elements.
 */
export function StatGroup( { label, children } ) {
	return (
		<section className="mmbb-app-stats" aria-label={ label }>
			{ children }
		</section>
	);
}
