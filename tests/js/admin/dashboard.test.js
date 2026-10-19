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
	getStats: jest.fn(),
	getSetup: jest.fn(),
	markTestDone: jest.fn(),
} ) );

const kpi = ( value, extra = {} ) => ( {
	value,
	previous: 0,
	delta: null,
	series: [ 0, 0, 0 ],
	...extra,
} );

const emptyStats = {
	range: '30d',
	kpis: {
		revenue: kpi( 0 ),
		boxes: kpi( 0 ),
		avg_box_value: kpi( 0 ),
		conversion: kpi( 0 ),
	},
	revenue_series: [],
	top_campaigns: [],
	live_campaign: null,
	top_products: [],
};

const busyStats = {
	range: '30d',
	kpis: {
		revenue: kpi( 1248000, { previous: 1054000, delta: 18.4 } ),
		boxes: kpi( 412, { previous: 378, delta: 9.1 } ),
		avg_box_value: kpi( 3029, { previous: 3100, delta: -2.3 } ),
		conversion: kpi( 7.8, { previous: 6.6, delta: 1.2 } ),
	},
	revenue_series: [
		{ date: '2026-10-18', current: 78000, previous: 47000 },
		{ date: '2026-10-19', current: 86000, previous: 48000 },
	],
	top_campaigns: [],
	live_campaign: { id: 12, boxes_today: 18, conversion: 9.2 },
	top_products: [ { name: 'Brown Butter Chip', count: 486 } ],
};

const step = ( id, done ) => ( { id, done } );
const setupAt = ( doneIds, next ) => ( {
	steps: [
		'woocommerce',
		'campaign',
		'products',
		'placed',
		'test_order',
		'live',
	].map( ( id ) => step( id, doneIds.includes( id ) ) ),
	next,
	complete: next === null,
} );

const holiday = {
	id: 12,
	title: 'Holiday Treat Box',
	status: 'active',
	config: {
		type: 'tiered',
		box: { capacity: 12 },
		tiers: [
			{ qty: 4, type: 'percent', value: 10 },
			{ qty: 6, type: 'percent', value: 15 },
			{ qty: 12, type: 'percent', value: 25 },
		],
		sizes: [],
		bundle: { qty: 3, price: 0 },
		products: { source: 'manual', ids: [], term_ids: [] },
		schedule: { start: null, end: '2099-12-24T00:00:00Z' },
	},
	placement: {
		page_url: 'http://shop.test/holiday-box/',
		method: 'block',
		shortcode: '[mmbb_box id="12"]',
	},
	stats: { boxes_sold: 214, revenue: 648050, conversion: 9.2 },
	edit_url:
		'http://shop.test/wp-admin/admin.php?page=mmbb-campaigns&action=edit&id=12',
};

beforeEach( () => {
	jest.clearAllMocks();
	window.localStorage.clear();
	window.mmbbAdmin = {
		page: 'dashboard',
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
		templates: [],
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
	api.getProducts.mockResolvedValue( [] );
	api.getCampaigns.mockResolvedValue( {
		items: [ holiday ],
		total: 1,
		pages: 1,
		counts: { all: 1 },
	} );
} );

describe( 'Dashboard', () => {
	it( 'shows the first-run state until a box has sold', async () => {
		api.getStats.mockResolvedValue( emptyStats );
		api.getSetup.mockResolvedValue(
			setupAt( [ 'woocommerce', 'campaign' ], 'products' )
		);
		render( <App page="dashboard" /> );

		await screen.findByText( 'Welcome to Mix and Max' );
		expect( screen.getByText( 'Launch your first box' ) ).toBeTruthy();
		expect( screen.getByText( 'How a box campaign works' ) ).toBeTruthy();
		expect( screen.getByText( '2 of 6 done' ) ).toBeTruthy();

		// Only the next step carries its action inline.
		const next = screen
			.getByText( 'Add products to the box' )
			.closest( 'li' );
		expect( next.getAttribute( 'aria-current' ) ).toBe( 'step' );
		expect(
			within( next )
				.getByRole( 'link', { name: 'Add products' } )
				.getAttribute( 'href' )
		).toContain( 'action=edit&id=12&step=products' );
		expect( screen.queryByText( 'Box revenue' ) ).toBeNull();
	} );

	it( 'shows KPIs, the chart, the live campaign and top products once boxes sell', async () => {
		api.getStats.mockResolvedValue( busyStats );
		api.getSetup.mockResolvedValue(
			setupAt( [ 'woocommerce', 'campaign', 'products' ], 'placed' )
		);
		render( <App page="dashboard" /> );

		await screen.findByText( 'Box revenue' );
		expect( screen.getByText( '$12,480' ) ).toBeTruthy();
		expect( screen.getByText( '412' ) ).toBeTruthy();
		expect( screen.getByText( '$30.29' ) ).toBeTruthy();
		expect( screen.getByText( '7.8%' ) ).toBeTruthy();
		expect(
			screen.getByText( '3 steps to your first box sale' )
		).toBeTruthy();
		expect(
			screen.getByRole( 'button', { name: 'Copy shortcode' } )
		).toBeTruthy();

		expect( screen.getByText( 'Live now' ) ).toBeTruthy();
		expect( screen.getByRole( 'timer' ) ).toBeTruthy();
		expect(
			screen.getByText( /Tiered mix · up to 12 · 10 \/ 15 \/ 25% off/ )
		).toBeTruthy();
		expect( screen.getByText( 'Brown Butter Chip' ) ).toBeTruthy();
		expect(
			screen.getByRole( 'img', { name: 'Revenue from boxes, daily' } )
		).toBeTruthy();
	} );

	it( 'rescopes every number when the date range changes', async () => {
		api.getStats.mockResolvedValue( busyStats );
		api.getSetup.mockResolvedValue( setupAt( [], 'woocommerce' ) );
		render( <App page="dashboard" /> );
		await screen.findByText( 'Box revenue' );
		expect( api.getStats ).toHaveBeenLastCalledWith( '30d' );

		fireEvent.click( screen.getByRole( 'radio', { name: '7 days' } ) );
		await waitFor( () =>
			expect( api.getStats ).toHaveBeenLastCalledWith( '7d' )
		);
		expect( screen.getByText( /last 7 days/ ) ).toBeTruthy();
	} );

	it( 'hides the checklist when dismissed and remembers it', async () => {
		api.getStats.mockResolvedValue( busyStats );
		api.getSetup.mockResolvedValue(
			setupAt( [ 'woocommerce' ], 'campaign' )
		);
		render( <App page="dashboard" /> );
		await screen.findByText( 'Box revenue' );
		fireEvent.click(
			screen.getByRole( 'button', { name: 'Hide checklist' } )
		);
		expect( screen.queryByText( 'Run a test order' ) ).toBeNull();
		expect(
			window.localStorage.getItem( 'mmbb:checklist-dismissed' )
		).toBe( '1' );
	} );

	it( 'shows a critical notice with Retry when a request fails', async () => {
		api.getStats.mockRejectedValueOnce( new Error( 'Stats are down' ) );
		api.getSetup.mockResolvedValue( setupAt( [], 'woocommerce' ) );
		render( <App page="dashboard" /> );
		const alert = await screen.findByRole( 'alert' );
		expect( within( alert ).getByText( 'Stats are down' ) ).toBeTruthy();
		api.getStats.mockResolvedValue( busyStats );
		fireEvent.click(
			within( alert ).getByRole( 'button', { name: 'Retry' } )
		);
		await screen.findByText( 'Box revenue' );
	} );
} );
