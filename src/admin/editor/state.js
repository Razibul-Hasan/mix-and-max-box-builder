import { __ } from '@wordpress/i18n';

/** The editor's three steps, in order. Publish is a dialog, not a step. */
export const STEPS = [ 'products', 'discounts', 'design' ];

/** Most undo snapshots kept. */
export const HISTORY_LIMIT = 50;

// Edits to the same field closer together than this are one undo step.
const COALESCE_MS = 1000;

/**
 * The step for a `step` query arg, including the 1.0 editor's five step names.
 *
 * @param {string|null} value Query arg value.
 * @return {string} products, discounts, design, publish or published.
 */
export function stepFromQuery( value ) {
	switch ( value ) {
		case 'basics':
			return 'design';
		case 'rules':
			return 'discounts';
		case 'products':
		case 'discounts':
		case 'design':
		case 'publish':
		case 'published':
			return value;
		default:
			return 'products';
	}
}

const MAX_CAPACITY = 48;
const MAX_PERCENT = 90;

/**
 * Set a value deep inside an object without changing the original. Numeric path
 * parts index arrays; every other part is an object key.
 *
 * @param {Object} source Object to copy.
 * @param {string} path   Dotted path such as `tiers.0.qty`.
 * @param {*}      value  New value.
 * @return {Object} Updated copy.
 */
export function setIn( source, path, value ) {
	const keys = path.split( '.' );
	const write = ( node, index ) => {
		const key = keys[ index ];
		const copy = Array.isArray( node ) ? node.slice() : { ...node };
		copy[ key ] =
			index === keys.length - 1
				? value
				: write(
						node && node[ key ] !== undefined ? node[ key ] : {},
						index + 1
				  );
		return copy;
	};
	return write( source, 0 );
}

/**
 * Read a number the shopper typed. Empty and non-numeric input is NaN.
 *
 * @param {*} value Raw value.
 * @return {number} Number or NaN.
 */
export function toNumber( value ) {
	if ( typeof value === 'number' ) {
		return value;
	}
	if ( typeof value !== 'string' || value.trim() === '' ) {
		return NaN;
	}
	return Number( value );
}

/**
 * Move one entry of a list to a new position.
 *
 * @param {Array}  list Original list.
 * @param {number} from Index to take.
 * @param {number} to   Index to put it at.
 * @return {Array} Reordered copy; the same list when nothing moves.
 */
export function moveItem( list, from, to ) {
	if (
		from === to ||
		from < 0 ||
		to < 0 ||
		from >= list.length ||
		to >= list.length
	) {
		return list;
	}
	const copy = list.slice();
	const [ item ] = copy.splice( from, 1 );
	copy.splice( to, 0, item );
	return copy;
}

const isWhole = ( n ) => Number.isFinite( n ) && Math.floor( n ) === n;

function snapshot( campaign ) {
	return {
		title: campaign.title,
		config: campaign.config,
	};
}

function same( a, b ) {
	return JSON.stringify( a ) === JSON.stringify( b );
}

export function initEditor( campaign ) {
	const copy = snapshot( campaign );
	return {
		saved: copy,
		draft: copy,
		dirty: false,
		past: [],
		future: [],
		lastKey: null,
		lastAt: 0,
	};
}

function withDraft( state, draft ) {
	return { ...state, draft, dirty: ! same( draft, state.saved ) };
}

// A change the merchant made: one undo snapshot, unless it continues the last edit.
function edit( state, draft, key, time ) {
	if ( same( draft, state.draft ) ) {
		return state;
	}
	const timed = typeof time === 'number';
	const continues =
		timed &&
		key !== null &&
		key === state.lastKey &&
		time - state.lastAt < COALESCE_MS;
	return {
		...withDraft( state, draft ),
		past: continues
			? state.past
			: [ ...state.past, state.draft ].slice( -HISTORY_LIMIT ),
		future: [],
		lastKey: timed ? key : null,
		lastAt: timed ? time : 0,
	};
}

/**
 * The editor's one reducer: the saved copy, the draft the merchant is editing,
 * whether they differ, and the undo and redo stacks (up to 50 snapshots each).
 * Edits to the same field within a second are one undo step when the action
 * carries a `time`.
 *
 * @param {Object} state  Current state.
 * @param {Object} action Action.
 * @return {Object} Next state.
 */
