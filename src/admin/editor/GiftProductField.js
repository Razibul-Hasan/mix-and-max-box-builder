import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Notice, TextField, useMoney } from '../../components';
import Media from '../../components/Media';
import { getProducts } from '../api';
import { errorMessage, useDebouncedValue, useRequest } from '../hooks';

const PER_PAGE = 6;

function Thumb( { product } ) {
	return (
		<span
			className="mmbb-editor__thumb"
			style={ { width: 40, height: 40 } }
		>
			<Media image={ product.image } art="cookie" name="" />
		</span>
	);
}

/**
 * Pick the one simple product given away free. Variations can't be gifts:
 * the server only adds simple products.
 *
 * @param {Object}   props
 * @param {number}   props.value    Picked product id, or 0.
 * @param {string}   props.error    Inline error.
 * @param {Function} props.onChange Called with the new product id.
 */
export default function GiftProductField( { value, error, onChange } ) {
	const formatMoney = useMoney();
	const [ search, setSearch ] = useState( '' );
	const query = useDebouncedValue( search.trim(), 300 );

	const picked = useRequest(
		() =>
			value
				? getProducts( { include: [ value ], per_page: 1 } )
				: Promise.resolve( [] ),
		[ value ]
	);
	const results = useRequest(
		() =>
			value
				? Promise.resolve( [] )
				: getProducts( { search: query, per_page: PER_PAGE } ),
		[ query, value ]
	);

	if ( value ) {
		const product = ( picked.data || [] )[ 0 ];
		return (
			<div className="mmbb-editor__gift-pick">
				<span className="mmbb-field__label">
					{ __(
						'Gift product',
						'productboxes-mix-and-match-box-builder'
					) }
				</span>
				<div className="mmbb-editor__gift-row">
					{ product ? <Thumb product={ product } /> : null }
					<span className="mmbb-editor__grow mmbb-cell-title">
						{ product
							? product.name
							: __(
									'Loading…',
									'productboxes-mix-and-match-box-builder'
							  ) }
					</span>
					<Button size="sm" onClick={ () => onChange( 0 ) }>
						{ __(
							'Change',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				</div>
			</div>
		);
	}

	const rows = ( results.data || [] ).filter(
		( product ) =>
			product.type === 'simple' && product.stock_status !== 'outofstock'
	);

	return (
		<div className="mmbb-editor__gift-pick">
			<TextField
				label={ __(
					'Gift product',
					'productboxes-mix-and-match-box-builder'
				) }
				prefix="search"
				placeholder={ __(
					'Search products by name or SKU',
					'productboxes-mix-and-match-box-builder'
				) }
				value={ search }
				error={ error }
				onChange={ ( event ) => setSearch( event.target.value ) }
			/>
			{ results.error ? (
				<Notice tone="critical">
					{ errorMessage(
						results.error,
						__(
							'The products could not be loaded.',
							'productboxes-mix-and-match-box-builder'
						)
					) }
				</Notice>
			) : (
				<ul
					className="mmbb-editor__gift-list"
					aria-busy={ results.loading }
				>
					{ rows.map( ( product ) => (
						<li key={ product.id }>
							<Thumb product={ product } />
							<span className="mmbb-editor__grow">
								<span className="mmbb-cell-title">
									{ product.name }
								</span>
								<span className="mmbb-cell-meta">
									{ formatMoney( product.price ) }
								</span>
							</span>
							<Button
								size="sm"
								aria-label={ sprintf(
									/* translators: %s: Product name. */
									__(
										'Give away %s',
										'productboxes-mix-and-match-box-builder'
									),
									product.name
								) }
								onClick={ () => onChange( product.id ) }
							>
								{ __(
									'Choose',
									'productboxes-mix-and-match-box-builder'
								) }
							</Button>
						</li>
					) ) }
					{ ! results.loading && rows.length === 0 ? (
						<li className="mmbb-cell-meta">
							{ __(
								'No products in stock match.',
								'productboxes-mix-and-match-box-builder'
							) }
						</li>
					) : null }
				</ul>
			) }
		</div>
	);
}
