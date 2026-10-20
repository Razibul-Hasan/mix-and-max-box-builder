import { quote } from '../shared/pricing';

/**
 * Builder state. The box is an ordered list of product ids, one entry per item, so
 * a slot's position never moves when another product's quantity changes.
 *
 * The reducer takes an `env` ({ config, products }) built once per payload. It
 * enforces capacity, per-product limits, duplicates and known stock; the server
 * checks all of it again.
 */

/**
 * Index the payload's products by id and read the rules from its config.
 *
 * @param {Object} payload Storefront payload.
 * @return {Object} { config, products, hideSoldOut }.
 */
export function createEnv( payload ) {
	const products = {};
	( payload.products || [] ).forEach( ( product ) => {
		products[ product.id ] = product;
	} );
	return {
		config: payload.config,
		products,
		hideSoldOut: Boolean( payload.config.box.hide_sold_out ),
	};
}

/**
 * The first size of a Fixed box, or 0 for other types.
 *
 * @param {Object} config Public campaign config.
 * @return {number} Size.
 */
export function defaultSize( config ) {
	if ( config.type !== 'fixed' || ! config.sizes.length ) {
		return 0;
	}
	return Number( config.sizes[ 0 ].qty );
}

/**
 * How many items the box holds.
 *
 * @param {Object} config Public campaign config.
 * @param {number} size   Chosen size (Fixed box).
 * @return {number} Capacity.
 */
export function capacityFor( config, size ) {
	if ( config.type === 'fixed' ) {
		return Math.max( 0, Number( size ) || 0 );
	}
	if ( config.type === 'bundle' ) {
		return Number( config.bundle.qty );
	}
	return Number( config.box.capacity );
}

/**
 * The most of one product the box may hold. Mirrors Box_Rules::limit_for() and
 * adds the stock the page knows about.
 *
 * @param {Object} env Environment from createEnv().
 * @param {number} id  Product or variation id.
 * @return {number} Limit, 0 when the product cannot be added.
 */
export function limitFor( env, id ) {
	const product = env.products[ id ];
	if ( ! product ) {
		return 0;
	}
	const { box } = env.config;
	let limit = Number( box.max_per_product );
	if ( ! box.allow_duplicates ) {
		limit = 1;
	}
	const caps = env.config.caps || {};
	if ( caps[ id ] !== undefined ) {
		limit = Math.min( limit, Number( caps[ id ] ) );
	}
	limit = Math.max( 1, limit );
	if ( typeof product.stock === 'number' ) {
		limit = Math.min( limit, product.stock );
	}
	return limit;
}

/**
 * How many of a product are in the box.
 *
 * @param {number[]} items Box items.
 * @param {number}   id    Product or variation id.
 * @return {number} Count.
 */
export function countOf( items, id ) {
	return items.filter( ( entry ) => entry === id ).length;
}

/**
 * Expand `{ id, qty }` rows into the ordered item list.
 *
 * @param {Array} rows Rows.
 * @return {number[]} Items.
 */
export function expand( rows ) {
	const items = [];
	( rows || [] ).forEach( ( row ) => {
		const qty = Math.min( 99, Math.trunc( Number( row.qty ) || 0 ) );
		for ( let i = 0; i < qty; i++ ) {
			items.push( Number( row.id ) );
		}
	} );
	return items;
}

const NO_GIFT = { enabled: false, message: '' };

/**
 * Keep only the gift options the campaign offers.
 *
 * @param {Object} config Public campaign config.
 * @param {Object} gift   Wanted { enabled, message }.
 * @return {Object} Allowed gift options.
 */
export function cleanGift( config, gift ) {
	const wanted = gift || NO_GIFT;
	const extras = config.extras || {};
	return {
		enabled: Boolean(
			wanted.enabled && extras.gift_wrap && extras.gift_wrap.enabled
		),
		message: extras.gift_message
			? String( wanted.message || '' ).slice( 0, 200 )
			: '',
	};
}

function addOne( state, env, id ) {
	const capacity = capacityFor( env.config, state.size );
	if (
		state.items.length >= capacity ||
		countOf( state.items, id ) >= limitFor( env, id )
	) {
		return state;
	}
	return { ...state, items: [ ...state.items, id ] };
}

function removeLast( items, id, how ) {
	const next = items.slice();
	for ( let removed = 0; removed < how; removed++ ) {
		const at = next.lastIndexOf( id );
		if ( at === -1 ) {
			break;
		}
		next.splice( at, 1 );
	}
	return next;
}

/**
 * The state of an empty box.
 *
 * @param {Object} env Environment from createEnv().
 * @return {Object} State.
 */
export function emptyState( env ) {
	return {
		items: [],
		size: defaultSize( env.config ),
		gift: cleanGift( env.config, NO_GIFT ),
	};
}

