import { createRoot } from '@wordpress/element';
import App from './App';
import './admin.css';
import './components/app.css';
import './components/screens.css';
import './editor/editor.css';
import './editor/shell.css';

const mount = document.getElementById( 'mmbb-admin' );
if ( mount ) {
	createRoot( mount ).render( <App page={ mount.dataset.page } /> );
}
