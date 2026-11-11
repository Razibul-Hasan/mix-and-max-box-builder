import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { dispatch } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import {
	AppShell,
	DataTable,
	EmptyState,
	Notices,
	NOTICE_CONTEXT,
	PageHeader,
	StatCard,
	StatusBadge,
} from '../../../src/admin/components';
import * as wp from '../../../src/admin/components/wp';
import Shell from '../../../src/admin/Shell';
import { AdminContext } from '../../../src/admin/context';

describe( 'wp.js', () => {
	it( 'gives every experimental component a stable name', () => {
		[
			'ToggleGroupControl',
			'ToggleGroupControlOption',
			'NumberControl',
			'BoxControl',
			'ItemGroup',
			'Item',
			'HStack',
			'VStack',
		].forEach( ( name ) => expect( wp[ name ] ).toBeTruthy() );
	} );
} );

describe( 'AppShell', () => {
	const nav = [
		{ id: 'dashboard', label: 'Home', href: 'admin.php?page=mmbb' },
		{
			id: 'campaigns',
			label: 'Boxes',
			href: 'admin.php?page=mmbb-campaigns',
		},
	];

	it( 'renders real links and marks the current page', () => {
		render(
			<AppShell
				active="campaigns"
				nav={ nav }
				helpUrl="https://example.org/help"
			>
				<p>Body</p>
			</AppShell>
		);
		const bar = screen.getByRole( 'navigation', { name: 'ProductBoxes' } );
		const boxes = within( bar ).getByRole( 'link', { name: 'Boxes' } );
		expect( boxes.getAttribute( 'href' ) ).toBe(
			'admin.php?page=mmbb-campaigns'
		);
		expect( boxes.getAttribute( 'aria-current' ) ).toBe( 'page' );
		expect(
			within( bar )
				.getByRole( 'link', { name: 'Home' } )
				.getAttribute( 'aria-current' )
		).toBeNull();
		expect(
			screen.getByRole( 'link', { name: 'Help' } ).getAttribute( 'href' )
		).toBe( 'https://example.org/help' );
		expect( screen.getByRole( 'main' ).textContent ).toBe( 'Body' );
	} );
} );

describe( 'Shell', () => {
	it( 'links to the frozen page slugs', () => {
		const urls = {
			dashboard: 'admin.php?page=mmbb',
			campaigns: 'admin.php?page=mmbb-campaigns',
			analytics: 'admin.php?page=mmbb-analytics',
			settings: 'admin.php?page=mmbb-settings',
		};
		render(
			<AdminContext.Provider value={ { urls, storeUrl: '/' } }>
				<Shell active="analytics" viewStore />
			</AdminContext.Provider>
		);
		const bar = screen.getByRole( 'navigation', { name: 'ProductBoxes' } );
		const links = within( bar ).getAllByRole( 'link' );
		expect( links.map( ( a ) => a.textContent ) ).toEqual( [
			'Home',
			'Boxes',
			'Analytics',
			'Settings',
		] );
		expect( links.map( ( a ) => a.getAttribute( 'href' ) ) ).toEqual(
			Object.values( urls )
		);
		expect(
			screen.getByRole( 'link', { name: /View store/ } )
		).toBeTruthy();
	} );
} );

describe( 'PageHeader, StatCard, EmptyState', () => {
	it( 'renders title, description and actions', () => {
		render(
			<PageHeader
				title="Home"
				description="How your boxes did."
				actions={ <button type="button">Create box</button> }
			/>
		);
		expect(
			screen.getByRole( 'heading', { level: 1, name: 'Home' } )
		).toBeTruthy();
		expect( screen.getByText( 'How your boxes did.' ) ).toBeTruthy();
		expect(
			screen.getByRole( 'button', { name: 'Create box' } )
		).toBeTruthy();
	} );

	it( 'renders a stat with its change', () => {
		const { container } = render(
			<StatCard
				label="Boxes sold"
				value="12"
				delta="+3"
				tone="negative"
			/>
		);
		expect( screen.getByText( 'Boxes sold' ) ).toBeTruthy();
		expect( screen.getByText( '12' ) ).toBeTruthy();
		expect( container.querySelector( '.is-negative' ).textContent ).toBe(
			'+3'
		);
	} );

	it( 'renders an empty state', () => {
		render(
			<EmptyState
				title="No boxes yet"
				actions={ <a href="#new">Create box</a> }
			>
				Make your first box.
			</EmptyState>
		);
		expect(
			screen.getByRole( 'heading', { name: 'No boxes yet' } )
		).toBeTruthy();
		expect( screen.getByText( 'Make your first box.' ) ).toBeTruthy();
	} );
} );

