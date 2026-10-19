<?php
/**
 * The campaign config schema: defaults, sanitizing and validating. Pure PHP.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Campaigns;

defined( 'ABSPATH' ) || exit;

/**
 * One schema for sanitizing, validating and describing a campaign config.
 *
 * Money values (fixed amounts, box prices, fees) are store-currency numbers.
 */
final class Config {
	const TYPES          = array( 'tiered', 'fixed', 'bundle' );
	const DISCOUNT_TYPES = array( 'percent', 'fixed_amount', 'box_price' );
	const SIZE_TAGS      = array( '', 'popular', 'best_value' );
	const SOURCES        = array( 'manual', 'category', 'tag' );
	const ORDERS         = array( 'manual', 'bestselling', 'price', 'newest' );
	const LAYOUTS        = array( 'default', 'panel', 'bar', 'both' );
	const COLUMNS        = array( 0, 3, 4, 5 );
	const ACCENTS        = array( 'max', 'theme' );
	const THEMES         = array( 'light', 'dark' );

	const MAX_CAPACITY       = 48;
	const MAX_TIERS          = 6;
	const MAX_PERCENT        = 90;
	const MAX_PRODUCTS       = 200;
	const MAX_TERMS          = 50;
	const MAX_COUNTDOWN_DAYS = 30;

	/** Maximum lengths of the free-text fields. */
	const LENGTHS = array(
		'headline'  => 80,
		'intro'     => 240,
		'sticker'   => 24,
		'cta_label' => 32,
	);

	/**
	 * Default config for a blank campaign.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			'type'                 => 'tiered',
			'box'                  => array(
				'capacity'         => 12,
				'min_items'        => 1,
				'allow_duplicates' => true,
				'max_per_product'  => 12,
				'hide_sold_out'    => false,
			),
			'tiers'                => array(),
			'sizes'                => array(),
			'bundle'               => array(
				'qty'   => 3,
				'price' => 0,
			),
			'products'             => array(
				'source'   => 'manual',
				'ids'      => array(),
				'term_ids' => array(),
				'order'    => 'manual',
				'caps'     => array(),
			),
			'schedule'             => array(
				'start'          => null,
				'end'            => null,
				'countdown_days' => 0,
			),
			'extras'               => array(
				'gift_message' => false,
				'gift_wrap'    => array(
					'enabled' => false,
					'fee'     => 0,
				),
			),
			'design'               => array(
				'layout'        => 'default',
				'columns'       => 0,
				'headline'      => '',
				'intro'         => '',
				'sticker'       => '',
				'cta_label'     => '',
				'show_hero'     => true,
				'show_ladder'   => true,
				'show_stickers' => true,
				'accent'        => 'max',
				'theme'         => 'light',
			),
			'placement'            => array(
				'page_id' => 0,
			),
			'container_product_id' => 0,
		);
	}

	/**
	 * Sanitize raw input onto a base config. Always returns a complete, valid-shaped config.
	 *
	 * Keys missing from the input keep the base value, so a partial config can be
	 * merged for autosave. Lists (tiers, sizes, ids) are replaced as a whole.
	 *
	 * @param mixed      $input Raw input, usually decoded JSON.
	 * @param array|null $base  A sanitized config to merge onto. Defaults to defaults().
	 * @return array
	 */
	public static function sanitize( $input, $base = null ) {
		$defaults = self::defaults();
		// A supplied base (for example a stored config) is re-clamped against the defaults first.
		$base = null === $base ? $defaults : self::apply( $base, $defaults );
		return self::apply( $input, $base );
	}

	/**
	 * Apply input onto a trusted, complete base.
	 *
	 * @param mixed $input Raw input.
	 * @param array $base  Complete base config.
	 * @return array
	 */
	private static function apply( $input, array $base ) {
		$input = is_array( $input ) ? $input : array();
		$out   = $base;

		if ( isset( $input['type'] ) ) {
			$out['type'] = self::enum( $input['type'], self::TYPES, $base['type'] );
		}

		$out['box'] = self::sanitize_box( self::section( $input, 'box' ), $base['box'] );
		$capacity   = $out['box']['capacity'];

		if ( array_key_exists( 'tiers', $input ) ) {
			$out['tiers'] = self::sanitize_steps( $input['tiers'], $capacity, false );
		} else {
			$out['tiers'] = self::sanitize_steps( $base['tiers'], $capacity, false );
		}
		if ( array_key_exists( 'sizes', $input ) ) {
			$out['sizes'] = self::sanitize_steps( $input['sizes'], $capacity, true );
		} else {
			$out['sizes'] = self::sanitize_steps( $base['sizes'], $capacity, true );
		}

		$bundle        = self::section( $input, 'bundle' );
		$out['bundle'] = array(
			'qty'   => self::clamp_int( self::pick( $bundle, 'qty', $base['bundle']['qty'] ), 1, $capacity ),
			'price' => self::money( self::pick( $bundle, 'price', $base['bundle']['price'] ) ),
		);

		$out['products']  = self::sanitize_products( self::section( $input, 'products' ), $base['products'], $capacity );
		$out['schedule']  = self::sanitize_schedule( self::section( $input, 'schedule' ), $base['schedule'] );
		$out['extras']    = self::sanitize_extras( self::section( $input, 'extras' ), $base['extras'] );
		$out['design']    = self::sanitize_design( self::section( $input, 'design' ), $base['design'] );
		$placement        = self::section( $input, 'placement' );
		$out['placement'] = array(
			'page_id' => max( 0, (int) self::pick( $placement, 'page_id', $base['placement']['page_id'] ) ),
		);

		if ( isset( $input['container_product_id'] ) ) {
			$out['container_product_id'] = max( 0, (int) $input['container_product_id'] );
		}

		return $out;
	}

