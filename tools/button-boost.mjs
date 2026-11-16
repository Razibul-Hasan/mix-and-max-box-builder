/**
 * Builds build/button-boost.css: the builder's button rules again, with their `.mmbb-root`
 * repeated so they outrank a theme's high-specificity `button:not(...)` styles.
 *
 * Some themes (Elastra) style every `button:not(.a):not(.b):not(.c)` with a background,
 * border, padding, radius, size and shadow. That selector weighs 0,4,1, which beats the
 * builder's own 0,2,0 rules, so Add to box turned theme-green. Plain rules cannot be
 * out-weighed from a theme integration without knowing every value, so this copies the
 * builder's own button rules, unchanged apart from the extra weight. A theme integration
 * loads the file only where it is needed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
// eslint-disable-next-line import/no-extraneous-dependencies -- ships with wp-scripts.
import postcss from 'postcss';

const SOURCES = [ 'build/components.css', 'build/storefront.css' ];
const OUTPUT = 'build/button-boost.css';
// Rules that style a button, a stepper, a chip or a slot's remove button.
const BUTTONISH =
	/\.mmbb-(btn|stepper|qty|chip|slot__remove)\b|(^|[\s>+~])button\b/;
const ROOT = '.mmbb-root';
// Six: Elastra's selector weighs 0,5,1 (button plus five :not() classes).
const BOOSTED = ROOT.repeat( 6 );

const boost = ( selector ) =>
	BUTTONISH.test( selector ) && selector.includes( ROOT + ' ' )
		? selector.replace( ROOT + ' ', BOOSTED + ' ' )
		: null;

const out = postcss.root();

for ( const file of SOURCES ) {
	const css = postcss.parse( readFileSync( file, 'utf8' ) );
	css.walkRules( ( rule ) => {
		if (
			rule.parent?.type === 'atrule' &&
			/keyframes$/i.test( rule.parent.name )
		) {
			return;
		}
		const selectors = rule.selectors.map( boost ).filter( Boolean );
		if ( ! selectors.length ) {
			return;
		}
		const copy = rule.clone( { selectors } );
		let node = copy;
		let parent = rule.parent;
		while ( parent && parent.type === 'atrule' ) {
			const wrap = parent.clone( { nodes: [] } );
			wrap.append( node );
			node = wrap;
			parent = parent.parent;
		}
		out.append( node );
	} );
}

writeFileSync( OUTPUT, out.toString() );
// eslint-disable-next-line no-console -- build log.
console.log( 'wrote ' + OUTPUT + ' (' + out.nodes.length + ' rules)' );
