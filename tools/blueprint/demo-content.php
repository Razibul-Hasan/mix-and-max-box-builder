<?php
/**
 * Demo store for the WordPress.org live preview (WordPress Playground).
 *
 * The blueprint built by tools/blueprint/build.mjs inlines this file, writes
 * it to /tmp and calls mmbb_demo_seed() once WooCommerce and the plugin are
 * active. It is never shipped in the plugin zip.
 *
 * @package MixMax\BoxBuilder
 */

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- Seeds the plugin's own analytics tables once, in a throwaway Playground site.

use MixMax\BoxBuilder\Analytics\Query;
use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Config;
use MixMax\BoxBuilder\Campaigns\Publisher;

/** Build the whole demo: store settings, products, campaigns, pages and analytics. */
function mmbb_demo_seed() {
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$admins = get_users(
		array(
			'role'   => 'administrator',
			'number' => 1,
			'fields' => 'ID',
		)
	);
	wp_set_current_user( $admins ? (int) $admins[0] : 1 );

	mmbb_demo_store();
	$products  = mmbb_demo_products();
	$campaigns = mmbb_demo_campaigns( $products );
	mmbb_demo_navigation( $campaigns );
	mmbb_demo_analytics( $campaigns, $products );

	update_option(
		'mmbb_demo_links',
		array(
			'holiday'  => $campaigns['holiday']['page_id'],
			'spa'      => $campaigns['spa']['page_id'],
			'trio'     => $campaigns['trio']['page_id'],
			'campaign' => $campaigns['holiday']['id'],
		),
		false
	);
}

/** WooCommerce settings for a ready-to-browse store, and an empty site. */
function mmbb_demo_store() {
	global $wp_rewrite;
	$wp_rewrite->set_permalink_structure( '/%postname%/' );
	flush_rewrite_rules();

	$options = array(
		'blogname'                                 => 'Northwind Pantry',
		'blogdescription'                          => 'Small-batch treats, tea and candles',
		'woocommerce_store_address'                => '120 Harbor Street',
		'woocommerce_store_city'                   => 'San Francisco',
		'woocommerce_store_postcode'               => '94105',
		'woocommerce_default_country'              => 'US:CA',
		'woocommerce_currency'                     => 'USD',
		'woocommerce_coming_soon'                  => 'no',
		'woocommerce_store_pages_only'             => 'no',
		'woocommerce_onboarding_profile'           => array(
			'skipped'   => true,
			'completed' => true,
		),
		'woocommerce_task_list_hidden'             => 'yes',
		'woocommerce_task_list_complete'           => 'yes',
		'woocommerce_show_marketplace_suggestions' => 'no',
		'woocommerce_allow_tracking'               => 'no',
		'woocommerce_manage_stock'                 => 'yes',
		'woocommerce_cod_settings'                 => array(
			'enabled'     => 'yes',
			'title'       => 'Cash on delivery',
			'description' => 'Demo store: no payment is taken.',
		),
		'mmbb_setup_test_done'                     => 1,
	);
	foreach ( $options as $name => $value ) {
		update_option( $name, $value );
	}
	delete_transient( '_wc_activation_redirect' );

	if ( class_exists( 'WC_Install' ) && wc_get_page_id( 'cart' ) < 1 ) {
		WC_Install::create_pages();
	}
	if ( class_exists( 'WC_Admin_Notices' ) ) {
		WC_Admin_Notices::remove_all_notices();
	}

	// The default "Hello world!" post and "Sample Page".
	foreach ( array( 1, 2 ) as $post_id ) {
		if ( get_post( $post_id ) ) {
			wp_delete_post( $post_id, true );
		}
	}
}

/**
 * Create the categories and products, each with an illustrated image.
 *
 * @return array Product rows from mmbb_demo_catalog(), keyed by slug, with `id` added.
 */
