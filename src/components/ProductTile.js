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
								'mix-and-max-box-builder'
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
									'mix-and-max-box-builder'
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
							/* translators: %d: Number of items. */ _n(
								'Only %d left',
								'Only %d left',
								stock,
								'mix-and-max-box-builder'
							),
							stock
						) }
					</p>
				) : null }
			</div>
			<div className="mmbb-tile__action">
				{ out ? (
					<Button fullWidth disabled>
						{ __( 'Sold out', 'mix-and-max-box-builder' ) }
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
								'mix-and-max-box-builder'
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
					>
						{ boxFull
							? __( 'Box is full', 'mix-and-max-box-builder' )
							: __( 'Add to box', 'mix-and-max-box-builder' ) }
					</Button>
				) }
			</div>
		</article>
	);
}
