import { createContext, useContext } from '@wordpress/element';

const DEFAULTS = {
	page: 'dashboard',
	urls: {},
	templates: [],
	money: {},
	adminUrl: '',
	storeUrl: '/',
	version: '',
	wcVersion: '',
	timezone: 'UTC',
	locale: 'en-US',
};

// PHP prints window.mmbbAdmin; fill gaps so a missing key never throws.
export function readAdminData() {
	return { ...DEFAULTS, ...( window.mmbbAdmin || {} ) };
}

export const AdminContext = createContext( DEFAULTS );

export function useAdmin() {
	return useContext( AdminContext );
}