function mmbb_demo_products() {
	$categories = array();
	foreach ( array(
		'sweets'  => 'Sweets',
		'tea'     => 'Tea & honey',
		'candles' => 'Candles & bath',
	) as $slug => $name ) {
		$term                = wp_insert_term( $name, 'product_cat', array( 'slug' => $slug ) );
		$categories[ $slug ] = is_wp_error( $term ) ? (int) $term->get_error_data( 'term_exists' ) : (int) $term['term_id'];
	}

	$products = array();
	foreach ( mmbb_demo_catalog() as $slug => $row ) {
		$product = new WC_Product_Simple();
		$product->set_name( $row['name'] );
		$product->set_slug( $slug );
		$product->set_status( 'publish' );
		$product->set_regular_price( $row['price'] );
		if ( isset( $row['sale'] ) ) {
			$product->set_sale_price( $row['sale'] );
		}
		$product->set_short_description( $row['blurb'] );
		$product->set_category_ids( array( $categories[ $row['cat'] ] ) );
		if ( isset( $row['stock'] ) ) {
			$product->set_manage_stock( true );
			$product->set_stock_quantity( $row['stock'] );
			$product->set_stock_status( $row['stock'] > 0 ? 'instock' : 'outofstock' );
		}
		$image = mmbb_demo_image( $slug, $row['name'], $row['art'], isset( $row['swap'] ) ? $row['swap'] : array() );
		if ( $image ) {
			$product->set_image_id( $image );
		}
		$row['id']         = $product->save();
		$products[ $slug ] = $row;
	}
	return $products;
}

/**
 * The demo catalog. `art` names a ProductArt drawing; `swap` recolours it.
 * `weight` is how often shoppers pick it in the seeded analytics.
 *
 * @return array[]
 */
function mmbb_demo_catalog() {
	return array(
		'brown-butter-chip'      => array(
			'name'   => 'Brown Butter Chip',
			'cat'    => 'sweets',
			'art'    => 'cookie',
			'price'  => '4.50',
			'weight' => 10,
			'blurb'  => 'Chewy brown butter cookie with dark chocolate chips. 85 g.',
		),
		'raspberry-macaron-duo'  => array(
			'name'   => 'Raspberry Macaron Duo',
			'cat'    => 'sweets',
			'art'    => 'macaron',
			'price'  => '5.00',
			'weight' => 8,
			'blurb'  => 'Two almond shells filled with raspberry ganache.',
		),
		'glazed-ring'            => array(
			'name'   => 'Glazed Ring',
			'cat'    => 'sweets',
			'art'    => 'donut',
			'price'  => '3.50',
			'weight' => 6,
			'blurb'  => 'Brioche ring with a pink berry glaze and sprinkles.',
		),
		'dark-bar-70'            => array(
			'name'   => '70% Dark Bar',
			'cat'    => 'sweets',
			'art'    => 'chocolate',
			'price'  => '5.50',
			'weight' => 5,
			'blurb'  => 'Single-origin dark chocolate. 80 g.',
		),
		'double-chocolate-chunk' => array(
			'name'   => 'Double Chocolate Chunk',
			'cat'    => 'sweets',
			'art'    => 'cookie',
			'price'  => '4.75',
			'weight' => 7,
			'swap'   => array(
				'#c98a4b' => '#6e4227',
				'#5a3519' => '#f3e3cc',
				'#f3e3cc' => '#ecdcd0',
			),
			'blurb'  => 'Cocoa dough with white chocolate chunks. 85 g.',
		),
		'pistachio-macaron-duo'  => array(
			'name'   => 'Pistachio Macaron Duo',
			'cat'    => 'sweets',
			'art'    => 'macaron',
			'price'  => '5.00',
			'weight' => 6,
			'swap'   => array(
				'#e88aa6' => '#9fc48c',
				'#f6dfe6' => '#e6efdc',
			),
			'blurb'  => 'Two almond shells filled with roasted pistachio cream.',
		),
		'strawberry-sprinkle'    => array(
			'name'   => 'Strawberry Sprinkle Ring',
			'cat'    => 'sweets',
			'art'    => 'donut',
			'price'  => '3.75',
			'weight' => 4,
			'swap'   => array(
				'#d9577a' => '#f3a6bf',
				'#fbe6d4' => '#fde8ee',
			),
			'blurb'  => 'Brioche ring with strawberry icing.',
		),
		'sea-salt-milk-bar'      => array(
			'name'   => 'Sea Salt Milk Bar',
			'cat'    => 'sweets',
			'art'    => 'chocolate',
			'price'  => '5.50',
			'sale'   => '4.40',
			'weight' => 4,
			'swap'   => array(
				'#6b3e26' => '#a86b45',
				'#4e2b19' => '#865230',
				'#eadcd2' => '#f4e6da',
			),
			'blurb'  => 'Creamy milk chocolate with flakes of sea salt. 80 g.',
		),
		'smoky-earl-grey'        => array(
			'name'   => 'Smoky Earl Grey',
			'cat'    => 'tea',
			'art'    => 'tea',
			'price'  => '8.75',
			'sale'   => '7.00',
			'weight' => 7,
			'blurb'  => 'Lapsang and bergamot loose-leaf tea. 50 g tin.',
		),
		'wildflower-honey'       => array(
			'name'   => 'Wildflower Honey',
			'cat'    => 'tea',
			'art'    => 'honey',
			'price'  => '8.00',
			'stock'  => 5,
			'weight' => 6,
			'blurb'  => 'Raw spring honey from local hives. 250 g.',
		),
		'jasmine-green'          => array(
			'name'   => 'Jasmine Green',
			'cat'    => 'tea',
			'art'    => 'tea',
			'price'  => '7.50',
			'weight' => 5,
			'swap'   => array(
				'#3f6b5c' => '#3d5a85',
				'#2f5246' => '#2c4263',
				'#efe8d8' => '#e6ebf3',
			),
			'blurb'  => 'Green tea scented with jasmine blossom. 50 g tin.',
		),
		'orange-blossom-honey'   => array(
			'name'   => 'Orange Blossom Honey',
			'cat'    => 'tea',
			'art'    => 'honey',
			'price'  => '8.50',
			'weight' => 4,
			'swap'   => array(
				'#e6a52c' => '#ef8a3a',
				'#fbefd0' => '#fde7d6',
			),
			'blurb'  => 'Light, floral honey from orange groves. 250 g.',
		),
		'fig-cedar-candle'       => array(
			'name'   => 'Fig & Cedar Candle',
			'cat'    => 'candles',
			'art'    => 'candle',
			'price'  => '12.00',
			'sale'   => '9.00',
			'stock'  => 3,
			'weight' => 6,
			'blurb'  => 'Soy candle with notes of green fig and cedarwood. 120 g.',
		),
		'sea-salt-candle'        => array(
			'name'   => 'Sea Salt Candle',
			'cat'    => 'candles',
			'art'    => 'candle',
			'price'  => '11.00',
			'weight' => 4,
			'swap'   => array(
				'#7d9a7a' => '#6f9cc0',
				'#e5ece4' => '#e4ecf2',
			),
			'blurb'  => 'Soy candle with sea salt and driftwood. 120 g.',
		),
		'oat-milk-soap'          => array(
			'name'   => 'Oat Milk Soap',
			'cat'    => 'candles',
			'art'    => 'soap',
			'price'  => '6.50',
			'weight' => 5,
			'blurb'  => 'Gentle bar soap with colloidal oats. 100 g.',
		),
		'lavender-soap'          => array(
			'name'   => 'Lavender Soap',
			'cat'    => 'candles',
			'art'    => 'soap',
			'price'  => '6.50',
			'weight' => 4,
			'swap'   => array(
				'#a9c6dc' => '#b7a5d8',
				'#d6e6f1' => '#e3dbf2',
				'#e4ecf2' => '#eee8f6',
			),
			'blurb'  => 'Bar soap with French lavender oil. 100 g.',
		),
		'rose-clay-soap'         => array(
			'name'   => 'Rose Clay Soap',
			'cat'    => 'candles',
			'art'    => 'soap',
			'price'  => '6.50',
			'stock'  => 0,
			'weight' => 2,
			'swap'   => array(
				'#a9c6dc' => '#e3a4a4',
				'#d6e6f1' => '#f3d4d4',
				'#e4ecf2' => '#f8e8e6',
			),
			'blurb'  => 'Bar soap with pink kaolin clay. 100 g.',
		),
	);
}

