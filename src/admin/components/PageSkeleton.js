import { __ } from '@wordpress/i18n';

/**
 * Grey placeholder cards shown while a screen loads. Calmer than a spinner and
 * it keeps the page from jumping when the real content arrives.
 *
 * @param {Object} props
 * @param {string} props.label Screen reader text.
 * @param {number} props.cards How many placeholder cards to draw.
 */
export default function PageSkeleton( { label, cards = 2 } ) {
	return (
		<div className="mmbb-app-skeleton" role="status" aria-busy="true">
			<span className="screen-reader-text">
				{ label ||
					__( 'Loading…', 'productboxes-mix-and-match-box-builder' ) }
			</span>
			<span
				className="mmbb-app-skeleton__bar is-title"
				aria-hidden="true"
			/>
			{ Array.from( { length: cards } ).map( ( _, index ) => (
				<div
					key={ index }
					className="mmbb-app-skeleton__card"
					aria-hidden="true"
				>
					<span className="mmbb-app-skeleton__bar is-heading" />
					<span className="mmbb-app-skeleton__bar" />
					<span className="mmbb-app-skeleton__bar is-short" />
				</div>
			) ) }
		</div>
	);
}
