import { __ } from '@wordpress/i18n';
import { MoneyProvider } from '../components';
import Campaigns from './campaigns/Campaigns';
import Analytics from './analytics/Analytics';
import ComingSoon from './ComingSoon';
import { AdminContext, readAdminData } from './context';
import Dashboard from './dashboard/Dashboard';
import Editor from './editor/Editor';
import { ToastProvider } from './toast';

/**
 * Choose the screen from the page id and the query args. Every screen has its own
 * admin.php address, so the browser's back button and WordPress's menu both work.
 *
 * @param {string}          page   Page id from data-page.
 * @param {URLSearchParams} params Query args of the current address.
 * @return {string} Screen name.
 */
export function pickScreen( page, params ) {
	if ( page === 'campaigns' ) {
		if ( params.get( 'action' ) === 'edit' && params.get( 'id' ) ) {
			return 'editor';
		}
		return params.get( 'action' ) === 'new' ? 'campaigns-new' : 'campaigns';
	}
	if ( page === 'analytics' || page === 'settings' ) {
		return page;
	}
	return 'dashboard';
}

function Screen( { name, id } ) {
	switch ( name ) {
		case 'editor':
			return <Editor id={ id } />;
		case 'campaigns':
			return <Campaigns />;
		case 'campaigns-new':
			return <Campaigns openPicker />;
		case 'analytics':
			return <Analytics />;
		case 'settings':
			return (
				<ComingSoon
					active="settings"
					title={ __( 'Settings', 'mix-and-max-box-builder' ) }
					headline={ __(
						'Settings are on their way',
						'mix-and-max-box-builder'
					) }
				/>
			);
		default:
			return <Dashboard />;
	}
}

export default function App( { page } ) {
	const data = readAdminData();
	const params = new URLSearchParams( window.location.search );
	return (
		<AdminContext.Provider value={ data }>
			<MoneyProvider settings={ data.money }>
				<ToastProvider>
					<Screen
						name={ pickScreen( page || data.page, params ) }
						id={ Number( params.get( 'id' ) ) }
					/>
				</ToastProvider>
			</MoneyProvider>
		</AdminContext.Provider>
	);
}
