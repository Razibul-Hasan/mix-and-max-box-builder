import { useCallback, useEffect, useState } from '@wordpress/element';
import { getProducts } from '../api';

const CHUNK = 50;

/**
 * Product records by id for the picked products. Anything the search list has already
 * loaded is passed to `remember`, so a product is requested once.
 *
 * @param {number[]} ids Picked product ids.
 * @return {{byId: Object, remember: Function}} Records and a way to add more.
 */
export function useProductCatalog( ids ) {
	const [ byId, setById ] = useState( {} );
	const key = ids.join( ',' );

	const remember = useCallback( ( products ) => {
		setById( ( current ) => {
			const next = { ...current };
			products.forEach( ( p ) => {
				next[ p.id ] = p;
			} );
			return next;
		} );
	}, [] );

	useEffect( () => {
		const missing = ids.filter( ( id ) => ! byId[ id ] );
		if ( missing.length === 0 ) {
			return;
		}
		let cancelled = false;
		const requests = [];
		for ( let i = 0; i < missing.length; i += CHUNK ) {
			requests.push(
				getProducts( {
					include: missing.slice( i, i + CHUNK ),
					per_page: CHUNK,
				} )
			);
		}
		Promise.all( requests )
			.then( ( lists ) => {
				if ( ! cancelled ) {
					remember( lists.flat() );
				}
			} )
			.catch( () => {
				// The list still works with names missing; the next change retries.
			} );
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ key ] );

	return { byId, remember };
}

/**
 * Whether a media query matches, kept up to date.
 *
 * @param {string} query Media query.
 * @return {boolean} Match state.
 */
export function useMediaQuery( query ) {
	const read = () =>
		typeof window.matchMedia === 'function' &&
		window.matchMedia( query ).matches;
	const [ matches, setMatches ] = useState( read );
	useEffect( () => {
		if ( typeof window.matchMedia !== 'function' ) {
			return;
		}
		const list = window.matchMedia( query );
		const update = () => setMatches( list.matches );
		update();
		list.addEventListener( 'change', update );
		return () => list.removeEventListener( 'change', update );
	}, [ query ] );
	return matches;
}
