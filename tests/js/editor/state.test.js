import {
	canOpenStep,
	editorReducer,
	initEditor,
	moveItem,
	payloadFor,
	setIn,
	slugify,
	slugInput,
	stepForPath,
	toNumber,
	validateAll,
	validateStep,
} from '../../../src/admin/editor/state';
import {
	localInputToUtc,
	utcToLocalInput,
} from '../../../src/admin/editor/time';

const config = ( overrides = {} ) => ( {
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
		ids: [ 7 ],
		term_ids: [],
		order: 'manual',
		caps: {},
	},
	schedule: { start: null, end: null, countdown_days: 0 },
	extras: { gift_message: false, gift_wrap: { enabled: false, fee: 0 } },
	design: { layout: 'both', columns: 0, headline: '' },
	placement: { page_id: 0 },
	container_product_id: 0,
	...overrides,
} );

const campaign = ( overrides = {} ) => ( {
	title: 'Holiday box',
	config: config( overrides ),
} );

describe( 'setIn and moveItem', () => {
	it( 'sets a deep value without touching the original', () => {
		const source = config();
		const next = setIn( source, 'tiers.1.value', 30 );
		expect( next.tiers[ 1 ].value ).toBe( 30 );
		expect( source.tiers[ 1 ].value ).toBe( 25 );
		expect( next.box ).toBe( source.box );
	} );

	it( 'creates missing objects along the path', () => {
		const next = setIn( config(), 'products.caps.9', 2 );
		expect( next.products.caps ).toEqual( { 9: 2 } );
	} );

	it( 'moves an entry and ignores moves that go nowhere', () => {
		expect( moveItem( [ 1, 2, 3 ], 0, 2 ) ).toEqual( [ 2, 3, 1 ] );
		expect( moveItem( [ 1, 2, 3 ], 2, 1 ) ).toEqual( [ 1, 3, 2 ] );
		const list = [ 1, 2 ];
		expect( moveItem( list, 0, 0 ) ).toBe( list );
		expect( moveItem( list, 0, 5 ) ).toBe( list );
		expect( moveItem( list, -1, 0 ) ).toBe( list );
	} );
} );

describe( 'editorReducer', () => {
	it( 'starts clean', () => {
		const state = initEditor( campaign() );
		expect( state.dirty ).toBe( false );
		expect( state.draft ).toBe( state.saved );
	} );

	it( 'marks the draft dirty on the first edit and clean again when it matches', () => {
		let state = initEditor( campaign() );
		state = editorReducer( state, {
			type: 'set',
			path: 'box.capacity',
			value: 8,
		} );
		expect( state.dirty ).toBe( true );
		expect( state.saved.config.box.capacity ).toBe( 12 );
		state = editorReducer( state, {
			type: 'set',
			path: 'box.capacity',
			value: 12,
		} );
		expect( state.dirty ).toBe( false );
	} );

	it( 'edits the title', () => {
		let state = initEditor( campaign() );
		state = editorReducer( state, { type: 'title', value: 'New name' } );
		expect( state.draft.title ).toBe( 'New name' );
		expect( state.dirty ).toBe( true );
	} );

	it( 'discard restores the saved copy', () => {
		let state = initEditor( campaign() );
		state = editorReducer( state, {
			type: 'set',
			path: 'type',
			value: 'bundle',
		} );
		state = editorReducer( state, { type: 'discard' } );
		expect( state.draft.config.type ).toBe( 'tiered' );
		expect( state.dirty ).toBe( false );
	} );

	it( 'takes the server copy as saved and draft when nothing changed meanwhile', () => {
		let state = initEditor( campaign() );
		state = editorReducer( state, {
			type: 'set',
			path: 'box.capacity',
			value: 99,
		} );
		const sent = state.draft;
		const server = campaign( {
			box: { ...config().box, capacity: 48 },
		} );
		state = editorReducer( state, {
			type: 'saved',
			campaign: server,
			sent,
		} );
		expect( state.saved.config.box.capacity ).toBe( 48 );
		expect( state.draft.config.box.capacity ).toBe( 48 );
		expect( state.dirty ).toBe( false );
	} );

	it( 'keeps edits made while the save was running', () => {
		let state = initEditor( campaign() );
		state = editorReducer( state, {
			type: 'set',
			path: 'box.capacity',
			value: 8,
		} );
		const sent = state.draft;
		state = editorReducer( state, {
			type: 'set',
			path: 'box.capacity',
			value: 6,
		} );
		state = editorReducer( state, {
			type: 'saved',
			campaign: campaign( { box: { ...config().box, capacity: 8 } } ),
			sent,
		} );
		expect( state.saved.config.box.capacity ).toBe( 8 );
		expect( state.draft.config.box.capacity ).toBe( 6 );
		expect( state.dirty ).toBe( true );
	} );

	it( 'ignores unknown actions and builds the save payload', () => {
		const state = initEditor( campaign() );
		expect( editorReducer( state, { type: 'nope' } ) ).toBe( state );
		expect( payloadFor( state.draft ) ).toEqual( {
			title: 'Holiday box',
			config: state.draft.config,
		} );
	} );
} );

