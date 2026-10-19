import { createElement } from '@wordpress/element';
import { cx } from './utils';

const ART = {
	cookie: {
		bg: '#f3e3cc',
		el: [
			[ 'circle', { cx: 50, cy: 52, r: 27, fill: '#c98a4b' } ],
			[ 'circle', { cx: 41, cy: 44, r: 3.5, fill: '#5a3519' } ],
			[ 'circle', { cx: 58, cy: 47, r: 3, fill: '#5a3519' } ],
			[ 'circle', { cx: 47, cy: 60, r: 3.5, fill: '#5a3519' } ],
			[ 'circle', { cx: 61, cy: 61, r: 2.5, fill: '#5a3519' } ],
			[ 'circle', { cx: 37, cy: 56, r: 2.2, fill: '#5a3519' } ],
		],
	},
	macaron: {
		bg: '#f6dfe6',
		el: [
			[
				'rect',
				{ x: 26, y: 33, width: 48, height: 16, rx: 8, fill: '#e88aa6' },
			],
			[
				'rect',
				{ x: 29, y: 47, width: 42, height: 8, rx: 4, fill: '#fff3e8' },
			],
			[
				'rect',
				{ x: 26, y: 53, width: 48, height: 16, rx: 8, fill: '#e88aa6' },
			],
		],
	},
	candle: {
		bg: '#e5ece4',
		el: [
			[
				'rect',
				{ x: 33, y: 38, width: 34, height: 36, rx: 6, fill: '#f7f3ea' },
			],
			[
				'rect',
				{ x: 33, y: 52, width: 34, height: 10, fill: '#7d9a7a' },
			],
			[ 'rect', { x: 49, y: 30, width: 2, height: 9, fill: '#3b3b3b' } ],
			[
				'path',
				{
					d: 'M50 17c4 5 5 8 5 10a5 5 0 0 1-10 0c0-2 1-5 5-10z',
					fill: '#f2a541',
				},
			],
		],
	},
	soap: {
		bg: '#e4ecf2',
		el: [
			[
				'rect',
				{
					x: 24,
					y: 36,
					width: 52,
					height: 30,
					rx: 12,
					fill: '#a9c6dc',
				},
			],
			[
				'rect',
				{ x: 32, y: 42, width: 22, height: 6, rx: 3, fill: '#d6e6f1' },
			],
		],
	},
	tea: {
		bg: '#efe8d8',
		el: [
			[
				'rect',
				{ x: 34, y: 30, width: 32, height: 44, rx: 4, fill: '#3f6b5c' },
			],
			[
				'rect',
				{ x: 32, y: 26, width: 36, height: 9, rx: 3, fill: '#2f5246' },
			],
			[
				'rect',
				{ x: 34, y: 46, width: 32, height: 14, fill: '#e8d9b5' },
			],
		],
	},
	donut: {
		bg: '#fbe6d4',
		el: [
			[ 'circle', { cx: 50, cy: 52, r: 26, fill: '#e2a86b' } ],
			[ 'circle', { cx: 50, cy: 50, r: 22, fill: '#d9577a' } ],
			[ 'circle', { cx: 50, cy: 50, r: 8, fill: '#fbe6d4' } ],
			[
				'rect',
				{
					x: 36,
					y: 38,
					width: 7,
					height: 2.5,
					rx: 1.2,
					fill: '#fff3e8',
					transform: 'rotate(-30 39 39)',
				},
			],
			[
				'rect',
				{
					x: 58,
					y: 40,
					width: 7,
					height: 2.5,
					rx: 1.2,
					fill: '#ffd23f',
					transform: 'rotate(40 61 41)',
				},
			],
			[
				'rect',
				{
					x: 55,
					y: 60,
					width: 7,
					height: 2.5,
					rx: 1.2,
					fill: '#fff3e8',
					transform: 'rotate(-10 58 61)',
				},
			],
			[
				'rect',
				{
					x: 37,
					y: 58,
					width: 7,
					height: 2.5,
					rx: 1.2,
					fill: '#ffd23f',
					transform: 'rotate(25 40 59)',
				},
			],
		],
	},
	chocolate: {
		bg: '#eadcd2',
		el: [
			[
				'rect',
				{ x: 28, y: 28, width: 44, height: 46, rx: 4, fill: '#6b3e26' },
			],
			[
				'path',
				{
					d: 'M28 43.3h44M28 58.6h44M42.7 28v46M57.3 28v46',
					stroke: '#4e2b19',
					strokeWidth: 2,
				},
			],
		],
	},
	honey: {
		bg: '#fbefd0',
		el: [
			[
				'rect',
				{ x: 32, y: 36, width: 36, height: 38, rx: 8, fill: '#e6a52c' },
			],
			[
				'rect',
				{ x: 34, y: 28, width: 32, height: 10, rx: 3, fill: '#6b4a1f' },
			],
			[
				'rect',
				{ x: 38, y: 48, width: 24, height: 14, rx: 3, fill: '#fff7e0' },
			],
		],
	},
};
export default function ProductArt( { kind = 'cookie', label, className } ) {
	const a = ART[ kind ] || ART.cookie;
	return (
		<span
			className={ cx( 'mmbb-art', className ) }
			style={ { background: a.bg } }
			role={ label ? 'img' : undefined }
			aria-label={ label }
			aria-hidden={ label ? undefined : true }
		>
			<svg viewBox="0 0 100 100">
				{ a.el.map( ( e, i ) =>
					createElement( e[ 0 ], Object.assign( { key: i }, e[ 1 ] ) )
				) }
			</svg>
		</span>
	);
}
ProductArt.kinds = Object.keys( ART );
