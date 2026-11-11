import {
	boxDetails,
	boxSummary,
	boxTypeTitle,
	shownOnPath,
} from '../../../src/admin/format';

const money = ( minor ) => '$' + ( minor / 100 ).toFixed( 2 );
const tiers = [
	{ qty: 4, discount_type: 'percent', value: 10 },
	{ qty: 6, discount_type: 'percent', value: 15 },
	{ qty: 12, discount_type: 'percent', value: 25 },
];

describe( 'box summaries (Home and Boxes)', () => {
	it( 'names each stored type the way the design does', () => {
		expect( boxTypeTitle( 'tiered' ) ).toBe(
			'Bigger box, bigger discount'
		);
		expect( boxTypeTitle( 'fixed' ) ).toBe( 'Pick a box size' );
		expect( boxTypeTitle( 'bundle' ) ).toBe( 'Set price bundle' );
	} );

	it( 'writes the Boxes line for every type', () => {
		expect(
			boxSummary( { type: 'tiered', box: { capacity: 12 } }, money, 2 )
		).toBe( 'Bigger box, bigger discount · up to 12' );
		expect(
			boxSummary(
				{ type: 'fixed', sizes: [ { qty: 4 }, { qty: 6 } ] },
				money,
				2
			)
		).toBe( 'Pick a box size · 4 / 6' );
		expect(
			boxSummary(
				{ type: 'bundle', bundle: { qty: 3, price: 45 } },
				money,
				2
			)
		).toBe( 'Bundle price · 3 for $45.00' );
		expect(
			boxSummary(
				{ type: 'bundle', bundle: { qty: 3, price: 0 } },
				money,
				2
			)
		).toBe( 'Bundle price · 3 items' );
	} );

	it( 'writes the Home line for every type', () => {
		expect(
			boxDetails( { type: 'tiered', box: { capacity: 12 }, tiers } )
		).toBe( 'Up to 12 items · 10 / 15 / 25% off' );
		expect(
			boxDetails( {
				type: 'tiered',
				box: { capacity: 12 },
				tiers: [ { qty: 4, discount_type: 'fixed_amount', value: 5 } ],
			} )
		).toBe( 'Up to 12 items' );
		expect(
			boxDetails( { type: 'fixed', sizes: [ { qty: 4 }, { qty: 6 } ] } )
		).toBe( 'Sizes 4 / 6' );
		expect( boxDetails( { type: 'bundle', bundle: { qty: 3 } } ) ).toBe(
			'3 items for one price'
		);
	} );

	it( 'shows the page path only while the page still holds the box', () => {
		expect(
			shownOnPath( {
				method: 'block',
				page_url: 'http://shop.test/holiday-treat-box/',
			} )
		).toBe( '/holiday-treat-box/' );
		expect(
			shownOnPath( {
				method: 'none',
				page_url: 'http://shop.test/holiday-treat-box/',
			} )
		).toBe( '' );
		expect( shownOnPath( { method: 'none', page_url: '' } ) ).toBe( '' );
		expect( shownOnPath( null ) ).toBe( '' );
	} );
} );
