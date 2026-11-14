import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Button,
	CheckboxControl,
	Icon,
	Notice,
	Panel,
	PanelBody,
	SearchControl,
	SelectControl,
} from '@wordpress/components';
import { arrowDown, arrowUp, close, dragHandle } from '@wordpress/icons';
import { useMoney } from '../../components';
import Media from '../../components/Media';
import { getProducts, getTerms } from '../api';
import { useDebouncedValue, useRequest, errorMessage } from '../hooks';
import { moveItem, toNumber } from './state';
import {
	HStack,
	Item,
	ItemGroup,
	Text,
	ToggleGroupControl,
	ToggleGroupControlOption,
	VStack,
} from '../components/wp';
import { NumberField } from './fields';

const PER_PAGE = 20;
const TERM_LIMIT = 100;
const TAXONOMY = { category: 'product_cat', tag: 'product_tag' };

function stockNote( product ) {
	if ( product.stock_status === 'outofstock' ) {
		return __( 'Out of stock', 'productboxes-mix-and-match-box-builder' );
	}
	const left = product.stock_quantity;
	if ( typeof left === 'number' && left > 0 && left <= 5 ) {
		return sprintf(
			/* translators: %d: Number of units in stock. */
			__( 'Only %d left', 'productboxes-mix-and-match-box-builder' ),
			left
		);
	}
	return '';
}

function pickLabel( on, name ) {
	if ( on ) {
		return sprintf(
			/* translators: %s: Product name. */
			__( 'Remove %s', 'productboxes-mix-and-match-box-builder' ),
			name
		);
	}
	return sprintf(
		/* translators: %s: Product name. */
		__( 'Add %s', 'productboxes-mix-and-match-box-builder' ),
		name
	);
}

function Thumb( { product } ) {
	return (
		<span className="mmbb-editor__thumb">
			<Media image={ product.image } art="cookie" name="" />
		</span>
	);
}

