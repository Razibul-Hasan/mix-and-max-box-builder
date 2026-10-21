import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../../src/admin/App';
import * as api from '../../../src/admin/api';

jest.mock( '../../../src/admin/api', () => ( {
	getSettings: jest.fn(),
	saveSettings: jest.fn(),
	getPages: jest.fn(),
} ) );

const defaults = () => ( {
	enabled: true,
	default_page_id: 0,
	columns: 4,
	summary_layout: 'both',
	stickers: true,
	low_stock: { enabled: true, threshold: 5 },
	unlock_toast: true,
	cta_label: '',
	empty_slot_hint: '',
	cart_display: 'bundle',
	edit_from_cart: true,
	allow_coupons: false,
	reduce_item_stock: true,
	email_list_items: true,
	email_gift_message: true,
	assets_only_on_builder: true,
	analytics_enabled: true,
	analytics_retention_days: 90,
	delete_data: false,
} );

beforeEach( () => {
	jest.clearAllMocks();
	window.history.replaceState(
		null,
		'',
		'http://localhost/wp-admin/admin.php?page=mmbb-settings'
	);
	window.mmbbAdmin = {
		page: 'settings',
		urls: {
			dashboard: '#dashboard',
			campaigns: '#campaigns',
			analytics: '#analytics',
			settings: '#settings',
		},
		storeUrl: 'http://localhost/',
		locale: 'en-US',
		money: {
			symbol: '$',
			decimals: 2,
			position: 'left',
			decimalSeparator: '.',
			thousandSeparator: ',',
		},
	};
	api.getSettings.mockResolvedValue( defaults() );
	api.getPages.mockResolvedValue( [ { id: 12, title: 'Build a box' } ] );
	api.saveSettings.mockImplementation( ( settings ) =>
		Promise.resolve( settings )
	);
} );

test( 'renders all sections and saves the complete settings payload', async () => {
	render( <App page="settings" /> );

	expect(
		await screen.findByRole( 'heading', { name: 'General' } )
	).toBeTruthy();
	expect(
		screen.getByRole( 'heading', { name: 'Storefront display' } )
	).toBeTruthy();
	expect(
		screen.getByRole( 'heading', { name: 'Cart & checkout' } )
	).toBeTruthy();
	expect( screen.getByRole( 'heading', { name: 'Emails' } ) ).toBeTruthy();
	expect( screen.getByRole( 'heading', { name: 'Advanced' } ) ).toBeTruthy();
	expect( screen.getByText( 'Follow WooCommerce ($12.00)' ) ).toBeTruthy();

	fireEvent.click(
		screen.getByRole( 'switch', {
			name: 'Allow coupons on top of box discounts',
		} )
	);
	expect(
		screen.getByRole( 'region', { name: 'Unsaved changes' } )
	).toBeTruthy();
	fireEvent.click(
		screen.getAllByRole( 'button', { name: 'Save settings' } )[ 0 ]
	);

	await waitFor( () =>
		expect( api.saveSettings ).toHaveBeenCalledTimes( 1 )
	);
	expect( api.saveSettings.mock.calls[ 0 ][ 0 ] ).toEqual( {
		...defaults(),
		allow_coupons: true,
	} );
	expect( await screen.findByText( 'Settings saved' ) ).toBeTruthy();
	await waitFor( () =>
		expect(
			screen.queryByRole( 'region', { name: 'Unsaved changes' } )
		).toBeNull()
	);
} );

test( 'shows inline validation and does not send invalid settings', async () => {
	render( <App page="settings" /> );
	await screen.findByRole( 'heading', { name: 'General' } );

	fireEvent.change( screen.getByLabelText( 'Warn at' ), {
		target: { value: '0' },
	} );
	fireEvent.click(
		screen.getAllByRole( 'button', { name: 'Save settings' } )[ 0 ]
	);

	expect(
		await screen.findByText( 'Enter a whole number from 1 to 100.' )
	).toBeTruthy();
	expect( api.saveSettings ).not.toHaveBeenCalled();
} );

test( 'discards unsaved changes', async () => {
	render( <App page="settings" /> );
	const toggle = await screen.findByRole( 'switch', {
		name: 'Box builders are live',
	} );

	fireEvent.click( toggle );
	expect( toggle.getAttribute( 'aria-checked' ) ).toBe( 'false' );
	fireEvent.click( screen.getByRole( 'button', { name: 'Discard' } ) );
	expect( toggle.getAttribute( 'aria-checked' ) ).toBe( 'true' );
	expect(
		screen.queryByRole( 'region', { name: 'Unsaved changes' } )
	).toBeNull();
} );
