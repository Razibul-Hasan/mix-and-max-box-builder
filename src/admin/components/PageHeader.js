/**
 * Page title, a one-line description and the page's actions on the right.
 *
 * @param {Object} props
 * @param {*}      props.title       Heading text (rendered as the page h1).
 * @param {*}      props.description Line under the title.
 * @param {*}      props.actions     Buttons and controls on the right.
 */
export default function PageHeader( { title, description, actions } ) {
	return (
		<div className="mmbb-app-page-head">
			<div className="mmbb-app-page-head__text">
				<h1 className="mmbb-app-page-head__title">{ title }</h1>
				{ description ? (
					<p className="mmbb-app-page-head__desc">{ description }</p>
				) : null }
			</div>
			{ actions ? (
				<div className="mmbb-app-page-head__actions">{ actions }</div>
			) : null }
		</div>
	);
}
