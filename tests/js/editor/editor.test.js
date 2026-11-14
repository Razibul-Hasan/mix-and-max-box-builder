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
	previewCampaign: jest.fn(),
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
		max_per_product: 12,
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
	extras: {
		gift_message: false,
		gift_wrap: { enabled: false, fee: 0 },
		free_gift: { enabled: false, product_id: 0, min_items: 12 },
	},
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
	preview_url: 'http://localhost/?mmbb_preview=5&_wpnonce=abc123',
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

async function choosePage() {
	const select = await screen.findByLabelText( 'Page' );
	await screen.findByRole( 'option', { name: 'Shop' } );
	fireEvent.change( select, { target: { value: '22' } } );
}

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
	window.scrollTo = jest.fn();
	api.getCampaign.mockResolvedValue( campaign() );
	api.getProducts.mockResolvedValue( [ product ] );
	api.getTerms.mockResolvedValue( [] );
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
	api.getSetup.mockResolvedValue( { test_order: false } );
	api.markTestDone.mockResolvedValue( {} );
	api.saveCampaign.mockImplementation( ( id, payload ) =>
		Promise.resolve( campaign( { title: payload.title }, payload.config ) )
	);
} );

afterEach( () => {
	jest.useRealTimers();
} );

const nameField = async () => {
	const content = screen.queryByRole( 'button', { name: 'Content' } );
	if ( content ) {
		fireEvent.click( content );
	}
	return screen.findByLabelText( 'Campaign name' );
};
const PREVIEW_ORIGIN = 'http://localhost';

function frame( container ) {
	return container.querySelector( 'iframe.mmbb-ed__iframe' );
}

// What the iframe says once its page is up.
function sayReady( iframe, origin = PREVIEW_ORIGIN ) {
	act( () => {
		window.dispatchEvent(
			new MessageEvent( 'message', {
				data: { type: 'mmbb:preview:ready' },
				origin,
				source: iframe.contentWindow,
			} )
		);
	} );
}

