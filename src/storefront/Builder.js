import {
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	BoxPanel,
	BoxSizePicker,
	BoxSummaryBar,
	Checkbox,
	Chips,
	MoneyProvider,
	Notice,
	ProductTile,
	SelectField,
	Steps,
	TextField,
	Toast,
	useMoney,
} from '../components';
import { toMinor } from '../shared/pricing';
import { sizeTag, tierLabel, tierList } from '../shared/tiers';
import { addBoxToCart } from './api';
import Drawer from './Drawer';
import Hero from './Hero';
import { NARROW_BELOW, useContainerWidth } from './hooks';
import {
	capacityFor,
	cartRows,
	countOf,
	createEnv,
	emptyState,
	expand,
	limitFor,
	priceBox,
	reducer,
	restore,
	tierReached,
} from './state';
import { loadBox, saveBox } from './storage';
import { track } from './track';

const TOAST_MS = 2600;

function sortProducts( products, order ) {
	const list = products.slice();
	if ( order === 'price_asc' ) {
		return list.sort( ( a, b ) => a.price - b.price );
	}
	if ( order === 'price_desc' ) {
		return list.sort( ( a, b ) => b.price - a.price );
	}
	if ( order === 'name' ) {
		return list.sort( ( a, b ) => a.name.localeCompare( b.name ) );
	}
	return list;
}

function startState( env, payload, preview ) {
	if ( payload.edit ) {
		return restore( env, {
			items: expand( payload.edit.items ),
			size: payload.edit.size,
			gift: payload.edit.gift,
		} );
	}
	if ( preview ) {
		return emptyState( env );
	}
	return restore( env, loadBox( payload.id ) );
}

