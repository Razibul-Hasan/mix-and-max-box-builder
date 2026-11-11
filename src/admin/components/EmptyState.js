import { Icon } from '@wordpress/icons';

/**
 * What a screen shows when it has nothing to list yet.
 *
 * @param {Object} props
 * @param {Object} props.icon     An icon from @wordpress/icons.
 * @param {*}      props.title    One short line.
 * @param {*}      props.children Explanation under the title.
 * @param {*}      props.actions  Buttons that start the next step.
 */
export default function EmptyState( { icon, title, children, actions } ) {
	return (
		<div className="mmbb-app-empty">
			{ icon ? (
				<span className="mmbb-app-empty__icon" aria-hidden="true">
					<Icon icon={ icon } size={ 32 } />
				</span>
			) : null }
			<h2 className="mmbb-app-empty__title">{ title }</h2>
			{ children ? (
				<div className="mmbb-app-empty__text">{ children }</div>
			) : null }
			{ actions ? (
				<div className="mmbb-app-empty__actions">{ actions }</div>
			) : null }
		</div>
	);
}
