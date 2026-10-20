import { useEffect, useId, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '../components';

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The bottom sheet on phones: the shopper's box, gift options, totals and the
 * checkout button. It traps Tab, closes on Escape and on a tap on the scrim, and
 * gives focus back to whatever opened it.
 *
 * @param {Object}   props
 * @param {string}   props.label    Accessible name of the dialog.
 * @param {Function} props.onClose  Called for Escape, the scrim and the close button.
 * @param {*}        props.children The panel.
 */
export default function Drawer( { label, onClose, children } ) {
	const id = useId();
	const sheetRef = useRef( null );
	const closeRef = useRef( onClose );
	closeRef.current = onClose;

	useEffect( () => {
		const sheet = sheetRef.current;
		const doc = sheet.ownerDocument;
		const opener = doc.activeElement;
		sheet.querySelector( '[data-mmbb-drawer-close]' )?.focus();

		const onKeyDown = ( event ) => {
			if ( event.key === 'Escape' ) {
				event.preventDefault();
				closeRef.current();
				return;
			}
			if ( event.key !== 'Tab' ) {
				return;
			}
			const items = Array.from( sheet.querySelectorAll( FOCUSABLE ) );
			if ( items.length === 0 ) {
				event.preventDefault();
				sheet.focus();
				return;
			}
			const first = items[ 0 ];
			const last = items[ items.length - 1 ];
			const active = doc.activeElement;
			if ( ! sheet.contains( active ) ) {
				event.preventDefault();
				first.focus();
			} else if ( event.shiftKey && active === first ) {
				event.preventDefault();
				last.focus();
			} else if ( ! event.shiftKey && active === last ) {
				event.preventDefault();
				first.focus();
			}
		};
		doc.addEventListener( 'keydown', onKeyDown );
		return () => {
			doc.removeEventListener( 'keydown', onKeyDown );
			if ( opener && opener.isConnected && opener.focus ) {
				opener.focus();
			}
		};
	}, [] );

	return (
		<div className="mmbb-drawer">
			<div
				className="mmbb-drawer__scrim"
				onClick={ () => closeRef.current() }
				aria-hidden="true"
			/>
			<section
				ref={ sheetRef }
				className="mmbb-drawer__sheet"
				role="dialog"
				aria-modal="true"
				aria-label={ label }
				aria-describedby={ id }
				tabIndex={ -1 }
			>
				<span className="mmbb-drawer__grip" aria-hidden="true" />
				<div className="mmbb-drawer__head">
					<span id={ id }>
						{ __(
							'Tap a slot to remove an item',
							'mix-and-max-box-builder'
						) }
					</span>
					<Button
						variant="ghost"
						icon="close"
						aria-label={ __( 'Close', 'mix-and-max-box-builder' ) }
						onClick={ onClose }
						data-mmbb-drawer-close=""
					/>
				</div>
				<div className="mmbb-drawer__body">{ children }</div>
			</section>
		</div>
	);
}
