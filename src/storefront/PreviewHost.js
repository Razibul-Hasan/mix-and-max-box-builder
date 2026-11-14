import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	acceptMessage,
	PREVIEW_CONFIG,
	PREVIEW_HEIGHT,
	PREVIEW_READY,
} from '../shared/preview-bridge';
import Builder from './Builder';

/**
 * A key that changes when the box rules change, so the builder starts an empty
 * box then. Design and copy changes keep the shopper's picks.
 *
 * @param {Object} payload Storefront payload.
 * @return {string} Key.
 */
export function rulesKey( payload ) {
	const { config } = payload;
	return JSON.stringify( [
		config.type,
		config.box,
		config.sizes,
		config.bundle,
		( payload.products || [] ).map( ( p ) => p.id ),
	] );
}

// Put the payload's design variables on the builder wrapper, as the server did.
function applyDesign( element, payload, previous ) {
	if ( ! element || ! payload ) {
		return {};
	}
	const vars = payload.styleVars || payload.colors?.vars || {};
	Object.keys( previous ).forEach( ( name ) => {
		if ( ! ( name in vars ) ) {
			element.style.removeProperty( name );
		}
	} );
	Object.keys( vars ).forEach( ( name ) =>
		element.style.setProperty( name, vars[ name ] )
	);
	if ( payload.colors?.dark ) {
		element.setAttribute( 'data-theme', 'dark' );
	} else {
		element.removeAttribute( 'data-theme' );
	}
	return vars;
}

/**
 * The builder inside the editor's preview iframe. It renders the draft the editor
 * sends instead of the saved box, and reports its height. Add to cart is off.
 *
 * @param {Object}      props
 * @param {Object}      props.payload Payload the page was rendered with.
 * @param {Object}      props.preview `window.mmbbPreview`: { boxId, origin }.
 * @param {HTMLElement} props.element The builder's wrapper.
 */
export default function PreviewHost( { payload: initial, preview, element } ) {
	const [ payload, setPayload ] = useState( initial );
	const colorVars = useRef( initial.styleVars || initial.colors?.vars || {} );
	const parent = window.parent;

	useEffect( () => {
		const onMessage = ( event ) => {
			const data = acceptMessage( event, preview.origin, parent );
			if (
				! data ||
				data.type !== PREVIEW_CONFIG ||
				Number( data.boxId ) !== Number( preview.boxId ) ||
				! data.payload ||
				! data.payload.config
			) {
				return;
			}
			setPayload( ( current ) => ( {
				...current,
				...data.payload,
				preview: true,
			} ) );
		};
		window.addEventListener( 'message', onMessage );
		if ( parent && parent !== window ) {
			parent.postMessage( { type: PREVIEW_READY }, preview.origin );
		}
		return () => window.removeEventListener( 'message', onMessage );
	}, [ preview.origin, preview.boxId, parent ] );

	useEffect( () => {
		colorVars.current = applyDesign( element, payload, colorVars.current );
		element?.setAttribute(
			'data-template',
			payload.config?.design?.template || 'spotlight'
		);
	}, [ element, payload ] );

	// The editor sizes its frame to the page.
	useEffect( () => {
		if ( ! parent || parent === window ) {
			return undefined;
		}
		const doc = document.documentElement;
		let last = 0;
		const report = () => {
			const height = Math.ceil( doc.scrollHeight );
			if ( height !== last ) {
				last = height;
				parent.postMessage(
					{ type: PREVIEW_HEIGHT, height },
					preview.origin
				);
			}
		};
		report();
		if ( typeof window.ResizeObserver !== 'function' ) {
			window.addEventListener( 'resize', report );
			return () => window.removeEventListener( 'resize', report );
		}
		const observer = new window.ResizeObserver( report );
		observer.observe( document.body );
		return () => observer.disconnect();
	}, [ parent, preview.origin ] );

	return (
		<>
			<p className="mmbb-preview-note" role="note">
				{ __(
					'Preview — checkout is off',
					'productboxes-mix-and-match-box-builder'
				) }
			</p>
			<Builder key={ rulesKey( payload ) } payload={ payload } preview />
		</>
	);
}
