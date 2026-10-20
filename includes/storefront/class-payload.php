<?php
/**
 * The data the storefront builder needs: public config, resolved products and cart endpoints.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Storefront;

use MixMax\BoxBuilder\Assets;
use MixMax\BoxBuilder\Cart\Add_To_Cart;
use MixMax\BoxBuilder\Cart\Box_Resolver;
use MixMax\BoxBuilder\Cart\Box_Rules;
use MixMax\BoxBuilder\Pricing;
use MixMax\BoxBuilder\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/** Builds the payload for one campaign. Used by the renderer and by the `/preview` REST route. */
final class Payload {
	/** Option holding the catalog generation. Bumping it drops every cached product list. */
	const GENERATION_OPTION = 'mmbb_catalog_generation';

	/** Prefix of the product list transients. */
	const TRANSIENT_PREFIX = 'mmbb_products_';

	/** How long a product list is kept, in seconds. */
	const CACHE_TTL = HOUR_IN_SECONDS;

	/** Most products a campaign offers on the storefront. */
	const MAX_PRODUCTS = 200;

	/**
	 * Drop every cached product list, including lists rebuilt earlier in this request.
	 */
	public static function bust() {
		update_option( self::GENERATION_OPTION, (int) get_option( self::GENERATION_OPTION, 0 ) + 1, false );
	}

	/**
	 * Build the payload.
	 *
	 * @param array $campaign Campaign from the repository.
	 * @param array $args     { preview: bool, view: array } where `view` holds block or shortcode overrides.
	 * @return array
	 */
	public static function build( array $campaign, array $args = array() ) {
		$preview  = ! empty( $args['preview'] );
		$view     = isset( $args['view'] ) && is_array( $args['view'] ) ? $args['view'] : array();
		$config   = $campaign['config'];
		$settings = Settings::all();

		$payload = array(
			'id'       => (int) $campaign['id'],
			'title'    => $campaign['title'],
			'status'   => $campaign['status'],
			'preview'  => $preview,
			'config'   => self::public_config( $config ),
			'view'     => self::view( $config, $settings, $view ),
			'settings' => array(
				'unlockToast' => ! empty( $settings['unlock_toast'] ),
				'stickers'    => ! empty( $settings['stickers'] ),
				'ctaLabel'    => '' !== (string) $config['design']['cta_label'] ? $config['design']['cta_label'] : (string) $settings['cta_label'],
				'emptyHint'   => (string) $settings['empty_slot_hint'],
			),
			'products' => self::products( $campaign, $settings ),
			'money'    => Assets::get_money_settings(),
			'now'      => gmdate( 'Y-m-d\TH:i:s\Z' ),
		);

		if ( ! $preview ) {
			$endpoints       = Add_To_Cart::endpoints();
			$payload['cart'] = array(
				'nonce'    => wp_create_nonce( Add_To_Cart::NONCE_ACTION ),
				'addUrl'   => $endpoints['add_box'],
				'nonceUrl' => $endpoints['nonce'],
				'cartUrl'  => wc_get_cart_url(),
			);
			$payload['edit'] = self::edit_box( $campaign );
		}

		return $payload;
	}

	/**
	 * The parts of a config a shopper may see.
	 *
	 * @param array $config Campaign config.
	 * @return array
	 */
	public static function public_config( array $config ) {
		return array(
			'type'     => $config['type'],
			'box'      => $config['box'],
			'tiers'    => $config['tiers'],
			'sizes'    => $config['sizes'],
			'bundle'   => $config['bundle'],
			'extras'   => $config['extras'],
			'design'   => $config['design'],
			'caps'     => (object) $config['products']['caps'],
			'schedule' => array(
				'end'            => $config['schedule']['end'],
				'countdown_days' => $config['schedule']['countdown_days'],
			),
		);
	}

	/**
	 * Layout, columns and hero: the block or shortcode wins, then the campaign design, then the settings.
	 *
	 * @param array $config   Campaign config.
	 * @param array $settings Plugin settings.
	 * @param array $view     Overrides: layout, columns, show_hero.
	 * @return array { layout: string, columns: int, showHero: bool }.
	 */
	public static function view( array $config, array $settings, array $view ) {
		$design = $config['design'];

		$layout = isset( $view['layout'] ) ? $view['layout'] : 'default';
		if ( ! in_array( $layout, array( 'panel', 'bar', 'both' ), true ) ) {
			$layout = $design['layout'];
		}
		if ( ! in_array( $layout, array( 'panel', 'bar', 'both' ), true ) ) {
			$layout = in_array( $settings['summary_layout'], array( 'panel', 'bar', 'both' ), true ) ? $settings['summary_layout'] : 'both';
		}

		$columns = isset( $view['columns'] ) ? (int) $view['columns'] : 0;
		if ( ! in_array( $columns, array( 3, 4, 5 ), true ) ) {
			$columns = (int) $design['columns'];
		}
		if ( ! in_array( $columns, array( 3, 4, 5 ), true ) ) {
			$columns = (int) $settings['columns'];
		}

		$show_hero = ! empty( $design['show_hero'] );
		if ( isset( $view['show_hero'] ) && false === $view['show_hero'] ) {
			$show_hero = false;
		}

		return array(
			'layout'   => $layout,
			'columns'  => $columns,
			'showHero' => $show_hero,
		);
	}

