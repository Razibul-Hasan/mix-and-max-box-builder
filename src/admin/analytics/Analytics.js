import { useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	BarList,
	Button,
	Card,
	Checkbox,
	DataTable,
	FunnelChart,
	LineChart,
	Notice,
	PageHeader,
	SegmentedControl,
	SelectField,
	StatCard,
	TextField,
	useMoney,
} from '../../components';
import { getAnalytics, exportAnalytics, getCampaigns } from '../api';
import { useRequest, errorMessage } from '../hooks';
import { formatCount, formatPercent, formatShortDate } from '../format';
import { useAdmin } from '../context';
import Shell from '../Shell';
import './analytics.css';
import { tierLabel } from '../../shared/tiers';

const funnelLabels = () => ( {
	view: __( 'Viewed builder', 'mix-and-max-box-builder' ),
	started: __( 'Added first item', 'mix-and-max-box-builder' ),
	tier_reached: __( 'Reached a tier', 'mix-and-max-box-builder' ),
	add_to_cart: __( 'Added box to cart', 'mix-and-max-box-builder' ),
	purchased: __( 'Purchased', 'mix-and-max-box-builder' ),
} );

function stopLabel( row, money, decimals ) {
	if ( row.other ) {
		return __( 'Other', 'mix-and-max-box-builder' );
	}
	if ( ! row.qty ) {
		return __( 'No tier', 'mix-and-max-box-builder' );
	}
	const count = sprintf(
		/* translators: %d: Tier item count. */ _n(
			'%d item tier',
			'%d item tier',
			row.qty,
			'mix-and-max-box-builder'
		),
		row.qty
	);
	if ( ! row.tier?.discount_type ) {
		return count;
	}
	return sprintf(
		/* translators: 1: Tier item count label, 2: Discount label. */ __(
			'%1$s \u00b7 %2$s',
			'mix-and-max-box-builder'
		),
		count,
		tierLabel( row.tier, money, ( amount ) =>
			Math.round( amount * Math.pow( 10, decimals ) )
		)
	);
}

function periodLabel( data, locale ) {
	const date = ( value ) =>
		formatShortDate( value + 'T12:00:00Z', { locale, timezone: 'UTC' } );
	if ( ! data.compare ) {
		return sprintf(
			/* translators: 1: First date, 2: Last date. */ __(
				'Daily: %1$s to %2$s',
				'mix-and-max-box-builder'
			),
			date( data.from ),
			date( data.to )
		);
	}
	const previousEnd = new Date( data.from + 'T12:00:00Z' );
	previousEnd.setUTCDate( previousEnd.getUTCDate() - 1 );
	const previousStart = new Date( data.from + 'T12:00:00Z' );
	previousStart.setUTCDate( previousStart.getUTCDate() - data.series.length );
	return sprintf(
		/* translators: 1: Current start, 2: Current end, 3: Previous start, 4: Previous end. */ __(
			'Daily: %1$s to %2$s vs %3$s to %4$s',
			'mix-and-max-box-builder'
		),
		date( data.from ),
		date( data.to ),
		date( previousStart.toISOString().slice( 0, 10 ) ),
		date( previousEnd.toISOString().slice( 0, 10 ) )
	);
}

