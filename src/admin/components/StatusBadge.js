import { __ } from '@wordpress/i18n';

/**
 * Word and tone for each computed box status (see Campaigns\Status).
 *
 * @return {Object} Status => { label, tone }.
 */
function statuses() {
	return {
		active: {
			label: __( 'Live', 'productboxes-mix-and-match-box-builder' ),
			tone: 'success',
		},
		ending_soon: {
			label: __(
				'Ending soon',
				'productboxes-mix-and-match-box-builder'
			),
			tone: 'warning',
		},
		scheduled: {
			label: __( 'Scheduled', 'productboxes-mix-and-match-box-builder' ),
			tone: 'info',
		},
		paused: {
			label: __( 'Paused', 'productboxes-mix-and-match-box-builder' ),
			tone: 'warning',
		},
		ended: {
			label: __( 'Ended', 'productboxes-mix-and-match-box-builder' ),
			tone: 'neutral',
		},
		draft: {
			label: __( 'Draft', 'productboxes-mix-and-match-box-builder' ),
			tone: 'neutral',
		},
	};
}

/**
 * A status word with a coloured dot. The word carries the meaning; the colour
 * only repeats it.
 *
 * @param {Object} props
 * @param {string} props.status Computed status, e.g. active or draft.
 * @param {*}      props.label  Word to show instead of the status's own.
 * @param {string} props.tone   success, warning, info or neutral.
 */
export default function StatusBadge( { status, label, tone } ) {
	const known = statuses()[ status ] || {};
	const word = label || known.label || status;
	const color = tone || known.tone || 'neutral';
	return (
		<span className={ `mmbb-app-badge is-${ color }` }>
			<span className="mmbb-app-badge__dot" aria-hidden="true" />
			{ word }
		</span>
	);
}