/**
 * Create the campaigns through the plugin's own repository and publisher, so
 * they are exactly what the wizard would save.
 *
 * @param array $products Products from mmbb_demo_products().
 * @return array Keyed by campaign: { id, page_id, config }.
 */
function mmbb_demo_campaigns( array $products ) {
	$ids = static function ( $cats, $skip = array() ) use ( $products ) {
		$list = array();
		foreach ( $products as $slug => $row ) {
			if ( in_array( $row['cat'], (array) $cats, true ) && ! in_array( $slug, $skip, true ) ) {
				$list[] = $row['id'];
			}
		}
		return $list;
	};
	$day = static function ( $days ) {
		return gmdate( 'Y-m-d\TH:i:s\Z', time() + $days * DAY_IN_SECONDS );
	};

	$plans = array(
		'holiday' => array(
			'template' => 'holiday',
			'title'    => 'Holiday Treat Box',
			'slug'     => 'holiday-treat-box',
			'config'   => array(
				'products' => array(
					'source' => 'manual',
					'ids'    => $ids( array( 'sweets', 'tea', 'candles' ) ),
					'order'  => 'manual',
				),
				'schedule' => array(
					'end'            => $day( 12 ),
					'countdown_days' => 14,
				),
				'extras'   => array( 'gift_message' => true ),
				'design'   => array(
					'headline' => 'Mix 12 treats. Save 25%.',
					'intro'    => 'Pick anything below and we pack it in a gift-ready box. The more you add, the more you save. Discounts apply automatically.',
					'sticker'  => 'Holiday drop',
				),
			),
		),
		'spa'     => array(
			'template' => 'spa',
			'title'    => 'Build-a-Spa Kit',
			'slug'     => 'spa-kit',
			'config'   => array(
				'products' => array(
					'source' => 'manual',
					'ids'    => $ids( array( 'candles', 'tea' ) ),
					'order'  => 'manual',
				),
				'design'   => array(
					'headline' => 'Build your own spa kit',
					'intro'    => 'Choose 4 or 6 calming favourites. The bigger kit saves you 15%, and we can gift-wrap it.',
					'sticker'  => 'Save up to 15%',
					'theme'    => 'dark',
				),
			),
		),
		'trio'    => array(
			'template' => 'snack',
			'title'    => 'Tea Lover Trio',
			'slug'     => 'tea-trio',
			'config'   => array(
				'box'      => array(
					'capacity'         => 3,
					'min_items'        => 3,
					'allow_duplicates' => true,
					'max_per_product'  => 3,
				),
				'bundle'   => array(
					'qty'   => 3,
					'price' => 18,
				),
				'products' => array(
					'source' => 'manual',
					'ids'    => array_merge( $ids( 'tea' ), $ids( 'sweets', array( 'strawberry-sprinkle', 'sea-salt-milk-bar', 'glazed-ring' ) ) ),
					'order'  => 'manual',
				),
				'schedule' => array(
					'end'            => $day( 3 ),
					'countdown_days' => 7,
				),
				'design'   => array(
					'headline' => 'Any 3 for one bundle price',
					'intro'    => 'Two teas and a honey, or a cookie for every cup. Pick any three and the bundle price applies.',
					'sticker'  => 'Bundle deal',
				),
			),
		),
		'gift'    => array(
			'template' => 'gift',
			'title'    => 'Valentine’s Gift Box',
			'slug'     => '',
			'config'   => array(
				'products' => array(
					'source' => 'manual',
					'ids'    => $ids( array( 'candles', 'tea' ) ),
					'order'  => 'manual',
				),
			),
		),
	);

	$repo      = new Campaign_Repository();
	$publisher = new Publisher( $repo );
	$campaigns = array();
	// Created oldest first, so the list (newest first) opens on the draft.
	foreach ( $plans as $key => $plan ) {
		$campaign = $repo->create_from_template( $plan['template'], $plan['title'] );
		if ( is_wp_error( $campaign ) ) {
			continue;
		}
		$campaign = $repo->save( $campaign['id'], $plan['config'] );
		$page_id  = 0;
		if ( '' !== $plan['slug'] && ! Config::validate( $campaign['config'] ) ) {
			$published = $publisher->publish(
				$campaign['id'],
				array(
					'placement'  => 'new_page',
					'page_title' => $plan['title'],
					'page_slug'  => $plan['slug'],
				)
			);
			if ( ! is_wp_error( $published ) ) {
				$campaign = $published;
				$page_id  = (int) $campaign['config']['placement']['page_id'];
				mmbb_demo_wide_page( $page_id, $campaign['id'] );
			}
		}
		$campaigns[ $key ] = array(
			'id'      => (int) $campaign['id'],
			'page_id' => $page_id,
			'config'  => $campaign['config'],
		);
	}

	if ( $campaigns['holiday']['page_id'] ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $campaigns['holiday']['page_id'] );
	}
	return $campaigns;
}

