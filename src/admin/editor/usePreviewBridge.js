import { useEffect, useRef, useState } from '@wordpress/element';
import {
	acceptMessage,
	configMessage,
	PREVIEW_HEIGHT,
	PREVIEW_READY,
} from '../../shared/preview-bridge';
import { previewCampaign } from '../api';

/** How long the draft must stay still before the preview is updated. */
export const PREVIEW_DEBOUNCE_MS = 300;

/**
 * Keep the preview iframe in step with the draft.
 *
 * Waits for the iframe's `ready`, then on every draft change (debounced 300ms)
 * asks the server for the draft's storefront payload and posts it to the iframe.
 * A request still running when the draft changes again is aborted.
 * Only messages from the iframe's window and origin are read.
 *
 * @param {Object}  args
 * @param {Object}  args.frameRef Ref to the iframe element.
 * @param {string}  args.origin   Origin of the preview page.
 * @param {number}  args.boxId    Box id.
 * @param {Object}  args.draft    The draft ({ title, config }).
 * @param {boolean} args.changed  Whether the draft differs from what the page loaded with.
 * @param {string}  args.src      Current iframe address; a new one waits for a new `ready`.
 * @return {Object} { ready, height }.
 */
export default function usePreviewBridge( {
	frameRef,
	origin,
	boxId,
	draft,
	changed,
	src,
} ) {
	const [ ready, setReady ] = useState( false );
	const [ height, setHeight ] = useState( 0 );
	const sequence = useRef( 0 );
	const sentDraft = useRef( null );

	// A new address loads a new page, which says `ready` again.
	useEffect( () => {
		setReady( false );
		sentDraft.current = null;
	}, [ src ] );

	useEffect( () => {
		const onMessage = ( event ) => {
			const frame = frameRef.current;
			const data = acceptMessage(
				event,
				origin,
				frame ? frame.contentWindow : undefined
			);
			if ( ! data || ! frame ) {
				return;
			}
			if ( data.type === PREVIEW_READY ) {
				sentDraft.current = null;
				setReady( true );
			} else if (
				data.type === PREVIEW_HEIGHT &&
				Number.isFinite( data.height ) &&
				data.height > 0
			) {
				setHeight( Math.round( data.height ) );
			}
		};
		window.addEventListener( 'message', onMessage );
		return () => window.removeEventListener( 'message', onMessage );
	}, [ frameRef, origin ] );

	useEffect( () => {
		// The page already shows the saved box; nothing to send until the draft moves.
		if ( ! ready || ( ! changed && sentDraft.current === null ) ) {
			return undefined;
		}
		if ( sentDraft.current === draft ) {
			return undefined;
		}
		// Cancels the request when the draft moves on: the browser drops the stale answer and frees
		// the connection for the next one. PHP may still finish the old request on the server.
		const controller = new window.AbortController();
		const timer = setTimeout( () => {
			const mine = ++sequence.current;
			previewCampaign( boxId, draft, { signal: controller.signal } )
				.then( ( payload ) => {
					const frame = frameRef.current;
					// Only the newest answer counts; an older one may arrive last.
					if (
						mine !== sequence.current ||
						! frame ||
						! frame.contentWindow ||
						! payload ||
						! payload.config
					) {
						return;
					}
					sentDraft.current = draft;
					frame.contentWindow.postMessage(
						configMessage( boxId, payload ),
						origin
					);
				} )
				.catch( () => {
					// The preview keeps the last good draft; saving reports real errors.
					// An aborted request (AbortError) is ignored the same way.
				} );
		}, PREVIEW_DEBOUNCE_MS );
		return () => {
			clearTimeout( timer );
			controller.abort();
		};
	}, [ ready, changed, draft, boxId, origin, frameRef ] );

	return { ready, height };
}
