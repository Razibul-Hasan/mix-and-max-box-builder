/**
 * Go to another admin address. One function, so tests can stand in for it
 * (jsdom cannot navigate).
 *
 * @param {string} url Address to open.
 */
export function navigate( url ) {
	window.location.assign( url );
}
