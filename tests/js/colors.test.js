import { normalizeHex, resolveColors } from '../../src/shared/colors';
import fixtures from '../fixtures/color-cases.json';

describe( 'shared builder colours', () => {
	it.each( fixtures.cases.map( ( c ) => [ c.name, c ] ) )(
		'%s',
		( name, fixture ) => {
			expect(
				resolveColors( fixture.design, fixture.themeAccent )
			).toEqual( fixture.expected );
		}
	);

	it( 'normalises hex colours', () => {
		expect( normalizeHex( '#ABC' ) ).toBe( '#aabbcc' );
		expect( normalizeHex( 'f04e12' ) ).toBe( '#f04e12' );
		expect( normalizeHex( 'red' ) ).toBe( '' );
		expect( normalizeHex( '#12345' ) ).toBe( '' );
		expect( normalizeHex( undefined ) ).toBe( '' );
	} );
} );