describe( 'box editor', () => {
	beforeEach( () => {
		window.localStorage.clear();
		api.previewCampaign.mockImplementation( ( id, draft ) =>
			Promise.resolve( {
				id,
				title: draft.title,
				config: { type: draft.config.type },
				products: [],
			} )
		);
	} );

	it( 'opens full screen on the step named in the address, mapping the 1.0 names', async () => {
		const { container } = open( 'basics' );
		expect( ( await nameField() ).value ).toBe( 'Holiday box' );
		expect( api.getCampaign ).toHaveBeenCalledWith( 5 );
		expect(
			screen.getByRole( 'link', { name: 'Back to boxes' } ).href
		).toBe( 'http://localhost/wp-admin/admin.php?page=mmbb-campaigns' );
		expect(
			screen
				.getByRole( 'button', { name: /Design/ } )
				.getAttribute( 'aria-current' )
		).toBe( 'step' );
		expect( screen.getByRole( 'button', { name: 'Undo' } ) ).toHaveProperty(
			'disabled',
			false
		);
		expect(
			screen
				.getByRole( 'button', { name: 'Undo' } )
				.getAttribute( 'aria-disabled' )
		).toBe( 'true' );
		expect( frame( container ).getAttribute( 'src' ) ).toBe(
			campaign().preview_url
		);
		expect( screen.getByRole( 'button', { name: 'Saved' } ) ).toBeTruthy();
	} );

	it( 'undoes and redoes edits from the header', async () => {
		open( 'design' );
		const field = await nameField();
		fireEvent.change( field, { target: { value: 'Summer box' } } );
		expect(
			screen.getByRole( 'button', { name: 'Save draft' } )
		).toBeTruthy();

		fireEvent.click( screen.getByRole( 'button', { name: 'Undo' } ) );
		expect( ( await nameField() ).value ).toBe( 'Holiday box' );
		expect( screen.getByRole( 'button', { name: 'Saved' } ) ).toBeTruthy();

		fireEvent.click( screen.getByRole( 'button', { name: 'Redo' } ) );
		expect( ( await nameField() ).value ).toBe( 'Summer box' );
	} );

	it( 'Save draft sends a PUT, takes the server copy and says Saved', async () => {
		open( 'design' );
		fireEvent.change( await nameField(), {
			target: { value: 'Summer box' },
		} );
		fireEvent.click( screen.getByRole( 'button', { name: 'Save draft' } ) );
		await waitFor( () => expect( api.saveCampaign ).toHaveBeenCalled() );
		const [ id, payload, options ] = api.saveCampaign.mock.calls[ 0 ];
		expect( id ).toBe( 5 );
		expect( payload.title ).toBe( 'Summer box' );
		expect( payload.config.type ).toBe( 'tiered' );
		expect( options ).toEqual( { autosave: false } );
		await waitFor( () =>
			expect(
				document.querySelector( '.components-snackbar' ).textContent
			).toBe( 'Saved' )
		);
		await waitFor( () =>
			expect(
				screen.getByRole( 'button', { name: 'Saved' } )
			).toBeTruthy()
		);
	} );

	it( 'autosaves with a PATCH after 30 seconds of unsaved edits, and not before', async () => {
		jest.useFakeTimers();
		open( 'design' );
		const field = await nameField();
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
		open( 'design' );
		const field = await nameField();
		const event = new Event( 'beforeunload', { cancelable: true } );
		window.dispatchEvent( event );
		expect( event.defaultPrevented ).toBe( false );

		fireEvent.change( field, { target: { value: 'Summer box' } } );
		const dirtyEvent = new Event( 'beforeunload', { cancelable: true } );
		window.dispatchEvent( dirtyEvent );
		expect( dirtyEvent.defaultPrevented ).toBe( true );
	} );

	it( 'restores an unsaved draft after a reload', async () => {
		jest.useFakeTimers();
		const first = open( 'design' );
		fireEvent.change( await nameField(), {
			target: { value: 'Kept box' },
		} );
		await act( async () => {
			jest.advanceTimersByTime( 400 );
		} );
		const stored = JSON.parse(
			window.localStorage.getItem( 'mmbb:editor:5' )
		);
		expect( stored.draft.title ).toBe( 'Kept box' );
		expect( stored.base ).toBe( campaign().modified );
		first.unmount();
		jest.useRealTimers();

		open( 'design' );
		await waitFor( async () =>
			expect( ( await nameField() ).value ).toBe( 'Kept box' )
		);
		expect(
			await screen.findAllByText( 'Your unsaved changes were restored.' )
		).not.toHaveLength( 0 );
		expect(
			screen.getByRole( 'button', { name: 'Save draft' } )
		).toBeTruthy();
	} );

	it( 'blocks Continue while the step has errors and shows them inline', async () => {
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
			screen.getByRole( 'button', { name: 'Continue to discounts' } )
		);
		expect(
			await screen.findAllByText( 'Pick at least one product.' )
		).not.toHaveLength( 0 );
		expect( screen.queryByText( 'Discount tiers' ) ).toBeNull();
	} );

	it( 'moves on when the step is valid, and the header marks it done', async () => {
		open( 'products' );
		await screen.findByText( 'Add products' );
		fireEvent.click(
			screen.getByRole( 'button', { name: 'Continue to discounts' } )
		);
		expect( await screen.findByText( 'Discount tiers' ) ).toBeTruthy();
		expect( window.location.search ).toContain( 'step=discounts' );
		// The schedule moved here from Basics.
		expect( screen.getByText( 'Schedule' ) ).toBeTruthy();
		const done = screen.getByRole( 'button', { name: 'Products' } );
		expect( done.getAttribute( 'aria-current' ) ).toBeNull();
		expect( done.querySelector( 'svg' ) ).toBeTruthy();
	} );

	it( 'shows tier errors inline once Continue is tried', async () => {
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
			screen.getByRole( 'button', { name: 'Continue to design' } )
		);
		expect(
			await screen.findByText( 'Needs more items than the row above.' )
		).toBeTruthy();
	} );

	it( 'opens Publish as a dialog, goes live on the chosen page and shows the published screen', async () => {
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
		open( 'design' );
		await nameField();
		fireEvent.click( screen.getByRole( 'button', { name: 'Publish' } ) );
		expect( await screen.findByRole( 'dialog' ) ).toBeTruthy();
		await choosePage();
		fireEvent.click( screen.getByRole( 'button', { name: /Go live/ } ) );

		await waitFor( () => expect( api.publishCampaign ).toHaveBeenCalled() );
		expect( api.publishCampaign.mock.calls[ 0 ] ).toEqual( [
			5,
			{ placement: 'existing_page', page_id: 22 },
		] );
		expect( await screen.findByText( 'Holiday box is live' ) ).toBeTruthy();
		expect( window.location.search ).toContain( 'step=published' );
		expect( screen.queryByRole( 'dialog' ) ).toBeNull();
	} );

	it( 'opens the Publish dialog from step=publish and shows refused validation', async () => {
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
		await choosePage();
		fireEvent.click( screen.getByRole( 'button', { name: /Go live/ } ) );
		expect(
			await screen.findByText( 'Add at least one discount tier.' )
		).toBeTruthy();
		expect( screen.queryByText( 'Holiday box is live' ) ).toBeNull();
	} );

	it( 'records a test order from the publish checklist', async () => {
		open( 'publish' );
		const box = await screen.findByRole( 'checkbox', {
			name: 'Test order placed',
		} );
		fireEvent.click( box );
		await waitFor( () =>
			expect( api.markTestDone ).toHaveBeenCalledWith( true )
		);
	} );

	it( 'switches the preview between desktop, tablet and phone and remembers it', async () => {
		const { container } = open( 'design' );
		await nameField();
		expect( container.querySelector( '.mmbb-ed__browser' ) ).toBeTruthy();
		expect( frame( container ).style.width ).toBe( '1280px' );

		fireEvent.click( screen.getByRole( 'radio', { name: 'Tablet' } ) );
		expect( frame( container ).style.width ).toBe( '820px' );

		fireEvent.click( screen.getByRole( 'radio', { name: 'Phone' } ) );
		expect( container.querySelector( '.mmbb-ed__phone' ) ).toBeTruthy();
		expect( frame( container ).style.width ).toBe( '390px' );
		expect( window.localStorage.getItem( 'mmbb:editor:device' ) ).toBe(
			'mobile'
		);
	} );

	it( 'sends the draft to the iframe after it says ready, and ignores other origins', async () => {
		jest.useFakeTimers();
		const { container } = open( 'design' );
		await nameField();
		const iframe = frame( container );
		const post = jest.spyOn( iframe.contentWindow, 'postMessage' );
		expect( screen.getByText( 'Loading the preview…' ) ).toBeTruthy();

		// Another origin can't claim to be the preview.
		sayReady( iframe, 'https://evil.test' );
		expect( screen.getByText( 'Loading the preview…' ) ).toBeTruthy();

		sayReady( iframe );
		expect( screen.queryByText( 'Loading the preview…' ) ).toBeNull();
		// The page already shows the saved box, so nothing is sent yet.
		await act( async () => {
			jest.advanceTimersByTime( 200 );
		} );
		expect( api.previewCampaign ).not.toHaveBeenCalled();

		fireEvent.change( await nameField(), {
			target: { value: 'Summer box' },
		} );
		await act( async () => {
			jest.advanceTimersByTime( 100 );
		} );
		expect( api.previewCampaign ).not.toHaveBeenCalled();
		await act( async () => {
			jest.advanceTimersByTime( 100 );
		} );
		expect( api.previewCampaign ).toHaveBeenCalledTimes( 1 );
		expect( api.previewCampaign.mock.calls[ 0 ][ 1 ].title ).toBe(
			'Summer box'
		);
		await waitFor( () => expect( post ).toHaveBeenCalled() );
		const [ message, target ] = post.mock.calls[ 0 ];
		expect( target ).toBe( PREVIEW_ORIGIN );
		expect( message.type ).toBe( 'mmbb:preview:config' );
		expect( message.boxId ).toBe( 5 );
		expect( message.payload.title ).toBe( 'Summer box' );
		expect( message.config ).toEqual( { type: 'tiered' } );
	} );

	it( 'shows an error with a retry when the box cannot be loaded', async () => {
		api.getCampaign.mockRejectedValueOnce( {
			code: 'mmbb_not_found',
			message: 'Campaign not found.',
		} );
		open( 'design' );
		expect( await screen.findByText( 'Campaign not found.' ) ).toBeTruthy();
		fireEvent.click( screen.getByRole( 'button', { name: 'Try again' } ) );
		expect( ( await nameField() ).value ).toBe( 'Holiday box' );
	} );
} );
