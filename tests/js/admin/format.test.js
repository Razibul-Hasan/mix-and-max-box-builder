import {
	canPause,
	formatPercent,
	formatShortDate,
	placementInfo,
	scheduleLabel,
	statusInfo,
	typeSummary,
} from '../../../src/admin/format';

const money = ( minor ) => '$' + ( minor / 100 ).toFixed( 2 );
const now = new Date( '2026-10-19T12:00:00Z' );
const dates = { locale: 'en-US', timezone: 'UTC', now };

describe( 'admin formatting', () => {
	it( 'summarizes each campaign type', () => {
		expect(
			typeSummary( { type: 'tiered', box: { capacity: 12 } }, money, 2 )
		).toBe( 'Tiered mix · up to 12' );
		expect(
			typeSummary(
				{ type: 'fixed', sizes: [ { qty: 4 }, { qty: 6 } ] },
				money,
				2
			)
		).toBe( 'Fixed box · 4 / 6' );
		expect(
			typeSummary(
				{ type: 'bundle', bundle: { qty: 3, price: 18 } },
				money,
				2
			)
		).toBe( 'Bundle price · any 3 for $18.00' );
	} );

	it( 'formats dates on the store clock and adds the year only when needed', () => {
		expect( formatShortDate( '2026-11-01T00:00:00Z', dates ) ).toBe(
			'Nov 1'
		);
		expect( formatShortDate( '2027-01-05T00:00:00Z', dates ) ).toBe(
			'Jan 5, 2027'
		);
		expect(
			formatShortDate( '2026-11-01T01:00:00Z', {
				...dates,
				timezone: 'America/New_York',
			} )
		).toBe( 'Oct 31' );
		expect(
			formatShortDate( '2026-11-01T23:00:00Z', {
				...dates,
				timezone: '+02:00',
			} )
		).toBe( 'Nov 2' );
		expect( formatShortDate( 'nonsense', dates ) ).toBe( '' );
	} );

	it( 'labels schedules', () => {
		const campaign = ( schedule, status = 'active' ) => ( {
			status,
			config: { schedule },
		} );
		expect(
			scheduleLabel(
				campaign( {
					start: '2026-11-01T00:00:00Z',
					end: '2026-12-24T00:00:00Z',
				} ),
				dates
			)
		).toBe( 'Nov 1 – Dec 24' );
		expect(
			scheduleLabel(
				campaign( { start: '2026-11-15T00:00:00Z', end: null } ),
				dates
			)
		).toBe( 'Starts Nov 15' );
		expect(
			scheduleLabel(
				campaign( { start: null, end: '2026-11-15T00:00:00Z' } ),
				dates
			)
		).toBe( 'Until Nov 15' );
		expect(
			scheduleLabel( campaign( { start: null, end: null } ), dates )
		).toBe( 'Always on' );
		expect(
			scheduleLabel(
				campaign( { start: null, end: null }, 'draft' ),
				dates
			)
		).toBe( 'Not scheduled' );
	} );

	it( 'pairs every status with a word and a tone', () => {
		expect( statusInfo( 'active' ) ).toEqual( {
			tone: 'success',
			label: 'Active',
		} );
		expect( statusInfo( 'ending_soon' ).tone ).toBe( 'warning' );
		expect( statusInfo( 'scheduled' ).tone ).toBe( 'info' );
		expect( statusInfo( 'ended' ).label ).toBe( 'Ended' );
		expect( canPause( 'active' ) ).toBe( true );
		expect( canPause( 'scheduled' ) ).toBe( true );
		expect( canPause( 'draft' ) ).toBe( false );
		expect( canPause( 'ended' ) ).toBe( false );
	} );

	it( 'shows placement as a path, the shortcode, or a warning', () => {
		expect(
			placementInfo( {
				method: 'block',
				page_url: 'https://shop.test/holiday-box/',
				page_title: 'Holiday',
			} )
		).toEqual( { kind: 'page', text: '/holiday-box/' } );
		expect(
			placementInfo( {
				method: 'shortcode',
				shortcode: '[mmbb_box id="11"]',
			} )
		).toEqual( { kind: 'code', text: '[mmbb_box id="11"]' } );
		expect( placementInfo( { method: 'none' } ).kind ).toBe( 'none' );
	} );

	it( 'shows a dash where there is no conversion yet', () => {
		expect( formatPercent( 0, 'en-US' ) ).toBe( '—' );
		expect( formatPercent( 9.2, 'en-US' ) ).toBe( '9.2%' );
	} );
} );
