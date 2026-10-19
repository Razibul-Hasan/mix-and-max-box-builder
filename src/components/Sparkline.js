export default function Sparkline( { data = [], width = 88, height = 32 } ) {
	if ( data.length < 2 ) {
		return null;
	}
	const min = Math.min( ...data ),
		max = Math.max( ...data ),
		span = max - min || 1;
	const x = ( i ) => 2 + ( i * ( width - 6 ) ) / ( data.length - 1 );
	const y = ( v ) =>
		3 + ( height - 6 ) - ( ( v - min ) / span ) * ( height - 6 );
	const d = data
		.map(
			( v, i ) =>
				( i ? 'L' : 'M' ) +
				x( i ).toFixed( 1 ) +
				' ' +
				y( v ).toFixed( 1 )
		)
		.join( ' ' );
	const n = data.length - 1;
	const tail =
		'M' +
		x( n - 1 ).toFixed( 1 ) +
		' ' +
		y( data[ n - 1 ] ).toFixed( 1 ) +
		' L' +
		x( n ).toFixed( 1 ) +
		' ' +
		y( data[ n ] ).toFixed( 1 );
	return (
		<svg
			className="mmbb-spark"
			width={ width }
			height={ height }
			viewBox={ '0 0 ' + width + ' ' + height }
			aria-hidden="true"
		>
			<path
				d={ d }
				fill="none"
				style={ { stroke: 'var(--chart-muted)' } }
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<path
				d={ tail }
				fill="none"
				style={ { stroke: 'var(--chart-1)' } }
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<circle
				cx={ x( n ) }
				cy={ y( data[ n ] ) }
				r="3.5"
				style={ { fill: 'var(--chart-1)', stroke: 'var(--surface)' } }
				strokeWidth="2"
			/>
		</svg>
	);
}