describe( 'toNumber', () => {
	it( 'reads numbers and rejects empty or text input', () => {
		expect( toNumber( 4 ) ).toBe( 4 );
		expect( toNumber( '4.5' ) ).toBe( 4.5 );
		expect( toNumber( '' ) ).toBeNaN();
		expect( toNumber( '  ' ) ).toBeNaN();
		expect( toNumber( 'abc' ) ).toBeNaN();
		expect( toNumber( null ) ).toBeNaN();
	} );
} );

const errorsFor = ( step, overrides, title = 'Holiday box' ) =>
	validateStep( step, { title, config: config( overrides ) } );

describe( 'basics validation', () => {
	it( 'passes a named campaign', () => {
		expect( errorsFor( 'basics', {} ) ).toEqual( {} );
	} );

	it( 'needs a name', () => {
		expect( errorsFor( 'basics', {}, '   ' ) ).toHaveProperty( 'title' );
	} );

	it( 'needs the end after the start', () => {
		const schedule = {
			start: '2026-12-24T00:00:00Z',
			end: '2026-11-01T00:00:00Z',
			countdown_days: 0,
		};
		expect( errorsFor( 'basics', { schedule } ) ).toHaveProperty( [
			'schedule.end',
		] );
		expect(
			errorsFor( 'basics', {
				schedule: { ...schedule, end: schedule.start },
			} )
		).toHaveProperty( [ 'schedule.end' ] );
		expect(
			errorsFor( 'basics', {
				schedule: {
					...schedule,
					start: '2026-11-01T00:00:00Z',
					end: '2026-12-24T00:00:00Z',
				},
			} )
		).toEqual( {} );
	} );

	it( 'allows only one date', () => {
		expect(
			errorsFor( 'basics', {
				schedule: {
					start: '2026-11-01T00:00:00Z',
					end: null,
					countdown_days: 0,
				},
			} )
		).toEqual( {} );
	} );
} );

describe( 'products validation', () => {
	const products = ( overrides ) => ( {
		source: 'manual',
		ids: [],
		term_ids: [],
		order: 'manual',
		caps: {},
		...overrides,
	} );

	it( 'needs a product when picking by hand', () => {
		expect(
			errorsFor( 'products', { products: products( {} ) } )
		).toHaveProperty( [ 'products.ids' ] );
		expect(
			errorsFor( 'products', { products: products( { ids: [ 3 ] } ) } )
		).toEqual( {} );
	} );

	it( 'needs a term for category and tag sources', () => {
		[ 'category', 'tag' ].forEach( ( source ) => {
			expect(
				errorsFor( 'products', { products: products( { source } ) } )
			).toHaveProperty( [ 'products.term_ids' ] );
			expect(
				errorsFor( 'products', {
					products: products( { source, term_ids: [ 2 ] } ),
				} )
			).toEqual( {} );
		} );
	} );
} );

