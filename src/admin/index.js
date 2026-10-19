import { createRoot } from '@wordpress/element';
import App from './App';
import './admin.css';

const mount = document.getElementById( 'mmbb-admin' );
if ( mount ) {
	createRoot( mount ).render( <App page={ mount.dataset.page } /> );
}
