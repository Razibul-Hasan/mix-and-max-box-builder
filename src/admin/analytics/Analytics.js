import {
	Button,
	CheckboxControl,
	Notice,
	SelectControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { download } from '@wordpress/icons';
import { LineChart, useMoney } from '../../components';
import { getAnalytics, exportAnalytics, getCampaigns } from '../api';
import {
	DataTable,
	PageHeader,
	PageSkeleton,
	StatCard,
	StatGroup,
} from '../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../components/wp';
import { useAdmin } from '../context';
import { formatCount, formatPercent, formatShortDate } from '../format';
import { errorMessage, useRequest } from '../hooks';
import Shell from '../Shell';
import './analytics.css';

const funnelLabels = () => ( {
	view: __( 'Opened the builder', 'productboxes-mix-and-match-box-builder' ),
	started: __( 'Added an item', 'productboxes-mix-and-match-box-builder' ),
	tier_reached: __(
		'Reached a discount',
		'productboxes-mix-and-match-box-builder'
	),
	add_to_cart: __(
		'Added box to cart',
		'productboxes-mix-and-match-box-builder'
	),
	purchased: __( 'Bought', 'productboxes-mix-and-match-box-builder' ),
} );

function periodLabel( data, locale ) {
	const date = ( value ) =>
		formatShortDate( value + 'T12:00:00Z', { locale, timezone: 'UTC' } );
	return sprintf(
		/* translators: 1: First date, 2: Last date. */ __(
			'%1$s to %2$s, by day',
			'productboxes-mix-and-match-box-builder'
		),
		date( data.from ),
		date( data.to )
	);
}

function signedNumber( value, format ) {
	if ( value === null || value === undefined ) {
		return null;
	}
	let prefix = '';
	if ( value > 0 ) {
		prefix = '+';
	} else if ( value < 0 ) {
		prefix = '\u2212';
	}
	return prefix + format( Math.abs( value ) );
}

function Journey( { rows, locale } ) {
	const labels = funnelLabels();
	const first = rows[ 0 ]?.count || 0;
	const drops = rows.slice( 1 ).map( ( row, index ) => ( {
		from: rows[ index ],
		to: row,
		lost: Math.max( 0, rows[ index ].count - row.count ),
	} ) );
	const largest = drops.sort( ( one, two ) => two.lost - one.lost )[ 0 ];
	return (
		<>
			<ol className="mmbb-analytics-journey">
				{ rows.map( ( row ) => {
					const percent = first ? ( row.count / first ) * 100 : 0;
					return (
						<li key={ row.step }>
							<div className="mmbb-analytics-bar-row">
								<span>{ labels[ row.step ] || row.step }</span>
								<span>
									<strong>
										{ formatCount( row.count, locale ) }
									</strong>{ ' ' }
									<span className="mmbb-app-muted">
										{ formatPercent( percent, locale ) }
									</span>
								</span>
							</div>
							<div
								className="mmbb-analytics-bar-track"
								aria-hidden="true"
							>
								<i style={ { width: percent + '%' } } />
							</div>
						</li>
					);
				} ) }
			</ol>
			{ largest?.lost > 0 ? (
				<Notice status="info" isDismissible={ false }>
					{ sprintf(
						/* translators: 1: Earlier journey step, 2: Later journey step, 3: Number of visits lost. */ __(
							'The largest drop-off is between %1$s and %2$s: %3$s visits.',
							'productboxes-mix-and-match-box-builder'
						),
						labels[ largest.from.step ],
						labels[ largest.to.step ],
						formatCount( largest.lost, locale )
					) }
				</Notice>
			) : null }
		</>
	);
}

function Bars( { rows, locale } ) {
	const maximum = Math.max( 1, ...rows.map( ( row ) => row.count ) );
	return (
		<ul className="mmbb-analytics-bars">
			{ rows.map( ( row ) => (
				<li key={ row.id || row.name }>
					<div className="mmbb-analytics-bar-row">
						<span>{ row.name }</span>
						<span>{ formatCount( row.count, locale ) }</span>
					</div>
					<div
						className="mmbb-analytics-bar-track"
						aria-hidden="true"
					>
						<i
							style={ {
								width: ( row.count / maximum ) * 100 + '%',
							} }
						/>
					</div>
				</li>
			) ) }
		</ul>
	);
}

export default function Analytics() {
	const { locale } = useAdmin();
	const money = useMoney();
	const [ range, setRange ] = useState( '30d' );
	const [ campaign, setCampaign ] = useState( '0' );
	const [ compare, setCompare ] = useState( true );
	const [ from, setFrom ] = useState( '' );
	const [ to, setTo ] = useState( '' );
	const [ exporting, setExporting ] = useState( false );
	const [ exportError, setExportError ] = useState( null );
	const customReady = range !== 'custom' || ( from && to );
	const params = {
		range,
		campaign: Number( campaign ),
		compare,
		...( range === 'custom' ? { from, to } : {} ),
	};
	const report = useRequest(
		() =>
			customReady ? getAnalytics( params ) : Promise.resolve( null ),
		[ range, campaign, compare, from, to ]
	);
	const campaigns = useRequest( () => getCampaigns( { per_page: 50 } ), [] );
	const data = report.data;
	const exportCsv = async () => {
		setExporting( true );
		setExportError( null );
		try {
			await exportAnalytics( params );
		} catch ( error ) {
			setExportError( error );
		} finally {
			setExporting( false );
		}
	};
	const columns = [
		{
			key: 'name',
			label: __( 'Box', 'productboxes-mix-and-match-box-builder' ),
		},
		{
			key: 'views',
			label: __( 'Visits', 'productboxes-mix-and-match-box-builder' ),
			numeric: true,
		},
		{
			key: 'started',
			label: __( 'Started', 'productboxes-mix-and-match-box-builder' ),
			numeric: true,
		},
		{
			key: 'boxes',
			label: __( 'Sold', 'productboxes-mix-and-match-box-builder' ),
			numeric: true,
		},
		{
			key: 'conversion',
			label: __( 'Conversion', 'productboxes-mix-and-match-box-builder' ),
			numeric: true,
			render: ( row ) =>
				row.views ? formatPercent( row.conversion, locale ) : '\u2014',
		},
		{
			key: 'avg_box_value',
			label: __( 'Avg. box', 'productboxes-mix-and-match-box-builder' ),
			numeric: true,
			render: ( row ) =>
				row.boxes ? money( row.avg_box_value ) : '\u2014',
		},
		{
			key: 'revenue',
			label: __( 'Revenue', 'productboxes-mix-and-match-box-builder' ),
			numeric: true,
			render: ( row ) => money( row.revenue ),
		},
	];
	const failure = report.error || campaigns.error || exportError;
	const previous = ( key ) => data?.kpis[ key ]?.previous;
	const difference = ( key ) =>
		previous( key ) === null || previous( key ) === undefined
			? null
			: data.kpis[ key ].value - previous( key );
	return (
		<Shell active="analytics">
			<div className="mmbb-app-stack">
				<PageHeader
					title={ __(
						'Analytics',
						'productboxes-mix-and-match-box-builder'
					) }
					description={ __(
						'What sells in boxes, and where shoppers stop.',
						'productboxes-mix-and-match-box-builder'
					) }
					actions={
						<Button
							__next40pxDefaultSize
							variant="secondary"
							icon={ download }
							isBusy={ exporting }
							disabled={
								! customReady ||
								report.loading ||
								!! report.error
							}
							onClick={ exportCsv }
						>
							{ __(
								'Export CSV',
								'productboxes-mix-and-match-box-builder'
							) }
						</Button>
					}
				/>
				<div className="mmbb-analytics-filters">
					<ToggleGroupControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						className="mmbb-analytics-period"
						label={ __(
							'Period',
							'productboxes-mix-and-match-box-builder'
						) }
						hideLabelFromVision
						value={ range }
						onChange={ setRange }
						isBlock
					>
						{ [
							[
								'today',
								__(
									'Today',
									'productboxes-mix-and-match-box-builder'
								),
							],
							[
								'7d',
								__(
									'7 days',
									'productboxes-mix-and-match-box-builder'
								),
							],
							[
								'30d',
								__(
									'30 days',
									'productboxes-mix-and-match-box-builder'
								),
							],
							[
								'90d',
								__(
									'90 days',
									'productboxes-mix-and-match-box-builder'
								),
							],
							[
								'custom',
								__(
									'Custom',
									'productboxes-mix-and-match-box-builder'
								),
							],
						].map( ( option ) => (
							<ToggleGroupControlOption
								key={ option[ 0 ] }
								value={ option[ 0 ] }
								label={ option[ 1 ] }
							/>
						) ) }
					</ToggleGroupControl>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __(
							'Box',
							'productboxes-mix-and-match-box-builder'
						) }
						hideLabelFromVision
						value={ campaign }
						onChange={ setCampaign }
						options={ [
							{
								value: '0',
								label: __(
									'All boxes',
									'productboxes-mix-and-match-box-builder'
								),
							},
							...( campaigns.data?.items || [] ).map(
								( row ) => ( {
									value: String( row.id ),
									label: row.title,
								} )
							),
						] }
					/>
					<CheckboxControl
						__nextHasNoMarginBottom
						label={ __(
							'Compare to previous period',
							'productboxes-mix-and-match-box-builder'
						) }
						checked={ compare }
						onChange={ setCompare }
					/>
					{ range === 'custom' ? (
						<div className="mmbb-analytics-dates">
							<label htmlFor="mmbb-analytics-from">
								{ __(
									'From',
									'productboxes-mix-and-match-box-builder'
								) }
								<input
									id="mmbb-analytics-from"
									type="date"
									value={ from }
									onChange={ ( event ) =>
										setFrom( event.target.value )
									}
								/>
							</label>
							<label htmlFor="mmbb-analytics-to">
								{ __(
									'To',
									'productboxes-mix-and-match-box-builder'
								) }
								<input
									id="mmbb-analytics-to"
									type="date"
									value={ to }
									onChange={ ( event ) =>
										setTo( event.target.value )
									}
								/>
							</label>
						</div>
					) : null }
				</div>
				{ failure ? (
					<Notice status="error" isDismissible={ false }>
						{ errorMessage( failure ) }
						<Button
							variant="link"
							onClick={ () => {
								report.reload();
								campaigns.reload();
								setExportError( null );
							} }
						>
							{ __(
								'Try again',
								'productboxes-mix-and-match-box-builder'
							) }
						</Button>
					</Notice>
				) : null }
				{ report.loading ? (
					<PageSkeleton
						label={ __(
							'Loading analytics…',
							'productboxes-mix-and-match-box-builder'
						) }
					/>
				) : null }
				{ ! customReady ? (
					<p role="status">
						{ __(
							'Choose a start and end date.',
							'productboxes-mix-and-match-box-builder'
						) }
					</p>
				) : null }
				{ data && ! report.loading && ! report.error ? (
					<>
						<StatGroup
							label={ __(
								'Key numbers',
								'productboxes-mix-and-match-box-builder'
							) }
						>
							<StatCard
								label={ __(
									'Box revenue',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ money( data.kpis.revenue.value ) }
								delta={
									compare
										? signedNumber(
												difference( 'revenue' ),
												money
										  )
										: null
								}
							/>
							<StatCard
								label={ __(
									'Boxes sold',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ formatCount(
									data.kpis.boxes.value,
									locale
								) }
								delta={
									compare
										? signedNumber(
												difference( 'boxes' ),
												( value ) =>
													formatCount( value, locale )
										  )
										: null
								}
							/>
							<StatCard
								label={ __(
									'Items per box',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ Number(
									data.kpis.items_per_box.value
								).toLocaleString( locale, {
									maximumFractionDigits: 1,
								} ) }
								note={ __(
									'average',
									'productboxes-mix-and-match-box-builder'
								) }
							/>
							<StatCard
								label={ __(
									'Discount given',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ money( data.kpis.discount.value ) }
								note={
									data.kpis.revenue.value +
										data.kpis.discount.value >
									0
										? sprintf(
												/* translators: %s: Average discount percentage. */ __(
													'%s average',
													'productboxes-mix-and-match-box-builder'
												),
												formatPercent(
													( 100 *
														data.kpis.discount
															.value ) /
														( data.kpis.revenue
															.value +
															data.kpis.discount
																.value ),
													locale
												)
										  )
										: null
								}
							/>
						</StatGroup>
						<section
							className="mmbb-app-card"
							aria-labelledby="mmbb-analytics-revenue"
						>
							<div className="mmbb-app-card__head">
								<div>
									<h2 id="mmbb-analytics-revenue">
										{ __(
											'Revenue from boxes',
											'productboxes-mix-and-match-box-builder'
										) }
									</h2>
									<p className="mmbb-app-muted">
										{ periodLabel( data, locale ) }
									</p>
								</div>
							</div>
							<div className="mmbb-app-card__body">
								<LineChart
									height={ 280 }
									ariaLabel={ __(
										'Revenue from boxes, daily',
										'productboxes-mix-and-match-box-builder'
									) }
									labels={ data.series.map( ( row ) =>
										formatShortDate(
											row.date + 'T12:00:00Z',
											{ locale, timezone: 'UTC' }
										)
									) }
									series={ [
										{
											name: __(
												'This period',
												'productboxes-mix-and-match-box-builder'
											),
											data: data.series.map(
												( row ) => row.revenue
											),
											color: 'chart-1',
											area: true,
											label: true,
										},
										...( data.compare
											? [
													{
														name: __(
															'Previous period',
															'productboxes-mix-and-match-box-builder'
														),
														data: data.series.map(
															( row ) =>
																row.previous
														),
														color: 'chart-muted',
													},
											  ]
											: [] ),
									] }
									formatValue={ money }
									formatTick={ money }
								/>
							</div>
						</section>
						<div className="mmbb-analytics-split">
							<section
								className="mmbb-app-card"
								aria-labelledby="mmbb-analytics-journey"
							>
								<div className="mmbb-app-card__head">
									<div>
										<h2 id="mmbb-analytics-journey">
											{ __(
												'Shopper journey',
												'productboxes-mix-and-match-box-builder'
											) }
										</h2>
										<p className="mmbb-app-muted">
											{ __(
												'Visits that opened a box builder',
												'productboxes-mix-and-match-box-builder'
											) }
										</p>
									</div>
								</div>
								<div className="mmbb-app-card__body">
									<Journey
										rows={ data.funnel }
										locale={ locale }
									/>
								</div>
							</section>
							<section
								className="mmbb-app-card"
								aria-labelledby="mmbb-analytics-products"
							>
								<div className="mmbb-app-card__head">
									<div>
										<h2 id="mmbb-analytics-products">
											{ __(
												'Most picked products',
												'productboxes-mix-and-match-box-builder'
											) }
										</h2>
										<p className="mmbb-app-muted">
											{ __(
												'Times added to a box',
												'productboxes-mix-and-match-box-builder'
											) }
										</p>
									</div>
								</div>
								<div className="mmbb-app-card__body">
									<Bars
										rows={ data.top_products }
										locale={ locale }
									/>
								</div>
							</section>
						</div>
						<section
							className="mmbb-app-card"
							aria-labelledby="mmbb-analytics-boxes"
						>
							<div className="mmbb-app-card__head">
								<h2 id="mmbb-analytics-boxes">
									{ __(
										'By box',
										'productboxes-mix-and-match-box-builder'
									) }
								</h2>
							</div>
							<DataTable
								columns={ columns }
								rows={ data.campaigns }
								caption={ __(
									'Box performance',
									'productboxes-mix-and-match-box-builder'
								) }
								rowKey={ ( row ) =>
									row.deleted ? 'deleted' : row.id
								}
								emptyMessage={ __(
									'No activity in this period.',
									'productboxes-mix-and-match-box-builder'
								) }
							/>
						</section>
					</>
				) : null }
			</div>
		</Shell>
	);
}
