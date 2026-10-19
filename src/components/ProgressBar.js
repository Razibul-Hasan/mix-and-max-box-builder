import { __ } from '@wordpress/i18n';
import { cx } from './utils';

export default function ProgressBar( {
	value = 0,
	max = 100,
	label,
	valueLabel,
	tone = 'ink',
	size = 'md',
} ) {
	const pct = Math.max( 0, Math.min( 100, ( value / max ) * 100 ) );
	return (
		<div
			className={ cx(
				'mmbb-progress',
				'mmbb-progress--' + tone,
				'mmbb-progress--' + size
			) }
		>
			{ label || valueLabel ? (
				<div className="mmbb-progress__head">
					<span>{ label }</span>
					<span className="mmbb-progress__value">{ valueLabel }</span>
				</div>
			) : null }
			<div
				className="mmbb-progress__track"
				role="progressbar"
				aria-valuemin={ 0 }
				aria-valuemax={ max }
				aria-valuenow={ value }
				aria-label={
					typeof label === 'string'
						? label
						: __( 'Progress', 'mix-and-max-box-builder' )
				}
			>
				<div
					className="mmbb-progress__fill"
					style={ { width: pct + '%' } }
				/>
			</div>
		</div>
	);
}

/* ---------------- Storefront ---------------- */
/* Placeholder product art: shown when a WooCommerce product has no image. Fixed illustration
   colours (they are pictures, not UI) so they read the same in both themes. */
