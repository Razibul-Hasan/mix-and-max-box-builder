import { SnackbarList } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useCallback } from '@wordpress/element';
import { store as noticesStore } from '@wordpress/notices';

/**
 * Notices store context for our screens, so our snackbars never mix with
 * anyone else's.
 */
export const NOTICE_CONTEXT = 'mmbb-admin';

/**
 * Snackbars ("Saved", "Box deleted") from the `core/notices` store, bottom left
 * like the block editor. Mounted once by the admin app.
 */
export default function Notices() {
	const notices = useSelect(
		( select ) => select( noticesStore ).getNotices( NOTICE_CONTEXT ),
		[]
	);
	const { removeNotice } = useDispatch( noticesStore );
	const snackbars = notices.filter( ( n ) => n.type === 'snackbar' );
	return (
		<SnackbarList
			className="mmbb-app__snackbars"
			notices={ snackbars }
			onRemove={ ( id ) => removeNotice( id, NOTICE_CONTEXT ) }
		/>
	);
}

/**
 * Show a snackbar: `const snackbar = useSnackbar(); snackbar( __( 'Saved' ) );`
 *
 * @return {Function} ( message, options ) => void. Options are passed to the
 *                    notices store, e.g. { actions: [ { label, onClick } ] }.
 */
export function useSnackbar() {
	const { createSuccessNotice } = useDispatch( noticesStore );
	return useCallback(
		( message, options = {} ) =>
			createSuccessNotice( message, {
				type: 'snackbar',
				context: NOTICE_CONTEXT,
				...options,
			} ),
		[ createSuccessNotice ]
	);
}
