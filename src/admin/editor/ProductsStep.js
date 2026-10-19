import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Badge,
	Button,
	Card,
	Checkbox,
	Chips,
	Icon,
	Notice,
	QuantityStepper,
	SegmentedControl,
	TextField,
	useMoney,
} from '../../components';
import Media from '../../components/Media';
import { getProducts, getTerms } from '../api';
import { useDebouncedValue, useRequest, errorMessage } from '../hooks';
import { moveItem, toNumber } from './state';

const PER_PAGE = 20;
const TERM_LIMIT = 100;

const TAXONOMY = { category: 'product_cat', tag: 'product_tag' };

function stockBadge( product ) {
	if ( product.stock_status === 'outofstock' ) {
		return (
			<Badge tone="critical" dot>
				{ __( 'Out of stock', 'mix-and-max-box-builder' ) }
			</Badge>
		);
	}
	const left = product.stock_quantity;
	if ( typeof left === 'number' && left > 0 && left <= 5 ) {
		return (
			<Badge tone="warning" dot>
				{ sprintf(
					/* translators: %d: Units in stock. */
					__( 'Only %d left', 'mix-and-max-box-builder' ),
					left
				) }
			</Badge>
		);
	}
	return null;
}

function pickLabel( on, name ) {
	if ( on ) {
		return sprintf(
			/* translators: %s: Product name. */
			__( 'Remove %s', 'mix-and-max-box-builder' ),
			name
		);
	}
	return sprintf(
		/* translators: %s: Product name. */
		__( 'Add %s', 'mix-and-max-box-builder' ),
		name
	);
}

function Thumb( { product, size } ) {
	return (
		<span
			className="mmbb-editor__thumb"
			style={ { width: size, height: size } }
		>
			<Media image={ product.image } art="cookie" name="" />
		</span>
	);
}