	/**
	 * The campaign's products, resolved and cached.
	 *
	 * @param array $campaign Campaign from the repository.
	 * @param array $settings Plugin settings.
	 * @return array[]
	 */
	public static function products( array $campaign, array $settings ) {
		$low = isset( $settings['low_stock'] ) && is_array( $settings['low_stock'] ) ? $settings['low_stock'] : array();
		$key = self::TRANSIENT_PREFIX . (int) $campaign['id'] . '_' . (int) get_option( self::GENERATION_OPTION, 0 );

		$cached = get_transient( $key );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$threshold = ! empty( $low['enabled'] ) ? max( 1, (int) $low['threshold'] ) : 0;
		$products  = self::resolve_products( $campaign['config'], $threshold );
		set_transient( $key, $products, self::CACHE_TTL );
		return $products;
	}

	/**
	 * Resolve products from WooCommerce.
	 *
	 * @param array $config    Campaign config.
	 * @param int   $threshold Low stock threshold; 0 hides stock counts.
	 * @return array[]
	 */
	private static function resolve_products( array $config, $threshold ) {
		$ids     = Box_Resolver::allowed_ids( $config );
		$ranked  = array();
		$decimal = wc_get_price_decimals();

		foreach ( $ids as $position => $id ) {
			if ( count( $ranked ) >= self::MAX_PRODUCTS ) {
				break;
			}
			$product = wc_get_product( $id );
			if ( ! $product instanceof \WC_Product ) {
				continue;
			}
			$is_variation = $product->is_type( 'variation' );
			$row          = array(
				'product_id'   => $is_variation ? (int) $product->get_parent_id() : (int) $product->get_id(),
				'variation_id' => $is_variation ? (int) $product->get_id() : 0,
			);
			if ( ! Box_Resolver::is_offerable( $product, $row ) ) {
				continue;
			}
			$sales_source = $is_variation ? wc_get_product( $product->get_parent_id() ) : $product;
			$ranked[]     = array(
				'row'      => self::product_row( $product, $row, $threshold, $decimal ),
				'position' => $position,
				'sales'    => $sales_source instanceof \WC_Product ? (int) $sales_source->get_total_sales() : 0,
				'newest'   => (int) $product->get_id(),
			);
		}

		self::sort( $ranked, $config['products']['order'] );

		$products = array();
		foreach ( $ranked as $entry ) {
			$products[] = $entry['row'];
		}
		return $products;
	}

	/**
	 * Order ranked entries by the campaign's product order. The sort is stable: ties keep their position.
	 *
	 * @param array  $ranked Ranked entries, sorted in place.
	 * @param string $order  manual, bestselling, price or newest.
	 */
	private static function sort( array &$ranked, $order ) {
		if ( 'manual' === $order ) {
			return;
		}
		usort(
			$ranked,
			static function ( $a, $b ) use ( $order ) {
				if ( 'bestselling' === $order ) {
					$cmp = $b['sales'] <=> $a['sales'];
				} elseif ( 'price' === $order ) {
					$cmp = $a['row']['price'] <=> $b['row']['price'];
				} else {
					$cmp = $b['newest'] <=> $a['newest'];
				}
				return 0 !== $cmp ? $cmp : $a['position'] <=> $b['position'];
			}
		);
	}

