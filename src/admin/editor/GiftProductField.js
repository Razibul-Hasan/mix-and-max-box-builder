import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Notice, SearchControl } from '@wordpress/components';
import { useMoney } from '../../components';
import Media from '../../components/Media';
import { getProducts } from '../api';
import { errorMessage, useDebouncedValue, useRequest } from '../hooks';
import { HStack, Item, ItemGroup, Text, VStack } from '../components/wp';

const PER_PAGE = 6;
function Thumb( { product } ) {
	return (
		<span className="mmbb-editor__thumb">
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
			<VStack spacing={ 2 }>
				<Text weight={ 600 }>
					{ __(
						'Gift product',
						'productboxes-mix-and-match-box-builder'
					) }
				</Text>
				<HStack spacing={ 3 }>
					{ product ? <Thumb product={ product } /> : null }
					<Text weight={ 600 }>
						{ product
							? product.name
							: __(
									'Loading…',
									'productboxes-mix-and-match-box-builder'
							  ) }
					</Text>
					<Button variant="secondary" onClick={ () => onChange( 0 ) }>
						{ __(
							'Change',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				</HStack>
			</VStack>
		);
	}

	const rows = ( results.data || [] ).filter(
		( product ) =>
			product.type === 'simple' && product.stock_status !== 'outofstock'
	);

	return (
		<VStack spacing={ 3 } data-mmbb-invalid={ error ? 'true' : undefined }>
			<SearchControl
				label={ __(
					'Gift product',
					'productboxes-mix-and-match-box-builder'
				) }
				placeholder={ __(
					'Search products by name or SKU',
					'productboxes-mix-and-match-box-builder'
				) }
				value={ search }
				help={ error }
				onChange={ setSearch }
				__nextHasNoMarginBottom
			/>
			{ results.error ? (
				<Notice status="error" isDismissible={ false }>
					{ errorMessage(
						results.error,
						__(
							'The products could not be loaded.',
							'productboxes-mix-and-match-box-builder'
						)
					) }
				</Notice>
			) : (
				<ItemGroup isBordered isSeparated aria-busy={ results.loading }>
					{ rows.map( ( product ) => (
						<Item key={ product.id }>
							<HStack spacing={ 3 }>
								<Thumb product={ product } />
								<VStack spacing={ 0 }>
									<Text weight={ 600 }>{ product.name }</Text>
									<Text variant="muted">
										{ formatMoney( product.price ) }
									</Text>
								</VStack>
								<Button
									variant="secondary"
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
							</HStack>
						</Item>
					) ) }
					{ ! results.loading && rows.length === 0 ? (
						<Item>
							<Text variant="muted">
								{ __(
									'No products in stock match.',
									'productboxes-mix-and-match-box-builder'
								) }
							</Text>
						</Item>
					) : null }
				</ItemGroup>
			) }
		</VStack>
	);
}
