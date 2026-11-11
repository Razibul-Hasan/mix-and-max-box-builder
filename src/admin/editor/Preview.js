import { useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	BoxPanel,
	BoxSizePicker,
	BoxSummaryBar,
	Checkbox,
	Countdown,
	ProductTile,
	Sticker,
	TextField,
	useMoney,
} from '../../components';
import { resolveColors } from '../../shared/colors';
import { quote, toMinor } from '../../shared/pricing';
import { sizeTag } from '../../shared/tiers';
import FreeGift from '../../storefront/FreeGift';
import { getProducts } from '../api';
import { useAdmin } from '../context';
import { useRequest } from '../hooks';
import { previewTiers, tierLabel } from './fields';
import { toNumber } from './state';

const ART = [ 'cookie', 'macaron', 'tea', 'candle', 'chocolate', 'honey' ];
const TILE_COUNT = 6;

// Stand-ins until the merchant has picked products, so the preview is never empty.
function sampleProducts() {
	return ART.slice( 0, TILE_COUNT ).map( ( art, index ) => ( {
		id: -( index + 1 ),
		name: sprintf(
			/* translators: %d: Number of the sample product. */
			__( 'Sample product %d', 'productboxes-mix-and-match-box-builder' ),
			index + 1
		),
		price: 450 + index * 100,
		art,
	} ) );
}

// Matches the storefront hero: the top step and the one below it stand out.
function ladderTone( index, length ) {
	if ( index === length - 1 ) {
		return 'is-top';
	}
	return index === length - 2 ? 'is-near' : undefined;
}

function stockFor( product ) {
	if ( product.stock_status === 'outofstock' ) {
		return 0;
	}
	const left = product.stock_quantity;
	return typeof left === 'number' && left > 0 && left <= 5 ? left : undefined;
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
	const { money, themeAccent } = useAdmin();
	const decimals = Number.isInteger( money.decimals ) ? money.decimals : 2;
	const convert = ( amount ) => toMinor( amount, decimals );
	const { config } = draft;
	const design = config.design;
	const colors = resolveColors( design, themeAccent );

	const [ qtys, setQtys ] = useState( {} );
	const [ size, setSize ] = useState( 0 );
	const [ wrapped, setWrapped ] = useState( false );
	const [ message, setMessage ] = useState( '' );

	const { extras } = config;
	const giftId = extras.free_gift.enabled
		? toNumber( extras.free_gift.product_id )
		: 0;
	const giftProduct = useRequest(
		() =>
			giftId > 0
				? getProducts( { include: [ giftId ], per_page: 1 } )
				: Promise.resolve( [] ),
		[ giftId ]
	);
	const giftName = ( ( giftProduct.data || [] )[ 0 ] || {} ).name;

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
		{
			size: chosenSize,
			gift_wrap: extras.gift_wrap.enabled && wrapped,
			decimals,
		}
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
	const subtotal = result.valid
		? result.subtotal + result.fee
		: result.subtotal;
	const total = result.valid ? result.total : result.subtotal;
	const ctaLabel = design.cta_label || undefined;

	const countTo = config.schedule.end || config.schedule.countdown_end;
	const showCountdown = config.schedule.countdown_days > 0 && countTo;
	const useBar = design.layout !== 'panel';
	const headline = design.headline || draft.title;

	const wrapFee = toNumber( extras.gift_wrap.fee ) || 0;
	const giftMin = toNumber( extras.free_gift.min_items ) || 1;
	const hasExtras =
		( giftId > 0 && giftName ) ||
		extras.gift_wrap.enabled ||
		extras.gift_message;
	// The same gift options the storefront shows under the box summary.
	const giftOptions = hasExtras ? (
		<div className="mmbb-preview__extras">
			{ giftId > 0 && giftName ? (
				<FreeGift
					gift={ { name: giftName, minItems: giftMin } }
					count={ count }
					capacity={ capacity }
				/>
			) : null }
			{ extras.gift_wrap.enabled ? (
				<Checkbox
					label={ __(
						'Make it a gift',
						'productboxes-mix-and-match-box-builder'
					) }
					description={
						wrapFee > 0
							? sprintf(
									/* translators: %s: Gift wrap price with currency. */
									__(
										'Ribbon, card and no prices inside. Adds %s.',
										'productboxes-mix-and-match-box-builder'
									),
									formatMoney( convert( wrapFee ) )
							  )
							: __(
									'Ribbon, card and no prices inside.',
									'productboxes-mix-and-match-box-builder'
							  )
					}
					checked={ wrapped }
					onChange={ setWrapped }
				/>
			) : null }
			{ extras.gift_message ? (
				<TextField
					label={ __(
						'Gift message',
						'productboxes-mix-and-match-box-builder'
					) }
					multiline
					rows={ 2 }
					maxLength={ 200 }
					placeholder={ __(
						'Write a short note (optional)',
						'productboxes-mix-and-match-box-builder'
					) }
					value={ message }
					onChange={ ( event ) => setMessage( event.target.value ) }
				/>
			) : null }
		</div>
	) : null;

	return (
		<div
			className="mmbb-root mmbb-preview"
			data-theme={ colors.dark ? 'dark' : undefined }
			style={ colors.vars }
		>
			<div className="mmbb-preview__hero">
				<div className="mmbb-preview__copy">
					{ design.show_stickers && design.sticker ? (
						<Sticker tone="max" size="sm" tilt icon="flame">
							{ design.sticker }
						</Sticker>
					) : null }
					<p className="mmbb-preview__headline">{ headline }</p>
					{ design.intro ? (
						<p className="mmbb-preview__intro">{ design.intro }</p>
					) : null }
					{ showCountdown ? <Countdown endsAt={ countTo } /> : null }
				</div>
				{ design.show_ladder && tiers.length ? (
					<ol
						className="mmbb-preview__ladder"
						aria-label={ __(
							'Discount tiers',
							'productboxes-mix-and-match-box-builder'
						) }
					>
						{ tiers.map( ( tier, index ) => (
							<li
								key={ tier.qty }
								className={ ladderTone( index, tiers.length ) }
								style={ {
									height:
										Math.round(
											( ( index + 1 ) / tiers.length ) *
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
							row.discount_type === 'box_price' && row.value > 0
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
				<>
					<BoxSummaryBar
						size={ capacity }
						minItems={ minItems }
						items={ boxItems }
						tiers={ tiers }
						total={ total }
						compareAt={ result.discount > 0 ? subtotal : null }
						ctaLabel={ ctaLabel }
					/>
					{ giftOptions }
				</>
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
						setQty( item.id, Math.max( 0, qtys[ item.id ] - 1 ) )
					}
				>
					{ giftOptions }
				</BoxPanel>
			) }
		</div>
	);
}
