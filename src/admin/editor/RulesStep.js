import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	Card,
	CardBody,
	Notice,
	Panel,
	PanelBody,
	RadioControl,
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { plus, trash } from '@wordpress/icons';
import { useMoney } from '../../components';
import { toMinor } from '../../shared/pricing';
import { useAdmin } from '../context';
import {
	HStack,
	InputControlPrefixWrapper,
	InputControlSuffixWrapper,
	Text,
	ToggleGroupControl,
	ToggleGroupControlOption,
	VStack,
} from '../components/wp';
import { NumberField, tierLabel, useOpenOnError } from './fields';
import GiftProductField from './GiftProductField';
import { toNumber } from './state';

const MAX_ROWS = 6;
function moneyPrefix( money ) {
	return money.symbol || '';
}

// The tiers or sizes list: one small card per row.
function RowsEditor( { kind, draft, errors, dispatch } ) {
	const { money } = useAdmin();
	const formatMoney = useMoney();
	const { config } = draft;
	const rows = config[ kind ];
	const isSizes = kind === 'sizes';
	const decimals = Number.isInteger( money.decimals ) ? money.decimals : 2;
	const convert = ( amount ) => toMinor( amount, decimals );
	const capacity = toNumber( config.box.capacity ) || 1;
	const type =
		( rows[ 0 ] && rows[ 0 ].discount_type ) ||
		( isSizes ? 'box_price' : 'percent' );

	const rowsPanel = useOpenOnError( errors, [ kind + '.' ], true );
	const set = ( path, value ) => dispatch( { type: 'set', path, value } );
	const setType = ( value ) =>
		set(
			kind,
			rows.map( ( row ) => ( { ...row, discount_type: value } ) )
		);
	const add = () => {
		const last = rows[ rows.length - 1 ];
		const qty = last
			? Math.min( capacity, ( toNumber( last.qty ) || 0 ) + 2 )
			: Math.min( capacity, 4 );
		const value = last
			? ( toNumber( last.value ) || 0 ) + ( type === 'percent' ? 5 : 0 )
			: 10;
		set( kind, [
			...rows,
			{
				qty,
				discount_type: type,
				value,
				...( isSizes ? { tag: '' } : {} ),
			},
		] );
	};
	const remove = ( index ) =>
		set(
			kind,
			rows.filter( ( row, i ) => i !== index )
		);

	const typeOptions = [
		{
			value: 'percent',
			label: __( 'Percent', 'productboxes-mix-and-match-box-builder' ),
		},
		{
			value: 'fixed_amount',
			label: __(
				'Fixed amount',
				'productboxes-mix-and-match-box-builder'
			),
		},
		{
			value: 'box_price',
			label: __( 'Box price', 'productboxes-mix-and-match-box-builder' ),
		},
	];
	const quantityHeading = isSizes
		? __( 'Items', 'productboxes-mix-and-match-box-builder' )
		: __( 'When the box has', 'productboxes-mix-and-match-box-builder' );
	const valueHeading =
		type === 'box_price'
			? __( 'Price', 'productboxes-mix-and-match-box-builder' )
			: __( 'Discount', 'productboxes-mix-and-match-box-builder' );

	return (
		<PanelBody
			title={
				isSizes
					? __(
							'Box sizes',
							'productboxes-mix-and-match-box-builder'
					  )
					: __(
							'Discount tiers',
							'productboxes-mix-and-match-box-builder'
					  )
			}
			{ ...rowsPanel }
		>
			<VStack spacing={ 4 }>
				<Text variant="muted">
					{ isSizes
						? __(
								'Shoppers pick one size and fill every slot.',
								'productboxes-mix-and-match-box-builder'
						  )
						: __(
								'Each tier unlocks when the box reaches its item count.',
								'productboxes-mix-and-match-box-builder'
						  ) }
				</Text>
				<ToggleGroupControl
					label={ __(
						'Discount type',
						'productboxes-mix-and-match-box-builder'
					) }
					isBlock
					value={ type }
					onChange={ setType }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ typeOptions.map( ( option ) => (
						<ToggleGroupControlOption
							key={ option.value }
							value={ option.value }
							label={ option.label }
						/>
					) ) }
				</ToggleGroupControl>
				{ errors[ kind ] ? (
					<Notice status="error" isDismissible={ false }>
						{ errors[ kind ] }
					</Notice>
				) : null }
				{ rows.map( ( row, index ) => {
					const base = kind + '.' + index;
					const label = tierLabel( row, formatMoney, convert );
					return (
						<Card key={ index } size="small">
							<CardBody>
								<VStack spacing={ 3 }>
									<HStack alignment="bottom" spacing={ 2 }>
										<NumberField
											label={ quantityHeading }
											suffix={
												<InputControlSuffixWrapper>
													{ __(
														'items',
														'productboxes-mix-and-match-box-builder'
													) }
												</InputControlSuffixWrapper>
											}
											value={ row.qty }
											error={ errors[ base + '.qty' ] }
											min={ 1 }
											max={ capacity }
											onChange={ ( value ) =>
												set( base + '.qty', value )
											}
										/>
										<NumberField
											label={ valueHeading }
											prefix={
												type ===
												'percent' ? undefined : (
													<InputControlPrefixWrapper>
														{ moneyPrefix( money ) }
													</InputControlPrefixWrapper>
												)
											}
											suffix={
												type === 'percent' ? (
													<InputControlSuffixWrapper>
														%
													</InputControlSuffixWrapper>
												) : undefined
											}
											value={ row.value }
											error={ errors[ base + '.value' ] }
											onChange={ ( value ) =>
												set( base + '.value', value )
											}
										/>
										<Button
											icon={ trash }
											isDestructive
											label={ sprintf(
												/* translators: %d: Row number. */
												__(
													'Remove row %d',
													'productboxes-mix-and-match-box-builder'
												),
												index + 1
											) }
											onClick={ () => remove( index ) }
											__next40pxDefaultSize
										/>
									</HStack>
									{ isSizes ? (
										<SelectControl
											label={ __(
												'Tag',
												'productboxes-mix-and-match-box-builder'
											) }
											value={ row.tag || '' }
											options={ [
												{
													value: '',
													label: __(
														'No tag',
														'productboxes-mix-and-match-box-builder'
													),
												},
												{
													value: 'popular',
													label: __(
														'Most popular',
														'productboxes-mix-and-match-box-builder'
													),
												},
												{
													value: 'best_value',
													label: __(
														'Best value',
														'productboxes-mix-and-match-box-builder'
													),
												},
											] }
											onChange={ ( value ) =>
												set( base + '.tag', value )
											}
											__next40pxDefaultSize
											__nextHasNoMarginBottom
										/>
									) : null }
									{ ! isSizes && label ? (
										<Text variant="muted">
											{ sprintf(
												/* translators: %s: What shoppers see, such as "10% off". */
												__(
													'Shoppers see: %s',
													'productboxes-mix-and-match-box-builder'
												),
												label
											) }
										</Text>
									) : null }
								</VStack>
							</CardBody>
						</Card>
					);
				} ) }
				<div>
					<Button
						variant="secondary"
						icon={ plus }
						disabled={ rows.length >= MAX_ROWS }
						onClick={ add }
						__next40pxDefaultSize
					>
						{ isSizes
							? __(
									'Add size',
									'productboxes-mix-and-match-box-builder'
							  )
							: __(
									'Add tier',
									'productboxes-mix-and-match-box-builder'
							  ) }
					</Button>
				</div>
			</VStack>
		</PanelBody>
	);
}

