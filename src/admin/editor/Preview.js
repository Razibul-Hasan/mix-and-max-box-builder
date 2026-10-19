import { useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	BoxPanel,
	BoxSizePicker,
	BoxSummaryBar,
	Countdown,
	ProductTile,
	Sticker,
	useMoney,
} from '../../components';
import { quote, toMinor } from '../../shared/pricing';
import { useAdmin } from '../context';
import { previewTiers, tierLabel } from './fields';
import { toNumber } from './state';

const ART = [ 'cookie', 'macaron', 'tea', 'candle', 'chocolate', 'honey' ];
const TILE_COUNT = 4;

// Stand-ins until the merchant has picked products, so the preview is never empty.
function sampleProducts() {
	return ART.slice( 0, TILE_COUNT ).map( ( art, index ) => ( {
		id: -( index + 1 ),
		name: sprintf(
			/* translators: %d: Number of the sample product. */
			__( 'Sample product %d', 'mix-and-max-box-builder' ),
			index + 1
		),
		price: 450 + index * 100,
		art,
	} ) );
}

function stockFor( product ) {
	if ( product.stock_status === 'outofstock' ) {
		return 0;
	}
	const left = product.stock_quantity;
	return typeof left === 'number' && left > 0 && left <= 5 ? left : undefined;
}

function sizeTag( tag ) {
	if ( tag === 'popular' ) {
		return __( 'Most popular', 'mix-and-max-box-builder' );
	}
	return tag === 'best_value'
		? __( 'Best value', 'mix-and-max-box-builder' )
		: undefined;
}

/**
 * The shopper preview: the real storefront components, fed the draft config and
 * the products picked so far.
 *
 * @param {Object} props
 * @param {Object} props.draft    The draft ({ title, config }).
 * @param {Array}  props.products Product records for the picked ids (may be empty).
 */
