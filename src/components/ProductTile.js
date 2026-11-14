import { __, _n, sprintf } from '@wordpress/i18n';
import Icon from './Icon';
import Button from './Button';
import Badge from './Badge';
import Sticker from './Sticker';
import QuantityStepper from './QuantityStepper';
import { cx } from './utils';
import { useMoney } from './MoneyContext';
import Media from './Media';

export default function ProductTile( {
	name,
	price,
	compareAt,
	image,
	art,
	badge,
	badgeTone = 'deal',
	meta,
	stock,
	qty = 0,
	onAdd,
	onChange,
	boxFull,
} ) {
	const formatMoney = useMoney();
	const inBox = qty > 0;
	const out = stock === 0;
	return (
		<article
			className={ cx(
				'mmbb-tile',
				inBox && 'is-in-box',
				out && 'is-out'
			) }
		>
			<div className="mmbb-tile__media">
				<Media image={ image } art={ art } name={ name } />
				{ badge ? (
					<span className="mmbb-tile__badge">
						{ badgeTone === 'deal' ? (
							<Sticker size="sm">{ badge }</Sticker>
						) : (
							<Badge tone={ badgeTone }>{ badge }</Badge>
						) }
					</span>
				) : null }
				{ inBox ? (
					<span
						className="mmbb-tile__count"
						aria-label={ sprintf(
							/* translators: %d: Number of items. */ _n(
								'%d in your box',
								'%d in your box',
								qty,
								'productboxes-mix-and-match-box-builder'
							),
							qty
						) }
					>
						{ qty }×
					</span>
				) : null }
			</div>
			<div className="mmbb-tile__body">
				<h4 className="mmbb-tile__name">{ name }</h4>
				{ meta ? <p className="mmbb-tile__meta">{ meta }</p> : null }
				<div className="mmbb-tile__price">
					<span>{ formatMoney( price ) }</span>
					{ compareAt ? (
						<s
							aria-label={ sprintf(
								/* translators: %s: Formatted previous price. */ __(
									'Was %s',
									'productboxes-mix-and-match-box-builder'
								),
								formatMoney( compareAt )
							) }
						>
							{ formatMoney( compareAt ) }
						</s>
					) : null }
				</div>
				{ stock !== null &&
				stock !== undefined &&
				stock > 0 &&
				stock <= 5 ? (
					<p className="mmbb-tile__stock">
						<Icon name="flame" size={ 14 } strokeWidth={ 2 } />
						{ sprintf(
							/* translators: %d: Number of units in stock. */ _n(
								'Only %d left',
								'Only %d left',
								stock,
								'productboxes-mix-and-match-box-builder'
							),
							stock
						) }
					</p>
				) : null }
			</div>
			<div className="mmbb-tile__action">
				{ out ? (
					<Button fullWidth disabled>
						{ __(
							'Sold out',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				) : inBox ? (
					<QuantityStepper
						value={ qty }
						onChange={ onChange }
						max={ boxFull ? qty : 99 }
						fullWidth
						label={ sprintf(
							/* translators: %s: Product name. */ __(
								'Quantity of %s',
								'productboxes-mix-and-match-box-builder'
							),
							name
						) }
					/>
				) : (
					<Button
						variant="primary"
						fullWidth
						icon={ boxFull ? undefined : 'plus' }
						onClick={ onAdd }
						disabled={ boxFull }
						aria-label={
							boxFull
								? undefined
								: sprintf(
										/* translators: %s: Product name. */ __(
											'Add %s to box',
											'productboxes-mix-and-match-box-builder'
										),
										name
								  )
						}
					>
						{ boxFull
							? __(
									'Box is full',
									'productboxes-mix-and-match-box-builder'
							  )
							: __(
									'Add to box',
									'productboxes-mix-and-match-box-builder'
							  ) }
					</Button>
				) }
			</div>
		</article>
	);
}
