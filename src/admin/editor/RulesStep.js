import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Panel,
	PanelBody,
	RadioControl,
	RangeControl,
} from '@wordpress/components';
import {
	Badge,
	Button,
	Icon,
	Notice,
	QuantityStepper,
	SegmentedControl,
	SelectField,
	Sticker,
	TierProgress,
	Toggle,
	useMoney,
} from '../../components';
import { toMinor } from '../../shared/pricing';
import { useAdmin } from '../context';
import { NumberControl } from '../components/wp';
import { NumberField, previewTiers, tierLabel } from './fields';
import GiftProductField from './GiftProductField';
import { toNumber } from './state';

const MAX_ROWS = 6;

function moneyPrefix( money ) {
	return money.symbol || '';
}

// The last tier is the headline deal, so it gets the sticker.
function RowLabel( { label, last } ) {
	return last ? (
		<Sticker size="sm" tilt>
			{ label }
		</Sticker>
	) : (
		<Badge tone="brand">{ label }</Badge>
	);
}

// The rows of a tier or size table. Tiers and sizes are the same shape; sizes add a tag.
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
	const [ readCount, setReadCount ] = useState( 0 );

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
	const readTiers = previewTiers( rows, formatMoney, convert );
	const quantityHeading = isSizes
		? __( 'Items', 'productboxes-mix-and-match-box-builder' )
		: __( 'When the box has', 'productboxes-mix-and-match-box-builder' );
	const valueHeading =
		type === 'box_price'
			? __( 'Price', 'productboxes-mix-and-match-box-builder' )
			: __( 'Discount', 'productboxes-mix-and-match-box-builder' );
	const resultHeading = isSizes
		? __( 'Tag', 'productboxes-mix-and-match-box-builder' )
		: __( 'Shoppers see', 'productboxes-mix-and-match-box-builder' );

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
			initialOpen
		>
			<div className="mmbb-editor__stack">
				<p className="mmbb-editor__panel-description">
					{ isSizes
						? __(
								'Shoppers pick one size and fill every slot.',
								'productboxes-mix-and-match-box-builder'
						  )
						: __(
								'Each tier unlocks when the box reaches its item count.',
								'productboxes-mix-and-match-box-builder'
						  ) }
				</p>
				<SegmentedControl
					size="sm"
					label={ __(
						'Discount type',
						'productboxes-mix-and-match-box-builder'
					) }
					options={ typeOptions }
					value={ type }
					onChange={ setType }
				/>
				{ errors[ kind ] ? (
					<Notice tone="critical">{ errors[ kind ] }</Notice>
				) : null }
				{ rows.length ? (
					<div className="mmbb-editor__scroll">
						<table className="mmbb-editor__table">
							<thead>
								<tr>
									<th className="mmbb-editor__num" />
									<th>{ quantityHeading }</th>
									<th>{ valueHeading }</th>
									<th>{ resultHeading }</th>
									<th className="mmbb-editor__act" />
								</tr>
							</thead>
							<tbody>
								{ rows.map( ( row, index ) => {
									const base = kind + '.' + index;
									const isLast = index === rows.length - 1;
									const label = tierLabel(
										row,
										formatMoney,
										convert
									);
									return (
										<tr key={ index }>
											<td className="mmbb-editor__num">
												<span>{ index + 1 }</span>
											</td>
											<td className="mmbb-editor__tier-qty">
												<span className="mmbb-editor__field-label">
													{ quantityHeading }
												</span>
												<NumberControl
													aria-label={ sprintf(
														/* translators: %d: Row number. */
														__(
															'Row %d items',
															'productboxes-mix-and-match-box-builder'
														),
														index + 1
													) }
													suffix={ __(
														'items',
														'productboxes-mix-and-match-box-builder'
													) }
													value={ row.qty }
													help={
														errors[ base + '.qty' ]
													}
													min={ 1 }
													max={ capacity }
													__next40pxDefaultSize
													__nextHasNoMarginBottom
													onChange={ ( value ) =>
														set(
															base + '.qty',
															value
														)
													}
												/>
											</td>
											<td className="mmbb-editor__tier-value">
												<span className="mmbb-editor__field-label">
													{ valueHeading }
												</span>
												<NumberControl
													aria-label={ sprintf(
														/* translators: %d: Row number. */
														__(
															'Row %d discount',
															'productboxes-mix-and-match-box-builder'
														),
														index + 1
													) }
													prefix={
														type === 'percent'
															? undefined
															: moneyPrefix(
																	money
															  )
													}
													suffix={
														type === 'percent'
															? '%'
															: undefined
													}
													value={ row.value }
													help={
														errors[
															base + '.value'
														]
													}
													min={ 0 }
													__next40pxDefaultSize
													__nextHasNoMarginBottom
													onChange={ ( value ) =>
														set(
															base + '.value',
															value
														)
													}
												/>
											</td>
											<td className="mmbb-editor__tier-result">
												<span className="mmbb-editor__field-label">
													{ resultHeading }
												</span>
												{ isSizes ? (
													<SelectField
														aria-label={ sprintf(
															/* translators: %d: Row number. */
															__(
																'Row %d tag',
																'productboxes-mix-and-match-box-builder'
															),
															index + 1
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
														onChange={ ( event ) =>
															set(
																base + '.tag',
																event.target
																	.value
															)
														}
													/>
												) : null }
												{ ! isSizes && label ? (
													<RowLabel
														label={ label }
														last={ isLast }
													/>
												) : null }
											</td>
											<td className="mmbb-editor__act">
												<Button
													variant="ghost"
													size="sm"
													icon="trash"
													aria-label={ sprintf(
														/* translators: %d: Row number. */
														__(
															'Remove row %d',
															'productboxes-mix-and-match-box-builder'
														),
														index + 1
													) }
													onClick={ () =>
														remove( index )
													}
												/>
											</td>
										</tr>
									);
								} ) }
							</tbody>
						</table>
					</div>
				) : null }
				<div>
					<Button
						size="sm"
						variant="ghost"
						icon="plus"
						disabled={ rows.length >= MAX_ROWS }
						onClick={ add }
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
				{ ! isSizes && readTiers.length ? (
					<div className="mmbb-editor__read">
						<Icon name="eye" size={ 16 } />
						<span className="mmbb-editor__read-label">
							{ __(
								'Shoppers read:',
								'productboxes-mix-and-match-box-builder'
							) }
						</span>
						<QuantityStepper
							size="sm"
							min={ 0 }
							max={ capacity }
							value={ Math.min( readCount, capacity ) }
							label={ __(
								'Items in the box',
								'productboxes-mix-and-match-box-builder'
							) }
							onChange={ setReadCount }
						/>
						<TierProgress
							compact
							count={ Math.min( readCount, capacity ) }
							tiers={ readTiers }
							size={ capacity }
						/>
					</div>
				) : null }
			</div>
		</PanelBody>
	);
}

