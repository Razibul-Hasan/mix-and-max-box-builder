import { useEffect, useReducer, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Badge,
	Button,
	Card,
	DataTable,
	EmptyState,
	Icon,
	Notice,
	PageHeader,
	SelectField,
	Tabs,
	TextField,
	useMoney,
} from '../../components';
import { bulkCampaigns, getCampaigns } from '../api';
import { copyText } from '../copy-text';
import { useAdmin } from '../context';
import DeleteDialog from '../DeleteDialog';
import {
	canPause,
	formatCount,
	formatPercent,
	isLive,
	placementInfo,
	scheduleLabel,
	statusInfo,
	typeSummary,
} from '../format';
import { errorMessage, useDebouncedValue, useRequest } from '../hooks';
import RowMenu from '../RowMenu';
import Shell from '../Shell';
import TemplatePicker from '../TemplatePicker';
import { useToast } from '../toast';
import CampaignThumbs, { useProductImages } from '../CampaignThumbs';
import {
	campaignsReducer,
	hasFilters,
	initialState,
	queryFor,
	rangeFor,
	summarizeBulk,
} from './state';

const PICKER_ACTION = 'new';

function useTabs( counts, status ) {
	const count = ( key ) => ( counts ? counts[ key ] : undefined );
	const tabs = [
		{
			id: 'all',
			label: __( 'All', 'mix-and-max-box-builder' ),
			count: count( 'all' ),
		},
		{
			id: 'live',
			label: __( 'Active', 'mix-and-max-box-builder' ),
			count: count( 'live' ),
		},
		{
			id: 'scheduled',
			label: __( 'Scheduled', 'mix-and-max-box-builder' ),
			count: count( 'scheduled' ),
		},
		{
			id: 'draft',
			label: __( 'Drafts', 'mix-and-max-box-builder' ),
			count: count( 'draft' ),
		},
		{
			id: 'ended',
			label: __( 'Ended', 'mix-and-max-box-builder' ),
			count: count( 'ended' ),
		},
	];
	// Paused campaigns only get a tab when there are some (or one is being viewed).
	if ( count( 'paused' ) > 0 || status === 'paused' ) {
		tabs.push( {
			id: 'paused',
			label: __( 'Paused', 'mix-and-max-box-builder' ),
			count: count( 'paused' ),
		} );
	}
	return tabs;
}

const message = {
	pause: ( n ) =>
		sprintf(
			/* translators: %d: Number of campaigns. */
			_n(
				'Paused %d campaign',
				'Paused %d campaigns',
				n,
				'mix-and-max-box-builder'
			),
			n
		),
	resume: ( n ) =>
		sprintf(
			/* translators: %d: Number of campaigns. */
			_n(
				'Resumed %d campaign',
				'Resumed %d campaigns',
				n,
				'mix-and-max-box-builder'
			),
			n
		),
	duplicate: ( n ) =>
		sprintf(
			/* translators: %d: Number of campaigns. */
			_n(
				'Duplicated %d campaign',
				'Duplicated %d campaigns',
				n,
				'mix-and-max-box-builder'
			),
			n
		),
	delete: ( n ) =>
		sprintf(
			/* translators: %d: Number of campaigns. */
			_n(
				'Deleted %d campaign',
				'Deleted %d campaigns',
				n,
				'mix-and-max-box-builder'
			),
			n
		),
};

