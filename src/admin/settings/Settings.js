import {
	Button,
	Notice,
	SelectControl,
	Spinner,
	ToggleControl,
} from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { getPages, getSettings, saveSettings } from '../api';
import { PageHeader, useSnackbar } from '../components';
import { NumberControl } from '../components/wp';
import { errorMessage, useRequest } from '../hooks';
import Shell from '../Shell';
import './settings.css';

const copy = ( value ) => JSON.parse( JSON.stringify( value ) );
const same = ( one, two ) => JSON.stringify( one ) === JSON.stringify( two );

export function validateSettings( settings ) {
	const errors = {};
	const retention = Number( settings.analytics_retention_days );
	if ( ! Number.isInteger( retention ) || retention < 7 || retention > 730 ) {
		errors.analytics_retention_days = __(
			'Enter a whole number from 7 to 730.',
			'productboxes-mix-and-match-box-builder'
		);
	}
	return errors;
}

function SettingToggle( { checked, onChange, label, help } ) {
	return (
		<div className="mmbb-settings__toggle">
			<ToggleControl
				__nextHasNoMarginBottom
				label={ label }
				help={ help }
				checked={ !! checked }
				onChange={ onChange }
			/>
		</div>
	);
}

function SettingsCard( { id, title, children } ) {
	return (
		<section className="mmbb-app-card" aria-labelledby={ id }>
			<div className="mmbb-app-card__head">
				<h2 id={ id }>{ title }</h2>
			</div>
			{ children }
		</section>
	);
}

