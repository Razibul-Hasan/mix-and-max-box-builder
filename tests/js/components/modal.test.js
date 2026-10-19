import { useRef, useState } from '@wordpress/element';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button, Modal } from '../../../src/components';

function Harness( { role = 'dialog', withRef = false } ) {
	const [ open, setOpen ] = useState( false );
	const safe = useRef( null );
	return (
		<>
			<button type="button" onClick={ () => setOpen( true ) }>
				Open
			</button>
			{ open ? (
				<Modal
					title="Delete 2 campaigns?"
					description="They disappear."
					role={ role }
					initialFocusRef={ withRef ? safe : undefined }
					onClose={ () => setOpen( false ) }
					footer={
						<>
							<span ref={ safe }>
								<Button>Cancel</Button>
							</span>
							<Button variant="danger">Delete</Button>
						</>
					}
				/>
			) : null }
		</>
	);
}

const open = () => {
	const opener = screen.getByText( 'Open' );
	opener.focus();
	fireEvent.click( opener );
	return opener;
};

describe( 'Modal', () => {
	it( 'is a labelled, modal dialog', () => {
		render( <Harness /> );
		open();
		const dialog = screen.getByRole( 'dialog', {
			name: 'Delete 2 campaigns?',
		} );
		expect( dialog.getAttribute( 'aria-modal' ) ).toBe( 'true' );
		expect( dialog.getAttribute( 'aria-describedby' ) ).toBeTruthy();
	} );

	it( 'supports the alertdialog role', () => {
		render( <Harness role="alertdialog" /> );
		open();
		expect( screen.getByRole( 'alertdialog' ) ).toBeTruthy();
	} );

	it( 'starts focus on the safe action when asked', () => {
		render( <Harness withRef /> );
		open();
		expect( document.activeElement ).toBe(
			screen.getByRole( 'button', { name: 'Cancel' } )
		);
	} );

	it( 'starts focus on the first control otherwise', () => {
		render( <Harness /> );
		open();
		expect( document.activeElement ).toBe(
			screen.getByRole( 'button', { name: 'Close' } )
		);
	} );

	it( 'traps Tab inside the dialog in both directions', () => {
		render( <Harness /> );
		open();
		const close = screen.getByRole( 'button', { name: 'Close' } );
		const remove = screen.getByRole( 'button', { name: 'Delete' } );

		remove.focus();
		fireEvent.keyDown( remove, { key: 'Tab' } );
		expect( document.activeElement ).toBe( close );

		fireEvent.keyDown( close, { key: 'Tab', shiftKey: true } );
		expect( document.activeElement ).toBe( remove );
	} );

	it( 'pulls focus back inside if it escaped', () => {
		render( <Harness /> );
		const opener = open();
		opener.focus();
		fireEvent.keyDown( opener, { key: 'Tab' } );
		expect( document.activeElement ).toBe(
			screen.getByRole( 'button', { name: 'Close' } )
		);
	} );

	it( 'closes on Escape and returns focus to the opener', () => {
		render( <Harness /> );
		const opener = open();
		fireEvent.keyDown( document, { key: 'Escape' } );
		expect( screen.queryByRole( 'dialog' ) ).toBeNull();
		expect( document.activeElement ).toBe( opener );
	} );

	it( 'closes on a click on the scrim but not inside the dialog', () => {
		const { container } = render( <Harness /> );
		open();
		fireEvent.mouseDown( screen.getByRole( 'dialog' ) );
		expect( screen.getByRole( 'dialog' ) ).toBeTruthy();
		fireEvent.mouseDown( container.querySelector( '.mmbb-modal__scrim' ) );
		expect( screen.queryByRole( 'dialog' ) ).toBeNull();
	} );

	it( 'closes from the close button', () => {
		render( <Harness /> );
		open();
		fireEvent.click( screen.getByRole( 'button', { name: 'Close' } ) );
		expect( screen.queryByRole( 'dialog' ) ).toBeNull();
	} );
} );
