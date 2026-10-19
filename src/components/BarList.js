export default function BarList( {
	items = [],
	formatValue = ( v ) => v,
	color = 'chart-1',
	max,
} ) {
	const m = max || Math.max( 1, ...items.map( ( i ) => i.value ) );
	return (
		<ul className="mmbb-barlist">
			{ items.map( ( it ) => (
				<li
					key={ it.label }
					className="mmbb-barlist__row"
					tabIndex={ 0 }
					title={ it.label + ': ' + formatValue( it.value ) }
				>
					<span className="mmbb-barlist__label">
						{ it.label }
						{ it.meta ? (
							<span className="mmbb-barlist__meta">
								{ it.meta }
							</span>
						) : null }
					</span>
					<span className="mmbb-barlist__value">
						{ formatValue( it.value ) }
					</span>
					<span className="mmbb-barlist__bar">
						<span
							className="mmbb-barlist__fill"
							style={ {
								width:
									Math.max( 1, ( it.value / m ) * 100 ) + '%',
								background: 'var(--' + color + ')',
							} }
						/>
					</span>
				</li>
			) ) }
		</ul>
	);
}
