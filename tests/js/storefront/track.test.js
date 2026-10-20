import {
	track,
	flushEvents,
	analyticsSession,
} from '../../../src/storefront/track';
import { postEvents } from '../../../src/storefront/api';

jest.mock( '../../../src/storefront/api', () => ( { postEvents: jest.fn() } ) );
const data = {
	campaignId: 12,
	tracking: { url: '/wp-json/mmbb/v1/events', nonce: 'track-nonce' },
	productId: 9,
	qty: 4,
};

beforeEach( () => {
	jest.useFakeTimers();
	window.sessionStorage.clear();
	jest.clearAllMocks();
} );
afterEach( () => {
	flushEvents();
	jest.useRealTimers();
} );

test( 'uses one random session and tracks one view per campaign per session', () => {
	const session = analyticsSession();
	expect( session ).toMatch( /^[a-f0-9]{32}$/ );
	expect( analyticsSession() ).toBe( session );
	track( 'view', data );
	track( 'view', data );
	track( 'view', { ...data, campaignId: 13 } );
	expect( postEvents ).not.toHaveBeenCalled();
	jest.advanceTimersByTime( 5000 );
	expect( postEvents ).toHaveBeenCalledTimes( 1 );
	expect( postEvents.mock.calls[ 0 ][ 1 ] ).toEqual( {
		nonce: 'track-nonce',
		session,
		events: [
			{ event: 'view', campaign_id: 12 },
			{ event: 'view', campaign_id: 13 },
		],
	} );
} );

test( 'flushes at twenty and sends the remainder with a page-exit beacon', () => {
	for ( let index = 0; index < 21; index++ ) {
		track( 'add_item', data );
	}
	expect( postEvents.mock.calls[ 0 ][ 1 ].events ).toHaveLength( 20 );
	window.dispatchEvent( new Event( 'pagehide' ) );
	expect( postEvents.mock.calls[ 1 ][ 1 ].events ).toEqual( [
		{ event: 'add_item', campaign_id: 12, product_id: 9 },
	] );
	expect( postEvents.mock.calls[ 1 ][ 2 ] ).toBe( true );
} );

test( 'disabled payload collects nothing and tier events carry only allowed fields', () => {
	track( 'view', { campaignId: 12 } );
	expect( window.sessionStorage.length ).toBe( 0 );
	track( 'tier_reached', data );
	flushEvents();
	expect( postEvents.mock.calls[ 0 ][ 1 ].events ).toEqual( [
		{ event: 'tier_reached', campaign_id: 12, qty: 4 },
	] );
} );

test( 'storage errors disable collection without breaking the builder', () => {
	const spy = jest
		.spyOn( window.Storage.prototype, 'getItem' )
		.mockImplementation( () => {
			throw new Error( 'blocked' );
		} );
	expect( () => track( 'view', data ) ).not.toThrow();
	flushEvents();
	expect( postEvents ).not.toHaveBeenCalled();
	spy.mockRestore();
} );
