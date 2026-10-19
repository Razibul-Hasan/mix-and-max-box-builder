import ProductArt from './ProductArt';

// Preserve URL props while accepting WooCommerce responsive image metadata.
export default function Media( { image, art, name } ) {
	const data = typeof image === 'string' ? { src: image } : image;
	return data?.src ? (
		<img
			src={ data.src }
			srcSet={ data.srcset }
			sizes={ data.sizes }
			alt={ name || '' }
			loading="lazy"
		/>
	) : (
		<ProductArt kind={ art } />
	);
}
