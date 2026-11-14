/**
 * Shared semantic frame. Template-specific structure is supplied by scoped CSS.
 *
 * @param {Object} props          Frame props.
 * @param {string} props.slug     Template slug.
 * @param {Object} props.children Shared builder UI.
 */
export default function TemplateFrame( { slug, children } ) {
	return (
		<div className={ `mmbb-template mmbb-template--${ slug }` }>
			{ children }
		</div>
	);
}
