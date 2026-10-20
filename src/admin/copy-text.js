/**
 * Copy text with the Clipboard API.
 *
 * @param {string} text Text to copy.
 * @return {Promise<boolean>} Whether the copy worked.
 */
export function copyText( text ) {
	if (
		! window.navigator.clipboard ||
		! window.navigator.clipboard.writeText
	) {
		return Promise.resolve( false );
	}
	return window.navigator.clipboard
		.writeText( text )
		.then( () => true )
		.catch( () => false );
}