/**
 * Show the builder wide, under the theme header but without a page title.
 *
 * @param int $page_id     Page id.
 * @param int $campaign_id Campaign id.
 */
function mmbb_demo_wide_page( $page_id, $campaign_id ) {
	wp_update_post(
		array(
			'ID'           => $page_id,
			'post_content' => '<!-- wp:mmbb/box-builder {"campaignId":' . (int) $campaign_id . ',"align":"wide"} /-->',
		)
	);
	if ( array_key_exists( 'page-no-title', wp_get_theme()->get_page_templates() ) ) {
		update_post_meta( $page_id, '_wp_page_template', 'page-no-title' );
	}
}

/**
 * A header menu with the three boxes. Block themes fall back to the newest menu.
 *
 * @param array $campaigns Campaigns from mmbb_demo_campaigns().
 */
function mmbb_demo_navigation( array $campaigns ) {
	$links   = array(
		array( 'Shop', wc_get_page_id( 'shop' ) ),
		array( 'Holiday box', $campaigns['holiday']['page_id'] ),
		array( 'Spa kit', $campaigns['spa']['page_id'] ),
		array( 'Tea trio', $campaigns['trio']['page_id'] ),
	);
	$content = '';
	foreach ( $links as $link ) {
		if ( $link[1] > 0 ) {
			$content .= '<!-- wp:navigation-link ' . wp_json_encode(
				array(
					'label' => $link[0],
					'type'  => 'page',
					'id'    => (int) $link[1],
					'url'   => get_permalink( $link[1] ),
					'kind'  => 'post-type',
				)
			) . ' /-->';
		}
	}
	wp_insert_post(
		array(
			'post_type'    => 'wp_navigation',
			'post_status'  => 'publish',
			'post_title'   => 'Store menu',
			'post_content' => wp_slash( $content ),
		)
	);
}

