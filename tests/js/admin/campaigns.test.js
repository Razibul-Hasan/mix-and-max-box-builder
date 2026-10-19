import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import App from '../../../src/admin/App';
import * as api from '../../../src/admin/api';

jest.mock( '../../../src/admin/api', () => ( {
	getCampaigns: jest.fn(),
	getProducts: jest.fn(),
	bulkCampaigns: jest.fn(),
	createCampaign: jest.fn(),
	duplicateCampaign: jest.fn(),
	getStats: jest.fn(),
	getSetup: jest.fn(),
	markTestDone: jest.fn(),
} ) );

const campaign = ( id, title, status, extra = {} ) => ( {
	id,
	title,
	status,
	post_status: status === 'draft' ? 'draft' : 'publish',
	paused: status === 'paused',
	type: 'tiered',
	config: {
		type: 'tiered',
		box: { capacity: 12 },
		sizes: [],
		bundle: { qty: 3, price: 0 },
		products: { source: 'manual', ids: [], term_ids: [] },
		schedule: { start: null, end: null },
	},
	placement: {
		page_id: 0,
		page_title: '',
		page_url: '',
		method: 'none',
		shortcode: '[mmbb_box id="' + id + '"]',
	},
	stats: { boxes_sold: 0, revenue: 0, conversion: 0 },
	edit_url:
		'http://shop.test/wp-admin/admin.php?page=mmbb-campaigns&action=edit&id=' +
		id,
	...extra,
} );

const rows = [
	campaign( 12, 'Holiday Treat Box', 'active' ),
	campaign( 9, 'Build-a-Spa Kit', 'active' ),
	campaign( 7, 'Chocolate Lab', 'draft' ),
];

const listOf = ( items, extra = {} ) => ( {
	items,
	total: items.length,
	pages: 1,
	counts: {
		all: 3,
		live: 2,
		active: 2,
		ending_soon: 0,
		scheduled: 0,
		draft: 1,
		ended: 0,
		paused: 0,
	},
	...extra,
} );

const lastQuery = () => {
	const calls = api.getCampaigns.mock.calls;
	return calls[ calls.length - 1 ][ 0 ];
};

beforeEach( () => {
	jest.clearAllMocks();
	window.mmbbAdmin = {
		page: 'campaigns',
		urls: {
			dashboard: 'http://shop.test/wp-admin/admin.php?page=mmbb',
			campaigns:
				'http://shop.test/wp-admin/admin.php?page=mmbb-campaigns',
			analytics:
				'http://shop.test/wp-admin/admin.php?page=mmbb-analytics',
			settings: 'http://shop.test/wp-admin/admin.php?page=mmbb-settings',
			newCampaign:
				'http://shop.test/wp-admin/admin.php?page=mmbb-campaigns&action=new',
		},
		templates: [
			{
				id: 'blank',
				title: 'Start blank',
				typeLabel: 'Any type',
				description: 'Empty rules.',
				art: [],
			},
		],
		money: {
			symbol: '$',
			position: 'left',
			decimals: 2,
			decimalSeparator: '.',
			thousandSeparator: ',',
		},
		storeUrl: 'http://shop.test/',
		timezone: 'UTC',
		locale: 'en-US',
	};
	api.getCampaigns.mockResolvedValue( listOf( rows ) );
	api.getProducts.mockResolvedValue( [] );
	api.bulkCampaigns.mockResolvedValue( {
		action: 'pause',
		results: [ { id: 12, ok: true, campaign: null } ],
	} );
} );

const loaded = async () => {
	render( <App page="campaigns" /> );
	await screen.findByText( 'Holiday Treat Box' );
};

