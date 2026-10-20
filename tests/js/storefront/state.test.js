import {
	countdownEnd,
	createEnv,
	emptyState,
	reducer,
	restore,
	tierReached,
	priceBox,
} from '../../../src/storefront/state';

const product = ( id, extra = {} ) => ( {
	id,
	product_id: id,
	variation_id: 0,
	name: `P${ id }`,
	price: 500,
	categories: [],
	stock: null,
	...extra,
} );

const baseBox = {
	capacity: 4,
	min_items: 1,
	allow_duplicates: true,
	max_per_product: 2,
	hide_sold_out: false,
};

const payload = (
	config = {},
	products = [ 1, 2, 3 ].map( ( i ) => product( i ) )
) => ( {
	config: {
		type: 'tiered',
		box: baseBox,
		tiers: [
			{ qty: 2, discount_type: 'percent', value: 10 },
			{ qty: 4, discount_type: 'percent', value: 20 },
		],
		sizes: [],
		bundle: { qty: 3, price: 10 },
		extras: { gift_message: true, gift_wrap: { enabled: true, fee: 2 } },
		caps: {},
		...config,
	},
	products,
} );

const run = ( env, state, ...actions ) =>
	actions.reduce( ( s, a ) => reducer( s, a, env ), state );

describe( 'builder reducer', () => {
	it( 'adds up to the per-product limit and the capacity', () => {
		const env = createEnv( payload() );
		let s = run(
			env,
			emptyState( env ),
			{ type: 'add', id: 1 },
			{ type: 'add', id: 1 },
			{ type: 'add', id: 1 }
		);
		expect( s.items ).toEqual( [ 1, 1 ] );
		s = run(
			env,
			s,
			{ type: 'add', id: 2 },
			{ type: 'add', id: 2 },
			{ type: 'add', id: 3 }
		);
		expect( s.items ).toHaveLength( 4 );
	} );

	it( 'allows one of each when duplicates are off', () => {
		const env = createEnv(
			payload( { box: { ...baseBox, allow_duplicates: false } } )
		);
		const s = run(
			env,
			emptyState( env ),
			{ type: 'add', id: 1 },
			{ type: 'add', id: 1 }
		);
		expect( s.items ).toEqual( [ 1 ] );
	} );

	it( 'honours a per-product cap and known stock', () => {
		const env = createEnv(
			payload( { caps: { 1: 1 } }, [
				product( 1 ),
				product( 2, { stock: 1 } ),
				product( 3, { stock: 0 } ),
			] )
		);
		const s = run(
			env,
			emptyState( env ),
			{ type: 'add', id: 1 },
			{ type: 'add', id: 1 },
			{ type: 'add', id: 2 },
			{ type: 'add', id: 2 },
			{ type: 'add', id: 3 }
		);
		expect( s.items ).toEqual( [ 1, 2 ] );
	} );

	it( 'ignores unknown products', () => {
		const env = createEnv( payload() );
		expect(
			run( env, emptyState( env ), { type: 'add', id: 99 } ).items
		).toEqual( [] );
	} );

	it( 'sets a quantity up and down', () => {
		const env = createEnv( payload() );
		let s = run(
			env,
			emptyState( env ),
			{ type: 'setQty', id: 1, qty: 2 },
			{ type: 'add', id: 2 }
		);
		expect( s.items ).toEqual( [ 1, 1, 2 ] );
		s = run( env, s, { type: 'setQty', id: 1, qty: 1 } );
		expect( s.items ).toEqual( [ 1, 2 ] );
		s = run( env, s, { type: 'removeAt', index: 0 } );
		expect( s.items ).toEqual( [ 2 ] );
	} );

	it( 'trims the box when a smaller size is chosen', () => {
		const env = createEnv(
			payload( {
				type: 'fixed',
				sizes: [
					{ qty: 2, discount_type: 'percent', value: 5 },
					{ qty: 4, discount_type: 'percent', value: 10 },
				],
			} )
		);
		let s = emptyState( env );
		expect( s.size ).toBe( 2 );
		s = run(
			env,
			s,
			{ type: 'setSize', size: 4 },
			{ type: 'add', id: 1 },
			{ type: 'add', id: 2 },
			{ type: 'add', id: 3 },
			{ type: 'add', id: 3 }
		);
		expect( s.items ).toHaveLength( 4 );
		s = run( env, s, { type: 'setSize', size: 2 } );
		expect( s.items ).toEqual( [ 1, 2 ] );
		expect( run( env, s, { type: 'setSize', size: 7 } ).size ).toBe( 2 );
	} );

	it( 'keeps only the gift options the campaign offers', () => {
		const env = createEnv(
			payload( {
				extras: {
					gift_message: false,
					gift_wrap: { enabled: true, fee: 0 },
				},
			} )
		);
		const s = run( env, emptyState( env ), {
			type: 'gift',
			gift: { enabled: true, message: 'hi' },
		} );
		expect( s.gift ).toEqual( { enabled: true, message: '' } );
	} );

	it( 'restores saved picks and drops what is no longer allowed', () => {
		const env = createEnv( payload() );
		const s = restore( env, {
			items: [ 1, 1, 1, 99, 2 ],
			size: 0,
			gift: { enabled: true, message: 'x' },
		} );
		expect( s.items ).toEqual( [ 1, 1, 2 ] );
		expect( s.gift.enabled ).toBe( true );
		expect( restore( env, null ).items ).toEqual( [] );
	} );

	it( 'prices the box with the shared engine', () => {
		const env = createEnv( payload() );
		const s = run(
			env,
			emptyState( env ),
			{ type: 'add', id: 1 },
			{ type: 'add', id: 2 }
		);
		const q = priceBox( env, s, 2 );
		expect( q.subtotal ).toBe( 1000 );
		expect( q.discount ).toBe( 100 );
		expect( q.total ).toBe( 900 );
	} );
} );

describe( 'helpers', () => {
	it( 'finds the reached tier', () => {
		const { config } = payload();
		expect( tierReached( config, 1 ) ).toBe( 0 );
		expect( tierReached( config, 3 ) ).toBe( 2 );
		expect( tierReached( { ...config, type: 'fixed' }, 4 ) ).toBe( 0 );
	} );

	it( 'shows a countdown only inside the window', () => {
		const now = Date.parse( '2026-01-10T00:00:00Z' );
		const end = '2026-01-12T00:00:00Z';
		expect( countdownEnd( { end, countdown_days: 3 }, now ) ).toBe( end );
		expect( countdownEnd( { end, countdown_days: 1 }, now ) ).toBeNull();
		expect(
			countdownEnd( { end: null, countdown_days: 3 }, now )
		).toBeNull();
		expect( countdownEnd( { end, countdown_days: 0 }, now ) ).toBeNull();
		expect(
			countdownEnd( { end, countdown_days: 3 }, Date.parse( end ) + 1 )
		).toBeNull();
	} );
} );
