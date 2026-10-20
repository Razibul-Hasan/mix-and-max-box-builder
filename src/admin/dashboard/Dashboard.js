import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Badge,
	BarList,
	Button,
	Card,
	Countdown,
	DataTable,
	EmptyState,
	Icon,
	LineChart,
	Notice,
	PageHeader,
	ProgressBar,
	SegmentedControl,
	StatCard,
	useMoney,
} from '../../components';
import { formatCompact } from '../../components/utils';
import { createMoneyFormatter } from '../../utils/money';
import { getCampaigns, getSetup, getStats, markTestDone } from '../api';
import { copyText } from '../copy-text';
import { RANGES } from '../constants';
import { useAdmin } from '../context';
import CampaignThumbs, { useProductImages } from '../CampaignThumbs';
import {
	formatCount,
	formatPercent,
	formatShortDate,
	isLive,
	statusInfo,
	tierSummary,
	typeSummary,
} from '../format';
import { errorMessage, readStored, useRequest, writeStored } from '../hooks';
import Shell from '../Shell';
import TemplatePicker from '../TemplatePicker';
import { useToast } from '../toast';
import SetupChecklist, {
	nextHint,
	progress,
	remainingTitle,
} from './SetupChecklist';

const DISMISS_KEY = 'mmbb:checklist-dismissed';

const rangeLabel = ( range ) => {
	const days = parseInt( range, 10 );
	return sprintf(
		/* translators: %d: Number of days. */
		__( '%d days', 'mix-and-max-box-builder' ),
		days
	);
};

// Sparklines and the chart read plain numbers, so minor units become major ones.
const toMajor = ( minor, decimals ) => minor / Math.pow( 10, decimals );

