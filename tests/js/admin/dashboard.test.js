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
	dismissChecklist: jest.fn(),
} ) );

jest.mock( '../../../src/admin/navigate', () => ( {
	navigate: jest.fn(),
} ) );

const kpi = ( value, extra = {} ) => ( {
	value,
	previous: 0,
	delta: null,
	series: [ 0, 0, 0 ],
	...extra,
} );

const stats = {
	range: '30d',
	kpis: {
		revenue: kpi( 18445 ),
		boxes: kpi( 1 ),
		avg_box_value: kpi( 18445 ),
		items_per_box: kpi( 6 ),
		conversion: kpi( 2.7 ),
	},
	revenue_series: [],
	top_campaigns: [
		{ id: 12, name: 'Holiday treat box', boxes: 1, revenue: 18445 },
	],
	live_campaign: null,
	top_products: [
		{ id: 1, name: 'Polo', count: 25 },
		{ id: 2, name: 'Belt', count: 23 },
	],
	funnel: [
		{ step: 'view', count: 37 },
		{ step: 'started', count: 9 },
		{ step: 'purchased', count: 1 },
	],
};

const setupAt = ( doneIds, extra = {} ) => ( {
	steps: [
		'woocommerce',
		'campaign',
		'products',
		'placed',
		'test_order',
		'live',
	].map( ( id ) => ( { id, done: doneIds.includes( id ) } ) ),
	next: null,
	complete: false,
	dismissed: false,
	...extra,
} );

