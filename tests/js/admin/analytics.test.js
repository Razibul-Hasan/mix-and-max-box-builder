import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../../src/admin/App';
import * as api from '../../../src/admin/api';

jest.mock( '../../../src/admin/api', () => ( {
	getAnalytics: jest.fn(),
	exportAnalytics: jest.fn(),
	getCampaigns: jest.fn(),
} ) );
const kpi = ( value ) => ( {
	value,
	previous: 0,
	delta: null,
	series: [ 0, value ],
} );
const report = {
	from: '2026-10-01',
	to: '2026-10-02',
	compare: true,
	kpis: {
		revenue: kpi( 1600 ),
		boxes: kpi( 1 ),
		items_per_box: kpi( 2 ),
		discount: kpi( 400 ),
	},
	series: [
		{ date: '2026-10-01', revenue: 0, previous: 0 },
		{ date: '2026-10-02', revenue: 1600, previous: 800 },
	],
	funnel: [
		{ step: 'view', count: 2 },
		{ step: 'purchased', count: 1 },
	],
	top_products: [ { name: 'Cookie', count: 2 } ],
	tier_distribution: [ { qty: 2, share: 100 } ],
	campaigns: [
		{
			id: 12,
			name: 'Holiday box',
			views: 2,
			started: 1,
			boxes: 1,
			conversion: 50,
			avg_box_value: 1600,
			revenue: 1600,
		},
	],
};
beforeEach( () => {
	jest.clearAllMocks();
	window.mmbbAdmin = {
		page: 'analytics',
		locale: 'en-US',
		urls: {},
		money: {
			symbol: '$',
			decimals: 2,
			position: 'left',
			decimalSeparator: '.',
			thousandSeparator: ',',
		},
	};
	api.getAnalytics.mockResolvedValue( report );
	api.getCampaigns.mockResolvedValue( {
		items: [ { id: 12, title: 'Holiday box' } ],
	} );
	api.exportAnalytics.mockResolvedValue();
} );

test( 'renders real report sections and sends the same filters to CSV export', async () => {
	render( <App page="analytics" /> );
	expect( await screen.findByText( 'Campaign performance' ) ).toBeTruthy();
	expect( screen.getByText( 'Most-picked products' ) ).toBeTruthy();
	expect( screen.getByText( 'Cookie' ) ).toBeTruthy();
	expect( screen.getAllByText( '$16.00' ).length ).toBeGreaterThan( 0 );
	fireEvent.change( screen.getByLabelText( 'Campaign' ), {
		target: { value: '12' },
	} );
	await waitFor( () =>
		expect( api.getAnalytics ).toHaveBeenLastCalledWith( {
			range: '30d',
			campaign: 12,
			compare: true,
		} )
	);
	await waitFor( () =>
		expect(
			screen.getByRole( 'button', { name: 'Export CSV' } ).disabled
		).toBe( false )
	);
	fireEvent.click( screen.getByRole( 'button', { name: 'Export CSV' } ) );
	await waitFor( () =>
		expect( api.exportAnalytics ).toHaveBeenCalledWith( {
			range: '30d',
			campaign: 12,
			compare: true,
		} )
	);
} );

test( 'custom dates scope requests and comparison can be disabled', async () => {
	render( <App page="analytics" /> );
	await screen.findByText( 'Campaign performance' );
	fireEvent.click( screen.getByRole( 'radio', { name: 'Custom' } ) );
	await screen.findByText( 'Choose a start and end date.' );
	fireEvent.change( screen.getByLabelText( 'From' ), {
		target: { value: '2026-10-01' },
	} );
	fireEvent.change( screen.getByLabelText( 'To' ), {
		target: { value: '2026-10-02' },
	} );
	fireEvent.click( screen.getByLabelText( 'Compare to previous period' ) );
	await waitFor( () =>
		expect( api.getAnalytics ).toHaveBeenLastCalledWith( {
			range: 'custom',
			from: '2026-10-01',
			to: '2026-10-02',
			campaign: 0,
			compare: false,
		} )
	);
} );
