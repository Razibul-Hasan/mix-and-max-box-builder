import { Button, Notice, Spinner } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { plus } from '@wordpress/icons';
import { useMoney } from '../../components';
import {
	dismissChecklist,
	getCampaigns,
	getSetup,
	getStats,
	markTestDone,
} from '../api';
import CreateBoxModal from '../campaigns/CreateBoxModal';
import { useProductImages } from '../CampaignThumbs';
import {
	BoxThumbs,
	DataTable,
	EmptyState,
	PageHeader,
	StatCard,
	StatGroup,
	StatusBadge,
} from '../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../components/wp';
import { RANGES } from '../constants';
import { useAdmin } from '../context';
import { boxDetails, formatCount, formatPercent } from '../format';
import { errorMessage, readStored, useRequest } from '../hooks';
import Shell from '../Shell';
import SetupChecklist, { progress } from './SetupChecklist';

// 1.0 hid the checklist in this browser only. Carried over to user meta once.
const LEGACY_DISMISS_KEY = 'mmbb:checklist-dismissed';
const BOXES_SHOWN = 5;
const PICKS_SHOWN = 5;

const days = ( range ) => parseInt( range, 10 );

/**
 * Home: setup checklist, the period's key numbers, your boxes and the most
 * picked products. Data from GET /stats, GET /setup and GET /campaigns.
 */