function BuilderView( { payload, preview, navigate } ) {
	const formatMoney = useMoney();
	const { config, settings, view } = payload;
	const decimals = Number.isInteger( payload.money.decimals )
		? payload.money.decimals
		: 2;
	const convert = ( amount ) => toMinor( amount, decimals );

	const env = useMemo( () => createEnv( payload ), [ payload ] );
	const [ state, dispatch ] = useReducer(
		( current, action ) => reducer( current, action, env ),
		null,
		() => startState( env, payload, preview )
	);

	const rootRef = useRef( null );
	const width = useContainerWidth( rootRef );
	const narrow = width < NARROW_BELOW;

	const [ category, setCategory ] = useState( 'all' );
	const [ order, setOrder ] = useState( 'default' );
	const [ drawerOpen, setDrawerOpen ] = useState( false );
	const [ busy, setBusy ] = useState( false );
	const [ error, setError ] = useState( '' );
	const [ toast, setToast ] = useState( '' );

	// The server's clock, so a countdown is right on a cached page and a wrong device clock.
	const offset = useMemo(
		() => ( Date.parse( payload.now ) || Date.now() ) - Date.now(),
		[ payload.now ]
	);
	const nowMs = Date.now() + offset;

	const capacity = capacityFor( config, state.size );
	const count = state.items.length;
	const full = capacity > 0 && count >= capacity;
	const result = priceBox( env, state, decimals );

	// Keep the box in progress, so a reload keeps the picks.
	useEffect( () => {
		if ( ! preview && ! busy ) {
			saveBox( payload.id, state );
		}
	}, [ state, preview, busy, payload.id ] );

	useEffect( () => {
		track( 'view', { campaignId: payload.id } );
	}, [ payload.id ] );

	// One toast for each newly unlocked tier. Restoring a box does not count.
	const reached = tierReached( config, count );
	const lastTier = useRef( reached );
	useEffect( () => {
		if ( reached > lastTier.current ) {
			track( 'tier_unlocked', { campaignId: payload.id, qty: reached } );
			const tier = config.tiers.find( ( row ) => row.qty === reached );
			if ( settings.unlockToast && tier && ! preview ) {
				setToast(
					sprintf(
						/* translators: %s: Discount label, for example "15% off". */
						__( 'You unlocked %s', 'mix-and-max-box-builder' ),
						tierLabel( tier, formatMoney, convert )
					)
				);
			}
		}
		lastTier.current = reached;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ reached ] );
	useEffect( () => {
		if ( ! toast ) {
			return undefined;
		}
		const timer = setTimeout( () => setToast( '' ), TOAST_MS );
		return () => clearTimeout( timer );
	}, [ toast ] );

	// A drawer has nothing to show on a wide screen.
	useEffect( () => {
		if ( ! narrow ) {
			setDrawerOpen( false );
		}
	}, [ narrow ] );

	const categories = useMemo( () => {
		const found = new Map();
		Object.values( env.products ).forEach( ( product ) => {
			if ( env.hideSoldOut && product.stock === 0 ) {
				return;
			}
			product.categories.forEach( ( term ) => {
				const entry = found.get( term.id ) || {
					value: term.id,
					label: term.name,
					count: 0,
				};
				entry.count++;
				found.set( term.id, entry );
			} );
		} );
		return Array.from( found.values() );
	}, [ env ] );

	const visible = useMemo( () => {
		const list = ( payload.products || [] ).filter(
			( product ) =>
				! ( env.hideSoldOut && product.stock === 0 ) &&
				( category === 'all' ||
					product.categories.some(
						( term ) => term.id === category
					) )
		);
		return sortProducts( list, order );
	}, [ payload.products, env, category, order ] );

	const tiers =
		config.type === 'tiered'
			? tierList( config.tiers, formatMoney, convert )
			: [];
	const minItems =
		config.type === 'tiered'
			? Math.min( Number( config.box.min_items ) || 1, capacity )
			: capacity;

	const boxItems = state.items.map( ( id ) => {
		const product = env.products[ id ];
		return {
			id,
			name: product.name,
			image: product.image || undefined,
			price: product.price,
		};
	} );

	const subtotal = result.valid
		? result.subtotal + result.fee
		: result.subtotal;
	const total = result.valid ? result.total : result.subtotal;
	const editing = Boolean( payload.edit );
	const ctaLabel =
		settings.ctaLabel ||
		( editing
			? __( 'Update your box', 'mix-and-max-box-builder' )
			: undefined );

	const showPanel = narrow ? view.layout === 'panel' : view.layout !== 'bar';
	const showBar = ! showPanel;
	const columns = Math.max(
		2,
		narrow ? 2 : view.columns - ( showPanel && width < 1100 ? 1 : 0 )
	);

	async function submit() {
		if ( preview || busy || count === 0 ) {
			return;
		}
		setBusy( true );
		setError( '' );
		const outcome = await addBoxToCart( {
			cart: payload.cart,
			campaignId: payload.id,
			rows: cartRows( env, state ),
			size: config.type === 'fixed' ? state.size : 0,
			gift: state.gift,
			editKey: payload.edit ? payload.edit.key : '',
		} );
		if ( outcome.ok ) {
			track( 'box_added', { campaignId: payload.id, items: count } );
			saveBox( payload.id, { ...state, items: [] } );
			navigate( outcome.cartUrl );
			return;
		}
		setError( outcome.message );
		setBusy( false );
		if ( narrow && showBar ) {
			setDrawerOpen( true );
		}
	}

	const gift = (
		<div className="mmbb-builder__gift">
			{ config.extras.gift_wrap.enabled ? (
				<Checkbox
					label={ __( 'Make it a gift', 'mix-and-max-box-builder' ) }
					description={
						config.extras.gift_wrap.fee > 0
							? sprintf(
									/* translators: %s: Gift wrap price with currency. */
									__(
										'Ribbon, card and no prices inside. Adds %s.',
										'mix-and-max-box-builder'
									),
									formatMoney(
										convert( config.extras.gift_wrap.fee )
									)
							  )
							: __(
									'Ribbon, card and no prices inside.',
									'mix-and-max-box-builder'
							  )
					}
					checked={ state.gift.enabled }
					onChange={ ( enabled ) =>
						dispatch( { type: 'gift', gift: { enabled } } )
					}
				/>
			) : null }
			{ config.extras.gift_message ? (
				<TextField
					label={ __( 'Gift message', 'mix-and-max-box-builder' ) }
					multiline
					rows={ 2 }
					maxLength={ 200 }
					placeholder={ __(
						'Write a short note (optional)',
						'mix-and-max-box-builder'
					) }
					value={ state.gift.message }
					onChange={ ( event ) =>
						dispatch( {
							type: 'gift',
							gift: { message: event.target.value },
						} )
					}
				/>
			) : null }
			{ error ? (
				<div role="alert">
					<Notice tone="critical">{ error }</Notice>
				</div>
			) : null }
		</div>
	);

	const panel = (
		<BoxPanel
			size={ capacity }
			minItems={ minItems }
			items={ boxItems }
			tiers={ tiers }
			subtotal={ subtotal }
			total={ total }
			ctaLabel={ ctaLabel }
			ctaDisabled={ preview }
			ctaLoading={ busy }
			onCheckout={ submit }
			onRemove={ ( index ) => dispatch( { type: 'removeAt', index } ) }
			footnote={
				preview
					? __(
							'Add to cart is turned off in the editor.',
							'mix-and-max-box-builder'
					  )
					: undefined
			}
		>
			{ gift }
		</BoxPanel>
	);

	const sizes = config.type === 'fixed' ? config.sizes : [];
	const step = full ? 2 : 1;

	return (
		<div
			ref={ rootRef }
			className={ `mmbb-builder__inner ${
				narrow ? 'is-narrow' : 'is-wide'
			}` }
			style={ { '--mmbb-columns': columns } }
		>
			{ view.showHero ? (
				<Hero
					payload={ payload }
					nowMs={ nowMs }
					decimals={ decimals }
				/>
			) : null }

			{ editing ? (
				<Notice tone="info">
					{ __(
						'You’re editing the box from your cart. Update it when you’re done.',
						'mix-and-max-box-builder'
					) }
				</Notice>
			) : null }

			{ narrow && sizes.length ? (
				<Steps
					compact
					current={ step }
					steps={ [
						__( 'Pick a size', 'mix-and-max-box-builder' ),
						__( 'Fill your box', 'mix-and-max-box-builder' ),
						__( 'Checkout', 'mix-and-max-box-builder' ),
					] }
				/>
			) : null }

			<div
				className={ `mmbb-builder__layout${
					showPanel && ! narrow ? ' has-panel' : ''
				}` }
			>
				<div className="mmbb-builder__main">
					{ sizes.length ? (
						<div className="mmbb-builder__section">
							<p className="mmbb-builder__step">
								{ __( 'Step 1', 'mix-and-max-box-builder' ) }
							</p>
							<h3 className="mmbb-builder__subhead">
								{ __(
									'Pick a box size',
									'mix-and-max-box-builder'
								) }
							</h3>
							<BoxSizePicker
								name={ `mmbb-size-${ payload.id }` }
								layout={ narrow ? 'pills' : 'cards' }
								value={ state.size }
								onChange={ ( size ) =>
									dispatch( { type: 'setSize', size } )
								}
								sizes={ sizes.map( ( row ) => ( {
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
											: tierLabel(
													row,
													formatMoney,
													convert
											  ),
								} ) ) }
							/>
							<p className="mmbb-builder__step">
								{ __( 'Step 2', 'mix-and-max-box-builder' ) }
							</p>
							<h3 className="mmbb-builder__subhead">
								{ __(
									'Fill your box',
									'mix-and-max-box-builder'
								) }
							</h3>
						</div>
					) : null }

					<div className="mmbb-builder__filters">
						{ categories.length > 1 ? (
							<Chips
								label={ __(
									'Category',
									'mix-and-max-box-builder'
								) }
								value={ category }
								onChange={ setCategory }
								options={ [
									{
										value: 'all',
										label: __(
											'All',
											'mix-and-max-box-builder'
										),
										count: Object.keys( env.products )
											.length,
									},
									...categories,
								] }
							/>
						) : (
							<span />
						) }
						{ visible.length > 1 ? (
							<SelectField
								className="mmbb-builder__sort"
								aria-label={ __(
									'Sort products',
									'mix-and-max-box-builder'
								) }
								value={ order }
								onChange={ ( event ) =>
									setOrder( event.target.value )
								}
								options={ [
									{
										value: 'default',
										label: __(
											'Featured',
											'mix-and-max-box-builder'
										),
									},
									{
										value: 'price_asc',
										label: __(
											'Price: low to high',
											'mix-and-max-box-builder'
										),
									},
									{
										value: 'price_desc',
										label: __(
											'Price: high to low',
											'mix-and-max-box-builder'
										),
									},
									{
										value: 'name',
										label: __(
											'Name',
											'mix-and-max-box-builder'
										),
									},
								] }
							/>
						) : null }
					</div>

					{ visible.length ? (
						<div className="mmbb-builder__grid">
							{ visible.map( ( product ) => {
								const qty = countOf( state.items, product.id );
								const atLimit =
									qty >= limitFor( env, product.id );
								return (
									<ProductTile
										key={ product.id }
										name={ product.name }
										meta={ product.meta || undefined }
										price={ product.price }
										compareAt={
											product.compare_at || undefined
										}
										image={ product.image || undefined }
										badge={ product.badge || undefined }
										stock={
											product.stock === null
												? undefined
												: product.stock
										}
										qty={ qty }
										boxFull={ full || atLimit }
										onAdd={ () => {
											dispatch( {
												type: 'add',
												id: product.id,
											} );
											track( 'item_added', {
												campaignId: payload.id,
												productId: product.id,
											} );
										} }
										onChange={ ( next ) =>
											dispatch( {
												type: 'setQty',
												id: product.id,
												qty: next,
											} )
										}
									/>
								);
							} ) }
						</div>
					) : (
						<p className="mmbb-builder__empty">
							{ __(
								'No products to show right now.',
								'mix-and-max-box-builder'
							) }
						</p>
					) }
				</div>

				{ showPanel ? (
					<div className="mmbb-builder__aside">{ panel }</div>
				) : null }
			</div>

			{ showBar ? (
				<div className="mmbb-builder__bar">
					{ error && ! drawerOpen ? (
						<div role="alert">
							<Notice tone="critical">{ error }</Notice>
						</div>
					) : null }
					<BoxSummaryBar
						size={ capacity }
						minItems={ minItems }
						items={ boxItems }
						tiers={ tiers }
						total={ total }
						compareAt={ result.discount > 0 ? subtotal : null }
						ctaLabel={ ctaLabel }
						ctaDisabled={ preview }
						ctaLoading={ busy }
						onOpen={ () => setDrawerOpen( true ) }
						onCheckout={ submit }
					/>
				</div>
			) : null }

			{ drawerOpen && showBar ? (
				<Drawer
					label={ payload.title }
					onClose={ () => setDrawerOpen( false ) }
				>
					{ panel }
				</Drawer>
			) : null }

			{ toast ? (
				<div className="mmbb-builder__toast">
					<Toast icon="sparkle">{ toast }</Toast>
				</div>
			) : null }
		</div>
	);
}

/**
 * The storefront builder.
 *
 * @param {Object}   props
 * @param {Object}   props.payload  Storefront payload from the page, or from `/campaigns/{id}/preview`.
 * @param {boolean}  props.preview  True in the block editor: add to cart is off and nothing is stored.
 * @param {Function} props.navigate Called with the cart URL after a box is added.
 */
export default function Builder( {
	payload,
	preview = false,
	navigate = ( url ) => window.location.assign( url ),
} ) {
	return (
		<MoneyProvider settings={ payload.money }>
			<BuilderView
				payload={ payload }
				preview={ preview }
				navigate={ navigate }
			/>
		</MoneyProvider>
	);
}
