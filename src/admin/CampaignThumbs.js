import { useEffect, useState } from '@wordpress/element';
import { Icon } from '../components';
import Media from '../components/Media';
import { getProducts } from './api';

const ART = [
	'cookie',
	'macaron',
	'donut',
	'chocolate',
	'soap',
	'candle',
	'honey',
	'tea',
];
const SHOWN = 3;

/**
 * Product images for the first few products of each campaign on the page. A failed
 * request only means the placeholders stay.
 *
 * @param {Object[]} campaigns Campaigns from the REST API.
 * @return {Object} Product id => image object.
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
	const key = ids.join( ',' );

	useEffect( () => {
		if ( ids.length === 0 ) {
			return;
		}
		let cancelled = false;
		getProducts( { include: ids, per_page: 50 } )
			.then( ( products ) => {
				if ( cancelled ) {
					return;
				}
				const next = {};
				products.forEach( ( p ) => {
					if ( p.image ) {
						next[ p.id ] = { ...p.image, name: p.name };
					}
				} );
				setImages( next );
			} )
			.catch( () => {} );
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ key ] );

	return images;
}

// Overlapping 36px tiles, like the design. With no products picked yet, one neutral tile.
export default function CampaignThumbs( { campaign, images = {} } ) {
	const products = campaign.config.products || {};
	const ids = ( products.ids || [] ).slice( 0, SHOWN );
	const tiles = [];

	if ( ids.length === 0 && products.source === 'manual' ) {
		return (
			<span className="mmbb-thumbs" aria-hidden="true">
				<span className="mmbb-thumb mmbb-thumb--empty">
					<Icon name="image" size={ 18 } />
				</span>
			</span>
		);
	}

	const count = ids.length || SHOWN;
	for ( let i = 0; i < count; i++ ) {
		const art = ART[ ( campaign.id + i ) % ART.length ];
		tiles.push(
			<span className="mmbb-thumb" key={ i }>
				<Media image={ images[ ids[ i ] ] } art={ art } name="" />
			</span>
		);
	}
	return (
		<span className="mmbb-thumbs" aria-hidden="true">
			{ tiles }
		</span>
	);
}
