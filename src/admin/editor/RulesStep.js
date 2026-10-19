import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Badge,
	Button,
	Card,
	ChoiceCard,
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
import { NumberField, previewTiers, tierLabel } from './fields';
import Preview from './Preview';
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
		{ value: 'percent', label: __( 'Percent', 'mix-and-max-box-builder' ) },
		{
			value: 'fixed_amount',
			label: __( 'Fixed amount', 'mix-and-max-box-builder' ),
		},
		{
			value: 'box_price',
			label: __( 'Box price', 'mix-and-max-box-builder' ),
		},
	];
	const readTiers = previewTiers( rows, formatMoney, convert );

	return (
		<Card
			title={
				isSizes
					? __( 'Box sizes', 'mix-and-max-box-builder' )
					: __( 'Discount tiers', 'mix-and-max-box-builder' )
			}
			subtitle={
				isSizes
					? __(
							'Shoppers pick one size and fill every slot.',
							'mix-and-max-box-builder'
					  )
					: __(
							'Each tier unlocks when the box reaches its item count.',
							'mix-and-max-box-builder'
					  )
			}
		>
			<div className="mmbb-editor__stack">
				<SegmentedControl
					size="sm"
					label={ __( 'Discount type', 'mix-and-max-box-builder' ) }
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
									<th>
										{ isSizes
											? __(
													'Items',
													'mix-and-max-box-builder'
											  )
											: __(
													'When the box has',
													'mix-and-max-box-builder'
											  ) }
									</th>
									<th>
										{ type === 'box_price'
											? __(
													'Price',
													'mix-and-max-box-builder'
											  )
											: __(
													'Discount',
													'mix-and-max-box-builder'
											  ) }
									</th>
									<th>
										{ isSizes
											? __(
													'Tag',
													'mix-and-max-box-builder'
											  )
											: __(
													'Shoppers see',
													'mix-and-max-box-builder'
											  ) }
									</th>
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
											<td>
												<NumberField
													aria-label={ sprintf(
														/* translators: %d: Row number. */
														__(
															'Row %d items',
															'mix-and-max-box-builder'
														),
														index + 1
													) }
													suffix={ __(
														'items',
														'mix-and-max-box-builder'
													) }
													value={ row.qty }
													error={
														errors[ base + '.qty' ]
													}
													onChange={ ( value ) =>
														set(
															base + '.qty',
															value
														)
													}
												/>
											</td>
											<td>
												<NumberField
													aria-label={ sprintf(
														/* translators: %d: Row number. */
														__(
															'Row %d discount',
															'mix-and-max-box-builder'
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
													error={
														errors[
															base + '.value'
														]
													}
													onChange={ ( value ) =>
														set(
															base + '.value',
															value
														)
													}
												/>
											</td>
											<td>
												{ isSizes ? (
													<SelectField
														aria-label={ sprintf(
															/* translators: %d: Row number. */
															__(
																'Row %d tag',
																'mix-and-max-box-builder'
															),
															index + 1
														) }
														value={ row.tag || '' }
														options={ [
															{
																value: '',
																label: __(
																	'No tag',
																	'mix-and-max-box-builder'
																),
															},
															{
																value: 'popular',
																label: __(
																	'Most popular',
																	'mix-and-max-box-builder'
																),
															},
															{
																value: 'best_value',
																label: __(
																	'Best value',
																	'mix-and-max-box-builder'
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
															'mix-and-max-box-builder'
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
							? __( 'Add size', 'mix-and-max-box-builder' )
							: __( 'Add tier', 'mix-and-max-box-builder' ) }
					</Button>
				</div>
				{ ! isSizes && readTiers.length ? (
					<div className="mmbb-editor__read">
						<Icon name="eye" size={ 16 } />
						<span className="mmbb-editor__read-label">
							{ __(
								'Shoppers read:',
								'mix-and-max-box-builder'
							) }
						</span>
						<QuantityStepper
							size="sm"
							min={ 0 }
							max={ capacity }
							value={ Math.min( readCount, capacity ) }
							label={ __(
								'Items in the box',
								'mix-and-max-box-builder'
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
		</Card>
	);
}

export default function RulesStep( {
	draft,
	errors,
	dispatch,
	previewProducts,
} ) {
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
		<div className="mmbb-editor__cols">
			<div className="mmbb-editor__main">
				<Card
					title={ __( 'Campaign type', 'mix-and-max-box-builder' ) }
					subtitle={ __(
						'How the discount works. You can switch any time before the first order.',
						'mix-and-max-box-builder'
					) }
				>
					<div className="mmbb-editor__stack mmbb-editor__stack--tight">
						<ChoiceCard
							name="type"
							value="tiered"
							selected={ config.type === 'tiered' }
							onSelect={ pickType }
							icon="percent"
							title={ __(
								'Tiered mix',
								'mix-and-max-box-builder'
							) }
							description={ __(
								'The more items in the box, the bigger the discount. Best for snacks and samplers.',
								'mix-and-max-box-builder'
							) }
							tag={ __(
								'Top seller',
								'mix-and-max-box-builder'
							) }
						/>
						<ChoiceCard
							name="type"
							value="fixed"
							selected={ config.type === 'fixed' }
							onSelect={ pickType }
							icon="box"
							title={ __(
								'Fixed box',
								'mix-and-max-box-builder'
							) }
							description={ __(
								'Shoppers pick a size (4, 6, 12) and fill every slot. Each size has its own price.',
								'mix-and-max-box-builder'
							) }
						/>
						<ChoiceCard
							name="type"
							value="bundle"
							selected={ config.type === 'bundle' }
							onSelect={ pickType }
							icon="tag"
							title={ __(
								'Bundle price',
								'mix-and-max-box-builder'
							) }
							description={ __(
								'Any set number of items for one price, like 5 for 25.',
								'mix-and-max-box-builder'
							) }
						/>
					</div>
				</Card>

				<Card title={ __( 'Box rules', 'mix-and-max-box-builder' ) }>
					<div className="mmbb-editor__stack">
						<div className="mmbb-editor__pair">
							<NumberField
								label={ __(
									'Box holds up to',
									'mix-and-max-box-builder'
								) }
								suffix={ __(
									'items',
									'mix-and-max-box-builder'
								) }
								value={ box.capacity }
								error={ errors[ 'box.capacity' ] }
								help={
									errors[ 'box.capacity' ]
										? undefined
										: sprintf(
												/* translators: %s: Number of slots. */
												__(
													'Shoppers see %s slots.',
													'mix-and-max-box-builder'
												),
												String( box.capacity )
										  )
								}
								onChange={ ( value ) =>
									set( 'box.capacity', value )
								}
							/>
							{ config.type === 'tiered' ? (
								<NumberField
									label={ __(
										'Minimum to check out',
										'mix-and-max-box-builder'
									) }
									suffix={ __(
										'items',
										'mix-and-max-box-builder'
									) }
									value={ box.min_items }
									error={ errors[ 'box.min_items' ] }
									help={
										errors[ 'box.min_items' ]
											? undefined
											: __(
													'Below this the button stays locked.',
													'mix-and-max-box-builder'
											  )
									}
									onChange={ ( value ) =>
										set( 'box.min_items', value )
									}
								/>
							) : null }
						</div>
						{ config.type === 'bundle' ? (
							<div className="mmbb-editor__pair">
								<NumberField
									label={ __(
										'Items in the bundle',
										'mix-and-max-box-builder'
									) }
									suffix={ __(
										'items',
										'mix-and-max-box-builder'
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
										'mix-and-max-box-builder'
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
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Limit how many of one product fit in a box.',
									'mix-and-max-box-builder'
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
										'mix-and-max-box-builder'
									) }
									suffix={ __(
										'per box',
										'mix-and-max-box-builder'
									) }
									value={ box.max_per_product }
									error={ errors[ 'box.max_per_product' ] }
									onChange={ ( value ) =>
										set( 'box.max_per_product', value )
									}
								/>
							) : null }
						</div>
						<div className="mmbb-editor__rule">
							<Toggle
								label={ __(
									'Hide sold-out products',
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Otherwise they show as Sold out and can’t be added.',
									'mix-and-max-box-builder'
								) }
								checked={ box.hide_sold_out }
								onChange={ ( on ) =>
									set( 'box.hide_sold_out', on )
								}
							/>
						</div>
					</div>
				</Card>

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

				<Card title={ __( 'Extras', 'mix-and-max-box-builder' ) }>
					<div className="mmbb-editor__stack">
						<Toggle
							label={ __(
								'Gift message',
								'mix-and-max-box-builder'
							) }
							description={ __(
								'A text box under the box summary. Printed on the packing slip.',
								'mix-and-max-box-builder'
							) }
							checked={ extras.gift_message }
							onChange={ ( on ) =>
								set( 'extras.gift_message', on )
							}
						/>
						<div className="mmbb-editor__pair mmbb-editor__rule">
							<Toggle
								label={ __(
									'Gift wrap',
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Optional paid add-on.',
									'mix-and-max-box-builder'
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
										'mix-and-max-box-builder'
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
					</div>
				</Card>
			</div>

			<div className="mmbb-editor__side mmbb-editor__side--sticky">
				<Card
					title={ __( 'Shopper preview', 'mix-and-max-box-builder' ) }
					subtitle={ __(
						'Updates as you edit. Try adding items.',
						'mix-and-max-box-builder'
					) }
				>
					<Preview draft={ draft } products={ previewProducts } />
				</Card>
			</div>
		</div>
	);
}
