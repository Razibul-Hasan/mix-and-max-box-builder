import { __ } from '@wordpress/i18n';

function genericMessage() {
	return __(
		'We couldn’t add your box. Check your connection and try again.',
		'mix-and-max-box-builder'
	);
}

function failure( code, message ) {
	return { ok: false, code, message };
}

async function post( url, body, fetchImpl ) {
	const response = await fetchImpl( url, {
		method: 'POST',
		credentials: 'same-origin',
		headers: { Accept: 'application/json' },
		body,
	} );
	let json = null;
	try {
		json = await response.json();
	} catch ( error ) {
		json = null;
	}
	return json;
}

function form( {
	nonce,
	campaignId,
	rows,
	size,
	gift,
	editKey,
	analyticsSession,
} ) {
	const body = new URLSearchParams();
	body.append( 'nonce', nonce );
	body.append( 'campaign_id', String( campaignId ) );
	if ( analyticsSession ) {
		body.append( 'analytics_session', analyticsSession );
	}
	rows.forEach( ( row, index ) => {
		body.append(
			`items[${ index }][product_id]`,
			String( row.product_id )
		);
		body.append(
			`items[${ index }][variation_id]`,
			String( row.variation_id )
		);
		body.append( `items[${ index }][qty]`, String( row.qty ) );
	} );
	if ( size ) {
		body.append( 'size', String( size ) );
	}
	if ( gift.enabled ) {
		body.append( 'gift[enabled]', '1' );
	}
	if ( gift.message ) {
		body.append( 'gift[message]', gift.message );
	}
	if ( editKey ) {
		body.append( 'edit_key', editKey );
	}
	return body;
}

/**
 * Add the box to the cart. Prices are never sent: the server prices the box.
 *
 * When the nonce on a cached page has expired the server answers
 * `mmbb_nonce_expired`; this asks for a fresh nonce once and retries once.
 *
 * @param {Object}   options
 * @param {Object}   options.cart             Payload `cart`: { nonce, addUrl, nonceUrl, cartUrl }.
 * @param {number}   options.campaignId       Campaign id.
 * @param {Array}    options.rows             List of { product_id, variation_id, qty }.
 * @param {number}   options.size             Chosen size (Fixed box), or 0.
 * @param {Object}   options.gift             { enabled, message }.
 * @param {string}   options.editKey          Cart item key being edited, or ''.
 * @param {string}   options.analyticsSession Anonymous browser session, when enabled.
 * @param {Function} options.fetchImpl        `fetch`, replaceable in tests.
 * @return {Promise<Object>} { ok: true, cartUrl, nonce } or { ok: false, code, message }.
 */
export async function addBoxToCart( {
	cart,
	campaignId,
	rows,
	size,
	gift,
	editKey = '',
	analyticsSession = '',
	fetchImpl = ( ...args ) => window.fetch( ...args ),
} ) {
	let nonce = cart.nonce;

	try {
		for ( let attempt = 0; attempt < 2; attempt++ ) {
			const json = await post(
				cart.addUrl,
				form( {
					nonce,
					campaignId,
					rows,
					size,
					gift,
					editKey,
					analyticsSession,
				} ),
				fetchImpl
			);
			if ( json && json.success ) {
				return {
					ok: true,
					cartUrl: json.data.cart_url || cart.cartUrl,
					nonce,
				};
			}
			const data = json && json.data ? json.data : {};
			if ( data.code !== 'mmbb_nonce_expired' || attempt === 1 ) {
				return failure(
					data.code || 'error',
					data.message || genericMessage()
				);
			}

			// The page is older than its nonce. Get a new one and try again, once.
			const fresh = await post(
				cart.nonceUrl,
				new URLSearchParams(),
				fetchImpl
			);
			if ( ! fresh || ! fresh.success || ! fresh.data.nonce ) {
				return failure( data.code, data.message || genericMessage() );
			}
			nonce = fresh.data.nonce;
		}
	} catch ( error ) {
		return failure( 'network', genericMessage() );
	}
	return failure( 'error', genericMessage() );
}

// Tracking deliberately drops failures and stale cached nonces without a retry.
export function postEvents( url, data, beacon = false ) {
	const body = JSON.stringify( data );
	if ( beacon && window.navigator.sendBeacon ) {
		const sent = window.navigator.sendBeacon(
			url,
			new Blob( [ body ], { type: 'application/json' } )
		);
		if ( sent ) {
			return;
		}
	}
	window
		.fetch( url, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body,
			keepalive: true,
		} )
		.catch( () => {} );
}