export default function Dashboard() {
	const { urls, locale } = useAdmin();
	const formatMoney = useMoney();
	const [ range, setRange ] = useState( '30d' );
	const [ creating, setCreating ] = useState( false );
	const [ saving, setSaving ] = useState( false );
	const [ hidden, setHidden ] = useState( false );
	const [ actionError, setActionError ] = useState( '' );

	const stats = useRequest( () => getStats( range ), [ range ] );
	const setup = useRequest( () => getSetup(), [] );
	const boxes = useRequest(
		() => getCampaigns( { orderby: 'revenue', per_page: BOXES_SHOWN } ),
		[]
	);
	const items = boxes.data ? boxes.data.items : [];
	const images = useProductImages( items );

	// Carry a dismissal saved by 1.0 in localStorage over to the user's account.
	const setupData = setup.data;
	useEffect( () => {
		if (
			setupData &&
			! setupData.dismissed &&
			readStored( LEGACY_DISMISS_KEY, '' ) === '1'
		) {
			setHidden( true );
			dismissChecklist( true ).catch( () => {} );
		}
	}, [ setupData ] );

	const failed = [ stats, setup, boxes ].filter( ( r ) => r.error );
	const retry = () => failed.forEach( ( r ) => r.reload() );

	const dismiss = () => {
		setHidden( true );
		dismissChecklist( true ).catch( ( e ) => {
			setHidden( false );
			setActionError(
				errorMessage(
					e,
					__(
						'The checklist could not be hidden. Try again.',
						'productboxes-mix-and-match-box-builder'
					)
				)
			);
		} );
	};

	const testDone = () => {
		setSaving( true );
		setActionError( '' );
		markTestDone()
			.then( () => setup.reload() )
			.catch( ( e ) =>
				setActionError(
					errorMessage(
						e,
						__(
							'That did not save. Try again.',
							'productboxes-mix-and-match-box-builder'
						)
					)
				)
			)
			.then( () => setSaving( false ) );
	};

	const showChecklist =
		setupData &&
		! setupData.dismissed &&
		! hidden &&
		progress( setupData ).next !== null;

	// ---- Key numbers ----
	const kpis = stats.data ? stats.data.kpis : null;
	const period = days( range );
	const pending = <Spinner />;

	const signed = ( diff, format ) =>
		( diff > 0 ? '+' : '−' ) + format( Math.abs( diff ) );

	const change = ( kpi, format ) => {
		if ( ! kpi || kpi.previous === null || kpi.previous === undefined ) {
			return { text: null };
		}
		const diff = kpi.value - kpi.previous;
		if ( diff === 0 ) {
			return { text: null };
		}
		return {
			text: sprintf(
				/* translators: 1: Change such as +$184.45, 2: Number of days. */
				_n(
					'%1$s vs previous %2$d day',
					'%1$s vs previous %2$d days',
					period,
					'productboxes-mix-and-match-box-builder'
				),
				signed( diff, format ),
				period
			),
			tone: diff > 0 ? 'positive' : 'negative',
		};
	};

	const funnelCount = ( step ) => {
		const row = ( ( stats.data && stats.data.funnel ) || [] ).find(
			( f ) => f.step === step
		);
		return row ? row.count : 0;
	};

	const revenueChange = change( kpis && kpis.revenue, formatMoney );
	const boxesChange = change( kpis && kpis.boxes, ( n ) =>
		formatCount( n, locale )
	);
	const perBox = kpis ? kpis.items_per_box : null;
	const visits = funnelCount( 'view' );
	const orders = funnelCount( 'purchased' );

	// ---- Your boxes: this period's numbers per box ----
	const periodStats = {};
	( ( stats.data && stats.data.top_campaigns ) || [] ).forEach( ( row ) => {
		periodStats[ row.id ] = row;
	} );
	const sold = ( c ) =>
		periodStats[ c.id ] ? periodStats[ c.id ].boxes : 0;
	const revenue = ( c ) =>
		periodStats[ c.id ] ? periodStats[ c.id ].revenue : 0;

	const columns = [
		{
			key: 'title',
			label: __( 'Box', 'productboxes-mix-and-match-box-builder' ),
			render: ( c ) => (
				<div className="mmbb-app-box-cell">
					<BoxThumbs
						ids={
							( c.config.products && c.config.products.ids ) || []
						}
						images={ images }
						max={ 1 }
					/>
					<div>
						<b className="mmbb-app-box-cell__name">{ c.title }</b>
						<p className="mmbb-app-muted">
							{ boxDetails( c.config ) }
						</p>
					</div>
				</div>
			),
		},
		{
			key: 'status',
			label: __( 'Status', 'productboxes-mix-and-match-box-builder' ),
			render: ( c ) => <StatusBadge status={ c.status } />,
		},
		{
			key: 'sold',
			label: __( 'Sold', 'productboxes-mix-and-match-box-builder' ),
			numeric: true,
			render: ( c ) => formatCount( sold( c ), locale ),
		},
		{
			key: 'revenue',
			label: __( 'Revenue', 'productboxes-mix-and-match-box-builder' ),
			numeric: true,
			render: ( c ) => formatMoney( revenue( c ) ),
		},
		{
			key: 'actions',
			label: __( 'Actions', 'productboxes-mix-and-match-box-builder' ),
			hideLabel: true,
			render: ( c ) => (
				<div className="mmbb-app-row-actions">
					<Button
						__next40pxDefaultSize
						variant="secondary"
						href={ c.edit_url }
						label={ sprintf(
							/* translators: %s: Box name. */
							__(
								'Edit %s',
								'productboxes-mix-and-match-box-builder'
							),
							c.title
						) }
						showTooltip={ false }
					>
						{ __(
							'Edit',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				</div>
			),
		},
	];

	// ---- Most picked ----
	const picks = ( ( stats.data && stats.data.top_products ) || [] ).slice(
		0,
		PICKS_SHOWN
	);
	const most = picks.reduce( ( max, p ) => Math.max( max, p.count ), 0 );

	const createButton = (
		<Button
			__next40pxDefaultSize
			variant="primary"
			icon={ plus }
			onClick={ () => setCreating( true ) }
		>
			{ __( 'Create box', 'productboxes-mix-and-match-box-builder' ) }
		</Button>
	);

	const loadingRow = (
		<span className="mmbb-app-loading">
			<Spinner />
			{ __( 'Loading boxes…', 'productboxes-mix-and-match-box-builder' ) }
		</span>
	);

	return (
		<Shell active="dashboard">
			<div className="mmbb-app-stack">
				<PageHeader
					title={ __(
						'Dashboard',
						'productboxes-mix-and-match-box-builder'
					) }
					description={ sprintf(
						/* translators: %d: Number of days. */
						_n(
							'How your boxes did in the last %d day.',
							'How your boxes did in the last %d days.',
							period,
							'productboxes-mix-and-match-box-builder'
						),
						period
					) }
					actions={
						<>
							<ToggleGroupControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								className="mmbb-app-period"
								label={ __(
									'Period',
									'productboxes-mix-and-match-box-builder'
								) }
								hideLabelFromVision
								isBlock={ false }
								value={ range }
								onChange={ ( value ) =>
									value && setRange( value )
								}
							>
								{ RANGES.map( ( value ) => (
									<ToggleGroupControlOption
										key={ value }
										value={ value }
										label={ sprintf(
											/* translators: %d: Number of days. */
											_n(
												'%d day',
												'%d days',
												days( value ),
												'productboxes-mix-and-match-box-builder'
											),
											days( value )
										) }
									/>
								) ) }
							</ToggleGroupControl>
							{ createButton }
						</>
					}
				/>

				{ failed.length > 0 ? (
					<Notice
						status="error"
						isDismissible={ false }
						actions={ [
							{
								label: __(
									'Retry',
									'productboxes-mix-and-match-box-builder'
								),
								onClick: retry,
							},
						] }
					>
						{ errorMessage(
							failed[ 0 ].error,
							__(
								'Dashboard could not load.',
								'productboxes-mix-and-match-box-builder'
							)
						) }
					</Notice>
				) : null }
				{ actionError ? (
					<Notice
						status="warning"
						onRemove={ () => setActionError( '' ) }
					>
						{ actionError }
					</Notice>
				) : null }

				{ showChecklist ? (
					<SetupChecklist
						setup={ setupData }
						boxes={ items }
						busy={ saving }
						onCreate={ () => setCreating( true ) }
						onTestDone={ testDone }
						onDismiss={ dismiss }
					/>
				) : null }

				<div
					className={
						stats.loading && kpis ? 'is-loading' : undefined
					}
					aria-busy={ stats.loading }
				>
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
							value={
								kpis
									? formatMoney( kpis.revenue.value )
									: pending
							}
							delta={ revenueChange.text }
							tone={ revenueChange.tone }
						/>
						<StatCard
							label={ __(
								'Boxes sold',
								'productboxes-mix-and-match-box-builder'
							) }
							value={
								kpis
									? formatCount( kpis.boxes.value, locale )
									: pending
							}
							delta={ boxesChange.text }
							tone={ boxesChange.tone }
						/>
						<StatCard
							label={ __(
								'Average box value',
								'productboxes-mix-and-match-box-builder'
							) }
							value={
								kpis
									? formatMoney( kpis.avg_box_value.value )
									: pending
							}
							note={
								perBox && perBox.value > 0
									? sprintf(
											/* translators: %s: Average number of items in a box. */
											__(
												'%s items per box',
												'productboxes-mix-and-match-box-builder'
											),
											new Intl.NumberFormat( locale, {
												maximumFractionDigits: 1,
											} ).format( perBox.value )
									  )
									: null
							}
						/>
						<StatCard
							label={ __(
								'Builder conversion',
								'productboxes-mix-and-match-box-builder'
							) }
							value={
								kpis
									? formatPercent(
											kpis.conversion.value,
											locale
									  )
									: pending
							}
							note={
								kpis
									? [
											sprintf(
												/* translators: %s: Number of builder visits. */
												_n(
													'%s visit',
													'%s visits',
													visits,
													'productboxes-mix-and-match-box-builder'
												),
												formatCount( visits, locale )
											),
											sprintf(
												/* translators: %s: Number of box orders. */
												_n(
													'%s order',
													'%s orders',
													orders,
													'productboxes-mix-and-match-box-builder'
												),
												formatCount( orders, locale )
											),
									  ].join( ', ' )
									: null
							}
						/>
					</StatGroup>
				</div>

				<div className="mmbb-app-split">
					<section
						className="mmbb-app-card mmbb-app-split__main"
						aria-labelledby="mmbb-home-boxes"
					>
						<div className="mmbb-app-card__head">
							<h2 id="mmbb-home-boxes">
								{ __(
									'Your boxes',
									'productboxes-mix-and-match-box-builder'
								) }
							</h2>
							<Button variant="tertiary" href={ urls.campaigns }>
								{ __(
									'View all',
									'productboxes-mix-and-match-box-builder'
								) }
							</Button>
						</div>
						{ boxes.data && items.length === 0 ? (
							<EmptyState
								title={ __(
									'Create your first box',
									'productboxes-mix-and-match-box-builder'
								) }
								actions={ createButton }
							>
								{ __(
									'Pick the products, set the discount and put it on a page.',
									'productboxes-mix-and-match-box-builder'
								) }
							</EmptyState>
						) : (
							<DataTable
								caption={ __(
									'Your boxes',
									'productboxes-mix-and-match-box-builder'
								) }
								columns={ columns }
								rows={ items }
								emptyMessage={
									boxes.error
										? __(
												'Boxes could not load.',
												'productboxes-mix-and-match-box-builder'
										  )
										: loadingRow
								}
							/>
						) }
					</section>

					<section
						className="mmbb-app-card mmbb-app-split__side"
						aria-labelledby="mmbb-home-picked"
					>
						<div className="mmbb-app-card__head">
							<h2 id="mmbb-home-picked">
								{ __(
									'Most picked',
									'productboxes-mix-and-match-box-builder'
								) }
							</h2>
							<span className="mmbb-app-muted">
								{ __(
									'times added',
									'productboxes-mix-and-match-box-builder'
								) }
							</span>
						</div>
						<div className="mmbb-app-card__body">
							{ ! stats.data && ! stats.error ? (
								<span className="mmbb-app-loading">
									<Spinner />
								</span>
							) : null }
							{ stats.data && picks.length === 0 ? (
								<p className="mmbb-app-muted">
									{ __(
										'Products show up here once shoppers start building boxes.',
										'productboxes-mix-and-match-box-builder'
									) }
								</p>
							) : null }
							{ picks.length > 0 ? (
								<ol className="mmbb-app-bars">
									{ picks.map( ( p, index ) => (
										<li key={ p.id || p.name + index }>
											<div className="mmbb-app-bars__row">
												<span>{ p.name }</span>
												<span>
													{ formatCount(
														p.count,
														locale
													) }
												</span>
											</div>
											<div
												className="mmbb-app-bars__track"
												aria-hidden="true"
											>
												<i
													style={ {
														width:
															( most
																? Math.round(
																		( 100 *
																			p.count ) /
																			most
																  )
																: 0 ) + '%',
													} }
												/>
											</div>
										</li>
									) ) }
								</ol>
							) : null }
						</div>
					</section>
				</div>
			</div>

			{ creating ? (
				<CreateBoxModal onClose={ () => setCreating( false ) } />
			) : null }
		</Shell>
	);
}