	/**
	 * Check a sanitized config is complete enough to go live.
	 *
	 * @param array $config Sanitized config.
	 * @return array[] List of { path, code }. Empty when valid.
	 */
	public static function validate( array $config ) {
		$errors = array();
		$add    = static function ( $path, $code ) use ( &$errors ) {
			$errors[] = array(
				'path' => $path,
				'code' => $code,
			);
		};

		$capacity = $config['box']['capacity'];
		if ( 'tiered' === $config['type'] ) {
			if ( empty( $config['tiers'] ) ) {
				$add( 'tiers', 'tiers_required' );
			}
			if ( $config['box']['min_items'] > $capacity ) {
				$add( 'box.min_items', 'min_over_capacity' );
			}
		} elseif ( 'fixed' === $config['type'] ) {
			if ( empty( $config['sizes'] ) ) {
				$add( 'sizes', 'sizes_required' );
			}
		} elseif ( $config['bundle']['price'] <= 0 ) {
			$add( 'bundle.price', 'price_required' );
		}

		$steps = 'fixed' === $config['type'] ? $config['sizes'] : $config['tiers'];
		$path  = 'fixed' === $config['type'] ? 'sizes' : 'tiers';
		if ( 'bundle' !== $config['type'] ) {
			$seen = 0;
			foreach ( $steps as $index => $step ) {
				if ( $step['qty'] <= $seen ) {
					$add( $path . '.' . $index . '.qty', 'qty_not_ascending' );
				}
				$seen = $step['qty'];
				if ( $step['qty'] > $capacity ) {
					$add( $path . '.' . $index . '.qty', 'qty_over_capacity' );
				}
				if ( 'percent' === $step['discount_type'] && $step['value'] > self::MAX_PERCENT ) {
					$add( $path . '.' . $index . '.value', 'percent_too_high' );
				}
			}
		}

		$products = $config['products'];
		if ( 'manual' === $products['source'] && empty( $products['ids'] ) ) {
			$add( 'products.ids', 'products_required' );
		} elseif ( 'manual' !== $products['source'] && empty( $products['term_ids'] ) ) {
			$add( 'products.term_ids', 'terms_required' );
		}

		$schedule = $config['schedule'];
		if ( null !== $schedule['start'] && null !== $schedule['end'] && $schedule['end'] <= $schedule['start'] ) {
			$add( 'schedule.end', 'end_before_start' );
		}

		return $errors;
	}

	/**
	 * Parse a stored ISO 8601 UTC string to a timestamp.
	 *
	 * @param string|null $value Normalized value from the config.
	 * @return int|null
	 */
	public static function timestamp( $value ) {
		if ( ! is_string( $value ) || '' === $value ) {
			return null;
		}
		try {
			$date = new \DateTimeImmutable( $value, new \DateTimeZone( 'UTC' ) );
		} catch ( \Exception $e ) {
			return null;
		}
		return $date->getTimestamp();
	}

	/**
	 * Sanitize the box rules.
	 *
	 * @param array $in   Input section.
	 * @param array $base Base section.
	 * @return array
	 */
	private static function sanitize_box( array $in, array $base ) {
		$capacity = self::clamp_int( self::pick( $in, 'capacity', $base['capacity'] ), 1, self::MAX_CAPACITY );
		return array(
			'capacity'         => $capacity,
			'min_items'        => self::clamp_int( self::pick( $in, 'min_items', $base['min_items'] ), 1, $capacity ),
			'allow_duplicates' => self::bool( self::pick( $in, 'allow_duplicates', $base['allow_duplicates'] ), $base['allow_duplicates'] ),
			'max_per_product'  => self::clamp_int( self::pick( $in, 'max_per_product', $base['max_per_product'] ), 1, $capacity ),
			'hide_sold_out'    => self::bool( self::pick( $in, 'hide_sold_out', $base['hide_sold_out'] ), $base['hide_sold_out'] ),
		);
	}