/**
 * Fill 60 days of sample analytics so the Dashboard and Analytics screens have
 * something to show: daily funnel rows plus a sales ledger with made-up order ids.
 *
 * @param array $campaigns Campaigns from mmbb_demo_campaigns().
 * @param array $products  Products from mmbb_demo_products().
 */
function mmbb_demo_analytics( array $campaigns, array $products ) {
	global $wpdb;

	$weights = array();
	foreach ( $products as $row ) {
		$weights[ $row['id'] ] = $row['weight'];
	}

	// Boxes a day at the start, growth over the period, conversion, average unit price, and how boxes split across tiers.
	$plans = array(
		'holiday' => array( 6.5, 0.9, 0.085, 5.1, array( 3, 3.5, 3.5 ) ),
		'spa'     => array( 3.5, 0.4, 0.072, 8.2, array( 5.5, 4.5 ) ),
		'trio'    => array( 2.5, 0.2, 0.064, 7.4, array( 1 ) ),
	);

	$days     = 60;
	$today    = new DateTimeImmutable( 'today', wp_timezone() );
	$order_id = 900000;
	$sold     = array();
	foreach ( $plans as $key => $plan ) {
		if ( empty( $campaigns[ $key ]['page_id'] ) ) {
			continue;
		}
		list( $base, $growth, $conversion, $unit, $split ) = $plan;

		$config = $campaigns[ $key ]['config'];
		$tiers  = 'tiered' === $config['type'] ? $config['tiers'] : $config['sizes'];
		if ( 'bundle' === $config['type'] ) {
			$tiers = array(
				array(
					'qty'           => $config['bundle']['qty'],
					'discount_type' => 'box_price',
					'value'         => $config['bundle']['price'],
				),
			);
		}
		$pool = array_intersect_key( $weights, array_flip( $config['products']['ids'] ) );

		for ( $i = $days; $i >= 0; $i-- ) {
			$date    = $today->modify( '-' . $i . ' days' );
			$weekend = (int) $date->format( 'N' ) >= 6 ? 1.3 : 1;
			// Today is still in progress.
			$share = 0 === $i ? 0.45 : 1;
			$boxes = (int) round( $base * ( 1 + $growth * ( $days - $i ) / $days ) * $weekend * $share * wp_rand( 75, 125 ) / 100 );
			$views = (int) round( max( 1, $boxes ) / ( $conversion * wp_rand( 85, 115 ) / 100 ) );

			$picks = array();
			$left  = $boxes;
			foreach ( $tiers as $index => $tier ) {
				$count = count( $tiers ) - 1 === $index ? $left : min( $left, (int) round( $boxes * $split[ $index ] / array_sum( $split ) ) );
				$left -= $count;
				if ( $count < 1 ) {
					continue;
				}
				$items    = $count * (int) $tier['qty'];
				$subtotal = $items * $unit * wp_rand( 92, 108 ) / 100;
				if ( 'box_price' === $tier['discount_type'] ) {
					$value = $count * (float) $tier['value'];
				} else {
					$value = $subtotal * ( 1 - (float) $tier['value'] / 100 );
				}
				$wpdb->insert(
					$wpdb->prefix . 'mmbb_purchases',
					array(
						'order_id'    => ++$order_id,
						'line_id'     => 1,
						'campaign_id' => $campaigns[ $key ]['id'],
						'day'         => $date->format( 'Y-m-d' ),
						'boxes'       => $count,
						'items'       => $items,
						'tier'        => (int) $tier['qty'],
						'tier_data'   => wp_json_encode(
							array(
								'qty'           => (int) $tier['qty'],
								'discount_type' => $tier['discount_type'],
								'value'         => $tier['value'],
							)
						),
						'value'       => round( $value, 2 ),
						'discount'    => round( max( 0, $subtotal - $value ), 2 ),
					)
				);
				for ( $n = 0; $n < $items; $n++ ) {
					$id           = mmbb_demo_weighted( $pool );
					$picks[ $id ] = isset( $picks[ $id ] ) ? $picks[ $id ] + 1 : 1;
					$sold[ $id ]  = isset( $sold[ $id ] ) ? $sold[ $id ] + 1 : 1;
				}
			}
			ksort( $picks );

			$started = (int) round( $views * wp_rand( 38, 48 ) / 100 );
			$wpdb->insert(
				$wpdb->prefix . 'mmbb_stats_daily',
				array(
					'day'          => $date->format( 'Y-m-d' ),
					'campaign_id'  => $campaigns[ $key ]['id'],
					'views'        => $views,
					'started'      => $started,
					'tier_reached' => max( $boxes, (int) round( $started * wp_rand( 50, 62 ) / 100 ) ),
					'carts'        => (int) round( $boxes * wp_rand( 125, 145 ) / 100 ),
					'products'     => wp_json_encode( (object) $picks ),
				)
			);
		}
	}

	// Shop pages sort by popularity, so match it to the picks.
	foreach ( $sold as $id => $count ) {
		$product = wc_get_product( $id );
		if ( $product ) {
			$product->set_total_sales( (int) round( $count / 3 ) );
			$product->save();
		}
	}
	Query::bust();
}

