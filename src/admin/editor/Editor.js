import {
	useCallback,
	useEffect,
	useReducer,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import {
	Badge,
	Button,
	Icon,
	Notice,
	PageHeader,
	Steps,
} from '../../components';
import { getCampaign, publishCampaign, saveCampaign } from '../api';
import { useAdmin } from '../context';
import { statusInfo } from '../format';
import { errorMessage, readStored, useRequest, writeStored } from '../hooks';
import Shell from '../Shell';
import { useToast } from '../toast';
import BasicsStep from './BasicsStep';
import DesignStep from './DesignStep';
import { useMediaQuery, useProductCatalog } from './hooks';
import ProductsStep from './ProductsStep';
import PublishedStep from './PublishedStep';
import PublishStep from './PublishStep';
import RulesStep from './RulesStep';
import {
	editorReducer,
	initEditor,
	payloadFor,
	slugify,
	STEPS,
	stepForPath,
	validateAll,
	validateStep,
} from './state';

const AUTOSAVE_MS = 30000;

const stepLabels = () => ( {
	basics: __( 'Basics', 'mix-and-max-box-builder' ),
	products: __( 'Products', 'mix-and-max-box-builder' ),
	rules: __( 'Box rules', 'mix-and-max-box-builder' ),
	design: __( 'Design', 'mix-and-max-box-builder' ),
	publish: __( 'Publish', 'mix-and-max-box-builder' ),
} );

const isStep = ( value ) => STEPS.includes( value ) || value === 'published';

function readStep() {
	const step = new URLSearchParams( window.location.search ).get( 'step' );
	return isStep( step ) ? step : 'basics';
}

// The first step before `target` that still has errors, or null.
function firstBlocked( target, draft ) {
	for ( let i = 0; i < target; i++ ) {
		if ( Object.keys( validateStep( STEPS[ i ], draft ) ).length ) {
			return STEPS[ i ];
		}
	}
	return null;
}

function readPage( campaign ) {
	const fallback = {
		mode: campaign.placement.page_id > 0 ? 'existing' : 'new',
		title: null,
		slug: null,
		pageId: campaign.placement.page_id || 0,
	};
	try {
		const stored = JSON.parse(
			readStored( 'mmbb:editor:' + campaign.id, 'null' )
		);
		return stored && typeof stored === 'object'
			? { ...fallback, ...stored }
			: fallback;
	} catch ( e ) {
		return fallback;
	}
}

function EditorBody( { initial } ) {
	const { urls, locale } = useAdmin();
	const toast = useToast();
	const compact = useMediaQuery( '(max-width: 600px)' );
	const [ meta, setMeta ] = useState( initial );
	const [ state, dispatch ] = useReducer(
		editorReducer,
		initial,
		initEditor
	);
	const { draft, dirty } = state;
	const [ saving, setSaving ] = useState( false );
	const [ saveError, setSaveError ] = useState( '' );
	const [ busy, setBusy ] = useState( false );
	const [ attempted, setAttempted ] = useState( {} );
	const [ serverErrors, setServerErrors ] = useState( [] );
	const [ rawPage, setRawPage ] = useState( () => readPage( initial ) );

	// Step from the address, never one the merchant is not allowed to open yet.
	const [ step, setStep ] = useState( () => {
		const wanted = readStep();
		if ( wanted === 'published' ) {
			return initial.status === 'draft' ? 'publish' : 'published';
		}
		return firstBlocked( STEPS.indexOf( wanted ), initial ) || wanted;
	} );

	const stateRef = useRef( state );
	stateRef.current = state;
	const savingRef = useRef( false );

	const page = {
		mode: rawPage.mode,
		title: rawPage.title === null ? draft.title : rawPage.title,
		slug: rawPage.slug === null ? slugify( draft.title ) : rawPage.slug,
		pageId: rawPage.pageId,
		setMode: ( mode ) => setRawPage( ( p ) => ( { ...p, mode } ) ),
		setTitle: ( title ) => setRawPage( ( p ) => ( { ...p, title } ) ),
		setSlug: ( slug ) => setRawPage( ( p ) => ( { ...p, slug } ) ),
		setPageId: ( pageId ) => setRawPage( ( p ) => ( { ...p, pageId } ) ),
	};

	// Where the builder goes is a browser-side convenience; the server stores it on go-live.
	useEffect( () => {
		writeStored(
			'mmbb:editor:' + initial.id,
			JSON.stringify( {
				mode: rawPage.mode,
				title: rawPage.title,
				slug: rawPage.slug,
				pageId: rawPage.pageId,
			} )
		);
	}, [ rawPage, initial.id ] );

	const manualIds =
		draft.config.products.source === 'manual'
			? draft.config.products.ids
			: [];
	const catalog = useProductCatalog( manualIds );
	const previewProducts = manualIds
		.map( ( id ) => catalog.byId[ id ] )
		.filter( Boolean );

	const hrefFor = ( target ) =>
		addQueryArgs( meta.edit_url, { step: target } );

	const goTo = useCallback(
		( target ) => {
			setStep( target );
			setServerErrors( [] );
			try {
				window.history.pushState(
					null,
					'',
					addQueryArgs( meta.edit_url, { step: target } )
				);
			} catch ( e ) {
				// The screen has already changed; the address is a convenience.
			}
			window.scrollTo( 0, 0 );
		},
		[ meta.edit_url ]
	);

	useEffect( () => {
		const onPop = () => {
			const target = readStep();
			setStep(
				target === 'published' && meta.status === 'draft'
					? 'publish'
					: target
			);
		};
		window.addEventListener( 'popstate', onPop );
		return () => window.removeEventListener( 'popstate', onPop );
	}, [ meta.status ] );

	const save = useCallback(
		( { autosave = false } = {} ) => {
			if ( savingRef.current ) {
				return Promise.resolve( null );
			}
			const sent = stateRef.current.draft;
			const payload = payloadFor( sent );
			payload.title =
				payload.title.trim() || stateRef.current.saved.title;
			savingRef.current = true;
			setSaving( true );
			return saveCampaign( initial.id, payload, { autosave } )
				.then( ( campaign ) => {
					dispatch( { type: 'saved', campaign, sent } );
					setMeta( campaign );
					setSaveError( '' );
					return campaign;
				} )
				.catch( ( error ) => {
					setSaveError(
						errorMessage(
							error,
							__(
								'The campaign could not be saved.',
								'mix-and-max-box-builder'
							)
						)
					);
					if ( ! autosave ) {
						throw error;
					}
					return null;
				} )
				.finally( () => {
					savingRef.current = false;
					setSaving( false );
				} );
		},
		[ initial.id ]
	);

	const saveByHand = ( message ) =>
		save()
			.then( ( campaign ) => {
				if ( campaign ) {
					toast( message );
				}
			} )
			.catch( () => {
				// The header shows the error; nothing else to do.
			} );

	// Autosave every 30 seconds while there are unsaved edits.
	useEffect( () => {
		const timer = setInterval( () => {
			if ( stateRef.current.dirty && ! savingRef.current ) {
				save( { autosave: true } );
			}
		}, AUTOSAVE_MS );
		return () => clearInterval( timer );
	}, [ save ] );

	useEffect( () => {
		if ( ! dirty ) {
			return;
		}
		const warn = ( event ) => {
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener( 'beforeunload', warn );
		return () => window.removeEventListener( 'beforeunload', warn );
	}, [ dirty ] );

	// After a blocked Next, move focus to the first field with a problem.
	useEffect( () => {
		if ( attempted[ step ] ) {
			const field = document.querySelector(
				'#mmbb-admin [aria-invalid="true"]'
			);
			if ( field ) {
				field.focus();
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ attempted ] );

	const errors = attempted[ step ] ? validateStep( step, draft ) : {};
	const problems = validateAll( draft );
	const index = STEPS.indexOf( step );
	const labels = stepLabels();

	// Going forward needs every step before the target to be valid.
	const open = ( target ) => {
		const blocked = firstBlocked( STEPS.indexOf( target ), draft );
		if ( blocked ) {
			setAttempted( ( a ) => ( { ...a, [ blocked ]: true } ) );
			goTo( blocked );
			return;
		}
		goTo( target );
	};

	const next = () => {
		if ( Object.keys( validateStep( step, draft ) ).length ) {
			setAttempted( ( a ) => ( { ...a, [ step ]: true } ) );
			return;
		}
		goTo( STEPS[ index + 1 ] );
	};

	const goLive = () => {
		const found = validateAll( draft );
		if ( Object.keys( found ).length ) {
			setAttempted( {
				basics: true,
				products: true,
				rules: true,
				design: true,
				publish: true,
			} );
			return;
		}
		setBusy( true );
		setServerErrors( [] );
		const body =
			page.mode === 'existing'
				? { placement: 'existing_page', page_id: page.pageId }
				: {
						placement: 'new_page',
						page_title: page.title.trim(),
						page_slug: slugify( page.slug ),
				  };
		const saved = dirty ? save() : Promise.resolve( true );
		saved
			.then( () => publishCampaign( initial.id, body ) )
			.then( ( campaign ) => {
				setMeta( campaign );
				dispatch( {
					type: 'saved',
					campaign,
					sent: stateRef.current.draft,
				} );
				goTo( 'published' );
			} )
			.catch( ( error ) => {
				if ( error && error.data && error.data.errors ) {
					setServerErrors( error.data.errors );
					const first = error.data.errors[ 0 ];
					if ( first ) {
						setAttempted( ( a ) => ( {
							...a,
							[ stepForPath( first.path ) ]: true,
						} ) );
					}
				}
				toast(
					errorMessage(
						error,
						__(
							'The campaign could not go live.',
							'mix-and-max-box-builder'
						)
					)
				);
			} )
			.finally( () => setBusy( false ) );
	};

	const status = statusInfo( meta.status );
	let saveLine;
	if ( saving ) {
		saveLine = __( 'Saving…', 'mix-and-max-box-builder' );
	} else if ( saveError ) {
		saveLine = __( 'Not saved', 'mix-and-max-box-builder' );
	} else if ( dirty ) {
		saveLine = __( 'Unsaved changes', 'mix-and-max-box-builder' );
	} else {
		saveLine = sprintf(
			/* translators: %s: Time of day, such as 2:30 PM. */
			__( 'Last saved %s', 'mix-and-max-box-builder' ),
			new Intl.DateTimeFormat( locale, {
				hour: 'numeric',
				minute: '2-digit',
			} ).format( new Date( meta.modified ) )
		);
	}
	const subtitle = saveLine;

	let headerAction = null;
	if ( meta.post_status === 'draft' ) {
		headerAction = (
			<Button
				variant="ghost"
				loading={ saving }
				onClick={ () =>
					saveByHand( __( 'Draft saved', 'mix-and-max-box-builder' ) )
				}
			>
				{ __( 'Save draft', 'mix-and-max-box-builder' ) }
			</Button>
		);
	} else if ( meta.placement.page_url ) {
		headerAction = (
			<Button
				icon="eye"
				href={ meta.placement.page_url }
				target="_blank"
				rel="noopener noreferrer"
			>
				{ __( 'View on store', 'mix-and-max-box-builder' ) }
			</Button>
		);
	}

	const stepProps = {
		draft,
		errors,
		dispatch,
		page,
		catalog,
		previewProducts,
	};

	let body;
	switch ( step ) {
		case 'products':
			body = <ProductsStep { ...stepProps } />;
			break;
		case 'rules':
			body = <RulesStep { ...stepProps } />;
			break;
		case 'design':
			body = <DesignStep { ...stepProps } />;
			break;
		case 'publish':
			body = (
				<PublishStep
					draft={ draft }
					campaign={ meta }
					page={ page }
					problems={ problems }
					serverErrors={ serverErrors }
					busy={ busy }
					onGoLive={ goLive }
					onOpenStep={ ( target ) => {
						setAttempted( ( a ) => ( { ...a, [ target ]: true } ) );
						goTo( target );
					} }
				/>
			);
			break;
		default:
			body = <BasicsStep { ...stepProps } />;
	}

	return (
		<>
			{ dirty ? (
				<div
					className="mmbb-editor__bar"
					role="region"
					aria-label={ __(
						'Unsaved changes',
						'mix-and-max-box-builder'
					) }
				>
					<span className="mmbb-editor__bar-text">
						<Icon name="alert" size={ 18 } strokeWidth={ 2 } />
						{ __( 'Unsaved changes', 'mix-and-max-box-builder' ) }
					</span>
					<button
						type="button"
						className="mmbb-editor__bar-discard"
						onClick={ () => dispatch( { type: 'discard' } ) }
					>
						{ __( 'Discard', 'mix-and-max-box-builder' ) }
					</button>
					<Button
						size="sm"
						variant={ step === 'publish' ? 'secondary' : 'max' }
						loading={ saving }
						onClick={ () =>
							saveByHand(
								__(
									'Campaign saved',
									'mix-and-max-box-builder'
								)
							)
						}
					>
						{ __( 'Save campaign', 'mix-and-max-box-builder' ) }
					</Button>
				</div>
			) : null }
			<Shell active="campaigns" viewStore>
				{ step === 'published' ? (
					<PublishedStep campaign={ meta } draft={ draft } />
				) : (
					<div className="mmbb-editor">
						<div className="mmbb-editor__head">
							<PageHeader
								title={
									draft.title ||
									__(
										'Untitled campaign',
										'mix-and-max-box-builder'
									)
								}
								subtitle={ subtitle }
								badge={
									<Badge tone={ status.tone } dot>
										{ status.label }
									</Badge>
								}
								backLabel={ __(
									'Campaigns',
									'mix-and-max-box-builder'
								) }
								backHref={ urls.campaigns }
							/>
							{ headerAction }
						</div>
						{ saveError && ! saving ? (
							<Notice tone="critical">{ saveError }</Notice>
						) : null }
						<div className="mmbb-editor__steps">
							<Steps
								compact={ compact }
								current={ index }
								steps={ STEPS.map( ( s ) => ( {
									label: labels[ s ],
									href: hrefFor( s ),
								} ) ) }
								onStep={ ( i ) => open( STEPS[ i ] ) }
							/>
						</div>
						{ body }
						<div className="mmbb-editor__foot">
							<Button
								icon="arrowLeft"
								href={
									index === 0
										? urls.newCampaign
										: hrefFor( STEPS[ index - 1 ] )
								}
								onClick={
									index === 0
										? undefined
										: ( event ) => {
												event.preventDefault();
												goTo( STEPS[ index - 1 ] );
										  }
								}
							>
								{ index === 0
									? __(
											'Back to templates',
											'mix-and-max-box-builder'
									  )
									: __( 'Back', 'mix-and-max-box-builder' ) }
							</Button>
							{ step !== 'publish' ? (
								<Button
									variant="primary"
									iconRight="arrowRight"
									onClick={ next }
								>
									{ sprintf(
										/* translators: %s: Name of the next wizard step. */
										__(
											'Next: %s',
											'mix-and-max-box-builder'
										),
										labels[ STEPS[ index + 1 ] ]
									) }
								</Button>
							) : null }
						</div>
					</div>
				) }
			</Shell>
		</>
	);
}

/**
 * The campaign wizard. Loads the campaign, then hands it to the editor.
 *
 * @param {Object} props
 * @param {number} props.id Campaign id.
 */
export default function Editor( { id } ) {
	const { urls } = useAdmin();
	const { data, error, reload } = useRequest(
		() => getCampaign( id ),
		[ id ]
	);

	if ( data ) {
		return <EditorBody key={ data.id } initial={ data } />;
	}
	return (
		<Shell active="campaigns">
			{ error ? (
				<Notice
					tone="critical"
					title={ __(
						'The campaign could not be opened',
						'mix-and-max-box-builder'
					) }
					action={
						<>
							<Button size="sm" onClick={ reload }>
								{ __( 'Try again', 'mix-and-max-box-builder' ) }
							</Button>
							<Button size="sm" href={ urls.campaigns }>
								{ __(
									'Back to campaigns',
									'mix-and-max-box-builder'
								) }
							</Button>
						</>
					}
				>
					{ errorMessage(
						error,
						__( 'Something went wrong.', 'mix-and-max-box-builder' )
					) }
				</Notice>
			) : (
				<p className="mmbb-editor__loading" role="status">
					{ __( 'Loading campaign…', 'mix-and-max-box-builder' ) }
				</p>
			) }
		</Shell>
	);
}
