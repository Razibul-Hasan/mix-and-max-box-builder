import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

/**
 * Run a request when `deps` change. The previous data stays in place while the next
 * request runs, so the screen can dim instead of jumping. Late answers from an
 * earlier request are ignored.
 *
 * @param {Function} fetcher Returns a promise.
 * @param {Array}    deps    Re-run when these change.
 * @return {{data: *, error: *, loading: boolean, reload: Function}} State.
 */
export function useRequest( fetcher, deps ) {
	const [ state, setState ] = useState( {
		data: null,
		error: null,
		loading: true,
	} );
	const latest = useRef( 0 );
	const fetcherRef = useRef( fetcher );
	fetcherRef.current = fetcher;

	const invalidate = useCallback( () => {
		latest.current++;
	}, [] );

	const run = useCallback( () => {
		const id = ++latest.current;
		setState( ( s ) => ( { ...s, loading: true, error: null } ) );
		fetcherRef
			.current()
			.then( ( data ) => {
				if ( id === latest.current ) {
					setState( { data, error: null, loading: false } );
				}
			} )
			.catch( ( error ) => {
				if ( id === latest.current ) {
					setState( ( s ) => ( { ...s, error, loading: false } ) );
				}
			} );
	}, [] );

	useEffect( () => {
		run();
		// Invalidate the request still in flight on a change or unmount.
		return invalidate;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps );

	return { ...state, reload: run };
}

export function useDebouncedValue( value, delay = 300 ) {
	const [ debounced, setDebounced ] = useState( value );
	useEffect( () => {
		const timer = setTimeout( () => setDebounced( value ), delay );
		return () => clearTimeout( timer );
	}, [ value, delay ] );
	return debounced;
}

// localStorage can throw or be absent, so every access is guarded.
export function readStored( key, fallback ) {
	try {
		const value = window.localStorage.getItem( key );
		return value === null ? fallback : value;
	} catch ( e ) {
		return fallback;
	}
}

export function writeStored( key, value ) {
	try {
		window.localStorage.setItem( key, value );
	} catch ( e ) {
		// Storage is only a convenience.
	}
}

export function errorMessage( error, fallback ) {
	return error && error.message ? error.message : fallback;
}
