import Icon from './Icon';

export default function EmptyState( {
	icon = 'box',
	title,
	description,
	action,
	secondaryAction,
} ) {
	return (
		<div className="mmbb-empty">
			<span className="mmbb-empty__art" aria-hidden="true">
				<span className="mmbb-empty__back" />
				<span className="mmbb-empty__front">
					<Icon name={ icon } size={ 32 } strokeWidth={ 2 } />
				</span>
			</span>
			{ title ? <h3 className="mmbb-empty__title">{ title }</h3> : null }
			{ description ? (
				<p className="mmbb-empty__desc">{ description }</p>
			) : null }
			{ action || secondaryAction ? (
				<div className="mmbb-empty__actions">
					{ action }
					{ secondaryAction }
				</div>
			) : null }
		</div>
	);
}