	/**
	 * Shape one product for the builder.
	 *
	 * @param \WC_Product $product   Product or variation.
	 * @param array       $row       { product_id, variation_id }.
	 * @param int         $threshold Low stock threshold; 0 hides stock counts.
	 * @param int         $decimals  Price decimals.
	 * @return array
	 */
	private static function product_row( \WC_Product $product, array $row, $threshold, $decimals ) {
		$is_variation = $row['variation_id'] > 0;
		$parent       = $is_variation ? wc_get_product( $product->get_parent_id() ) : null;
		$source       = $parent instanceof \WC_Product ? $parent : $product;

		$image_id = $product->get_image_id();
		if ( ! $image_id && $parent instanceof \WC_Product ) {
			$image_id = $parent->get_image_id();
		}
		$image = null;
		if ( $image_id ) {
			$src = wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' );
			if ( $src ) {
				$srcset = wp_get_attachment_image_srcset( $image_id, 'woocommerce_thumbnail' );
				$image  = array(
					'src'    => $src,
					'srcset' => $srcset ? $srcset : '',
					'sizes'  => '(max-width: 760px) 50vw, 25vw',
					'alt'    => html_entity_decode( $product->get_name(), ENT_QUOTES, 'UTF-8' ),
				);
			}
		}

		$categories = array();
		foreach ( $source->get_category_ids() as $term_id ) {
			$term = get_term( $term_id, 'product_cat' );
			if ( $term instanceof \WP_Term ) {
				$categories[] = array(
					'id'   => (int) $term->term_id,
					'name' => html_entity_decode( $term->name, ENT_QUOTES, 'UTF-8' ),
				);
			}
		}

		$price   = Pricing::to_minor( $product->get_price(), $decimals );
		$regular = Pricing::to_minor( $product->get_regular_price(), $decimals );

		$stock = null;
		if ( ! $product->is_in_stock() ) {
			$stock = 0;
		} elseif ( $threshold > 0 && $product->managing_stock() ) {
			$left = $product->get_stock_quantity();
			if ( is_numeric( $left ) && (int) $left <= $threshold ) {
				$stock = max( 0, (int) $left );
			}
		}

		$compare_at = $product->is_on_sale() && $regular > $price ? $regular : 0;
		$badge      = null;
		if ( $compare_at > 0 ) {
			$badge = sprintf(
				/* translators: %d: Percentage taken off the regular price. */
				__( '-%d%%', 'mix-and-max-box-builder' ),
				(int) round( ( $compare_at - $price ) / $compare_at * 100 )
			);
		}

		return array(
			'id'           => Box_Rules::key( $row['product_id'], $row['variation_id'] ),
			'product_id'   => $row['product_id'],
			'variation_id' => $row['variation_id'],
			'name'         => html_entity_decode( $source->get_name(), ENT_QUOTES, 'UTF-8' ),
			'meta'         => self::meta_line( $product, $source ),
			'price'        => $price,
			'compare_at'   => $compare_at,
			'stock'        => $stock,
			'image'        => $image,
			'categories'   => $categories,
			'badge'        => $badge,
		);
	}

	/**
	 * A short line under the name: the variation's options, or the first category.
	 *
	 * @param \WC_Product $product Product or variation.
	 * @param \WC_Product $source  The parent for a variation, otherwise the product.
	 * @return string
	 */
	private static function meta_line( \WC_Product $product, \WC_Product $source ) {
		if ( $product->is_type( 'variation' ) ) {
			$summary = wc_get_formatted_variation( $product, true, false );
			return html_entity_decode( wp_strip_all_tags( $summary ), ENT_QUOTES, 'UTF-8' );
		}
		foreach ( $source->get_category_ids() as $term_id ) {
			$term = get_term( $term_id, 'product_cat' );
			if ( $term instanceof \WP_Term ) {
				return html_entity_decode( $term->name, ENT_QUOTES, 'UTF-8' );
			}
		}
		return '';
	}

	/**
	 * The box being edited from the cart (`?mmbb_edit={cart item key}`), when it belongs to this campaign.
	 *
	 * @param array $campaign Campaign from the repository.
	 * @return array|null { key, items, size, gift } or null.
	 */
	public static function edit_box( array $campaign ) {
		$key = isset( $_GET['mmbb_edit'] ) ? sanitize_key( wp_unslash( $_GET['mmbb_edit'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read only: it preloads the shopper's own cart box and changes nothing.
		if ( '' === $key || ! function_exists( 'WC' ) || ! WC()->cart instanceof \WC_Cart ) {
			return null;
		}
		$line = WC()->cart->get_cart_item( $key );
		if ( empty( $line['mmbb_box'] ) || ! is_array( $line['mmbb_box'] ) || (int) $line['mmbb_box']['campaign_id'] !== (int) $campaign['id'] ) {
			return null;
		}

		$box   = $line['mmbb_box'];
		$items = array();
		foreach ( (array) $box['items'] as $item ) {
			$items[] = array(
				'id'  => Box_Rules::key( (int) $item['product_id'], (int) $item['variation_id'] ),
				'qty' => (int) $item['qty'],
			);
		}
		$gift = isset( $box['gift'] ) && is_array( $box['gift'] ) ? $box['gift'] : array();

		return array(
			'key'   => $key,
			'items' => $items,
			'size'  => isset( $box['size'] ) ? (int) $box['size'] : 0,
			'gift'  => array(
				'enabled' => ! empty( $gift['enabled'] ),
				'message' => isset( $gift['message'] ) ? (string) $gift['message'] : '',
			),
		);
	}
}