export default function Preview( { draft, products } ) {
	const formatMoney = useMoney();
	const { money } = useAdmin();
	const decimals = Number.isInteger( money.decimals ) ? money.decimals : 2;
	const convert = ( amount ) => toMinor( amount, decimals );
	const { config } = draft;
	const design = config.design;

	const [ qtys, setQtys ] = useState( {} );
	const [ size, setSize ] = useState( 0 );

	const catalog = useMemo( () => {
		const real = products.filter(
			( p ) => ! ( config.box.hide_sold_out && stockFor( p ) === 0 )
		);
		return real.length ? real : sampleProducts();
	}, [ products, config.box.hide_sold_out ] );
	const tiles = catalog.slice( 0, TILE_COUNT );

	const fixedSizes = config.sizes
		.map( ( row ) => ( { ...row, qty: toNumber( row.qty ) } ) )
		.filter( ( row ) => Number.isFinite( row.qty ) );
	const chosenSize = fixedSizes.some( ( row ) => row.qty === size )
		? size
		: ( fixedSizes[ 0 ] || {} ).qty;

	let capacity = toNumber( config.box.capacity );
	if ( config.type === 'fixed' && chosenSize ) {
		capacity = chosenSize;
	} else if ( config.type === 'bundle' ) {
		capacity = toNumber( config.bundle.qty );
	}
	capacity = Number.isFinite( capacity ) && capacity > 0 ? capacity : 1;

	const rows = tiles.map( ( p ) => ( {
		product_id: p.id,
		qty: qtys[ p.id ] || 0,
		unit_price_minor: p.price,
	} ) );
	const count = rows.reduce( ( total, row ) => total + row.qty, 0 );
	const result = quote(
		{
			...config,
			tiers: config.tiers.map( ( t ) => ( {
				...t,
				qty: toNumber( t.qty ),
				value: toNumber( t.value ) || 0,
			} ) ),
			sizes: fixedSizes.map( ( t ) => ( {
				...t,
				value: toNumber( t.value ) || 0,
			} ) ),
			bundle: {
				qty: capacity,
				price: toNumber( config.bundle.price ) || 0,
			},
			box: {
				...config.box,
				capacity,
				min_items: toNumber( config.box.min_items ) || 1,
			},
		},
		rows,
		{ size: chosenSize, decimals }
	);

	const boxItems = [];
	tiles.forEach( ( p ) => {
		for ( let i = 0; i < ( qtys[ p.id ] || 0 ); i++ ) {
			boxItems.push( {
				id: p.id,
				name: p.name,
				image: p.image || undefined,
				art: p.art,
				price: p.price,
			} );
		}
	} );

	const setQty = ( id, next ) =>
		setQtys( ( current ) => ( { ...current, [ id ]: next } ) );
	const full = count >= capacity;

	const tiers =
		config.type === 'tiered'
			? previewTiers( config.tiers, formatMoney, convert )
			: [];
	const minItems =
		config.type === 'tiered'
			? Math.min( toNumber( config.box.min_items ) || 1, capacity )
			: capacity;
	const subtotal = result.subtotal;
	const total = result.valid ? result.total : result.subtotal;
	const ctaLabel = design.cta_label || undefined;

	const hasEnd = Boolean( config.schedule.end );
	const showCountdown = config.schedule.countdown_days > 0;
	const useBar = design.layout !== 'panel';
	const headline = design.headline || draft.title;

	return (
		<div className="mmbb-preview-accent">
			<div
				className={ `mmbb-root mmbb-preview mmbb-preview--${ design.accent }` }
				data-theme={ design.theme === 'dark' ? 'dark' : undefined }
			>
				<div className="mmbb-preview__hero">
					<div className="mmbb-preview__copy">
						{ design.show_stickers && design.sticker ? (
							<Sticker tone="max" size="sm" tilt icon="flame">
								{ design.sticker }
							</Sticker>
						) : null }
						<p className="mmbb-preview__headline">{ headline }</p>
						{ showCountdown ? (
							<Countdown
								endsAt={
									hasEnd ? config.schedule.end : undefined
								}
								seconds={
									hasEnd
										? undefined
										: config.schedule.countdown_days * 86400
								}
							/>
						) : null }
					</div>
					{ design.show_ladder && tiers.length ? (
						<ol
							className="mmbb-preview__ladder"
							aria-label={ __(
								'Discount tiers',
								'mix-and-max-box-builder'
							) }
						>
							{ tiers.map( ( tier, index ) => (
								<li
									key={ tier.qty }
									className={
										index === tiers.length - 1
											? 'is-top'
											: undefined
									}
									style={ {
										height:
											Math.round(
												( ( index + 1 ) /
													tiers.length ) *
													55
											) +
											45 +
											'%',
									} }
								>
									<b>{ tier.label }</b>
								</li>
							) ) }
						</ol>
					) : null }
				</div>

				{ config.type === 'fixed' && fixedSizes.length ? (
					<BoxSizePicker
						name="mmbb-preview-size"
						sizes={ fixedSizes.map( ( row ) => ( {
							qty: row.qty,
							tag: sizeTag( row.tag ),
							price:
								row.discount_type === 'box_price' &&
								row.value > 0
									? convert( row.value )
									: undefined,
							save:
								row.discount_type === 'box_price'
									? undefined
									: tierLabel( row, formatMoney, convert ),
						} ) ) }
						value={ chosenSize }
						onChange={ ( qty ) => {
							setSize( qty );
							setQtys( {} );
						} }
					/>
				) : null }

				<div className="mmbb-preview__grid">
					{ tiles.map( ( p ) => (
						<ProductTile
							key={ p.id }
							name={ p.name }
							price={ p.price }
							image={ p.image || undefined }
							art={ p.art }
							stock={ stockFor( p ) }
							qty={ qtys[ p.id ] || 0 }
							boxFull={ full }
							onAdd={ () => setQty( p.id, 1 ) }
							onChange={ ( next ) => setQty( p.id, next ) }
						/>
					) ) }
				</div>

				{ useBar ? (
					<BoxSummaryBar
						size={ capacity }
						minItems={ minItems }
						items={ boxItems }
						tiers={ tiers }
						total={ total }
						compareAt={ result.discount > 0 ? subtotal : null }
						ctaLabel={ ctaLabel }
					/>
				) : (
					<BoxPanel
						size={ capacity }
						minItems={ minItems }
						items={ boxItems }
						tiers={ tiers }
						subtotal={ subtotal }
						total={ total }
						ctaLabel={ ctaLabel }
						onRemove={ ( index, item ) =>
							setQty(
								item.id,
								Math.max( 0, qtys[ item.id ] - 1 )
							)
						}
					/>
				) }
			</div>
		</div>
	);
}
