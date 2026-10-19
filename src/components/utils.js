import { useState, useEffect } from '@wordpress/element';
import { _x } from '@wordpress/i18n';
export const cx = ( ...a ) => a.filter( Boolean ).join( ' ' );
export function formatCompact( n, prefix = '' ) {
	const v = Number( n || 0 ),
		a = Math.abs( v );
	if ( a >= 1e6 ) {
		return (
			prefix +
			( v / 1e6 ).toFixed( a >= 1e7 ? 0 : 1 ).replace( /\.0$/, '' ) +
			_x( 'M', 'million abbreviation', 'mix-and-max-box-builder' )
		);
	}
	if ( a >= 1e3 ) {
		return (
			prefix +
			( v / 1e3 ).toFixed( a >= 1e4 ? 0 : 1 ).replace( /\.0$/, '' ) +
			_x( 'K', 'thousand abbreviation', 'mix-and-max-box-builder' )
		);
	}
	return prefix + Math.round( v );
}
export function niceScale( max, ticks ) {
	if ( ! ( max > 0 ) ) {
		return { max: ticks, step: 1 };
	}
	const raw = max / ticks,
		p = Math.pow( 10, Math.floor( Math.log10( raw ) ) ),
		m = raw / p;
	const step =
		( m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10 ) * p;
	return { max: step * ticks, step };
}
export function useControlled( value, defaultValue, onChange ) {
	const [ inner, setInner ] = useState( defaultValue );
	const isCtl = value !== undefined;
	const v = isCtl ? value : inner;
	const set = ( n ) => {
		if ( ! isCtl ) {
			setInner( n );
		}
		if ( onChange ) {
			onChange( n );
		}
	};
	return [ v, set ];
}
export function useWidth( ref, fallback ) {
	const [ w, setW ] = useState( fallback );
	useEffect( () => {
		const el = ref.current;
		if ( ! el ) {
			return;
		}
		if ( el.clientWidth ) {
			setW( el.clientWidth );
		}
		if ( typeof window.ResizeObserver === 'undefined' ) {
			return;
		}
		const ro = new window.ResizeObserver( ( es ) => {
			const cw = es[ 0 ].contentRect.width;
			if ( cw > 0 ) {
				setW( cw );
			}
		} );
		ro.observe( el );
		return () => ro.disconnect();
	}, [ ref ] );
	return w;
}
