import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Card,
	ChoiceCard,
	Icon,
	Notice,
	PageHeader,
	SegmentedControl,
	SelectField,
	TextField,
	Toggle,
	useMoney,
} from '../../components';
import { getPages, getSettings, saveSettings } from '../api';
import { errorMessage, useRequest } from '../hooks';
import Shell from '../Shell';
import { useToast } from '../toast';
import './settings.css';

const copy = ( value ) => JSON.parse( JSON.stringify( value ) );
const same = ( one, two ) => JSON.stringify( one ) === JSON.stringify( two );

export function validateSettings( settings ) {
	const errors = {};
	const threshold = Number( settings.low_stock.threshold );
	const retention = Number( settings.analytics_retention_days );
	if ( ! Number.isInteger( threshold ) || threshold < 1 || threshold > 100 ) {
		errors.low_stock = __(
			'Enter a whole number from 1 to 100.',
			'mix-and-max-box-builder'
		);
	}
	if ( ! Number.isInteger( retention ) || retention < 7 || retention > 730 ) {
		errors.analytics_retention_days = __(
			'Enter a whole number from 7 to 730.',
			'mix-and-max-box-builder'
		);
	}
	if ( settings.cta_label.length > 32 ) {
		errors.cta_label = __(
			'Use 32 characters or fewer.',
			'mix-and-max-box-builder'
		);
	}
	if ( settings.empty_slot_hint.length > 60 ) {
		errors.empty_slot_hint = __(
			'Use 60 characters or fewer.',
			'mix-and-max-box-builder'
		);
	}
	return errors;
}

function ToggleRow( { setting, change, label, description, disabled } ) {
	return (
		<Toggle
			label={ label }
			description={ description }
			checked={ !! setting }
			disabled={ disabled }
			onChange={ change }
		/>
	);
}