describe( 'Campaigns list', () => {
	it( 'shows the rows, status words and tab counts', async () => {
		await loaded();
		expect( screen.getAllByText( 'Active' ).length ).toBeGreaterThan( 0 );
		expect( screen.getByText( 'Draft' ) ).toBeTruthy();
		expect( screen.getAllByText( 'Not placed' ) ).toHaveLength( 3 );
		const tab = screen.getByRole( 'tab', { name: /Active/ } );
		expect( within( tab ).getByText( '2' ) ).toBeTruthy();
		expect( screen.getByText( 'Showing 1–3 of 3' ) ).toBeTruthy();
		expect( lastQuery() ).toMatchObject( {
			status: '',
			page: 1,
			per_page: 20,
		} );
	} );

	it( 'filters by status tab, type and sort', async () => {
		await loaded();
		fireEvent.click( screen.getByRole( 'tab', { name: /Drafts/ } ) );
		await waitFor( () => expect( lastQuery().status ).toBe( 'draft' ) );

		fireEvent.click( screen.getByRole( 'tab', { name: /Active/ } ) );
		await waitFor( () => expect( lastQuery().status ).toBe( 'live' ) );

		fireEvent.change( screen.getByLabelText( 'Campaign type' ), {
			target: { value: 'fixed' },
		} );
		await waitFor( () => expect( lastQuery().type ).toBe( 'fixed' ) );

		fireEvent.change( screen.getByLabelText( 'Sort' ), {
			target: { value: 'revenue' },
		} );
		await waitFor( () => expect( lastQuery().orderby ).toBe( 'revenue' ) );
		expect( lastQuery() ).toMatchObject( {
			status: 'live',
			type: 'fixed',
		} );
	} );

	it( 'debounces the search box', async () => {
		await loaded();
		const calls = api.getCampaigns.mock.calls.length;
		const box = screen.getByLabelText( 'Search campaigns' );
		fireEvent.change( box, { target: { value: 't' } } );
		fireEvent.change( box, { target: { value: 'te' } } );
		fireEvent.change( box, { target: { value: 'tea' } } );
		expect( api.getCampaigns.mock.calls.length ).toBe( calls );
		await waitFor( () => expect( lastQuery().search ).toBe( 'tea' ), {
			timeout: 2000,
		} );
		expect( api.getCampaigns.mock.calls.length ).toBe( calls + 1 );
	} );

	it( 'moves between pages', async () => {
		api.getCampaigns.mockResolvedValue(
			listOf( rows, { total: 45, pages: 3 } )
		);
		await loaded();
		expect( screen.getByText( 'Showing 1–20 of 45' ) ).toBeTruthy();
		const previous = screen.getByRole( 'button', {
			name: 'Previous page',
		} );
		expect( previous.disabled ).toBe( true );
		fireEvent.click( screen.getByRole( 'button', { name: 'Next page' } ) );
		await waitFor( () => expect( lastQuery().page ).toBe( 2 ) );
	} );

	it( 'selects rows, shows the bulk bar and pauses only what can pause', async () => {
		await loaded();
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select Holiday Treat Box' } )
		);
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select Chocolate Lab' } )
		);
		expect( screen.getByText( '2 selected' ) ).toBeTruthy();

		fireEvent.click( screen.getByRole( 'button', { name: 'Pause' } ) );
		await waitFor( () =>
			expect( api.bulkCampaigns ).toHaveBeenCalledWith( 'pause', [ 12 ] )
		);
		await screen.findByText( 'Paused 1 campaign' );
		await waitFor( () =>
			expect( screen.queryByText( '2 selected' ) ).toBeNull()
		);
	} );

	it( 'selects every row from the header checkbox', async () => {
		await loaded();
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select all' } )
		);
		expect( screen.getByText( '3 selected' ) ).toBeTruthy();
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select all' } )
		);
		expect( screen.queryByText( '3 selected' ) ).toBeNull();
	} );

	it( 'confirms before deleting, with focus on Cancel', async () => {
		await loaded();
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select Holiday Treat Box' } )
		);
		const opener = screen.getByRole( 'button', { name: 'Delete' } );
		opener.focus();
		fireEvent.click( opener );

		const dialog = screen.getByRole( 'alertdialog' );
		expect(
			within( dialog ).getByText( /Delete “Holiday Treat Box”\?/ )
		).toBeTruthy();
		expect(
			within( dialog ).getByText( 'Holiday Treat Box is live' )
		).toBeTruthy();
		expect( document.activeElement ).toBe(
			within( dialog ).getByRole( 'button', { name: 'Cancel' } )
		);

		fireEvent.keyDown( document, { key: 'Escape' } );
		expect( screen.queryByRole( 'alertdialog' ) ).toBeNull();
		expect( api.bulkCampaigns ).not.toHaveBeenCalled();

		fireEvent.click( screen.getByRole( 'button', { name: 'Delete' } ) );
		fireEvent.click(
			within( screen.getByRole( 'alertdialog' ) ).getByRole( 'button', {
				name: 'Delete 1 campaign',
			} )
		);
		await waitFor( () =>
			expect( api.bulkCampaigns ).toHaveBeenCalledWith( 'delete', [ 12 ] )
		);
	} );

	it( 'offers Pause instead and uses it', async () => {
		await loaded();
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select Holiday Treat Box' } )
		);
		fireEvent.click( screen.getByRole( 'button', { name: 'Delete' } ) );
		fireEvent.click(
			screen.getByRole( 'button', { name: 'Pause instead' } )
		);
		await waitFor( () =>
			expect( api.bulkCampaigns ).toHaveBeenCalledWith( 'pause', [ 12 ] )
		);
	} );

	it( 'shows a critical notice with Retry when loading fails', async () => {
		api.getCampaigns.mockRejectedValueOnce( new Error( 'Nope' ) );
		render( <App page="campaigns" /> );
		const alert = await screen.findByRole( 'alert' );
		expect(
			within( alert ).getByText( 'Campaigns could not load' )
		).toBeTruthy();
		fireEvent.click(
			within( alert ).getByRole( 'button', { name: 'Retry' } )
		);
		await screen.findByText( 'Holiday Treat Box' );
	} );

	it( 'shows the first-run state when there are no campaigns at all', async () => {
		api.getCampaigns.mockResolvedValue(
			listOf( [], {
				total: 0,
				pages: 0,
				counts: {
					all: 0,
					live: 0,
					draft: 0,
					scheduled: 0,
					ended: 0,
					paused: 0,
				},
			} )
		);
		render( <App page="campaigns" /> );
		await screen.findByText( 'Launch your first box' );
	} );

	it( 'opens the template picker from Create campaign', async () => {
		await loaded();
		fireEvent.click(
			screen.getAllByRole( 'button', { name: 'Create campaign' } )[ 0 ]
		);
		expect(
			screen.getByRole( 'dialog', { name: 'Start a new box campaign' } )
		).toBeTruthy();
	} );
} );