/**
 * Pick a key at random, in proportion to its weight.
 *
 * @param array $weights Key => weight.
 * @return int|string
 */
function mmbb_demo_weighted( array $weights ) {
	$roll = wp_rand( 1, max( 1, (int) array_sum( $weights ) ) );
	foreach ( $weights as $key => $weight ) {
		$roll -= $weight;
		if ( $roll <= 0 ) {
			return $key;
		}
	}
	return key( $weights );
}

/**
 * Draw a product image and add it to the media library.
 *
 * @param string $slug  File name.
 * @param string $title Attachment title.
 * @param string $kind  Drawing from mmbb_demo_art().
 * @param array  $swap  Colour replacements, '#from' => '#to'.
 * @return int Attachment id, or 0 when GD is missing or the upload fails.
 */
function mmbb_demo_image( $slug, $title, $kind, array $swap ) {
	if ( ! function_exists( 'imagecreatetruecolor' ) ) {
		return 0;
	}
	$art = mmbb_demo_art();
	$art = $art[ $kind ];

	// Drawn at twice the size and scaled down, which smooths GD's hard edges.
	$scale = 12;
	$size  = 100 * $scale;
	$img   = imagecreatetruecolor( $size, $size );
	$color = static function ( $hex ) use ( $img, $swap ) {
		$hex = isset( $swap[ $hex ] ) ? $swap[ $hex ] : $hex;
		return imagecolorallocate( $img, hexdec( substr( $hex, 1, 2 ) ), hexdec( substr( $hex, 3, 2 ) ), hexdec( substr( $hex, 5, 2 ) ) );
	};
	$px    = static function ( $value ) use ( $scale ) {
		return (int) round( $value * $scale );
	};

	imagefilledrectangle( $img, 0, 0, $size - 1, $size - 1, $color( $art['bg'] ) );
	foreach ( $art['shapes'] as $shape ) {
		$fill = $color( end( $shape ) );
		switch ( $shape[0] ) {
			case 'circle':
				imagefilledellipse( $img, $px( $shape[1] ), $px( $shape[2] ), $px( 2 * $shape[3] ), $px( 2 * $shape[3] ), $fill );
				break;
			case 'rect':
				mmbb_demo_rounded( $img, $px( $shape[1] ), $px( $shape[2] ), $px( $shape[3] ), $px( $shape[4] ), $px( $shape[5] ), $fill );
				break;
			case 'line':
				// Axis-aligned stroke: x1, y1, x2, y2, width.
				$half = $shape[5] / 2;
				imagefilledrectangle( $img, $px( $shape[1] - ( $shape[1] === $shape[3] ? $half : 0 ) ), $px( $shape[2] - ( $shape[2] === $shape[4] ? $half : 0 ) ), $px( $shape[3] + ( $shape[1] === $shape[3] ? $half : 0 ) ), $px( $shape[4] + ( $shape[2] === $shape[4] ? $half : 0 ) ), $fill );
				break;
			case 'sprinkle':
				// A rounded bar: x, y, width, height, rotated by an angle around a point.
				list( , $x, $y, $w, $h, $angle, $ox, $oy ) = $shape;
				$ends                                      = array();
				foreach ( array( $x + $h / 2, $x + $w - $h / 2 ) as $ex ) {
					$rad    = deg2rad( $angle );
					$ey     = $y + $h / 2;
					$ends[] = array(
						$ox + ( $ex - $ox ) * cos( $rad ) - ( $ey - $oy ) * sin( $rad ),
						$oy + ( $ex - $ox ) * sin( $rad ) + ( $ey - $oy ) * cos( $rad ),
					);
				}
				imagesetthickness( $img, $px( $h ) );
				imageline( $img, $px( $ends[0][0] ), $px( $ends[0][1] ), $px( $ends[1][0] ), $px( $ends[1][1] ), $fill );
				imagesetthickness( $img, 1 );
				foreach ( $ends as $end ) {
					imagefilledellipse( $img, $px( $end[0] ), $px( $end[1] ), $px( $h ), $px( $h ), $fill );
				}
				break;
			case 'flame':
				$points = array();
				foreach ( mmbb_demo_flame() as $point ) {
					$points[] = $px( $point[0] );
					$points[] = $px( $point[1] );
				}
				// Playground runs PHP 8, where the point count is optional (and deprecated since 8.1).
				imagefilledpolygon( $img, $points, $fill ); // phpcs:ignore PHPCompatibility.FunctionUse.RequiredToOptionalFunctionParameters
				break;
		}
	}

	$out = imagecreatetruecolor( 600, 600 );
	imagecopyresampled( $out, $img, 0, 0, 0, 0, 600, 600, $size, $size );
	$file = wp_tempnam( $slug . '.png' );
	imagepng( $out, $file, 6 );

	$id = media_handle_sideload(
		array(
			'name'     => $slug . '.png',
			'tmp_name' => $file,
		),
		0,
		$title
	);
	if ( is_wp_error( $id ) ) {
		wp_delete_file( $file );
		return 0;
	}
	update_post_meta( $id, '_wp_attachment_image_alt', $title );
	return (int) $id;
}

