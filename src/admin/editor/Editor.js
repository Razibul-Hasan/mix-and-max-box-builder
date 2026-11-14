import { Button, Modal, Notice, Spinner } from '@wordpress/components';
import {
	useCallback,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { check, external, redo, undo } from '@wordpress/icons';
import { addQueryArgs } from '@wordpress/url';
import { originOf } from '../../shared/preview-bridge';
import { getCampaign, publishCampaign, saveCampaign } from '../api';
import { useSnackbar } from '../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../components/wp';
import { useAdmin } from '../context';
import { errorMessage, readStored, useRequest, writeStored } from '../hooks';
import BasicsStep from './BasicsStep';
import DesignStep from './DesignStep';
import { useProductCatalog } from './hooks';
import PreviewStage from './PreviewStage';
import ProductsStep from './ProductsStep';
import PublishedStep from './PublishedStep';
import PublishStep from './PublishStep';
import RulesStep from './RulesStep';
import {
	draftRecord,
	editorReducer,
	initEditor,
	payloadFor,
	STEPS,
	stepForPath,
	stepFromQuery,
	storedDraft,
	validateAll,
	validateStep,
} from './state';

const AUTOSAVE_MS = 30000;
const STORE_DRAFT_MS = 300;
const DEVICES = [ 'desktop', 'tablet', 'mobile' ];
const DEVICE_KEY = 'mmbb:editor:device';

const stepLabels = () => ( {
	products: __( 'Products', 'productboxes-mix-and-match-box-builder' ),
	discounts: __( 'Discounts', 'productboxes-mix-and-match-box-builder' ),
	design: __( 'Design', 'productboxes-mix-and-match-box-builder' ),
} );

const sideLabels = () => ( {
	products: __(
		'What goes in the box',
		'productboxes-mix-and-match-box-builder'
	),
	discounts: __(
		'Discounts and rules',
		'productboxes-mix-and-match-box-builder'
	),
	design: __( 'Box design', 'productboxes-mix-and-match-box-builder' ),
} );

const continueLabels = () => ( {
	products: __(
		'Continue to discounts',
		'productboxes-mix-and-match-box-builder'
	),
	discounts: __(
		'Continue to design',
		'productboxes-mix-and-match-box-builder'
	),
	design: __(
		'Continue to publish',
		'productboxes-mix-and-match-box-builder'
	),
} );

function readQueryStep() {
	return stepFromQuery(
		new URLSearchParams( window.location.search ).get( 'step' )
	);
}

function readRecord( id ) {
	return readStored( 'mmbb:editor:' + id, 'null' );
}

function readPageId( campaign ) {
	try {
		const stored = JSON.parse( readRecord( campaign.id ) );
		if ( stored && Number( stored.pageId ) > 0 ) {
			return Number( stored.pageId );
		}
	} catch ( e ) {
		// Fall back to the saved placement.
	}
	return campaign.placement.page_id || 0;
}

function readDevice() {
	const stored = readStored( DEVICE_KEY, 'desktop' );
	return DEVICES.includes( stored ) ? stored : 'desktop';
}

/**
 * The box mark from the design, in the dark square that leads back to Boxes.
 */
function BackMark() {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z" />
			<path d="M3 7.5v9L12 21l9-4.5v-9M12 12v9" />
		</svg>
	);
}

function BackLink( { href } ) {
	return (
		<a
			className="mmbb-ed__back"
			href={ href }
			aria-label={ __(
				'Back to boxes',
				'productboxes-mix-and-match-box-builder'
			) }
		>
			<BackMark />
		</a>
	);
}

