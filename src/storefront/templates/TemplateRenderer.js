import Bold from './Bold';
import Clean from './Clean';
import Compact from './Compact';
import Editorial from './Editorial';
import Gift from './Gift';
import Night from './Night';
import Pastel from './Pastel';
import Split from './Split';
import Spotlight from './Spotlight';
import Steps from './Steps';

const TEMPLATES = {
	spotlight: Spotlight,
	clean: Clean,
	steps: Steps,
	gift: Gift,
	bold: Bold,
	pastel: Pastel,
	editorial: Editorial,
	night: Night,
	split: Split,
	compact: Compact,
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
