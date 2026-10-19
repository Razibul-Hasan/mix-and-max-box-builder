import { quote, toMinor } from '../../src/shared/pricing';
import fixtures from '../fixtures/pricing-cases.json';

describe( 'shared pricing engine', () => {
	it( 'has enough fixtures covering every campaign type', () => {
		expect( fixtures.cases.length ).toBeGreaterThanOrEqual( 25 );
		const types = new Set( fixtures.cases.map( ( c ) => c.config.type ) );
		expect( [ ...types ].sort() ).toEqual( [
			'bundle',
			'fixed',
			'tiered',
		] );
	} );

	it.each( fixtures.cases.map( ( c ) => [ c.name, c ] ) )(
		'%s',
		( name, fixture ) => {
			const result = quote(
				fixture.config,
				fixture.items,
				fixture.options
			);
			expect( result ).toEqual( fixture.expected );
		}
	);

	it( 'converts config amounts to minor units, rounding half up', () => {
		expect( toMinor( 4.5, 2 ) ).toBe( 450 );
		expect( toMinor( 15.99, 2 ) ).toBe( 1599 );
		expect( toMinor( 300, 0 ) ).toBe( 300 );
		expect( toMinor( 1.5, 3 ) ).toBe( 1500 );
		expect( toMinor( -1, 2 ) ).toBe( 0 );
	} );
} );