/**
 * Build a state from saved picks (session storage, or a box being edited from the cart).
 * Anything the campaign no longer allows is dropped.
 *
 * @param {Object} env   Environment from createEnv().
 * @param {Object} saved { items: number[], size, gift }.
 * @return {Object} State.
 */
export function restore( env, saved ) {
	let state = emptyState( env );
	if ( ! saved ) {
		return state;
	}
	if (
		env.config.type === 'fixed' &&
		env.config.sizes.some( ( row ) => Number( row.qty ) === saved.size )
	) {
		state = { ...state, size: Number( saved.size ) };
	}
	( Array.isArray( saved.items ) ? saved.items : [] ).forEach( ( id ) => {
		state = addOne( state, env, Number( id ) );
	} );
	return { ...state, gift: cleanGift( env.config, saved.gift ) };
}

/**
 * The reducer. Actions: add, setQty, removeAt, setSize, gift, reset.
 *
 * @param {Object} state  Current state.
 * @param {Object} action Action.
 * @param {Object} env    Environment from createEnv().
 * @return {Object} Next state.
 */
export function reducer( state, action, env ) {
	switch ( action.type ) {
		case 'add':
			return addOne( state, env, action.id );
		case 'setQty': {
			const wanted = Math.max(
				0,
				Math.trunc( Number( action.qty ) || 0 )
			);
			const have = countOf( state.items, action.id );
			if ( wanted < have ) {
				return {
					...state,
					items: removeLast( state.items, action.id, have - wanted ),
				};
			}
			let next = state;
			for ( let i = have; i < wanted; i++ ) {
				const grown = addOne( next, env, action.id );
				if ( grown === next ) {
					break;
				}
				next = grown;
			}
			return next;
		}
		case 'removeAt':
			return {
				...state,
				items: state.items.filter(
					( _, index ) => index !== action.index
				),
			};
		case 'setSize': {
			const size = Number( action.size );
			if (
				env.config.type !== 'fixed' ||
				! env.config.sizes.some( ( row ) => Number( row.qty ) === size )
			) {
				return state;
			}
			return { ...state, size, items: state.items.slice( 0, size ) };
		}
		case 'gift':
			return {
				...state,
				gift: cleanGift( env.config, {
					...state.gift,
					...action.gift,
				} ),
			};
		case 'reset':
			return emptyState( env );
		default:
			return state;
	}
}

/**
 * Price the box with the same engine the server uses.
 *
 * @param {Object} env      Environment from createEnv().
 * @param {Object} state    Builder state.
 * @param {number} decimals Currency decimals.
 * @return {Object} Quote.
 */
export function priceBox( env, state, decimals ) {
	const rows = [];
	const seen = new Set();
	state.items.forEach( ( id ) => {
		if ( seen.has( id ) ) {
			return;
		}
		seen.add( id );
		const product = env.products[ id ];
		rows.push( {
			product_id: product.product_id,
			variation_id: product.variation_id,
			qty: countOf( state.items, id ),
			unit_price_minor: product.price,
		} );
	} );
	return quote( env.config, rows, {
		size: state.size,
		gift_wrap: state.gift.enabled,
		decimals,
	} );
}

/**
 * The rows the add-to-cart endpoint takes.
 *
 * @param {Object} env   Environment from createEnv().
 * @param {Object} state Builder state.
 * @return {Array} List of { product_id, variation_id, qty }.
 */
export function cartRows( env, state ) {
	const rows = [];
	const seen = new Set();
	state.items.forEach( ( id ) => {
		if ( seen.has( id ) ) {
			return;
		}
		seen.add( id );
		const product = env.products[ id ];
		rows.push( {
			product_id: product.product_id,
			variation_id: product.variation_id,
			qty: countOf( state.items, id ),
		} );
	} );
	return rows;
}

/**
 * The end date to count down to, when the campaign shows one: it has an end date
 * and fewer than `countdown_days` days remain.
 *
 * @param {Object} schedule { end, countdown_days }.
 * @param {number} nowMs    Current time in milliseconds.
 * @return {string|null} ISO date, or null.
 */
export function countdownEnd( schedule, nowMs ) {
	if ( ! schedule.end || ! ( schedule.countdown_days > 0 ) ) {
		return null;
	}
	const end = Date.parse( schedule.end );
	if ( Number.isNaN( end ) || end <= nowMs ) {
		return null;
	}
	return end - nowMs <= schedule.countdown_days * 86400000
		? schedule.end
		: null;
}

/**
 * The quantity of the highest tier a box of `count` items has reached (Tiered mix).
 *
 * @param {Object} config Public campaign config.
 * @param {number} count  Items in the box.
 * @return {number} Tier quantity, 0 when none.
 */
export function tierReached( config, count ) {
	if ( config.type !== 'tiered' ) {
		return 0;
	}
	return config.tiers.reduce(
		( best, tier ) =>
			tier.qty <= count && tier.qty > best ? Number( tier.qty ) : best,
		0
	);
}
