import { __, _n, sprintf } from '@wordpress/i18n';
import Button from './Button';
import BoxSlots from './BoxSlots';
import TierProgress from './TierProgress';
import { useMoney } from './MoneyContext';

export default function BoxPanel( {
	title = __( 'Your box', 'mix-and-max-box-builder' ),
	size = 6,
	items = [],
	tiers = [],
	subtotal = 0,
	total = 0,
	minItems,
	onRemove,
	onCheckout,
	ctaHref,
	ctaDisabled,
	ctaLoading,
	ctaLabel = __( 'Add box to cart', 'mix-and-max-box-builder' ),
	footnote,
	children,
} ) {
	const formatMoney = useMoney();
	const count = items.length;
	const need =
		( minItems !== null && minItems !== undefined ? minItems : size ) -
		count;
	const savings = subtotal - total;
	return (
		<aside className="mmbb-panel" aria-label={ title }>
			<header className="mmbb-panel__head">
				<h3>{ title }</h3>
				<span className="mmbb-panel__count">
					{ count }/{ size }
				</span>
			</header>
			<BoxSlots size={ size } items={ items } onRemove={ onRemove } />
			{ tiers.length ? (
				<TierProgress count={ count } tiers={ tiers } size={ size } />
			) : null }
			{ children }
			<dl className="mmbb-panel__sum">
				<div>
					<dt>{ __( 'Subtotal', 'mix-and-max-box-builder' ) }</dt>
					<dd>{ formatMoney( subtotal ) }</dd>
				</div>
				{ savings > 0 ? (
					<div className="is-save">
						<dt>
							{ __( 'Box discount', 'mix-and-max-box-builder' ) }
						</dt>
						<dd>&minus;{ formatMoney( savings ) }</dd>
					</div>
				) : null }
				<div className="is-total">
					<dt>{ __( 'Total', 'mix-and-max-box-builder' ) }</dt>
					<dd>{ formatMoney( total ) }</dd>
				</div>
			</dl>
			<Button
				variant="max"
				size="lg"
				fullWidth
				disabled={ need > 0 || ctaDisabled }
				loading={ ctaLoading }
				onClick={ onCheckout }
				href={ ctaHref }
				iconRight={ need > 0 ? undefined : 'arrowRight' }
			>
				{ need > 0
					? sprintf(
							/* translators: %d: Number of items. */ _n(
								'Add %d more to continue',
								'Add %d more to continue',
								need,
								'mix-and-max-box-builder'
							),
							need
					  )
					: ctaLabel }
			</Button>
			{ footnote ? (
				<p className="mmbb-panel__foot">{ footnote }</p>
			) : null }
		</aside>
	);
}
