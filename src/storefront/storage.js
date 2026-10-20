const key = ( campaignId ) => `mmbb:box:${ campaignId }`;

/**
 * Read the box in progress. Storage can be blocked or empty, so every access is guarded.
 *
 * @param {number} campaignId Campaign id.
 * @return {Object|null} { items, size, gift } or null.
 */
export function loadBox( campaignId ) {
	try {
		const raw = window.sessionStorage.getItem( key( campaignId ) );
		const saved = raw ? JSON.parse( raw ) : null;
		return saved && typeof saved === 'object' ? saved : null;
	} catch ( error ) {
		return null;
	}
}

/**
 * Remember the box in progress. An empty box clears the entry.
 *
 * @param {number} campaignId Campaign id.
 * @param {Object} box        { items, size, gift }.
 */
export function saveBox( campaignId, box ) {
	try {
		if ( box.items.length === 0 ) {
			window.sessionStorage.removeItem( key( campaignId ) );
		} else {
			window.sessionStorage.setItem(
				key( campaignId ),
				JSON.stringify( box )
			);
		}
	} catch ( error ) {
		// Storage is only a convenience.
	}
}
