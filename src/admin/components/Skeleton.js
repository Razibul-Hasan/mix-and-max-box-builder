import { __ } from '@wordpress/i18n';

/**
 * Grey placeholder bars for part of a screen that is still loading. Use
 * PageSkeleton for a whole screen.
 *
 * @param {Object}  props
 * @param {string}  props.label  Screen reader text.
 * @param {number}  props.lines  How many bars to draw; the last one is shorter.
 * @param {boolean} props.inline One short bar, sized for a number or a label.
 */
export default function Skeleton( { label, lines = 3, inline = false } ) {
	const text =
		label || __( 'Loading…', 'productboxes-mix-and-match-box-builder' );
	if ( inline ) {
		return (
			<span
				className="mmbb-app-skeleton__bar is-inline"
				role="status"
				aria-busy="true"
			>
				<span className="screen-reader-text">{ text }</span>
			</span>
		);
	}
	return (
		<span
			className="mmbb-app-skeleton is-lines"
			role="status"
			aria-busy="true"
		>
			<span className="screen-reader-text">{ text }</span>
			{ Array.from( { length: lines } ).map( ( _, index ) => (
				<span
					key={ index }
					className={
						'mmbb-app-skeleton__bar' +
						( index === lines - 1 && lines > 1 ? ' is-short' : '' )
					}
					aria-hidden="true"
				/>
			) ) }
		</span>
	);
}