export default function Analytics() {
	const { locale, money: moneySettings } = useAdmin();
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
	const labels = funnelLabels();
	const exportCsv = async () => {
		setExporting( true );
		setExportError( null );
		try {
			await exportAnalytics( params );
		} catch ( error ) {
			setExportError( error );
		}
		setExporting( false );
	};
	const metrics = [
		{
			key: 'revenue',
			label: __( 'Box revenue', 'mix-and-max-box-builder' ),
			format: money,
		},
		{
			key: 'boxes',
			label: __( 'Boxes sold', 'mix-and-max-box-builder' ),
			format: ( value ) => formatCount( value, locale ),
		},
		{
			key: 'items_per_box',
			label: __( 'Avg. items per box', 'mix-and-max-box-builder' ),
			format: ( value ) =>
				Number( value ).toLocaleString( locale, {
					maximumFractionDigits: 1,
				} ),
		},
		{
			key: 'discount',
			label: __( 'Discount given', 'mix-and-max-box-builder' ),
			format: money,
		},
	];
	const columns = [
		{ key: 'name', label: __( 'Campaign', 'mix-and-max-box-builder' ) },
		{
			key: 'views',
			label: __( 'Builder views', 'mix-and-max-box-builder' ),
			numeric: true,
		},
		{
			key: 'started',
			label: __( 'Started a box', 'mix-and-max-box-builder' ),
			numeric: true,
		},
		{
			key: 'boxes',
			label: __( 'Boxes sold', 'mix-and-max-box-builder' ),
			numeric: true,
		},
		{
			key: 'conversion',
			label: __( 'Conversion', 'mix-and-max-box-builder' ),
			numeric: true,
			render: ( row ) => formatPercent( row.conversion, locale ),
		},
		{
			key: 'avg_box_value',
			label: __( 'Avg. box value', 'mix-and-max-box-builder' ),
			numeric: true,
			render: ( row ) => money( row.avg_box_value ),
		},
		{
			key: 'revenue',
			label: __( 'Revenue', 'mix-and-max-box-builder' ),
			numeric: true,
			render: ( row ) => money( row.revenue ),
		},
	];
	const failure = report.error || campaigns.error || exportError;
	return (
		<Shell active="analytics">
			<div className="mmbb-dash__bar">
				<PageHeader
					title={ __( 'Analytics', 'mix-and-max-box-builder' ) }
					subtitle={ __(
						'What sells in boxes, and where shoppers drop off.',
						'mix-and-max-box-builder'
					) }
				/>
				<Button
					icon="download"
					disabled={
						! customReady || report.loading || !! report.error
					}
					loading={ exporting }
					onClick={ exportCsv }
				>
					{ __( 'Export CSV', 'mix-and-max-box-builder' ) }
				</Button>
			</div>
			<div className="mmbb-analytics-filters">
				<SegmentedControl
					label={ __( 'Date range', 'mix-and-max-box-builder' ) }
					options={ [
						{
							value: 'today',
							label: __( 'Today', 'mix-and-max-box-builder' ),
						},
						...[ 7, 30, 90 ].map( ( days ) => ( {
							value: days + 'd',
							label: sprintf(
								/* translators: %d: Number of days. */ __(
									'%d days',
									'mix-and-max-box-builder'
								),
								days
							),
						} ) ),
						{
							value: 'custom',
							label: __( 'Custom', 'mix-and-max-box-builder' ),
						},
					] }
					value={ range }
					onChange={ setRange }
				/>
				<SelectField
					aria-label={ __( 'Campaign', 'mix-and-max-box-builder' ) }
					value={ campaign }
					onChange={ ( event ) => setCampaign( event.target.value ) }
					options={ [
						{
							value: '0',
							label: __(
								'All campaigns',
								'mix-and-max-box-builder'
							),
						},
						...( campaigns.data?.items || [] ).map( ( row ) => ( {
							value: String( row.id ),
							label: row.title,
						} ) ),
					] }
				/>
				<Checkbox
					label={ __(
						'Compare to previous period',
						'mix-and-max-box-builder'
					) }
					checked={ compare }
					onChange={ setCompare }
				/>
				{ range === 'custom' && (
					<>
						<TextField
							type="date"
							label={ __( 'From', 'mix-and-max-box-builder' ) }
							value={ from }
							onChange={ ( event ) =>
								setFrom( event.target.value )
							}
						/>
						<TextField
							type="date"
							label={ __( 'To', 'mix-and-max-box-builder' ) }
							value={ to }
							onChange={ ( event ) =>
								setTo( event.target.value )
							}
						/>
					</>
				) }
			</div>
			{ failure && (
				<Notice
					tone="alert"
					title={ __(
						'Could not load analytics',
						'mix-and-max-box-builder'
					) }
				>
					{ errorMessage( failure ) }
					<Button
						onClick={ () => {
							report.reload();
							campaigns.reload();
							setExportError( null );
						} }
					>
						{ __( 'Try again', 'mix-and-max-box-builder' ) }
					</Button>
				</Notice>
			) }
			{ report.loading && (
				<p role="status">
					{ __(
						'Loading analytics\u2026',
						'mix-and-max-box-builder'
					) }
				</p>
			) }
			{ ! customReady && (
				<p role="status">
					{ __(
						'Choose a start and end date.',
						'mix-and-max-box-builder'
					) }
				</p>
			) }
			{ data && ! report.loading && ! report.error && (
				<div className="mmbb-dash__stack">
					<div className="mmbb-dash__kpis">
						{ metrics.map( ( metric ) => (
							<StatCard
								key={ metric.key }
								label={ metric.label }
								value={ metric.format(
									data.kpis[ metric.key ].value
								) }
								delta={
									data.kpis[ metric.key ].delta === null
										? null
										: Math.round(
												data.kpis[ metric.key ].delta *
													10
										  ) / 10
								}
								trend={ data.kpis[ metric.key ].series }
								upIsGood={ metric.key !== 'discount' }
							/>
						) ) }
					</div>
					<Card
						title={ __(
							'Revenue from boxes',
							'mix-and-max-box-builder'
						) }
						subtitle={ periodLabel( data, locale ) }
					>
						<LineChart
							height={ 280 }
							ariaLabel={ __(
								'Revenue from boxes, daily',
								'mix-and-max-box-builder'
							) }
							labels={ data.series.map( ( row ) =>
								formatShortDate( row.date + 'T12:00:00Z', {
									locale,
									timezone: 'UTC',
								} )
							) }
							series={ [
								{
									name: __(
										'This period',
										'mix-and-max-box-builder'
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
													'mix-and-max-box-builder'
												),
												data: data.series.map(
													( row ) => row.previous
												),
												color: 'chart-muted',
											},
									  ]
									: [] ),
							] }
							formatValue={ money }
							formatTick={ money }
						/>
					</Card>
					<div className="mmbb-analytics-split">
						<Card
							title={ __(
								'Builder funnel',
								'mix-and-max-box-builder'
							) }
							subtitle={ __(
								'Sessions that opened a builder',
								'mix-and-max-box-builder'
							) }
						>
							<FunnelChart
								steps={ data.funnel.map( ( row ) => ( {
									label: labels[ row.step ],
									value: row.count,
								} ) ) }
							/>
						</Card>
						<div className="mmbb-dash__stack">
							<Card
								title={ __(
									'Most-picked products',
									'mix-and-max-box-builder'
								) }
								subtitle={ __(
									'Times added to a box',
									'mix-and-max-box-builder'
								) }
							>
								<BarList
									items={ data.top_products.map(
										( row ) => ( {
											label: row.name,
											value: row.count,
										} )
									) }
								/>
							</Card>
							<Card
								title={ __(
									'Where boxes stop',
									'mix-and-max-box-builder'
								) }
								subtitle={ __(
									'Share of purchased boxes by the tier they reached',
									'mix-and-max-box-builder'
								) }
							>
								<BarList
									max={ 100 }
									formatValue={ ( value ) =>
										formatPercent( value, locale )
									}
									items={ data.tier_distribution.map(
										( row ) => ( {
											label: stopLabel(
												row,
												money,
												moneySettings.decimals
											),
											value: row.share,
										} )
									) }
								/>
							</Card>
						</div>
					</div>
					<Card
						title={ __(
							'Campaign performance',
							'mix-and-max-box-builder'
						) }
						padding="none"
					>
						<DataTable
							columns={ columns }
							rows={ data.campaigns }
							empty={ __(
								'No activity in this period.',
								'mix-and-max-box-builder'
							) }
						/>
					</Card>
				</div>
			) }
		</Shell>
	);
}
