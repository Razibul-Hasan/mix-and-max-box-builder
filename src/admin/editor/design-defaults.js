export const TEMPLATES = [
	[
		'spotlight',
		'Spotlight',
		'#ff4f1f',
		'#ffffff',
		'#111111',
		'bricolage-grotesque',
		'bricolage-grotesque',
	],
	[
		'clean',
		'Clean list',
		'#111111',
		'#ffffff',
		'#111111',
		'inter-tight',
		'inter-tight',
	],
	[
		'steps',
		'Guided steps',
		'#5b3df5',
		'#f6f4ff',
		'#1b1240',
		'plus-jakarta-sans',
		'plus-jakarta-sans',
	],
	[
		'gift',
		'Gift tray',
		'#f2c14e',
		'#0f3d2e',
		'#f6efe3',
		'fraunces',
		'dm-sans',
	],
	[
		'bold',
		'Color block',
		'#ffe14d',
		'#f2f3f5',
		'#0e0e10',
		'bricolage-grotesque',
		'bricolage-grotesque',
	],
	[ 'pastel', 'Pastel', '#8b5cf6', '#fff8f3', '#2d2433', 'outfit', 'outfit' ],
	[
		'editorial',
		'Editorial',
		'#c2410c',
		'#f5f1ea',
		'#1a1a1a',
		'fraunces',
		'inter',
	],
	[
		'night',
		'Night',
		'#c8ff2e',
		'#0c0c10',
		'#f4f4f5',
		'space-grotesk',
		'space-grotesk',
	],
	[
		'split',
		'Split screen',
		'#ff6b4a',
		'#ffffff',
		'#111111',
		'bricolage-grotesque',
		'inter',
	],
	[
		'compact',
		'Compact card',
		'#e11d74',
		'#f4f4f2',
		'#111111',
		'bricolage-grotesque',
		'inter',
	],
].map( ( [ id, name, accent, background, text, headingFont, bodyFont ] ) => ( {
	id,
	name,
	defaults: {
		colors: { accent, background, text },
		typography: { heading_font: headingFont, body_font: bodyFont },
	},
} ) );

export function templateDefaults( id ) {
	return (
		TEMPLATES.find( ( template ) => template.id === id ) || TEMPLATES[ 0 ]
	).defaults;
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
	content: { headline: '', intro: '', add_label: '', cart_label: '' },
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