export function editorReducer( state, action ) {
	switch ( action.type ) {
		case 'set':
			return edit(
				state,
				{
					...state.draft,
					config: setIn(
						state.draft.config,
						action.path,
						action.value
					),
				},
				'set:' + action.path,
				action.time
			);
		case 'title':
			return edit(
				state,
				{ ...state.draft, title: action.value },
				'title',
				action.time
			);
		case 'discard':
			return edit( state, state.saved, null );
		case 'undo': {
			if ( ! state.past.length ) {
				return state;
			}
			return {
				...withDraft( state, state.past[ state.past.length - 1 ] ),
				past: state.past.slice( 0, -1 ),
				future: [ state.draft, ...state.future ].slice(
					0,
					HISTORY_LIMIT
				),
				lastKey: null,
				lastAt: 0,
			};
		}
		case 'redo': {
			if ( ! state.future.length ) {
				return state;
			}
			return {
				...withDraft( state, state.future[ 0 ] ),
				past: [ ...state.past, state.draft ].slice( -HISTORY_LIMIT ),
				future: state.future.slice( 1 ),
				lastKey: null,
				lastAt: 0,
			};
		}
		case 'restore':
			// A draft kept in the browser from before a reload.
			return {
				...withDraft( state, action.draft ),
				past: [],
				future: [],
				lastKey: null,
				lastAt: 0,
			};
		case 'saved': {
			// The server's sanitized copy becomes the saved copy. Edits made while the
			// request was in flight stay in the draft. Undo history is kept.
			const saved = snapshot( action.campaign );
			const untouched = action.sent && same( state.draft, action.sent );
			return {
				...state,
				saved,
				draft: untouched ? saved : state.draft,
				dirty: untouched ? false : ! same( state.draft, saved ),
				lastKey: null,
				lastAt: 0,
			};
		}
		default:
			return state;
	}
}

// The payload a save sends.
export function payloadFor( draft ) {
	return { title: draft.title, config: draft.config };
}

/**
 * The record kept in `mmbb:editor:<id>`: the page picked for publishing and,
 * while there are unsaved edits, the draft and the save it started from.
 *
 * @param {number}      pageId Page picked for publishing.
 * @param {Object|null} draft  Unsaved draft, or null.
 * @param {string}      base   `modified` of the saved box the draft started from.
 * @return {string} JSON.
 */
export function draftRecord( pageId, draft, base ) {
	return JSON.stringify( draft ? { pageId, draft, base } : { pageId } );
}

/**
 * The unsaved draft kept in the browser, when it still belongs to the saved box.
 * A draft made before a later save (here or in another tab) is ignored.
 *
 * @param {string} raw      Stored JSON.
 * @param {Object} campaign Box from the server.
 * @return {Object|null} Draft ({ title, config }), or null.
 */
export function storedDraft( raw, campaign ) {
	let record;
	try {
		record = JSON.parse( raw );
	} catch ( e ) {
		return null;
	}
	if (
		! record ||
		typeof record !== 'object' ||
		record.base !== campaign.modified ||
		! record.draft ||
		typeof record.draft.title !== 'string' ||
		! record.draft.config ||
		typeof record.draft.config !== 'object'
	) {
		return null;
	}
	const draft = { title: record.draft.title, config: record.draft.config };
	return same( draft, snapshot( campaign ) ) ? null : draft;
}

// ---- Validation ------------------------------------------------------------

// The most items a shopper must pick: the largest size, the tiered minimum, or the bundle.
function neededItems( config ) {
	if ( config.type === 'fixed' ) {
		return Math.max(
			0,
			...config.sizes.map( ( s ) => toNumber( s.qty ) || 0 )
		);
	}
	if ( config.type === 'tiered' ) {
		return toNumber( config.box.min_items ) || 0;
	}
	return toNumber( config.bundle.qty ) || 0;
}

// The most items a hand-picked list can supply; per-product caps are left out.
function reachableItems( config ) {
	const count = new Set( config.products.ids.map( Number ) ).size;
	return config.box.allow_duplicates
		? count * Math.max( 1, toNumber( config.box.max_per_product ) || 1 )
		: count;
}

