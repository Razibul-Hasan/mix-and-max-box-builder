import { useEffect, useState } from '@wordpress/element';

/** Below this container width the builder switches to the phone layout. */
export const NARROW_BELOW = 760;

/**
 * The width of an element, kept current. The layout answers to the space the
 * theme gives the builder, not to the window.
 *
 * @param {Object} ref React ref of the element to watch.
 * @return {number} Width in pixels (the window's width until measured).
 */
export function useContainerWidth( ref ) {
	const [ width, setWidth ] = useState( () => window.innerWidth || 1024 );

	useEffect( () => {
		const element = ref.current;
		if ( ! element ) {
			return undefined;
		}
		const measure = () => {
			const next = Math.round( element.getBoundingClientRect().width );
			if ( next > 0 ) {
				setWidth( next );
			}
		};
		measure();
		if ( typeof window.ResizeObserver !== 'function' ) {
			window.addEventListener( 'resize', measure );
			return () => window.removeEventListener( 'resize', measure );
		}
		const observer = new window.ResizeObserver( measure );
		observer.observe( element );
		return () => observer.disconnect();
	}, [ ref ] );

	return width;
}

/**
 * Whether the visitor asked for less motion.
 *
 * @return {boolean} True when motion should be reduced.
 */
export function prefersReducedMotion() {
	return (
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	);
}
