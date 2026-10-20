import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Button,
	Card,
	Checkbox,
	ChoiceCard,
	Icon,
	Notice,
	SelectField,
	TextField,
	useMoney,
} from '../../components';
import { getPages, getSetup, markTestDone } from '../api';
import { copyText } from '../copy-text';
import { useAdmin } from '../context';
import { scheduleLabel, typeSummary } from '../format';
import { useRequest } from '../hooks';
import { useToast } from '../toast';
import { slugInput } from './state';

const STEP_LABELS = () => ( {
	basics: __( 'Basics', 'mix-and-max-box-builder' ),
	products: __( 'Products', 'mix-and-max-box-builder' ),
	rules: __( 'Box rules', 'mix-and-max-box-builder' ),
	design: __( 'Design', 'mix-and-max-box-builder' ),
	publish: __( 'Publish', 'mix-and-max-box-builder' ),
} );

function Check( { done } ) {
	return (
		<span className={ 'mmbb-editor__tick' + ( done ? ' is-done' : '' ) }>
			{ done ? (
				<Icon name="check" size={ 14 } strokeWidth={ 2.75 } />
			) : null }
		</span>
	);
}

// Where the checklist, summary and Go live button read the chosen placement.
export function placementReady( page ) {
	if ( page.mode === 'existing' ) {
		return page.pageId > 0;
	}
	return page.title.trim() !== '' && page.slug.trim() !== '';
}

