import { useState, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useWidth, formatCompact, niceScale } from './utils';

export default function LineChart( {
	series = [],
	labels = [],
	height = 240,
	formatValue = ( v ) => v,
	formatTick,
	yTicks = 4,
	ariaLabel = __( 'Line chart', 'mix-and-max-box-builder' ),
	legend,
} ) {
	const ref = useRef( null );
	const w = useWidth( ref, 640 );
	const [ hover, setHover ] = useState( null );
	const pad = { l: 44, r: 12, t: 22, b: 28 };
	const iw = Math.max( 10, w - pad.l - pad.r ),
		ih = height - pad.t - pad.b;
	const n = labels.length;
	const scale = niceScale(
		Math.max( 1, ...series.flatMap( ( s ) => s.data ) ),
		yTicks
	);
	const x = ( i ) => pad.l + ( n <= 1 ? 0 : ( i * iw ) / ( n - 1 ) );
	const y = ( v ) => pad.t + ih - ( v / scale.max ) * ih;
	const ticks = Array.from(
		{ length: yTicks + 1 },
		( _, i ) => scale.step * i
	);
	const line = ( d ) =>
		d
			.map(
				( v, i ) =>
					( i ? 'L' : 'M' ) +
					x( i ).toFixed( 1 ) +
					' ' +
					y( v ).toFixed( 1 )
			)
			.join( ' ' );
	const every = Math.max( 1, Math.ceil( n / 7 ) );
	const tickFmt = formatTick || ( ( v ) => formatCompact( v ) );
	const showLegend = legend !== undefined ? legend : series.length > 1;
	const onMove = ( e ) => {
		const r = e.currentTarget.getBoundingClientRect();
		const i = Math.round(
			( ( e.clientX - r.left - pad.l ) / iw ) * ( n - 1 )
		);
		setHover( Math.max( 0, Math.min( n - 1, i ) ) );
	};
	const onKey = ( e ) => {
		if ( e.key === 'ArrowRight' ) {
			e.preventDefault();
			setHover( ( h ) =>
				h === null || h === undefined ? n - 1 : Math.min( n - 1, h + 1 )
			);
		}
		if ( e.key === 'ArrowLeft' ) {
			e.preventDefault();
			setHover( ( h ) =>
				h === null || h === undefined ? n - 1 : Math.max( 0, h - 1 )
			);
		}
		if ( e.key === 'Escape' ) {
			setHover( null );
		}
	};
	const hero = series.find( ( s ) => s.label ) || null;
	const tipLeft =
		hover === null || hover === undefined
			? 0
			: x( hover ) + 176 > w
			? x( hover ) - 172
			: x( hover ) + 12;
	return (
		<div className="mmbb-chart" ref={ ref }>
			{ showLegend ? (
				<div className="mmbb-legend">
					{ series.map( ( s ) => (
						<span key={ s.name } className="mmbb-legend__item">
							<span
								className="mmbb-legend__line"
								style={ {
									background:
										'var(--' +
										( s.color || 'chart-1' ) +
										')',
								} }
							/>
							{ s.name }
						</span>
					) ) }
				</div>
			) : null }
			<svg
				width={ w }
				height={ height }
				role="img"
				aria-label={ ariaLabel }
				tabIndex={ 0 }
				onPointerMove={ onMove }
				onPointerLeave={ () => setHover( null ) }
				onKeyDown={ onKey }
				onBlur={ () => setHover( null ) }
			>
				{ ticks.map( ( t, i ) => (
					<g key={ i }>
						<line
							x1={ pad.l }
							x2={ w - pad.r }
							y1={ y( t ) }
							y2={ y( t ) }
							className={
								i === 0
									? 'mmbb-chart__axis'
									: 'mmbb-chart__grid'
							}
						/>
						<text
							x={ pad.l - 8 }
							y={ y( t ) }
							className="mmbb-chart__tick"
							textAnchor="end"
							dominantBaseline="middle"
						>
							{ tickFmt( t ) }
						</text>
					</g>
				) ) }
				{ labels.map( ( l, i ) =>
					( i % every === 0 || i === n - 1 ) &&
					! ( i !== n - 1 && n - 1 - i < every * 0.6 ) ? (
						<text
							key={ i }
							x={ x( i ) }
							y={ height - 8 }
							textAnchor={
								i === 0
									? 'start'
									: i === n - 1
									? 'end'
									: 'middle'
							}
							className="mmbb-chart__tick"
						>
							{ l }
						</text>
					) : null
				) }
				{ series.map( ( s, si ) => (
					<g key={ si }>
						{ s.area ? (
							<path
								d={
									line( s.data ) +
									' L' +
									x( n - 1 ) +
									' ' +
									y( 0 ) +
									' L' +
									x( 0 ) +
									' ' +
									y( 0 ) +
									' Z'
								}
								style={ {
									fill:
										'var(--' +
										( s.color || 'chart-1' ) +
										')',
								} }
								opacity="0.1"
							/>
						) : null }
						<path
							d={ line( s.data ) }
							fill="none"
							style={ {
								stroke:
									'var(--' + ( s.color || 'chart-1' ) + ')',
							} }
							strokeWidth="2"
							strokeLinejoin="round"
							strokeLinecap="round"
						/>
					</g>
				) ) }
				{ hover !== null && hover !== undefined ? (
					<line
						x1={ x( hover ) }
						x2={ x( hover ) }
						y1={ pad.t }
						y2={ pad.t + ih }
						className="mmbb-chart__cross"
					/>
				) : null }
				{ series.map( ( s, si ) => {
					const i =
						hover !== null && hover !== undefined ? hover : n - 1;
					if (
						( hover === null || hover === undefined ) &&
						! s.label
					) {
						return null;
					}
					return (
						<circle
							key={ si }
							cx={ x( i ) }
							cy={ y( s.data[ i ] ) }
							r="4.5"
							style={ {
								fill: 'var(--' + ( s.color || 'chart-1' ) + ')',
								stroke: 'var(--surface)',
							} }
							strokeWidth="2"
						/>
					);
				} ) }
				{ hero && ( hover === null || hover === undefined ) ? (
					<text
						x={ x( n - 1 ) }
						y={ y( hero.data[ n - 1 ] ) - 12 }
						textAnchor="end"
						className="mmbb-chart__end"
					>
						{ formatValue( hero.data[ n - 1 ] ) }
					</text>
				) : null }
			</svg>
			{ hover !== null && hover !== undefined ? (
				<div
					className="mmbb-chart__tip"
					style={ {
						left: tipLeft,
						top: pad.t + ( showLegend ? 30 : 0 ),
					} }
				>
					<div className="mmbb-chart__tip-title">
						{ labels[ hover ] }
					</div>
					{ series.map( ( s ) => (
						<div key={ s.name } className="mmbb-chart__tip-row">
							<span
								className="mmbb-chart__key"
								style={ {
									background:
										'var(--' +
										( s.color || 'chart-1' ) +
										')',
								} }
							/>
							<strong>{ formatValue( s.data[ hover ] ) }</strong>
							<span>{ s.name }</span>
						</div>
					) ) }
				</div>
			) : null }
			<div className="mmbb-sr">
				<table>
					<caption>{ ariaLabel }</caption>
					<thead>
						<tr>
							<th>{ __( 'Date', 'mix-and-max-box-builder' ) }</th>
							{ series.map( ( s ) => (
								<th key={ s.name }>{ s.name }</th>
							) ) }
						</tr>
					</thead>
					<tbody>
						{ labels.map( ( l, i ) => (
							<tr key={ i }>
								<td>{ l }</td>
								{ series.map( ( s ) => (
									<td key={ s.name }>
										{ formatValue( s.data[ i ] ) }
									</td>
								) ) }
							</tr>
						) ) }
					</tbody>
				</table>
			</div>
		</div>
	);
}
