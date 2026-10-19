import { createElement } from '@wordpress/element';
import { render, screen } from '@testing-library/react';

describe( 'WordPress element test environment', () => {
	it( 'renders through WordPress element', () => {
		render( createElement( 'div', { 'data-testid': 'mmbb-smoke' } ) );
		expect( screen.getByTestId( 'mmbb-smoke' ).tagName ).toBe( 'DIV' );
	} );
} );
