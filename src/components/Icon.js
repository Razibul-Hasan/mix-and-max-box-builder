import { cx } from './utils';

const dot = ( x, y ) => ( { d: [ x, y ] } );
const circ = ( x, y, r ) => ( { c: [ x, y, r ] } );
const ICONS = {
	box: [
		'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z',
		'M3 7.5l9 4.5 9-4.5',
		'M12 12v9',
		'M7.5 5.25l9 4.5',
	],
	dashboard: [
		'M4 4h7v7H4z',
		'M13 4h7v4h-7z',
		'M13 10h7v10h-7z',
		'M4 13h7v7H4z',
	],
	campaign: [
		'M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1z',
		'M18 9a4 4 0 0 1 0 6',
		'M7.5 15l1.5 5h2',
	],
	analytics: [ 'M4 20h16', 'M6 16v-5', 'M11 16V6', 'M16 16v-8' ],
	settings: [
		'M4 7h9',
		'M19 7h1',
		'M4 17h3',
		'M13 17h7',
		circ( 16, 7, 2.5 ),
		circ( 10, 17, 2.5 ),
	],
	plus: [ 'M12 5v14', 'M5 12h14' ],
	minus: [ 'M5 12h14' ],
	check: [ 'M5 12.5l4.5 4.5L19 7.5' ],
	close: [ 'M6 6l12 12', 'M18 6L6 18' ],
	gift: [
		'M4 11h16v9H4z',
		'M3 7h18v4H3z',
		'M12 7v13',
		'M12 7C10.5 4 7 3.5 7 5.5S9.5 7 12 7z',
		'M12 7c1.5-3 5-3.5 5-1.5S14.5 7 12 7z',
	],
	clock: [ circ( 12, 12, 9 ), 'M12 7v5l3 2' ],
	flame: [
		'M12 21c-3.9 0-7-2.6-7-6.4 0-2.8 1.8-4.7 3.4-6.4.3 1.6 1.2 2.6 2.4 3.1C10.9 7.6 12.4 5 14.4 3c.5 3 5.6 5.4 5.6 11.1 0 4.2-3.6 6.9-8 6.9z',
	],
	tag: [ 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z', circ( 7.5, 7.5, 1.5 ) ],
	truck: [
		'M3 6h11v10H3z',
		'M14 9h4l3 3v4h-7',
		circ( 7, 18, 2 ),
		circ( 17, 18, 2 ),
	],
	arrowUp: [ 'M12 19V5', 'M6 11l6-6 6 6' ],
	arrowDown: [ 'M12 5v14', 'M6 13l6 6 6-6' ],
	arrowRight: [ 'M5 12h14', 'M13 6l6 6-6 6' ],
	arrowLeft: [ 'M19 12H5', 'M11 6l-6 6 6 6' ],
	chevronDown: [ 'M6 9l6 6 6-6' ],
	chevronUp: [ 'M6 15l6-6 6 6' ],
	chevronRight: [ 'M9 6l6 6-6 6' ],
	chevronLeft: [ 'M15 6l-6 6 6 6' ],
	search: [ circ( 11, 11, 7 ), 'M20 20l-4-4' ],
	trash: [
		'M4 7h16',
		'M9 7V4h6v3',
		'M6 7l1 13h10l1-13',
		'M10 11v6',
		'M14 11v6',
	],
	copy: [ 'M8 8h12v12H8z', 'M16 8V4H4v12h4' ],
	eye: [
		'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z',
		circ( 12, 12, 3 ),
	],
	edit: [ 'M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4' ],
	grip: [
		dot( 9, 6 ),
		dot( 15, 6 ),
		dot( 9, 12 ),
		dot( 15, 12 ),
		dot( 9, 18 ),
		dot( 15, 18 ),
	],
	more: [ dot( 5, 12 ), dot( 12, 12 ), dot( 19, 12 ) ],
	info: [ circ( 12, 12, 9 ), 'M12 11v6', 'M12 7.5v.5' ],
	alert: [ 'M12 3.5l9.5 16.5h-19z', 'M12 10v4.5', 'M12 17.25v.25' ],
	lock: [ 'M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4' ],
	sparkle: [ 'M12 3l1.9 7.1L21 12l-7.1 1.9L12 21l-1.9-7.1L3 12l7.1-1.9z' ],
	external: [ 'M14 4h6v6', 'M20 4l-9 9', 'M18 14v6H4V6h6' ],
	calendar: [ 'M4 6h16v14H4z', 'M4 10h16', 'M8 3v5', 'M16 3v5' ],
	filter: [ 'M4 5h16', 'M7 12h10', 'M10 19h4' ],
	image: [ 'M4 5h16v14H4z', 'M4 16l5-5 4 4 3-3 4 4', circ( 15.5, 9, 1.5 ) ],
	bolt: [ 'M13 3L5 13h6l-1 8 8-10h-6z' ],
	users: [
		circ( 9, 8, 3.5 ),
		'M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5',
		'M16 4.5a3.5 3.5 0 0 1 0 7',
		'M18.5 14.5c1.8.8 2.8 2.6 3.2 5.5',
	],
	cart: [
		'M3 4h2.5l2.2 11h10.6l2-8H6.3',
		circ( 9, 19.5, 1.5 ),
		circ( 17, 19.5, 1.5 ),
	],
	store: [
		'M4 9l1.5-5h13L20 9',
		'M5 11v9h14v-9',
		'M4 9a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0A2.67 2.67 0 0 0 20 9',
		'M10 20v-5h4v5',
	],
	palette: [
		'M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-1.1-1-1.4-1-2.4 0-.9.8-1.5 1.9-1.5H17a4 4 0 0 0 4-4C21 6.8 17 3 12 3z',
		dot( 7.5, 11.5 ),
		dot( 9.5, 7.5 ),
		dot( 14.5, 7.5 ),
	],
	mail: [ 'M3 6h18v12H3z', 'M3 7l9 6 9-6' ],
	key: [ circ( 8, 15, 4 ), 'M11 12l9-9', 'M17 6l3 3', 'M14 9l2 2' ],
	code: [ 'M8 7l-5 5 5 5', 'M16 7l5 5-5 5' ],
	percent: [ 'M19 5L5 19', circ( 7, 7, 2.5 ), circ( 17, 17, 2.5 ) ],
	refresh: [
		'M20 11a8 8 0 0 0-14.9-3',
		'M4 4v4h4',
		'M4 13a8 8 0 0 0 14.9 3',
		'M20 20v-4h-4',
	],
	download: [ 'M12 4v11', 'M7 10l5 5 5-5', 'M4 20h16' ],
	layers: [ 'M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5' ],
	help: [
		circ( 12, 12, 9 ),
		'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7',
		'M12 17v.5',
	],
};
export default function Icon( {
	name,
	size = 20,
	strokeWidth = 1.75,
	title,
	className,
	...rest
} ) {
	const parts = ICONS[ name ] || ICONS.box;
	return (
		<svg
			viewBox="0 0 24 24"
			width={ size }
			height={ size }
			fill="none"
			stroke="currentColor"
			strokeWidth={ strokeWidth }
			strokeLinecap="round"
			strokeLinejoin="round"
			className={ cx( 'mmbb-icon', className ) }
			aria-hidden={ title ? undefined : true }
			role={ title ? 'img' : undefined }
			focusable="false"
			{ ...rest }
		>
			{ title ? <title>{ title }</title> : null }
			{ parts.map( ( p, i ) =>
				typeof p === 'string' ? (
					<path key={ i } d={ p } />
				) : p.c ? (
					<circle
						key={ i }
						cx={ p.c[ 0 ] }
						cy={ p.c[ 1 ] }
						r={ p.c[ 2 ] }
					/>
				) : (
					<circle
						key={ i }
						cx={ p.d[ 0 ] }
						cy={ p.d[ 1 ] }
						r={ 1.4 }
						fill="currentColor"
						stroke="none"
					/>
				)
			) }
		</svg>
	);
}
Icon.names = Object.keys( ICONS );

/* ---------------- Actions ---------------- */