const box = ( id, title, status, extra = {} ) => ( {
	id,
	title,
	status,
	config: {
		type: 'tiered',
		box: { capacity: 12 },
		tiers: [
			{ qty: 4, discount_type: 'percent', value: 10 },
			{ qty: 6, discount_type: 'percent', value: 15 },
			{ qty: 12, discount_type: 'percent', value: 25 },
		],
		sizes: [],
		bundle: { qty: 3, price: 0 },
		products: { source: 'manual', ids: [ 1, 2, 3, 4, 5 ], term_ids: [] },
		schedule: {},
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

const boxes = [
	box( 12, 'Holiday treat box', 'active' ),
	box( 7, 'Tee trio', 'draft', {
		config: {
			type: 'bundle',
			box: { capacity: 3 },
			tiers: [],
			sizes: [],
			bundle: { qty: 3, price: 45 },
			products: { source: 'manual', ids: [], term_ids: [] },
			schedule: {},
		},
	} ),
];

// jsdom has no layout. ToggleGroupControl watches its size; the stub never fires.
beforeAll( () => {
	window.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
} );

beforeEach( () => {
	jest.clearAllMocks();
	window.localStorage.clear();
	window.scrollTo = jest.fn();
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
	api.getStats.mockResolvedValue( stats );
	api.getSetup.mockResolvedValue(
		setupAt( [ 'woocommerce', 'campaign', 'products' ] )
	);
	api.getCampaigns.mockResolvedValue( {
		items: boxes,
		total: 2,
		pages: 1,
		counts: { all: 2 },
	} );
	api.dismissChecklist.mockResolvedValue(
		setupAt( [], { dismissed: true } )
	);
	api.markTestDone.mockResolvedValue( setupAt( [] ) );
} );

const loaded = async () => {
	render( <App page="dashboard" /> );
	await screen.findByText( 'Average box value' );
	await screen.findByText( 'Tee trio' );
};

describe( 'Home', () => {
	it( 'shows the key numbers with their change and notes', async () => {
		await loaded();
		expect(
			screen.getByRole( 'heading', { level: 1, name: 'Home' } )
		).toBeTruthy();
		expect(
			screen.getByText( 'How your boxes did in the last 30 days.' )
		).toBeTruthy();
		const numbers = screen.getByRole( 'region', { name: 'Key numbers' } );
		expect( within( numbers ).getAllByText( '$184.45' ) ).toHaveLength( 2 );
		expect(
			within( numbers ).getByText( '+$184.45 vs previous 30 days' )
		).toBeTruthy();
		expect(
			within( numbers ).getByText( '+1 vs previous 30 days' )
		).toBeTruthy();
		expect( within( numbers ).getByText( '6 items per box' ) ).toBeTruthy();
		expect( within( numbers ).getByText( '2.7%' ) ).toBeTruthy();
		expect(
			within( numbers ).getByText( '37 visits, 1 order' )
		).toBeTruthy();
	} );

	it( 'lists your boxes with this period’s numbers and an Edit link', async () => {
		await loaded();
		const table = screen.getByRole( 'table', { name: 'Your boxes' } );
		const holiday = within( table )
			.getByText( 'Holiday treat box' )
			.closest( 'tr' );
		expect(
			within( holiday ).getByText( 'Up to 12 items · 10 / 15 / 25% off' )
		).toBeTruthy();
		expect( within( holiday ).getByText( 'Live' ) ).toBeTruthy();
		expect( within( holiday ).getByText( '$184.45' ) ).toBeTruthy();
		expect(
			within( holiday )
				.getByRole( 'link', { name: 'Edit Holiday treat box' } )
				.getAttribute( 'href' )
		).toContain( 'action=edit&id=12' );

		const tee = within( table ).getByText( 'Tee trio' ).closest( 'tr' );
		expect(
			within( tee ).getByText( '3 items for one price' )
		).toBeTruthy();
		expect( within( tee ).getByText( 'Draft' ) ).toBeTruthy();
		expect( within( tee ).getByText( '$0.00' ) ).toBeTruthy();
	} );

	it( 'draws most picked as bars scaled to the top product', async () => {
		await loaded();
		const card = screen
			.getByRole( 'heading', { name: 'Most picked' } )
			.closest( 'section' );
		expect( within( card ).getByText( 'Polo' ) ).toBeTruthy();
		const bars = card.querySelectorAll( '.mmbb-app-bars__track i' );
		expect( bars[ 0 ].style.width ).toBe( '100%' );
		expect( bars[ 1 ].style.width ).toBe( '92%' );
	} );

	it( 'shows four setup steps with the next one highlighted and its action inline', async () => {
		await loaded();
		const card = screen
			.getByRole( 'heading', { name: 'Finish setting up' } )
			.closest( 'section' );
		expect( within( card ).getByText( '2 of 4 done.' ) ).toBeTruthy();
		const steps = within( card ).getAllByRole( 'listitem' );
		expect( steps ).toHaveLength( 4 );
		expect(
			within( steps[ 0 ] ).getByText( 'Holiday treat box' )
		).toBeTruthy();
		expect(
			within( steps[ 1 ] ).getByText( '5 products picked' )
		).toBeTruthy();

		const next = steps[ 2 ];
		expect( next.getAttribute( 'aria-current' ) ).toBe( 'step' );
		const add = within( next ).getByRole( 'link', {
			name: 'Add to a page',
		} );
		expect( add.getAttribute( 'href' ) ).toContain(
			'action=edit&id=12&step=publish'
		);
		expect( add.className ).toContain( 'is-primary' );

		fireEvent.click(
			within( steps[ 3 ] ).getByRole( 'button', { name: 'Mark as done' } )
		);
		await waitFor( () => expect( api.markTestDone ).toHaveBeenCalled() );
	} );

	it( 'hides the checklist for this user when dismissed', async () => {
		await loaded();
		fireEvent.click(
			screen.getByRole( 'button', { name: 'Hide the setup checklist' } )
		);
		expect( screen.queryByText( 'Finish setting up' ) ).toBeNull();
		expect( api.dismissChecklist ).toHaveBeenCalledWith( true );
	} );

	it( 'does not show the checklist once dismissed or finished', async () => {
		api.getSetup.mockResolvedValue( setupAt( [], { dismissed: true } ) );
		await loaded();
		expect( screen.queryByText( 'Finish setting up' ) ).toBeNull();
	} );

	it( 'carries a 1.0 dismissal from localStorage over to the account', async () => {
		window.localStorage.setItem( 'mmbb:checklist-dismissed', '1' );
		await loaded();
		await waitFor( () =>
			expect( api.dismissChecklist ).toHaveBeenCalledWith( true )
		);
		expect( screen.queryByText( 'Finish setting up' ) ).toBeNull();
	} );

	it( 'rescopes the numbers when the period changes', async () => {
		await loaded();
		expect( api.getStats ).toHaveBeenLastCalledWith( '30d' );
		fireEvent.click( screen.getByRole( 'radio', { name: '7 days' } ) );
		await waitFor( () =>
			expect( api.getStats ).toHaveBeenLastCalledWith( '7d' )
		);
		expect(
			screen.getByText( 'How your boxes did in the last 7 days.' )
		).toBeTruthy();
	} );

	it( 'shows an error notice with Retry when a request fails', async () => {
		api.getStats.mockRejectedValueOnce( new Error( 'Stats are down' ) );
		render( <App page="dashboard" /> );
		await screen.findByText( 'Stats are down', {
			selector: '.components-notice__content',
		} );
		fireEvent.click( screen.getByRole( 'button', { name: 'Retry' } ) );
		await screen.findByText( '37 visits, 1 order' );
		expect( document.querySelector( '.components-notice' ) ).toBeNull();
	} );

	it( 'shows the empty state and opens Create a box with no boxes yet', async () => {
		api.getCampaigns.mockResolvedValue( {
			items: [],
			total: 0,
			pages: 0,
			counts: { all: 0 },
		} );
		api.getSetup.mockResolvedValue( setupAt( [ 'woocommerce' ] ) );
		render( <App page="dashboard" /> );
		await screen.findByText( 'Create your first box' );
		const steps = screen.getAllByRole( 'listitem' );
		fireEvent.click(
			within( steps[ 0 ] ).getByRole( 'button', { name: 'Create a box' } )
		);
		expect(
			await screen.findByRole( 'dialog', { name: 'Create a box' } )
		).toBeTruthy();
	} );
} );