export default function Settings() {
	const toast = useToast();
	const money = useMoney();
	const request = useRequest( () => getSettings(), [] );
	const pages = useRequest( () => getPages( { per_page: 100 } ), [] );
	const [ saved, setSaved ] = useState( null );
	const [ draft, setDraft ] = useState( null );
	const [ saving, setSaving ] = useState( false );
	const [ errors, setErrors ] = useState( {} );
	const [ saveError, setSaveError ] = useState( '' );
	const [ active, setActive ] = useState( 'general' );

	useEffect( () => {
		if ( request.data ) {
			setSaved( copy( request.data ) );
			setDraft( copy( request.data ) );
		}
	}, [ request.data ] );

	const dirty = !! draft && !! saved && ! same( draft, saved );
	useEffect( () => {
		const warn = ( event ) => {
			if ( dirty ) {
				event.preventDefault();
				event.returnValue = '';
			}
		};
		window.addEventListener( 'beforeunload', warn );
		return () => window.removeEventListener( 'beforeunload', warn );
	}, [ dirty ] );

	useEffect( () => {
		if ( ! window.IntersectionObserver ) {
			return undefined;
		}
		const observer = new window.IntersectionObserver(
			( entries ) => {
				const visible = entries
					.filter( ( entry ) => entry.isIntersecting )
					.sort(
						( one, two ) =>
							one.boundingClientRect.top -
							two.boundingClientRect.top
					);
				if ( visible[ 0 ] ) {
					setActive( visible[ 0 ].target.id );
				}
			},
			{ rootMargin: '-96px 0px -65% 0px' }
		);
		document
			.querySelectorAll( '.mmbb-settings__section' )
			.forEach( ( section ) => observer.observe( section ) );
		return () => observer.disconnect();
	}, [ draft ] );

	const sections = useMemo(
		() => [
			{
				id: 'general',
				icon: 'settings',
				label: __( 'General', 'mix-and-max-box-builder' ),
			},
			{
				id: 'display',
				icon: 'palette',
				label: __( 'Storefront display', 'mix-and-max-box-builder' ),
			},
			{
				id: 'cart',
				icon: 'cart',
				label: __( 'Cart & checkout', 'mix-and-max-box-builder' ),
			},
			{
				id: 'emails',
				icon: 'mail',
				label: __( 'Emails', 'mix-and-max-box-builder' ),
			},
			{
				id: 'advanced',
				icon: 'code',
				label: __( 'Advanced', 'mix-and-max-box-builder' ),
			},
		],
		[]
	);

	const change = ( key, value ) => {
		setDraft( ( current ) => ( { ...current, [ key ]: value } ) );
		setErrors( ( current ) => ( { ...current, [ key ]: undefined } ) );
		setSaveError( '' );
	};
	const changeLowStock = ( key, value ) => {
		setDraft( ( current ) => ( {
			...current,
			low_stock: { ...current.low_stock, [ key ]: value },
		} ) );
		setErrors( ( current ) => ( { ...current, low_stock: undefined } ) );
		setSaveError( '' );
	};
	const discard = () => {
		setDraft( copy( saved ) );
		setErrors( {} );
		setSaveError( '' );
	};
	const save = async () => {
		const invalid = validateSettings( draft );
		setErrors( invalid );
		if ( Object.keys( invalid ).length ) {
			const first = document.getElementById(
				'mmbb-setting-' + Object.keys( invalid )[ 0 ]
			);
			first?.focus();
			return;
		}
		setSaving( true );
		setSaveError( '' );
		const payload = {
			...draft,
			default_page_id: Number( draft.default_page_id ),
			columns: Number( draft.columns ),
			analytics_retention_days: Number( draft.analytics_retention_days ),
			low_stock: {
				...draft.low_stock,
				threshold: Number( draft.low_stock.threshold ),
			},
		};
		try {
			const result = await saveSettings( payload );
			setSaved( copy( result ) );
			setDraft( copy( result ) );
			setErrors( {} );
			toast( __( 'Settings saved', 'mix-and-max-box-builder' ) );
		} catch ( error ) {
			setSaveError(
				errorMessage(
					error,
					__(
						'The settings could not be saved.',
						'mix-and-max-box-builder'
					)
				)
			);
		} finally {
			setSaving( false );
		}
	};

	if ( request.loading && ! draft ) {
		return (
			<Shell active="settings">
				<p className="mmbb-settings__loading" role="status">
					{ __( 'Loading settings…', 'mix-and-max-box-builder' ) }
				</p>
			</Shell>
		);
	}
	if ( request.error && ! draft ) {
		return (
			<Shell active="settings">
				<Notice
					tone="critical"
					title={ __(
						'Could not load settings',
						'mix-and-max-box-builder'
					) }
					action={
						<Button onClick={ request.reload }>
							{ __( 'Try again', 'mix-and-max-box-builder' ) }
						</Button>
					}
				>
					{ errorMessage( request.error ) }
				</Notice>
			</Shell>
		);
	}
	if ( ! draft ) {
		return null;
	}

	const pageOptions = [
		{
			value: 0,
			label: __( 'No default page', 'mix-and-max-box-builder' ),
		},
		...( pages.data || [] ).map( ( page ) => ( {
			value: page.id,
			label: page.title,
		} ) ),
	];
	return (
		<>
			{ dirty && (
				<div
					className="mmbb-settings__bar"
					role="region"
					aria-label={ __(
						'Unsaved changes',
						'mix-and-max-box-builder'
					) }
				>
					<span className="mmbb-settings__bar-text">
						<Icon name="alert" size={ 18 } strokeWidth={ 2 } />
						{ __( 'Unsaved changes', 'mix-and-max-box-builder' ) }
					</span>
					<button
						type="button"
						className="mmbb-settings__discard"
						onClick={ discard }
					>
						{ __( 'Discard', 'mix-and-max-box-builder' ) }
					</button>
					<Button
						size="sm"
						variant="secondary"
						loading={ saving }
						onClick={ save }
					>
						{ __( 'Save settings', 'mix-and-max-box-builder' ) }
					</Button>
				</div>
			) }
			<Shell active="settings">
				<div className="mmbb-settings__head">
					<PageHeader
						title={ __( 'Settings', 'mix-and-max-box-builder' ) }
						subtitle={ __(
							'Store-wide defaults. Each campaign can override display and cart options.',
							'mix-and-max-box-builder'
						) }
					/>
					<Button
						variant="primary"
						disabled={ ! dirty }
						loading={ saving }
						onClick={ save }
					>
						{ __( 'Save settings', 'mix-and-max-box-builder' ) }
					</Button>
				</div>
				{ saveError && <Notice tone="critical">{ saveError }</Notice> }
				<div className="mmbb-settings__layout">
					<nav
						className="mmbb-settings__nav"
						aria-label={ __(
							'Settings sections',
							'mix-and-max-box-builder'
						) }
					>
						{ sections.map( ( section ) => (
							<a
								key={ section.id }
								href={ '#' + section.id }
								className={
									active === section.id
										? 'is-active'
										: undefined
								}
								aria-current={
									active === section.id
										? 'location'
										: undefined
								}
								onClick={ () => setActive( section.id ) }
							>
								<Icon name={ section.icon } size={ 18 } />
								{ section.label }
							</a>
						) ) }
					</nav>
					<div className="mmbb-settings__content">
						<section
							id="general"
							className="mmbb-settings__section"
						>
							<Card
								title={ __(
									'General',
									'mix-and-max-box-builder'
								) }
							>
								<div className="mmbb-settings__stack">
									<ToggleRow
										setting={ draft.enabled }
										change={ ( value ) =>
											change( 'enabled', value )
										}
										label={ __(
											'Box builders are live',
											'mix-and-max-box-builder'
										) }
										description={ __(
											'Turn off to hide every builder at once, for example during a stock count.',
											'mix-and-max-box-builder'
										) }
									/>
									<div className="mmbb-settings__pair mmbb-settings__rule">
										<SelectField
											label={ __(
												'Default builder page',
												'mix-and-max-box-builder'
											) }
											help={ __(
												'Used by the Build a box menu link and cart editing.',
												'mix-and-max-box-builder'
											) }
											value={ draft.default_page_id }
											onChange={ ( event ) =>
												change(
													'default_page_id',
													Number( event.target.value )
												)
											}
											options={ pageOptions }
										/>
										<SelectField
											label={ __(
												'Prices',
												'mix-and-max-box-builder'
											) }
											help={ __(
												'The builder follows WooCommerce currency settings.',
												'mix-and-max-box-builder'
											) }
											value="woocommerce"
											disabled
											options={ [
												{
													value: 'woocommerce',
													label:
														__(
															'Follow WooCommerce',
															'mix-and-max-box-builder'
														) +
														' (' +
														money( 1200 ) +
														')',
												},
											] }
										/>
									</div>
								</div>
							</Card>
						</section>

						<section
							id="display"
							className="mmbb-settings__section"
						>
							<Card
								title={ __(
									'Storefront display',
									'mix-and-max-box-builder'
								) }
								subtitle={ __(
									'How the builder looks inside your theme.',
									'mix-and-max-box-builder'
								) }
							>
								<div className="mmbb-settings__stack">
									<div className="mmbb-settings__pair">
										<div className="mmbb-settings__control">
											<span className="mmbb-settings__label">
												{ __(
													'Products per row on desktop',
													'mix-and-max-box-builder'
												) }
											</span>
											<SegmentedControl
												label={ __(
													'Products per row',
													'mix-and-max-box-builder'
												) }
												options={ [ 3, 4, 5 ] }
												value={ draft.columns }
												onChange={ ( value ) =>
													change( 'columns', value )
												}
											/>
										</div>
										<div className="mmbb-settings__control">
											<span className="mmbb-settings__label">
												{ __(
													'Box summary',
													'mix-and-max-box-builder'
												) }
											</span>
											<SegmentedControl
												label={ __(
													'Box summary',
													'mix-and-max-box-builder'
												) }
												options={ [
													{
														value: 'panel',
														label: __(
															'Sidebar',
															'mix-and-max-box-builder'
														),
													},
													{
														value: 'bar',
														label: __(
															'Bottom bar',
															'mix-and-max-box-builder'
														),
													},
													{
														value: 'both',
														label: __(
															'Both',
															'mix-and-max-box-builder'
														),
													},
												] }
												value={ draft.summary_layout }
												onChange={ ( value ) =>
													change(
														'summary_layout',
														value
													)
												}
											/>
											<span className="mmbb-settings__help">
												{ __(
													'Phones always get the bottom bar.',
													'mix-and-max-box-builder'
												) }
											</span>
										</div>
									</div>
									<div className="mmbb-settings__rule">
										<ToggleRow
											setting={ draft.stickers }
											change={ ( value ) =>
												change( 'stickers', value )
											}
											label={ __(
												'Savings stickers',
												'mix-and-max-box-builder'
											) }
											description={ __(
												'Yellow Save X% and Best value stickers on sizes and tiles.',
												'mix-and-max-box-builder'
											) }
										/>
									</div>
									<div className="mmbb-settings__rule mmbb-settings__stack">
										<ToggleRow
											setting={ draft.low_stock.enabled }
											change={ ( value ) =>
												changeLowStock(
													'enabled',
													value
												)
											}
											label={ __(
												'Low-stock warnings',
												'mix-and-max-box-builder'
											) }
											description={ __(
												'Shows the remaining quantity under the price.',
												'mix-and-max-box-builder'
											) }
										/>
										<TextField
											id="mmbb-setting-low_stock"
											className="mmbb-settings__narrow"
											type="number"
											min="1"
											max="100"
											label={ __(
												'Warn at',
												'mix-and-max-box-builder'
											) }
											suffix={ __(
												'or fewer',
												'mix-and-max-box-builder'
											) }
											value={ draft.low_stock.threshold }
											error={ errors.low_stock }
											disabled={
												! draft.low_stock.enabled
											}
											onChange={ ( event ) =>
												changeLowStock(
													'threshold',
													event.target.value
												)
											}
										/>
									</div>
									<div className="mmbb-settings__rule">
										<ToggleRow
											setting={ draft.unlock_toast }
											change={ ( value ) =>
												change( 'unlock_toast', value )
											}
											label={ __(
												'Celebrate unlocked tiers',
												'mix-and-max-box-builder'
											) }
											description={ __(
												'A short toast when the box reaches a new discount.',
												'mix-and-max-box-builder'
											) }
										/>
									</div>
									<div className="mmbb-settings__pair mmbb-settings__rule">
										<TextField
											id="mmbb-setting-cta_label"
											label={ __(
												'Add-to-cart button',
												'mix-and-max-box-builder'
											) }
											value={ draft.cta_label }
											maxLength={ 32 }
											error={ errors.cta_label }
											placeholder={ __(
												'Add box to cart',
												'mix-and-max-box-builder'
											) }
											onChange={ ( event ) =>
												change(
													'cta_label',
													event.target.value
												)
											}
										/>
										<TextField
											id="mmbb-setting-empty_slot_hint"
											label={ __(
												'Empty slot hint',
												'mix-and-max-box-builder'
											) }
											value={ draft.empty_slot_hint }
											maxLength={ 60 }
											error={ errors.empty_slot_hint }
											placeholder={ __(
												'Pick an item',
												'mix-and-max-box-builder'
											) }
											onChange={ ( event ) =>
												change(
													'empty_slot_hint',
													event.target.value
												)
											}
										/>
									</div>
								</div>
							</Card>
						</section>

						<section id="cart" className="mmbb-settings__section">
							<Card
								title={ __(
									'Cart & checkout',
									'mix-and-max-box-builder'
								) }
							>
								<div className="mmbb-settings__stack">
									<div className="mmbb-settings__control">
										<span className="mmbb-settings__label">
											{ __(
												'Show the box in the cart as',
												'mix-and-max-box-builder'
											) }
										</span>
										<div className="mmbb-settings__choices">
											<ChoiceCard
												name="cart-display"
												value="bundle"
												selected={
													draft.cart_display ===
													'bundle'
												}
												onSelect={ ( value ) =>
													change(
														'cart_display',
														value
													)
												}
												icon="box"
												title={ __(
													'One bundled line',
													'mix-and-max-box-builder'
												) }
												description={ __(
													'Box name, price, and the items listed underneath.',
													'mix-and-max-box-builder'
												) }
											/>
											<ChoiceCard
												name="cart-display"
												value="items"
												selected={
													draft.cart_display ===
													'items'
												}
												onSelect={ ( value ) =>
													change(
														'cart_display',
														value
													)
												}
												icon="layers"
												title={ __(
													'Box plus each item',
													'mix-and-max-box-builder'
												) }
												description={ __(
													'Every item is its own line, grouped under the box.',
													'mix-and-max-box-builder'
												) }
											/>
										</div>
									</div>
									<div className="mmbb-settings__rule">
										<ToggleRow
											setting={ draft.edit_from_cart }
											change={ ( value ) =>
												change(
													'edit_from_cart',
													value
												)
											}
											label={ __(
												'Let shoppers edit the box from the cart',
												'mix-and-max-box-builder'
											) }
											description={ __(
												'Adds an Edit box link that reopens the builder with their picks.',
												'mix-and-max-box-builder'
											) }
										/>
									</div>
									<div className="mmbb-settings__rule">
										<ToggleRow
											setting={ draft.allow_coupons }
											change={ ( value ) =>
												change( 'allow_coupons', value )
											}
											label={ __(
												'Allow coupons on top of box discounts',
												'mix-and-max-box-builder'
											) }
											description={ __(
												'Off by default so discounts do not stack by accident.',
												'mix-and-max-box-builder'
											) }
										/>
									</div>
									<div className="mmbb-settings__rule">
										<ToggleRow
											setting={ draft.reduce_item_stock }
											change={ ( value ) =>
												change(
													'reduce_item_stock',
													value
												)
											}
											label={ __(
												'Reduce stock for each item',
												'mix-and-max-box-builder'
											) }
											description={ __(
												'Recommended. Keeps WooCommerce inventory accurate.',
												'mix-and-max-box-builder'
											) }
										/>
									</div>
								</div>
							</Card>
						</section>

						<section id="emails" className="mmbb-settings__section">
							<Card
								title={ __(
									'Emails',
									'mix-and-max-box-builder'
								) }
								subtitle={ __(
									'What WooCommerce order emails say about a box.',
									'mix-and-max-box-builder'
								) }
							>
								<div className="mmbb-settings__stack">
									<ToggleRow
										setting={ draft.email_list_items }
										change={ ( value ) =>
											change( 'email_list_items', value )
										}
										label={ __(
											'List the items in each box',
											'mix-and-max-box-builder'
										) }
										description={ __(
											'Under the box line in order confirmation and invoice emails.',
											'mix-and-max-box-builder'
										) }
									/>
									<div className="mmbb-settings__rule">
										<ToggleRow
											setting={ draft.email_gift_message }
											change={ ( value ) =>
												change(
													'email_gift_message',
													value
												)
											}
											label={ __(
												'Include the gift message',
												'mix-and-max-box-builder'
											) }
											description={ __(
												'Shown in the admin new-order email, never in customer emails.',
												'mix-and-max-box-builder'
											) }
										/>
									</div>
								</div>
							</Card>
						</section>

						<section
							id="advanced"
							className="mmbb-settings__section"
						>
							<Card
								title={ __(
									'Advanced',
									'mix-and-max-box-builder'
								) }
							>
								<div className="mmbb-settings__stack">
									<ToggleRow
										setting={ draft.assets_only_on_builder }
										change={ ( value ) =>
											change(
												'assets_only_on_builder',
												value
											)
										}
										label={ __(
											'Load scripts only on pages with a builder',
											'mix-and-max-box-builder'
										) }
										description={ __(
											'Keeps the rest of your store fast.',
											'mix-and-max-box-builder'
										) }
									/>
									<div className="mmbb-settings__rule mmbb-settings__stack">
										<ToggleRow
											setting={ draft.analytics_enabled }
											change={ ( value ) =>
												change(
													'analytics_enabled',
													value
												)
											}
											label={ __(
												'Collect builder analytics',
												'mix-and-max-box-builder'
											) }
											description={ __(
												'Anonymous builder activity stays on this site.',
												'mix-and-max-box-builder'
											) }
										/>
										<TextField
											id="mmbb-setting-analytics_retention_days"
											className="mmbb-settings__narrow"
											type="number"
											min="7"
											max="730"
											label={ __(
												'Keep raw analytics for',
												'mix-and-max-box-builder'
											) }
											suffix={ __(
												'days',
												'mix-and-max-box-builder'
											) }
											value={
												draft.analytics_retention_days
											}
											error={
												errors.analytics_retention_days
											}
											disabled={
												! draft.analytics_enabled
											}
											onChange={ ( event ) =>
												change(
													'analytics_retention_days',
													event.target.value
												)
											}
										/>
									</div>
									<div className="mmbb-settings__rule">
										<ToggleRow
											setting={ draft.delete_data }
											change={ ( value ) =>
												change( 'delete_data', value )
											}
											label={ __(
												'Delete all plugin data when uninstalling',
												'mix-and-max-box-builder'
											) }
											description={ __(
												'Campaigns, settings and analytics are removed. Orders are never touched.',
												'mix-and-max-box-builder'
											) }
										/>
									</div>
									<div className="mmbb-settings__rule">
										<Notice
											tone="info"
											title={ __(
												'Developers',
												'mix-and-max-box-builder'
											) }
										>
											{ __(
												'REST routes live under',
												'mix-and-max-box-builder'
											) }{ ' ' }
											<code>/wp-json/mmbb/v1</code>.{ ' ' }
											{ __(
												'Filters and actions are prefixed',
												'mix-and-max-box-builder'
											) }{ ' ' }
											<code>mmbb_</code>.
										</Notice>
									</div>
								</div>
							</Card>
						</section>
					</div>
				</div>
			</Shell>
		</>
	);
}
