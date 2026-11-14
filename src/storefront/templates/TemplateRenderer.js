import Bold from './Bold';
import Clean from './Clean';
import Gift from './Gift';
import Spotlight from './Spotlight';
import Steps from './Steps';

const TEMPLATES = {
	spotlight: Spotlight,
	clean: Clean,
	steps: Steps,
	gift: Gift,
	bold: Bold,
};

/**
 * Select a storefront template without changing the shared box state contract.
 *
 * @param {Object} props          Renderer props shared by all templates.
 * @param {string} props.template Requested template slug.
 */
export default function TemplateRenderer( { template, ...props } ) {
	const Component = TEMPLATES[ template ] || Spotlight;
	return <Component { ...props } />;
}
