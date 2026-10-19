import {
	campaignsReducer,
	hasFilters,
	initialState,
	queryFor,
	rangeFor,
	summarizeBulk,
} from '../../../src/admin/campaigns/state';

const run = ( actions, start = initialState ) =>
	actions.reduce( campaignsReducer, start );

describe( 'campaigns list state', () => {
	it( 'starts unfiltered on page one with nothing selected', () => {
		expect( initialState ).toEqual( {
			status: 'all',
			search: '',
			type: '',
			orderby: 'date',
			page: 1,
			selected: [],
		} );
		expect( hasFilters( initialState ) ).toBe( false );
	} );

	it( 'changing a filter returns to page one and clears the selection', () => {
		const busy = run( [
			{ type: 'page', value: 3 },
			{ type: 'select', ids: [ 4, 5 ] },
		] );
		expect( busy.page ).toBe( 3 );
		[
			{ type: 'status', value: 'draft' },
			{ type: 'search', value: 'tea' },
			{ type: 'type', value: 'fixed' },
			{ type: 'orderby', value: 'revenue' },
		].forEach( ( action ) => {
			const next = campaignsReducer( busy, action );
			expect( next.page ).toBe( 1 );
			expect( next.selected ).toEqual( [] );
		} );
	} );

	it( 'keeps the selection when the same search arrives again', () => {
		const state = run( [
			{ type: 'search', value: 'tea' },
			{ type: 'select', ids: [ 1 ] },
		] );
		expect(
			campaignsReducer( state, { type: 'search', value: 'tea' } )
		).toBe( state );
	} );

	it( 'turning the page clears the selection but keeps filters', () => {
		const state = run( [
			{ type: 'status', value: 'live' },
			{ type: 'select', ids: [ 1, 2 ] },
			{ type: 'page', value: 2 },
		] );
		expect( state.status ).toBe( 'live' );
		expect( state.page ).toBe( 2 );
		expect( state.selected ).toEqual( [] );
	} );

	it( 'toggles single rows and replaces the selection for select all', () => {
		let state = run( [
			{ type: 'toggle', id: 3 },
			{ type: 'toggle', id: 9 },
		] );
		expect( state.selected ).toEqual( [ 3, 9 ] );
		state = campaignsReducer( state, { type: 'toggle', id: 3 } );
		expect( state.selected ).toEqual( [ 9 ] );
		state = campaignsReducer( state, {
			type: 'select',
			ids: [ 1, 2, 3 ],
		} );
		expect( state.selected ).toEqual( [ 1, 2, 3 ] );
		state = campaignsReducer( state, { type: 'clear_selection' } );
		expect( state.selected ).toEqual( [] );
	} );

	it( 'resets everything with clear_filters', () => {
		const state = run( [
			{ type: 'status', value: 'ended' },
			{ type: 'search', value: 'x' },
			{ type: 'clear_filters' },
		] );
		expect( state ).toEqual( initialState );
	} );

	it( 'ignores unknown actions', () => {
		expect( campaignsReducer( initialState, { type: 'nope' } ) ).toBe(
			initialState
		);
	} );

	it( 'builds the request: all becomes no status filter, 20 per page', () => {
		expect( queryFor( initialState ) ).toEqual( {
			status: '',
			search: '',
			type: '',
			orderby: 'date',
			page: 1,
			per_page: 20,
		} );
		const filtered = run( [
			{ type: 'status', value: 'live' },
			{ type: 'type', value: 'bundle' },
			{ type: 'search', value: 'trio' },
			{ type: 'orderby', value: 'conversion' },
			{ type: 'page', value: 2 },
		] );
		expect( queryFor( filtered ) ).toEqual( {
			status: 'live',
			search: 'trio',
			type: 'bundle',
			orderby: 'conversion',
			page: 2,
			per_page: 20,
		} );
		expect( hasFilters( filtered ) ).toBe( true );
	} );

	it( 'works out the "Showing a to b of n" range', () => {
		expect( rangeFor( 1, 9 ) ).toEqual( { from: 1, to: 9 } );
		expect( rangeFor( 2, 45 ) ).toEqual( { from: 21, to: 40 } );
		expect( rangeFor( 3, 45 ) ).toEqual( { from: 41, to: 45 } );
		expect( rangeFor( 1, 0 ) ).toEqual( { from: 0, to: 0 } );
	} );

	it( 'summarizes bulk results', () => {
		expect(
			summarizeBulk( {
				results: [
					{ id: 1, ok: true },
					{ id: 2, ok: false, message: 'Campaign not found.' },
					{ id: 3, ok: true },
				],
			} )
		).toEqual( { ok: 2, failed: 1, message: 'Campaign not found.' } );
		expect( summarizeBulk( undefined ) ).toEqual( {
			ok: 0,
			failed: 0,
			message: '',
		} );
	} );
} );
