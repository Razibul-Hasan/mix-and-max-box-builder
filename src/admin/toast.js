import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { Toast } from '../components';

const ToastContext = createContext( () => {} );

const HIDE_AFTER = 3000;

// One toast at a time, bottom centre, gone after about three seconds.
export function ToastProvider( { children } ) {
	const [ toast, setToast ] = useState( null );
	const show = useCallback( ( message, options = {} ) => {
		setToast( { message, key: Date.now(), ...options } );
	}, [] );
	const hide = useCallback( () => setToast( null ), [] );

	useEffect( () => {
		if ( ! toast ) {
			return;
		}
		const timer = setTimeout( hide, HIDE_AFTER );
		return () => clearTimeout( timer );
	}, [ toast, hide ] );

	const value = useMemo( () => show, [ show ] );
	return (
		<ToastContext.Provider value={ value }>
			{ children }
			<div className="mmbb-admin-toasts">
				{ toast ? (
					<Toast
						key={ toast.key }
						action={ toast.action }
						onAction={ toast.onAction }
						onDismiss={ hide }
					>
						{ toast.message }
					</Toast>
				) : null }
			</div>
		</ToastContext.Provider>
	);
}

export function useToast() {
	return useContext( ToastContext );
}
