import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Button,
	Card,
	Checkbox,
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

const STEP_LABELS = () => ( {
	products: __( 'Products', 'productboxes-mix-and-match-box-builder' ),
	discounts: __( 'Discounts', 'productboxes-mix-and-match-box-builder' ),
	design: __( 'Design', 'productboxes-mix-and-match-box-builder' ),
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
	return page.pageId > 0;
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
	const ready = placementReady( page );
	// Already on the store: the button saves instead of launching.
	const published = campaign.post_status !== 'draft';

	const copyShortcode = () =>
		copyText( shortcode ).then( ( ok ) =>
			toast(
				ok
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

	const changeTested = ( on ) => {
		setTestDone( on );
		markTestDone( on ).catch( () => {
			setTestDone( ! on );
			toast(
				__(
					'That could not be saved.',
					'productboxes-mix-and-match-box-builder'
				)
			);
		} );
	};

	const placeLine = __(
		'The block is added to the top of the page you picked.',
		'productboxes-mix-and-match-box-builder'
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
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<TextField
							aria-label={ __(
								'Search pages',
								'productboxes-mix-and-match-box-builder'
							) }
							prefix="search"
							placeholder={ __(
								'Search pages',
								'productboxes-mix-and-match-box-builder'
							) }
							value={ pageSearch }
							onChange={ ( event ) =>
								setPageSearch( event.target.value )
							}
						/>
						<SelectField
							label={ __(
								'Page',
								'productboxes-mix-and-match-box-builder'
							) }
							value={ page.pageId ? String( page.pageId ) : '' }
							options={ [
								{
									value: '',
									label: __(
										'Choose a page',
										'productboxes-mix-and-match-box-builder'
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
											'productboxes-mix-and-match-box-builder'
									  )
									: __(
											'The block goes in as the first block. Move it in the editor any time.',
											'productboxes-mix-and-match-box-builder'
									  )
							}
							onChange={ ( event ) =>
								page.setPageId(
									Number( event.target.value ) || 0
								)
							}
						/>
						<div className="mmbb-editor__stack mmbb-editor__stack--tight mmbb-editor__rule">
							<span className="mmbb-editor__label">
								{ __(
									'Or paste the shortcode anywhere',
									'productboxes-mix-and-match-box-builder'
								) }
							</span>
							<div className="mmbb-editor__code">
								<code className="mmbb-code">{ shortcode }</code>
								<Button
									size="sm"
									icon="copy"
									onClick={ copyShortcode }
								>
									{ __(
										'Copy',
										'productboxes-mix-and-match-box-builder'
									) }
								</Button>
							</div>
						</div>
					</div>
				</Card>

				<Card
					title={ __(
						'Before you go live',
						'productboxes-mix-and-match-box-builder'
					) }
					subtitle={ __(
						'Two minutes now saves a refund later.',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<ul className="mmbb-editor__checks">
						<li>
							<Check done={ ready } />
							<span className="mmbb-editor__grow">
								<b>
									{ __(
										'Builder placed',
										'productboxes-mix-and-match-box-builder'
									) }
								</b>
								<span className="mmbb-editor__sub">
									{ ready
										? placeLine
										: __(
												'Choose where the builder goes.',
												'productboxes-mix-and-match-box-builder'
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
										'productboxes-mix-and-match-box-builder'
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
									'productboxes-mix-and-match-box-builder'
								) }
								checked={ testDone }
								onChange={ changeTested }
							/>
							<span className="mmbb-editor__grow">
								<b>
									{ __(
										'Run a test order',
										'productboxes-mix-and-match-box-builder'
									) }
								</b>
								<span className="mmbb-editor__sub">
									{ __(
										'Build a box, check the price and the cart line, then cancel the order.',
										'productboxes-mix-and-match-box-builder'
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
									'productboxes-mix-and-match-box-builder'
								) }
							</Button>
						</li>
					</ul>
				</Card>
			</div>

			<div className="mmbb-editor__side">
				<Card
					title={ __(
						'Summary',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<div className="mmbb-editor__stack">
						<dl className="mmbb-editor__summary">
							<div>
								<dt>
									{ __(
										'Type',
										'productboxes-mix-and-match-box-builder'
									) }
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
										'productboxes-mix-and-match-box-builder'
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
													'productboxes-mix-and-match-box-builder'
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
													'productboxes-mix-and-match-box-builder'
												),
												config.products.term_ids.length
										  ) }
								</dd>
							</div>
							<div>
								<dt>
									{ __(
										'Schedule',
										'productboxes-mix-and-match-box-builder'
									) }
								</dt>
								<dd>{ scheduleText }</dd>
							</div>
							<div>
								<dt>
									{ __(
										'Page',
										'productboxes-mix-and-match-box-builder'
									) }
								</dt>
								<dd>
									{ ( chosen && chosen.title ) ||
										__(
											'Not chosen yet',
											'productboxes-mix-and-match-box-builder'
										) }
								</dd>
							</div>
						</dl>
						{ problemSteps.length || serverList.length ? (
							<Notice
								tone="critical"
								title={ __(
									'Fix these before going live',
									'productboxes-mix-and-match-box-builder'
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
														'productboxes-mix-and-match-box-builder'
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
									'productboxes-mix-and-match-box-builder'
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
							{ published
								? __(
										'Save changes',
										'productboxes-mix-and-match-box-builder'
								  )
								: __(
										'Go live',
										'productboxes-mix-and-match-box-builder'
								  ) }
						</Button>
						<span className="mmbb-editor__fine">
							{ published
								? __(
										'Shoppers see the changes as soon as you save.',
										'productboxes-mix-and-match-box-builder'
								  )
								: __(
										'Goes live now and switches on at the start date if it’s later.',
										'productboxes-mix-and-match-box-builder'
								  ) }
						</span>
					</div>
				</Card>
			</div>
		</div>
	);
}
