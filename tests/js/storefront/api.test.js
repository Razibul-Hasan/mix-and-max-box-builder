import { addBoxToCart } from '../../../src/storefront/api';

const cart = {
	nonce: 'old',
	addUrl: '/?wc-ajax=mmbb_add_box',
	nonceUrl: '/?wc-ajax=mmbb_nonce',
	cartUrl: '/cart/',
};
const base = {
	cart,
	campaignId: 7,
	rows: [ { product_id: 3, variation_id: 0, qty: 2 } ],
	size: 0,
	gift: { enabled: true, message: 'Hi' },
};
const reply = ( json ) => ( { json: () => Promise.resolve( json ) } );
const expired = {
	success: false,
	data: { code: 'mmbb_nonce_expired', message: 'Expired' },
};
const bodyOf = ( fetchImpl, call ) =>
	new URLSearchParams( fetchImpl.mock.calls[ call ][ 1 ].body.toString() );

describe( 'addBoxToCart', () => {
	it( 'sends the picks and never a price', async () => {
		const fetchImpl = jest
			.fn()
			.mockResolvedValue(
				reply( { success: true, data: { cart_url: '/c/' } } )
			);
		const out = await addBoxToCart( {
			...base,
			editKey: 'abc',
			fetchImpl,
		} );
		expect( out ).toEqual( { ok: true, cartUrl: '/c/', nonce: 'old' } );
		const params = bodyOf( fetchImpl, 0 );
		expect( params.get( 'items[0][qty]' ) ).toBe( '2' );
		expect( params.get( 'gift[enabled]' ) ).toBe( '1' );
		expect( params.get( 'edit_key' ) ).toBe( 'abc' );
		expect( params.toString() ).not.toMatch( /price/ );
	} );

	it( 'refreshes an expired nonce once and retries', async () => {
		const fetchImpl = jest
			.fn()
			.mockResolvedValueOnce( reply( expired ) )
			.mockResolvedValueOnce(
				reply( { success: true, data: { nonce: 'new' } } )
			)
			.mockResolvedValueOnce( reply( { success: true, data: {} } ) );
		const out = await addBoxToCart( { ...base, fetchImpl } );
		expect( out ).toEqual( { ok: true, cartUrl: '/cart/', nonce: 'new' } );
		expect( fetchImpl ).toHaveBeenCalledTimes( 3 );
		expect( bodyOf( fetchImpl, 2 ).get( 'nonce' ) ).toBe( 'new' );
	} );

	it( 'gives up after one retry', async () => {
		const fetchImpl = jest
			.fn()
			.mockResolvedValueOnce( reply( expired ) )
			.mockResolvedValueOnce(
				reply( { success: true, data: { nonce: 'new' } } )
			)
			.mockResolvedValueOnce( reply( expired ) );
		const out = await addBoxToCart( { ...base, fetchImpl } );
		expect( out.ok ).toBe( false );
		expect( out.code ).toBe( 'mmbb_nonce_expired' );
		expect( fetchImpl ).toHaveBeenCalledTimes( 3 );
	} );

	it( 'returns the server message for other errors', async () => {
		const fetchImpl = jest.fn().mockResolvedValue(
			reply( {
				success: false,
				data: { code: 'out_of_stock', message: 'Sold out' },
			} )
		);
		expect( await addBoxToCart( { ...base, fetchImpl } ) ).toEqual( {
			ok: false,
			code: 'out_of_stock',
			message: 'Sold out',
		} );
		expect( fetchImpl ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'reports a network failure', async () => {
		const fetchImpl = jest.fn().mockRejectedValue( new Error( 'offline' ) );
		const out = await addBoxToCart( { ...base, fetchImpl } );
		expect( out.ok ).toBe( false );
		expect( out.code ).toBe( 'network' );
	} );
} );
