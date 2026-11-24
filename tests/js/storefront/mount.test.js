/**
 * The storefront entry: it mounts each builder once, mounts builders added later,
 * and leaves the server HTML alone when React has no createRoot (Divi's React 16).
 */
import { act } from '@testing-library/react';

jest.mock( '../../../src/storefront/Builder', () => ( {
	__esModule: true,
	default: ( { payload } ) =>
		jest
			.requireActual( 'react' )
			.createElement( 'p', null, 'Mounted ' + payload.title ),
} ) );
jest.mock( '../../../src/storefront/PreviewHost', () => ( {
	__esModule: true,
	default: () =>
		jest.requireActual( 'react' ).createElement( 'p', null, 'Preview' ),
} ) );

let mockCreateRoot;
jest.mock( '@wordpress/element', () => {
	const actual = jest.requireActual( '@wordpress/element' );
	return {
		...actual,
		get createRoot() {
			return mockCreateRoot;
		},
	};
} );

const wrapper = ( id ) => {
	const el = document.createElement( 'div' );
	el.className = 'mmbb-root mmbb-builder';
	el.dataset.mmbbId = id;
	el.innerHTML = '<h2 class="mmbb-builder__title">Server title</h2>';
	return el;
};

// Load the entry fresh, as a page load would.
const load = () => {
	jest.isolateModules( () => {
		require( '../../../src/storefront/index' );
	} );
};

// Let MutationObserver callbacks and React renders run.
const settle = () =>
	act( async () => {
		await Promise.resolve();
	} );

describe( 'storefront mount', () => {
	let warn;

	beforeEach( () => {
		document.body.innerHTML = '';
		window.mmbbBuilders = {};
		delete window.mmbbPreview;
		delete window.mmbbMount;
		mockCreateRoot = jest.requireActual( '@wordpress/element' ).createRoot;
		warn = jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
	} );

	afterEach( () => {
		warn.mockRestore();
	} );

	it( 'leaves the server HTML and warns once when createRoot is missing', async () => {
		mockCreateRoot = undefined;
		window.mmbbBuilders[ 'mmbb-1' ] = { id: 1, title: 'Box' };
		const first = wrapper( 'mmbb-1' );
		document.body.appendChild( first );

		expect( load ).not.toThrow();
		expect( () => window.mmbbMount() ).not.toThrow();
		expect( () => window.mmbbMount( first ) ).not.toThrow();
		await settle();

		expect( first.innerHTML ).toContain( 'Server title' );
		expect( first.dataset.mmbbMounted ).toBeUndefined();
		expect( warn ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'mounts builders on the page, and ones added later whose payload exists', async () => {
		window.mmbbBuilders[ 'mmbb-1' ] = { id: 1, title: 'First' };
		const first = wrapper( 'mmbb-1' );
		document.body.appendChild( first );

		await act( async () => {
			load();
		} );
		expect( typeof window.mmbbMount ).toBe( 'function' );
		expect( first.textContent ).toBe( 'Mounted First' );
		expect( first.dataset.mmbbMounted ).toBe( '1' );

		// Added later, inside another element, with its payload already there.
		window.mmbbBuilders[ 'mmbb-2' ] = { id: 2, title: 'Second' };
		const holder = document.createElement( 'section' );
		const second = wrapper( 'mmbb-2' );
		holder.appendChild( second );
		await act( async () => {
			document.body.appendChild( holder );
		} );
		await settle();
		expect( second.textContent ).toBe( 'Mounted Second' );

		// Added later without a payload: left as it is.
		const orphan = wrapper( 'mmbb-3' );
		await act( async () => {
			document.body.appendChild( orphan );
		} );
		await settle();
		expect( orphan.textContent ).toBe( 'Server title' );
		expect( orphan.dataset.mmbbMounted ).toBeUndefined();

		// Its payload arrives later; mmbbMount() picks it up, and mounts nothing twice.
		window.mmbbBuilders[ 'mmbb-3' ] = { id: 3, title: 'Third' };
		await act( async () => {
			window.mmbbMount();
		} );
		expect( orphan.textContent ).toBe( 'Mounted Third' );
		expect( first.textContent ).toBe( 'Mounted First' );
		expect( warn ).not.toHaveBeenCalled();
	} );
} );
