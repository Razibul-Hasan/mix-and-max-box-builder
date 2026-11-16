import { useLayoutEffect, useState } from '@wordpress/element';

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

	// Before paint, so the first frame already uses the real container width instead of
	// flashing the desktop layout and then snapping to the narrow one.
	useLayoutEffect( () => {
		const element = ref.current;
		if ( ! element ) {
			return undefined;
		}
		// The builder shrinks its own padding in the narrow layout. Measuring the space left
		// inside that padding would then grow the width, flip the layout back, and repeat
		// every frame. So measure the outer box and subtract the padding of the wide layout,
		// which is read while the narrow class is off and remembered while it is on.
		const outer = element.closest( '.mmbb-builder' ) || element;
		let wideGutter = 0;
		const measure = () => {
			if ( ! outer.classList.contains( 'is-mmbb-narrow' ) ) {
				const style = window.getComputedStyle( outer );
				wideGutter =
					( parseFloat( style.paddingLeft ) || 0 ) +
					( parseFloat( style.paddingRight ) || 0 );
			}
			const next = Math.round(
				outer.getBoundingClientRect().width - wideGutter
			);
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
		observer.observe( outer );
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
