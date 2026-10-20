import { postEvents } from './api';

let queue = [];
let timer;
let listening = false;

export function analyticsSession() {
	try {
		let id = window.sessionStorage.getItem( 'mmbb:analytics-session' );
		if ( ! /^[a-f0-9]{32}$/.test( id || '' ) ) {
			const bytes = new Uint8Array( 16 );
			window.crypto.getRandomValues( bytes );
			id = Array.from( bytes, ( byte ) =>
				byte.toString( 16 ).padStart( 2, '0' )
			).join( '' );
			window.sessionStorage.setItem( 'mmbb:analytics-session', id );
		}
		return id;
	} catch ( error ) {
		return '';
	}
}

export function flushEvents( beacon = false ) {
	window.clearTimeout( timer );
	timer = undefined;
	const pending = queue;
	queue = [];
	for ( let index = 0; index < pending.length; index += 20 ) {
		const batch = pending.slice( index, index + 20 );
		const { tracking, session } = batch[ 0 ];
		postEvents(
			tracking.url,
			{
				nonce: tracking.nonce,
				session,
				events: batch.map( ( entry ) => entry.event ),
			},
			beacon
		);
	}
}

export function track( name, data ) {
	const { tracking } = data;
	if ( ! tracking ) {
		return;
	}
	const session = analyticsSession();
	if ( ! session ) {
		return;
	}
	const event = { event: name, campaign_id: data.campaignId };
	if ( name === 'view' ) {
		try {
			const key = 'mmbb:view:' + data.campaignId;
			if ( window.sessionStorage.getItem( key ) ) {
				return;
			}
			window.sessionStorage.setItem( key, '1' );
		} catch ( error ) {
			return;
		}
	}
	if ( name === 'add_item' ) {
		event.product_id = data.productId;
	}
	if ( name === 'tier_reached' ) {
		event.qty = data.qty;
	}
	if ( queue.length && queue[ 0 ].tracking.url !== tracking.url ) {
		flushEvents();
	}
	queue.push( { event, tracking, session } );
	if ( ! listening ) {
		window.addEventListener( 'pagehide', () => flushEvents( true ) );
		listening = true;
	}
	if ( queue.length >= 20 ) {
		flushEvents();
	} else if ( ! timer ) {
		timer = window.setTimeout( () => flushEvents(), 5000 );
	}
}
