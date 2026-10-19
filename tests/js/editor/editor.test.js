import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import App from '../../../src/admin/App';
import * as api from '../../../src/admin/api';

jest.mock( '../../../src/admin/api', () => ( {
	getCampaign: jest.fn(),
	saveCampaign: jest.fn(),
	publishCampaign: jest.fn(),
	getProducts: jest.fn(),
	getTerms: jest.fn(),
	getPages: jest.fn(),
	getSetup: jest.fn(),
	markTestDone: jest.fn(),
	getCampaigns: jest.fn(),
	createCampaign: jest.fn(),
	bulkCampaigns: jest.fn(),
	getStats: jest.fn(),
} ) );

const EDIT_URL =
	'http://localhost/wp-admin/admin.php?page=mmbb-campaigns&action=edit&id=5';

const baseConfig = () => ( {
	type: 'tiered',
	box: {
		capacity: 12,
		min_items: 4,
		allow_duplicates: true,
		max_per_product: 3,
		hide_sold_out: false,
	},
	tiers: [
		{ qty: 4, discount_type: 'percent', value: 10 },
		{ qty: 12, discount_type: 'percent', value: 25 },
	],
	sizes: [],
	bundle: { qty: 3, price: 18 },
	products: {
		source: 'manual',
		ids: [ 11 ],
		term_ids: [],
		order: 'manual',
		caps: {},
	},
	schedule: { start: null, end: null, countdown_days: 0 },
	extras: { gift_message: false, gift_wrap: { enabled: false, fee: 0 } },
	design: {
		layout: 'both',
		columns: 0,
		headline: '',
		intro: '',
		sticker: '',
		cta_label: '',
		show_hero: true,
		show_ladder: true,
		show_stickers: true,
		accent: 'max',
		theme: 'light',
	},
	placement: { page_id: 0 },
	container_product_id: 0,
} );

const campaign = ( overrides = {}, configOverrides = {} ) => ( {
	id: 5,
	title: 'Holiday box',
	status: 'draft',
	post_status: 'draft',
	paused: false,
	type: 'tiered',
	config: { ...baseConfig(), ...configOverrides },
	placement: {
		page_id: 0,
		page_title: '',
		page_url: '',
		method: 'none',
		shortcode: '[mmbb_box id="5"]',
	},
	edit_url: EDIT_URL,
	created: '2026-10-19T10:00:00+00:00',
	modified: '2026-10-19T10:30:00+00:00',
	...overrides,
} );

const product = {
	id: 11,
	name: 'Brown Butter Chip',
	sku: 'BBC',
	price: 450,
	stock_status: 'instock',
	stock_quantity: null,
	image: null,
};

function open( step ) {
	window.history.replaceState( null, '', EDIT_URL + '&step=' + step );
	window.mmbbAdmin = {
		page: 'campaigns',
		urls: {
			dashboard: 'http://localhost/wp-admin/admin.php?page=mmbb',
			campaigns:
				'http://localhost/wp-admin/admin.php?page=mmbb-campaigns',
			analytics:
				'http://localhost/wp-admin/admin.php?page=mmbb-analytics',
			settings: 'http://localhost/wp-admin/admin.php?page=mmbb-settings',
			newCampaign:
				'http://localhost/wp-admin/admin.php?page=mmbb-campaigns&action=new',
		},
		templates: [],
		money: {
			symbol: '$',
			position: 'left',
			decimals: 2,
			decimalSeparator: '.',
			thousandSeparator: ',',
		},
		storeUrl: 'http://localhost/',
		timezone: 'UTC',
		locale: 'en-US',
	};
	return render( <App page="campaigns" /> );
}

beforeEach( () => {
	jest.clearAllMocks();
	window.scrollTo = jest.fn();
	api.getCampaign.mockResolvedValue( campaign() );
	api.getProducts.mockResolvedValue( [ product ] );
	api.getTerms.mockResolvedValue( [] );
	api.getPages.mockResolvedValue( [] );
	api.getSetup.mockResolvedValue( { test_order: false } );
	api.markTestDone.mockResolvedValue( {} );
	api.saveCampaign.mockImplementation( ( id, payload ) =>
		Promise.resolve( campaign( { title: payload.title }, payload.config ) )
	);
} );

afterEach( () => {
	jest.useRealTimers();
} );

const nameField = () => screen.findByLabelText( 'Campaign name' );

