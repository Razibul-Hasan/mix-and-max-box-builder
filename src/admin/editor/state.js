import { __ } from '@wordpress/i18n';

export const STEPS = [ 'basics', 'products', 'rules', 'design', 'publish' ];

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
	return { saved: copy, draft: copy, dirty: false };
}

function withDraft( state, draft ) {
	return { ...state, draft, dirty: ! same( draft, state.saved ) };
}

/**
 * The editor's one reducer: the saved copy, the draft the merchant is editing
 * and whether they differ.
 *
 * @param {Object} state  Current state.
 * @param {Object} action Action.
 * @return {Object} Next state.
 */
export function editorReducer( state, action ) {
	switch ( action.type ) {
		case 'set':
			return withDraft( state, {
				...state.draft,
				config: setIn( state.draft.config, action.path, action.value ),
			} );
		case 'title':
			return withDraft( state, { ...state.draft, title: action.value } );
		case 'discard':
			return { ...state, draft: state.saved, dirty: false };
		case 'saved': {
			// The server's sanitized copy becomes the saved copy. Edits made while the
			// request was in flight stay in the draft.
			const saved = snapshot( action.campaign );
			const untouched = action.sent && same( state.draft, action.sent );
			return {
				saved,
				draft: untouched ? saved : state.draft,
				dirty: untouched ? false : ! same( state.draft, saved ),
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

// ---- Validation ------------------------------------------------------------

function validateRows( rows, key, config, errors ) {
	const capacity = toNumber( config.box.capacity );
	let seen = 0;
	rows.forEach( ( row, index ) => {
		const qty = toNumber( row.qty );
		const base = key + '.' + index;
		if ( ! isWhole( qty ) || qty < 1 ) {
			errors[ base + '.qty' ] = __(
				'Enter a whole number of items.',
				'mix-and-max-box-builder'
			);
		} else if ( qty > capacity ) {
			errors[ base + '.qty' ] = __(
				'Can’t be more than the box holds.',
				'mix-and-max-box-builder'
			);
		} else if ( qty <= seen ) {
			errors[ base + '.qty' ] = __(
				'Needs more items than the row above.',
				'mix-and-max-box-builder'
			);
		}
		if ( isWhole( qty ) && qty > seen ) {
			seen = qty;
		}

		const value = toNumber( row.value );
		if ( ! Number.isFinite( value ) || value <= 0 ) {
			errors[ base + '.value' ] = __(
				'Enter an amount above zero.',
				'mix-and-max-box-builder'
			);
		} else if ( row.discount_type === 'percent' && value > MAX_PERCENT ) {
			errors[ base + '.value' ] = __(
				'Percent discounts go up to 90.',
				'mix-and-max-box-builder'
			);
		}
	} );
}

const RULES = {
	basics( draft, errors ) {
		if ( ! draft.title.trim() ) {
			errors.title = __(
				'Give the campaign a name.',
				'mix-and-max-box-builder'
			);
		}
		const { start, end } = draft.config.schedule;
		if ( start && end && new Date( end ) <= new Date( start ) ) {
			errors[ 'schedule.end' ] = __(
				'The end date must be after the start date.',
				'mix-and-max-box-builder'
			);
		}
	},
	products( draft, errors ) {
		const products = draft.config.products;
		if ( products.source === 'manual' && products.ids.length === 0 ) {
			errors[ 'products.ids' ] = __(
				'Pick at least one product.',
				'mix-and-max-box-builder'
			);
		} else if (
			products.source !== 'manual' &&
			products.term_ids.length === 0
		) {
			errors[ 'products.term_ids' ] = __(
				'Pick at least one category or tag.',
				'mix-and-max-box-builder'
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
				'mix-and-max-box-builder'
			);
			return;
		}
		if ( config.type === 'tiered' ) {
			const minimum = toNumber( config.box.min_items );
			if ( ! isWhole( minimum ) || minimum < 1 || minimum > capacity ) {
				errors[ 'box.min_items' ] = __(
					'Enter a number from 1 up to what the box holds.',
					'mix-and-max-box-builder'
				);
			}
			if ( config.tiers.length === 0 ) {
				errors.tiers = __(
					'Add at least one discount tier.',
					'mix-and-max-box-builder'
				);
			}
			validateRows( config.tiers, 'tiers', config, errors );
		}
		if ( config.type === 'fixed' ) {
			if ( config.sizes.length === 0 ) {
				errors.sizes = __(
					'Add at least one box size.',
					'mix-and-max-box-builder'
				);
			}
			validateRows( config.sizes, 'sizes', config, errors );
		}
		if ( config.type === 'bundle' ) {
			const qty = toNumber( config.bundle.qty );
			if ( ! isWhole( qty ) || qty < 1 || qty > capacity ) {
				errors[ 'bundle.qty' ] = __(
					'Enter a number from 1 up to what the box holds.',
					'mix-and-max-box-builder'
				);
			}
			const price = toNumber( config.bundle.price );
			if ( ! Number.isFinite( price ) || price <= 0 ) {
				errors[ 'bundle.price' ] = __(
					'Set a bundle price above zero.',
					'mix-and-max-box-builder'
				);
			}
		}
		if ( config.box.allow_duplicates ) {
			const max = toNumber( config.box.max_per_product );
			if ( ! isWhole( max ) || max < 1 || max > capacity ) {
				errors[ 'box.max_per_product' ] = __(
					'Enter a number from 1 up to what the box holds.',
					'mix-and-max-box-builder'
				);
			}
		}
		const wrap = config.extras.gift_wrap;
		if ( wrap.enabled ) {
			const fee = toNumber( wrap.fee );
			if ( ! Number.isFinite( fee ) || fee < 0 ) {
				errors[ 'extras.gift_wrap.fee' ] = __(
					'Enter a fee of zero or more.',
					'mix-and-max-box-builder'
				);
			}
		}
	},
	design() {},
	publish() {},
};

/**
 * Inline errors for one step.
 *
 * @param {string} step  basics, products, rules, design or publish.
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
	if ( path === 'title' || path.indexOf( 'schedule' ) === 0 ) {
		return 'basics';
	}
	if ( path.indexOf( 'products' ) === 0 ) {
		return 'products';
	}
	if ( path.indexOf( 'design' ) === 0 ) {
		return 'design';
	}
	return 'rules';
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

/**
 * Turn the page title or campaign name into a URL slug for a new page.
 *
 * @param {string} text Text.
 * @return {string} Lowercase words joined with dashes.
 */
export function slugify( text ) {
	return String( text || '' )
		.normalize( 'NFKD' )
		.replace( /[̀-ͯ]/g, '' )
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^-+|-+$/g, '' );
}

/**
 * Clean a slug while it is being typed: the same rules as slugify(), except a
 * trailing dash stays so "holiday-box" can be typed.
 *
 * @param {string} text Text typed so far.
 * @return {string} Lowercase letters, digits and single dashes.
 */
export function slugInput( text ) {
	return String( text || '' )
		.normalize( 'NFKD' )
		.replace( /[\u0300-\u036f]/g, '' )
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^-+/, '' );
}
