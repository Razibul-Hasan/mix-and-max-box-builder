import * as components from '@wordpress/components';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import Builder from '../../storefront/Builder';
import { getPlaceableCampaigns, getPreview } from './api';

const {
	Button,
	Notice,
	PanelBody,
	Placeholder,
	SelectControl,
	Spinner,
	ToggleControl,
} = components;
// Stable names arrived after WordPress 6.6, which only has the experimental ones.
const ToggleGroupControl =
	components.ToggleGroupControl ||
	components.__experimentalToggleGroupControl;
const ToggleGroupControlOption =
	components.ToggleGroupControlOption ||
	components.__experimentalToggleGroupControlOption;

const NEW_URL = 'admin.php?page=mmbb-campaigns&action=new';
const editUrl = ( id ) =>
	`admin.php?page=mmbb-campaigns&action=edit&id=${ id }`;

function typeLabel( type ) {
	const labels = {
		tiered: __( 'Tiered mix', 'productboxes-mix-and-match-box-builder' ),
		fixed: __( 'Fixed box', 'productboxes-mix-and-match-box-builder' ),
		bundle: __( 'Bundle price', 'productboxes-mix-and-match-box-builder' ),
	};
	return labels[ type ] || type;
}

function useCampaigns() {
	const [ campaigns, setCampaigns ] = useState( null );
	useEffect( () => {
		let live = true;
		getPlaceableCampaigns()
			.then( ( list ) => live && setCampaigns( list ) )
			.catch( () => live && setCampaigns( [] ) );
		return () => {
			live = false;
		};
	}, [] );
	return campaigns;
}

function usePreview( campaignId ) {
	const [ state, setState ] = useState( { payload: null, error: false } );
	useEffect( () => {
		setState( { payload: null, error: false } );
		if ( ! campaignId ) {
			return undefined;
		}
		let live = true;
		getPreview( campaignId )
			.then(
				( payload ) => live && setState( { payload, error: false } )
			)
			.catch( () => live && setState( { payload: null, error: true } ) );
		return () => {
			live = false;
		};
	}, [ campaignId ] );
	return state;
}

export default function Edit( { attributes, setAttributes } ) {
	const { campaignId, layout, columns, showHero } = attributes;
	const campaigns = useCampaigns();
	const { payload, error } = usePreview( campaignId );

	const options = useMemo( () => {
		const list = ( campaigns || [] ).map( ( campaign ) => ( {
			value: String( campaign.id ),
			label: `${ campaign.title } (${ typeLabel(
				campaign.config ? campaign.config.type : campaign.type
			) })`,
		} ) );
		// A campaign that is no longer placeable stays selectable so the block still shows its name.
		if (
			campaignId &&
			! list.some( ( item ) => item.value === String( campaignId ) )
		) {
			list.unshift( {
				value: String( campaignId ),
				label: payload ? payload.title : `#${ campaignId }`,
			} );
		}
		return [
			{
				value: '0',
				label: __(
					'Choose a campaign…',
					'productboxes-mix-and-match-box-builder'
				),
			},
			...list,
		];
	}, [ campaigns, campaignId, payload ] );

	// The block's own settings win over the campaign's, as they do on the front end.
	const view = useMemo( () => {
		if ( ! payload ) {
			return null;
		}
		return {
			...payload,
			view: {
				layout: layout !== 'default' ? layout : payload.view.layout,
				columns: columns > 0 ? columns : payload.view.columns,
				showHero: showHero && payload.view.showHero,
			},
		};
	}, [ payload, layout, columns, showHero ] );

	const blockProps = useBlockProps( {
		className: 'mmbb-root mmbb-builder',
		'data-theme': payload?.colors?.dark ? 'dark' : undefined,
		style: payload?.colors?.vars,
	} );

	const picker = (
		<SelectControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={ __( 'Campaign', 'productboxes-mix-and-match-box-builder' ) }
			help={ __(
				'Only active and scheduled campaigns are listed.',
				'productboxes-mix-and-match-box-builder'
			) }
			value={ String( campaignId || 0 ) }
			options={ options }
			onChange={ ( value ) =>
				setAttributes( { campaignId: Number( value ) } )
			}
		/>
	);

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __(
						'Box builder',
						'productboxes-mix-and-match-box-builder'
					) }
				>
					{ picker }
					{ campaignId ? (
						<p>
							<a
								href={ editUrl( campaignId ) }
								target="_blank"
								rel="noreferrer"
							>
								{ __(
									'Edit campaign',
									'productboxes-mix-and-match-box-builder'
								) }
							</a>
						</p>
					) : null }
					<ToggleGroupControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						isBlock
						label={ __(
							'Box summary',
							'productboxes-mix-and-match-box-builder'
						) }
						value={ layout }
						onChange={ ( value ) =>
							setAttributes( { layout: value } )
						}
					>
						<ToggleGroupControlOption
							value="default"
							label={ __(
								'Auto',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
						<ToggleGroupControlOption
							value="panel"
							label={ __(
								'Panel',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
						<ToggleGroupControlOption
							value="bar"
							label={ __(
								'Bar',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
						<ToggleGroupControlOption
							value="both"
							label={ __(
								'Both',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
					</ToggleGroupControl>
					<ToggleGroupControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						isBlock
						label={ __(
							'Products per row',
							'productboxes-mix-and-match-box-builder'
						) }
						value={ columns }
						onChange={ ( value ) =>
							setAttributes( { columns: Number( value ) } )
						}
					>
						<ToggleGroupControlOption
							value={ 0 }
							label={ __(
								'Auto',
								'productboxes-mix-and-match-box-builder'
							) }
						/>
						<ToggleGroupControlOption value={ 3 } label="3" />
						<ToggleGroupControlOption value={ 4 } label="4" />
						<ToggleGroupControlOption value={ 5 } label="5" />
					</ToggleGroupControl>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Show the hero',
							'productboxes-mix-and-match-box-builder'
						) }
						help={ __(
							'Sticker, headline and countdown above the products.',
							'productboxes-mix-and-match-box-builder'
						) }
						checked={ showHero }
						onChange={ ( value ) =>
							setAttributes( { showHero: value } )
						}
					/>
					<Notice status="info" isDismissible={ false }>
						{ __(
							'Products, tiers and dates live in the campaign.',
							'productboxes-mix-and-match-box-builder'
						) }
					</Notice>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ ! campaignId ? (
					<Placeholder
						icon="products"
						label={ __(
							'ProductBoxes Box Builder',
							'productboxes-mix-and-match-box-builder'
						) }
						instructions={ __(
							'Choose a campaign to show on this page.',
							'productboxes-mix-and-match-box-builder'
						) }
					>
						{ campaigns === null ? <Spinner /> : picker }
						<Button
							variant="secondary"
							href={ NEW_URL }
							target="_blank"
						>
							{ __(
								'Create campaign',
								'productboxes-mix-and-match-box-builder'
							) }
						</Button>
					</Placeholder>
				) : null }
				{ campaignId && ! view && ! error ? <Spinner /> : null }
				{ campaignId && error ? (
					<Notice status="warning" isDismissible={ false }>
						{ __(
							'This campaign could not be loaded. Pick another one, or check that it still exists.',
							'productboxes-mix-and-match-box-builder'
						) }
					</Notice>
				) : null }
				{ view ? (
					<Builder key={ campaignId } payload={ view } preview />
				) : null }
			</div>
		</>
	);
}
