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

// Put the payload's colour variables on the builder's wrapper, as the server did.
function applyColors( element, colors, previous ) {
	if ( ! element || ! colors ) {
		return {};
	}
	const vars = colors.vars || {};
	Object.keys( previous ).forEach( ( name ) => {
		if ( ! ( name in vars ) ) {
			element.style.removeProperty( name );
		}
	} );
	Object.keys( vars ).forEach( ( name ) =>
		element.style.setProperty( name, vars[ name ] )
	);
	if ( colors.dark ) {
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
	const colorVars = useRef( ( initial.colors && initial.colors.vars ) || {} );
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
		colorVars.current = applyColors(
			element,
			payload.colors,
			colorVars.current
		);
	}, [ element, payload.colors ] );

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