export default function Settings() {
	const snackbar = useSnackbar();
	const request = useRequest( () => getSettings(), [] );
	const pages = useRequest( () => getPages( { per_page: 100 } ), [] );
	const [ saved, setSaved ] = useState( null );
	const [ draft, setDraft ] = useState( null );
	const [ saving, setSaving ] = useState( false );
	const [ errors, setErrors ] = useState( {} );
	const [ saveError, setSaveError ] = useState( '' );

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

	const change = ( key, value ) => {
		setDraft( ( current ) => ( { ...current, [ key ]: value } ) );
		setErrors( ( current ) => ( { ...current, [ key ]: undefined } ) );
		setSaveError( '' );
	};

	const save = async () => {
		const invalid = validateSettings( draft );
		setErrors( invalid );
		if ( Object.keys( invalid ).length ) {
			document
				.getElementById( 'mmbb-setting-analytics-retention-days' )
				?.focus();
			return;
		}
		setSaving( true );
		setSaveError( '' );
		const payload = {
			...draft,
			default_page_id: Number( draft.default_page_id ),
			analytics_retention_days: Number( draft.analytics_retention_days ),
		};
		try {
			const result = await saveSettings( payload );
			setSaved( copy( result ) );
			setDraft( copy( result ) );
			setErrors( {} );
			snackbar( __( 'Saved', 'productboxes-mix-and-match-box-builder' ) );
		} catch ( error ) {
			setSaveError(
				errorMessage(
					error,
					__(
						'The settings could not be saved.',
						'productboxes-mix-and-match-box-builder'
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
				<div className="mmbb-app-loading" role="status">
					<Spinner />
					{ __(
						'Loading settings\u2026',
						'productboxes-mix-and-match-box-builder'
					) }
				</div>
			</Shell>
		);
	}
	if ( request.error && ! draft ) {
		return (
			<Shell active="settings">
				<Notice status="error" isDismissible={ false }>
					{ errorMessage( request.error ) }
					<Button variant="link" onClick={ request.reload }>
						{ __(
							'Try again',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				</Notice>
			</Shell>
		);
	}
	if ( ! draft ) {
		return null;
	}

	const pageOptions = [
		{
			value: '0',
			label: __(
				'No main page',
				'productboxes-mix-and-match-box-builder'
			),
		},
		...( pages.data || [] ).map( ( page ) => ( {
			value: String( page.id ),
			label: page.title,
		} ) ),
	];
	return (
		<Shell active="settings">
			<div className="mmbb-app-stack mmbb-settings">
				<PageHeader
					title={ __(
						'Settings',
						'productboxes-mix-and-match-box-builder'
					) }
					description={ __(
						'Store-wide. Each box sets its own look and discount.',
						'productboxes-mix-and-match-box-builder'
					) }
					actions={
						<Button
							__next40pxDefaultSize
							variant="primary"
							isBusy={ saving }
							disabled={ ! dirty || saving }
							onClick={ save }
						>
							{ __(
								'Save settings',
								'productboxes-mix-and-match-box-builder'
							) }
						</Button>
					}
				/>
				{ saveError ? (
					<Notice status="error" isDismissible={ false }>
						{ saveError }
					</Notice>
				) : null }
				<SettingsCard
					id="mmbb-settings-general"
					title={ __(
						'General',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<SettingToggle
						checked={ draft.enabled }
						onChange={ ( value ) => change( 'enabled', value ) }
						label={ __(
							'Box builders are on',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Turn off to hide every box at once, for example during a stock count.',
							'productboxes-mix-and-match-box-builder'
						) }
					/>
					<div className="mmbb-settings__field">
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Main box page',
								'productboxes-mix-and-match-box-builder'
							) }
							help={ __(
								'Used by “Edit box” links in the cart.',
								'productboxes-mix-and-match-box-builder'
							) }
							value={ String( draft.default_page_id ) }
							options={ pageOptions }
							onChange={ ( value ) =>
								change( 'default_page_id', value )
							}
						/>
					</div>
				</SettingsCard>
				<SettingsCard
					id="mmbb-settings-cart"
					title={ __(
						'Cart and checkout',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<fieldset className="mmbb-settings__field mmbb-settings__choices">
						<legend>
							{ __(
								'Show a box in the cart as',
								'productboxes-mix-and-match-box-builder'
							) }
						</legend>
						<div>
							{ [
								[
									'bundle',
									__(
										'One line',
										'productboxes-mix-and-match-box-builder'
									),
									__(
										'Box name and price, items listed under it.',
										'productboxes-mix-and-match-box-builder'
									),
								],
								[
									'items',
									__(
										'Each item',
										'productboxes-mix-and-match-box-builder'
									),
									__(
										'Every item on its own line, grouped.',
										'productboxes-mix-and-match-box-builder'
									),
								],
							].map( ( option ) => (
								<label
									key={ option[ 0 ] }
									aria-label={ option[ 1 ] }
									htmlFor={
										'mmbb-cart-display-' + option[ 0 ]
									}
									className={
										draft.cart_display === option[ 0 ]
											? 'is-selected'
											: undefined
									}
								>
									<input
										id={
											'mmbb-cart-display-' + option[ 0 ]
										}
										type="radio"
										name="mmbb-cart-display"
										value={ option[ 0 ] }
										checked={
											draft.cart_display === option[ 0 ]
										}
										onChange={ () =>
											change(
												'cart_display',
												option[ 0 ]
											)
										}
									/>
									<span>
										<strong>{ option[ 1 ] }</strong>
										<small>{ option[ 2 ] }</small>
									</span>
								</label>
							) ) }
						</div>
					</fieldset>
					<SettingToggle
						checked={ draft.edit_from_cart }
						onChange={ ( value ) =>
							change( 'edit_from_cart', value )
						}
						label={ __(
							'Shoppers can edit a box from the cart',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Adds an “Edit box” link that reopens the builder.',
							'productboxes-mix-and-match-box-builder'
						) }
					/>
					<SettingToggle
						checked={ draft.allow_coupons }
						onChange={ ( value ) =>
							change( 'allow_coupons', value )
						}
						label={ __(
							'Allow coupons on boxes',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Off, so coupons do not stack on box discounts.',
							'productboxes-mix-and-match-box-builder'
						) }
					/>
					<SettingToggle
						checked={ draft.reduce_item_stock }
						onChange={ ( value ) =>
							change( 'reduce_item_stock', value )
						}
						label={ __(
							'Reduce stock for each item',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Keeps WooCommerce stock counts right.',
							'productboxes-mix-and-match-box-builder'
						) }
					/>
				</SettingsCard>
				<SettingsCard
					id="mmbb-settings-email"
					title={ __(
						'Order emails',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<SettingToggle
						checked={ draft.email_list_items }
						onChange={ ( value ) =>
							change( 'email_list_items', value )
						}
						label={ __(
							'List the items in each box',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'In order confirmations and invoices.',
							'productboxes-mix-and-match-box-builder'
						) }
					/>
					<SettingToggle
						checked={ draft.email_gift_message }
						onChange={ ( value ) =>
							change( 'email_gift_message', value )
						}
						label={ __(
							'Include the gift note',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'In your new-order email only, never the customer’s.',
							'productboxes-mix-and-match-box-builder'
						) }
					/>
				</SettingsCard>
				<SettingsCard
					id="mmbb-settings-data"
					title={ __(
						'Data and privacy',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					<SettingToggle
						checked={ draft.analytics_enabled }
						onChange={ ( value ) =>
							change( 'analytics_enabled', value )
						}
						label={ __(
							'Collect box analytics',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Anonymous. Stays on this site.',
							'productboxes-mix-and-match-box-builder'
						) }
					/>
					<div className="mmbb-settings__field mmbb-settings__retention">
						<NumberControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							id="mmbb-setting-analytics-retention-days"
							label={ __(
								'Keep detailed analytics for',
								'productboxes-mix-and-match-box-builder'
							) }
							min={ 7 }
							max={ 730 }
							suffix={ __(
								'days',
								'productboxes-mix-and-match-box-builder'
							) }
							value={ draft.analytics_retention_days }
							disabled={ ! draft.analytics_enabled }
							onChange={ ( value ) =>
								change( 'analytics_retention_days', value )
							}
						/>
						{ errors.analytics_retention_days ? (
							<p className="mmbb-settings__error" role="alert">
								{ errors.analytics_retention_days }
							</p>
						) : null }
					</div>
					<SettingToggle
						checked={ draft.delete_data }
						onChange={ ( value ) => change( 'delete_data', value ) }
						label={ __(
							'Delete all ProductBoxes data when I uninstall',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Boxes, settings and analytics. Orders are never touched.',
							'productboxes-mix-and-match-box-builder'
						) }
					/>
				</SettingsCard>
				<p className="mmbb-settings__developer">
					{ __(
						'Developers: REST routes live under',
						'productboxes-mix-and-match-box-builder'
					) }{ ' ' }
					<code>/wp-json/mmbb/v1</code>.{ ' ' }
					{ __(
						'Hooks start with',
						'productboxes-mix-and-match-box-builder'
					) }{ ' ' }
					<code>mmbb_</code>.
				</p>
			</div>
		</Shell>
	);
}