/**
 * A filled rounded rectangle in pixels.
 *
 * @param resource|\GdImage $img    Image.
 * @param int               $x      Left.
 * @param int               $y      Top.
 * @param int               $w      Width.
 * @param int               $h      Height.
 * @param int               $r      Corner radius.
 * @param int               $fill   Colour.
 */
function mmbb_demo_rounded( $img, $x, $y, $w, $h, $r, $fill ) {
	$r = min( $r, (int) floor( $w / 2 ), (int) floor( $h / 2 ) );
	if ( $r < 1 ) {
		imagefilledrectangle( $img, $x, $y, $x + $w - 1, $y + $h - 1, $fill );
		return;
	}
	imagefilledrectangle( $img, $x + $r, $y, $x + $w - $r - 1, $y + $h - 1, $fill );
	imagefilledrectangle( $img, $x, $y + $r, $x + $w - 1, $y + $h - $r - 1, $fill );
	foreach ( array( array( $x + $r, $y + $r ), array( $x + $w - $r - 1, $y + $r ), array( $x + $r, $y + $h - $r - 1 ), array( $x + $w - $r - 1, $y + $h - $r - 1 ) ) as $corner ) {
		imagefilledellipse( $img, $corner[0], $corner[1], 2 * $r, 2 * $r, $fill );
	}
}

/**
 * The candle flame from ProductArt, `M50 17c4 5 5 8 5 10a5 5 0 0 1-10 0c0-2 1-5 5-10z`, as points.
 *
 * @return array[] Points in the 100 × 100 view box.
 */
function mmbb_demo_flame() {
	$curve  = static function ( $p0, $p1, $p2, $p3, $t ) {
		$u = 1 - $t;
		return array(
			$u * $u * $u * $p0[0] + 3 * $u * $u * $t * $p1[0] + 3 * $u * $t * $t * $p2[0] + $t * $t * $t * $p3[0],
			$u * $u * $u * $p0[1] + 3 * $u * $u * $t * $p1[1] + 3 * $u * $t * $t * $p2[1] + $t * $t * $t * $p3[1],
		);
	};
	$points = array();
	for ( $i = 0; $i <= 16; $i++ ) {
		$points[] = $curve( array( 50, 17 ), array( 54, 22 ), array( 55, 25 ), array( 55, 27 ), $i / 16 );
	}
	for ( $i = 1; $i < 16; $i++ ) {
		$points[] = array( 50 + 5 * cos( M_PI * $i / 16 ), 27 + 5 * sin( M_PI * $i / 16 ) );
	}
	for ( $i = 0; $i <= 16; $i++ ) {
		$points[] = $curve( array( 45, 27 ), array( 45, 25 ), array( 46, 22 ), array( 50, 17 ), $i / 16 );
	}
	return $points;
}