export default function PublishStep( {
	draft,
	campaign,
	page,
	problems,
	serverErrors,
	busy,
	onGoLive,
	onOpenStep,
} ) {
	const { locale, timezone, money, storeUrl } = useAdmin();
	const formatMoney = useMoney();
	const toast = useToast();
	const { config } = draft;
	const decimals = Number.isInteger( money.decimals ) ? money.decimals : 2;
	const [ pageSearch, setPageSearch ] = useState( '' );
	const [ testDone, setTestDone ] = useState( false );
	const pages = useRequest(
		() => getPages( { search: pageSearch, per_page: 100 } ),
		[ pageSearch ]
	);
	const setup = useRequest( () => getSetup(), [] );

	useEffect( () => {
		if ( setup.data ) {
			setTestDone( Boolean( setup.data.test_order ) );
		}
	}, [ setup.data ] );

	const labels = STEP_LABELS();
	const shortcode = campaign.placement.shortcode;
	const pageList = pages.data || [];
	const chosen = pageList.find( ( p ) => p.id === page.pageId );
	const slug = page.slug;
	const ready = placementReady( page );

	const copyShortcode = () =>
		copyText( shortcode ).then( ( ok ) =>
			toast(
				ok
					? __( 'Shortcode copied', 'mix-and-max-box-builder' )
					: __(
							'Copy didn’t work. Select it and copy by hand.',
							'mix-and-max-box-builder'
					  )
			)
		);

	const changeTested = ( on ) => {
		setTestDone( on );
		markTestDone( on ).catch( () => {
			setTestDone( ! on );
			toast(
				__( 'That could not be saved.', 'mix-and-max-box-builder' )
			);
		} );
	};

	const placeLine =
		page.mode === 'existing'
			? __(
					'The block is added to the top of the page you picked.',
					'mix-and-max-box-builder'
			  )
			: sprintf(
					/* translators: %s: Page address such as /holiday-box. */
					__(
						'A new page at %s is created when you go live.',
						'mix-and-max-box-builder'
					),
					'/' + slug
			  );
	const scheduleText = scheduleLabel(
		{ config, status: 'active' },
		{ locale, timezone }
	);
	const productCount =
		config.products.source === 'manual' ? config.products.ids.length : 0;
	const problemSteps = Object.keys( problems );
	const serverList = serverErrors || [];

	return (
		<div className="mmbb-editor__cols">
			<div className="mmbb-editor__main">
				<Card
					title={ __(
						'Where shoppers find it',
						'mix-and-max-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<div className="mmbb-editor__duo">
							<ChoiceCard
								name="place"
								value="new"
								selected={ page.mode === 'new' }
								onSelect={ () => page.setMode( 'new' ) }
								icon="plus"
								title={ __(
									'Create a new page',
									'mix-and-max-box-builder'
								) }
								description={ sprintf(
									/* translators: %s: Page address such as /holiday-box. */
									__(
										'We add a page with the Box Builder block at %s.',
										'mix-and-max-box-builder'
									),
									'/' + slug
								) }
								tag={ __(
									'Fastest',
									'mix-and-max-box-builder'
								) }
							/>
							<ChoiceCard
								name="place"
								value="existing"
								selected={ page.mode === 'existing' }
								onSelect={ () => page.setMode( 'existing' ) }
								icon="layers"
								title={ __(
									'Add to a page I have',
									'mix-and-max-box-builder'
								) }
								description={ __(
									'Insert the builder at the top of a page you pick.',
									'mix-and-max-box-builder'
								) }
							/>
						</div>
						{ page.mode === 'new' ? (
							<div className="mmbb-editor__pair">
								<TextField
									label={ __(
										'Page title',
										'mix-and-max-box-builder'
									) }
									value={ page.title }
									maxLength={ 200 }
									onChange={ ( event ) =>
										page.setTitle( event.target.value )
									}
								/>
								<TextField
									label={ __(
										'Address',
										'mix-and-max-box-builder'
									) }
									prefix="/"
									value={ slug }
									onChange={ ( event ) =>
										page.setSlug(
											slugInput( event.target.value )
										)
									}
								/>
							</div>
						) : (
							<>
								<TextField
									aria-label={ __(
										'Search pages',
										'mix-and-max-box-builder'
									) }
									prefix="search"
									placeholder={ __(
										'Search pages',
										'mix-and-max-box-builder'
									) }
									value={ pageSearch }
									onChange={ ( event ) =>
										setPageSearch( event.target.value )
									}
								/>
								<SelectField
									label={ __(
										'Page',
										'mix-and-max-box-builder'
									) }
									value={
										page.pageId ? String( page.pageId ) : ''
									}
									options={ [
										{
											value: '',
											label: __(
												'Choose a page',
												'mix-and-max-box-builder'
											),
										},
										...pageList.map( ( p ) => ( {
											value: String( p.id ),
											label: p.title,
										} ) ),
									] }
									help={
										chosen && chosen.has_builder
											? __(
													'This page already has a builder. Going live adds this campaign’s builder at the top.',
													'mix-and-max-box-builder'
											  )
											: __(
													'The block goes in as the first block. Move it in the editor any time.',
													'mix-and-max-box-builder'
											  )
									}
									onChange={ ( event ) =>
										page.setPageId(
											Number( event.target.value ) || 0
										)
									}
								/>
							</>
						) }
						<div className="mmbb-editor__stack mmbb-editor__stack--tight mmbb-editor__rule">
							<span className="mmbb-editor__label">
								{ __(
									'Or paste the shortcode anywhere',
									'mix-and-max-box-builder'
								) }
							</span>
							<div className="mmbb-editor__code">
								<code className="mmbb-code">{ shortcode }</code>
								<Button
									size="sm"
									icon="copy"
									onClick={ copyShortcode }
								>
									{ __( 'Copy', 'mix-and-max-box-builder' ) }
								</Button>
							</div>
						</div>
					</div>
				</Card>

				<Card
					title={ __(
						'Before you go live',
						'mix-and-max-box-builder'
					) }
					subtitle={ __(
						'Two minutes now saves a refund later.',
						'mix-and-max-box-builder'
					) }
				>
					<ul className="mmbb-editor__checks">
						<li>
							<Check done={ ready } />
							<span className="mmbb-editor__grow">
								<b>
									{ __(
										'Builder placed',
										'mix-and-max-box-builder'
									) }
								</b>
								<span className="mmbb-editor__sub">
									{ ready
										? placeLine
										: __(
												'Choose where the builder goes.',
												'mix-and-max-box-builder'
										  ) }
								</span>
							</span>
						</li>
						<li>
							<Check done />
							<span className="mmbb-editor__grow">
								<b>
									{ __(
										'Schedule set',
										'mix-and-max-box-builder'
									) }
								</b>
								<span className="mmbb-editor__sub">
									{ scheduleText }
								</span>
							</span>
						</li>
						<li className={ testDone ? undefined : 'is-todo' }>
							<Checkbox
								aria-label={ __(
									'Test order placed',
									'mix-and-max-box-builder'
								) }
								checked={ testDone }
								onChange={ changeTested }
							/>
							<span className="mmbb-editor__grow">
								<b>
									{ __(
										'Run a test order',
										'mix-and-max-box-builder'
									) }
								</b>
								<span className="mmbb-editor__sub">
									{ __(
										'Build a box, check the price and the cart line, then cancel the order.',
										'mix-and-max-box-builder'
									) }
								</span>
							</span>
							<Button
								size="sm"
								icon="external"
								href={ campaign.placement.page_url || storeUrl }
								target="_blank"
								rel="noopener noreferrer"
							>
								{ __(
									'Open builder',
									'mix-and-max-box-builder'
								) }
							</Button>
						</li>
					</ul>
				</Card>
			</div>

			<div className="mmbb-editor__side">
				<Card title={ __( 'Summary', 'mix-and-max-box-builder' ) }>
					<div className="mmbb-editor__stack">
						<dl className="mmbb-editor__summary">
							<div>
								<dt>
									{ __( 'Type', 'mix-and-max-box-builder' ) }
								</dt>
								<dd>
									{ typeSummary(
										config,
										formatMoney,
										decimals
									) }
								</dd>
							</div>
							<div>
								<dt>
									{ __(
										'Products',
										'mix-and-max-box-builder'
									) }
								</dt>
								<dd>
									{ config.products.source === 'manual'
										? sprintf(
												/* translators: %d: Number of products. */
												_n(
													'%d product',
													'%d products',
													productCount,
													'mix-and-max-box-builder'
												),
												productCount
										  )
										: sprintf(
												/* translators: %d: Number of categories or tags. */
												_n(
													'%d term',
													'%d terms',
													config.products.term_ids
														.length,
													'mix-and-max-box-builder'
												),
												config.products.term_ids.length
										  ) }
								</dd>
							</div>
							<div>
								<dt>
									{ __(
										'Schedule',
										'mix-and-max-box-builder'
									) }
								</dt>
								<dd>{ scheduleText }</dd>
							</div>
							<div>
								<dt>
									{ __( 'Page', 'mix-and-max-box-builder' ) }
								</dt>
								<dd>
									{ page.mode === 'existing'
										? ( chosen && chosen.title ) ||
										  __(
												'Not chosen yet',
												'mix-and-max-box-builder'
										  )
										: sprintf(
												/* translators: %s: Page address such as /holiday-box. */
												__(
													'%s (new)',
													'mix-and-max-box-builder'
												),
												'/' + slug
										  ) }
								</dd>
							</div>
						</dl>
						{ problemSteps.length || serverList.length ? (
							<Notice
								tone="critical"
								title={ __(
									'Fix these before going live',
									'mix-and-max-box-builder'
								) }
							>
								<ul className="mmbb-editor__problems">
									{ problemSteps.map( ( step ) => (
										<li key={ step }>
											<Button
												size="sm"
												variant="ghost"
												onClick={ () =>
													onOpenStep( step )
												}
											>
												{ sprintf(
													/* translators: %s: Name of a wizard step. */
													__(
														'Open %s',
														'mix-and-max-box-builder'
													),
													labels[ step ]
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
						{ ! testDone ? (
							<Notice tone="warning">
								{ __(
									'No test order yet. You can still go live.',
									'mix-and-max-box-builder'
								) }
							</Notice>
						) : null }
						<Button
							variant="max"
							size="lg"
							fullWidth
							iconRight="arrowRight"
							loading={ busy }
							disabled={ ! ready }
							onClick={ onGoLive }
						>
							{ __( 'Go live', 'mix-and-max-box-builder' ) }
						</Button>
						<span className="mmbb-editor__fine">
							{ __(
								'Goes live now and switches on at the start date if it’s later.',
								'mix-and-max-box-builder'
							) }
						</span>
					</div>
				</Card>
			</div>
		</div>
	);
}
