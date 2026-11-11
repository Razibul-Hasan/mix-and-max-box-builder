import { act, render, screen } from '@testing-library/react';
import {
	acceptMessage,
	configMessage,
	originOf,
	PREVIEW_CONFIG,
	PREVIEW_HEIGHT,
	PREVIEW_READY,
} from '../../src/shared/preview-bridge';
import PreviewHost, { rulesKey } from '../../src/storefront/PreviewHost';

jest.mock( '../../src/storefront/api', () => ( {
	addBoxToCart: jest.fn(),
} ) );

const ORIGIN = 'http://localhost';

describe( 'preview bridge', () => {
	const frame = {};
	const event = ( data, origin = ORIGIN, source = frame ) => ( {
		data,
		origin,
		source,
	} );

	it( 'accepts our messages from the expected origin and window', () => {
		expect(
			acceptMessage( event( { type: PREVIEW_READY } ), ORIGIN, frame )
		).toEqual( { type: PREVIEW_READY } );
		expect(
			acceptMessage(
				event( { type: PREVIEW_HEIGHT, height: 900 } ),
				ORIGIN
			)
		).toEqual( { type: PREVIEW_HEIGHT, height: 900 } );
	} );

	it( 'ignores a message from another origin', () => {
		expect(
			acceptMessage(
				event( { type: PREVIEW_READY }, 'https://evil.test' ),
				ORIGIN,
				frame
			)
		).toBeNull();
		// Same host, other scheme or port, is another origin too.
		expect(
			acceptMessage(
				event( { type: PREVIEW_READY }, 'https://localhost' ),
				ORIGIN
			)
		).toBeNull();
		expect(
			acceptMessage(
				event( { type: PREVIEW_READY }, 'http://localhost:8080' ),
				ORIGIN
			)
		).toBeNull();
	} );

	it( 'ignores a message from another window, even on the right origin', () => {
		expect(
			acceptMessage(
				event( { type: PREVIEW_READY }, ORIGIN, {} ),
				ORIGIN,
				frame
			)
		).toBeNull();
	} );

	it( 'ignores messages that are not ours, and works without an origin to trust', () => {
		expect(
			acceptMessage( event( 'mmbb:preview:ready' ), ORIGIN )
		).toBeNull();
		expect( acceptMessage( event( null ), ORIGIN ) ).toBeNull();
		expect(
			acceptMessage( event( { type: 'other:thing' } ), ORIGIN )
		).toBeNull();
		expect(
			acceptMessage( event( { type: PREVIEW_READY } ), '' )
		).toBeNull();
		expect( acceptMessage( null, ORIGIN ) ).toBeNull();
	} );

	it( 'builds the config message and reads origins', () => {
		const payload = { config: { type: 'tiered' }, title: 'Box' };
		expect( configMessage( '7', payload ) ).toEqual( {
			type: PREVIEW_CONFIG,
			boxId: 7,
			config: { type: 'tiered' },
			payload,
		} );
		expect( originOf( 'https://shop.test/box/?mmbb_preview=7' ) ).toBe(
			'https://shop.test'
		);
		expect(
			originOf( '/?mmbb_preview=7', 'http://localhost/wp-admin/' )
		).toBe( 'http://localhost' );
		expect( originOf( 'not a url' ) ).toBe( '' );
	} );
} );

const payload = (
	title = 'Holiday box',
	colors = { vars: {}, dark: false }
) => ( {
	id: 5,
	title,
	status: 'draft',
	preview: true,
	config: {
		type: 'tiered',
		box: {
			capacity: 3,
			min_items: 2,
			allow_duplicates: true,
			max_per_product: 3,
			hide_sold_out: false,
		},
		tiers: [ { qty: 2, discount_type: 'percent', value: 10 } ],
		sizes: [],
		bundle: { qty: 3, price: 0 },
		extras: { gift_message: false, gift_wrap: { enabled: false, fee: 0 } },
		design: {
			headline: title,
			intro: '',
			sticker: '',
			show_stickers: true,
			show_ladder: true,
			theme: 'light',
			cta_label: '',
		},
		caps: {},
		schedule: { end: null, countdown_days: 0 },
	},
	colors,
	view: { layout: 'panel', columns: 3, showHero: true },
	settings: {
		unlockToast: true,
		stickers: true,
		ctaLabel: '',
		emptyHint: '',
	},
	products: [],
	money: {
		symbol: '$',
		position: 'left',
		decimals: 2,
		decimalSeparator: '.',
		thousandSeparator: ',',
	},
	now: '2026-01-01T00:00:00Z',
} );

describe( 'preview host in the iframe', () => {
	const send = ( data, origin = ORIGIN ) =>
		act( () => {
			window.dispatchEvent(
				new MessageEvent( 'message', {
					data,
					origin,
					// In jsdom the page is its own parent.
					source: window.parent,
				} )
			);
		} );

	it( 'shows the draft the editor sends, and only from the editor', () => {
		const element = document.createElement( 'div' );
		render(
			<PreviewHost
				payload={ payload() }
				preview={ { boxId: 5, origin: ORIGIN } }
				element={ element }
			/>
		);
		expect( screen.getByText( 'Preview — checkout is off' ) ).toBeTruthy();
		expect( screen.getAllByText( 'Holiday box' ).length ).toBeGreaterThan(
			0
		);

		// Wrong origin, wrong box, or not our message: nothing changes.
		send(
			configMessage( 5, payload( 'From elsewhere' ) ),
			'https://evil.test'
		);
		send( configMessage( 9, payload( 'Other box' ) ) );
		send( { type: PREVIEW_CONFIG, boxId: 5 } );
		expect( screen.queryByText( 'From elsewhere' ) ).toBeNull();
		expect( screen.queryByText( 'Other box' ) ).toBeNull();

		send(
			configMessage(
				5,
				payload( 'Summer box', {
					vars: { '--max': 'rgb(1, 2, 3)' },
					dark: true,
				} )
			)
		);
		expect( screen.getAllByText( 'Summer box' ).length ).toBeGreaterThan(
			0
		);
		expect( element.style.getPropertyValue( '--max' ) ).toBe(
			'rgb(1, 2, 3)'
		);
		expect( element.getAttribute( 'data-theme' ) ).toBe( 'dark' );

		send( configMessage( 5, payload( 'Summer box' ) ) );
		expect( element.style.getPropertyValue( '--max' ) ).toBe( '' );
		expect( element.getAttribute( 'data-theme' ) ).toBeNull();
	} );

	it( 'starts the box over only when the rules change', () => {
		const a = payload();
		const b = payload( 'New headline' );
		expect( rulesKey( a ) ).toBe( rulesKey( b ) );
		b.config.box = { ...b.config.box, capacity: 6 };
		expect( rulesKey( a ) ).not.toBe( rulesKey( b ) );
	} );
} );
