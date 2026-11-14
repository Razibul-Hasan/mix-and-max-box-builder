import {
	DESIGN_DEFAULTS,
	normalizeDesign,
	TEMPLATES,
	templateDefaults,
} from '../../../src/admin/editor/design-defaults';

describe( 'editor design defaults', () => {
	it( 'defines all ten documented templates', () => {
		expect( TEMPLATES.map( ( template ) => template.id ) ).toEqual( [
			'spotlight',
			'clean',
			'steps',
			'gift',
			'bold',
			'pastel',
			'editorial',
			'night',
			'split',
			'compact',
		] );
		expect( templateDefaults( 'not-real' ) ).toBe(
			TEMPLATES[ 0 ].defaults
		);
	} );

	it( 'fills nested defaults without replacing existing values', () => {
		const design = normalizeDesign( {
			template: 'night',
			colors: { accent: '#c8ff2e' },
			spacing: { padding: { top: '2rem' } },
		} );

		expect( design.template ).toBe( 'night' );
		expect( design.colors.accent ).toBe( '#c8ff2e' );
		expect( design.colors.background ).toBe( '' );
		expect( design.spacing.padding.top ).toBe( '2rem' );
		expect( design.spacing.padding.right ).toBe(
			DESIGN_DEFAULTS.spacing.padding.right
		);
	} );
} );
