import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { addQueryArgs } from '@wordpress/url';
import { getProducts } from './api';

const SHOWN = 3;

/**
 * Thumbnails for the campaigns on the page: the first few product images, plus the
 * box image when a campaign has one. A failed request only means the placeholders stay.
 *
 * @param {Object[]} campaigns Campaigns from the REST API.
 * @return {Object} Product id => image object, and `box-<attachment id>` => image object.
 */
export function useProductImages( campaigns ) {
	const [ images, setImages ] = useState( {} );
	const ids = [
		...new Set(
			campaigns.flatMap( ( c ) =>
				( ( c.config.products && c.config.products.ids ) || [] ).slice(
					0,
					SHOWN
				)
			)
		),
	];
	const boxIds = [
		...new Set(
			campaigns
				.map( ( c ) => Number( c.config.image_id ) || 0 )
				.filter( Boolean )
		),
	];
	const key = ids.join( ',' ) + '|' + boxIds.join( ',' );

	useEffect( () => {
		if ( ids.length === 0 && boxIds.length === 0 ) {
			return;
		}
		let cancelled = false;
		const products = ids.length
			? getProducts( { include: ids, per_page: 50 } ).catch( () => [] )
			: Promise.resolve( [] );
		const media = boxIds.length
			? apiFetch( {
					path: addQueryArgs( '/wp/v2/media', {
						include: boxIds.join( ',' ),
						per_page: 100,
						_fields: 'id,source_url,media_details.sizes',
					} ),
			  } ).catch( () => [] )
			: Promise.resolve( [] );
		Promise.all( [ products, media ] ).then( ( [ prods, files ] ) => {
			if ( cancelled ) {
				return;
			}
			const next = {};
			prods.forEach( ( p ) => {
				if ( p.image ) {
					next[ p.id ] = { ...p.image, name: p.name };
				}
			} );
			files.forEach( ( m ) => {
				const src =
					m.media_details?.sizes?.thumbnail?.source_url ||
					m.source_url;
				if ( src ) {
					next[ 'box-' + m.id ] = { src };
				}
			} );
			setImages( next );
		} );
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ key ] );

	return images;
}