function ProductPicker( { draft, errors, dispatch, remember, byId } ) {
	const formatMoney = useMoney();
	const ids = draft.config.products.ids;
	const [ view, setView ] = useState( 'all' );
	const [ search, setSearch ] = useState( '' );
	const [ category, setCategory ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ rows, setRows ] = useState( [] );
	const query = useDebouncedValue( search.trim(), 300 );

	const terms = useRequest(
		() => getTerms( { taxonomy: 'product_cat', per_page: TERM_LIMIT } ),
		[]
	);
	const request = useRequest(
		() =>
			getProducts( {
				search: query,
				category: category || undefined,
				page,
				per_page: PER_PAGE,
			} ),
		[ query, category, page ]
	);

	// A new search or category starts the list again.
	useEffect( () => {
		setPage( 1 );
		setRows( [] );
	}, [ query, category ] );

	useEffect( () => {
		if ( ! request.data ) {
			return;
		}
		remember( request.data );
		setRows( ( current ) => {
			const seen = new Set(
				page === 1 ? [] : current.map( ( p ) => p.id )
			);
			const fresh = request.data.filter( ( p ) => ! seen.has( p.id ) );
			return page === 1 ? fresh : [ ...current, ...fresh ];
		} );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ request.data ] );

	const toggle = ( id ) =>
		dispatch( {
			type: 'set',
			path: 'products.ids',
			value: ids.includes( id )
				? ids.filter( ( x ) => x !== id )
				: [ ...ids, id ],
		} );

	const options = [
		{
			value: 0,
			label: __( 'All', 'productboxes-mix-and-match-box-builder' ),
		},
		...( terms.data || [] )
			.filter( ( term ) => term.count > 0 )
			.map( ( term ) => ( { value: term.id, label: term.name } ) ),
	];
	const hasMore = request.data && request.data.length === PER_PAGE;

	return (
		<Panel>
			<PanelBody
				title={ __(
					'Add products',
					'productboxes-mix-and-match-box-builder'
				) }
				initialOpen
			>
				<VStack spacing={ 4 }>
					<Text variant="muted">
						{ __(
							'Tick what shoppers can put in this box, then set the order under Picked.',
							'productboxes-mix-and-match-box-builder'
						) }
					</Text>
					<ToggleGroupControl
						label={ __(
							'Products view',
							'productboxes-mix-and-match-box-builder'
						) }
						hideLabelFromVision
						isBlock
						value={ view }
						onChange={ setView }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption
							value="all"
							label={ __(
								'All products',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
						<ToggleGroupControlOption
							value="picked"
							label={ sprintf(
								/* translators: %d: Number of products picked. */
								__(
									'Picked (%d)',
									'productboxes-mix-and-match-box-builder'
								),
								ids.length
							) }
						/>
					</ToggleGroupControl>
					{ errors[ 'products.ids' ] ? (
						<Notice status="error" isDismissible={ false }>
							{ errors[ 'products.ids' ] }
						</Notice>
					) : null }
					{ view === 'picked' ? (
						<ChosenList
							draft={ draft }
							dispatch={ dispatch }
							byId={ byId }
						/>
					) : null }
					{ view === 'all' ? (
						<SearchControl
							label={ __(
								'Search products',
								'productboxes-mix-and-match-box-builder'
							) }
							placeholder={ __(
								'Search products by name or SKU',
								'productboxes-mix-and-match-box-builder'
							) }
							value={ search }
							onChange={ setSearch }
							__nextHasNoMarginBottom
						/>
					) : null }
					{ view === 'all' && options.length > 1 ? (
						<SelectControl
							label={ __(
								'Category',
								'productboxes-mix-and-match-box-builder'
							) }
							options={ options }
							value={ category }
							onChange={ ( value ) =>
								setCategory( Number( value ) )
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) : null }
					{ view === 'all' && request.error && rows.length === 0 ? (
						<Notice
							status="error"
							isDismissible={ false }
							actions={ [
								{
									label: __(
										'Try again',
										'productboxes-mix-and-match-box-builder'
									),
									onClick: request.reload,
								},
							] }
						>
							{ errorMessage(
								request.error,
								__(
									'The products could not be loaded.',
									'productboxes-mix-and-match-box-builder'
								)
							) }
						</Notice>
					) : null }
					{ view === 'all' &&
					! ( request.error && rows.length === 0 ) ? (
						<ItemGroup
							isBordered
							isSeparated
							aria-busy={ request.loading }
						>
							{ rows.map( ( product ) => {
								const on = ids.includes( product.id );
								const out =
									product.stock_status === 'outofstock';
								const note = stockNote( product );
								return (
									<Item key={ product.id }>
										<HStack
											spacing={ 3 }
											justify="flex-start"
											alignment="center"
											className="mmbb-editor__row"
										>
											<CheckboxControl
												label=""
												aria-label={ pickLabel(
													on,
													product.name
												) }
												checked={ on }
												disabled={ out && ! on }
												onChange={ () =>
													toggle( product.id )
												}
												__nextHasNoMarginBottom
											/>
											<Thumb product={ product } />
											<VStack
												spacing={ 0 }
												className="mmbb-editor__grow"
											>
												<Text weight={ 600 }>
													{ product.name }
												</Text>
												<Text variant="muted">
													{ [ product.sku, note ]
														.filter( Boolean )
														.join( ' · ' ) }
												</Text>
											</VStack>
											<Text>
												{ formatMoney( product.price ) }
											</Text>
										</HStack>
									</Item>
								);
							} ) }
						</ItemGroup>
					) : null }
					{ view === 'all' ? (
						<HStack spacing={ 3 }>
							<Text variant="muted">
								{ request.loading && rows.length === 0
									? __(
											'Loading products…',
											'productboxes-mix-and-match-box-builder'
									  )
									: sprintf(
											/* translators: %d: Number of products listed. */
											_n(
												'%d product shown',
												'%d products shown',
												rows.length,
												'productboxes-mix-and-match-box-builder'
											),
											rows.length
									  ) }
							</Text>
							{ hasMore ? (
								<Button
									variant="secondary"
									isBusy={ request.loading }
									onClick={ () => setPage( page + 1 ) }
								>
									{ __(
										'Show more',
										'productboxes-mix-and-match-box-builder'
									) }
								</Button>
							) : null }
						</HStack>
					) : null }
				</VStack>
			</PanelBody>
		</Panel>
	);
}

function TermPicker( { draft, errors, dispatch, source } ) {
	const selected = draft.config.products.term_ids;
	const [ search, setSearch ] = useState( '' );
	const query = useDebouncedValue( search.trim(), 300 );
	const request = useRequest(
		() =>
			getTerms( {
				taxonomy: TAXONOMY[ source ],
				search: query,
				per_page: TERM_LIMIT,
			} ),
		[ source, query ]
	);
	const terms = request.data || [];
	const toggle = ( id ) =>
		dispatch( {
			type: 'set',
			path: 'products.term_ids',
			value: selected.includes( id )
				? selected.filter( ( x ) => x !== id )
				: [ ...selected, id ],
		} );
	const isCategory = source === 'category';

	return (
		<Panel>
			<PanelBody
				title={
					isCategory
						? __(
								'Choose categories',
								'productboxes-mix-and-match-box-builder'
						  )
						: __(
								'Choose tags',
								'productboxes-mix-and-match-box-builder'
						  )
				}
				initialOpen
			>
				<VStack spacing={ 4 }>
					<Text variant="muted">
						{ __(
							'Every simple product in them can go in the box. Variable products are left out.',
							'productboxes-mix-and-match-box-builder'
						) }
					</Text>
					<SearchControl
						label={
							isCategory
								? __(
										'Search categories',
										'productboxes-mix-and-match-box-builder'
								  )
								: __(
										'Search tags',
										'productboxes-mix-and-match-box-builder'
								  )
						}
						value={ search }
						onChange={ setSearch }
						__nextHasNoMarginBottom
					/>
					{ errors[ 'products.term_ids' ] ? (
						<Notice status="error" isDismissible={ false }>
							{ errors[ 'products.term_ids' ] }
						</Notice>
					) : null }
					<ItemGroup
						isBordered
						isSeparated
						aria-busy={ request.loading }
					>
						{ terms.map( ( term ) => (
							<Item key={ term.id }>
								<HStack spacing={ 3 }>
									<CheckboxControl
										label={ term.name }
										checked={ selected.includes( term.id ) }
										onChange={ () => toggle( term.id ) }
										__nextHasNoMarginBottom
									/>
									<Text variant="muted">
										{ sprintf(
											/* translators: %d: Number of products. */
											_n(
												'%d product',
												'%d products',
												term.count,
												'productboxes-mix-and-match-box-builder'
											),
											term.count
										) }
									</Text>
								</HStack>
							</Item>
						) ) }
						{ ! request.loading && terms.length === 0 ? (
							<Item>
								<Text variant="muted">
									{ __(
										'Nothing matches.',
										'productboxes-mix-and-match-box-builder'
									) }
								</Text>
							</Item>
						) : null }
					</ItemGroup>
				</VStack>
			</PanelBody>
		</Panel>
	);
}

function ChosenList( { draft, dispatch, byId } ) {
	const { ids, caps } = draft.config.products;
	const { max_per_product: perProduct, capacity } = draft.config.box;
	const [ dragging, setDragging ] = useState( -1 );
	const move = ( from, to ) =>
		dispatch( {
			type: 'set',
			path: 'products.ids',
			value: moveItem( ids, from, to ),
		} );

	if ( ids.length === 0 ) {
		return (
			<Text variant="muted">
				{ __(
					'Nothing picked yet. Tick products under All products.',
					'productboxes-mix-and-match-box-builder'
				) }
			</Text>
		);
	}

	return (
		<VStack spacing={ 3 }>
			<Text variant="muted">
				{ __(
					'Drag to set the order shoppers see, or use the arrows. Set a cap per product.',
					'productboxes-mix-and-match-box-builder'
				) }
			</Text>
			<ItemGroup isBordered isSeparated>
				{ ids.map( ( id, index ) => {
					const product = byId[ id ];
					const name = product
						? product.name
						: sprintf(
								/* translators: %d: Product ID. */
								__(
									'Product #%d',
									'productboxes-mix-and-match-box-builder'
								),
								id
						  );
					const cap = caps[ id ] || toNumber( perProduct ) || 1;
					return (
						<Item
							key={ id }
							draggable
							onDragStart={ ( event ) => {
								setDragging( index );
								event.dataTransfer.effectAllowed = 'move';
							} }
							onDragOver={ ( event ) => event.preventDefault() }
							onDrop={ ( event ) => {
								event.preventDefault();
								move( dragging, index );
								setDragging( -1 );
							} }
							onDragEnd={ () => setDragging( -1 ) }
						>
							<VStack spacing={ 3 }>
								<HStack
									spacing={ 2 }
									justify="flex-start"
									alignment="center"
									className="mmbb-editor__row"
								>
									<Icon icon={ dragHandle } />
									<Thumb product={ product || {} } />
									<Text
										weight={ 600 }
										className="mmbb-editor__grow"
									>
										{ name }
									</Text>
									<Button
										icon={ arrowUp }
										size="compact"
										disabled={ index === 0 }
										label={ sprintf(
											/* translators: %s: Product name. */
											__(
												'Move %s up',
												'productboxes-mix-and-match-box-builder'
											),
											name
										) }
										onClick={ () =>
											move( index, index - 1 )
										}
									/>
									<Button
										icon={ arrowDown }
										size="compact"
										disabled={ index === ids.length - 1 }
										label={ sprintf(
											/* translators: %s: Product name. */
											__(
												'Move %s down',
												'productboxes-mix-and-match-box-builder'
											),
											name
										) }
										onClick={ () =>
											move( index, index + 1 )
										}
									/>
									<Button
										icon={ close }
										size="compact"
										label={ sprintf(
											/* translators: %s: Product name. */
											__(
												'Remove %s',
												'productboxes-mix-and-match-box-builder'
											),
											name
										) }
										onClick={ () =>
											dispatch( {
												type: 'set',
												path: 'products.ids',
												value: ids.filter(
													( x ) => x !== id
												),
											} )
										}
									/>
								</HStack>
								<NumberField
									label={ __(
										'Max per box',
										'productboxes-mix-and-match-box-builder'
									) }
									help={ sprintf(
										/* translators: %s: Product name. */
										__(
											'Most %s a shopper can add to one box.',
											'productboxes-mix-and-match-box-builder'
										),
										name
									) }
									min={ 1 }
									max={ toNumber( capacity ) || 1 }
									value={ cap }
									onChange={ ( value ) =>
										dispatch( {
											type: 'set',
											path: 'products.caps.' + id,
											value,
										} )
									}
								/>
							</VStack>
						</Item>
					);
				} ) }
			</ItemGroup>
		</VStack>
	);
}

export default function ProductsStep( { draft, errors, dispatch, catalog } ) {
	const { products } = draft.config;
	const source = products.source;

	const pickSource = ( value ) => {
		if ( value === source ) {
			return;
		}
		// Category and tag ids are different lists, so switching starts them over.
		dispatch( {
			type: 'set',
			path: 'products',
			value: { ...products, source: value, term_ids: [] },
		} );
	};

	return (
		<VStack spacing={ 4 } className="mmbb-editor__pane">
			<ToggleGroupControl
				label={ __(
					'Choose products by',
					'productboxes-mix-and-match-box-builder'
				) }
				isBlock
				value={ source }
				onChange={ pickSource }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			>
				<ToggleGroupControlOption
					value="manual"
					label={ __(
						'Pick',
						'productboxes-mix-and-match-box-builder'
					) }
				/>
				<ToggleGroupControlOption
					value="category"
					label={ __(
						'Category',
						'productboxes-mix-and-match-box-builder'
					) }
				/>
				<ToggleGroupControlOption
					value="tag"
					label={ __(
						'Tag',
						'productboxes-mix-and-match-box-builder'
					) }
				/>
			</ToggleGroupControl>
			{ source === 'manual' ? (
				<ProductPicker
					draft={ draft }
					errors={ errors }
					dispatch={ dispatch }
					remember={ catalog.remember }
					byId={ catalog.byId }
				/>
			) : (
				<TermPicker
					draft={ draft }
					errors={ errors }
					dispatch={ dispatch }
					source={ source }
				/>
			) }
			{ source !== 'manual' ? (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'Products follow your store. New products added to these terms appear in the box on their own.',
						'productboxes-mix-and-match-box-builder'
					) }
				</Notice>
			) : null }
			{ source === 'manual' && products.ids.length ? (
				<div>
					<Button
						variant="tertiary"
						isDestructive
						onClick={ () =>
							dispatch( {
								type: 'set',
								path: 'products.ids',
								value: [],
							} )
						}
					>
						{ __(
							'Clear all',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				</div>
			) : null }
		</VStack>
	);
}