describe( 'StatusBadge', () => {
	it.each( [
		[ 'active', 'Live', 'is-success' ],
		[ 'draft', 'Draft', 'is-neutral' ],
		[ 'scheduled', 'Scheduled', 'is-info' ],
		[ 'ending_soon', 'Ending soon', 'is-warning' ],
		[ 'paused', 'Paused', 'is-warning' ],
		[ 'ended', 'Ended', 'is-neutral' ],
	] )( 'pairs %s with a word and a tone', ( status, word, tone ) => {
		const { container } = render( <StatusBadge status={ status } /> );
		expect( container.textContent ).toBe( word );
		expect( container.firstChild.classList.contains( tone ) ).toBe( true );
	} );
} );

describe( 'DataTable', () => {
	const columns = [
		{ key: 'title', label: 'Box', sortable: true },
		{ key: 'sold', label: 'Sold', sortable: true, numeric: true },
	];
	const rows = [
		{ id: 1, title: 'Tee trio', sold: 3 },
		{ id: 2, title: 'Holiday treat box', sold: 10 },
		{ id: 3, title: 'Summer mix', sold: 1 },
	];
	it( 'sorts by a column, then reverses', () => {
		render(
			<DataTable columns={ columns } rows={ rows } caption="Boxes" />
		);
		const sold = screen.getByRole( 'button', { name: /Sold/ } );
		fireEvent.click( sold );
		expect(
			screen
				.getByRole( 'columnheader', { name: /Sold/ } )
				.getAttribute( 'aria-sort' )
		).toBe( 'ascending' );
		const order = () =>
			screen
				.getAllByRole( 'row' )
				.slice( 1 )
				.map( ( r ) => r.firstChild.textContent );
		expect( order() ).toEqual( [
			'Summer mix',
			'Tee trio',
			'Holiday treat box',
		] );
		fireEvent.click( sold );
		expect( order() ).toEqual( [
			'Holiday treat box',
			'Tee trio',
			'Summer mix',
		] );
	} );

	it( 'lets the caller own the sort', () => {
		const onSort = jest.fn();
		render(
			<DataTable
				columns={ columns }
				rows={ rows }
				sort={ { key: 'title', direction: 'asc' } }
				onSort={ onSort }
			/>
		);
		fireEvent.click( screen.getByRole( 'button', { name: /Box/ } ) );
		expect( onSort ).toHaveBeenCalledWith( {
			key: 'title',
			direction: 'desc',
		} );
	} );

	it( 'selects one row and all rows', () => {
		const onSelect = jest.fn();
		const { rerender } = render(
			<DataTable
				columns={ columns }
				rows={ rows }
				selected={ [] }
				onSelect={ onSelect }
				rowLabel={ ( row ) => row.title }
			/>
		);
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select Tee trio' } )
		);
		expect( onSelect ).toHaveBeenLastCalledWith( [ 1 ] );
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select all rows' } )
		);
		expect( onSelect ).toHaveBeenLastCalledWith( [ 1, 2, 3 ] );

		rerender(
			<DataTable
				columns={ columns }
				rows={ rows }
				selected={ [ 1, 2, 3 ] }
				onSelect={ onSelect }
				rowLabel={ ( row ) => row.title }
			/>
		);
		fireEvent.click(
			screen.getByRole( 'checkbox', { name: 'Select all rows' } )
		);
		expect( onSelect ).toHaveBeenLastCalledWith( [] );
	} );

	it( 'says so when there are no rows', () => {
		render(
			<DataTable
				columns={ columns }
				rows={ [] }
				emptyMessage="No boxes yet."
			/>
		);
		expect( screen.getByText( 'No boxes yet.' ) ).toBeTruthy();
	} );
} );

describe( 'Notices', () => {
	it( 'shows our snackbars and nobody else’s', () => {
		const { container } = render( <Notices /> );
		act( () => {
			dispatch( noticesStore ).createSuccessNotice( 'Saved', {
				type: 'snackbar',
				context: NOTICE_CONTEXT,
			} );
			dispatch( noticesStore ).createSuccessNotice( 'Not ours', {
				type: 'snackbar',
			} );
		} );
		// The a11y live region repeats the text, so look inside the list only.
		const list = container.querySelector( '.mmbb-app__snackbars' );
		expect( list.textContent ).toContain( 'Saved' );
		expect( list.textContent ).not.toContain( 'Not ours' );
	} );
} );