export default function Campaigns( { openPicker = false } ) {
	const { locale, timezone, money } = useAdmin();
	const formatMoney = useMoney();
	const toast = useToast();
	const [ state, dispatch ] = useReducer( campaignsReducer, initialState );
	const [ searchText, setSearchText ] = useState( '' );
	const [ picker, setPicker ] = useState( openPicker );
	const [ pendingDelete, setPendingDelete ] = useState( null );
	const [ busy, setBusy ] = useState( false );
	const [ actionError, setActionError ] = useState( '' );

	const debouncedSearch = useDebouncedValue( searchText, 300 );
	useEffect( () => {
		dispatch( { type: 'search', value: debouncedSearch.trim() } );
	}, [ debouncedSearch ] );

	const query = queryFor( state );
	const { data, error, loading, reload } = useRequest(
		() => getCampaigns( query ),
		[ JSON.stringify( query ) ]
	);
	const items = data ? data.items : [];
	const counts = data ? data.counts : null;
	const total = data ? data.total : 0;
	const images = useProductImages( items );
	const tabs = useTabs( counts, state.status );

	// Deleting the last row of the last page leaves an empty page behind.
	useEffect( () => {
		if ( data && data.pages > 0 && state.page > data.pages ) {
			dispatch( { type: 'page', value: data.pages } );
		}
	}, [ data, state.page ] );

	const closePicker = () => {
		setPicker( false );
		const url = new URL( window.location.href );
		if ( url.searchParams.get( 'action' ) === PICKER_ACTION ) {
			url.searchParams.delete( 'action' );
			window.history.replaceState( null, '', url.toString() );
		}
	};

	const selectedItems = items.filter( ( c ) =>
		state.selected.includes( c.id )
	);

	// Run one bulk action, then report what happened.
	const run = ( action, campaigns ) => {
		const ids = campaigns.map( ( c ) => c.id );
		setBusy( true );
		setActionError( '' );
		return bulkCampaigns( action, ids )
			.then( ( response ) => {
				const outcome = summarizeBulk( response );
				if ( outcome.ok > 0 ) {
					const copy =
						action === 'duplicate' && ids.length === 1
							? response.results[ 0 ].campaign
							: null;
					toast(
						copy
							? sprintf(
									/* translators: %s: Name of the new campaign. */
									__(
										'Duplicated as “%s”',
										'mix-and-max-box-builder'
									),
									copy.title
							  )
							: message[ action ]( outcome.ok )
					);
				}
				if ( outcome.failed > 0 ) {
					setActionError(
						sprintf(
							/* translators: 1: Number of campaigns, 2: Reason. */
							_n(
								'%1$d campaign could not be changed. %2$s',
								'%1$d campaigns could not be changed. %2$s',
								outcome.failed,
								'mix-and-max-box-builder'
							),
							outcome.failed,
							outcome.message
						)
					);
				}
				dispatch( { type: 'clear_selection' } );
				reload();
			} )
			.catch( ( e ) => {
				setActionError(
					errorMessage(
						e,
						__(
							'That did not work. Try again.',
							'mix-and-max-box-builder'
						)
					)
				);
			} )
			.then( () => {
				setBusy( false );
				setPendingDelete( null );
			} );
	};

	const copyShortcode = ( campaign ) => {
		copyText( campaign.placement.shortcode ).then( ( ok ) => {
			toast(
				ok
					? __( 'Shortcode copied', 'mix-and-max-box-builder' )
					: __(
							'Could not copy. Select the shortcode and copy it.',
							'mix-and-max-box-builder'
					  )
			);
		} );
	};

	const menuItems = ( campaign ) => {
		const menu = [];
		if ( campaign.placement.page_url && isLive( campaign.status ) ) {
			menu.push( {
				id: 'view',
				label: __( 'View on store', 'mix-and-max-box-builder' ),
				icon: 'eye',
				href: campaign.placement.page_url,
				external: true,
			} );
		}
		menu.push( {
			id: 'duplicate',
			label: __( 'Duplicate', 'mix-and-max-box-builder' ),
			icon: 'copy',
			onSelect: () => run( 'duplicate', [ campaign ] ),
		} );
		if ( campaign.status === 'paused' ) {
			menu.push( {
				id: 'resume',
				label: __( 'Resume', 'mix-and-max-box-builder' ),
				icon: 'refresh',
				onSelect: () => run( 'resume', [ campaign ] ),
			} );
		} else if ( canPause( campaign.status ) ) {
			menu.push( {
				id: 'pause',
				label: __( 'Pause', 'mix-and-max-box-builder' ),
				icon: 'clock',
				onSelect: () => run( 'pause', [ campaign ] ),
			} );
		}
		menu.push(
			{
				id: 'shortcode',
				label: __( 'Copy shortcode', 'mix-and-max-box-builder' ),
				icon: 'code',
				onSelect: () => copyShortcode( campaign ),
			},
			{
				id: 'delete',
				label: __( 'Delete', 'mix-and-max-box-builder' ),
				icon: 'trash',
				danger: true,
				onSelect: () => setPendingDelete( [ campaign ] ),
			}
		);
		return menu;
	};

	const dates = { locale, timezone };
	const columns = [
		{
			key: 'title',
			label: __( 'Campaign', 'mix-and-max-box-builder' ),
			render: ( c ) => (
				<div className="mmbb-campaign-cell">
					<CampaignThumbs campaign={ c } images={ images } />
					<span>
						<a
							className="mmbb-cell-title mmbb-cell-link"
							href={ c.edit_url }
						>
							{ c.title }
						</a>
						<span className="mmbb-cell-meta">
							{ typeSummary(
								c.config,
								formatMoney,
								money.decimals
							) }
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
			key: 'schedule',
			label: __( 'Schedule', 'mix-and-max-box-builder' ),
			render: ( c ) => (
				<span className="mmbb-muted">
					{ scheduleLabel( c, dates ) }
				</span>
			),
		},
		{
			key: 'placement',
			label: __( 'Placement', 'mix-and-max-box-builder' ),
			render: ( c ) => {
				const info = placementInfo( c.placement );
				if ( info.kind === 'code' ) {
					return <code className="mmbb-code">{ info.text }</code>;
				}
				if ( info.kind === 'none' ) {
					return (
						<span className="mmbb-placement is-warning">
							<Icon name="alert" size={ 14 } />
							{ info.text }
						</span>
					);
				}
				return (
					<span className="mmbb-placement">
						<Icon name="layers" size={ 14 } />
						{ info.text }
					</span>
				);
			},
		},
		{
			key: 'boxes',
			label: __( 'Boxes sold', 'mix-and-max-box-builder' ),
			numeric: true,
			render: ( c ) => formatCount( c.stats.boxes_sold, locale ),
		},
		{
			key: 'revenue',
			label: __( 'Revenue', 'mix-and-max-box-builder' ),
			numeric: true,
			render: ( c ) => formatMoney( c.stats.revenue ),
		},
		{
			key: 'conversion',
			label: __( 'Conversion', 'mix-and-max-box-builder' ),
			numeric: true,
			render: ( c ) => formatPercent( c.stats.conversion, locale ),
		},
		{
			key: 'actions',
			width: 88,
			label: (
				<span className="mmbb-sr">
					{ __( 'Actions', 'mix-and-max-box-builder' ) }
				</span>
			),
			render: ( c ) => (
				<div className="mmbb-row-actions">
					<Button
						variant="ghost"
						size="sm"
						icon="edit"
						href={ c.edit_url }
						aria-label={ sprintf(
							/* translators: %s: Campaign name. */
							__( 'Edit %s', 'mix-and-max-box-builder' ),
							c.title
						) }
					/>
					<RowMenu
						label={ sprintf(
							/* translators: %s: Campaign name. */
							__(
								'More actions for %s',
								'mix-and-max-box-builder'
							),
							c.title
						) }
						items={ menuItems( c ) }
					/>
				</div>
			),
		},
	];

	const range = rangeFor( state.page, total );
	const firstRun = data && counts.all === 0 && ! hasFilters( state );
	const pausable = selectedItems.filter( ( c ) => canPause( c.status ) );

	return (
		<Shell active="campaigns">
			<PageHeader
				title={ __( 'Campaigns', 'mix-and-max-box-builder' ) }
				subtitle={ __(
					'Every box builder on your store, with what it sold.',
					'mix-and-max-box-builder'
				) }
				actions={
					<>
						<Button
							icon="layers"
							onClick={ () => setPicker( true ) }
						>
							{ __( 'Templates', 'mix-and-max-box-builder' ) }
						</Button>
						<Button
							variant="primary"
							icon="plus"
							onClick={ () => setPicker( true ) }
						>
							{ __(
								'Create campaign',
								'mix-and-max-box-builder'
							) }
						</Button>
					</>
				}
			/>

			{ error ? (
				<Notice
					tone="critical"
					title={ __(
						'Campaigns could not load',
						'mix-and-max-box-builder'
					) }
					action={
						<Button size="sm" onClick={ reload }>
							{ __( 'Retry', 'mix-and-max-box-builder' ) }
						</Button>
					}
				>
					{ errorMessage( error, '' ) }
				</Notice>
			) : null }
			{ actionError ? (
				<Notice tone="warning" onDismiss={ () => setActionError( '' ) }>
					{ actionError }
				</Notice>
			) : null }

			{ firstRun ? (
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
								onClick={ () => setPicker( true ) }
							>
								{ __(
									'Create campaign',
									'mix-and-max-box-builder'
								) }
							</Button>
						}
					/>
				</Card>
			) : (
				<Card padding="none">
					<div className="mmbb-list__tabs">
						<Tabs
							label={ __(
								'Campaign status',
								'mix-and-max-box-builder'
							) }
							tabs={ tabs }
							value={ state.status }
							onChange={ ( value ) =>
								dispatch( { type: 'status', value } )
							}
						/>
					</div>
					<div className="mmbb-list__filters">
						<TextField
							aria-label={ __(
								'Search campaigns',
								'mix-and-max-box-builder'
							) }
							prefix="search"
							type="search"
							placeholder={ __(
								'Search campaigns',
								'mix-and-max-box-builder'
							) }
							className="mmbb-list__search"
							value={ searchText }
							onChange={ ( e ) =>
								setSearchText( e.target.value )
							}
						/>
						<SelectField
							aria-label={ __(
								'Campaign type',
								'mix-and-max-box-builder'
							) }
							className="mmbb-list__select"
							value={ state.type }
							options={ [
								{
									value: '',
									label: __(
										'All types',
										'mix-and-max-box-builder'
									),
								},
								{
									value: 'tiered',
									label: __(
										'Tiered mix',
										'mix-and-max-box-builder'
									),
								},
								{
									value: 'fixed',
									label: __(
										'Fixed box',
										'mix-and-max-box-builder'
									),
								},
								{
									value: 'bundle',
									label: __(
										'Bundle price',
										'mix-and-max-box-builder'
									),
								},
							] }
							onChange={ ( e ) =>
								dispatch( {
									type: 'type',
									value: e.target.value,
								} )
							}
						/>
						<SelectField
							aria-label={ __(
								'Sort',
								'mix-and-max-box-builder'
							) }
							className="mmbb-list__select"
							value={ state.orderby }
							options={ [
								{
									value: 'date',
									label: __(
										'Sort: Newest',
										'mix-and-max-box-builder'
									),
								},
								{
									value: 'revenue',
									label: __(
										'Sort: Revenue',
										'mix-and-max-box-builder'
									),
								},
								{
									value: 'conversion',
									label: __(
										'Sort: Conversion',
										'mix-and-max-box-builder'
									),
								},
							] }
							onChange={ ( e ) =>
								dispatch( {
									type: 'orderby',
									value: e.target.value,
								} )
							}
						/>
					</div>
					<div
						className={
							'mmbb-list__body' + ( loading ? ' is-loading' : '' )
						}
						aria-busy={ loading }
					>
						<DataTable
							columns={ columns }
							rows={ items }
							selectable
							selected={ state.selected }
							onSelectionChange={ ( ids ) =>
								dispatch( { type: 'select', ids } )
							}
							rowLabel={ ( c ) =>
								sprintf(
									/* translators: %s: Campaign name. */
									__(
										'Select %s',
										'mix-and-max-box-builder'
									),
									c.title
								)
							}
							bulkActions={
								<>
									<Button
										size="sm"
										icon="copy"
										disabled={ busy }
										onClick={ () =>
											run( 'duplicate', selectedItems )
										}
									>
										{ __(
											'Duplicate',
											'mix-and-max-box-builder'
										) }
									</Button>
									<Button
										size="sm"
										disabled={
											busy || pausable.length === 0
										}
										onClick={ () =>
											run( 'pause', pausable )
										}
									>
										{ __(
											'Pause',
											'mix-and-max-box-builder'
										) }
									</Button>
									<Button
										size="sm"
										variant="ghost"
										icon="trash"
										disabled={ busy }
										onClick={ () =>
											setPendingDelete( selectedItems )
										}
									>
										{ __(
											'Delete',
											'mix-and-max-box-builder'
										) }
									</Button>
								</>
							}
							empty={
								data
									? __(
											'No campaigns match these filters.',
											'mix-and-max-box-builder'
									  )
									: __(
											'Loading campaigns…',
											'mix-and-max-box-builder'
									  )
							}
						/>
					</div>
					{ total > 0 ? (
						<div className="mmbb-list__foot">
							<span>
								{ sprintf(
									/* translators: 1: First row number, 2: Last row number, 3: Total rows. */
									__(
										'Showing %1$d–%2$d of %3$d',
										'mix-and-max-box-builder'
									),
									range.from,
									range.to,
									total
								) }
							</span>
							<span className="mmbb-list__pager">
								<Button
									size="sm"
									icon="chevronLeft"
									aria-label={ __(
										'Previous page',
										'mix-and-max-box-builder'
									) }
									disabled={ state.page <= 1 }
									onClick={ () =>
										dispatch( {
											type: 'page',
											value: state.page - 1,
										} )
									}
								/>
								<Button
									size="sm"
									icon="chevronRight"
									aria-label={ __(
										'Next page',
										'mix-and-max-box-builder'
									) }
									disabled={
										! data || state.page >= data.pages
									}
									onClick={ () =>
										dispatch( {
											type: 'page',
											value: state.page + 1,
										} )
									}
								/>
							</span>
						</div>
					) : null }
				</Card>
			) }

			{ picker ? <TemplatePicker onClose={ closePicker } /> : null }
			{ pendingDelete ? (
				<DeleteDialog
					campaigns={ pendingDelete }
					busy={ busy }
					onCancel={ () => setPendingDelete( null ) }
					onPause={ () =>
						run(
							'pause',
							pendingDelete.filter( ( c ) =>
								canPause( c.status )
							)
						)
					}
					onDelete={ () => run( 'delete', pendingDelete ) }
				/>
			) : null }
		</Shell>
	);
}
