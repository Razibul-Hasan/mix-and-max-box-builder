/**
 * The pricing engine. Mirrors includes/class-pricing.php exactly: change one,
 * change the other, and run tests/fixtures/pricing-cases.json through both.
 *
 * All amounts in and out are integer minor units. Config amounts (fixed
 * discounts, box prices, fees) are store-currency numbers converted with the
 * `decimals` option.
 */

/**
 * Convert a store-currency number to minor units, rounding half up.
 *
 * @param {number} amount   Amount such as 4.5.
 * @param {number} decimals Currency decimals.
 * @return {number} Minor units.
 */
export function toMinor( amount, decimals ) {
	return Math.max(
		0,
		Math.floor( Number( amount ) * Math.pow( 10, decimals ) + 0.5 )
	);
}

function discountFor( type, value, subtotal, decimals ) {
	let discount;
	if ( type === 'percent' ) {
		discount = Math.floor( ( subtotal * Number( value ) ) / 100 + 0.5 );
	} else if ( type === 'fixed_amount' ) {
		discount = toMinor( value, decimals );
	} else {
		discount = subtotal - toMinor( value, decimals );
	}
	return Math.max( 0, Math.min( discount, subtotal ) );
}

function findTier( tiers, count ) {
	let found = null;
	for ( const tier of tiers ) {
		if ( tier.qty <= count && ( ! found || tier.qty > found.qty ) ) {
			found = tier;
		}
	}
	return found;
}

function findNext( tiers, count ) {
	let found = null;
	for ( const tier of tiers ) {
		if ( tier.qty > count && ( ! found || tier.qty < found.qty ) ) {
			found = tier;
		}
	}
	if ( ! found ) {
		return null;
	}
	return {
		qty: found.qty,
		needed: found.qty - count,
		discount_type: found.discount_type,
		value: found.value,
	};
}

function pick( tier ) {
	return {
		qty: tier.qty,
		discount_type: tier.discount_type,
		value: tier.value,
	};
}

/**
 * Price a box.
 *
 * @param {Object} config  Campaign config.
 * @param {Array}  items   Items: { product_id, variation_id, qty, unit_price_minor }.
 * @param {Object} options { size, gift_wrap, decimals }.
 * @return {Object} { valid, errors, count, subtotal, discount, fee, total, tier, next }.
 */
export function quote( config, items, options = {} ) {
	const decimals =
		options.decimals === undefined || options.decimals === null
			? 2
			: Math.max( 0, Math.trunc( options.decimals ) );
	const type = config.type || 'tiered';

	let count = 0;
	let subtotal = 0;
	for ( const item of items ) {
		const qty = Math.trunc( item.qty || 0 );
		if ( qty < 1 ) {
			continue;
		}
		const unit = Math.max( 0, Math.trunc( item.unit_price_minor || 0 ) );
		count += qty;
		subtotal += qty * unit;
	}

	const errors = [];
	let tier = null;
	let next = null;

	if ( type === 'fixed' ) {
		const size = Math.trunc( options.size || 0 );
		tier =
			( config.sizes || [] ).find(
				( candidate ) => Math.trunc( candidate.qty ) === size
			) || null;
		if ( ! tier ) {
			errors.push( 'invalid_size' );
		} else if ( Math.trunc( tier.qty ) !== count ) {
			errors.push( 'wrong_count' );
			tier = null;
		}
	} else if ( type === 'bundle' ) {
		const bundle = config.bundle || {};
		const qty = Math.trunc( bundle.qty || 0 );
		if ( count !== qty ) {
			errors.push( 'wrong_count' );
		} else {
			tier = {
				qty,
				discount_type: 'box_price',
				value: bundle.price || 0,
			};
		}
	} else {
		const box = config.box || {};
		const capacity = box.capacity === undefined ? 12 : box.capacity;
		const minimum = box.min_items === undefined ? 1 : box.min_items;
		const tiers = config.tiers || [];
		if ( count === 0 ) {
			errors.push( 'empty' );
		} else if ( count < minimum ) {
			errors.push( 'below_minimum' );
		} else if ( count > capacity ) {
			errors.push( 'over_capacity' );
		}
		if ( count <= capacity ) {
			next = findNext( tiers, count );
		}
		if ( errors.length === 0 ) {
			tier = findTier( tiers, count );
		}
	}

	const valid = errors.length === 0;
	let discount = 0;
	let fee = 0;
	if ( valid ) {
		if ( tier ) {
			discount = discountFor(
				tier.discount_type,
				tier.value,
				subtotal,
				decimals
			);
		}
		const wrap = ( config.extras && config.extras.gift_wrap ) || {};
		if ( options.gift_wrap && wrap.enabled ) {
			fee = toMinor( wrap.fee || 0, decimals );
		}
	}

	return {
		valid,
		errors,
		count,
		subtotal,
		discount,
		fee,
		total: subtotal - discount + fee,
		tier: valid && tier ? pick( tier ) : null,
		next,
	};
}
