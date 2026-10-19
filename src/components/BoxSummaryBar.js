import { __, _n, sprintf } from '@wordpress/i18n';
import Icon from './Icon';
import Button from './Button';
import TierProgress from './TierProgress';
import { useMoney } from './MoneyContext';
import Media from './Media';

export default function BoxSummaryBar( {
	size = 6,
	items = [],
	tiers = [],
	total = 0,
	compareAt,
	minItems,
	onOpen,
	openHref,
	onCheckout,
	ctaHref,
	ctaLabel = __( 'Add to cart', 'mix-and-max-box-builder' ),
} ) {
	const formatMoney = useMoney();
	const count = items.length;
	const need =
		( minItems !== null && minItems !== undefined ? minItems : size ) -
		count;
	const summary = (
		<>
			<span className="mmbb-bar__thumbs" aria-hidden="true">
				{ Array.from( { length: Math.min( size, 4 ) }, ( _, i ) => (
					<span key={ i } className="mmbb-bar__thumb">
						{ items[ i ] ? (
							<Media
								image={ items[ i ].image }
								art={ items[ i ].art }
							/>
						) : null }
					</span>
				) ) }
			</span>
			<span className="mmbb-bar__count">
				<b>
					{ count }/{ size }
				</b>
				{ __( 'in your box', 'mix-and-max-box-builder' ) }
			</span>
			<Icon name="chevronUp" size={ 18 } className="mmbb-bar__chev" />
		</>
	);
	const label = sprintf(
		/* translators: 1: Filled slots, 2: Box capacity. */ _n(
			'Your box, %1$d of %2$d. Open details',
			'Your box, %1$d of %2$d. Open details',
			count,
			'mix-and-max-box-builder'
		),
		count,
		size
	);
	return (
		<div
			className="mmbb-bar"
			role="region"
			aria-label={ __( 'Your box', 'mix-and-max-box-builder' ) }
		>
			<div className="mmbb-bar__inner">
				{ openHref ? (
					<a
						className="mmbb-bar__summary"
						href={ openHref }
						aria-label={ label }
					>
						{ summary }
					</a>
				) : (
					<button
						type="button"
						className="mmbb-bar__summary"
						onClick={ onOpen }
						aria-label={ label }
					>
						{ summary }
					</button>
				) }
				{ tiers.length ? (
					<div className="mmbb-bar__tier">
						<TierProgress
							count={ count }
							tiers={ tiers }
							size={ size }
							compact
							inverse
						/>
					</div>
				) : (
					<span />
				) }
				<div className="mmbb-bar__total">
					{ compareAt && compareAt > total ? (
						<s>{ formatMoney( compareAt ) }</s>
					) : null }
					<b>{ formatMoney( total ) }</b>
				</div>
				<Button
					variant="max"
					size="lg"
					onClick={ onCheckout }
					href={ ctaHref }
					disabled={ need > 0 }
				>
					{ need > 0
						? sprintf(
								/* translators: %d: Number of items. */ _n(
									'%d to go',
									'%d to go',
									need,
									'mix-and-max-box-builder'
								),
								need
						  )
						: ctaLabel }
				</Button>
			</div>
		</div>
	);
}
