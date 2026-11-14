/**
 * Shared semantic frame for templates that use the engine's standard structure.
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
