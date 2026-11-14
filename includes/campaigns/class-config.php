<?php
/**
 * The campaign config schema: defaults, sanitizing and validating. Pure PHP.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Campaigns;

use MixMax\BoxBuilder\Storefront\Colors;

defined( 'ABSPATH' ) || exit;

/**
 * One schema for sanitizing, validating and describing a campaign config.
 *
 * Money values (fixed amounts, box prices, fees) are store-currency numbers.
 */
final class Config {
	const TYPES            = array( 'tiered', 'fixed', 'bundle' );
	const DISCOUNT_TYPES   = array( 'percent', 'fixed_amount', 'box_price' );
	const SIZE_TAGS        = array( '', 'popular', 'best_value' );
	const SOURCES          = array( 'manual', 'category', 'tag' );
	const ORDERS           = array( 'manual', 'bestselling', 'price', 'newest' );
	const LAYOUTS          = array( 'default', 'panel', 'bar', 'both' );
	const COLUMNS          = array( 0, 3, 4, 5 );
	const ACCENTS          = array( 'max', 'theme', 'custom' );
	const THEMES           = array( 'light', 'dark', 'custom' );
	const LADDERS          = array( 'default', 'custom' );
	const COUNTDOWNS       = array( 'default', 'custom' );
	const DESIGN_TEMPLATES = array( 'spotlight', 'clean', 'steps', 'gift', 'bold', 'pastel', 'editorial', 'night', 'split', 'compact' );
	const DESIGN_FONTS     = array( '', 'theme', 'bricolage-grotesque', 'inter-tight', 'plus-jakarta-sans', 'fraunces', 'dm-sans', 'outfit', 'inter', 'space-grotesk', 'figtree', 'system' );
	/** Discount ladder colours: the top step, the next step to unlock and the other steps. */
	const LADDER_COLORS = array( 'ladder_top', 'ladder_top_text', 'ladder_near', 'ladder_near_text', 'ladder_base', 'ladder_base_text' );

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
				'allow_coupons'    => false,
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
				'countdown_end'  => null,
			),
			'extras'               => array(
				'gift_message' => false,
				'gift_wrap'    => array(
					'enabled' => false,
					'fee'     => 0,
				),
				'free_gift'    => array(
					'enabled'    => false,
					'product_id' => 0,
					'min_items'  => 12,
				),
			),
			'design'               => array(
				'layout'           => 'default',
				'columns'          => 0,
				'headline'         => '',
				'intro'            => '',
				'sticker'          => '',
				'cta_label'        => '',
				'show_hero'        => true,
				'show_ladder'      => true,
				'show_stickers'    => true,
				'accent'           => 'max',
				'accent_color'     => '#f04e12',
				'theme'            => 'light',
				'theme_canvas'     => '#f5f5f2',
				'theme_surface'    => '#ffffff',
				'ladder'           => 'default',
				'ladder_top'       => '#f04e12',
				'ladder_top_text'  => '#141414',
				'ladder_near'      => '#ffd23f',
				'ladder_near_text' => '#141414',
				'ladder_base'      => '#ffffff',
				'ladder_base_text' => '#141414',
				'countdown'        => 'default',
				'countdown_bg'     => '#ffd23f',
				'countdown_text'   => '#141414',
				'template'         => 'spotlight',
				'sync_theme'       => false,
				'colors'           => array_fill_keys( array( 'accent', 'button_text', 'background', 'surface', 'text', 'muted', 'savings' ), '' ),
				'typography'       => array(
					'heading_font'     => '',
					'body_font'        => '',
					'heading_size'     => 68,
					'heading_weight'   => 800,
					'button_uppercase' => false,
				),
				'buttons'          => array(
					'style'  => 'fill',
					'size'   => 'm',
					'radius' => 22,
				),
				'cards'            => array(
					'columns'            => 3,
					'image_ratio'        => '1/1',
					'image_fit'          => 'cover',
					'radius'             => 18,
					'shadow'             => 'none',
					'show_compare_price' => true,
					'show_sale_badge'    => true,
				),
				'summary'          => array(
					'position'    => 'right',
					'progress'    => 'bar',
					'slots'       => 'photos',
					'show_ladder' => true,
				),
				'spacing'          => array(
					'width'   => 'wide',
					'padding' => array(
						'top'    => '56px',
						'right'  => '64px',
						'bottom' => '56px',
						'left'   => '64px',
					),
				),
				'advanced'         => array(
					'css_class'  => '',
					'custom_css' => '',
				),
				'content'          => array(
					'headline'   => '',
					'intro'      => '',
					'add_label'  => '',
					'cart_label' => '',
				),
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
		$out['extras']    = self::sanitize_extras( self::section( $input, 'extras' ), $base['extras'], $capacity );
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
		} elseif ( 'manual' === $products['source'] && self::needed_items( $config ) > self::reachable_items( $config ) ) {
			$add( 'box.allow_duplicates', 'not_enough_products' );
		} elseif ( 'manual' !== $products['source'] && empty( $products['term_ids'] ) ) {
			$add( 'products.term_ids', 'terms_required' );
		}

		$free_gift = $config['extras']['free_gift'];
		if ( $free_gift['enabled'] && $free_gift['product_id'] < 1 ) {
			$add( 'extras.free_gift.product_id', 'gift_product_required' );
		}

		$schedule = $config['schedule'];
		if ( null !== $schedule['start'] && null !== $schedule['end'] && $schedule['end'] <= $schedule['start'] ) {
			$add( 'schedule.end', 'end_before_start' );
		}
		// Always on: the countdown needs its own time to count to.
		if ( $schedule['countdown_days'] > 0 && null === $schedule['start'] && null === $schedule['end'] && null === $schedule['countdown_end'] ) {
			$add( 'schedule.countdown_end', 'countdown_end_required' );
		}

		return $errors;
	}

	/**
	 * The most items a shopper must pick: the largest size, the tiered minimum, or the bundle.
	 *
	 * @param array $config Sanitized config.
	 * @return int
	 */
	private static function needed_items( array $config ) {
		if ( 'fixed' === $config['type'] ) {
			$sizes = array_column( $config['sizes'], 'qty' );
			return $sizes ? (int) max( $sizes ) : 0;
		}
		if ( 'tiered' === $config['type'] ) {
			return (int) $config['box']['min_items'];
		}
		return (int) $config['bundle']['qty'];
	}

	/**
	 * The most items a hand-picked product list can supply. Per-product caps are left
	 * out, so this only flags boxes that can never be filled.
	 *
	 * @param array $config Sanitized config.
	 * @return int
	 */
	private static function reachable_items( array $config ) {
		$count = count( array_unique( array_map( 'intval', $config['products']['ids'] ) ) );
		return $config['box']['allow_duplicates'] ? $count * max( 1, (int) $config['box']['max_per_product'] ) : $count;
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
			'allow_coupons'    => self::bool( self::pick( $in, 'allow_coupons', $base['allow_coupons'] ), $base['allow_coupons'] ),
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
			'countdown_end'  => array_key_exists( 'countdown_end', $in ) ? self::date( $in['countdown_end'] ) : $base['countdown_end'],
		);
	}

	/**
	 * Sanitize the extras.
	 *
	 * @param array $in       Input section.
	 * @param array $base     Base section.
	 * @param int   $capacity Box capacity.
	 * @return array
	 */
	private static function sanitize_extras( array $in, array $base, $capacity ) {
		$wrap = self::section( $in, 'gift_wrap' );
		$free = self::section( $in, 'free_gift' );
		return array(
			'gift_message' => self::bool( self::pick( $in, 'gift_message', $base['gift_message'] ), $base['gift_message'] ),
			'gift_wrap'    => array(
				'enabled' => self::bool( self::pick( $wrap, 'enabled', $base['gift_wrap']['enabled'] ), $base['gift_wrap']['enabled'] ),
				'fee'     => self::money( self::pick( $wrap, 'fee', $base['gift_wrap']['fee'] ) ),
			),
			'free_gift'    => array(
				'enabled'    => self::bool( self::pick( $free, 'enabled', $base['free_gift']['enabled'] ), $base['free_gift']['enabled'] ),
				'product_id' => max( 0, (int) self::pick( $free, 'product_id', $base['free_gift']['product_id'] ) ),
				'min_items'  => self::clamp_int( self::pick( $free, 'min_items', $base['free_gift']['min_items'] ), 1, $capacity ),
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
		$out['accent']        = self::enum( self::pick( $in, 'accent', $base['accent'] ), self::ACCENTS, $base['accent'] );
		$out['accent_color']  = self::hex( $in, 'accent_color', $base );
		$out['theme']         = self::enum( self::pick( $in, 'theme', $base['theme'] ), self::THEMES, $base['theme'] );
		$out['theme_canvas']  = self::hex( $in, 'theme_canvas', $base );
		$out['theme_surface'] = self::hex( $in, 'theme_surface', $base );
		$out['ladder']        = self::enum( self::pick( $in, 'ladder', $base['ladder'] ), self::LADDERS, $base['ladder'] );
		foreach ( self::LADDER_COLORS as $key ) {
			$out[ $key ] = self::hex( $in, $key, $base );
		}
		$out['countdown']      = self::enum( self::pick( $in, 'countdown', $base['countdown'] ), self::COUNTDOWNS, $base['countdown'] );
		$out['countdown_bg']   = self::hex( $in, 'countdown_bg', $base );
		$out['countdown_text'] = self::hex( $in, 'countdown_text', $base );

		$out['template']   = self::enum( self::pick( $in, 'template', $base['template'] ), self::DESIGN_TEMPLATES, $base['template'] );
		$out['sync_theme'] = self::bool( self::pick( $in, 'sync_theme', $base['sync_theme'] ), $base['sync_theme'] );

		$colors = self::section( $in, 'colors' );
		foreach ( array_keys( $base['colors'] ) as $key ) {
			$out['colors'][ $key ] = self::design_color( self::pick( $colors, $key, $base['colors'][ $key ] ), $base['colors'][ $key ] );
		}

		$typography                            = self::section( $in, 'typography' );
		$out['typography']['heading_font']     = self::font( self::pick( $typography, 'heading_font', $base['typography']['heading_font'] ), $base['typography']['heading_font'] );
		$out['typography']['body_font']        = self::font( self::pick( $typography, 'body_font', $base['typography']['body_font'] ), $base['typography']['body_font'] );
		$out['typography']['heading_size']     = self::clamp_int( self::pick( $typography, 'heading_size', $base['typography']['heading_size'] ), 32, 96 );
		$weight                                = (int) self::pick( $typography, 'heading_weight', $base['typography']['heading_weight'] );
		$out['typography']['heading_weight']   = in_array( $weight, array( 400, 500, 600, 700, 800 ), true ) ? $weight : $base['typography']['heading_weight'];
		$out['typography']['button_uppercase'] = self::bool( self::pick( $typography, 'button_uppercase', $base['typography']['button_uppercase'] ), $base['typography']['button_uppercase'] );

		$buttons                  = self::section( $in, 'buttons' );
		$out['buttons']['style']  = self::enum( self::pick( $buttons, 'style', $base['buttons']['style'] ), array( 'fill', 'outline', 'soft' ), $base['buttons']['style'] );
		$out['buttons']['size']   = self::enum( self::pick( $buttons, 'size', $base['buttons']['size'] ), array( 's', 'm', 'l' ), $base['buttons']['size'] );
		$out['buttons']['radius'] = self::clamp_int( self::pick( $buttons, 'radius', $base['buttons']['radius'] ), 0, 32 );

		$cards                              = self::section( $in, 'cards' );
		$out['cards']['columns']            = self::clamp_int( self::pick( $cards, 'columns', $base['cards']['columns'] ), 2, 5 );
		$out['cards']['image_ratio']        = self::enum( self::pick( $cards, 'image_ratio', $base['cards']['image_ratio'] ), array( '1/1', '4/5', '4/3' ), $base['cards']['image_ratio'] );
		$out['cards']['image_fit']          = self::enum( self::pick( $cards, 'image_fit', $base['cards']['image_fit'] ), array( 'cover', 'contain' ), $base['cards']['image_fit'] );
		$out['cards']['radius']             = self::clamp_int( self::pick( $cards, 'radius', $base['cards']['radius'] ), 0, 32 );
		$out['cards']['shadow']             = self::enum( self::pick( $cards, 'shadow', $base['cards']['shadow'] ), array( 'none', 'soft', 'strong' ), $base['cards']['shadow'] );
		$out['cards']['show_compare_price'] = self::bool( self::pick( $cards, 'show_compare_price', $base['cards']['show_compare_price'] ), $base['cards']['show_compare_price'] );
		$out['cards']['show_sale_badge']    = self::bool( self::pick( $cards, 'show_sale_badge', $base['cards']['show_sale_badge'] ), $base['cards']['show_sale_badge'] );

		$summary                       = self::section( $in, 'summary' );
		$out['summary']['position']    = self::enum( self::pick( $summary, 'position', $base['summary']['position'] ), array( 'left', 'right', 'bar' ), $base['summary']['position'] );
		$out['summary']['progress']    = self::enum( self::pick( $summary, 'progress', $base['summary']['progress'] ), array( 'bar', 'segments' ), $base['summary']['progress'] );
		$out['summary']['slots']       = self::enum( self::pick( $summary, 'slots', $base['summary']['slots'] ), array( 'photos', 'numbers' ), $base['summary']['slots'] );
		$out['summary']['show_ladder'] = self::bool( self::pick( $summary, 'show_ladder', $base['summary']['show_ladder'] ), $base['summary']['show_ladder'] );

		$spacing                 = self::section( $in, 'spacing' );
		$out['spacing']['width'] = self::enum( self::pick( $spacing, 'width', $base['spacing']['width'] ), array( 'content', 'wide', 'full' ), $base['spacing']['width'] );
		$padding                 = self::section( $spacing, 'padding' );
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			$out['spacing']['padding'][ $side ] = self::css_length( self::pick( $padding, $side, $base['spacing']['padding'][ $side ] ), $base['spacing']['padding'][ $side ] );
		}

		$advanced                      = self::section( $in, 'advanced' );
		$out['advanced']['css_class']  = self::css_classes( self::pick( $advanced, 'css_class', $base['advanced']['css_class'] ) );
		$out['advanced']['custom_css'] = self::custom_css( self::pick( $advanced, 'custom_css', $base['advanced']['custom_css'] ) );
		$content                       = self::section( $in, 'content' );
		$out['content']['headline']    = self::text( self::pick( $content, 'headline', $base['content']['headline'] ), 120 );
		$out['content']['intro']       = self::text( self::pick( $content, 'intro', $base['content']['intro'] ), 500 );
		$out['content']['add_label']   = self::text( self::pick( $content, 'add_label', $base['content']['add_label'] ), 40 );
		$out['content']['cart_label']  = self::text( self::pick( $content, 'cart_label', $base['content']['cart_label'] ), 40 );
		return $out;
	}

	/**
	 * Sanitize a design colour or WordPress preset reference.
	 *
	 * @param mixed  $value    Raw value.
	 * @param string $fallback Fallback value.
	 * @return string
	 */
	private static function design_color( $value, $fallback ) {
		if ( '' === $value ) {
			return '';
		}
		$hex = Colors::normalize_hex( $value );
		if ( '' !== $hex ) {
			return $hex;
		}
		return is_string( $value ) && preg_match( '/^var\(--wp--preset--color--[a-z0-9-]+\)$/', $value ) ? $value : $fallback;
	}

	/**
	 * Sanitize a bundled font slug or WordPress preset reference.
	 *
	 * @param mixed  $value    Raw value.
	 * @param string $fallback Fallback value.
	 * @return string
	 */
	private static function font( $value, $fallback ) {
		if ( is_string( $value ) && preg_match( '/^var\(--wp--preset--font-family--[a-z0-9-]+\)$/', $value ) ) {
			return $value;
		}
		return self::enum( $value, self::DESIGN_FONTS, $fallback );
	}

	/**
	 * Sanitize a CSS length used for box padding.
	 *
	 * @param mixed  $value    Raw value.
	 * @param string $fallback Fallback value.
	 * @return string
	 */
	private static function css_length( $value, $fallback ) {
		return is_string( $value ) && preg_match( '/^(?:0|(?:\d+(?:\.\d+)?)(?:px|rem|em|%|vw))$/', trim( $value ) ) ? trim( $value ) : $fallback;
	}

	/**
	 * Sanitize a space-separated class list.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	private static function css_classes( $value ) {
		$classes = preg_split( '/\s+/', is_scalar( $value ) ? trim( (string) $value ) : '' );
		$clean   = array();
		foreach ( $classes as $class ) {
			$class = preg_replace( '/[^A-Za-z0-9_-]/', '', $class );
			if ( '' !== $class ) {
				$clean[] = $class;
			}
		}
		return implode( ' ', array_slice( array_unique( $clean ), 0, 20 ) );
	}

	/**
	 * Strip markup and limit campaign custom CSS to 10 KB.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	private static function custom_css( $value ) {
		$value = is_scalar( $value ) ? strip_tags( (string) $value ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.strip_tags_strip_tags -- Pure class, no WordPress available.
		if ( preg_match( '/(?:url\s*\(|@import)/i', $value ) ) {
			return '';
		}
		$value = str_replace( array( '{', '}' ), '', $value );
		return substr( $value, 0, 10240 );
	}

	/**
	 * A #rrggbb colour, or the base colour when the input is not one.
	 *
	 * @param array  $in   Input section.
	 * @param string $key  Key.
	 * @param array  $base Base section.
	 * @return string
	 */
	private static function hex( array $in, $key, array $base ) {
		$hex = Colors::normalize_hex( self::pick( $in, $key, $base[ $key ] ) );
		return '' !== $hex ? $hex : $base[ $key ];
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
