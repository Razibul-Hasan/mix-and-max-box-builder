/**
 * The messages between the box editor and its storefront preview iframe.
 *
 * Admin → iframe: { type: 'mmbb:preview:config', boxId, config, payload }
 * Iframe → admin: { type: 'mmbb:preview:ready' } and { type: 'mmbb:preview:height', height }
 *
 * Both sides read messages only through acceptMessage(), which drops anything
 * from another origin or window, and anything that is not ours.
 */

export const PREVIEW_CONFIG = 'mmbb:preview:config';
export const PREVIEW_READY = 'mmbb:preview:ready';
export const PREVIEW_HEIGHT = 'mmbb:preview:height';

const TYPES = [ PREVIEW_CONFIG, PREVIEW_READY, PREVIEW_HEIGHT ];

/**
 * The origin of an address, or '' when it can't be read.
 *
 * @param {string} url  Absolute address.
 * @param {string} base Base for relative addresses.
 * @return {string} Origin such as https://shop.test.
 */
export function originOf( url, base ) {
	try {
		return new URL( url, base ).origin;
	} catch ( e ) {
		return '';
	}
}

/**
 * Read one of our messages, or null.
 *
 * @param {MessageEvent} event          The message event.
 * @param {string}       expectedOrigin Only this origin is trusted.
 * @param {Object}       [source]       When given, only messages from this window.
 * @return {Object|null} The message data.
 */
export function acceptMessage( event, expectedOrigin, source ) {
	if ( ! event || ! expectedOrigin || event.origin !== expectedOrigin ) {
		return null;
	}
	if ( source && event.source !== source ) {
		return null;
	}
	const data = event.data;
	if ( ! data || typeof data !== 'object' || ! TYPES.includes( data.type ) ) {
		return null;
	}
	return data;
}

/**
 * The message that hands the iframe a new draft.
 *
 * @param {number} boxId   Box id.
 * @param {Object} payload Storefront payload built from the draft.
 * @return {Object} Message.
 */
export function configMessage( boxId, payload ) {
	return {
		type: PREVIEW_CONFIG,
		boxId: Number( boxId ),
		config: payload.config,
		payload,
	};
}