export default function RulesStep( { draft, errors, dispatch } ) {
	const { money } = useAdmin();
	const { config } = draft;
	const { box, extras } = config;
	const set = ( path, value ) => dispatch( { type: 'set', path, value } );
	// These panels start closed, but open by themselves when a field in them has a problem.
	const rulesPanel = useOpenOnError( errors, [ 'box.', 'bundle.' ] );
	const extrasPanel = useOpenOnError( errors, [ 'extras.' ] );

	const pickType = ( type ) => {
		if ( type === config.type ) {
			return;
		}
		set( 'type', type );
	};
	const moneyAffix = ( content ) => (
		<InputControlPrefixWrapper>{ content }</InputControlPrefixWrapper>
	);
	const itemsAffix = ( content ) => (
		<InputControlSuffixWrapper>{ content }</InputControlSuffixWrapper>
	);

	return (
		<Panel>
			<PanelBody
				title={ __(
					'Campaign type',
					'productboxes-mix-and-match-box-builder'
				) }
				initialOpen
			>
				<RadioControl
					label={ __(
						'Discount type',
						'productboxes-mix-and-match-box-builder'
					) }
					help={ __(
						'How the discount works. You can switch any time before the first order.',
						'productboxes-mix-and-match-box-builder'
					) }
					selected={ config.type }
					onChange={ pickType }
					options={ [
						{
							value: 'tiered',
							label: __(
								'Tiered mix',
								'productboxes-mix-and-match-box-builder'
							),
						},
						{
							value: 'fixed',
							label: __(
								'Fixed box',
								'productboxes-mix-and-match-box-builder'
							),
						},
						{
							value: 'bundle',
							label: __(
								'Bundle price',
								'productboxes-mix-and-match-box-builder'
							),
						},
					] }
				/>
			</PanelBody>

			<PanelBody
				title={ __(
					'Box rules',
					'productboxes-mix-and-match-box-builder'
				) }
				{ ...rulesPanel }
			>
				<VStack spacing={ 5 }>
					<RangeControl
						label={ __(
							'Box holds up to',
							'productboxes-mix-and-match-box-builder'
						) }
						value={ Number( box.capacity ) }
						min={ 1 }
						max={ 48 }
						help={
							errors[ 'box.capacity' ]
								? errors[ 'box.capacity' ]
								: sprintf(
										/* translators: %s: Number of slots. */
										__(
											'Shoppers see %s slots.',
											'productboxes-mix-and-match-box-builder'
										),
										String( box.capacity )
								  )
						}
						onChange={ ( value ) => set( 'box.capacity', value ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					{ config.type === 'tiered' ? (
						<RangeControl
							label={ __(
								'Minimum to check out',
								'productboxes-mix-and-match-box-builder'
							) }
							value={ Number( box.min_items ) }
							min={ 1 }
							max={ Number( box.capacity ) || 1 }
							help={
								errors[ 'box.min_items' ]
									? errors[ 'box.min_items' ]
									: __(
											'Below this the button stays locked.',
											'productboxes-mix-and-match-box-builder'
									  )
							}
							onChange={ ( value ) =>
								set( 'box.min_items', value )
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) : null }
					{ config.type === 'bundle' ? (
						<HStack alignment="top" spacing={ 3 }>
							<NumberField
								label={ __(
									'Items in the bundle',
									'productboxes-mix-and-match-box-builder'
								) }
								suffix={ itemsAffix(
									__(
										'items',
										'productboxes-mix-and-match-box-builder'
									)
								) }
								value={ config.bundle.qty }
								error={ errors[ 'bundle.qty' ] }
								onChange={ ( value ) =>
									set( 'bundle.qty', value )
								}
							/>
							<NumberField
								label={ __(
									'Bundle price',
									'productboxes-mix-and-match-box-builder'
								) }
								prefix={ moneyAffix( moneyPrefix( money ) ) }
								value={ config.bundle.price }
								error={ errors[ 'bundle.price' ] }
								onChange={ ( value ) =>
									set( 'bundle.price', value )
								}
							/>
						</HStack>
					) : null }
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Allow the same product twice',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Limit how many of one product fit in a box.',
							'productboxes-mix-and-match-box-builder'
						) }
						checked={ box.allow_duplicates }
						onChange={ ( on ) => set( 'box.allow_duplicates', on ) }
					/>
					{ box.allow_duplicates ? (
						<NumberField
							label={ __(
								'Max of one product',
								'productboxes-mix-and-match-box-builder'
							) }
							suffix={ itemsAffix(
								__(
									'per box',
									'productboxes-mix-and-match-box-builder'
								)
							) }
							value={ box.max_per_product }
							error={ errors[ 'box.max_per_product' ] }
							onChange={ ( value ) =>
								set( 'box.max_per_product', value )
							}
						/>
					) : null }
					{ errors[ 'box.allow_duplicates' ] ? (
						<Notice status="error" isDismissible={ false }>
							{ errors[ 'box.allow_duplicates' ] }
						</Notice>
					) : null }
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Hide sold-out products',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Otherwise they show as Sold out and can’t be added.',
							'productboxes-mix-and-match-box-builder'
						) }
						checked={ box.hide_sold_out }
						onChange={ ( on ) => set( 'box.hide_sold_out', on ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Allow coupons on this box',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'When off, store coupons do not apply to this box.',
							'productboxes-mix-and-match-box-builder'
						) }
						checked={ box.allow_coupons }
						onChange={ ( on ) => set( 'box.allow_coupons', on ) }
					/>
				</VStack>
			</PanelBody>

			{ config.type === 'tiered' ? (
				<RowsEditor
					kind="tiers"
					draft={ draft }
					errors={ errors }
					dispatch={ dispatch }
				/>
			) : null }
			{ config.type === 'fixed' ? (
				<RowsEditor
					kind="sizes"
					draft={ draft }
					errors={ errors }
					dispatch={ dispatch }
				/>
			) : null }

			<PanelBody
				title={ __(
					'Extras',
					'productboxes-mix-and-match-box-builder'
				) }
				{ ...extrasPanel }
			>
				<VStack spacing={ 5 }>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Gift message',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'A text box under the box summary. Printed on the packing slip.',
							'productboxes-mix-and-match-box-builder'
						) }
						checked={ extras.gift_message }
						onChange={ ( on ) => set( 'extras.gift_message', on ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Gift wrap',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Optional paid add-on.',
							'productboxes-mix-and-match-box-builder'
						) }
						checked={ extras.gift_wrap.enabled }
						onChange={ ( on ) =>
							set( 'extras.gift_wrap.enabled', on )
						}
					/>
					{ extras.gift_wrap.enabled ? (
						<NumberField
							label={ __(
								'Gift wrap fee',
								'productboxes-mix-and-match-box-builder'
							) }
							prefix={ moneyAffix( moneyPrefix( money ) ) }
							value={ extras.gift_wrap.fee }
							error={ errors[ 'extras.gift_wrap.fee' ] }
							onChange={ ( value ) =>
								set( 'extras.gift_wrap.fee', value )
							}
						/>
					) : null }
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Free gift',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Add a product at no charge once the box has enough items.',
							'productboxes-mix-and-match-box-builder'
						) }
						checked={ extras.free_gift.enabled }
						onChange={ ( on ) =>
							set( 'extras.free_gift.enabled', on )
						}
					/>
					{ extras.free_gift.enabled ? (
						<>
							<GiftProductField
								value={ extras.free_gift.product_id }
								error={
									errors[ 'extras.free_gift.product_id' ]
								}
								onChange={ ( id ) =>
									set( 'extras.free_gift.product_id', id )
								}
							/>
							<NumberField
								label={ __(
									'Unlocks at',
									'productboxes-mix-and-match-box-builder'
								) }
								suffix={ itemsAffix(
									__(
										'items',
										'productboxes-mix-and-match-box-builder'
									)
								) }
								value={ extras.free_gift.min_items }
								error={ errors[ 'extras.free_gift.min_items' ] }
								help={ __(
									'The gift goes in the cart with the box.',
									'productboxes-mix-and-match-box-builder'
								) }
								onChange={ ( value ) =>
									set( 'extras.free_gift.min_items', value )
								}
							/>
						</>
					) : null }
				</VStack>
			</PanelBody>
		</Panel>
	);
}