describe( 'campaign editor', () => {
	it( 'opens the step named in the address with the saved data', async () => {
		open( 'basics' );
		expect( ( await nameField() ).value ).toBe( 'Holiday box' );
		expect( api.getCampaign ).toHaveBeenCalledWith( 5 );
		expect( screen.getByText( /Last saved/ ) ).toBeTruthy();
		expect( screen.queryByText( 'Unsaved changes' ) ).toBeNull();
	} );

	it( 'shows the unsaved bar on the first edit and Discard restores the saved copy', async () => {
		open( 'basics' );
		const field = await nameField();
		fireEvent.change( field, { target: { value: 'Summer box' } } );
		expect(
			screen.getAllByText( 'Unsaved changes' ).length
		).toBeGreaterThan( 0 );
		expect( field.value ).toBe( 'Summer box' );

		fireEvent.click( screen.getByRole( 'button', { name: 'Discard' } ) );
		expect( ( await nameField() ).value ).toBe( 'Holiday box' );
		expect(
			screen.queryByRole( 'button', { name: 'Discard' } )
		).toBeNull();
	} );

	it( 'Save campaign sends a PUT with the draft and takes the server copy', async () => {
		open( 'basics' );
		fireEvent.change( await nameField(), {
			target: { value: 'Summer box' },
		} );
		fireEvent.click(
			screen.getByRole( 'button', { name: 'Save campaign' } )
		);
		await waitFor( () => expect( api.saveCampaign ).toHaveBeenCalled() );
		const [ id, payload, options ] = api.saveCampaign.mock.calls[ 0 ];
		expect( id ).toBe( 5 );
		expect( payload.title ).toBe( 'Summer box' );
		expect( payload.config.type ).toBe( 'tiered' );
		expect( options ).toEqual( { autosave: false } );
		await waitFor( () =>
			expect(
				screen.queryByRole( 'button', { name: 'Discard' } )
			).toBeNull()
		);
	} );

	it( 'autosaves with a PATCH after 30 seconds of unsaved edits, and not before', async () => {
		jest.useFakeTimers();
		open( 'basics' );
		const field = await screen.findByLabelText( 'Campaign name' );
		fireEvent.change( field, { target: { value: 'Summer box' } } );

		await act( async () => {
			jest.advanceTimersByTime( 29000 );
		} );
		expect( api.saveCampaign ).not.toHaveBeenCalled();

		await act( async () => {
			jest.advanceTimersByTime( 2000 );
		} );
		expect( api.saveCampaign ).toHaveBeenCalledTimes( 1 );
		expect( api.saveCampaign.mock.calls[ 0 ][ 2 ] ).toEqual( {
			autosave: true,
		} );

		// Nothing is unsaved now, so the next tick sends nothing.
		await act( async () => {
			jest.advanceTimersByTime( 31000 );
		} );
		expect( api.saveCampaign ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'warns before leaving with unsaved changes, and only then', async () => {
		open( 'basics' );
		const field = await nameField();
		const event = new Event( 'beforeunload', { cancelable: true } );
		window.dispatchEvent( event );
		expect( event.defaultPrevented ).toBe( false );

		fireEvent.change( field, { target: { value: 'Summer box' } } );
		const dirtyEvent = new Event( 'beforeunload', { cancelable: true } );
		window.dispatchEvent( dirtyEvent );
		expect( dirtyEvent.defaultPrevented ).toBe( true );
	} );

	it( 'blocks Next while the step has errors and shows them inline', async () => {
		api.getCampaign.mockResolvedValue(
			campaign(
				{},
				{
					products: { ...baseConfig().products, ids: [] },
				}
			)
		);
		open( 'products' );
		await screen.findByText( 'Add products' );
		fireEvent.click(
			screen.getByRole( 'button', { name: /Next: Box rules/ } )
		);
		expect(
			await screen.findAllByText( 'Pick at least one product.' )
		).not.toHaveLength( 0 );
		expect( screen.queryByText( 'Discount tiers' ) ).toBeNull();
	} );

	it( 'moves on when the step is valid, without a page load', async () => {
		open( 'basics' );
		await nameField();
		fireEvent.click(
			screen.getByRole( 'button', { name: /Next: Products/ } )
		);
		expect( await screen.findByText( 'Add products' ) ).toBeTruthy();
		expect( window.location.search ).toContain( 'step=products' );
	} );

	it( 'does not open a later step while an earlier one is invalid', async () => {
		api.getCampaign.mockResolvedValue(
			campaign(
				{},
				{
					products: { ...baseConfig().products, ids: [] },
				}
			)
		);
		open( 'publish' );
		// Asked for Publish, sent back to the first step with a problem.
		expect( await screen.findByText( 'Add products' ) ).toBeTruthy();
	} );

	it( 'shows tier errors inline once Next is tried', async () => {
		api.getCampaign.mockResolvedValue(
			campaign(
				{},
				{
					tiers: [
						{ qty: 6, discount_type: 'percent', value: 10 },
						{ qty: 6, discount_type: 'percent', value: 20 },
					],
				}
			)
		);
		open( 'rules' );
		await screen.findByText( 'Discount tiers' );
		fireEvent.click(
			screen.getByRole( 'button', { name: /Next: Design/ } )
		);
		expect(
			await screen.findByText( 'Needs more items than the row above.' )
		).toBeTruthy();
	} );

	it( 'goes live with a new page, saving first, then shows the published screen', async () => {
		api.publishCampaign.mockResolvedValue(
			campaign(
				{
					status: 'active',
					post_status: 'publish',
					placement: {
						page_id: 40,
						page_title: 'Holiday box',
						page_url: 'http://localhost/holiday-box/',
						method: 'block',
						shortcode: '[mmbb_box id="5"]',
					},
				},
				{ placement: { page_id: 40 } }
			)
		);
		open( 'publish' );
		await screen.findByText( 'Where shoppers find it' );
		fireEvent.change( screen.getByLabelText( 'Page title' ), {
			target: { value: 'Holiday Treat Box' },
		} );
		fireEvent.click( screen.getByRole( 'button', { name: /Go live/ } ) );

		await waitFor( () => expect( api.publishCampaign ).toHaveBeenCalled() );
		expect( api.publishCampaign.mock.calls[ 0 ][ 0 ] ).toBe( 5 );
		expect( api.publishCampaign.mock.calls[ 0 ][ 1 ] ).toEqual( {
			placement: 'new_page',
			page_title: 'Holiday Treat Box',
			page_slug: 'holiday-box',
		} );
		expect( await screen.findByText( 'Holiday box is live' ) ).toBeTruthy();
		expect( window.location.search ).toContain( 'step=published' );
		expect( screen.getAllByText( /localhost\/holiday-box/ ) ).toHaveLength(
			2
		);
	} );

	it( 'publishes onto an existing page', async () => {
		api.getPages.mockResolvedValue( [
			{
				id: 22,
				title: 'Shop',
				status: 'publish',
				link: 'http://localhost/shop/',
				edit_link: '',
				has_builder: false,
			},
		] );
		api.publishCampaign.mockResolvedValue(
			campaign( { status: 'active', post_status: 'publish' } )
		);
		open( 'publish' );
		fireEvent.click(
			await screen.findByRole( 'radio', { name: /Add to a page I have/ } )
		);
		const select = await screen.findByLabelText( 'Page' );
		await screen.findByRole( 'option', { name: 'Shop' } );
		fireEvent.change( select, { target: { value: '22' } } );
		fireEvent.click( screen.getByRole( 'button', { name: /Go live/ } ) );

		await waitFor( () => expect( api.publishCampaign ).toHaveBeenCalled() );
		expect( api.publishCampaign.mock.calls[ 0 ][ 1 ] ).toEqual( {
			placement: 'existing_page',
			page_id: 22,
		} );
	} );

	it( 'shows the server’s validation errors when Go live is refused', async () => {
		api.publishCampaign.mockRejectedValue( {
			code: 'mmbb_invalid_config',
			message: 'Fix these before going live.',
			data: {
				status: 422,
				errors: [
					{
						path: 'tiers',
						code: 'tiers_required',
						message: 'Add at least one discount tier.',
					},
				],
			},
		} );
		open( 'publish' );
		await screen.findByText( 'Where shoppers find it' );
		fireEvent.click( screen.getByRole( 'button', { name: /Go live/ } ) );
		expect(
			await screen.findByText( 'Add at least one discount tier.' )
		).toBeTruthy();
		expect( screen.queryByText( 'Holiday box is live' ) ).toBeNull();
	} );

	it( 'records a test order from the checklist', async () => {
		open( 'publish' );
		const box = await screen.findByRole( 'checkbox', {
			name: 'Test order placed',
		} );
		fireEvent.click( box );
		await waitFor( () =>
			expect( api.markTestDone ).toHaveBeenCalledWith( true )
		);
	} );

	it( 'shows an error with a retry when the campaign cannot be loaded', async () => {
		api.getCampaign.mockRejectedValueOnce( {
			code: 'mmbb_not_found',
			message: 'Campaign not found.',
		} );
		open( 'basics' );
		expect( await screen.findByText( 'Campaign not found.' ) ).toBeTruthy();
		fireEvent.click( screen.getByRole( 'button', { name: 'Try again' } ) );
		expect( ( await nameField() ).value ).toBe( 'Holiday box' );
	} );
} );
