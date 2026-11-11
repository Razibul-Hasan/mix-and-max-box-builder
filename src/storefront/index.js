import { createRoot } from '@wordpress/element';
import './storefront.css';
import Builder from './Builder';
import PreviewHost from './PreviewHost';

/**
 * Mount every builder on the page. Each one finds its payload in
 * `window.mmbbBuilders` under the id the server printed on its wrapper.
 *
 * In the editor's preview iframe (`window.mmbbPreview` is set) the previewed box
 * listens to the editor and shows the draft instead of the saved box.
 */
function mountAll() {
	const payloads = window.mmbbBuilders || {};
	const preview = window.mmbbPreview;
	document
		.querySelectorAll( '.mmbb-builder[data-mmbb-id]' )
		.forEach( ( el ) => {
			const payload = payloads[ el.dataset.mmbbId ];
			if ( ! payload || el.dataset.mmbbMounted ) {
				return;
			}
			el.dataset.mmbbMounted = '1';
			const isPreview =
				preview &&
				typeof preview === 'object' &&
				Number( preview.boxId ) === Number( payload.id );
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
		} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', mountAll );
} else {
	mountAll();
}