function validateRows( rows, key, config, errors ) {
	const capacity = toNumber( config.box.capacity );
	let seen = 0;
	rows.forEach( ( row, index ) => {
		const qty = toNumber( row.qty );
		const base = key + '.' + index;
		if ( ! isWhole( qty ) || qty < 1 ) {
			errors[ base + '.qty' ] = __(
				'Enter a whole number of items.',
				'productboxes-mix-and-match-box-builder'
			);
		} else if ( qty > capacity ) {
			errors[ base + '.qty' ] = __(
				'Can’t be more than the box holds.',
				'productboxes-mix-and-match-box-builder'
			);
		} else if ( qty <= seen ) {
			errors[ base + '.qty' ] = __(
				'Needs more items than the row above.',
				'productboxes-mix-and-match-box-builder'
			);
		}
		if ( isWhole( qty ) && qty > seen ) {
			seen = qty;
		}

		const value = toNumber( row.value );
		if ( ! Number.isFinite( value ) || value <= 0 ) {
			errors[ base + '.value' ] = __(
				'Enter an amount above zero.',
				'productboxes-mix-and-match-box-builder'
			);
		} else if ( row.discount_type === 'percent' && value > MAX_PERCENT ) {
			errors[ base + '.value' ] = __(
				'Percent discounts go up to 90.',
				'productboxes-mix-and-match-box-builder'
			);
		}
	} );
}

function titleRules( draft, errors ) {
	if ( ! draft.title.trim() ) {
		errors.title = __(
			'Give the campaign a name.',
			'productboxes-mix-and-match-box-builder'
		);
	}
}

const RULES = {
	basics( draft, errors ) {
		titleRules( draft, errors );
		RULES.schedule( draft, errors );
	},
	schedule( draft, errors ) {
		const { start, end } = draft.config.schedule;
		if ( start && end && new Date( end ) <= new Date( start ) ) {
			errors[ 'schedule.end' ] = __(
				'The end date must be after the start date.',
				'productboxes-mix-and-match-box-builder'
			);
		}
		const { countdown_days: days, countdown_end: countTo } =
			draft.config.schedule;
		if ( days > 0 && ! start && ! end && ! countTo ) {
			errors[ 'schedule.countdown_end' ] = __(
				'Pick when the countdown ends.',
				'productboxes-mix-and-match-box-builder'
			);
		}
	},
	products( draft, errors ) {
		const products = draft.config.products;
		if ( products.source === 'manual' && products.ids.length === 0 ) {
			errors[ 'products.ids' ] = __(
				'Pick at least one product.',
				'productboxes-mix-and-match-box-builder'
			);
		} else if (
			products.source !== 'manual' &&
			products.term_ids.length === 0
		) {
			errors[ 'products.term_ids' ] = __(
				'Pick at least one category or tag.',
				'productboxes-mix-and-match-box-builder'
			);
		}
	},
	rules( draft, errors ) {
		const { config } = draft;
		const capacity = toNumber( config.box.capacity );
		if (
			! isWhole( capacity ) ||
			capacity < 1 ||
			capacity > MAX_CAPACITY
		) {
			errors[ 'box.capacity' ] = __(
				'Enter a number from 1 to 48.',
				'productboxes-mix-and-match-box-builder'
			);
			return;
		}
		if ( config.type === 'tiered' ) {
			const minimum = toNumber( config.box.min_items );
			if ( ! isWhole( minimum ) || minimum < 1 || minimum > capacity ) {
				errors[ 'box.min_items' ] = __(
					'Enter a number from 1 up to what the box holds.',
					'productboxes-mix-and-match-box-builder'
				);
			}
			if ( config.tiers.length === 0 ) {
				errors.tiers = __(
					'Add at least one discount tier.',
					'productboxes-mix-and-match-box-builder'
				);
			}
			validateRows( config.tiers, 'tiers', config, errors );
		}
		if ( config.type === 'fixed' ) {
			if ( config.sizes.length === 0 ) {
				errors.sizes = __(
					'Add at least one box size.',
					'productboxes-mix-and-match-box-builder'
				);
			}
			validateRows( config.sizes, 'sizes', config, errors );
		}
		if ( config.type === 'bundle' ) {
			const qty = toNumber( config.bundle.qty );
			if ( ! isWhole( qty ) || qty < 1 || qty > capacity ) {
				errors[ 'bundle.qty' ] = __(
					'Enter a number from 1 up to what the box holds.',
					'productboxes-mix-and-match-box-builder'
				);
			}
			const price = toNumber( config.bundle.price );
			if ( ! Number.isFinite( price ) || price <= 0 ) {
				errors[ 'bundle.price' ] = __(
					'Set a bundle price above zero.',
					'productboxes-mix-and-match-box-builder'
				);
			}
		}
		if ( config.box.allow_duplicates ) {
			const max = toNumber( config.box.max_per_product );
			if ( ! isWhole( max ) || max < 1 || max > capacity ) {
				errors[ 'box.max_per_product' ] = __(
					'Enter a number from 1 up to what the box holds.',
					'productboxes-mix-and-match-box-builder'
				);
			}
		}
		// Mirrors Config::validate(): a hand-picked list that can never fill the box.
		if (
			config.products.source === 'manual' &&
			config.products.ids.length > 0 &&
			neededItems( config ) > reachableItems( config )
		) {
			errors[ 'box.allow_duplicates' ] = __(
				'The picked products can’t fill this box. Pick more products, or allow more of each one.',
				'productboxes-mix-and-match-box-builder'
			);
		}
		const wrap = config.extras.gift_wrap;
		if ( wrap.enabled ) {
			const fee = toNumber( wrap.fee );
			if ( ! Number.isFinite( fee ) || fee < 0 ) {
				errors[ 'extras.gift_wrap.fee' ] = __(
					'Enter a fee of zero or more.',
					'productboxes-mix-and-match-box-builder'
				);
			}
		}
		const freeGift = config.extras.free_gift;
		if ( freeGift && freeGift.enabled ) {
			if ( ! freeGift.product_id ) {
				errors[ 'extras.free_gift.product_id' ] = __(
					'Pick the product to give away.',
					'productboxes-mix-and-match-box-builder'
				);
			}
			const min = toNumber( freeGift.min_items );
			if ( ! isWhole( min ) || min < 1 || min > capacity ) {
				errors[ 'extras.free_gift.min_items' ] = __(
					'Enter a number from 1 up to what the box holds.',
					'productboxes-mix-and-match-box-builder'
				);
			}
		}
	},
	discounts( draft, errors ) {
		RULES.schedule( draft, errors );
		RULES.rules( draft, errors );
	},
	design( draft, errors ) {
		titleRules( draft, errors );
	},
	publish() {},
};

