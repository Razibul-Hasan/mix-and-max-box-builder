import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Builder from '../../../src/storefront/Builder';
import { addBoxToCart } from '../../../src/storefront/api';

jest.mock( '../../../src/storefront/api', () => ( {
	addBoxToCart: jest.fn(),
} ) );

const product = ( id, name ) => ( {
	id,
	product_id: id,
	variation_id: 0,
	name,
	meta: '',
	price: 500,
	compare_at: 0,
	stock: null,
	image: null,
	categories: [],
	badge: null,
} );

const payload = () => ( {
	id: 5,
	title: 'Holiday box',
	status: 'active',
	preview: false,
	config: {
		type: 'tiered',
		box: {
			capacity: 3,
			min_items: 2,
			allow_duplicates: true,
			max_per_product: 3,
			hide_sold_out: false,
		},
		tiers: [ { qty: 2, discount_type: 'percent', value: 10 } ],
		sizes: [],
		bundle: { qty: 3, price: 0 },
		extras: { gift_message: false, gift_wrap: { enabled: false, fee: 0 } },
		design: {
			headline: '',
			intro: '',
			sticker: '',
			show_stickers: true,
			show_ladder: true,
			theme: 'light',
			cta_label: '',
		},
		caps: {},
		schedule: { end: null, countdown_days: 0 },
	},
	view: { layout: 'panel', columns: 3, showHero: true },
	settings: {
		unlockToast: true,
		stickers: true,
		ctaLabel: '',
		emptyHint: '',
	},
	products: [ product( 1, 'Cookie' ), product( 2, 'Tea' ) ],
	money: {
		symbol: '$',
		position: 'left',
		decimals: 2,
		decimalSeparator: '.',
		thousandSeparator: ',',
	},
	now: '2026-01-01T00:00:00Z',
	cart: { nonce: 'n', addUrl: '/add', nonceUrl: '/nonce', cartUrl: '/cart/' },
	edit: null,
} );

const addButtons = () =>
	screen.getAllByRole( 'button', { name: /add to box/i } );

beforeEach( () => {
	window.sessionStorage.clear();
	addBoxToCart.mockReset();
} );

it( 'builds a box, unlocks a tier and goes to the cart', async () => {
	addBoxToCart.mockResolvedValue( { ok: true, cartUrl: '/cart/' } );
	const navigate = jest.fn();
	render( <Builder payload={ payload() } navigate={ navigate } /> );

	fireEvent.click( addButtons()[ 0 ] );
	fireEvent.click( addButtons()[ 0 ] );

	expect( await screen.findByText( /You unlocked 10% off/ ) ).toBeTruthy();
	fireEvent.click(
		screen.getByRole( 'button', { name: /add box to cart/i } )
	);
	await waitFor( () => expect( navigate ).toHaveBeenCalledWith( '/cart/' ) );
	expect( addBoxToCart.mock.calls[ 0 ][ 0 ].rows ).toEqual( [
		{ product_id: 1, variation_id: 0, qty: 1 },
		{ product_id: 2, variation_id: 0, qty: 1 },
	] );
} );

it( 'shows the server message when adding fails', async () => {
	addBoxToCart.mockResolvedValue( {
		ok: false,
		code: 'out_of_stock',
		message: 'Tea is sold out.',
	} );
	render( <Builder payload={ payload() } navigate={ jest.fn() } /> );
	fireEvent.click( addButtons()[ 0 ] );
	fireEvent.click( addButtons()[ 0 ] );
	fireEvent.click(
		screen.getByRole( 'button', { name: /add box to cart/i } )
	);
	expect( await screen.findByText( 'Tea is sold out.' ) ).toBeTruthy();
} );

it( 'keeps the box across a reload, and stores nothing in preview', () => {
	const { unmount } = render( <Builder payload={ payload() } /> );
	fireEvent.click( addButtons()[ 0 ] );
	unmount();
	expect( window.sessionStorage.getItem( 'mmbb:box:5' ) ).toContain(
		'"items":[1]'
	);

	window.sessionStorage.clear();
	render( <Builder payload={ payload() } preview /> );
	fireEvent.click( addButtons()[ 0 ] );
	expect( window.sessionStorage.getItem( 'mmbb:box:5' ) ).toBeNull();
} );
