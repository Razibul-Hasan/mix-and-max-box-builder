// Each template's own colours, in the order the storefront uses them. Keep this in step with
// MixMax\BoxBuilder\Storefront\Template_Styles::DEFAULTS, which is what a visitor actually sees.
const PALETTES = {
	spotlight: [
		'Spotlight',
		'#ff4f1f',
		'#ffffff',
		'#f3f4f6',
		'#111111',
		'#555b66',
		'#0a7a3b',
		'bricolage-grotesque',
		'bricolage-grotesque',
	],
	clean: [
		'Clean list',
		'#111111',
		'#ffffff',
		'#f3f4f6',
		'#111111',
		'#5b6069',
		'#0a7a3b',
		'inter-tight',
		'inter-tight',
	],
	steps: [
		'Guided steps',
		'#5b3df5',
		'#f6f4ff',
		'#ffffff',
		'#1b1240',
		'#625a8a',
		'#0a7a3b',
		'plus-jakarta-sans',
		'plus-jakarta-sans',
	],
	gift: [
		'Gift tray',
		'#f2c14e',
		'#0f3d2e',
		'#f6efe3',
		'#f6efe3',
		'#c8d6cf',
		'#f2c14e',
		'fraunces',
		'dm-sans',
	],
	bold: [
		'Color block',
		'#2b4bff',
		'#f2f3f5',
		'#ffffff',
		'#0e0e10',
		'#5b6069',
		'#0a7a3b',
		'bricolage-grotesque',
		'bricolage-grotesque',
	],
	pastel: [
		'Pastel',
		'#8b5cf6',
		'#fff8f3',
		'#f1e9ff',
		'#2d2433',
		'#6d6373',
		'#6d28d9',
		'outfit',
		'outfit',
	],
	editorial: [
		'Editorial',
		'#c2410c',
		'#f5f1ea',
		'#ffffff',
		'#1a1a1a',
		'#655f57',
		'#9a3412',
		'fraunces',
		'inter',
	],
	night: [
		'Night',
		'#c8ff2e',
		'#0c0c10',
		'#18181d',
		'#f4f4f5',
		'#a1a1aa',
		'#c8ff2e',
		'space-grotesk',
		'space-grotesk',
	],
	split: [
		'Split screen',
		'#ff6b4a',
		'#ffffff',
		'#fff0ec',
		'#111111',
		'#5b6069',
		'#c2410c',
		'bricolage-grotesque',
		'inter',
	],
	compact: [
		'Compact card',
		'#e11d74',
		'#f4f4f2',
		'#ffffff',
		'#111111',
		'#666666',
		'#be185d',
		'bricolage-grotesque',
		'inter',
	],
};

/**
 * Button text that reads on an accent colour: the same rule the storefront applies when the
 * merchant has not picked one.
 *
 * @param {string} accent #rrggbb accent.
 * @return {string} Dark or light text colour.
 */
function inkOn( accent ) {
	const hex = /^#([0-9a-f]{6})$/i.exec( accent );
	if ( ! hex ) {
		return '#ffffff';
	}
	const [ r, g, b ] = [ 0, 2, 4 ].map( ( i ) =>
		parseInt( hex[ 1 ].slice( i, i + 2 ), 16 )
	);
	return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#141414' : '#ffffff';
}

export const TEMPLATES = Object.entries( PALETTES ).map(
	( [
		id,
		[
			name,
			accent,
			background,
			surface,
			text,
			muted,
			savings,
			headingFont,
			bodyFont,
		],
	] ) => ( {
		id,
		name,
		colors: {
			accent,
			button_text: inkOn( accent ),
			background,
			surface,
			text,
			muted,
			savings,
		},
		defaults: {
			colors: { accent, background, text },
			typography: { heading_font: headingFont, body_font: bodyFont },
		},
	} )
);

/**
 * The colours a template uses until the merchant picks their own.
 *
 * @param {string} id Template id.
 * @return {Object} Colour keys to #rrggbb.
 */
export function templateColors( id ) {
	return (
		TEMPLATES.find( ( template ) => template.id === id ) || TEMPLATES[ 0 ]
	).colors;
}

export function templateDefaults( id ) {
	return (
		TEMPLATES.find( ( template ) => template.id === id ) || TEMPLATES[ 0 ]
	).defaults;
}

/**
 * Style settings a template sets itself, so the Style tab hides them for it.
 * Keep in step with the template rules in src/storefront/storefront.css.
 */
export const TEMPLATE_FIXED = {
	clean: [ 'cards.columns', 'cards.shadow' ],
	gift: [ 'summary.position' ],
	pastel: [ 'summary.position' ],
	editorial: [
		'summary.position',
		'cards.radius',
		'cards.shadow',
		'buttons.radius',
	],
	night: [ 'summary.position' ],
	split: [ 'summary.position' ],
	compact: [ 'summary.position', 'typography.heading_size' ],
};

export function templateFixes( id ) {
	return TEMPLATE_FIXED[ id ] || [];
}

export const DESIGN_DEFAULTS = {
	template: 'spotlight',
	sync_theme: false,
	colors: {
		accent: '',
		button_text: '',
		background: '',
		surface: '',
		text: '',
		muted: '',
		savings: '',
	},
	typography: {
		heading_font: '',
		body_font: '',
		heading_size: 68,
		heading_weight: 800,
		button_uppercase: false,
	},
	buttons: { style: 'fill', size: 'm', radius: 22 },
	cards: {
		columns: 3,
		image_ratio: '1/1',
		image_fit: 'cover',
		radius: 18,
		shadow: 'none',
		show_compare_price: true,
		show_sale_badge: true,
	},
	summary: {
		position: 'right',
		progress: 'bar',
		slots: 'photos',
		show_ladder: true,
	},
	spacing: {
		width: 'wide',
		padding: { top: '56px', right: '64px', bottom: '56px', left: '64px' },
	},
	advanced: { css_class: '', custom_css: '' },
	content: {
		show_headline: true,
		headline: '',
		show_intro: true,
		intro: '',
		add_label: '',
		cart_label: '',
	},
};

export function normalizeDesign( design = {} ) {
	const out = { ...DESIGN_DEFAULTS, ...design };
	[
		'colors',
		'typography',
		'buttons',
		'cards',
		'summary',
		'spacing',
		'advanced',
		'content',
	].forEach( ( key ) => {
		out[ key ] = { ...DESIGN_DEFAULTS[ key ], ...( design[ key ] || {} ) };
	} );
	out.spacing.padding = {
		...DESIGN_DEFAULTS.spacing.padding,
		...( design.spacing?.padding || {} ),
	};
	return out;
}
