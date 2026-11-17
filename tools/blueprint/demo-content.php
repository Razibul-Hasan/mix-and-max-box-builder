<?php
/**
 * Demo store for the WordPress.org live preview (WordPress Playground).
 *
 * The blueprint built by tools/blueprint/build.mjs writes the product photos to
 * /tmp/mmbb-demo/, inlines this file, writes it to /tmp and calls mmbb_demo_seed()
 * once WooCommerce and the plugin are active. It is never shipped in the plugin zip.
 *
 * The store has ten live box campaigns, one for each storefront design template,
 * each on its own page, plus a gallery page that links them all.
 *
 * @package MixMax\BoxBuilder
 */

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- Seeds the plugin's own analytics tables once, in a throwaway Playground site.

use MixMax\BoxBuilder\Analytics\Query;
use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Config;
use MixMax\BoxBuilder\Campaigns\Publisher;

/** Where the blueprint puts the product photos. */
const MMBB_DEMO_PHOTOS = '/tmp/mmbb-demo';

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
	$gallery   = mmbb_demo_gallery_page();
	mmbb_demo_navigation( $campaigns, $gallery );
	mmbb_demo_analytics( $campaigns, $products );

	$pages = array();
	foreach ( $campaigns as $key => $campaign ) {
		if ( $campaign['page_id'] ) {
			$pages[] = array(
				'key'      => $key,
				'template' => $campaign['template'],
				'name'     => $campaign['name'],
				'title'    => $campaign['title'],
				'type'     => $campaign['type'],
				'blurb'    => $campaign['blurb'],
				'page_id'  => $campaign['page_id'],
				'campaign' => $campaign['id'],
				'images'   => $campaign['images'],
			);
		}
	}
	update_option(
		'mmbb_demo_links',
		array(
			'gallery'  => $gallery,
			'pages'    => $pages,
			'campaign' => $pages ? $pages[0]['campaign'] : 0,
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
		'blogname'                                 => 'Common Goods',
		'blogdescription'                          => 'Coffee, self-care and everyday objects, boxed your way',
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
 * Create the categories and products, each with its photo.
 *
 * @return array Product rows from mmbb_demo_catalog(), keyed by slug, with `id` and `image` added.
 */
function mmbb_demo_products() {
	$categories = array();
	foreach ( array(
		'coffee-tea'  => 'Coffee & tea',
		'sweets'      => 'Sweets',
		'self-care'   => 'Self-care',
		'home'        => 'Home',
		'accessories' => 'Accessories',
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
		$product->set_description( $row['blurb'] );
		$product->set_category_ids( array( $categories[ $row['cat'] ] ) );
		if ( isset( $row['stock'] ) ) {
			$product->set_manage_stock( true );
			$product->set_stock_quantity( $row['stock'] );
			$product->set_stock_status( $row['stock'] > 0 ? 'instock' : 'outofstock' );
		}
		$row['image'] = mmbb_demo_photo( $slug, $row['name'] );
		if ( $row['image'] ) {
			$product->set_image_id( $row['image'] );
		}
		$row['id']         = $product->save();
		$products[ $slug ] = $row;
	}
	return $products;
}

/**
 * The demo catalog. `photo` is an Unsplash photo id (free to use under the
 * Unsplash license); build.mjs downloads each one. `weight` is how often
 * shoppers pick it in the seeded analytics.
 *
 * Keep the slugs and photo ids in step with PHOTOS in build.mjs.
 *
 * @return array[]
 */
function mmbb_demo_catalog() {
	return array(
		// Coffee & tea.
		'espresso-roast'       => array( 'name' => 'Espresso Roast', 'cat' => 'coffee-tea', 'price' => '16.00', 'weight' => 10, 'blurb' => 'Chocolatey dark roast for espresso and moka pot. 250 g whole bean.' ),
		'pour-over-blend'      => array( 'name' => 'Pour-Over Blend', 'cat' => 'coffee-tea', 'price' => '18.00', 'sale' => '15.00', 'weight' => 8, 'blurb' => 'Bright, fruity light roast made for filter brewing. 250 g.' ),
		'barista-latte-kit'    => array( 'name' => 'Barista Latte Kit', 'cat' => 'coffee-tea', 'price' => '22.00', 'weight' => 6, 'blurb' => 'Espresso blend, cocoa dust and a stencil for latte art at home.' ),
		'breakfast-leaf-tea'   => array( 'name' => 'Breakfast Leaf Tea', 'cat' => 'coffee-tea', 'price' => '12.00', 'weight' => 7, 'blurb' => 'Malty Assam and Ceylon loose leaf. 100 g tin.' ),
		'herbal-tea-sachets'   => array( 'name' => 'Herbal Tea Sachets', 'cat' => 'coffee-tea', 'price' => '9.50', 'weight' => 6, 'blurb' => 'Chamomile, mint and lemongrass pyramids. 15 sachets.' ),
		'cold-brew-black-tea'  => array( 'name' => 'Cold-Brew Black Tea', 'cat' => 'coffee-tea', 'price' => '10.00', 'weight' => 4, 'blurb' => 'Steep overnight for a smooth iced tea. 12 bags.' ),
		'raw-wildflower-honey' => array( 'name' => 'Raw Wildflower Honey', 'cat' => 'coffee-tea', 'price' => '11.00', 'stock' => 6, 'weight' => 6, 'blurb' => 'Unfiltered honey from small local apiaries. 340 g jar.' ),
		// Sweets.
		'brown-butter-cookies' => array( 'name' => 'Brown Butter Cookies', 'cat' => 'sweets', 'price' => '8.00', 'weight' => 10, 'blurb' => 'Six chewy cookies with pools of dark chocolate.' ),
		'bakery-cookie-bag'    => array( 'name' => 'Bakery Cookie Bag', 'cat' => 'sweets', 'price' => '12.00', 'sale' => '9.60', 'weight' => 7, 'blurb' => 'A dozen classic chocolate chip cookies, baked fresh.' ),
		'dark-chocolate-shards' => array( 'name' => '70% Dark Shards', 'cat' => 'sweets', 'price' => '7.50', 'weight' => 6, 'blurb' => 'Single-origin dark chocolate, broken by hand. 120 g.' ),
		'white-almond-bar'     => array( 'name' => 'White Chocolate Almond', 'cat' => 'sweets', 'price' => '7.00', 'weight' => 4, 'blurb' => 'Creamy white chocolate with roasted almonds. 100 g.' ),
		'salted-chocolate-bark' => array( 'name' => 'Salted Chocolate Bark', 'cat' => 'sweets', 'price' => '9.00', 'weight' => 5, 'blurb' => 'Dark chocolate bark with sea salt, nuts and dried fruit.' ),
		// Self-care.
		'amber-face-serum'     => array( 'name' => 'Amber Face Serum', 'cat' => 'self-care', 'price' => '28.00', 'weight' => 8, 'blurb' => 'Vitamin C serum in an amber dropper bottle. 30 ml.' ),
		'botanical-face-oil'   => array( 'name' => 'Botanical Face Oil', 'cat' => 'self-care', 'price' => '24.00', 'weight' => 7, 'blurb' => 'Squalane and rosehip for a dewy finish. 30 ml.' ),
		'charcoal-clay-mask'   => array( 'name' => 'Charcoal Clay Mask', 'cat' => 'self-care', 'price' => '19.00', 'weight' => 5, 'blurb' => 'Deep-cleansing mask with activated charcoal. 50 ml.' ),
		'herbal-body-oil'      => array( 'name' => 'Herbal Body Oil', 'cat' => 'self-care', 'price' => '21.00', 'sale' => '17.00', 'weight' => 6, 'blurb' => 'Lavender and cedar body oil for after the shower. 100 ml.' ),
		'hemp-seed-balm'       => array( 'name' => 'Hemp Seed Balm', 'cat' => 'self-care', 'price' => '16.00', 'weight' => 4, 'blurb' => 'Rich balm for hands, elbows and heels. 60 g.' ),
		'shower-trio'          => array( 'name' => 'Shower Essentials Trio', 'cat' => 'self-care', 'price' => '32.00', 'weight' => 5, 'blurb' => 'Shampoo, conditioner and body wash in refillable bottles.' ),
		'nail-cuticle-oil'     => array( 'name' => 'Nail & Cuticle Oil', 'cat' => 'self-care', 'price' => '12.00', 'weight' => 4, 'blurb' => 'Jojoba nail oil with a precision brush. 10 ml.' ),
		'makeup-brush-set'     => array( 'name' => 'Makeup Brush Set', 'cat' => 'self-care', 'price' => '26.00', 'stock' => 0, 'weight' => 2, 'blurb' => 'Five vegan brushes for face and eyes.' ),
		// Home.
		'amber-soy-candle'     => array( 'name' => 'Amber Soy Candle', 'cat' => 'home', 'price' => '18.00', 'sale' => '14.40', 'stock' => 4, 'weight' => 8, 'blurb' => 'Hand-poured soy wax with amber and vanilla. 40-hour burn.' ),
		'everyday-mug'         => array( 'name' => 'Everyday Ceramic Mug', 'cat' => 'home', 'price' => '14.00', 'weight' => 7, 'blurb' => 'Matte white stoneware mug. 350 ml.' ),
		'stoneware-cup-set'    => array( 'name' => 'Stoneware Cup Set', 'cat' => 'home', 'price' => '30.00', 'weight' => 5, 'blurb' => 'Four handleless cups with a speckled glaze.' ),
		'oak-serving-board'    => array( 'name' => 'Oak Serving Board', 'cat' => 'home', 'price' => '34.00', 'weight' => 4, 'blurb' => 'Solid oak board for bread, cheese and brunch.' ),
		'ivory-bud-vase'       => array( 'name' => 'Ivory Bud Vase', 'cat' => 'home', 'price' => '22.00', 'weight' => 5, 'blurb' => 'Hand-thrown ceramic vase with a soft matte glaze.' ),
		'dot-grid-notebook'    => array( 'name' => 'Dot-Grid Notebook', 'cat' => 'home', 'price' => '9.00', 'weight' => 6, 'blurb' => 'A5 lay-flat notebook with 160 dotted pages.' ),
		// Accessories.
		'insulated-bottle'     => array( 'name' => 'Insulated Steel Bottle', 'cat' => 'accessories', 'price' => '24.00', 'weight' => 7, 'blurb' => 'Keeps drinks cold for 24 hours. 500 ml.' ),
		'canvas-market-tote'   => array( 'name' => 'Canvas Market Tote', 'cat' => 'accessories', 'price' => '15.00', 'weight' => 6, 'blurb' => 'Heavy cotton tote with long shoulder handles.' ),
		'round-sunglasses'     => array( 'name' => 'Round Sunglasses', 'cat' => 'accessories', 'price' => '38.00', 'weight' => 5, 'blurb' => 'Gold wire frames with polarised green lenses.' ),
		'minimal-white-watch'  => array( 'name' => 'Minimal White Watch', 'cat' => 'accessories', 'price' => '59.00', 'sale' => '49.00', 'weight' => 6, 'blurb' => 'Clean dial and silicone strap. Water resistant to 50 m.' ),
		'studio-headphones'    => array( 'name' => 'Studio Headphones', 'cat' => 'accessories', 'price' => '69.00', 'weight' => 4, 'blurb' => 'Closed-back over-ear headphones with a 3 m cable.' ),
		'tan-crossbody-bag'    => array( 'name' => 'Tan Crossbody Bag', 'cat' => 'accessories', 'price' => '48.00', 'stock' => 3, 'weight' => 4, 'blurb' => 'Vegan leather bag with an adjustable strap.' ),
		'filigree-bracelet'    => array( 'name' => 'Filigree Gold Bracelet', 'cat' => 'accessories', 'price' => '36.00', 'weight' => 3, 'blurb' => 'Gold-plated bracelet with an openwork pattern.' ),
	);
}

/**
 * The ten campaigns, one per storefront design template.
 *
 * `starter` is the plugin's own campaign starter the campaign is created from;
 * `config` is saved on top, exactly as the editor would save it.
 *
 * @param callable $ids Slugs to product ids.
 * @param callable $day Days from now to an ISO date.
 * @return array[]
 */
function mmbb_demo_plans( $ids, $day ) {
	$step = static function ( $qty, $type, $value, $tag = '' ) {
		$row = array(
			'qty'           => $qty,
			'discount_type' => $type,
			'value'         => $value,
		);
		if ( '' !== $tag ) {
			$row['tag'] = $tag;
		}
		return $row;
	};

	return array(
		'coffee'    => array(
			'template' => 'spotlight',
			'starter'  => 'holiday',
			'title'    => 'Coffee Break Box',
			'slug'     => 'coffee-break-box',
			'blurb'    => 'Tiered discounts that grow with the box, a live countdown and a discount ladder.',
			'config'   => array(
				'type'     => 'tiered',
				'box'      => array(
					'capacity'         => 12,
					'min_items'        => 4,
					'allow_duplicates' => true,
					'max_per_product'  => 6,
				),
				'tiers'    => array( $step( 4, 'percent', 10 ), $step( 8, 'percent', 15 ), $step( 12, 'percent', 25 ) ),
				'products' => array( 'ids' => $ids( array( 'espresso-roast', 'pour-over-blend', 'barista-latte-kit', 'breakfast-leaf-tea', 'herbal-tea-sachets', 'raw-wildflower-honey', 'brown-butter-cookies', 'bakery-cookie-bag', 'dark-chocolate-shards', 'salted-chocolate-bark', 'everyday-mug', 'amber-soy-candle' ) ) ),
				'schedule' => array(
					'end'            => $day( 9 ),
					'countdown_days' => 14,
				),
				'extras'   => array( 'gift_message' => true ),
				'design'   => array(
					'headline' => 'Mix any 12. Save up to 25%.',
					'intro'    => 'Beans, tea and something sweet, packed in one box. The more you add, the more you save.',
					'sticker'  => 'Best seller',
				),
			),
		),
		'desk'      => array(
			'template' => 'clean',
			'starter'  => 'spa',
			'title'    => 'Desk Essentials Kit',
			'slug'     => 'desk-essentials-kit',
			'blurb'    => 'A quiet product list with two fixed box sizes and a size tag on each.',
			'config'   => array(
				'type'     => 'fixed',
				'box'      => array(
					'capacity'         => 5,
					'min_items'        => 3,
					'allow_duplicates' => false,
					'max_per_product'  => 1,
				),
				'sizes'    => array( $step( 3, 'percent', 10, 'popular' ), $step( 5, 'percent', 18, 'best_value' ) ),
				'products' => array( 'ids' => $ids( array( 'dot-grid-notebook', 'everyday-mug', 'insulated-bottle', 'studio-headphones', 'minimal-white-watch', 'canvas-market-tote', 'ivory-bud-vase', 'espresso-roast' ) ) ),
				'extras'   => array(
					'gift_wrap' => array(
						'enabled' => false,
						'fee'     => 0,
					),
				),
				'design'   => array(
					'headline' => 'Build your desk kit',
					'intro'    => 'Pick 3 or 5 everyday pieces for the desk. The bigger kit saves you 18%.',
					'sticker'  => 'Save 18%',
				),
			),
		),
		'ritual'    => array(
			'template' => 'steps',
			'starter'  => 'spa',
			'title'    => 'Self-Care Ritual',
			'slug'     => 'self-care-ritual',
			'blurb'    => 'Guided steps walk shoppers through size, products and gift wrap.',
			'config'   => array(
				'type'     => 'fixed',
				'box'      => array(
					'capacity'         => 6,
					'min_items'        => 4,
					'allow_duplicates' => false,
					'max_per_product'  => 1,
				),
				'sizes'    => array( $step( 4, 'percent', 10, 'popular' ), $step( 6, 'percent', 15, 'best_value' ) ),
				'products' => array( 'ids' => $ids( array( 'amber-face-serum', 'botanical-face-oil', 'charcoal-clay-mask', 'herbal-body-oil', 'hemp-seed-balm', 'shower-trio', 'nail-cuticle-oil', 'amber-soy-candle', 'herbal-tea-sachets', 'makeup-brush-set' ) ) ),
				'extras'   => array(
					'gift_wrap' => array(
						'enabled' => true,
						'fee'     => 4,
					),
				),
				'design'   => array(
					'headline' => 'Your self-care ritual, in three steps',
					'intro'    => 'Choose a size, fill it with favourites and add gift wrap if it is for someone else.',
					'sticker'  => 'Save up to 15%',
				),
			),
		),
		'gift'      => array(
			'template' => 'gift',
			'starter'  => 'gift',
			'title'    => 'Build-a-Gift Box',
			'slug'     => 'build-a-gift',
			'blurb'    => 'A gift tray with a handwritten note, gift wrap and no prices on the packing slip.',
			'config'   => array(
				'type'     => 'fixed',
				'box'      => array(
					'capacity'         => 4,
					'min_items'        => 4,
					'allow_duplicates' => false,
					'max_per_product'  => 1,
				),
				'sizes'    => array( $step( 4, 'percent', 10 ) ),
				'products' => array( 'ids' => $ids( array( 'amber-soy-candle', 'raw-wildflower-honey', 'breakfast-leaf-tea', 'salted-chocolate-bark', 'everyday-mug', 'ivory-bud-vase', 'botanical-face-oil', 'filigree-bracelet' ) ) ),
				'extras'   => array(
					'gift_message' => true,
					'gift_wrap'    => array(
						'enabled' => true,
						'fee'     => 5,
					),
				),
				'design'   => array(
					'headline' => 'Four thoughtful things, one gift',
					'intro'    => 'Fill the tray with four favourites. We wrap it, tuck in your note and leave the prices out.',
					'sticker'  => 'Gift ready',
				),
			),
		),
		'travel'    => array(
			'template' => 'bold',
			'starter'  => 'holiday',
			'title'    => 'Travel Essentials',
			'slug'     => 'travel-essentials',
			'blurb'    => 'Big colour blocks and a bold ladder for a short, punchy tiered offer.',
			'config'   => array(
				'type'     => 'tiered',
				'box'      => array(
					'capacity'         => 8,
					'min_items'        => 3,
					'allow_duplicates' => false,
					'max_per_product'  => 1,
				),
				'tiers'    => array( $step( 3, 'percent', 10 ), $step( 5, 'percent', 15 ), $step( 8, 'percent', 20 ) ),
				'products' => array( 'ids' => $ids( array( 'insulated-bottle', 'round-sunglasses', 'studio-headphones', 'canvas-market-tote', 'minimal-white-watch', 'dot-grid-notebook', 'hemp-seed-balm', 'nail-cuticle-oil', 'cold-brew-black-tea', 'tan-crossbody-bag' ) ) ),
				'schedule' => array(
					'countdown_days' => 0,
				),
				'design'   => array(
					'headline' => 'Pack smarter. Save up to 20%.',
					'intro'    => 'Carry-on favourites for the next trip. Add 3, 5 or 8 and the discount steps up.',
					'sticker'  => 'Up to 20% off',
				),
			),
		),
		'glow'      => array(
			'template' => 'pastel',
			'starter'  => 'snack',
			'title'    => 'Glow Skincare Bundle',
			'slug'     => 'glow-skincare-bundle',
			'blurb'    => 'Soft pastel bundle: any 3 skincare picks for one fixed price.',
			'config'   => array(
				'type'     => 'bundle',
				'box'      => array(
					'capacity'         => 3,
					'min_items'        => 3,
					'allow_duplicates' => false,
					'max_per_product'  => 1,
				),
				'bundle'   => array(
					'qty'   => 3,
					'price' => 55,
				),
				'products' => array( 'ids' => $ids( array( 'amber-face-serum', 'botanical-face-oil', 'charcoal-clay-mask', 'herbal-body-oil', 'hemp-seed-balm', 'shower-trio', 'nail-cuticle-oil', 'makeup-brush-set' ) ) ),
				'design'   => array(
					'headline' => 'Any 3 for $55',
					'intro'    => 'Build a glow routine from our skincare shelf. Three products, one simple price.',
					'sticker'  => 'Bundle price',
				),
			),
		),
		'tea'       => array(
			'template' => 'editorial',
			'starter'  => 'snack',
			'title'    => 'The Tea Edit',
			'slug'     => 'the-tea-edit',
			'blurb'    => 'Magazine-style serif layout for a curated, story-led bundle.',
			'config'   => array(
				'type'     => 'bundle',
				'box'      => array(
					'capacity'         => 3,
					'min_items'        => 3,
					'allow_duplicates' => true,
					'max_per_product'  => 2,
				),
				'bundle'   => array(
					'qty'   => 3,
					'price' => 30,
				),
				'products' => array( 'ids' => $ids( array( 'breakfast-leaf-tea', 'herbal-tea-sachets', 'cold-brew-black-tea', 'raw-wildflower-honey', 'everyday-mug', 'brown-butter-cookies', 'white-almond-bar' ) ) ),
				'schedule' => array(
					'end'            => $day( 4 ),
					'countdown_days' => 7,
				),
				'design'   => array(
					'headline' => 'The Tea Edit: any three, $30',
					'intro'    => 'A slow afternoon in a box. Pair a leaf tea with honey, a mug or something sweet.',
					'sticker'  => 'Editor’s pick',
				),
			),
		),
		'midnight'  => array(
			'template' => 'night',
			'starter'  => 'snack',
			'title'    => 'Midnight Snack Box',
			'slug'     => 'midnight-snack-box',
			'blurb'    => 'A dark, neon-accented bundle: any 6 sweets for one price.',
			'config'   => array(
				'type'     => 'bundle',
				'box'      => array(
					'capacity'         => 6,
					'min_items'        => 6,
					'allow_duplicates' => true,
					'max_per_product'  => 6,
				),
				'bundle'   => array(
					'qty'   => 6,
					'price' => 42,
				),
				'products' => array( 'ids' => $ids( array( 'brown-butter-cookies', 'bakery-cookie-bag', 'dark-chocolate-shards', 'white-almond-bar', 'salted-chocolate-bark', 'cold-brew-black-tea', 'espresso-roast' ) ) ),
				'design'   => array(
					'headline' => 'Any 6 late-night treats for $42',
					'intro'    => 'Cookies, chocolate and a little caffeine. Mix freely, doubles welcome.',
					'sticker'  => 'After dark',
				),
			),
		),
		'ceramics'  => array(
			'template' => 'split',
			'starter'  => 'spa',
			'title'    => 'Home Ceramics Set',
			'slug'     => 'home-ceramics-set',
			'blurb'    => 'Split screen: products on one side, the box always in view on the other.',
			'config'   => array(
				'type'     => 'fixed',
				'box'      => array(
					'capacity'         => 4,
					'min_items'        => 2,
					'allow_duplicates' => true,
					'max_per_product'  => 2,
				),
				'sizes'    => array( $step( 2, 'percent', 8 ), $step( 4, 'percent', 15, 'best_value' ) ),
				'products' => array( 'ids' => $ids( array( 'everyday-mug', 'stoneware-cup-set', 'oak-serving-board', 'ivory-bud-vase', 'amber-soy-candle', 'dot-grid-notebook' ) ) ),
				'extras'   => array(
					'gift_wrap' => array(
						'enabled' => false,
						'fee'     => 0,
					),
				),
				'design'   => array(
					'headline' => 'Set the table, your way',
					'intro'    => 'Pair two pieces or style a set of four. Duplicates allowed, so matching sets are easy.',
					'sticker'  => 'Save 15%',
				),
			),
		),
		'accessory' => array(
			'template' => 'compact',
			'starter'  => 'holiday',
			'title'    => 'Accessories Mix',
			'slug'     => 'accessories-mix',
			'blurb'    => 'Compact cards that fit more products on screen, made for phones.',
			'config'   => array(
				'type'     => 'tiered',
				'box'      => array(
					'capacity'         => 6,
					'min_items'        => 2,
					'allow_duplicates' => false,
					'max_per_product'  => 1,
				),
				'tiers'    => array( $step( 2, 'percent', 10 ), $step( 4, 'percent', 20 ), $step( 6, 'fixed_amount', 50 ) ),
				'products' => array( 'ids' => $ids( array( 'round-sunglasses', 'minimal-white-watch', 'filigree-bracelet', 'tan-crossbody-bag', 'canvas-market-tote', 'insulated-bottle', 'studio-headphones' ) ) ),
				'schedule' => array(
					'countdown_days' => 0,
				),
				'design'   => array(
					'headline' => 'Mix accessories, unlock up to $50 off',
					'intro'    => '10% off two, 20% off four, and $50 off a full box of six.',
					'sticker'  => 'Mix & save',
				),
			),
		),
	);
}

/**
 * Create the campaigns through the plugin's own repository and publisher, so
 * they are exactly what the editor would save, and publish each to its page.
 *
 * @param array $products Products from mmbb_demo_products().
 * @return array Keyed by campaign: { id, page_id, config, template, name, title, type, blurb, images }.
 */
function mmbb_demo_campaigns( array $products ) {
	$ids = static function ( array $slugs ) use ( $products ) {
		$list = array();
		foreach ( $slugs as $slug ) {
			if ( isset( $products[ $slug ] ) ) {
				$list[] = $products[ $slug ]['id'];
			}
		}
		return $list;
	};
	$day = static function ( $days ) {
		return gmdate( 'Y-m-d\TH:i:s\Z', time() + $days * DAY_IN_SECONDS );
	};
	$images = array();
	foreach ( $products as $row ) {
		$images[ $row['id'] ] = $row['image'];
	}
	$names = array(
		'spotlight' => 'Spotlight',
		'clean'     => 'Clean list',
		'steps'     => 'Guided steps',
		'gift'      => 'Gift tray',
		'bold'      => 'Color block',
		'pastel'    => 'Pastel',
		'editorial' => 'Editorial',
		'night'     => 'Night',
		'split'     => 'Split screen',
		'compact'   => 'Compact card',
	);
	$types = array(
		'tiered' => 'Tiered discount',
		'fixed'  => 'Fixed box sizes',
		'bundle' => 'Bundle price',
	);

	$repo      = new Campaign_Repository();
	$publisher = new Publisher( $repo );
	$campaigns = array();
	// Created in reverse, so the campaign list (newest first) reads in gallery order.
	foreach ( array_reverse( mmbb_demo_plans( $ids, $day ), true ) as $key => $plan ) {
		$campaign = $repo->create_from_template( $plan['starter'], $plan['title'] );
		if ( is_wp_error( $campaign ) ) {
			continue;
		}
		$config                       = $plan['config'];
		$config['products']['source'] = 'manual';
		$config['products']['order']  = 'manual';
		$config['design']['template'] = $plan['template'];

		$campaign = $repo->save( $campaign['id'], $config );
		if ( is_wp_error( $campaign ) ) {
			continue;
		}
		$page_id = 0;
		if ( ! Config::validate( $campaign['config'] ) ) {
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
				mmbb_demo_wide_page( $page_id, $campaign['id'], $plan['template'] );
			}
		}
		$campaigns[ $key ] = array(
			'id'       => (int) $campaign['id'],
			'page_id'  => $page_id,
			'config'   => $campaign['config'],
			'template' => $plan['template'],
			'name'     => $names[ $plan['template'] ],
			'title'    => $plan['title'],
			'type'     => $types[ $campaign['config']['type'] ],
			'blurb'    => $plan['blurb'],
			'images'   => array_values( array_filter( array_map( static function ( $id ) use ( $images ) {
				return isset( $images[ $id ] ) ? (int) $images[ $id ] : 0;
			}, array_slice( $campaign['config']['products']['ids'], 0, 3 ) ) ) ),
		);
	}
	return array_reverse( $campaigns, true );
}

/**
 * Show the builder wide, under the theme header but without a page title.
 *
 * @param int    $page_id     Page id.
 * @param int    $campaign_id Campaign id.
 * @param string $template    Design template, remembered for the demo navigation.
 */
function mmbb_demo_wide_page( $page_id, $campaign_id, $template ) {
	wp_update_post(
		array(
			'ID'           => $page_id,
			'post_content' => '<!-- wp:mmbb/box-builder {"campaignId":' . (int) $campaign_id . ',"align":"wide"} /-->',
		)
	);
	update_post_meta( $page_id, '_mmbb_demo_template', $template );
	if ( array_key_exists( 'page-no-title', wp_get_theme()->get_page_templates() ) ) {
		update_post_meta( $page_id, '_wp_page_template', 'page-no-title' );
	}
}

/**
 * The front page: a gallery of the ten templates. demo-site.php renders the shortcode.
 *
 * @return int Page id.
 */
function mmbb_demo_gallery_page() {
	$page_id = wp_insert_post(
		array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_title'   => 'Templates',
			'post_name'    => 'templates',
			'post_content' => '<!-- wp:shortcode -->[mmbb_demo_gallery]<!-- /wp:shortcode -->',
		)
	);
	if ( is_wp_error( $page_id ) || ! $page_id ) {
		return 0;
	}
	if ( array_key_exists( 'page-no-title', wp_get_theme()->get_page_templates() ) ) {
		update_post_meta( $page_id, '_wp_page_template', 'page-no-title' );
	}
	update_option( 'show_on_front', 'page' );
	update_option( 'page_on_front', $page_id );
	return (int) $page_id;
}

/**
 * A short header menu. Block themes fall back to the newest menu.
 *
 * @param array $campaigns Campaigns from mmbb_demo_campaigns().
 * @param int   $gallery   Gallery page id.
 */
function mmbb_demo_navigation( array $campaigns, $gallery ) {
	$first   = reset( $campaigns );
	$links   = array(
		array( 'All templates', $gallery ),
		array( 'Live box', $first ? $first['page_id'] : 0 ),
		array( 'Shop', wc_get_page_id( 'shop' ) ),
		array( 'Cart', wc_get_page_id( 'cart' ) ),
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

	// Boxes a day at the start, growth over the period, conversion and average unit price.
	$plans = array(
		'coffee'    => array( 6.5, 0.9, 0.085, 11 ),
		'desk'      => array( 2.2, 0.3, 0.061, 26 ),
		'ritual'    => array( 3.5, 0.5, 0.072, 21 ),
		'gift'      => array( 3.0, 0.7, 0.069, 20 ),
		'travel'    => array( 2.0, 0.4, 0.058, 33 ),
		'glow'      => array( 2.8, 0.6, 0.074, 22 ),
		'tea'       => array( 2.4, 0.3, 0.066, 11 ),
		'midnight'  => array( 4.0, 0.5, 0.081, 9 ),
		'ceramics'  => array( 1.6, 0.2, 0.052, 24 ),
		'accessory' => array( 1.8, 0.4, 0.055, 38 ),
	);

	$days     = 60;
	$today    = new DateTimeImmutable( 'today', wp_timezone() );
	$order_id = 900000;
	$sold     = array();
	foreach ( $plans as $key => $plan ) {
		if ( empty( $campaigns[ $key ]['page_id'] ) ) {
			continue;
		}
		list( $base, $growth, $conversion, $unit ) = $plan;

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
		// Bigger boxes sell a little less often than the entry size.
		$split = array();
		foreach ( $tiers as $index => $tier ) {
			$split[] = max( 1, 4 - $index );
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
				} elseif ( 'fixed_amount' === $tier['discount_type'] ) {
					$value = max( 0, $subtotal - $count * (float) $tier['value'] );
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
 * Add a product photo the blueprint downloaded to the media library.
 *
 * @param string $slug  Product slug, which is also the photo's file name.
 * @param string $title Attachment title and alt text.
 * @return int Attachment id, or 0 when the photo is missing or the upload fails.
 */
function mmbb_demo_photo( $slug, $title ) {
	$source = MMBB_DEMO_PHOTOS . '/' . $slug . '.jpg';
	if ( ! is_readable( $source ) || filesize( $source ) < 1024 ) {
		return 0;
	}
	// media_handle_sideload() moves the file, so hand it a copy.
	$file = wp_tempnam( $slug . '.jpg' );
	if ( ! copy( $source, $file ) ) {
		return 0;
	}
	$id = media_handle_sideload(
		array(
			'name'     => $slug . '.jpg',
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