function EditorBody( { initial } ) {
	const { urls } = useAdmin();
	const snackbar = useSnackbar();
	const [ meta, setMeta ] = useState( initial );
	const [ state, rawDispatch ] = useReducer(
		editorReducer,
		initial,
		initEditor
	);
	const { draft, dirty } = state;
	// Every edit carries its time, so typing in one field is one undo step.
	const dispatch = useCallback(
		( action ) => rawDispatch( { time: Date.now(), ...action } ),
		[]
	);
	const [ saving, setSaving ] = useState( false );
	const [ saveError, setSaveError ] = useState( '' );
	const [ busy, setBusy ] = useState( false );
	const [ attempted, setAttempted ] = useState( {} );
	const [ serverErrors, setServerErrors ] = useState( [] );
	const [ pageId, setPageId ] = useState( () => readPageId( initial ) );
	const [ device, setDevice ] = useState( readDevice );

	const startStep = useMemo( () => {
		const wanted = readQueryStep();
		if ( wanted === 'published' ) {
			return initial.status === 'draft' ? 'design' : 'published';
		}
		return wanted === 'publish' ? 'design' : wanted;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );
	const [ step, setStep ] = useState( startStep );
	const [ publishOpen, setPublishOpen ] = useState(
		() => readQueryStep() === 'publish'
	);
	const [ publishResult, setPublishResult ] = useState( null );
	const [ visited, setVisited ] = useState( () =>
		STEPS.slice( 0, Math.max( 0, STEPS.indexOf( startStep ) ) + 1 )
	);

	const stateRef = useRef( state );
	stateRef.current = state;
	const savingRef = useRef( false );
	// What the preview page was rendered with; the iframe needs no update until the draft moves.
	const loadedDraft = useRef( state.saved );

	// A draft kept from before a reload comes back, with a way to drop it.
	useEffect( () => {
		const kept = storedDraft( readRecord( initial.id ), initial );
		if ( ! kept ) {
			return;
		}
		rawDispatch( { type: 'restore', draft: kept } );
		snackbar(
			__(
				'Your unsaved changes were restored.',
				'productboxes-mix-and-match-box-builder'
			),
			{
				actions: [
					{
						label: __(
							'Discard them',
							'productboxes-mix-and-match-box-builder'
						),
						onClick: () => rawDispatch( { type: 'discard' } ),
					},
				],
			}
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	// Keep the draft in the browser while it is unsaved, so a reload keeps it.
	useEffect( () => {
		const timer = setTimeout( () => {
			writeStored(
				'mmbb:editor:' + initial.id,
				draftRecord( pageId, dirty ? draft : null, meta.modified )
			);
		}, STORE_DRAFT_MS );
		return () => clearTimeout( timer );
	}, [ draft, dirty, pageId, meta.modified, initial.id ] );

	useEffect( () => {
		writeStored( DEVICE_KEY, device );
	}, [ device ] );

	const manualIds =
		draft.config.products.source === 'manual'
			? draft.config.products.ids
			: [];
	const catalog = useProductCatalog( manualIds );

	const goTo = useCallback(
		( target ) => {
			setStep( target );
			setServerErrors( [] );
			setVisited( ( list ) =>
				list.includes( target ) ? list : [ ...list, target ]
			);
			try {
				window.history.pushState(
					null,
					'',
					addQueryArgs( meta.edit_url, { step: target } )
				);
			} catch ( e ) {
				// The screen has already changed; the address is a convenience.
			}
		},
		[ meta.edit_url ]
	);

	useEffect( () => {
		const onPop = () => {
			const target = readQueryStep();
			if ( target === 'publish' ) {
				setPublishOpen( true );
				return;
			}
			setStep(
				target === 'published' && meta.status === 'draft'
					? 'design'
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
					rawDispatch( { type: 'saved', campaign, sent } );
					setMeta( campaign );
					setSaveError( '' );
					snackbar(
						__( 'Saved', 'productboxes-mix-and-match-box-builder' )
					);
					return campaign;
				} )
				.catch( ( error ) => {
					setSaveError(
						errorMessage(
							error,
							__(
								'The box could not be saved.',
								'productboxes-mix-and-match-box-builder'
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
		[ initial.id, snackbar ]
	);

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
			return undefined;
		}
		const warn = ( event ) => {
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener( 'beforeunload', warn );
		return () => window.removeEventListener( 'beforeunload', warn );
	}, [ dirty ] );

	// After a blocked Continue, move focus to the first field with a problem.
	useEffect( () => {
		if ( attempted[ step ] ) {
			const field = document.querySelector(
				'.mmbb-ed__side [aria-invalid="true"]'
			);
			if ( field ) {
				field.focus();
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ attempted ] );

	const labels = stepLabels();
	const isStep = STEPS.includes( step );
	const errors =
		isStep && attempted[ step ] ? validateStep( step, draft ) : {};
	const problems = validateAll( draft );
	const index = STEPS.indexOf( step );

	const openPublish = () => {
		setPublishResult( null );
		setPublishOpen( true );
		setServerErrors( [] );
	};

	const next = () => {
		if ( Object.keys( validateStep( step, draft ) ).length ) {
			setAttempted( ( a ) => ( { ...a, [ step ]: true } ) );
			return;
		}
		if ( index === STEPS.length - 1 ) {
			openPublish();
			return;
		}
		goTo( STEPS[ index + 1 ] );
	};

	const goLive = ( body ) => {
		if ( Object.keys( validateAll( draft ) ).length ) {
			setAttempted( { products: true, discounts: true, design: true } );
			return;
		}
		setBusy( true );
		setServerErrors( [] );
		const saved = dirty ? save() : Promise.resolve( true );
		saved
			.then( () => publishCampaign( initial.id, body ) )
			.then( ( campaign ) => {
				setMeta( campaign );
				rawDispatch( {
					type: 'saved',
					campaign,
					sent: stateRef.current.draft,
				} );
				setPublishResult( campaign );
				if ( campaign.placement.page_id ) {
					setPageId( campaign.placement.page_id );
				}
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
				snackbar(
					errorMessage(
						error,
						__(
							'The box could not go live.',
							'productboxes-mix-and-match-box-builder'
						)
					)
				);
			} )
			.finally( () => setBusy( false ) );
	};

	const saveByHand = () =>
		save().catch( () => {
			// The sidebar shows the error.
		} );

	const stepProps = { draft, errors, dispatch, catalog };
	let side = null;
	if ( step === 'products' ) {
		side = <ProductsStep { ...stepProps } />;
	} else if ( step === 'discounts' ) {
		side = (
			<>
				<RulesStep { ...stepProps } />
				<BasicsStep { ...stepProps } section="schedule" />
			</>
		);
	} else if ( step === 'design' ) {
		side = <DesignStep { ...stepProps } />;
	}

	const previewUrl = meta.preview_url || initial.preview_url;
	const origin = originOf( previewUrl, window.location.href );
	let saveLabel = __( 'Save', 'productboxes-mix-and-match-box-builder' );
	if ( saving ) {
		saveLabel = __( 'Saving…', 'productboxes-mix-and-match-box-builder' );
	} else if ( ! dirty ) {
		saveLabel = __( 'Saved', 'productboxes-mix-and-match-box-builder' );
	} else if ( meta.post_status === 'draft' ) {
		saveLabel = __(
			'Save draft',
			'productboxes-mix-and-match-box-builder'
		);
	}

	return (
		<div className="mmbb-ed">
			<header className="mmbb-ed__top">
				<BackLink href={ urls.campaigns } />
				<Button
					icon={ undo }
					label={ __(
						'Undo',
						'productboxes-mix-and-match-box-builder'
					) }
					accessibleWhenDisabled
					disabled={ ! state.past.length }
					onClick={ () => rawDispatch( { type: 'undo' } ) }
					size="compact"
				/>
				<Button
					icon={ redo }
					label={ __(
						'Redo',
						'productboxes-mix-and-match-box-builder'
					) }
					accessibleWhenDisabled
					disabled={ ! state.future.length }
					onClick={ () => rawDispatch( { type: 'redo' } ) }
					size="compact"
				/>
				<nav
					className="mmbb-ed__steps"
					aria-label={ __(
						'Steps',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					{ STEPS.map( ( name, i ) => {
						const current = name === step;
						const done =
							! current &&
							visited.includes( name ) &&
							! problems[ name ];
						return (
							<Button
								key={ name }
								variant={ current ? 'secondary' : 'tertiary' }
								icon={ done ? check : undefined }
								aria-current={ current ? 'step' : undefined }
								onClick={ () => goTo( name ) }
								__next40pxDefaultSize
							>
								{ done
									? labels[ name ]
									: sprintf(
											/* translators: 1: Step number, 2: Step name. */
											__(
												'%1$d · %2$s',
												'productboxes-mix-and-match-box-builder'
											),
											i + 1,
											labels[ name ]
									  ) }
							</Button>
						);
					} ) }
				</nav>
				<div className="mmbb-ed__device">
					<ToggleGroupControl
						label={ __(
							'Preview size',
							'productboxes-mix-and-match-box-builder'
						) }
						hideLabelFromVision
						isBlock
						value={ device }
						onChange={ ( value ) =>
							setDevice(
								DEVICES.includes( value ) ? value : 'desktop'
							)
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption
							value="desktop"
							label={ __(
								'Desktop',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
						<ToggleGroupControlOption
							value="tablet"
							label={ __(
								'Tablet',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
						<ToggleGroupControlOption
							value="mobile"
							label={ __(
								'Phone',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
					</ToggleGroupControl>
				</div>
				<Button
					icon={ external }
					label={ __(
						'Open preview in a new tab',
						'productboxes-mix-and-match-box-builder'
					) }
					href={ previewUrl }
					target="_blank"
					rel="noopener noreferrer"
					size="compact"
				/>
				<Button
					variant="tertiary"
					isBusy={ saving }
					accessibleWhenDisabled
					disabled={ saving }
					onClick={ saveByHand }
					__next40pxDefaultSize
				>
					{ saveLabel }
				</Button>
				<Button
					variant="primary"
					onClick={ openPublish }
					__next40pxDefaultSize
				>
					{ __(
						'Publish',
						'productboxes-mix-and-match-box-builder'
					) }
				</Button>
			</header>

			{ step === 'published' ? (
				<div className="mmbb-ed__published">
					<PublishedStep campaign={ meta } draft={ draft } />
				</div>
			) : (
				<div className="mmbb-ed__body">
					<PreviewStage
						src={ previewUrl }
						origin={ origin }
						boxId={ initial.id }
						draft={ draft }
						changed={ draft !== loadedDraft.current }
						device={ device }
					/>
					<aside
						className="mmbb-ed__side"
						aria-label={ sideLabels()[ step ] }
					>
						<div className="mmbb-ed__side-head">
							<h2>{ sideLabels()[ step ] }</h2>
							{ step === 'products' ? (
								<p>
									{ sprintf(
										/* translators: %d: Number of products picked. */
										__(
											'%d products picked. Shoppers see them in this order.',
											'productboxes-mix-and-match-box-builder'
										),
										draft.config.products.ids.length
									) }
								</p>
							) : null }
						</div>
						<div className="mmbb-ed__side-scroll">
							{ saveError && ! saving ? (
								<Notice status="error" isDismissible={ false }>
									{ saveError }
								</Notice>
							) : null }
							{ side }
						</div>
						<div className="mmbb-ed__side-foot">
							{ index > 0 ? (
								<Button
									variant="secondary"
									onClick={ () => goTo( STEPS[ index - 1 ] ) }
									__next40pxDefaultSize
								>
									{ __(
										'Back',
										'productboxes-mix-and-match-box-builder'
									) }
								</Button>
							) : (
								<span />
							) }
							<Button
								variant="primary"
								onClick={ next }
								__next40pxDefaultSize
							>
								{ continueLabels()[ step ] }
							</Button>
						</div>
					</aside>
				</div>
			) }

			{ publishOpen ? (
				<Modal
					className="mmbb-app-modal mmbb-ed__publish"
					title={
						publishResult
							? __(
									'Published',
									'productboxes-mix-and-match-box-builder'
							  )
							: sprintf(
									/* translators: %s: Box name. */
									__(
										'Publish %s',
										'productboxes-mix-and-match-box-builder'
									),
									draft.title
							  )
					}
					size="large"
					onRequestClose={ () => setPublishOpen( false ) }
				>
					{ publishResult ? (
						<PublishedStep
							campaign={ publishResult }
							draft={ draft }
						/>
					) : (
						<PublishStep
							draft={ draft }
							campaign={ meta }
							page={ { pageId, setPageId } }
							problems={ problems }
							serverErrors={ serverErrors }
							busy={ busy }
							dispatch={ dispatch }
							onPublish={ goLive }
							onCancel={ () => setPublishOpen( false ) }
							onOpenStep={ ( target ) => {
								setAttempted( ( a ) => ( {
									...a,
									[ target ]: true,
								} ) );
								setPublishOpen( false );
								goTo( target );
							} }
						/>
					) }
				</Modal>
			) : null }
		</div>
	);
}

/**
 * The full-screen box editor. Loads the box, then hands it to the editor.
 *
 * @param {Object} props
 * @param {number} props.id Box id.
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
		<div className="mmbb-ed">
			<header className="mmbb-ed__top">
				<BackLink href={ urls.campaigns } />
			</header>
			<div className="mmbb-ed__state">
				{ error ? (
					<Notice status="error" isDismissible={ false }>
						<p>
							{ errorMessage(
								error,
								__(
									'The box could not be opened.',
									'productboxes-mix-and-match-box-builder'
								)
							) }
						</p>
						<Button variant="secondary" onClick={ reload }>
							{ __(
								'Try again',
								'productboxes-mix-and-match-box-builder'
							) }
						</Button>
					</Notice>
				) : (
					<p role="status">
						<Spinner />
						{ __(
							'Loading box…',
							'productboxes-mix-and-match-box-builder'
						) }
					</p>
				) }
			</div>
		</div>
	);
}
