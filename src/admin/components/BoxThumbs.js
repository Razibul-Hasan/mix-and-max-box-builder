/**
 * Product thumbnails for a box: one 40px tile, or an overlapping stack of up to
 * `max`. Products without an image, or a box with no products yet, show a
 * neutral tile. Decorative: the box name next to it carries the meaning.
 *
 * @param {Object}   props
 * @param {number[]} props.ids    Product ids in the box, in order.
 * @param {Object}   props.images Product id => { src, srcset, sizes }.
 * @param {number}   props.max    Most tiles to show.
 */
export default function BoxThumbs( { ids = [], images = {}, max = 3 } ) {
	const shown = ids.slice( 0, max );
	const tiles = shown.length ? shown : [ 0 ];
	return (
		<span
			className={
				'mmbb-app-thumbs' + ( tiles.length > 1 ? ' is-stack' : '' )
			}
			aria-hidden="true"
		>
			{ tiles.map( ( id, index ) => {
				const image = images[ id ];
				return image && image.src ? (
					<img
						key={ id + '-' + index }
						className="mmbb-app-thumb"
						src={ image.src }
						srcSet={ image.srcset }
						sizes="40px"
						alt=""
						loading="lazy"
					/>
				) : (
					<span
						key={ id + '-' + index }
						className="mmbb-app-thumb is-empty"
					/>
				);
			} ) }
		</span>
	);
}
