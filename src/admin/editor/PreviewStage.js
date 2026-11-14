import { Spinner } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import usePreviewBridge from './usePreviewBridge';

/** Width each preview size renders at before it is scaled to fit. */
export const VIRTUAL_WIDTH = { desktop: 1280, tablet: 820, mobile: 390 };

// Tablet keeps its real responsive width. Desktop fills the available stage.
const FRAME_WIDTH = { tablet: 820 };
const PHONE_HEIGHT = 844;
const PHONE_BORDER = 10;
const STAGE_PAD_X = 64;
const STAGE_PAD_Y = 56;

/**
 * How the iframe is drawn: its virtual size and the scale that fits it on the stage.
 *
 * @param {string} device desktop, tablet or mobile.
 * @param {Object} stage  Measured stage { width, height } (0 before layout).
 * @return {Object} { width, height, scale, frameWidth, frameHeight }.
 */
export function frameLayout( device, stage ) {
	const framed = device !== 'desktop';
	const roomW = Math.max(
		0,
		( stage.width || 0 ) - ( framed ? STAGE_PAD_X : 0 )
	);
	const roomH = Math.max(
		0,
		( stage.height || 0 ) - ( framed ? STAGE_PAD_Y : 0 )
	);
	if ( device === 'mobile' ) {
		const outerW = VIRTUAL_WIDTH.mobile + PHONE_BORDER * 2;
		const outerH = PHONE_HEIGHT + PHONE_BORDER * 2;
		const scale =
			roomW && roomH ? Math.min( 1, roomW / outerW, roomH / outerH ) : 1;
		return {
			width: VIRTUAL_WIDTH.mobile,
			height: PHONE_HEIGHT,
			scale,
			frameWidth: Math.round( VIRTUAL_WIDTH.mobile * scale ),
			frameHeight: Math.round( PHONE_HEIGHT * scale ),
		};
	}
	const virtual = VIRTUAL_WIDTH[ device ] || VIRTUAL_WIDTH.desktop;
	const maximum = FRAME_WIDTH[ device ] || virtual;
	const frameWidth = Math.min( maximum, roomW || maximum );
	const scale = Math.min( 1, frameWidth / virtual );
	const frameHeight = Math.max( 320, roomH || 790 );
	return {
		width: virtual,
		height: Math.round( frameHeight / scale ),
		scale,
		frameWidth,
		frameHeight,
	};
}

function useSize( ref ) {
	const [ size, setSize ] = useState( { width: 0, height: 0 } );
	useEffect( () => {
		const element = ref.current;
		if ( ! element ) {
			return undefined;
		}
		const measure = () => {
			const rect = element.getBoundingClientRect();
			setSize( ( current ) =>
				current.width === Math.round( rect.width ) &&
				current.height === Math.round( rect.height )
					? current
					: {
							width: Math.round( rect.width ),
							height: Math.round( rect.height ),
					  }
			);
		};
		measure();
		if ( typeof window.ResizeObserver !== 'function' ) {
			window.addEventListener( 'resize', measure );
			return () => window.removeEventListener( 'resize', measure );
		}
		const observer = new window.ResizeObserver( measure );
		observer.observe( element );
		return () => observer.disconnect();
	}, [ ref ] );
	return size;
}

/**
 * The middle of the editor: the real storefront in a full-width iframe or a
 * phone frame, kept in step with the draft.
 *
 * @param {Object}  props
 * @param {string}  props.src     Preview address (with its nonce).
 * @param {string}  props.origin  Origin of that address.
 * @param {number}  props.boxId   Box id.
 * @param {Object}  props.draft   The draft.
 * @param {boolean} props.changed Whether the draft differs from what the page loaded with.
 * @param {string}  props.device  desktop, tablet or mobile.
 */
export default function PreviewStage( {
	src,
	origin,
	boxId,
	draft,
	changed,
	device,
} ) {
	const stageRef = useRef( null );
	const frameRef = useRef( null );
	const stage = useSize( stageRef );
	const { ready, height } = usePreviewBridge( {
		frameRef,
		origin,
		boxId,
		draft,
		changed,
		src,
	} );
	const layout = frameLayout( device, stage );
	const phone = device === 'mobile';

	const frame = (
		<div
			className="mmbb-ed__viewport"
			style={ { width: layout.frameWidth, height: layout.frameHeight } }
			data-content-height={ height || undefined }
		>
			<iframe
				ref={ frameRef }
				className="mmbb-ed__iframe"
				src={ src }
				title={ __(
					'Shopper preview',
					'productboxes-mix-and-match-box-builder'
				) }
				style={ {
					width: layout.width,
					height: layout.height,
					transform:
						layout.scale === 1
							? undefined
							: 'scale(' + layout.scale + ')',
				} }
			/>
			{ ! ready ? (
				<div className="mmbb-ed__loading" role="status">
					<Spinner />
					<span className="screen-reader-text">
						{ __(
							'Loading the preview…',
							'productboxes-mix-and-match-box-builder'
						) }
					</span>
				</div>
			) : null }
		</div>
	);

	return (
		<section
			ref={ stageRef }
			className="mmbb-ed__stage"
			data-device={ device }
			aria-label={ __(
				'Shopper preview',
				'productboxes-mix-and-match-box-builder'
			) }
		>
			{ phone ? <div className="mmbb-ed__phone">{ frame }</div> : frame }
		</section>
	);
}
