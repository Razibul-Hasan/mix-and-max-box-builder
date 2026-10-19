import { createMoneyFormatter } from '../../../src/utils/money';

describe( 'WooCommerce money formatting', () => {
	it.each( [
		[ 'left', '€1,234.56' ],
		[ 'right', '1,234.56€' ],
		[ 'left_space', '€ 1,234.56' ],
		[ 'right_space', '1,234.56 €' ],
	] )( 'formats minor units with %s placement', ( position, expected ) => {
		expect(
			createMoneyFormatter( { symbol: '€', position } )( 123456 )
		).toBe( expected );
	} );

	it( 'supports zero-decimal currencies', () => {
		expect(
			createMoneyFormatter( { symbol: '¥', decimals: 0 } )( 1234 )
		).toBe( '¥1,234' );
	} );

	it( 'supports three decimals, separators and refunds', () => {
		const format = createMoneyFormatter( {
			symbol: 'د.ك',
			decimals: 3,
			position: 'right_space',
			decimalSeparator: ',',
			thousandSeparator: '.',
		} );
		expect( format( -1234567 ) ).toBe( '-1.234,567 د.ك' );
	} );

	it( 'supports no grouping and never assumes a currency', () => {
		expect(
			createMoneyFormatter( { thousandSeparator: '' } )( 123456 )
		).toBe( '1234.56' );
		expect( createMoneyFormatter()( 0 ) ).toBe( '0.00' );
	} );
} );
