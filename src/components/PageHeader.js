import Icon from './Icon';

export default function PageHeader( {
	title,
	subtitle,
	backLabel,
	onBack,
	backHref,
	badge,
	actions,
} ) {
	return (
		<div className="mmbb-page-head">
			<div className="mmbb-page-head__text">
				{ backLabel && backHref ? (
					<a className="mmbb-page-head__back" href={ backHref }>
						<Icon name="arrowLeft" size={ 16 } />
						{ backLabel }
					</a>
				) : backLabel ? (
					<button
						type="button"
						className="mmbb-page-head__back"
						onClick={ onBack }
					>
						<Icon name="arrowLeft" size={ 16 } />
						{ backLabel }
					</button>
				) : null }
				<h1 className="mmbb-page-head__title">
					{ title }
					{ badge || null }
				</h1>
				{ subtitle ? (
					<p className="mmbb-page-head__sub">{ subtitle }</p>
				) : null }
			</div>
			{ actions ? (
				<div className="mmbb-page-head__actions">{ actions }</div>
			) : null }
		</div>
	);
}
