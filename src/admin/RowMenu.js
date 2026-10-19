import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { Button, Icon } from '../components';

/**
 * A small action menu for one table row. Items are `{ id, label, icon, href,
 * onSelect, danger }`. It opens fixed to the screen, so the table's own scrolling
 * cannot clip it, and it closes on Escape, Tab, a click elsewhere or a scroll.
 *
 * @param {Object}   props
 * @param {string}   props.label Accessible name of the trigger.
 * @param {Object[]} props.items Menu items.
 */
export default function RowMenu( { label, items } ) {
	const [ open, setOpen ] = useState( false );
	const [ position, setPosition ] = useState( { top: 0, right: 0 } );
	const trigger = useRef( null );
	const menu = useRef( null );
	const id = useId();

	const close = ( refocus ) => {
		setOpen( false );
		if ( refocus && trigger.current ) {
			trigger.current.focus();
		}
	};

	useEffect( () => {
		if ( ! open ) {
			return;
		}
		const first =
			menu.current && menu.current.querySelector( '[role="menuitem"]' );
		if ( first ) {
			first.focus();
		}
		const away = ( event ) => {
			if (
				menu.current &&
				! menu.current.contains( event.target ) &&
				! (
					trigger.current && trigger.current.contains( event.target )
				)
			) {
				setOpen( false );
			}
		};
		const dismiss = () => setOpen( false );
		document.addEventListener( 'mousedown', away );
		window.addEventListener( 'scroll', dismiss, true );
		window.addEventListener( 'resize', dismiss );
		return () => {
			document.removeEventListener( 'mousedown', away );
			window.removeEventListener( 'scroll', dismiss, true );
			window.removeEventListener( 'resize', dismiss );
		};
	}, [ open ] );

	const toggle = () => {
		if ( ! open && trigger.current ) {
			const rect = trigger.current.getBoundingClientRect();
			setPosition( {
				top: rect.bottom + 4,
				right: Math.max( 8, window.innerWidth - rect.right ),
			} );
		}
		setOpen( ! open );
	};

	const onKeyDown = ( event ) => {
		const entries = Array.from(
			menu.current.querySelectorAll( '[role="menuitem"]' )
		);
		const index = entries.indexOf(
			menu.current.ownerDocument.activeElement
		);
		if ( event.key === 'Escape' ) {
			event.preventDefault();
			close( true );
		} else if ( event.key === 'Tab' ) {
			close( false );
		} else if ( event.key === 'ArrowDown' ) {
			event.preventDefault();
			entries[ ( index + 1 ) % entries.length ].focus();
		} else if ( event.key === 'ArrowUp' ) {
			event.preventDefault();
			entries[ ( index - 1 + entries.length ) % entries.length ].focus();
		} else if ( event.key === 'Home' ) {
			event.preventDefault();
			entries[ 0 ].focus();
		} else if ( event.key === 'End' ) {
			event.preventDefault();
			entries[ entries.length - 1 ].focus();
		}
	};

	return (
		<span className="mmbb-rowmenu">
			<span ref={ trigger } className="mmbb-rowmenu__trigger">
				<Button
					variant="ghost"
					size="sm"
					icon="more"
					aria-label={ label }
					aria-haspopup="menu"
					aria-expanded={ open }
					aria-controls={ open ? id : undefined }
					onClick={ toggle }
				/>
			</span>
			{ open ? (
				<ul
					ref={ menu }
					id={ id }
					role="menu"
					aria-label={ label }
					className="mmbb-rowmenu__list"
					style={ { top: position.top, right: position.right } }
					onKeyDown={ onKeyDown }
				>
					{ items.map( ( item ) => (
						<li key={ item.id } role="none">
							{ item.href ? (
								<a
									role="menuitem"
									className="mmbb-rowmenu__item"
									href={ item.href }
									target={
										item.external ? '_blank' : undefined
									}
									rel={
										item.external
											? 'noopener noreferrer'
											: undefined
									}
									onClick={ () => close( false ) }
								>
									<Icon name={ item.icon } size={ 16 } />
									{ item.label }
								</a>
							) : (
								<button
									type="button"
									role="menuitem"
									className={
										'mmbb-rowmenu__item' +
										( item.danger ? ' is-danger' : '' )
									}
									onClick={ () => {
										// Focus returns to the trigger first, so a dialog
										// opened by this item gives focus back there.
										close( true );
										item.onSelect();
									} }
								>
									<Icon name={ item.icon } size={ 16 } />
									{ item.label }
								</button>
							) }
						</li>
					) ) }
				</ul>
			) : null }
		</span>
	);
}
