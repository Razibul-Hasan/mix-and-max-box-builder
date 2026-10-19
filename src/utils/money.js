// Format an integer amount in WooCommerce minor units; no currency is assumed.
export function createMoneyFormatter( {
	symbol = '',
	position = 'left',
	decimals = 2,
	decimalSeparator = '.',
	thousandSeparator = ',',
} = {} ) {
	return ( amount = 0 ) => {
		const number = Number( amount );
		const value = Number.isFinite( number ) ? Math.round( number ) : 0;
		const [ whole, fraction ] = ( Math.abs( value ) / 10 ** decimals )
			.toFixed( decimals )
			.split( '.' );
		const grouped = whole.replace(
			/\B(?=(\d{3})+(?!\d))/g,
			() => thousandSeparator
		);
		const formatted =
			grouped + ( decimals ? decimalSeparator + fraction : '' );
		const placements = {
			left: symbol + formatted,
			right: formatted + symbol,
			left_space: symbol + ' ' + formatted,
			right_space: formatted + ' ' + symbol,
		};
		return (
			( value < 0 ? '-' : '' ) +
			( placements[ position ] ?? placements.left )
		);
	};
}
