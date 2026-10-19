import { useEffect, useId, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import Button from './Button';
import { cx } from './utils';

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * An accessible pop-up. It labels itself from `title`, traps Tab, closes on Escape
 * and on a click on the scrim, starts focus on `initialFocusRef` (or the first
 * control) and gives focus back to whatever opened it.
 *
 * @param {Object}   props
 * @param {string}   props.title           Heading text.
 * @param {*}        props.description     Optional text under the heading.
 * @param {*}        props.icon            Optional node shown beside the heading.
 * @param {string}   props.role            `dialog` or `alertdialog`.
 * @param {string}   props.size            `md` or `lg`.
 * @param {*}        props.footer          Buttons.
 * @param {Function} props.onClose         Called for Escape, the scrim and the close button.
 * @param {Object}   props.initialFocusRef Ref of the control that gets focus first.
 * @param {boolean}  props.showClose       Show the close button in the header.
 * @param {*}        props.children        Body.
 */
export default function Modal( {
	title,
	description,
	icon,
	role = 'dialog',
	size = 'md',
	footer,
	onClose,
	initialFocusRef,
	showClose = true,
	children,
} ) {
	const id = useId();
	const titleId = id + '-title';
	const descId = id + '-desc';
	const dialogRef = useRef( null );
	const closeRef = useRef( onClose );
	closeRef.current = onClose;

	useEffect( () => {
		const dialog = dialogRef.current;
		const doc = dialog.ownerDocument;
		const opener = doc.activeElement;
		// The ref may point at a control or at a wrapper around one.
		const hint = initialFocusRef && initialFocusRef.current;
		const start =
			( hint &&
				( hint.matches( FOCUSABLE )
					? hint
					: hint.querySelector( FOCUSABLE ) ) ) ||
			dialog.querySelector( FOCUSABLE ) ||
			dialog;
		start.focus();

		const onKeyDown = ( event ) => {
			if ( event.key === 'Escape' ) {
				event.preventDefault();
				if ( closeRef.current ) {
					closeRef.current();
				}
				return;
			}
			if ( event.key !== 'Tab' ) {
				return;
			}
			const items = Array.from( dialog.querySelectorAll( FOCUSABLE ) );
			if ( items.length === 0 ) {
				event.preventDefault();
				dialog.focus();
				return;
			}
			const first = items[ 0 ];
			const last = items[ items.length - 1 ];
			const active = doc.activeElement;
			if ( ! dialog.contains( active ) ) {
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
		// Focus is set once, when the dialog opens.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	return (
		<div
			className="mmbb-modal__scrim"
			role="presentation"
			onMouseDown={ ( event ) => {
				if ( event.target === event.currentTarget && onClose ) {
					onClose();
				}
			} }
		>
			<section
				ref={ dialogRef }
				className={ cx( 'mmbb-modal', 'mmbb-modal--' + size ) }
				role={ role }
				aria-modal="true"
				aria-labelledby={ titleId }
				aria-describedby={ description ? descId : undefined }
				tabIndex={ -1 }
			>
				<header className="mmbb-modal__head">
					{ icon ? (
						<span className="mmbb-modal__icon">{ icon }</span>
					) : null }
					<div className="mmbb-modal__heading">
						<h2 id={ titleId } className="mmbb-modal__title">
							{ title }
						</h2>
						{ description ? (
							<p id={ descId } className="mmbb-modal__desc">
								{ description }
							</p>
						) : null }
					</div>
					{ showClose ? (
						<Button
							variant="ghost"
							icon="close"
							aria-label={ __(
								'Close',
								'mix-and-max-box-builder'
							) }
							onClick={ onClose }
						/>
					) : null }
				</header>
				{ children ? (
					<div className="mmbb-modal__body">{ children }</div>
				) : null }
				{ footer ? (
					<footer className="mmbb-modal__foot">{ footer }</footer>
				) : null }
			</section>
		</div>
	);
}
