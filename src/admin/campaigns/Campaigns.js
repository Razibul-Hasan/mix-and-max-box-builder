import {
	Button,
	DropdownMenu,
	MenuGroup,
	MenuItem,
	Notice,
	SearchControl,
	Spinner,
} from '@wordpress/components';
import { useEffect, useReducer, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { moreHorizontal, plus } from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';
import { useMoney } from '../../components';
import { bulkCampaigns, getCampaigns } from '../api';
import { useProductImages } from '../CampaignThumbs';
import {
	BoxThumbs,
	DataTable,
	EmptyState,
	PageHeader,
	StatusBadge,
	useSnackbar,
} from '../components';
import { useAdmin } from '../context';
import { boxSummary, canPause, formatCount, shownOnPath } from '../format';
import { errorMessage, useDebouncedValue, useRequest } from '../hooks';
import Shell from '../Shell';
import CreateBoxModal from './CreateBoxModal';
import {
	campaignsReducer,
	hasFilters,
	initialState,
	queryFor,
	summarizeBulk,
} from './state';
import TrashDialog from './TrashDialog';

const CREATE_ACTION = 'new';

// The four tabs from the design. Stored statuses are not renamed: "Live" is the
// existing `live` filter (active + ending soon); scheduled and paused boxes show under All.
function tabsFor( counts ) {
	const count = ( key ) => ( counts ? counts[ key ] || 0 : null );
	return [
		{
			id: 'all',
			label: __( 'All', 'productboxes-mix-and-match-box-builder' ),
			count: count( 'all' ),
		},
		{
			id: 'live',
			label: __( 'Live', 'productboxes-mix-and-match-box-builder' ),
			count: count( 'live' ),
		},
		{
			id: 'draft',
			label: __( 'Drafts', 'productboxes-mix-and-match-box-builder' ),
			count: count( 'draft' ),
		},
		{
			id: 'ended',
			label: __( 'Ended', 'productboxes-mix-and-match-box-builder' ),
			count: count( 'ended' ),
		},
	];
}

const done = {
	pause: ( n ) =>
		sprintf(
			/* translators: %d: Number of boxes. */
			_n(
				'Paused %d box',
				'Paused %d boxes',
				n,
				'productboxes-mix-and-match-box-builder'
			),
			n
		),
	resume: ( n ) =>
		sprintf(
			/* translators: %d: Number of boxes. */
			_n(
				'Resumed %d box',
				'Resumed %d boxes',
				n,
				'productboxes-mix-and-match-box-builder'
			),
			n
		),
	duplicate: ( n ) =>
		sprintf(
			/* translators: %d: Number of boxes. */
			_n(
				'Duplicated %d box',
				'Duplicated %d boxes',
				n,
				'productboxes-mix-and-match-box-builder'
			),
			n
		),
	delete: ( n ) =>
		sprintf(
			/* translators: %d: Number of boxes. */
			_n(
				'Moved %d box to the trash',
				'Moved %d boxes to the trash',
				n,
				'productboxes-mix-and-match-box-builder'
			),
			n
		),
};

/**
 * Boxes: every box with its status, where it is shown and what it sold.
 *
 * @param {Object}  props
 * @param {boolean} props.openCreate Open "Create a box" on load (`action=new`).
 */
export default function Campaigns( { openCreate = false } ) {
	const { locale, money } = useAdmin();
	const formatMoney = useMoney();
	const snackbar = useSnackbar();
	const [ state, dispatch ] = useReducer( campaignsReducer, initialState );
	const [ searchText, setSearchText ] = useState( '' );
	const [ creating, setCreating ] = useState( openCreate );
	const [ pendingTrash, setPendingTrash ] = useState( null );
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

	// Trashing the last row of the last page leaves an empty page behind.
	useEffect( () => {
		if ( data && data.pages > 0 && state.page > data.pages ) {
			dispatch( { type: 'page', value: data.pages } );
		}
	}, [ data, state.page ] );

	const closeCreate = () => {
		setCreating( false );
		const url = new URL( window.location.href );
		if ( url.searchParams.get( 'action' ) === CREATE_ACTION ) {
			url.searchParams.delete( 'action' );
			window.history.replaceState( null, '', url.toString() );
		}
	};

	const selectedItems = items.filter( ( c ) =>
		state.selected.includes( c.id )
	);

	// Run one bulk action through POST /campaigns/bulk, then report what happened.
	const run = ( action, boxes ) => {
		const ids = boxes.map( ( c ) => c.id );
		if ( ids.length === 0 ) {
			return Promise.resolve();
		}
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
					snackbar(
						copy
							? sprintf(
									/* translators: %s: Name of the new box. */
									__(
										'Duplicated as “%s”',
										'productboxes-mix-and-match-box-builder'
									),
									copy.title
							  )
							: done[ action ]( outcome.ok )
					);
				}
				if ( outcome.failed > 0 ) {
					setActionError(
						sprintf(
							/* translators: 1: Number of boxes, 2: Reason. */
							_n(
								'%1$d box could not be changed. %2$s',
								'%1$d boxes could not be changed. %2$s',
								outcome.failed,
								'productboxes-mix-and-match-box-builder'
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
							'productboxes-mix-and-match-box-builder'
						)
					)
				);
			} )
			.then( () => {
				setBusy( false );
				setPendingTrash( null );
			} );
	};

	const publishUrl = ( c ) => addQueryArgs( c.edit_url, { step: 'publish' } );

	const rowControls = ( c ) => {
		const controls = [
			{
				title: __(
					'Duplicate',
					'productboxes-mix-and-match-box-builder'
				),
				onClick: () => run( 'duplicate', [ c ] ),
			},
		];
		if ( c.status === 'paused' ) {
			controls.push( {
				title: __( 'Resume', 'productboxes-mix-and-match-box-builder' ),
				onClick: () => run( 'resume', [ c ] ),
			} );
		} else if ( canPause( c.status ) ) {
			controls.push( {
				title: __( 'Pause', 'productboxes-mix-and-match-box-builder' ),
				onClick: () => run( 'pause', [ c ] ),
			} );
		}
		return controls;
	};

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
						max={ 3 }
					/>
					<div>
						<a
							className="mmbb-app-box-cell__name"
							href={ c.edit_url }
						>
							{ c.title }
						</a>
						<p className="mmbb-app-muted">
							{ boxSummary(
								c.config,
								formatMoney,
								money.decimals
							) }
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
			key: 'shown',
			label: __( 'Shown on', 'productboxes-mix-and-match-box-builder' ),
			render: ( c ) => {
				const path = shownOnPath( c.placement );
				return path ? (
					<a
						href={ c.placement.page_url }
						target="_blank"
						rel="noopener noreferrer"
					>
						{ path }
						<span className="screen-reader-text">
							{ __(
								'(opens in a new tab)',
								'productboxes-mix-and-match-box-builder'
							) }
						</span>
					</a>
				) : (
					<a href={ publishUrl( c ) }>
						{ __(
							'Add to a page',
							'productboxes-mix-and-match-box-builder'
						) }
					</a>
				);
			},
		},
		{
			key: 'sold',
			label: __( 'Sold', 'productboxes-mix-and-match-box-builder' ),
			numeric: true,
			render: ( c ) => formatCount( c.stats.boxes_sold, locale ),
		},
		{
			key: 'revenue',
			label: __( 'Revenue', 'productboxes-mix-and-match-box-builder' ),
			numeric: true,
			render: ( c ) => formatMoney( c.stats.revenue ),
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
					<DropdownMenu
						icon={ moreHorizontal }
						label={ sprintf(
							/* translators: %s: Box name. */
							__(
								'More actions for %s',
								'productboxes-mix-and-match-box-builder'
							),
							c.title
						) }
						toggleProps={ { disabled: busy, size: 'compact' } }
						popoverProps={ { placement: 'bottom-end' } }
					>
						{ ( { onClose } ) => (
							<>
								<MenuGroup>
									{ rowControls( c ).map( ( control ) => (
										<MenuItem
											key={ control.title }
											onClick={ () => {
												onClose();
												control.onClick();
											} }
										>
											{ control.title }
										</MenuItem>
									) ) }
								</MenuGroup>
								<MenuGroup>
									<MenuItem
										isDestructive
										onClick={ () => {
											onClose();
											setPendingTrash( [ c ] );
										} }
									>
										{ __(
											'Move to trash',
											'productboxes-mix-and-match-box-builder'
										) }
									</MenuItem>
								</MenuGroup>
							</>
						) }
					</DropdownMenu>
				</div>
			),
		},
	];

	const firstRun = data && counts.all === 0 && ! hasFilters( state );
	const pausable = selectedItems.filter( ( c ) => canPause( c.status ) );
	const resumable = selectedItems.filter( ( c ) => c.status === 'paused' );
	const tabs = tabsFor( counts );

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

	let emptyMessage = (
		<span className="mmbb-app-loading">
			<Spinner />
			{ __( 'Loading boxes…', 'productboxes-mix-and-match-box-builder' ) }
		</span>
	);
	if ( data ) {
		emptyMessage = __(
			'No boxes match. Try another tab or search.',
			'productboxes-mix-and-match-box-builder'
		);
	} else if ( error ) {
		emptyMessage = __(
			'Boxes could not load.',
			'productboxes-mix-and-match-box-builder'
		);
	}

	return (
		<Shell active="campaigns">
			<div className="mmbb-app-stack">
				<PageHeader
					title={ __(
						'Boxes',
						'productboxes-mix-and-match-box-builder'
					) }
					description={ __(
						'Each box is a builder shoppers fill on your store.',
						'productboxes-mix-and-match-box-builder'
					) }
					actions={ createButton }
				/>

				{ error ? (
					<Notice
						status="error"
						isDismissible={ false }
						actions={ [
							{
								label: __(
									'Retry',
									'productboxes-mix-and-match-box-builder'
								),
								onClick: reload,
							},
						] }
					>
						{ errorMessage(
							error,
							__(
								'Boxes could not load.',
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

				{ firstRun ? (
					<section className="mmbb-app-card">
						<EmptyState
							title={ __(
								'Create your first box',
								'productboxes-mix-and-match-box-builder'
							) }
							actions={ createButton }
						>
							{ __(
								'Pick the products, set the discount and put it on a page. Nothing goes live until you publish.',
								'productboxes-mix-and-match-box-builder'
							) }
						</EmptyState>
					</section>
				) : (
					<section
						className="mmbb-app-card"
						aria-label={ __(
							'Boxes',
							'productboxes-mix-and-match-box-builder'
						) }
					>
						<div className="mmbb-app-toolbar">
							<div
								className="mmbb-app-tabs"
								role="group"
								aria-label={ __(
									'Filter boxes',
									'productboxes-mix-and-match-box-builder'
								) }
							>
								{ tabs.map( ( tab ) => (
									<button
										key={ tab.id }
										type="button"
										className={
											'mmbb-app-tab' +
											( state.status === tab.id
												? ' is-current'
												: '' )
										}
										aria-pressed={ state.status === tab.id }
										onClick={ () =>
											dispatch( {
												type: 'status',
												value: tab.id,
											} )
										}
									>
										{ tab.label }
										{ tab.count !== null ? (
											<span className="mmbb-app-count">
												{ formatCount(
													tab.count,
													locale
												) }
											</span>
										) : null }
									</button>
								) ) }
							</div>
							<div className="mmbb-app-toolbar__search">
								{ loading && data ? <Spinner /> : null }
								<SearchControl
									__nextHasNoMarginBottom
									label={ __(
										'Search boxes',
										'productboxes-mix-and-match-box-builder'
									) }
									placeholder={ __(
										'Search boxes',
										'productboxes-mix-and-match-box-builder'
									) }
									value={ searchText }
									onChange={ setSearchText }
								/>
							</div>
						</div>

						{ selectedItems.length > 0 ? (
							<div
								className="mmbb-app-bulk"
								role="region"
								aria-label={ __(
									'Bulk actions',
									'productboxes-mix-and-match-box-builder'
								) }
							>
								<span>
									{ sprintf(
										/* translators: %d: Number of items. */
										_n(
											'%d selected',
											'%d selected',
											selectedItems.length,
											'productboxes-mix-and-match-box-builder'
										),
										selectedItems.length
									) }
								</span>
								<Button
									variant="secondary"
									size="compact"
									disabled={ busy }
									onClick={ () =>
										run( 'duplicate', selectedItems )
									}
								>
									{ __(
										'Duplicate',
										'productboxes-mix-and-match-box-builder'
									) }
								</Button>
								{ pausable.length > 0 ? (
									<Button
										variant="secondary"
										size="compact"
										disabled={ busy }
										onClick={ () =>
											run( 'pause', pausable )
										}
									>
										{ __(
											'Pause',
											'productboxes-mix-and-match-box-builder'
										) }
									</Button>
								) : null }
								{ resumable.length > 0 ? (
									<Button
										variant="secondary"
										size="compact"
										disabled={ busy }
										onClick={ () =>
											run( 'resume', resumable )
										}
									>
										{ __(
											'Resume',
											'productboxes-mix-and-match-box-builder'
										) }
									</Button>
								) : null }
								<Button
									variant="secondary"
									size="compact"
									isDestructive
									disabled={ busy }
									onClick={ () =>
										setPendingTrash( selectedItems )
									}
								>
									{ __(
										'Move to trash',
										'productboxes-mix-and-match-box-builder'
									) }
								</Button>
								<Button
									variant="tertiary"
									size="compact"
									onClick={ () =>
										dispatch( { type: 'clear_selection' } )
									}
								>
									{ __(
										'Clear selection',
										'productboxes-mix-and-match-box-builder'
									) }
								</Button>
							</div>
						) : null }

						<div
							className={
								'mmbb-app-card__table' +
								( loading && data ? ' is-loading' : '' )
							}
							aria-busy={ loading }
						>
							<DataTable
								caption={ __(
									'Boxes',
									'productboxes-mix-and-match-box-builder'
								) }
								columns={ columns }
								rows={ items }
								selected={ state.selected }
								onSelect={ ( ids ) =>
									dispatch( { type: 'select', ids } )
								}
								rowLabel={ ( c ) => c.title }
								emptyMessage={ emptyMessage }
							/>
						</div>

						<div className="mmbb-app-card__foot">
							<span className="mmbb-app-muted">
								{ data
									? sprintf(
											/* translators: %d: Number of boxes. */
											_n(
												'%d box',
												'%d boxes',
												total,
												'productboxes-mix-and-match-box-builder'
											),
											total
									  )
									: ' ' }
							</span>
							{ data && data.pages > 1 ? (
								<span className="mmbb-app-pager">
									<Button
										variant="secondary"
										size="compact"
										disabled={ state.page <= 1 }
										onClick={ () =>
											dispatch( {
												type: 'page',
												value: state.page - 1,
											} )
										}
									>
										{ __(
											'Previous',
											'productboxes-mix-and-match-box-builder'
										) }
									</Button>
									<span className="mmbb-app-muted">
										{ sprintf(
											/* translators: 1: Current page, 2: Number of pages. */
											__(
												'Page %1$d of %2$d',
												'productboxes-mix-and-match-box-builder'
											),
											state.page,
											data.pages
										) }
									</span>
									<Button
										variant="secondary"
										size="compact"
										disabled={ state.page >= data.pages }
										onClick={ () =>
											dispatch( {
												type: 'page',
												value: state.page + 1,
											} )
										}
									>
										{ __(
											'Next',
											'productboxes-mix-and-match-box-builder'
										) }
									</Button>
								</span>
							) : null }
						</div>
					</section>
				) }
			</div>

			{ creating ? <CreateBoxModal onClose={ closeCreate } /> : null }
			{ pendingTrash ? (
				<TrashDialog
					boxes={ pendingTrash }
					busy={ busy }
					onCancel={ () => setPendingTrash( null ) }
					onConfirm={ () => run( 'delete', pendingTrash ) }
				/>
			) : null }
		</Shell>
	);
}
