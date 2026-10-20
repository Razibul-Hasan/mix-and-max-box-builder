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

export function markTestDone( done = true ) {
	return apiFetch( {
		path: BASE + '/setup',
		method: 'POST',
		data: { test_done: done },
	} );
}

export function getCampaign( id ) {
	return apiFetch( { path: BASE + '/campaigns/' + id } );
}

// PUT replaces the config (Save campaign); PATCH merges it (autosave).
export function saveCampaign( id, payload, { autosave = false } = {} ) {
	return apiFetch( {
		path: BASE + '/campaigns/' + id,
		method: autosave ? 'PATCH' : 'PUT',
		data: payload,
	} );
}

export function publishCampaign( id, data ) {
	return apiFetch( {
		path: BASE + '/campaigns/' + id + '/publish',
		method: 'POST',
		data,
	} );
}

export function getTerms( params ) {
	return apiFetch( {
		path: addQueryArgs( BASE + '/terms', clean( params ) ),
	} );
}

export function getPages( params ) {
	return apiFetch( {
		path: addQueryArgs( BASE + '/pages', clean( params ) ),
	} );
}

export function getAnalytics( params ) {
	return apiFetch( {
		path: addQueryArgs( BASE + '/analytics', clean( params ) ),
	} );
}

export async function exportAnalytics( params ) {
	const response = await apiFetch( {
		path: addQueryArgs( BASE + '/analytics/export', clean( params ) ),
		parse: false,
	} );
	const blob = await response.blob();
	const url = window.URL.createObjectURL( blob );
	const link = document.createElement( 'a' );
	link.href = url;
	link.download =
		( response.headers.get( 'Content-Disposition' ) || '' ).match(
			/filename="([^"]+)"/
		)?.[ 1 ] || 'mmbb-analytics.csv';
	link.click();
	window.setTimeout( () => window.URL.revokeObjectURL( url ), 1000 );
}
