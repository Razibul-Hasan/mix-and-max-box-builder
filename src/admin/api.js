import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

const BASE = '/mmbb/v1';

// Drop empty values so the URL only carries real filters.
function clean( params = {} ) {
	const out = {};
	Object.keys( params ).forEach( ( key ) => {
		const value = params[ key ];
		if (
			value !== undefined &&
			value !== null &&
			value !== '' &&
			! ( Array.isArray( value ) && value.length === 0 )
		) {
			out[ key ] = value;
		}
	} );
	return out;
}

export function getCampaigns( params ) {
	return apiFetch( {
		path: addQueryArgs( BASE + '/campaigns', clean( params ) ),
	} );
}

export function createCampaign( template, title ) {
	return apiFetch( {
		path: BASE + '/campaigns',
		method: 'POST',
		data: clean( { template, title } ),
	} );
}

export function duplicateCampaign( id ) {
	return apiFetch( {
		path: BASE + '/campaigns/' + id + '/duplicate',
		method: 'POST',
	} );
}

export function bulkCampaigns( action, ids ) {
	return apiFetch( {
		path: BASE + '/campaigns/bulk',
		method: 'POST',
		data: { action, ids },
	} );
}

export function getProducts( params ) {
	return apiFetch( {
		path: addQueryArgs( BASE + '/products', clean( params ) ),
	} );
}

export function getStats( range ) {
	return apiFetch( {
		path: addQueryArgs( BASE + '/stats', { range } ),
	} );
}

export function getSetup() {
	return apiFetch( { path: BASE + '/setup' } );
}

export function markTestDone() {
	return apiFetch( {
		path: BASE + '/setup',
		method: 'POST',
		data: { test_done: true },
	} );
}