	/**
	 * Sanitize tiers or sizes: clamp, keep the first of each quantity, sort ascending.
	 *
	 * @param mixed $rows     Raw rows.
	 * @param int   $capacity Box capacity.
	 * @param bool  $sizes    True for fixed-box sizes (which carry a tag).
	 * @return array[]
	 */
	private static function sanitize_steps( $rows, $capacity, $sizes ) {
		$by_qty = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$qty = self::clamp_int( self::pick( $row, 'qty', 1 ), 1, $capacity );
			if ( isset( $by_qty[ $qty ] ) ) {
				continue;
			}
			$type = self::enum( self::pick( $row, 'discount_type', 'percent' ), self::DISCOUNT_TYPES, 'percent' );
			$step = array(
				'qty'           => $qty,
				'discount_type' => $type,
				'value'         => 'percent' === $type
					? self::clamp_float( self::pick( $row, 'value', 0 ), 0, self::MAX_PERCENT )
					: self::money( self::pick( $row, 'value', 0 ) ),
			);
			if ( $sizes ) {
				$step['tag'] = self::enum( self::pick( $row, 'tag', '' ), self::SIZE_TAGS, '' );
			}
			$by_qty[ $qty ] = $step;
		}
		ksort( $by_qty );
		return array_slice( array_values( $by_qty ), 0, self::MAX_TIERS );
	}

	/**
	 * Sanitize the product source.
	 *
	 * @param array $in       Input section.
	 * @param array $base     Base section.
	 * @param int   $capacity Box capacity.
	 * @return array
	 */
	private static function sanitize_products( array $in, array $base, $capacity ) {
		$caps = array();
		foreach ( self::pick( $in, 'caps', $base['caps'] ) as $id => $cap ) {
			$id = (int) $id;
			if ( $id > 0 && is_numeric( $cap ) ) {
				$caps[ $id ] = self::clamp_int( $cap, 1, $capacity );
			}
		}
		return array(
			'source'   => self::enum( self::pick( $in, 'source', $base['source'] ), self::SOURCES, $base['source'] ),
			'ids'      => self::id_list( self::pick( $in, 'ids', $base['ids'] ), self::MAX_PRODUCTS ),
			'term_ids' => self::id_list( self::pick( $in, 'term_ids', $base['term_ids'] ), self::MAX_TERMS ),
			'order'    => self::enum( self::pick( $in, 'order', $base['order'] ), self::ORDERS, $base['order'] ),
			'caps'     => array_slice( $caps, 0, self::MAX_PRODUCTS, true ),
		);
	}

	/**
	 * Sanitize the schedule. Dates are stored as UTC ISO 8601.
	 *
	 * @param array $in   Input section.
	 * @param array $base Base section.
	 * @return array
	 */
	private static function sanitize_schedule( array $in, array $base ) {
		return array(
			'start'          => array_key_exists( 'start', $in ) ? self::date( $in['start'] ) : $base['start'],
			'end'            => array_key_exists( 'end', $in ) ? self::date( $in['end'] ) : $base['end'],
			'countdown_days' => self::clamp_int( self::pick( $in, 'countdown_days', $base['countdown_days'] ), 0, self::MAX_COUNTDOWN_DAYS ),
		);
	}

	/**
	 * Sanitize the extras.
	 *
	 * @param array $in   Input section.
	 * @param array $base Base section.
	 * @return array
	 */
	private static function sanitize_extras( array $in, array $base ) {
		$wrap = self::section( $in, 'gift_wrap' );
		return array(
			'gift_message' => self::bool( self::pick( $in, 'gift_message', $base['gift_message'] ), $base['gift_message'] ),
			'gift_wrap'    => array(
				'enabled' => self::bool( self::pick( $wrap, 'enabled', $base['gift_wrap']['enabled'] ), $base['gift_wrap']['enabled'] ),
				'fee'     => self::money( self::pick( $wrap, 'fee', $base['gift_wrap']['fee'] ) ),
			),
		);
	}

	/**
	 * Sanitize the design options.
	 *
	 * @param array $in   Input section.
	 * @param array $base Base section.
	 * @return array
	 */
	private static function sanitize_design( array $in, array $base ) {
		$columns = (int) self::pick( $in, 'columns', $base['columns'] );
		$out     = array(
			'layout'  => self::enum( self::pick( $in, 'layout', $base['layout'] ), self::LAYOUTS, $base['layout'] ),
			'columns' => in_array( $columns, self::COLUMNS, true ) ? $columns : $base['columns'],
		);
		foreach ( self::LENGTHS as $key => $length ) {
			$out[ $key ] = self::text( self::pick( $in, $key, $base[ $key ] ), $length );
		}
		foreach ( array( 'show_hero', 'show_ladder', 'show_stickers' ) as $key ) {
			$out[ $key ] = self::bool( self::pick( $in, $key, $base[ $key ] ), $base[ $key ] );
		}
		$out['accent'] = self::enum( self::pick( $in, 'accent', $base['accent'] ), self::ACCENTS, $base['accent'] );
		$out['theme']  = self::enum( self::pick( $in, 'theme', $base['theme'] ), self::THEMES, $base['theme'] );
		return $out;
	}

	/**
	 * Get an array section of the input, or an empty array.
	 *
	 * @param array  $input Input.
	 * @param string $key   Section.
	 * @return array
	 */
	private static function section( array $input, $key ) {
		return isset( $input[ $key ] ) && is_array( $input[ $key ] ) ? $input[ $key ] : array();
	}

	/**
	 * Read a key or fall back.
	 *
	 * @param array  $source   Source.
	 * @param string $key      Key.
	 * @param mixed  $fallback Fallback.
	 * @return mixed
	 */
	private static function pick( array $source, $key, $fallback ) {
		return array_key_exists( $key, $source ) ? $source[ $key ] : $fallback;
	}

	/**
	 * Allow only listed values.
	 *
	 * @param mixed  $value    Raw value.
	 * @param array  $allowed  Allowed values.
	 * @param string $fallback Fallback.
	 * @return string
	 */
	private static function enum( $value, array $allowed, $fallback ) {
		return is_string( $value ) && in_array( $value, $allowed, true ) ? $value : $fallback;
	}

	/**
	 * Clamp to an integer range. Non-numeric input becomes the minimum.
	 *
	 * @param mixed $value Raw value.
	 * @param int   $min   Minimum.
	 * @param int   $max   Maximum.
	 * @return int
	 */
	private static function clamp_int( $value, $min, $max ) {
		$value = is_numeric( $value ) ? (int) $value : $min;
		return max( $min, min( $max, $value ) );
	}

	/**
	 * Clamp to a float range, rounded to 4 places. Non-numeric input becomes the minimum.
	 *
	 * @param mixed $value Raw value.
	 * @param float $min   Minimum.
	 * @param float $max   Maximum.
	 * @return float|int
	 */
	private static function clamp_float( $value, $min, $max ) {
		$value  = is_numeric( $value ) ? (float) $value : (float) $min;
		$result = round( max( $min, min( $max, $value ) ), 4 );
		return floor( $result ) === $result ? (int) $result : $result;
	}

	/**
	 * A money amount: zero or more, 4 decimal places at most.
	 *
	 * @param mixed $value Raw value.
	 * @return float|int
	 */
	private static function money( $value ) {
		return self::clamp_float( $value, 0, 100000000 );
	}

	/**
	 * Read a boolean from JSON-like input.
	 *
	 * @param mixed $value    Raw value.
	 * @param bool  $fallback Fallback for unrecognised input.
	 * @return bool
	 */
	private static function bool( $value, $fallback ) {
		$parsed = filter_var( $value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE );
		return null === $parsed ? (bool) $fallback : $parsed;
	}

	/**
	 * Plain single-line text, clamped to a length.
	 *
	 * @param mixed $value  Raw value.
	 * @param int   $length Maximum characters.
	 * @return string
	 */
	private static function text( $value, $length ) {
		if ( ! is_scalar( $value ) ) {
			return '';
		}
		$value = strip_tags( (string) $value ); // phpcs:ignore WordPress.WP.AlternativeFunctions.strip_tags_strip_tags -- Pure class, no WordPress available.
		$value = trim( (string) preg_replace( '/[\x00-\x1F\x7F\s]+/u', ' ', $value ) );
		return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $length ) : substr( $value, 0, $length );
	}

	/**
	 * Unique positive ids, in first-seen order.
	 *
	 * @param mixed $value Raw list.
	 * @param int   $limit Maximum entries.
	 * @return int[]
	 */
	private static function id_list( $value, $limit ) {
		$ids = array();
		foreach ( is_array( $value ) ? $value : array() as $id ) {
			if ( is_numeric( $id ) && (int) $id > 0 ) {
				$ids[ (int) $id ] = (int) $id;
			}
		}
		return array_slice( array_values( $ids ), 0, $limit );
	}

	/**
	 * Normalize a date to UTC ISO 8601 (`2026-11-01T00:00:00Z`), or null.
	 *
	 * @param mixed $value Raw value. A string without a zone is read as UTC.
	 * @return string|null
	 */
	private static function date( $value ) {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return null;
		}
		try {
			$date = new \DateTimeImmutable( trim( $value ), new \DateTimeZone( 'UTC' ) );
		} catch ( \Exception $e ) {
			return null;
		}
		return $date->setTimezone( new \DateTimeZone( 'UTC' ) )->format( 'Y-m-d\TH:i:s\Z' );
	}
}
