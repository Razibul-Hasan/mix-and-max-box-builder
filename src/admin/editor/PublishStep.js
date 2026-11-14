import {
	Button,
	Notice,
	SearchControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useMemo, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { cleanForSlug } from '@wordpress/url';
import { getPages } from '../api';
import { useSnackbar } from '../components';
import { copyText } from '../copy-text';
import { useAdmin } from '../context';
import { useRequest } from '../hooks';
import { TEMPLATES } from './design-defaults';
import { localInputToUtc, utcToLocalInput } from './time';
import { ToggleGroupControl, ToggleGroupControlOption } from '../components/wp';

const PLACEMENTS = [
	{
		id: 'existing_page',
		title: __(
			'Add to a page I have',
			'productboxes-mix-and-match-box-builder'
		),
		description: __(
			'It goes at the top of the page.',
			'productboxes-mix-and-match-box-builder'
		),
	},
	{
		id: 'new_page',
		title: __(
			'Create a new page',
			'productboxes-mix-and-match-box-builder'
		),
		description: __(
			'We make the page and add the box.',
			'productboxes-mix-and-match-box-builder'
		),
	},
	{
		id: 'none',
		title: __(
			'I’ll place it myself',
			'productboxes-mix-and-match-box-builder'
		),
		description: __(
			'Use the ProductBoxes Box Builder block or a shortcode.',
			'productboxes-mix-and-match-box-builder'
		),
	},
];

function sizeBadge( config ) {
	if ( config.type === 'bundle' ) {
		return sprintf(
			/* translators: %d: Number of items. */
			_n(
				'%d item',
				'%d items',
				config.bundle.qty,
				'productboxes-mix-and-match-box-builder'
			),
			config.bundle.qty
		);
	}
	const quantities = (
		config.type === 'fixed' ? config.sizes : config.tiers
	).map( ( row ) => Number( row.qty ) );
	const maximum = quantities.length
		? Math.max( ...quantities )
		: config.box.capacity;
	return sprintf(
		/* translators: %d: Maximum number of items in a box. */
		__( 'Up to %d items', 'productboxes-mix-and-match-box-builder' ),
		maximum
	);
}

function discountBadge( config ) {
	if ( config.type === 'bundle' ) {
		return __( 'Bundle price', 'productboxes-mix-and-match-box-builder' );
	}
	const rows = config.type === 'fixed' ? config.sizes : config.tiers;
	const percentages = rows
		.filter( ( row ) => row.discount_type === 'percent' )
		.map( ( row ) => Number( row.value ) );
	if ( percentages.length === rows.length && percentages.length ) {
		return sprintf(
			/* translators: %s: Discount percentage or slash-separated percentages. */
			__( '%s%% off', 'productboxes-mix-and-match-box-builder' ),
			percentages.join( ' / ' )
		);
	}
	return sprintf(
		/* translators: %d: Number of discount tiers or box sizes. */
		_n(
			'%d discount',
			'%d discounts',
			rows.length,
			'productboxes-mix-and-match-box-builder'
		),
		rows.length
	);
}

function Choice( { item, selected, onSelect, children } ) {
	return (
		<div className="mmbb-publish__choice-wrap">
			<button
				type="button"
				className={ `mmbb-publish__choice${
					selected ? ' is-selected' : ''
				}` }
				role="radio"
				aria-checked={ selected }
				onClick={ onSelect }
			>
				<span className="mmbb-publish__radio" aria-hidden="true" />
				<span>
					<strong>{ item.title }</strong>
					<small>{ item.description }</small>
				</span>
			</button>
			{ selected && children ? (
				<div className="mmbb-publish__choice-detail">{ children }</div>
			) : null }
		</div>
	);
}

export default function PublishStep( {
	draft,
	campaign,
	page,
	problems,
	serverErrors,
	busy,
	dispatch,
	onPublish,
	onCancel,
	onOpenStep,
} ) {
	const { timezone } = useAdmin();
	const snackbar = useSnackbar();
	const { config } = draft;
	const [ placement, setPlacement ] = useState( 'existing_page' );
	const [ pageSearch, setPageSearch ] = useState( '' );
	const [ pageTitle, setPageTitle ] = useState( draft.title );
	const [ timing, setTiming ] = useState(
		config.schedule.start || config.schedule.end ? 'dates' : 'now'
	);
	const pages = useRequest(
		() => getPages( { search: pageSearch, per_page: 100 } ),
		[ pageSearch ]
	);
	const shortcode = campaign.placement.shortcode;
	const problemSteps = Object.keys( problems );
	const serverList = serverErrors || [];
	const productCount =
		config.products.source === 'manual'
			? config.products.ids.length
			: config.products.term_ids.length;
	const template =
		TEMPLATES.find( ( item ) => item.id === config.design.template ) ||
		TEMPLATES[ 0 ];
	const slug = cleanForSlug( pageTitle ) || 'build-a-box';
	const ready =
		placement === 'none' ||
		( placement === 'existing_page' && page.pageId > 0 ) ||
		( placement === 'new_page' && pageTitle.trim() !== '' );

	const pageOptions = useMemo(
		() => [
			{
				value: '',
				label: __(
					'Choose a page',
					'productboxes-mix-and-match-box-builder'
				),
			},
			...( pages.data || [] ).map( ( item ) => ( {
				value: String( item.id ),
				label: item.title,
			} ) ),
		],
		[ pages.data ]
	);

	const set = ( path, value ) => dispatch( { type: 'set', path, value } );
	const chooseTiming = ( value ) => {
		setTiming( value );
		if ( value === 'now' ) {
			set( 'schedule', { ...config.schedule, start: null, end: null } );
		} else {
			set( 'schedule.countdown_end', null );
		}
	};
	const copyShortcode = () =>
		copyText( shortcode ).then( ( copied ) =>
			snackbar(
				copied
					? __(
							'Shortcode copied',
							'productboxes-mix-and-match-box-builder'
					  )
					: __(
							'Copy didn’t work. Select it and copy by hand.',
							'productboxes-mix-and-match-box-builder'
					  )
			)
		);
	const publish = () =>
		onPublish( {
			placement,
			page_id: placement === 'existing_page' ? page.pageId : 0,
			page_title: placement === 'new_page' ? pageTitle.trim() : '',
			page_slug: placement === 'new_page' ? slug : '',
		} );

	return (
		<div className="mmbb-publish">
			<div className="mmbb-publish__body">
				<div
					className="mmbb-publish__badges"
					aria-label={ __(
						'Box summary',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<span>{ sizeBadge( config ) }</span>
					<span>{ discountBadge( config ) }</span>
					<span>
						{ sprintf(
							/* translators: %d: Number of products. */
							_n(
								'%d product',
								'%d products',
								productCount,
								'productboxes-mix-and-match-box-builder'
							),
							productCount
						) }
					</span>
					<span>
						{ sprintf(
							/* translators: %s: Storefront template name. */
							__(
								'%s template',
								'productboxes-mix-and-match-box-builder'
							),
							template.name
						) }
					</span>
				</div>

				<fieldset className="mmbb-publish__choices">
					<legend>
						{ __(
							'Where should shoppers find it?',
							'productboxes-mix-and-match-box-builder'
						) }
					</legend>
					<div role="radiogroup">
						{ PLACEMENTS.map( ( item ) => (
							<Choice
								key={ item.id }
								item={ item }
								selected={ placement === item.id }
								onSelect={ () => setPlacement( item.id ) }
							>
								{ item.id === 'existing_page' ? (
									<>
										<SearchControl
											label={ __(
												'Search pages',
												'productboxes-mix-and-match-box-builder'
											) }
											value={ pageSearch }
											onChange={ setPageSearch }
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={ __(
												'Page',
												'productboxes-mix-and-match-box-builder'
											) }
											hideLabelFromVision
											value={ String(
												page.pageId || ''
											) }
											options={ pageOptions }
											onChange={ ( value ) =>
												page.setPageId(
													Number( value ) || 0
												)
											}
											__next40pxDefaultSize
											__nextHasNoMarginBottom
										/>
									</>
								) : null }
								{ item.id === 'new_page' ? (
									<TextControl
										label={ __(
											'Page title',
											'productboxes-mix-and-match-box-builder'
										) }
										value={ pageTitle }
										onChange={ setPageTitle }
										help={ sprintf(
											/* translators: %s: Preview of a page path. */
											__(
												'Address: /%s/',
												'productboxes-mix-and-match-box-builder'
											),
											slug
										) }
										__next40pxDefaultSize
										__nextHasNoMarginBottom
									/>
								) : null }
								{ item.id === 'none' ? (
									<div className="mmbb-publish__shortcode">
										<code>{ shortcode }</code>
										<Button
											variant="secondary"
											onClick={ copyShortcode }
											__next40pxDefaultSize
										>
											{ __(
												'Copy',
												'productboxes-mix-and-match-box-builder'
											) }
										</Button>
										<p>
											{ __(
												'Or add the ProductBoxes Box Builder block.',
												'productboxes-mix-and-match-box-builder'
											) }
										</p>
									</div>
								) : null }
							</Choice>
						) ) }
					</div>
				</fieldset>

				<div className="mmbb-publish__when">
					<ToggleGroupControl
						label={ __(
							'When',
							'productboxes-mix-and-match-box-builder'
						) }
						value={ timing }
						onChange={ chooseTiming }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption
							value="now"
							label={ __(
								'Right away',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
						<ToggleGroupControlOption
							value="dates"
							label={ __(
								'Pick dates',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
					</ToggleGroupControl>
					{ timing === 'dates' ? (
						<div className="mmbb-publish__schedule">
							<TextControl
								type="datetime-local"
								label={ __(
									'Starts',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ utcToLocalInput(
									config.schedule.start,
									timezone
								) }
								onChange={ ( value ) =>
									set(
										'schedule.start',
										localInputToUtc( value, timezone )
									)
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<TextControl
								type="datetime-local"
								label={ __(
									'Ends',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ utcToLocalInput(
									config.schedule.end,
									timezone
								) }
								onChange={ ( value ) =>
									set(
										'schedule.end',
										localInputToUtc( value, timezone )
									)
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								className="mmbb-publish__countdown"
								label={ __(
									'Show a countdown in the last 3 days',
									'productboxes-mix-and-match-box-builder'
								) }
								checked={ config.schedule.countdown_days > 0 }
								onChange={ ( enabled ) =>
									set(
										'schedule.countdown_days',
										enabled ? 3 : 0
									)
								}
								__nextHasNoMarginBottom
							/>
							<p className="mmbb-publish__timezone">
								{ sprintf(
									/* translators: %s: Store time zone name or UTC offset. */
									__(
										'Times use the store time zone: %s.',
										'productboxes-mix-and-match-box-builder'
									),
									timezone
								) }
							</p>
						</div>
					) : null }
				</div>

				{ problemSteps.length || serverList.length ? (
					<Notice status="error" isDismissible={ false }>
						<p>
							{ __(
								'Fix these before publishing:',
								'productboxes-mix-and-match-box-builder'
							) }
						</p>
						<ul>
							{ problemSteps.map( ( step ) => (
								<li key={ step }>
									<Button
										variant="link"
										onClick={ () => onOpenStep( step ) }
									>
										{ __(
											'Open the step with the problem',
											'productboxes-mix-and-match-box-builder'
										) }
									</Button>
								</li>
							) ) }
							{ serverList.map( ( error ) => (
								<li key={ error.path + error.code }>
									{ error.message }
								</li>
							) ) }
						</ul>
					</Notice>
				) : null }
			</div>

			<div className="mmbb-publish__footer">
				<Button
					variant="tertiary"
					onClick={ onCancel }
					__next40pxDefaultSize
				>
					{ __( 'Cancel', 'productboxes-mix-and-match-box-builder' ) }
				</Button>
				<Button
					variant="primary"
					isBusy={ busy }
					disabled={ busy || ! ready }
					onClick={ publish }
					__next40pxDefaultSize
				>
					{ __(
						'Publish',
						'productboxes-mix-and-match-box-builder'
					) }
				</Button>
			</div>
		</div>
	);
}
