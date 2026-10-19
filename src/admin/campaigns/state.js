import { PER_PAGE } from '../constants';

export const initialState = {
	status: 'all',
	search: '',
	type: '',
	orderby: 'date',
	page: 1,
	selected: [],
};

// Changing a filter starts again on page one with nothing selected.
const reset = { page: 1, selected: [] };

export function campaignsReducer( state, action ) {
	switch ( action.type ) {
		case 'status':
			return { ...state, ...reset, status: action.value };
		case 'search':
			if ( action.value === state.search ) {
				return state;
			}
			return { ...state, ...reset, search: action.value };
		case 'type':
			return { ...state, ...reset, type: action.value };
		case 'orderby':
			return { ...state, ...reset, orderby: action.value };
		case 'page':
			return { ...state, page: action.value, selected: [] };
		case 'select':
			return { ...state, selected: action.ids };
		case 'toggle':
			return {
				...state,
				selected: state.selected.includes( action.id )
					? state.selected.filter( ( id ) => id !== action.id )
					: [ ...state.selected, action.id ],
			};
		case 'clear_filters':
			return { ...initialState };
		case 'clear_selection':
			return { ...state, selected: [] };
		default:
			return state;
	}
}

// The request the list sends for a state.
export function queryFor( state ) {
	return {
		status: state.status === 'all' ? '' : state.status,
		search: state.search,
		type: state.type,
		orderby: state.orderby,
		page: state.page,
		per_page: PER_PAGE,
	};
}

export function hasFilters( state ) {
	return state.status !== 'all' || state.search !== '' || state.type !== '';
}

// "Showing 1–6 of 9": the first and last row number on this page.
export function rangeFor( page, total, perPage = PER_PAGE ) {
	if ( total === 0 ) {
		return { from: 0, to: 0 };
	}
	return {
		from: ( page - 1 ) * perPage + 1,
		to: Math.min( total, page * perPage ),
	};
}

// A bulk result row failed when `ok` is false.
export function summarizeBulk( response ) {
	const results = ( response && response.results ) || [];
	const failed = results.filter( ( r ) => ! r.ok );
	return {
		ok: results.length - failed.length,
		failed: failed.length,
		message: failed.length ? failed[ 0 ].message : '',
	};
}