describe( 'rules validation', () => {
	const tier = ( qty, value, kind = 'percent' ) => ( {
		qty,
		discount_type: kind,
		value,
	} );

	it( 'passes the default tiered config', () => {
		expect( errorsFor( 'rules', {} ) ).toEqual( {} );
	} );

	it( 'needs a capacity from 1 to 48', () => {
		[ 0, 49, '', 'x', 2.5 ].forEach( ( capacity ) => {
			expect(
				errorsFor( 'rules', { box: { ...config().box, capacity } } )
			).toHaveProperty( [ 'box.capacity' ] );
		} );
		expect(
			errorsFor( 'rules', {
				box: { ...config().box, capacity: 48, min_items: 4 },
				tiers: [ tier( 4, 10 ) ],
			} )
		).toEqual( {} );
	} );

	it( 'keeps the minimum between 1 and the capacity', () => {
		[ 0, 13, '' ].forEach( ( minimum ) => {
			expect(
				errorsFor( 'rules', {
					box: { ...config().box, min_items: minimum },
				} )
			).toHaveProperty( [ 'box.min_items' ] );
		} );
	} );

	it( 'keeps the per-product cap between 1 and the capacity when duplicates are allowed', () => {
		expect(
			errorsFor( 'rules', {
				box: { ...config().box, max_per_product: 13 },
			} )
		).toHaveProperty( [ 'box.max_per_product' ] );
		expect(
			errorsFor( 'rules', {
				box: {
					...config().box,
					max_per_product: 13,
					allow_duplicates: false,
				},
			} )
		).toEqual( {} );
	} );

	it( 'needs at least one tier', () => {
		expect( errorsFor( 'rules', { tiers: [] } ) ).toHaveProperty( 'tiers' );
	} );

	it( 'needs tier quantities to rise and stay within the box', () => {
		const flat = errorsFor( 'rules', {
			tiers: [ tier( 6, 10 ), tier( 6, 20 ) ],
		} );
		expect( flat ).toHaveProperty( [ 'tiers.1.qty' ] );
		const down = errorsFor( 'rules', {
			tiers: [ tier( 8, 10 ), tier( 4, 20 ) ],
		} );
		expect( down ).toHaveProperty( [ 'tiers.1.qty' ] );
		const over = errorsFor( 'rules', {
			tiers: [ tier( 4, 10 ), tier( 13, 20 ) ],
		} );
		expect( over ).toHaveProperty( [ 'tiers.1.qty' ] );
		[ 0, '', 2.5 ].forEach( ( qty ) => {
			expect(
				errorsFor( 'rules', { tiers: [ tier( qty, 10 ) ] } )
			).toHaveProperty( [ 'tiers.0.qty' ] );
		} );
	} );

	it( 'keeps percent discounts above 0 and up to 90', () => {
		[ 0, 91, '', -5 ].forEach( ( value ) => {
			expect(
				errorsFor( 'rules', { tiers: [ tier( 4, value ) ] } )
			).toHaveProperty( [ 'tiers.0.value' ] );
		} );
		expect( errorsFor( 'rules', { tiers: [ tier( 4, 90 ) ] } ) ).toEqual(
			{}
		);
	} );

	it( 'needs an amount above zero for fixed amounts and box prices', () => {
		[ 'fixed_amount', 'box_price' ].forEach( ( type ) => {
			expect(
				errorsFor( 'rules', { tiers: [ tier( 4, 0, type ) ] } )
			).toHaveProperty( [ 'tiers.0.value' ] );
			expect(
				errorsFor( 'rules', { tiers: [ tier( 4, 150, type ) ] } )
			).toEqual( {} );
		} );
	} );

	it( 'checks fixed-box sizes like tiers', () => {
		const fixed = ( sizes ) =>
			errorsFor( 'rules', { type: 'fixed', sizes } );
		expect( fixed( [] ) ).toHaveProperty( 'sizes' );
		expect(
			fixed( [ tier( 4, 12, 'box_price' ), tier( 4, 20, 'box_price' ) ] )
		).toHaveProperty( [ 'sizes.1.qty' ] );
		expect( fixed( [ tier( 4, 0, 'box_price' ) ] ) ).toHaveProperty( [
			'sizes.0.value',
		] );
		expect(
			fixed( [ tier( 4, 12, 'box_price' ), tier( 8, 20, 'box_price' ) ] )
		).toEqual( {} );
	} );

	it( 'does not check tiers on a fixed box, or sizes on a tiered one', () => {
		expect(
			errorsFor( 'rules', { type: 'fixed', tiers: [] } )
		).toHaveProperty( 'sizes' );
		expect(
			errorsFor( 'rules', {
				type: 'fixed',
				tiers: [],
				sizes: [ tier( 4, 12, 'box_price' ) ],
			} )
		).toEqual( {} );
		expect(
			errorsFor( 'rules', {
				sizes: [ tier( 0, 0, 'box_price' ) ],
			} )
		).toEqual( {} );
	} );

	it( 'checks the bundle quantity and price', () => {
		const bundle = ( overrides ) =>
			errorsFor( 'rules', {
				type: 'bundle',
				bundle: { qty: 3, price: 18, ...overrides },
			} );
		expect( bundle( {} ) ).toEqual( {} );
		expect( bundle( { price: 0 } ) ).toHaveProperty( [ 'bundle.price' ] );
		expect( bundle( { price: '' } ) ).toHaveProperty( [ 'bundle.price' ] );
		expect( bundle( { qty: 0 } ) ).toHaveProperty( [ 'bundle.qty' ] );
		expect( bundle( { qty: 13 } ) ).toHaveProperty( [ 'bundle.qty' ] );
	} );

	it( 'needs a gift wrap fee of zero or more when gift wrap is on', () => {
		const extras = ( fee, enabled = true ) => ( {
			gift_message: false,
			gift_wrap: { enabled, fee },
		} );
		expect( errorsFor( 'rules', { extras: extras( '' ) } ) ).toHaveProperty(
			[ 'extras.gift_wrap.fee' ]
		);
		expect( errorsFor( 'rules', { extras: extras( -1 ) } ) ).toHaveProperty(
			[ 'extras.gift_wrap.fee' ]
		);
		expect( errorsFor( 'rules', { extras: extras( 0 ) } ) ).toEqual( {} );
		expect( errorsFor( 'rules', { extras: extras( '', false ) } ) ).toEqual(
			{}
		);
	} );
} );

