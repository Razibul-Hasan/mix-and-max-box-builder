/**
 * Builds the boosted copies of the builder's own rules that some themes need.
 *
 * build/button-boost.css: the builder's button rules again, with their `.mmbb-root`
 * repeated so they outrank a theme's high-specificity `button:not(...)` styles.
 * Some themes (Elastra) style every `button:not(.a):not(.b):not(.c)` with a background,
 * border, padding, radius, size and shadow. That selector weighs 0,4,1, which beats the
 * builder's own 0,2,0 rules, so Add to box turned theme-green.
 *
 * build/list-boost.css: the padding, line height and list style the builder gives its own
 * lists, with ID weight. Divi styles every `#left-area ul` and `#left-area ol` (1,0,1) with
 * bullets or numbers, a 26px line height and 23px of padding. No number of classes outweighs
 * an ID, so `.mmbb-root` becomes `.mmbb-root:is(.mmbb-root,#mmbb-boost)`: `:is()` weighs as
 * much as its heaviest argument, so the rule still matches every builder and counts an ID.
 *
 * Plain rules cannot be out-weighed from a theme integration without knowing every value, so
 * these copy the builder's own rules, unchanged apart from the extra weight. A theme
 * integration loads a file only where it is needed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
// eslint-disable-next-line import/no-extraneous-dependencies -- ships with wp-scripts.
import postcss from 'postcss';

const SOURCES = [ 'build/components.css', 'build/storefront.css' ];
const ROOT = '.mmbb-root';

/**
 * The last compound selector, the element a rule styles.
 *
 * @param {string} selector One selector.
 * @return {string} Its subject.
 */
const subject = ( selector ) =>
	selector
		.trim()
		.split( /\s*[\s>+~]\s*/ )
		.pop();

const BOOSTS = [
	{
		output: 'build/button-boost.css',
		// Rules that style a button, a stepper, a chip or a slot's remove button.
		test: ( selector ) =>
			/\.mmbb-(btn|stepper|qty|chip|slot__remove)\b|(^|[\s>+~])button\b/.test(
				selector
			),
		// Six: Elastra's selector weighs 0,5,1 (button plus five :not() classes).
		prefix: ROOT.repeat( 6 ),
		keep: () => true,
	},
	{
		output: 'build/list-boost.css',
		// Rules whose subject is one of the builder's <ul> or <ol> lists.
		test: ( selector ) =>
			/\.mmbb-(panel__lines|slots|steps|hero__ladder|editorial__tiers|split__tiers|compact__tiers)(?![\w-])/.test(
				subject( selector )
			),
		// 1,1,0 before the rest of the selector: above Divi's 1,0,1 and the theme reset's 1,1,1.
		prefix: ROOT + ':is(' + ROOT + ',#mmbb-boost)',
		// Only what Divi sets on lists, so every other value keeps its normal weight.
		keep: ( prop ) => /^(padding|line-height|list-style)/.test( prop ),
	},
];

for ( const boost of BOOSTS ) {
	const out = postcss.root();
	const raise = ( selector ) =>
		boost.test( selector ) && selector.includes( ROOT + ' ' )
			? selector.replace( ROOT + ' ', boost.prefix + ' ' )
			: null;

	for ( const file of SOURCES ) {
		const css = postcss.parse( readFileSync( file, 'utf8' ) );
		css.walkRules( ( rule ) => {
			if (
				rule.parent?.type === 'atrule' &&
				/keyframes$/i.test( rule.parent.name )
			) {
				return;
			}
			const selectors = rule.selectors.map( raise ).filter( Boolean );
			if ( ! selectors.length ) {
				return;
			}
			const copy = rule.clone( { selectors } );
			copy.walkDecls( ( decl ) => {
				if ( ! boost.keep( decl.prop ) ) {
					decl.remove();
				}
			} );
			if ( ! copy.nodes.length ) {
				return;
			}
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

	writeFileSync( boost.output, out.toString() );
	// eslint-disable-next-line no-console -- build log.
	console.log(
		'wrote ' + boost.output + ' (' + out.nodes.length + ' rules)'
	);
}