export default function RulesStep( { draft, errors, dispatch } ) {
	const { money } = useAdmin();
	const { config } = draft;
	const { box, extras } = config;
	const set = ( path, value ) => dispatch( { type: 'set', path, value } );

	const pickType = ( type ) => {
		if ( type === config.type ) {
			return;
		}
		set( 'type', type );
	};

	return (
		<Panel className="mmbb-editor__pane">
			<PanelBody
				title={ __(
					'Campaign type',
					'productboxes-mix-and-match-box-builder'
				) }
				initialOpen
			>
				<div className="mmbb-editor__stack mmbb-editor__stack--tight">
					<p className="mmbb-editor__panel-description">
						{ __(
							'How the discount works. You can switch any time before the first order.',
							'productboxes-mix-and-match-box-builder'
						) }
					</p>
					<RadioControl
						label={ __(
							'Discount type',
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
				</div>
			</PanelBody>

			<PanelBody
				title={ __(
					'Box rules',
					'productboxes-mix-and-match-box-builder'
				) }
			>
				<div className="mmbb-editor__stack">
					<div className="mmbb-editor__pair">
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
							onChange={ ( value ) =>
								set( 'box.capacity', value )
							}
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
					</div>
					{ config.type === 'bundle' ? (
						<div className="mmbb-editor__pair">
							<NumberField
								label={ __(
									'Items in the bundle',
									'productboxes-mix-and-match-box-builder'
								) }
								suffix={ __(
									'items',
									'productboxes-mix-and-match-box-builder'
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
								prefix={ moneyPrefix( money ) }
								value={ config.bundle.price }
								error={ errors[ 'bundle.price' ] }
								onChange={ ( value ) =>
									set( 'bundle.price', value )
								}
							/>
						</div>
					) : null }
					<div className="mmbb-editor__stack mmbb-editor__rule">
						<Toggle
							label={ __(
								'Allow the same product twice',
								'productboxes-mix-and-match-box-builder'
							) }
							description={ __(
								'Limit how many of one product fit in a box.',
								'productboxes-mix-and-match-box-builder'
							) }
							checked={ box.allow_duplicates }
							onChange={ ( on ) =>
								set( 'box.allow_duplicates', on )
							}
						/>
						{ box.allow_duplicates ? (
							<NumberField
								className="mmbb-editor__narrow"
								label={ __(
									'Max of one product',
									'productboxes-mix-and-match-box-builder'
								) }
								suffix={ __(
									'per box',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ box.max_per_product }
								error={ errors[ 'box.max_per_product' ] }
								onChange={ ( value ) =>
									set( 'box.max_per_product', value )
								}
							/>
						) : null }
						{ errors[ 'box.allow_duplicates' ] ? (
							<Notice tone="critical">
								{ errors[ 'box.allow_duplicates' ] }
							</Notice>
						) : null }
					</div>
					<div className="mmbb-editor__rule">
						<Toggle
							label={ __(
								'Hide sold-out products',
								'productboxes-mix-and-match-box-builder'
							) }
							description={ __(
								'Otherwise they show as Sold out and can’t be added.',
								'productboxes-mix-and-match-box-builder'
							) }
							checked={ box.hide_sold_out }
							onChange={ ( on ) =>
								set( 'box.hide_sold_out', on )
							}
						/>
					</div>
					<div className="mmbb-editor__rule">
						<Toggle
							label={ __(
								'Allow coupons on this box',
								'productboxes-mix-and-match-box-builder'
							) }
							description={ __(
								'When off, store coupons do not apply to this box.',
								'productboxes-mix-and-match-box-builder'
							) }
							checked={ box.allow_coupons }
							onChange={ ( on ) =>
								set( 'box.allow_coupons', on )
							}
						/>
					</div>
				</div>
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
			>
				<div className="mmbb-editor__stack">
					<Toggle
						label={ __(
							'Gift message',
							'productboxes-mix-and-match-box-builder'
						) }
						description={ __(
							'A text box under the box summary. Printed on the packing slip.',
							'productboxes-mix-and-match-box-builder'
						) }
						checked={ extras.gift_message }
						onChange={ ( on ) => set( 'extras.gift_message', on ) }
					/>
					<div className="mmbb-editor__pair mmbb-editor__rule">
						<Toggle
							label={ __(
								'Gift wrap',
								'productboxes-mix-and-match-box-builder'
							) }
							description={ __(
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
								prefix={ moneyPrefix( money ) }
								value={ extras.gift_wrap.fee }
								error={ errors[ 'extras.gift_wrap.fee' ] }
								onChange={ ( value ) =>
									set( 'extras.gift_wrap.fee', value )
								}
							/>
						) : null }
					</div>
					<div className="mmbb-editor__stack mmbb-editor__rule">
						<Toggle
							label={ __(
								'Free gift',
								'productboxes-mix-and-match-box-builder'
							) }
							description={ __(
								'Add a product at no charge once the box has enough items.',
								'productboxes-mix-and-match-box-builder'
							) }
							checked={ extras.free_gift.enabled }
							onChange={ ( on ) =>
								set( 'extras.free_gift.enabled', on )
							}
						/>
						{ extras.free_gift.enabled ? (
							<div className="mmbb-editor__pair">
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
									suffix={ __(
										'items',
										'productboxes-mix-and-match-box-builder'
									) }
									value={ extras.free_gift.min_items }
									error={
										errors[ 'extras.free_gift.min_items' ]
									}
									help={
										errors[ 'extras.free_gift.min_items' ]
											? undefined
											: __(
													'The gift goes in the cart with the box.',
													'productboxes-mix-and-match-box-builder'
											  )
									}
									onChange={ ( value ) =>
										set(
											'extras.free_gift.min_items',
											value
										)
									}
								/>
							</div>
						) : null }
					</div>
				</div>
			</PanelBody>
		</Panel>
	);
}