describe( 'whole-draft validation', () => {
	it( 'has no errors for a complete draft and lists steps with errors', () => {
		expect( validateAll( campaign() ) ).toEqual( {} );
		const found = validateAll( {
			title: '',
			config: config( {
				tiers: [],
				products: { ...config().products, ids: [] },
			} ),
		} );
		expect( Object.keys( found ) ).toEqual( [
			'basics',
			'products',
			'rules',
		] );
	} );

	it( 'opens a step only when every step before it is valid', () => {
		const good = campaign();
		expect( canOpenStep( 4, good ) ).toBe( true );
		const noProducts = {
			title: 'x',
			config: config( { products: { ...config().products, ids: [] } } ),
		};
		expect( canOpenStep( 1, noProducts ) ).toBe( true );
		expect( canOpenStep( 2, noProducts ) ).toBe( false );
		expect( canOpenStep( 4, noProducts ) ).toBe( false );
	} );

	it( 'maps server paths to steps', () => {
		expect( stepForPath( 'title' ) ).toBe( 'basics' );
		expect( stepForPath( 'schedule.end' ) ).toBe( 'basics' );
		expect( stepForPath( 'products.ids' ) ).toBe( 'products' );
		expect( stepForPath( 'tiers.1.qty' ) ).toBe( 'rules' );
		expect( stepForPath( 'bundle.price' ) ).toBe( 'rules' );
		expect( stepForPath( 'design.layout' ) ).toBe( 'design' );
	} );
} );

describe( 'slugs', () => {
	it( 'slugify makes a clean address', () => {
		expect( slugify( 'Holiday Treat Box!' ) ).toBe( 'holiday-treat-box' );
		expect( slugify( '  Crème brûlée  ' ) ).toBe( 'creme-brulee' );
		expect( slugify( '' ) ).toBe( '' );
	} );

	it( 'slugInput keeps a trailing dash while typing', () => {
		expect( slugInput( 'Holiday-' ) ).toBe( 'holiday-' );
		expect( slugInput( 'holiday  box' ) ).toBe( 'holiday-box' );
		expect( slugInput( '-x' ) ).toBe( 'x' );
	} );
} );

describe( 'schedule time zones', () => {
	it( 'converts between UTC and a named zone, including daylight saving', () => {
		// New York is UTC-5 in winter and UTC-4 in summer.
		expect(
			utcToLocalInput( '2026-12-24T04:59:00Z', 'America/New_York' )
		).toBe( '2026-12-23T23:59' );
		expect(
			localInputToUtc( '2026-12-23T23:59', 'America/New_York' )
		).toBe( '2026-12-24T04:59:00Z' );
		expect(
			utcToLocalInput( '2026-07-01T04:00:00Z', 'America/New_York' )
		).toBe( '2026-07-01T00:00' );
		expect(
			localInputToUtc( '2026-07-01T00:00', 'America/New_York' )
		).toBe( '2026-07-01T04:00:00Z' );
	} );

	it( 'handles a zone ahead of UTC and a fixed offset', () => {
		expect( utcToLocalInput( '2026-11-01T00:00:00Z', 'Asia/Dhaka' ) ).toBe(
			'2026-11-01T06:00'
		);
		expect( localInputToUtc( '2026-11-01T06:00', 'Asia/Dhaka' ) ).toBe(
			'2026-11-01T00:00:00Z'
		);
		expect( utcToLocalInput( '2026-11-01T00:00:00Z', '+05:30' ) ).toBe(
			'2026-11-01T05:30'
		);
		expect( localInputToUtc( '2026-11-01T05:30', '+05:30' ) ).toBe(
			'2026-11-01T00:00:00Z'
		);
		expect( localInputToUtc( '2026-11-01T00:00', 'UTC' ) ).toBe(
			'2026-11-01T00:00:00Z'
		);
	} );

	it( 'round-trips a spring-forward time next to the change', () => {
		// 2026-03-08 02:30 does not exist in New York; the result still lands on a real instant.
		const utc = localInputToUtc( '2026-03-08T03:30', 'America/New_York' );
		expect( utc ).toBe( '2026-03-08T07:30:00Z' );
		expect( utcToLocalInput( utc, 'America/New_York' ) ).toBe(
			'2026-03-08T03:30'
		);
	} );

	it( 'returns empty values for empty or invalid input', () => {
		expect( utcToLocalInput( null, 'UTC' ) ).toBe( '' );
		expect( utcToLocalInput( 'nonsense', 'UTC' ) ).toBe( '' );
		expect( localInputToUtc( '', 'UTC' ) ).toBeNull();
		expect( localInputToUtc( 'nonsense', 'UTC' ) ).toBeNull();
	} );
} );
