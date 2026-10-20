import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

const BASE = '/mmbb/v1';

/**
 * Campaigns shoppers can be shown now or soon: active, ending soon and scheduled.
 *
 * @return {Promise<Array>} Campaigns, each with `id`, `title`, `status` and `type`.
 */
export async function getPlaceableCampaigns() {
	const result = await apiFetch( {
		path: addQueryArgs( BASE + '/campaigns', {
			status: 'all',
			per_page: 50,
			orderby: 'title',
			order: 'asc',
		} ),
	} );
	return ( result.items || [] ).filter( ( campaign ) =>
		[ 'active', 'ending_soon', 'scheduled' ].includes( campaign.status )
	);
}

/**
 * The storefront payload for one campaign, as the builder reads it.
 *
 * @param {number} id Campaign id.
 * @return {Promise<Object>} Payload.
 */
export function getPreview( id ) {
	return apiFetch( { path: `${ BASE }/campaigns/${ id }/preview` } );
}
