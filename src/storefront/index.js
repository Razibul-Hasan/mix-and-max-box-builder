import { createRoot } from '@wordpress/element';
import './storefront.css';
import Builder from './Builder';

/**
 * Mount every builder on the page. Each one finds its payload in
 * `window.mmbbBuilders` under the id the server printed on its wrapper.
 */
function mountAll() {
	const payloads = window.mmbbBuilders || {};
	document
		.querySelectorAll( '.mmbb-builder[data-mmbb-id]' )
		.forEach( ( el ) => {
			const payload = payloads[ el.dataset.mmbbId ];
			if ( ! payload || el.dataset.mmbbMounted ) {
				return;
			}
			el.dataset.mmbbMounted = '1';
			createRoot( el ).render( <Builder payload={ payload } /> );
		} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', mountAll );
} else {
	mountAll();
}
