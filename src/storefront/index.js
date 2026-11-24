import { createRoot } from '@wordpress/element';
import './storefront.css';
import Builder from './Builder';
import PreviewHost from './PreviewHost';

const SELECTOR = '.mmbb-builder[data-mmbb-id]';

let warned = false;

/**
 * Whether this page's React can mount a builder. Some page builders (the Divi Visual
 * Builder) swap WordPress's React for React 16, which has no createRoot. The server
 * HTML stays as it is then, and the console says why, once.
 *
 * @return {boolean} True when createRoot is there.
 */
function canMount() {
	if ( typeof createRoot === 'function' ) {
		return true;
	}
	if ( ! warned ) {
		warned = true;
		// eslint-disable-next-line no-console
		console.warn(
			'Mix and match box: this page loads a React without createRoot (React 17 or older), so the box was not started.'
		);
	}
	return false;
}

/**
 * Mount one builder wrapper, once, when its payload is on the page.
 *
 * In the editor's preview iframe (`window.mmbbPreview` is set) the previewed box
 * listens to the editor and shows the draft instead of the saved box.
 *
 * @param {HTMLElement} el The wrapper the server printed.
 */
function mountOne( el ) {
	const payload = ( window.mmbbBuilders || {} )[ el.dataset.mmbbId ];
	if ( ! payload || el.dataset.mmbbMounted ) {
		return;
	}
	el.dataset.mmbbMounted = '1';
	const preview = window.mmbbPreview;
	const isPreview =
		preview &&
		typeof preview === 'object' &&
		Number( preview.boxId ) === Number( payload.id );
	try {
		createRoot( el ).render(
			isPreview ? (
				<PreviewHost
					payload={ payload }
					preview={ preview }
					element={ el }
				/>
			) : (
				<Builder payload={ payload } />
			)
		);
	} catch ( error ) {
		// eslint-disable-next-line no-console
		console.error( 'Mix and match box: the box could not start.', error );
	}
}

/**
 * Mount every builder in a part of the page. Each one finds its payload in
 * `window.mmbbBuilders` under the id the server printed on its wrapper. Safe to call
 * again: a wrapper mounts once.
 *
 * @param {Document|Element} [root=document] Where to look. The root itself counts too.
 */
export function mount( root = document ) {
	if ( ! root || typeof root.querySelectorAll !== 'function' ) {
		return;
	}
	if ( ! canMount() ) {
		return;
	}
	if ( typeof root.matches === 'function' && root.matches( SELECTOR ) ) {
		mountOne( root );
	}
	root.querySelectorAll( SELECTOR ).forEach( mountOne );
}

/**
 * Mount builders that are added to the page later, such as by a page builder's
 * live preview or a theme that loads content without a page load.
 */
function watch() {
	if (
		typeof window.MutationObserver !== 'function' ||
		! document.documentElement ||
		! canMount()
	) {
		return;
	}
	new window.MutationObserver( ( records ) => {
		records.forEach( ( record ) => {
			record.addedNodes.forEach( ( node ) => {
				if ( node.nodeType === 1 ) {
					mount( node );
				}
			} );
		} );
	} ).observe( document.documentElement, { childList: true, subtree: true } );
}

function start() {
	mount( document );
	watch();
}

window.mmbbMount = mount;

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', start );
} else {
	start();
}
