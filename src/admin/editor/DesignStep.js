import {
	Button,
	ColorIndicator,
	ColorPalette,
	FontSizePicker,
	Notice,
	Panel,
	PanelBody,
	RadioControl,
	RangeControl,
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { getTheme } from '../api';
import { useRequest } from '../hooks';
import {
	BoxControl,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../components/wp';
import {
	normalizeDesign,
	TEMPLATES,
	templateDefaults,
} from './design-defaults';

const FONT_OPTIONS = [
	[ '', 'Template default' ],
	[ 'theme', 'Theme font' ],
	[ 'bricolage-grotesque', 'Bricolage Grotesque' ],
	[ 'inter-tight', 'Inter Tight' ],
	[ 'plus-jakarta-sans', 'Plus Jakarta Sans' ],
	[ 'fraunces', 'Fraunces' ],
	[ 'dm-sans', 'DM Sans' ],
	[ 'outfit', 'Outfit' ],
	[ 'inter', 'Inter' ],
	[ 'space-grotesk', 'Space Grotesk' ],
	[ 'figtree', 'Figtree' ],
	[ 'system', 'System font' ],
].map( ( [ value, label ] ) => ( { value, label } ) );

const COLOR_FIELDS = [
	[ 'accent', 'Accent and main button' ],
	[ 'button_text', 'Button text' ],
	[ 'background', 'Background' ],
	[ 'surface', 'Cards and image tiles' ],
	[ 'text', 'Text' ],
	[ 'muted', 'Secondary text' ],
	[ 'savings', 'Savings and sale badge' ],
];

function DesignToggle( { label, value, onChange, options } ) {
	return (
		<ToggleGroupControl
			label={ label }
			isBlock
			value={ value }
			onChange={ onChange }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		>
			{ options.map( ( [ text, id ] ) => (
				<ToggleGroupControlOption
					key={ id }
					value={ id }
					label={ text }
				/>
			) ) }
		</ToggleGroupControl>
	);
}

const preset = ( slug, type ) => `var(--wp--preset--${ type }--${ slug })`;

function lightness( color ) {
	const match = /^#([0-9a-f]{6})$/i.exec( color || '' );
	if ( ! match ) {
		return -1;
	}
	const value = match[ 1 ];
	return [ 0, 2, 4 ].reduce(
		( total, index ) =>
			total +
			parseInt( value.slice( index, index + 2 ), 16 ) *
				[ 0.2126, 0.7152, 0.0722 ][ index / 2 ],
		0
	);
}

function buttonRadius( button ) {
	const value = button?.border?.radius;
	const radius = typeof value === 'object' ? value?.topLeft : value;
	const parsed = parseFloat( radius );
	return Number.isFinite( parsed )
		? Math.max( 0, Math.min( 32, parsed ) )
		: null;
}

export default function DesignStep( { draft, errors, dispatch } ) {
	const design = normalizeDesign( draft.config.design );
	const [ tab, setTab ] = useState( 'content' );
	const [ editing, setEditing ] = useState( 'accent' );
	const [ matched, setMatched ] = useState( false );
	const theme = useRequest(
		() =>
			typeof getTheme === 'function'
				? getTheme()
				: Promise.resolve( {
						palette: [],
						font_families: [],
						font_sizes: [],
						can_custom_css: false,
				  } ),
		[]
	);
	const set = ( path, value ) =>
		dispatch( { type: 'set', path: 'design.' + path, value } );
	const palette = useMemo(
		() =>
			( theme.data?.palette || [] ).map( ( item ) => ( {
				name: item.name,
				color: item.value,
			} ) ),
		[ theme.data ]
	);
	const fonts = useMemo(
		() => [
			...FONT_OPTIONS,
			...( theme.data?.font_families || [] ).map( ( item ) => ( {
				label: sprintf(
					/* translators: %s: Font family name from the active theme. */
					__( 'Theme: %s', 'productboxes-mix-and-match-box-builder' ),
					item.name
				),
				value: preset( item.slug, 'font-family' ),
			} ) ),
		],
		[ theme.data ]
	);

	const matchTheme = () => {
		const colors = theme.data?.palette || [];
		const find = ( slug ) => colors.find( ( item ) => item.slug === slug );
		const contrast = find( 'contrast' ) || colors[ 0 ];
		const base =
			find( 'base' ) ||
			colors.find( ( item ) => item.value?.toLowerCase() === '#ffffff' );
		const accent = colors
			.filter( ( item ) => /^accent/.test( item.slug ) )
			.sort(
				( a, b ) => lightness( b.value ) - lightness( a.value )
			)[ 0 ];
		const colorValue = ( item, fallback ) => {
			if ( ! item ) {
				return fallback;
			}
			return design.sync_theme
				? preset( item.slug, 'color' )
				: item.value;
		};
		set( 'colors', {
			...design.colors,
			accent: colorValue( contrast, design.colors.accent ),
			text: colorValue( contrast, design.colors.text ),
			background: colorValue( base, design.colors.background ),
			surface: colorValue( accent, design.colors.surface ),
		} );
		const fallbackFont = theme.data?.font_families?.[ 0 ];
		const themeFont = ( fontValue ) => {
			if (
				/^var\(--wp--preset--font-family--[a-z0-9-]+\)$/.test(
					fontValue || ''
				)
			) {
				return fontValue;
			}
			return fallbackFont && design.sync_theme
				? preset( fallbackFont.slug, 'font-family' )
				: 'theme';
		};
		set(
			'typography.heading_font',
			themeFont( theme.data?.typography?.heading )
		);
		set(
			'typography.body_font',
			themeFont( theme.data?.typography?.body )
		);
		const radius = buttonRadius( theme.data?.button );
		if ( radius !== null ) {
			set( 'buttons.radius', radius );
		}
		setMatched( true );
	};

	const resetStyle = () =>
		Object.entries( templateDefaults( design.template ) ).forEach(
			( [ key, value ] ) => set( key, { ...design[ key ], ...value } )
		);
	const options = ( values ) =>
		values.map( ( value ) => ( { value, label: value } ) );

	return (
		<div className="mmbb-design">
			<div className="mmbb-design__tabs">
				<DesignToggle
					label={ __(
						'Design settings',
						'productboxes-mix-and-match-box-builder'
					) }
					value={ tab }
					onChange={ setTab }
					options={ [
						[
							__(
								'Template',
								'productboxes-mix-and-match-box-builder'
							),
							'template',
						],
						[
							__(
								'Style',
								'productboxes-mix-and-match-box-builder'
							),
							'style',
						],
						[
							__(
								'Content',
								'productboxes-mix-and-match-box-builder'
							),
							'content',
						],
					] }
				/>
			</div>

			{ tab === 'template' ? (
				<div className="mmbb-design__pane">
					<p>
						{ __(
							'Pick a starting look. Your style settings stay when you switch.',
							'productboxes-mix-and-match-box-builder'
						) }
					</p>
					<RadioControl
						label={ __(
							'Template',
							'productboxes-mix-and-match-box-builder'
						) }
						selected={ design.template }
						options={ TEMPLATES.map( ( item ) => ( {
							value: item.id,
							label: item.name,
						} ) ) }
						onChange={ ( value ) => set( 'template', value ) }
					/>
					<Button variant="secondary" onClick={ resetStyle }>
						{ __(
							'Reset style to template defaults',
							'productboxes-mix-and-match-box-builder'
						) }
					</Button>
				</div>
			) : null }

			{ tab === 'style' ? (
				<>
					<div className="mmbb-design__match">
						<div>
							<strong>
								{ __(
									'Match my site',
									'productboxes-mix-and-match-box-builder'
								) }
							</strong>
							<small>
								{ sprintf(
									/* translators: %s: Active WordPress theme name. */
									__(
										'Active theme: %s',
										'productboxes-mix-and-match-box-builder'
									),
									theme.data?.name ||
										__(
											'Loading…',
											'productboxes-mix-and-match-box-builder'
										)
								) }
							</small>
						</div>
						<Button
							variant="secondary"
							disabled={ ! theme.data }
							onClick={ matchTheme }
						>
							{ __(
								'Match',
								'productboxes-mix-and-match-box-builder'
							) }
						</Button>
						<ToggleControl
							label={ __(
								'Keep in sync with my theme',
								'productboxes-mix-and-match-box-builder'
							) }
							help={ __(
								'Colours and fonts update when you change your theme.',
								'productboxes-mix-and-match-box-builder'
							) }
							checked={ design.sync_theme }
							onChange={ ( value ) => set( 'sync_theme', value ) }
							__nextHasNoMarginBottom
						/>
						{ matched ? (
							<Notice status="success" isDismissible={ false }>
								{ __(
									'Now using your theme’s colours, fonts and button shape.',
									'productboxes-mix-and-match-box-builder'
								) }
							</Notice>
						) : null }
					</div>
					<Panel>
						<PanelBody
							title={ __(
								'Colours',
								'productboxes-mix-and-match-box-builder'
							) }
							initialOpen
						>
							<div className="mmbb-design__colors">
								{ COLOR_FIELDS.map( ( [ key, label ] ) => (
									<Button
										key={ key }
										variant={
											editing === key
												? 'secondary'
												: 'tertiary'
										}
										onClick={ () => setEditing( key ) }
									>
										<ColorIndicator
											colorValue={
												design.colors[ key ] ||
												'#ffffff'
											}
										/>
										{ label }
									</Button>
								) ) }
							</div>
							<ColorPalette
								colors={ palette }
								value={ design.colors[ editing ] || undefined }
								onChange={ ( value ) =>
									set( 'colors.' + editing, value || '' )
								}
							/>
						</PanelBody>
						<PanelBody
							title={ __(
								'Typography',
								'productboxes-mix-and-match-box-builder'
							) }
							initialOpen={ false }
						>
							<SelectControl
								label={ __(
									'Heading font',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.typography.heading_font }
								options={ fonts }
								onChange={ ( value ) =>
									set( 'typography.heading_font', value )
								}
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={ __(
									'Body font',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.typography.body_font }
								options={ fonts }
								onChange={ ( value ) =>
									set( 'typography.body_font', value )
								}
								__nextHasNoMarginBottom
							/>
							<FontSizePicker
								fontSizes={ theme.data?.font_sizes || [] }
								value={ design.typography.heading_size }
								onChange={ ( value ) =>
									set(
										'typography.heading_size',
										value || 68
									)
								}
								withReset={ false }
							/>
							<SelectControl
								label={ __(
									'Heading weight',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ String(
									design.typography.heading_weight
								) }
								options={ options( [
									400, 500, 600, 700, 800,
								] ).map( ( item ) => ( {
									...item,
									value: String( item.value ),
									label: String( item.label ),
								} ) ) }
								onChange={ ( value ) =>
									set(
										'typography.heading_weight',
										Number( value )
									)
								}
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __(
									'Uppercase button text',
									'productboxes-mix-and-match-box-builder'
								) }
								checked={ design.typography.button_uppercase }
								onChange={ ( value ) =>
									set( 'typography.button_uppercase', value )
								}
								__nextHasNoMarginBottom
							/>
						</PanelBody>
						<PanelBody
							title={ __(
								'Buttons',
								'productboxes-mix-and-match-box-builder'
							) }
							initialOpen={ false }
						>
							<DesignToggle
								label={ __(
									'Add button style',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.buttons.style }
								onChange={ ( value ) =>
									set( 'buttons.style', value )
								}
								options={ [
									[
										__(
											'Fill',
											'productboxes-mix-and-match-box-builder'
										),
										'fill',
									],
									[
										__(
											'Outline',
											'productboxes-mix-and-match-box-builder'
										),
										'outline',
									],
									[
										__(
											'Soft',
											'productboxes-mix-and-match-box-builder'
										),
										'soft',
									],
								] }
							/>
							<DesignToggle
								label={ __(
									'Size',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.buttons.size }
								onChange={ ( value ) =>
									set( 'buttons.size', value )
								}
								options={ [
									[ 'S', 's' ],
									[ 'M', 'm' ],
									[ 'L', 'l' ],
								] }
							/>
							<RangeControl
								label={ __(
									'Corner radius',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.buttons.radius }
								min={ 0 }
								max={ 32 }
								onChange={ ( value ) =>
									set( 'buttons.radius', value )
								}
							/>
						</PanelBody>
						<PanelBody
							title={ __(
								'Product cards',
								'productboxes-mix-and-match-box-builder'
							) }
							initialOpen={ false }
						>
							<RangeControl
								label={ __(
									'Products per row',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.cards.columns }
								min={ 2 }
								max={ 5 }
								onChange={ ( value ) =>
									set( 'cards.columns', value )
								}
							/>
							<DesignToggle
								label={ __(
									'Image shape',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.cards.image_ratio }
								onChange={ ( value ) =>
									set( 'cards.image_ratio', value )
								}
								options={ [
									[
										__(
											'Square',
											'productboxes-mix-and-match-box-builder'
										),
										'1/1',
									],
									[
										__(
											'Portrait',
											'productboxes-mix-and-match-box-builder'
										),
										'4/5',
									],
									[
										__(
											'Wide',
											'productboxes-mix-and-match-box-builder'
										),
										'4/3',
									],
								] }
							/>
							<DesignToggle
								label={ __(
									'Image fit',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.cards.image_fit }
								onChange={ ( value ) =>
									set( 'cards.image_fit', value )
								}
								options={ [
									[
										__(
											'Fill',
											'productboxes-mix-and-match-box-builder'
										),
										'cover',
									],
									[
										__(
											'Fit',
											'productboxes-mix-and-match-box-builder'
										),
										'contain',
									],
								] }
							/>
							<RangeControl
								label={ __(
									'Card corner radius',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.cards.radius }
								min={ 0 }
								max={ 32 }
								onChange={ ( value ) =>
									set( 'cards.radius', value )
								}
							/>
							<SelectControl
								label={ __(
									'Card shadow',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.cards.shadow }
								options={ options( [
									'none',
									'soft',
									'strong',
								] ) }
								onChange={ ( value ) =>
									set( 'cards.shadow', value )
								}
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __(
									'Show compare-at price',
									'productboxes-mix-and-match-box-builder'
								) }
								checked={ design.cards.show_compare_price }
								onChange={ ( value ) =>
									set( 'cards.show_compare_price', value )
								}
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __(
									'Show sale badge',
									'productboxes-mix-and-match-box-builder'
								) }
								checked={ design.cards.show_sale_badge }
								onChange={ ( value ) =>
									set( 'cards.show_sale_badge', value )
								}
								__nextHasNoMarginBottom
							/>
						</PanelBody>
						<PanelBody
							title={ __(
								'Box summary',
								'productboxes-mix-and-match-box-builder'
							) }
							initialOpen={ false }
						>
							<DesignToggle
								label={ __(
									'Where the box sits',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.summary.position }
								onChange={ ( value ) =>
									set( 'summary.position', value )
								}
								options={ [
									[
										__(
											'Left',
											'productboxes-mix-and-match-box-builder'
										),
										'left',
									],
									[
										__(
											'Right',
											'productboxes-mix-and-match-box-builder'
										),
										'right',
									],
									[
										__(
											'Bottom bar',
											'productboxes-mix-and-match-box-builder'
										),
										'bar',
									],
								] }
							/>
							<DesignToggle
								label={ __(
									'Progress',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.summary.progress }
								onChange={ ( value ) =>
									set( 'summary.progress', value )
								}
								options={ [
									[
										__(
											'Bar',
											'productboxes-mix-and-match-box-builder'
										),
										'bar',
									],
									[
										__(
											'Segments',
											'productboxes-mix-and-match-box-builder'
										),
										'segments',
									],
								] }
							/>
							<DesignToggle
								label={ __(
									'Box slots',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.summary.slots }
								onChange={ ( value ) =>
									set( 'summary.slots', value )
								}
								options={ [
									[
										__(
											'Photos',
											'productboxes-mix-and-match-box-builder'
										),
										'photos',
									],
									[
										__(
											'Numbers',
											'productboxes-mix-and-match-box-builder'
										),
										'numbers',
									],
								] }
							/>
							<ToggleControl
								label={ __(
									'Show discount steps at the top',
									'productboxes-mix-and-match-box-builder'
								) }
								checked={ design.summary.show_ladder }
								onChange={ ( value ) =>
									set( 'summary.show_ladder', value )
								}
								__nextHasNoMarginBottom
							/>
						</PanelBody>
						<PanelBody
							title={ __(
								'Spacing and width',
								'productboxes-mix-and-match-box-builder'
							) }
							initialOpen={ false }
						>
							<SelectControl
								label={ __(
									'Width',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.spacing.width }
								options={ [
									{
										value: 'content',
										label: __(
											'Theme content width',
											'productboxes-mix-and-match-box-builder'
										),
									},
									{
										value: 'wide',
										label: __(
											'Wide',
											'productboxes-mix-and-match-box-builder'
										),
									},
									{
										value: 'full',
										label: __(
											'Full width',
											'productboxes-mix-and-match-box-builder'
										),
									},
								] }
								onChange={ ( value ) =>
									set( 'spacing.width', value )
								}
								__nextHasNoMarginBottom
							/>
							<BoxControl
								label={ __(
									'Padding',
									'productboxes-mix-and-match-box-builder'
								) }
								values={ design.spacing.padding }
								onChange={ ( value ) =>
									set( 'spacing.padding', value )
								}
							/>
						</PanelBody>
						<PanelBody
							title={ __(
								'Advanced',
								'productboxes-mix-and-match-box-builder'
							) }
							initialOpen={ false }
						>
							<TextControl
								label={ __(
									'Extra CSS class',
									'productboxes-mix-and-match-box-builder'
								) }
								value={ design.advanced.css_class }
								__next40pxDefaultSize
								onChange={ ( value ) =>
									set( 'advanced.css_class', value )
								}
								__nextHasNoMarginBottom
							/>
							{ theme.data?.can_custom_css ? (
								<TextareaControl
									label={ __(
										'Custom CSS',
										'productboxes-mix-and-match-box-builder'
									) }
									help={ __(
										'Applies only to this box.',
										'productboxes-mix-and-match-box-builder'
									) }
									value={ design.advanced.custom_css }
									onChange={ ( value ) =>
										set( 'advanced.custom_css', value )
									}
									__nextHasNoMarginBottom
								/>
							) : null }
						</PanelBody>
					</Panel>
				</>
			) : null }

			{ tab === 'content' ? (
				<div className="mmbb-design__pane">
					<TextControl
						label={ __(
							'Campaign name',
							'productboxes-mix-and-match-box-builder'
						) }
						value={ draft.title }
						__next40pxDefaultSize
						help={ errors.title }
						onChange={ ( value ) =>
							dispatch( { type: 'title', value } )
						}
						__nextHasNoMarginBottom
					/>
					<TextareaControl
						label={ __(
							'Headline',
							'productboxes-mix-and-match-box-builder'
						) }
						value={ design.content.headline }
						onChange={ ( value ) =>
							set( 'content.headline', value )
						}
						__nextHasNoMarginBottom
					/>
					<TextareaControl
						label={ __(
							'Short intro',
							'productboxes-mix-and-match-box-builder'
						) }
						value={ design.content.intro }
						onChange={ ( value ) => set( 'content.intro', value ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __(
							'Add button',
							'productboxes-mix-and-match-box-builder'
						) }
						value={ design.content.add_label }
						__next40pxDefaultSize
						onChange={ ( value ) =>
							set( 'content.add_label', value )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __(
							'Cart button',
							'productboxes-mix-and-match-box-builder'
						) }
						value={ design.content.cart_label }
						__next40pxDefaultSize
						onChange={ ( value ) =>
							set( 'content.cart_label', value )
						}
						__nextHasNoMarginBottom
					/>
					<Notice status="info" isDismissible={ false }>
						{ __(
							'Leave a field empty to use the translated default text.',
							'productboxes-mix-and-match-box-builder'
						) }
					</Notice>
				</div>
			) : null }
		</div>
	);
}