export default function Dashboard() {
	const { urls, locale, money } = useAdmin();
	const formatMoney = useMoney();
	const toast = useToast();
	const [ range, setRange ] = useState( '30d' );
	const [ picker, setPicker ] = useState( false );
	const [ saving, setSaving ] = useState( false );
	const [ dismissed, setDismissed ] = useState(
		readStored( DISMISS_KEY, '' ) === '1'
	);

	const stats = useRequest( () => getStats( range ), [ range ] );
	const setup = useRequest( () => getSetup(), [] );
	const campaigns = useRequest(
		() => getCampaigns( { orderby: 'revenue', per_page: 50 } ),
		[]
	);
	const items = campaigns.data ? campaigns.data.items : [];
	const live = items.filter( ( c ) => isLive( c.status ) );
	const top = live.slice( 0, 3 );
	const images = useProductImages( top );

	const failed = stats.error || setup.error || campaigns.error;
	const ready = stats.data && setup.data && campaigns.data;
	const reloadAll = () => {
		stats.reload();
		setup.reload();
		campaigns.reload();
	};

	const copyShortcode = ( campaign ) => {
		copyText( campaign.placement.shortcode ).then( ( ok ) =>
			toast(
				ok
					? __( 'Shortcode copied', 'mix-and-max-box-builder' )
					: __(
							'Could not copy. Select the shortcode and copy it.',
							'mix-and-max-box-builder'
					  )
			)
		);
	};

	const testDone = () => {
		setSaving( true );
		markTestDone()
			.then( () => setup.reload() )
			.catch( ( e ) =>
				toast(
					errorMessage(
						e,
						__( 'That did not save.', 'mix-and-max-box-builder' )
					)
				)
			)
			.then( () => setSaving( false ) );
	};

	const dismiss = () => {
		writeStored( DISMISS_KEY, '1' );
		setDismissed( true );
	};

	const checklist = ( layout ) => (
		<SetupChecklist
			setup={ setup.data }
			campaign={ items[ 0 ] }
			layout={ layout }
			busy={ saving }
			onCreate={ () => setPicker( true ) }
			onCopy={ copyShortcode }
			onTestDone={ testDone }
		/>
	);

	const common = (
		<>
			{ failed ? (
				<Notice
					tone="critical"
					title={ __(
						'The dashboard could not load',
						'mix-and-max-box-builder'
					) }
					action={
						<Button size="sm" onClick={ reloadAll }>
							{ __( 'Retry', 'mix-and-max-box-builder' ) }
						</Button>
					}
				>
					{ errorMessage( failed, '' ) }
				</Notice>
			) : null }
			{ picker ? (
				<TemplatePicker onClose={ () => setPicker( false ) } />
			) : null }
		</>
	);

	if ( ! ready ) {
		return (
			<Shell active="dashboard" viewStore>
				<PageHeader
					title={ __( 'Dashboard', 'mix-and-max-box-builder' ) }
				/>
				{ common }
				{ ! failed ? (
					<Card>
						<p role="status" className="mmbb-muted">
							{ __(
								'Loading your dashboard…',
								'mix-and-max-box-builder'
							) }
						</p>
					</Card>
				) : null }
			</Shell>
		);
	}

	const kpis = stats.data.kpis;
	const firstRun = kpis.boxes.value + kpis.boxes.previous === 0;
	const steps = progress( setup.data );

	if ( firstRun ) {
		return (
			<Shell active="dashboard" viewStore>
				<PageHeader
					title={ __(
						'Welcome to Mix and Max',
						'mix-and-max-box-builder'
					) }
					subtitle={ __(
						'Let shoppers build their own box. Most stores go live in under 5 minutes.',
						'mix-and-max-box-builder'
					) }
				/>
				{ common }
				<div className="mmbb-dash__split">
					<div className="mmbb-dash__main">
						<Card padding="none">
							<EmptyState
								icon="box"
								title={ __(
									'Launch your first box',
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Pick the products, set the discount tiers, drop the builder on a page. Start blank or from a ready-made template.',
									'mix-and-max-box-builder'
								) }
								action={
									<Button
										variant="max"
										icon="plus"
										href={ urls.newCampaign }
									>
										{ __(
											'Create campaign',
											'mix-and-max-box-builder'
										) }
									</Button>
								}
								secondaryAction={
									<Button
										icon="layers"
										href={ urls.newCampaign }
									>
										{ __(
											'Start from a template',
											'mix-and-max-box-builder'
										) }
									</Button>
								}
							/>
						</Card>
						<section className="mmbb-howto">
							<h2 className="mmbb-howto__title">
								{ __(
									'How a box campaign works',
									'mix-and-max-box-builder'
								) }
							</h2>
							<div className="mmbb-howto__grid">
								<div className="mmbb-howto__step">
									<span className="mmbb-howto__icon is-max">
										<Icon name="tag" size={ 22 } />
									</span>
									<b>
										{ __(
											'1. Pick products',
											'mix-and-max-box-builder'
										) }
									</b>
									<span>
										{ __(
											'Choose products, a category or a tag. Sold-out items hide themselves.',
											'mix-and-max-box-builder'
										) }
									</span>
								</div>
								<div className="mmbb-howto__step">
									<span className="mmbb-howto__icon is-pop">
										<Icon name="percent" size={ 22 } />
									</span>
									<b>
										{ __(
											'2. Set discount tiers',
											'mix-and-max-box-builder'
										) }
									</b>
									<span>
										{ __(
											'4 items 10% off, 6 items 15%, 12 items 25%. Shoppers see what the next item unlocks.',
											'mix-and-max-box-builder'
										) }
									</span>
								</div>
								<div className="mmbb-howto__step">
									<span className="mmbb-howto__icon is-ink">
										<Icon name="layers" size={ 22 } />
									</span>
									<b>
										{ __(
											'3. Place it on a page',
											'mix-and-max-box-builder'
										) }
									</b>
									<span>
										{ __(
											'Add the Box Builder block or paste a shortcode. The box goes to the cart as one line.',
											'mix-and-max-box-builder'
										) }
									</span>
								</div>
							</div>
						</section>
					</div>
					<div className="mmbb-dash__side">
						<Card
							title={ __(
								'Get set up',
								'mix-and-max-box-builder'
							) }
							subtitle={ __(
								'Your progress is saved as you go.',
								'mix-and-max-box-builder'
							) }
						>
							<div className="mmbb-dash__stack">
								<ProgressBar
									label={ __(
										'Setup',
										'mix-and-max-box-builder'
									) }
									valueLabel={ sprintf(
										/* translators: 1: Steps done, 2: Total steps. */
										__(
											'%1$d of %2$d done',
											'mix-and-max-box-builder'
										),
										steps.done,
										steps.total
									) }
									value={ steps.done }
									max={ steps.total }
									tone="max"
								/>
								{ checklist( 'stack' ) }
							</div>
						</Card>
						<Notice
							tone="info"
							title={ __(
								'Your numbers show up here',
								'mix-and-max-box-builder'
							) }
						>
							{ __(
								'Once your first box sells, this page shows revenue, boxes sold and what shoppers pick most.',
								'mix-and-max-box-builder'
							) }
						</Notice>
					</div>
				</div>
			</Shell>
		);
	}

	// ---- Active state: boxes have sold ----
	const decimals = money.decimals;
	const whole = createMoneyFormatter( { ...money, decimals: 0 } );
	const bigMoney = ( minor ) =>
		minor >= 1000 * Math.pow( 10, decimals )
			? whole( Math.round( toMajor( minor, decimals ) ) )
			: formatMoney( minor );
	const symbol = money.symbol || '';
	const delta = ( kpi ) =>
		kpi.delta === null || kpi.delta === undefined
			? null
			: Math.round( kpi.delta * 10 ) / 10;
	const series = stats.data.revenue_series;
	const labels = series.map( ( d ) =>
		formatShortDate( d.date + 'T12:00:00Z', { locale, timezone: 'UTC' } )
	);
	const showChecklist = ! setup.data.complete && ! dismissed;
	const liveCampaign =
		live.find(
			( c ) =>
				stats.data.live_campaign && c.id === stats.data.live_campaign.id
		) || live[ 0 ];
	const liveStats = stats.data.live_campaign || {};
	const end = liveCampaign && liveCampaign.config.schedule.end;
	const tiers = liveCampaign ? tierSummary( liveCampaign.config ) : '';

	const topRows = top.map( ( c ) => ( { ...c, id: c.id } ) );
	const topColumns = [
		{
			key: 'title',
			label: __( 'Campaign', 'mix-and-max-box-builder' ),
			render: ( c ) => (
				<div className="mmbb-campaign-cell">
					<CampaignThumbs campaign={ c } images={ images } />
					<span>
						<span className="mmbb-cell-title">{ c.title }</span>
						<span className="mmbb-cell-meta">
							{ typeSummary( c.config, formatMoney, decimals ) }
						</span>
					</span>
				</div>
			),
		},
		{
			key: 'status',
			label: __( 'Status', 'mix-and-max-box-builder' ),
			render: ( c ) => {
				const info = statusInfo( c.status );
				return (
					<Badge tone={ info.tone } dot>
						{ info.label }
					</Badge>
				);
			},
		},
		{
			key: 'boxes',
			label: __( 'Boxes', 'mix-and-max-box-builder' ),
			numeric: true,
			render: ( c ) => formatCount( c.stats.boxes_sold, locale ),
		},
		{
			key: 'revenue',
			label: __( 'Revenue', 'mix-and-max-box-builder' ),
			numeric: true,
			render: ( c ) => formatMoney( c.stats.revenue ),
		},
	];

	const picks = stats.data.top_products.map( ( p ) => ( {
		label: p.name,
		value: p.count,
		meta: p.note || undefined,
	} ) );

	return (
		<Shell active="dashboard" viewStore>
			<div className="mmbb-dash__bar">
				<PageHeader
					title={ __( 'Dashboard', 'mix-and-max-box-builder' ) }
					subtitle={ sprintf(
						/* translators: %d: Number of days. */
						__(
							'All campaigns · last %d days',
							'mix-and-max-box-builder'
						),
						parseInt( range, 10 )
					) }
				/>
				<div className="mmbb-dash__controls">
					<SegmentedControl
						label={ __( 'Date range', 'mix-and-max-box-builder' ) }
						options={ RANGES.map( ( value ) => ( {
							value,
							label: rangeLabel( value ),
						} ) ) }
						value={ range }
						onChange={ setRange }
					/>
					<Button
						variant="primary"
						icon="plus"
						href={ urls.newCampaign }
					>
						{ __( 'Create campaign', 'mix-and-max-box-builder' ) }
					</Button>
				</div>
			</div>
			{ common }
			<div
				className={
					'mmbb-dash__stack' + ( stats.loading ? ' is-loading' : '' )
				}
				aria-busy={ stats.loading }
			>
				{ showChecklist ? (
					<Card>
						<div className="mmbb-dash__intro">
							<div className="mmbb-dash__intro-text">
								<h2 className="mmbb-dash__intro-title">
									{ remainingTitle( steps.remaining ) }
								</h2>
								<p>{ nextHint( setup.data.next ) }</p>
								<ProgressBar
									label={ __(
										'Setup',
										'mix-and-max-box-builder'
									) }
									valueLabel={ sprintf(
										/* translators: 1: Steps done, 2: Total steps. */
										__(
											'%1$d of %2$d done',
											'mix-and-max-box-builder'
										),
										steps.done,
										steps.total
									) }
									value={ steps.done }
									max={ steps.total }
									tone="max"
								/>
								<Button
									size="sm"
									variant="ghost"
									onClick={ dismiss }
								>
									{ __(
										'Hide checklist',
										'mix-and-max-box-builder'
									) }
								</Button>
							</div>
							{ checklist( 'wide' ) }
						</div>
					</Card>
				) : null }

				<div className="mmbb-dash__kpis">
					<StatCard
						label={ __( 'Box revenue', 'mix-and-max-box-builder' ) }
						value={ bigMoney( kpis.revenue.value ) }
						delta={ delta( kpis.revenue ) }
						trend={ kpis.revenue.series }
					/>
					<StatCard
						label={ __( 'Boxes sold', 'mix-and-max-box-builder' ) }
						value={ formatCount( kpis.boxes.value, locale ) }
						delta={ delta( kpis.boxes ) }
						trend={ kpis.boxes.series }
					/>
					<StatCard
						label={ __(
							'Avg. box value',
							'mix-and-max-box-builder'
						) }
						value={ formatMoney( kpis.avg_box_value.value ) }
						delta={ delta( kpis.avg_box_value ) }
						trend={ kpis.avg_box_value.series }
					/>
					<StatCard
						label={ __(
							'Builder conversion',
							'mix-and-max-box-builder'
						) }
						value={ formatPercent( kpis.conversion.value, locale ) }
						delta={ delta( kpis.conversion ) }
						trend={ kpis.conversion.series }
					/>
				</div>

				<div className="mmbb-dash__split">
					<div className="mmbb-dash__main">
						<Card>
							<div className="mmbb-dash__card-head">
								<div>
									<h3 className="mmbb-dash__card-title">
										{ __(
											'Revenue from boxes',
											'mix-and-max-box-builder'
										) }
									</h3>
									<p className="mmbb-dash__card-sub">
										{ __(
											'Daily, this period vs previous',
											'mix-and-max-box-builder'
										) }
									</p>
								</div>
								<Button
									size="sm"
									variant="ghost"
									iconRight="arrowRight"
									href={ urls.analytics }
								>
									{ __(
										'Analytics',
										'mix-and-max-box-builder'
									) }
								</Button>
							</div>
							<LineChart
								labels={ labels }
								height={ 250 }
								ariaLabel={ __(
									'Revenue from boxes, daily',
									'mix-and-max-box-builder'
								) }
								series={ [
									{
										name: __(
											'This period',
											'mix-and-max-box-builder'
										),
										color: 'chart-1',
										area: true,
										label: true,
										data: series.map( ( d ) =>
											toMajor( d.current, decimals )
										),
									},
									{
										name: __(
											'Previous period',
											'mix-and-max-box-builder'
										),
										color: 'chart-muted',
										data: series.map( ( d ) =>
											toMajor( d.previous, decimals )
										),
									},
								] }
								formatValue={ ( v ) =>
									formatMoney(
										Math.round(
											v * Math.pow( 10, decimals )
										)
									)
								}
								formatTick={ ( v ) =>
									formatCompact( v, symbol )
								}
							/>
						</Card>

						<Card padding="none">
							<div className="mmbb-dash__table-head">
								<h3 className="mmbb-dash__card-title">
									{ __(
										'Top campaigns',
										'mix-and-max-box-builder'
									) }
								</h3>
								<Button
									size="sm"
									variant="ghost"
									iconRight="arrowRight"
									href={ urls.campaigns }
								>
									{ __(
										'All campaigns',
										'mix-and-max-box-builder'
									) }
								</Button>
							</div>
							<DataTable
								columns={ topColumns }
								rows={ topRows }
								empty={ __(
									'No campaign is live right now.',
									'mix-and-max-box-builder'
								) }
							/>
						</Card>
					</div>

					<div className="mmbb-dash__side">
						<Card>
							{ liveCampaign ? (
								<>
									<div className="mmbb-dash__live-head">
										<Badge tone="success" dot>
											{ __(
												'Live now',
												'mix-and-max-box-builder'
											) }
										</Badge>
										{ end ? (
											<Countdown
												endsAt={ end }
												tone="soft"
												label={ __(
													'Ends in',
													'mix-and-max-box-builder'
												) }
											/>
										) : null }
									</div>
									<p className="mmbb-dash__live-title">
										{ liveCampaign.title }
									</p>
									<p className="mmbb-muted">
										{ [
											typeSummary(
												liveCampaign.config,
												formatMoney,
												decimals
											),
											tiers,
										]
											.filter( Boolean )
											.join( ' · ' ) }
									</p>
									<div className="mmbb-dash__live-stats">
										<div>
											<span>
												{ __(
													'Boxes today',
													'mix-and-max-box-builder'
												) }
											</span>
											<b>
												{ formatCount(
													liveStats.boxes_today,
													locale
												) }
											</b>
										</div>
										<div>
											<span>
												{ __(
													'Conversion',
													'mix-and-max-box-builder'
												) }
											</span>
											<b>
												{ formatPercent(
													liveStats.conversion,
													locale
												) }
											</b>
										</div>
									</div>
									<div className="mmbb-dash__live-actions">
										<Button
											variant="primary"
											icon="edit"
											href={ liveCampaign.edit_url }
										>
											{ __(
												'Edit',
												'mix-and-max-box-builder'
											) }
										</Button>
										{ liveCampaign.placement.page_url ? (
											<Button
												icon="eye"
												href={
													liveCampaign.placement
														.page_url
												}
												target="_blank"
												rel="noopener noreferrer"
											>
												{ __(
													'View on store',
													'mix-and-max-box-builder'
												) }
											</Button>
										) : null }
									</div>
								</>
							) : (
								<>
									<p className="mmbb-dash__live-title">
										{ __(
											'Nothing is live right now',
											'mix-and-max-box-builder'
										) }
									</p>
									<p className="mmbb-muted">
										{ __(
											'Go live with a campaign to see its countdown and today’s boxes here.',
											'mix-and-max-box-builder'
										) }
									</p>
									<div className="mmbb-dash__live-actions">
										<Button href={ urls.campaigns }>
											{ __(
												'View campaigns',
												'mix-and-max-box-builder'
											) }
										</Button>
									</div>
								</>
							) }
						</Card>
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
							{ picks.length > 0 ? (
								<BarList items={ picks } />
							) : (
								<p className="mmbb-muted">
									{ __(
										'Products show up here once shoppers start building boxes.',
										'mix-and-max-box-builder'
									) }
								</p>
							) }
						</Card>
					</div>
				</div>
			</div>
		</Shell>
	);
}
