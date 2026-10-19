import { createInterpolateElement } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import Icon from './Icon';
import { cx } from './utils';

export default function TierProgress( {
	count = 0,
	tiers = [],
	size,
	compact,
	inverse,
} ) {
	const sorted = tiers.slice().sort( ( a, b ) => a.qty - b.qty );
	const top = size || ( sorted.length ? sorted[ sorted.length - 1 ].qty : 1 );
	const next = sorted.find( ( t ) => count < t.qty );
	const reached = sorted.filter( ( t ) => count >= t.qty );
	const best = reached[ reached.length - 1 ];
	const pct = Math.min( 100, ( count / top ) * 100 );
	return (
		<div
			className={ cx(
				'mmbb-tier',
				compact && 'is-compact',
				inverse && 'is-inverse',
				! next && sorted.length && 'is-max'
			) }
		>
			<p className="mmbb-tier__msg" aria-live="polite">
				{ next ? (
					<>
						{ best ? (
							<span className="mmbb-tier__got">
								<Icon
									name="check"
									size={ 14 }
									strokeWidth={ 2.75 }
								/>
								{ sprintf(
									/* translators: %s: Discount label. */ __(
										'%s unlocked.',
										'mix-and-max-box-builder'
									),
									best.label
								) }
							</span>
						) : null }
						<span>
							{ createInterpolateElement(
								sprintf(
									/* translators: 1: Number of items, 2: Discount label. */ _n(
										'Add <count>%1$d more</count> to get <deal>%2$s</deal>',
										'Add <count>%1$d more</count> to get <deal>%2$s</deal>',
										next.qty - count,
										'mix-and-max-box-builder'
									),
									next.qty - count,
									next.label
								),
								{
									count: <b />,
									deal: <b className="mmbb-tier__hl" />,
								}
							) }
						</span>
					</>
				) : best ? (
					<>
						<Icon name="sparkle" size={ 16 } strokeWidth={ 2 } />
						<span>
							{ createInterpolateElement(
								sprintf(
									/* translators: %s: Discount label. */ __(
										'You unlocked <deal>%s</deal>. That’s the max deal.',
										'mix-and-max-box-builder'
									),
									best.label
								),
								{ deal: <b className="mmbb-tier__hl" /> }
							) }
						</span>
					</>
				) : null }
			</p>
			<div
				className="mmbb-tier__track"
				role="progressbar"
				aria-valuemin={ 0 }
				aria-valuemax={ top }
				aria-valuenow={ Math.min( count, top ) }
				aria-label={ __( 'Items in box', 'mix-and-max-box-builder' ) }
			>
				<div
					className="mmbb-tier__fill"
					style={ { width: pct + '%' } }
				/>
				{ sorted.map( ( t ) => (
					<span
						key={ t.qty }
						className={ cx(
							'mmbb-tier__mark',
							count >= t.qty && 'is-hit'
						) }
						style={ { left: ( t.qty / top ) * 100 + '%' } }
					/>
				) ) }
			</div>
			{ ! compact ? (
				<div className="mmbb-tier__legend">
					{ sorted.map( ( t ) => (
						<span
							key={ t.qty }
							className={ count >= t.qty ? 'is-hit' : undefined }
						>
							{ count >= t.qty ? (
								<Icon
									name="check"
									size={ 12 }
									strokeWidth={ 3 }
								/>
							) : null }
							{ sprintf(
								/* translators: 1: Filled slots, 2: Box capacity. */ _n(
									'%1$d item · %2$s',
									'%1$d items · %2$s',
									t.qty,
									'mix-and-max-box-builder'
								),
								t.qty,
								t.label
							) }
						</span>
					) ) }
				</div>
			) : null }
		</div>
	);
}