function ProductPicker( { draft, errors, dispatch, remember } ) {
	const formatMoney = useMoney();
	const ids = draft.config.products.ids;
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
		{ value: 0, label: __( 'All', 'mix-and-max-box-builder' ) },
		...( terms.data || [] )
			.filter( ( term ) => term.count > 0 )
			.map( ( term ) => ( {
				value: term.id,
				label: term.name,
				count: term.count,
			} ) ),
	];
	const hasMore = request.data && request.data.length === PER_PAGE;

	return (
		<Card
			title={ __( 'Add products', 'mix-and-max-box-builder' ) }
			subtitle={ __(
				'Tick what shoppers can put in this box.',
				'mix-and-max-box-builder'
			) }
			padding="none"
		>
			<div className="mmbb-editor__picker-head">
				<TextField
					aria-label={ __(
						'Search products',
						'mix-and-max-box-builder'
					) }
					prefix="search"
					placeholder={ __(
						'Search products by name or SKU',
						'mix-and-max-box-builder'
					) }
					value={ search }
					onChange={ ( event ) => setSearch( event.target.value ) }
				/>
				{ options.length > 1 ? (
					<Chips
						label={ __( 'Category', 'mix-and-max-box-builder' ) }
						options={ options }
						value={ category }
						onChange={ setCategory }
					/>
				) : null }
				{ errors[ 'products.ids' ] ? (
					<Notice tone="critical">
						{ errors[ 'products.ids' ] }
					</Notice>
				) : null }
			</div>
			{ request.error && rows.length === 0 ? (
				<div className="mmbb-editor__pad">
					<Notice
						tone="critical"
						action={
							<Button size="sm" onClick={ request.reload }>
								{ __( 'Try again', 'mix-and-max-box-builder' ) }
							</Button>
						}
					>
						{ errorMessage(
							request.error,
							__(
								'The products could not be loaded.',
								'mix-and-max-box-builder'
							)
						) }
					</Notice>
				</div>
			) : (
				<ul className="mmbb-editor__list" aria-busy={ request.loading }>
					{ rows.map( ( product ) => {
						const on = ids.includes( product.id );
						const out = product.stock_status === 'outofstock';
						return (
							<li
								key={ product.id }
								className={ on ? 'is-on' : undefined }
							>
								<Checkbox
									aria-label={ pickLabel( on, product.name ) }
									checked={ on }
									disabled={ out && ! on }
									onChange={ () => toggle( product.id ) }
								/>
								<Thumb product={ product } size={ 44 } />
								<span className="mmbb-editor__grow">
									<span className="mmbb-cell-title">
										{ product.name }
									</span>
									<span className="mmbb-cell-meta">
										{ product.sku || '' }
									</span>
								</span>
								{ stockBadge( product ) }
								<span className="mmbb-editor__price">
									{ formatMoney( product.price ) }
								</span>
							</li>
						);
					} ) }
				</ul>
			) }
			<div className="mmbb-editor__list-foot">
				<span>
					{ request.loading && rows.length === 0
						? __( 'Loading products…', 'mix-and-max-box-builder' )
						: sprintf(
								/* translators: %d: Number of products listed. */
								_n(
									'%d product shown',
									'%d products shown',
									rows.length,
									'mix-and-max-box-builder'
								),
								rows.length
						  ) }
				</span>
				{ hasMore ? (
					<Button
						size="sm"
						loading={ request.loading }
						onClick={ () => setPage( page + 1 ) }
					>
						{ __( 'Show more', 'mix-and-max-box-builder' ) }
					</Button>
				) : null }
			</div>
		</Card>
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
		<Card
			title={
				isCategory
					? __( 'Choose categories', 'mix-and-max-box-builder' )
					: __( 'Choose tags', 'mix-and-max-box-builder' )
			}
			subtitle={ __(
				'Every simple product in them can go in the box. Variable products are left out.',
				'mix-and-max-box-builder'
			) }
			padding="none"
		>
			<div className="mmbb-editor__picker-head">
				<TextField
					aria-label={
						isCategory
							? __(
									'Search categories',
									'mix-and-max-box-builder'
							  )
							: __( 'Search tags', 'mix-and-max-box-builder' )
					}
					prefix="search"
					value={ search }
					onChange={ ( event ) => setSearch( event.target.value ) }
				/>
				{ errors[ 'products.term_ids' ] ? (
					<Notice tone="critical">
						{ errors[ 'products.term_ids' ] }
					</Notice>
				) : null }
			</div>
			<ul className="mmbb-editor__list" aria-busy={ request.loading }>
				{ terms.map( ( term ) => (
					<li
						key={ term.id }
						className={
							selected.includes( term.id ) ? 'is-on' : undefined
						}
					>
						<Checkbox
							aria-label={ term.name }
							checked={ selected.includes( term.id ) }
							onChange={ () => toggle( term.id ) }
						/>
						<span className="mmbb-editor__grow">
							<span className="mmbb-cell-title">
								{ term.name }
							</span>
						</span>
						<span className="mmbb-editor__price">
							{ sprintf(
								/* translators: %d: Number of products. */
								_n(
									'%d product',
									'%d products',
									term.count,
									'mix-and-max-box-builder'
								),
								term.count
							) }
						</span>
					</li>
				) ) }
			</ul>
			{ ! request.loading && terms.length === 0 ? (
				<p className="mmbb-editor__list-foot">
					{ __( 'Nothing matches.', 'mix-and-max-box-builder' ) }
				</p>
			) : null }
		</Card>
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

	return (
		<Card
			title={ sprintf(
				/* translators: %d: Number of products picked. */
				_n(
					'In this box · %d product',
					'In this box · %d products',
					ids.length,
					'mix-and-max-box-builder'
				),
				ids.length
			) }
			subtitle={ __(
				'Drag to set the order shoppers see, or use the arrows. Set a cap per product.',
				'mix-and-max-box-builder'
			) }
			padding="none"
		>
			{ ids.length === 0 ? (
				<p className="mmbb-editor__list-foot">
					{ __(
						'Nothing yet. Tick products on the left.',
						'mix-and-max-box-builder'
					) }
				</p>
			) : (
				<ol className="mmbb-editor__chosen">
					{ ids.map( ( id, index ) => {
						const product = byId[ id ];
						const name = product
							? product.name
							: sprintf(
									/* translators: %d: Product ID. */
									__(
										'Product #%d',
										'mix-and-max-box-builder'
									),
									id
							  );
						const cap = caps[ id ] || toNumber( perProduct ) || 1;
						return (
							<li
								key={ id }
								draggable
								className={
									dragging === index
										? 'is-dragging'
										: undefined
								}
								onDragStart={ ( event ) => {
									setDragging( index );
									event.dataTransfer.effectAllowed = 'move';
								} }
								onDragOver={ ( event ) =>
									event.preventDefault()
								}
								onDrop={ ( event ) => {
									event.preventDefault();
									move( dragging, index );
									setDragging( -1 );
								} }
								onDragEnd={ () => setDragging( -1 ) }
							>
								<span
									className="mmbb-editor__grip"
									aria-hidden="true"
								>
									<Icon name="grip" size={ 18 } />
								</span>
								<span className="mmbb-editor__move">
									<Button
										variant="ghost"
										size="sm"
										icon="arrowUp"
										disabled={ index === 0 }
										aria-label={ sprintf(
											/* translators: %s: Product name. */
											__(
												'Move %s up',
												'mix-and-max-box-builder'
											),
											name
										) }
										onClick={ () =>
											move( index, index - 1 )
										}
									/>
									<Button
										variant="ghost"
										size="sm"
										icon="arrowDown"
										disabled={ index === ids.length - 1 }
										aria-label={ sprintf(
											/* translators: %s: Product name. */
											__(
												'Move %s down',
												'mix-and-max-box-builder'
											),
											name
										) }
										onClick={ () =>
											move( index, index + 1 )
										}
									/>
								</span>
								<Thumb product={ product || {} } size={ 36 } />
								<span className="mmbb-editor__name">
									{ name }
								</span>
								<QuantityStepper
									size="sm"
									min={ 1 }
									max={ toNumber( capacity ) || 1 }
									value={ cap }
									label={ sprintf(
										/* translators: %s: Product name. */
										__(
											'Max of %s per box',
											'mix-and-max-box-builder'
										),
										name
									) }
									onChange={ ( value ) =>
										dispatch( {
											type: 'set',
											path: 'products.caps.' + id,
											value,
										} )
									}
								/>
								<Button
									variant="ghost"
									size="sm"
									icon="close"
									aria-label={ sprintf(
										/* translators: %s: Product name. */
										__(
											'Remove %s',
											'mix-and-max-box-builder'
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
							</li>
						);
					} ) }
				</ol>
			) }
		</Card>
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
		<div className="mmbb-editor__cols">
			<div className="mmbb-editor__main">
				<SegmentedControl
					label={ __( 'Source', 'mix-and-max-box-builder' ) }
					options={ [
						{
							value: 'manual',
							label: __(
								'Pick products',
								'mix-and-max-box-builder'
							),
						},
						{
							value: 'category',
							label: __(
								'By category',
								'mix-and-max-box-builder'
							),
						},
						{
							value: 'tag',
							label: __( 'By tag', 'mix-and-max-box-builder' ),
						},
					] }
					value={ source }
					onChange={ pickSource }
				/>
				{ source === 'manual' ? (
					<ProductPicker
						draft={ draft }
						errors={ errors }
						dispatch={ dispatch }
						remember={ catalog.remember }
					/>
				) : (
					<TermPicker
						draft={ draft }
						errors={ errors }
						dispatch={ dispatch }
						source={ source }
					/>
				) }
			</div>

			<div className="mmbb-editor__side mmbb-editor__side--wide">
				{ source === 'manual' ? (
					<ChosenList
						draft={ draft }
						dispatch={ dispatch }
						byId={ catalog.byId }
					/>
				) : (
					<Notice
						tone="info"
						title={ __(
							'Products follow your store',
							'mix-and-max-box-builder'
						) }
					>
						{ __(
							'New products added to these terms appear in the box on their own.',
							'mix-and-max-box-builder'
						) }
					</Notice>
				) }
				<Notice
					tone="info"
					title={ __(
						'Sold-out products hide themselves',
						'mix-and-max-box-builder'
					) }
				>
					{ __(
						'They come back when stock returns. Change this on the next step.',
						'mix-and-max-box-builder'
					) }
				</Notice>
			</div>
		</div>
	);
}