/**
 * The drawings from src/components/ProductArt.js, in its 100 × 100 view box.
 * Shapes: circle (cx, cy, r), rect (x, y, w, h, radius), line (x1, y1, x2, y2, width),
 * sprinkle (x, y, w, h, angle, origin x, origin y) and flame. The colour comes last.
 *
 * @return array[]
 */
function mmbb_demo_art() {
	return array(
		'cookie'    => array(
			'bg'     => '#f3e3cc',
			'shapes' => array(
				array( 'circle', 50, 52, 27, '#c98a4b' ),
				array( 'circle', 41, 44, 3.5, '#5a3519' ),
				array( 'circle', 58, 47, 3, '#5a3519' ),
				array( 'circle', 47, 60, 3.5, '#5a3519' ),
				array( 'circle', 61, 61, 2.5, '#5a3519' ),
				array( 'circle', 37, 56, 2.2, '#5a3519' ),
			),
		),
		'macaron'   => array(
			'bg'     => '#f6dfe6',
			'shapes' => array(
				array( 'rect', 26, 33, 48, 16, 8, '#e88aa6' ),
				array( 'rect', 29, 47, 42, 8, 4, '#fff3e8' ),
				array( 'rect', 26, 53, 48, 16, 8, '#e88aa6' ),
			),
		),
		'candle'    => array(
			'bg'     => '#e5ece4',
			'shapes' => array(
				array( 'rect', 33, 38, 34, 36, 6, '#f7f3ea' ),
				array( 'rect', 33, 52, 34, 10, 0, '#7d9a7a' ),
				array( 'rect', 49, 30, 2, 9, 0, '#3b3b3b' ),
				array( 'flame', '#f2a541' ),
			),
		),
		'soap'      => array(
			'bg'     => '#e4ecf2',
			'shapes' => array(
				array( 'rect', 24, 36, 52, 30, 12, '#a9c6dc' ),
				array( 'rect', 32, 42, 22, 6, 3, '#d6e6f1' ),
			),
		),
		'tea'       => array(
			'bg'     => '#efe8d8',
			'shapes' => array(
				array( 'rect', 34, 30, 32, 44, 4, '#3f6b5c' ),
				array( 'rect', 32, 26, 36, 9, 3, '#2f5246' ),
				array( 'rect', 34, 46, 32, 14, 0, '#e8d9b5' ),
			),
		),
		'donut'     => array(
			'bg'     => '#fbe6d4',
			'shapes' => array(
				array( 'circle', 50, 52, 26, '#e2a86b' ),
				array( 'circle', 50, 50, 22, '#d9577a' ),
				array( 'circle', 50, 50, 8, '#fbe6d4' ),
				array( 'sprinkle', 36, 38, 7, 2.5, -30, 39, 39, '#fff3e8' ),
				array( 'sprinkle', 58, 40, 7, 2.5, 40, 61, 41, '#ffd23f' ),
				array( 'sprinkle', 55, 60, 7, 2.5, -10, 58, 61, '#fff3e8' ),
				array( 'sprinkle', 37, 58, 7, 2.5, 25, 40, 59, '#ffd23f' ),
			),
		),
		'chocolate' => array(
			'bg'     => '#eadcd2',
			'shapes' => array(
				array( 'rect', 28, 28, 44, 46, 4, '#6b3e26' ),
				array( 'line', 28, 43.3, 72, 43.3, 2, '#4e2b19' ),
				array( 'line', 28, 58.6, 72, 58.6, 2, '#4e2b19' ),
				array( 'line', 42.7, 28, 42.7, 74, 2, '#4e2b19' ),
				array( 'line', 57.3, 28, 57.3, 74, 2, '#4e2b19' ),
			),
		),
		'honey'     => array(
			'bg'     => '#fbefd0',
			'shapes' => array(
				array( 'rect', 32, 36, 36, 38, 8, '#e6a52c' ),
				array( 'rect', 34, 28, 32, 10, 3, '#6b4a1f' ),
				array( 'rect', 38, 48, 24, 14, 3, '#fff7e0' ),
			),
		),
	);
}
