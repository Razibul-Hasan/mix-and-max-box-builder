import { createElement } from '@wordpress/element';
import { fireEvent, render, screen } from '@testing-library/react';
import { setLocaleData, resetLocaleData } from '@wordpress/i18n';
import * as components from '../../../src/components';

const tiers = [
	{ qty: 4, label: '10% off' },
	{ qty: 6, label: '15% off' },
	{ qty: 12, label: '25% off' },
];
const item = { id: 1, name: 'Brown Butter Chip', art: 'cookie', price: 450 };
const samples = {
	Icon: { name: 'box', title: 'Box' },
	Button: { children: 'Create campaign', icon: 'plus' },
	Badge: { children: 'Active', tone: 'success', dot: true },
	Sticker: { children: 'Save 25%', tilt: true },
	TextField: { label: 'Campaign name', help: 'Shown on your store.' },
	SelectField: { label: 'Builder page', options: [ 'Holiday box' ] },
	Toggle: { label: 'Show countdown', defaultChecked: true },
	Checkbox: { label: 'Gift wrap this box', indeterminate: true },
	ChoiceCard: {
		title: 'Tiered mix',
		icon: 'percent',
		value: 'tiered',
		name: 'type',
	},
	QuantityStepper: { defaultValue: 2 },
	SegmentedControl: { options: [ '7 days', '30 days' ], label: 'Date range' },
	Chips: { options: [ 'All', 'Cookies' ], label: 'Categories' },
	Tabs: { tabs: [ { id: 'all', label: 'All', count: 4 } ], label: 'Status' },
	Steps: { steps: [ 'Basics', 'Products', 'Box rules' ], current: 1 },
	Card: { title: 'Box rules', children: 'Up to 12 items.' },
	PageHeader: {
		title: 'Holiday Treat Box',
		backLabel: 'Campaigns',
		backHref: '/campaigns',
	},
	Notice: {
		title: 'Place your builder on a page',
		children: 'Add the block.',
		onDismiss: jest.fn(),
	},
	EmptyState: {
		title: 'Launch your first box',
		description: 'Pick products to start.',
	},
	Toast: { children: 'Campaign saved', action: 'Undo', onDismiss: jest.fn() },
	AdminShell: { active: 'campaigns', children: 'Campaigns' },
	StatCard: {
		label: 'Box revenue',
		value: '12,480',
		delta: 8.4,
		trend: [ 1, 3, 2, 5 ],
	},
	Sparkline: { data: [ 1, 3, 2, 5 ] },
	DataTable: {
		columns: [ { key: 'name', label: 'Campaign' } ],
		rows: [ { id: 1, name: 'Holiday Treat Box' } ],
		selectable: true,
	},
	LineChart: {
		labels: [ 'Oct 1', 'Oct 2' ],
		series: [ { name: 'Revenue', data: [ 200, 400 ], label: true } ],
	},
	BarList: { items: [ { label: 'Brown Butter Chip', value: 486 } ] },
	FunnelChart: {
		steps: [
			{ label: 'Viewed builder', value: 100 },
			{ label: 'Added first item', value: 55 },
		],
	},
	ProgressBar: {
		value: 3,
		max: 5,
		label: 'Setup',
		valueLabel: '3 of 5 done',
	},
	ProductArt: { kind: 'cookie', label: 'Cookie' },
	ProductTile: { ...item, stock: 3, qty: 1, onChange: jest.fn() },
	BoxSlots: { size: 6, items: [ item ], onRemove: jest.fn() },
	TierProgress: { count: 5, tiers },
	BoxSizePicker: {
		sizes: [
			{ qty: 4, price: 1800, save: '10%' },
			{ qty: 6, price: 2600, tag: 'Most popular' },
		],
	},
	BoxPanel: { size: 12, items: [ item ], tiers, subtotal: 450, total: 405 },
	BoxSummaryBar: { size: 12, items: [ item ], tiers, total: 405 },
	Countdown: { seconds: 3600 },
};