/**
 * Inline errors for one step.
 *
 * @param {string} step  products, discounts or design (or the 1.0 names basics, rules).
 * @param {Object} draft The draft ({ title, config }).
 * @return {Object} Messages keyed by field path. Empty when the step is valid.
 */
export function validateStep( step, draft ) {
	const errors = {};
	if ( RULES[ step ] ) {
		RULES[ step ]( draft, errors );
	}
	return errors;
}

/**
 * Errors for every step that has any.
 *
 * @param {Object} draft The draft.
 * @return {Object} Step name to errors, only for steps with errors.
 */
export function validateAll( draft ) {
	const out = {};
	STEPS.forEach( ( step ) => {
		const errors = validateStep( step, draft );
		if ( Object.keys( errors ).length ) {
			out[ step ] = errors;
		}
	} );
	return out;
}

/**
 * Which step shows a field path from the server.
 *
 * @param {string} path Config path such as `tiers.1.qty`.
 * @return {string} Step name.
 */
export function stepForPath( path ) {
	if ( path === 'title' || path.indexOf( 'design' ) === 0 ) {
		return 'design';
	}
	if ( path.indexOf( 'products' ) === 0 ) {
		return 'products';
	}
	return 'discounts';
}

/**
 * A step can be opened when every step before it is valid, so the merchant can
 * go back to finished steps and forward as far as they have completed.
 *
 * @param {number} index Step index.
 * @param {Object} draft The draft.
 * @return {boolean} Whether the step can be opened.
 */
export function canOpenStep( index, draft ) {
	for ( let i = 0; i < index; i++ ) {
		if ( Object.keys( validateStep( STEPS[ i ], draft ) ).length ) {
			return false;
		}
	}
	return true;
}
