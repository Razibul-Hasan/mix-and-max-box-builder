import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
import { dispatch, select } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import App from '../../../src/admin/App';
import { NOTICE_CONTEXT } from '../../../src/admin/components';
import * as api from '../../../src/admin/api';
import { navigate } from '../../../src/admin/navigate';

jest.mock( '../../../src/admin/api', () => ( {
	getCampaigns: jest.fn(),
	getProducts: jest.fn(),
	bulkCampaigns: jest.fn(),
	createCampaign: jest.fn(),
	duplicateCampaign: jest.fn(),
	getStats: jest.fn(),
	getSetup: jest.fn(),
	markTestDone: jest.fn(),
	dismissChecklist: jest.fn(),
} ) );

jest.mock( '../../../src/admin/navigate', () => ( {
	navigate: jest.fn(),
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
		tiers: [],
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
	campaign( 12, 'Holiday Treat Box', 'active', {
		placement: {
			page_id: 40,
			page_title: 'Holiday treat box',
			page_url: 'http://shop.test/holiday-treat-box/',
			method: 'block',
			shortcode: '[mmbb_box id="12"]',
		},
		stats: { boxes_sold: 1, revenue: 18445, conversion: 2.7 },
	} ),
	campaign( 9, 'Tee Trio', 'paused', {
		type: 'bundle',
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
	campaign( 7, 'Summer Mix', 'draft' ),
];

const listOf = ( items, extra = {} ) => ( {
	items,
	total: items.length,
	pages: 1,
	counts: {
		all: 3,
		live: 1,
		active: 1,
		ending_soon: 0,
		scheduled: 0,
		draft: 1,
		ended: 0,
		paused: 1,
	},
	...extra,
} );

const lastQuery = () => {
	const calls = api.getCampaigns.mock.calls;
	return calls[ calls.length - 1 ][ 0 ];
};

// jsdom can't navigate, so the one navigation helper is a mock.
const assign = navigate;

// Snackbars live in the shared notices store; start every test with none.
const clearSnackbars = () => {
	const notices = select( noticesStore ).getNotices( NOTICE_CONTEXT );
	dispatch( noticesStore ).removeNotices(
		notices.map( ( n ) => n.id ),
		NOTICE_CONTEXT
	);
};

// The snackbar itself, not its copy in the screen-reader live region.
const findSnackbar = ( text ) =>
	screen.findByText( text, { selector: '.components-snackbar__content' } );

beforeEach( () => {
	jest.clearAllMocks();
	clearSnackbars();
	// jsdom has no scrolling; WordPress components call it.
	window.scrollTo = jest.fn();
	window.history.replaceState( null, '', '/' );
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

const rowOf = ( name ) => screen.getByText( name ).closest( 'tr' );

describe( 'Boxes list', () => {
	it( 'shows the rows with status words, summaries, Shown on and money', async () => {
		await loaded();
		expect(
			screen.getByRole( 'heading', { level: 1, name: 'Boxes' } )
		).toBeTruthy();

		const holiday = rowOf( 'Holiday Treat Box' );
		expect( within( holiday ).getByText( 'Live' ) ).toBeTruthy();
		expect(
			within( holiday ).getByText(
				'Bigger box, bigger discount · up to 12'
			)
		).toBeTruthy();
		expect(
			within( holiday )
				.getByRole( 'link', { name: /\/holiday-treat-box\// } )
				.getAttribute( 'href' )
		).toBe( 'http://shop.test/holiday-treat-box/' );
		expect( within( holiday ).getByText( '$184.45' ) ).toBeTruthy();

		const tee = rowOf( 'Tee Trio' );
		expect( within( tee ).getByText( 'Paused' ) ).toBeTruthy();
		expect(
			within( tee ).getByText( 'Bundle price · 3 for $45.00' )
		).toBeTruthy();
		expect(
			within( tee )
				.getByRole( 'link', { name: 'Add to a page' } )
				.getAttribute( 'href' )
		).toContain( 'action=edit&id=9&step=publish' );

		expect( screen.getByText( '3 boxes' ) ).toBeTruthy();
	} );

	it( 'has the four tabs with counts and maps them to the stored statuses', async () => {
		await loaded();
		const tabs = screen.getByRole( 'group', { name: 'Filter boxes' } );
		const names = within( tabs )
			.getAllByRole( 'button' )
			.map( ( b ) => b.textContent );
		expect( names ).toEqual( [ 'All3', 'Live1', 'Drafts1', 'Ended0' ] );
		expect( lastQuery() ).toMatchObject( { status: '', page: 1 } );

		fireEvent.click(
			within( tabs ).getByRole( 'button', { name: /Live/ } )
		);
		await waitFor( () => expect( lastQuery().status ).toBe( 'live' ) );
		expect(
			within( tabs )
				.getByRole( 'button', { name: /Live/ } )
				.getAttribute( 'aria-pressed' )
		).toBe( 'true' );

		fireEvent.click(
			within( tabs ).getByRole( 'button', { name: /Drafts/ } )
		);
		await waitFor( () => expect( lastQuery().status ).toBe( 'draft' ) );
		fireEvent.click(
			within( tabs ).getByRole( 'button', { name: /Ended/ } )
		);
		await waitFor( () => expect( lastQuery().status ).toBe( 'ended' ) );
	} );

	it( 'debounces the search box', async () => {
		await loaded();
		const calls = api.getCampaigns.mock.calls.length;
		const box = screen.getByRole( 'searchbox', { name: 'Search boxes' } );
		fireEvent.change( box, { target: { value: 't' } } );
		fireEvent.change( box, { target: { value: 'te' } } );
		fireEvent.change( box, { target: { value: 'tea' } } );
		expect( api.getCampaigns.mock.calls.length ).toBe( calls );
		await waitFor( () => expect( lastQuery().search ).toBe( 'tea' ), {
			timeout: 2000,
		} );
		expect( api.getCampaigns.mock.calls.length ).toBe( calls + 1 );
	} );

	it( 'runs bulk actions on the selection, pausing only what can pause', async () => {
		await loaded();
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select Holiday Treat Box' } )
		);
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select Summer Mix' } )
		);
		const bar = screen.getByRole( 'region', { name: 'Bulk actions' } );
		expect( within( bar ).getByText( '2 selected' ) ).toBeTruthy();
		expect(
			within( bar ).queryByRole( 'button', { name: 'Resume' } )
		).toBeNull();

		fireEvent.click(
			within( bar ).getByRole( 'button', { name: 'Pause' } )
		);
		await waitFor( () =>
			expect( api.bulkCampaigns ).toHaveBeenCalledWith( 'pause', [ 12 ] )
		);
		await findSnackbar( 'Paused 1 box' );
		await waitFor( () =>
			expect(
				screen.queryByRole( 'region', { name: 'Bulk actions' } )
			).toBeNull()
		);
	} );

	it( 'selects every row from the header checkbox', async () => {
		await loaded();
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select all rows' } )
		);
		expect( screen.getByText( '3 selected' ) ).toBeTruthy();
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select all rows' } )
		);
		expect( screen.queryByText( '3 selected' ) ).toBeNull();
	} );

	it( 'duplicates, pauses and resumes from the row menu', async () => {
		await loaded();
		api.bulkCampaigns.mockResolvedValueOnce( {
			action: 'duplicate',
			results: [
				{
					id: 12,
					ok: true,
					campaign: { id: 13, title: 'Holiday Treat Box (copy)' },
				},
			],
		} );
		fireEvent.click(
			screen.getByRole( 'button', {
				name: 'More actions for Holiday Treat Box',
			} )
		);
		fireEvent.click(
			await screen.findByRole( 'menuitem', { name: 'Duplicate' } )
		);
		await waitFor( () =>
			expect( api.bulkCampaigns ).toHaveBeenCalledWith( 'duplicate', [
				12,
			] )
		);
		await findSnackbar( 'Duplicated as “Holiday Treat Box (copy)”' );

		fireEvent.click(
			screen.getByRole( 'button', {
				name: 'More actions for Holiday Treat Box',
			} )
		);
		expect(
			screen.queryByRole( 'menuitem', { name: 'Resume' } )
		).toBeNull();
		fireEvent.click(
			await screen.findByRole( 'menuitem', { name: 'Pause' } )
		);
		await waitFor( () =>
			expect( api.bulkCampaigns ).toHaveBeenCalledWith( 'pause', [ 12 ] )
		);

		// Row menus are disabled while the previous action is saving.
		const teeMenu = screen.getByRole( 'button', {
			name: 'More actions for Tee Trio',
		} );
		await waitFor( () => expect( teeMenu.disabled ).toBe( false ) );
		fireEvent.click( teeMenu );
		fireEvent.click(
			await screen.findByRole( 'menuitem', { name: 'Resume' } )
		);
		await waitFor( () =>
			expect( api.bulkCampaigns ).toHaveBeenCalledWith( 'resume', [ 9 ] )
		);
	} );

	it( 'confirms Move to trash, and Escape cancels it', async () => {
		await loaded();
		fireEvent.click(
			screen.getByRole( 'button', {
				name: 'More actions for Holiday Treat Box',
			} )
		);
		fireEvent.click(
			await screen.findByRole( 'menuitem', { name: 'Move to trash' } )
		);
		const dialog = await screen.findByRole( 'dialog', {
			name: 'Move “Holiday Treat Box” to the trash?',
		} );
		fireEvent.keyDown( dialog, { key: 'Escape' } );
		await waitFor( () =>
			expect(
				screen.queryByRole( 'dialog', { name: /to the trash/ } )
			).toBeNull()
		);
		expect( api.bulkCampaigns ).not.toHaveBeenCalled();

		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select Holiday Treat Box' } )
		);
		fireEvent.click(
			within(
				screen.getByRole( 'region', { name: 'Bulk actions' } )
			).getByRole( 'button', { name: 'Move to trash' } )
		);
		const confirm = await screen.findByRole( 'dialog', {
			name: /to the trash/,
		} );
		fireEvent.click(
			within( confirm ).getByRole( 'button', { name: 'Move to trash' } )
		);
		await waitFor( () =>
			expect( api.bulkCampaigns ).toHaveBeenCalledWith( 'delete', [ 12 ] )
		);
	} );

	it( 'shows an error notice with Retry when loading fails', async () => {
		api.getCampaigns.mockRejectedValueOnce( new Error( 'Nope' ) );
		render( <App page="campaigns" /> );
		await screen.findByText( 'Nope', {
			selector: '.components-notice__content',
		} );
		fireEvent.click( screen.getByRole( 'button', { name: 'Retry' } ) );
		await screen.findByText( 'Holiday Treat Box' );
	} );

	it( 'shows the empty state when there are no boxes at all', async () => {
		api.getCampaigns.mockResolvedValue(
			listOf( [], {
				total: 0,
				pages: 0,
				counts: { all: 0, live: 0, draft: 0, ended: 0 },
			} )
		);
		render( <App page="campaigns" /> );
		await screen.findByText( 'Create your first box' );
	} );
} );

describe( 'Create a box', () => {
	it( 'creates a draft of the chosen type and opens the editor at products', async () => {
		api.createCampaign.mockResolvedValue(
			campaign( 31, 'Snacks', 'draft' )
		);
		await loaded();
		fireEvent.click( screen.getByRole( 'button', { name: 'Create box' } ) );
		const dialog = await screen.findByRole( 'dialog', {
			name: 'Create a box',
		} );

		const name = within( dialog ).getByLabelText( 'Box name' );
		fireEvent.change( name, { target: { value: 'Snacks' } } );

		const tiered = within( dialog ).getByRole( 'radio', {
			name: /Bigger box, bigger discount/,
		} );
		expect( tiered.checked ).toBe( true );
		fireEvent.click(
			within( dialog ).getByRole( 'radio', { name: /Set price bundle/ } )
		);
		expect( tiered.checked ).toBe( false );

		await act( async () => {
			fireEvent.click(
				within( dialog ).getByRole( 'button', {
					name: 'Create and pick products',
				} )
			);
		} );
		expect( api.createCampaign ).toHaveBeenCalledWith(
			'blank',
			'Snacks',
			'bundle'
		);
		await waitFor( () =>
			expect( assign ).toHaveBeenCalledWith(
				expect.stringContaining( 'action=edit&id=31&step=products' )
			)
		);
	} );

	it( 'shows the error and stays open when creating fails', async () => {
		api.createCampaign.mockRejectedValue( new Error( 'No room' ) );
		await loaded();
		fireEvent.click( screen.getByRole( 'button', { name: 'Create box' } ) );
		const dialog = await screen.findByRole( 'dialog', {
			name: 'Create a box',
		} );
		fireEvent.click(
			within( dialog ).getByRole( 'button', {
				name: 'Create and pick products',
			} )
		);
		await within( dialog ).findByText( 'No room' );
		expect( assign ).not.toHaveBeenCalled();
	} );

	it( 'closes with Cancel and with Escape', async () => {
		await loaded();
		fireEvent.click( screen.getByRole( 'button', { name: 'Create box' } ) );
		let dialog = await screen.findByRole( 'dialog', {
			name: 'Create a box',
		} );
		fireEvent.click(
			within( dialog ).getByRole( 'button', { name: 'Cancel' } )
		);
		await waitFor( () =>
			expect(
				screen.queryByRole( 'dialog', { name: 'Create a box' } )
			).toBeNull()
		);

		fireEvent.click( screen.getByRole( 'button', { name: 'Create box' } ) );
		dialog = await screen.findByRole( 'dialog', { name: 'Create a box' } );
		fireEvent.keyDown( dialog, { key: 'Escape' } );
		await waitFor( () =>
			expect(
				screen.queryByRole( 'dialog', { name: 'Create a box' } )
			).toBeNull()
		);
		expect( api.createCampaign ).not.toHaveBeenCalled();
	} );

	it( 'opens on load from action=new and drops the arg on close', async () => {
		window.history.replaceState(
			null,
			'',
			'/wp-admin/admin.php?page=mmbb-campaigns&action=new'
		);
		render( <App page="campaigns" /> );
		const dialog = await screen.findByRole( 'dialog', {
			name: 'Create a box',
		} );
		fireEvent.click(
			within( dialog ).getByRole( 'button', { name: 'Cancel' } )
		);
		expect( window.location.search ).toBe( '?page=mmbb-campaigns' );
	} );
} );