describe( 'Design component contract', () => {
	it( 'translates and reorders a complete tier sentence', () => {
		const domain = 'mix-and-max-box-builder';
		setLocaleData(
			{
				'': {
					domain,
					lang: 'fr',
					'plural-forms': 'nplurals=2; plural=(n > 1);',
				},
				'Add <count>%1$d more</count> to get <deal>%2$s</deal>': [
					'<deal>%2$s</deal> : ajoutez <count>%1$d article</count>',
					'<deal>%2$s</deal> : ajoutez <count>%1$d articles</count>',
				],
			},
			domain
		);
		try {
			const { container } = render(
				<components.TierProgress count={ 2 } tiers={ tiers } />
			);
			expect(
				container.querySelector( '.mmbb-tier__msg' ).textContent
			).toBe( '10% off : ajoutez 2 articles' );
			expect(
				container.querySelector( '.mmbb-tier__hl' ).textContent
			).toBe( '10% off' );
		} finally {
			resetLocaleData( {}, domain );
		}
	} );
	it.each( Object.entries( samples ) )(
		'renders %s with design sample props',
		( name, props ) => {
			const { container } = render(
				createElement( components[ name ], props )
			);
			expect( container.firstChild ).not.toBeNull();
		}
	);

	it( 'covers every design component export', () => {
		expect(
			Object.keys( components )
				.filter(
					( name ) =>
						! [ 'MoneyProvider', 'useMoney' ].includes( name )
				)
				.sort()
		).toEqual( Object.keys( samples ).sort() );
	} );

	it( 'clamps the stepper at both bounds and reports changes', () => {
		const onChange = jest.fn();
		render(
			<components.QuantityStepper
				defaultValue={ 1 }
				min={ 1 }
				max={ 2 }
				onChange={ onChange }
			/>
		);
		fireEvent.click( screen.getByRole( 'button', { name: 'Decrease' } ) );
		expect( onChange ).not.toHaveBeenCalled();
		fireEvent.click( screen.getByRole( 'button', { name: 'Increase' } ) );
		fireEvent.click( screen.getByRole( 'button', { name: 'Increase' } ) );
		expect( onChange.mock.calls ).toEqual( [ [ 2 ] ] );
		fireEvent.click( screen.getByRole( 'button', { name: 'Decrease' } ) );
		expect( onChange.mock.calls ).toEqual( [ [ 2 ], [ 1 ] ] );
	} );

	it.each( [
		[ 2, 'Add 2 more to get 10% off' ],
		[ 5, '10% off unlocked.Add 1 more to get 15% off' ],
		[ 12, 'You unlocked 25% off. That’s the max deal.' ],
	] )( 'shows the tier sentence at count %d', ( count, message ) => {
		const { container } = render(
			<components.TierProgress count={ count } tiers={ tiers } />
		);
		expect( container.querySelector( '.mmbb-tier__msg' ).textContent ).toBe(
			message
		);
	} );

	it( 'preserves navigation href props', () => {
		render(
			<components.Button href="/campaigns">
				Create campaign
			</components.Button>
		);
		expect( screen.getByRole( 'link' ).getAttribute( 'href' ) ).toBe(
			'/campaigns'
		);
	} );

	it( 'blocks disabled link callbacks', () => {
		const onClick = jest.fn();
		render(
			<components.Button href="/cart" onClick={ onClick } disabled>
				Add box
			</components.Button>
		);
		fireEvent.click( screen.getByText( 'Add box' ) );
		expect( onClick ).not.toHaveBeenCalled();
		expect(
			screen.getByText( 'Add box' ).closest( 'a' ).getAttribute( 'href' )
		).toBeNull();
	} );

	it( 'renders responsive product images with the product name', () => {
		render(
			<components.ProductTile
				name="Cookie"
				price={ 450 }
				image={ {
					src: '/cookie.jpg',
					srcset: '/cookie.jpg 600w',
					sizes: '50vw',
				} }
			/>
		);
		const image = screen.getByRole( 'img', { name: 'Cookie' } );
		expect( image.getAttribute( 'srcset' ) ).toBe( '/cookie.jpg 600w' );
		expect( image.getAttribute( 'sizes' ) ).toBe( '50vw' );
	} );

	it( 'uses MoneyProvider for product and box prices', () => {
		render(
			<components.MoneyProvider
				settings={ {
					symbol: '€',
					position: 'right_space',
					decimals: 2,
					decimalSeparator: ',',
					thousandSeparator: '.',
				} }
			>
				<components.BoxPanel
					size={ 1 }
					items={ [ item ] }
					subtotal={ 450 }
					total={ 405 }
				/>
			</components.MoneyProvider>
		);
		expect( screen.getByText( '4,50 €' ) ).toBeTruthy();
		expect( screen.getByText( '4,05 €' ) ).toBeTruthy();
	} );

	it( 'renders stock and fullness states', () => {
		const { rerender } = render(
			<components.ProductTile name="Cookie" price={ 450 } stock={ 0 } />
		);
		expect(
			screen.getByRole( 'button', { name: 'Sold out' } ).disabled
		).toBe( true );
		rerender(
			<components.ProductTile name="Cookie" price={ 450 } boxFull />
		);
		expect(
			screen.getByRole( 'button', { name: 'Box is full' } ).disabled
		).toBe( true );
	} );

	it( 'selects and deselects table rows', () => {
		render( <components.DataTable { ...samples.DataTable } /> );
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select all' } )
		);
		expect( screen.getByText( '1 selected' ) ).toBeTruthy();
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select row 1' } )
		);
		expect( screen.queryByText( '1 selected' ) ).toBeNull();
	} );

	it( 'updates chart details from the keyboard', () => {
		render( <components.LineChart { ...samples.LineChart } /> );
		const chart = screen.getByRole( 'img', { name: 'Line chart' } );
		fireEvent.keyDown( chart, { key: 'ArrowLeft' } );
		expect(
			document.querySelector( '.mmbb-chart__tip-title' ).textContent
		).toBe( 'Oct 2' );
		fireEvent.keyDown( chart, { key: 'ArrowLeft' } );
		expect(
			document.querySelector( '.mmbb-chart__tip-title' ).textContent
		).toBe( 'Oct 1' );
		fireEvent.keyDown( chart, { key: 'Escape' } );
		expect( document.querySelector( '.mmbb-chart__tip' ) ).toBeNull();
	} );
} );
