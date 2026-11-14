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
	window.scrollTo = jest.fn();
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

test( 'renders the four store-wide cards and keeps hidden display defaults on save', async () => {
	render( <App page="settings" /> );

	expect(
		await screen.findByRole( 'heading', { name: 'General' } )
	).toBeTruthy();
	expect(
		screen.getByRole( 'heading', { name: 'Cart and checkout' } )
	).toBeTruthy();
	expect(
		screen.getByRole( 'heading', { name: 'Order emails' } )
	).toBeTruthy();
	expect(
		screen.getByRole( 'heading', { name: 'Data and privacy' } )
	).toBeTruthy();
	expect( screen.queryByText( 'Storefront display' ) ).toBeNull();
	expect( screen.queryByText( 'Advanced' ) ).toBeNull();

	const save = screen.getByRole( 'button', { name: 'Save settings' } );
	expect( save.disabled ).toBe( true );
	fireEvent.click(
		screen.getByRole( 'checkbox', { name: 'Allow coupons on boxes' } )
	);
	expect( save.disabled ).toBe( false );
	fireEvent.click( save );

	await waitFor( () =>
		expect( api.saveSettings ).toHaveBeenCalledTimes( 1 )
	);
	expect( api.saveSettings.mock.calls[ 0 ][ 0 ] ).toEqual( {
		...defaults(),
		allow_coupons: true,
	} );
	expect( api.saveSettings.mock.calls[ 0 ][ 0 ].low_stock ).toEqual( {
		enabled: true,
		threshold: 5,
	} );
	expect( ( await screen.findAllByText( 'Saved' ) ).length ).toBeGreaterThan(
		0
	);
	await waitFor( () => expect( save.disabled ).toBe( true ) );
} );

test( 'round-trips page, cart and privacy settings through the same payload', async () => {
	render( <App page="settings" /> );
	await screen.findByRole( 'heading', { name: 'General' } );

	fireEvent.change( screen.getByLabelText( 'Main box page' ), {
		target: { value: '12' },
	} );
	fireEvent.click( screen.getByRole( 'radio', { name: /Each item/ } ) );
	fireEvent.change( screen.getByLabelText( 'Keep detailed analytics for' ), {
		target: { value: '120' },
	} );
	fireEvent.click( screen.getByRole( 'button', { name: 'Save settings' } ) );

	await waitFor( () =>
		expect( api.saveSettings ).toHaveBeenCalledTimes( 1 )
	);
	expect( api.saveSettings ).toHaveBeenCalledWith( {
		...defaults(),
		default_page_id: 12,
		cart_display: 'items',
		analytics_retention_days: 120,
	} );
} );

test( 'shows retention validation and does not send invalid settings', async () => {
	render( <App page="settings" /> );
	await screen.findByRole( 'heading', { name: 'General' } );

	fireEvent.change( screen.getByLabelText( 'Keep detailed analytics for' ), {
		target: { value: '0' },
	} );
	fireEvent.click( screen.getByRole( 'button', { name: 'Save settings' } ) );

	expect(
		await screen.findByText( 'Enter a whole number from 7 to 730.' )
	).toBeTruthy();
	expect( api.saveSettings ).not.toHaveBeenCalled();
} );
