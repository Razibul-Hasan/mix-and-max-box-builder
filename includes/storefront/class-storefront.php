<?php
/**
 * The storefront module: block, shortcode, assets and cache invalidation.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Storefront;

use MixMax\BoxBuilder\Campaigns\Config;
use MixMax\BoxBuilder\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/** Registers the builder block and shortcode, and loads the storefront assets only when a builder renders. */
final class Storefront {
	/** Handle of the storefront script and style. */
	const HANDLE = 'mmbb-storefront';

	/** Name of the block. */
	const BLOCK = 'mmbb/box-builder';

	/** Product props a stock count update may change. A save that changes anything else drops the cache. */
	const STOCK_PROPS = array( 'stock_quantity', 'stock_status' );

	/**
	 * Products whose stock wc_update_product_stock() is changing right now, by id.
	 *
	 * @var array<int, true>
	 */
	private $stock_updating = array();

	/**
	 * Variable products whose variation's stock changed; WooCommerce saves them at shutdown to sync.
	 *
	 * @var array<int, true>
	 */
	private $stock_parents = array();

	/**
	 * Products whose save in progress only syncs stock, by id. Each is used once.
	 *
	 * @var array<int, true>
	 */
	private $stock_only_save = array();

	/** Register hooks. */
	public function register() {
		add_action( 'init', array( $this, 'register_assets' ), 9 );
		add_action( 'init', array( $this, 'register_block' ) );
		add_action( 'init', array( $this, 'register_shortcode' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue_everywhere' ) );

		// Product lists are cached per campaign. Anything that changes them drops the cache.
		add_action( 'mmbb_campaign_saved', array( Payload::class, 'bust' ) );
		add_action( 'update_option_' . Settings::OPTION, array( Payload::class, 'bust' ) );
		// Stock quantity changes (every sale) do not drop the cache, only stock status changes do.
		// Box_Resolver::resolve() re-checks real stock on add to cart; the trade-off is that the
		// "only N left" count can be up to Payload::CACHE_TTL (an hour) out of date.
		foreach ( array( 'woocommerce_new_product', 'woocommerce_delete_product', 'woocommerce_trash_product', 'woocommerce_new_product_variation', 'woocommerce_delete_product_variation', 'woocommerce_product_set_stock_status', 'woocommerce_variation_set_stock_status' ) as $hook ) {
			add_action( $hook, array( Payload::class, 'bust' ) );
		}
		// wc_update_product_stock() saves the product, which fires these update hooks too. Such a
		// save is recognised and skipped; every other product save drops the cache.
		add_action( 'woocommerce_update_product', array( $this, 'product_updated' ) );
		add_action( 'woocommerce_update_product_variation', array( $this, 'product_updated' ) );
		add_action( 'woocommerce_product_before_set_stock', array( $this, 'stock_changing' ) );
		add_action( 'woocommerce_variation_before_set_stock', array( $this, 'stock_changing' ) );
		add_action( 'woocommerce_product_set_stock', array( $this, 'stock_changed' ) );
		add_action( 'woocommerce_variation_set_stock', array( $this, 'stock_changed' ) );
		add_action( 'woocommerce_before_product_object_save', array( $this, 'before_product_save' ) );
		add_action( 'woocommerce_before_product_variation_object_save', array( $this, 'before_product_save' ) );
	}

	/**
	 * On `woocommerce_*_before_set_stock`.
	 *
	 * The function wc_update_product_stock() fires it before it saves the product; a regular product
	 * save fires it part-way through. before_product_save() tells the two apart by which came first.
	 *
	 * @param \WC_Product $product The product whose stock is about to change.
	 */
	public function stock_changing( $product ) {
		if ( ! $product instanceof \WC_Product ) {
			return;
		}
		$this->stock_updating[ (int) $product->get_id() ] = true;
		if ( $product->get_parent_id() ) {
			$this->stock_parents[ (int) $product->get_parent_id() ] = true;
		}
	}

	/**
	 * On `woocommerce_*_set_stock`: the stock change is over.
	 *
	 * @param \WC_Product $product The product whose stock changed.
	 */
	public function stock_changed( $product ) {
		if ( $product instanceof \WC_Product ) {
			unset( $this->stock_updating[ (int) $product->get_id() ] );
		}
	}

	/**
	 * On `woocommerce_before_*_object_save`: note a save that only syncs stock after a stock update,
	 * or a variable product's shutdown sync after its variation's stock changed.
	 *
	 * @param \WC_Product $product Product about to be saved.
	 */
	public function before_product_save( $product ) {
		if ( ! $product instanceof \WC_Product || ! $product->get_id() ) {
			return;
		}
		$id         = (int) $product->get_id();
		$from_stock = isset( $this->stock_updating[ $id ] ) || isset( $this->stock_parents[ $id ] );
		unset( $this->stock_parents[ $id ] );
		if ( $from_stock && ! array_diff( array_keys( $product->get_changes() ), self::STOCK_PROPS ) ) {
			$this->stock_only_save[ $id ] = true;
		} else {
			unset( $this->stock_only_save[ $id ] );
		}
	}

	/**
	 * On `woocommerce_update_product(_variation)`: drop the cache unless the save only synced stock.
	 * A stock status change still drops it, through `woocommerce_*_set_stock_status`.
	 *
	 * @param int $product_id Product or variation id.
	 */
	public function product_updated( $product_id ) {
		$product_id = (int) $product_id;
		if ( isset( $this->stock_only_save[ $product_id ] ) ) {
			unset( $this->stock_only_save[ $product_id ] );
			return;
		}
		Payload::bust();
	}

	/** Register the storefront script and style. Nothing is enqueued here. */
	public function register_assets() {
		$asset_file = MMBB_PATH . 'build/storefront.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset = require $asset_file;

		wp_register_style( self::HANDLE, MMBB_URL . 'build/storefront.css', array( 'mmbb-components' ), $asset['version'] );
		wp_style_add_data( self::HANDLE, 'rtl', 'replace' );
		wp_register_script( self::HANDLE, MMBB_URL . 'build/storefront.js', $asset['dependencies'], $asset['version'], true );
		wp_set_script_translations( self::HANDLE, 'productboxes-mix-and-match-box-builder', MMBB_PATH . 'languages' );
	}

	/** Register the block from its built folder. */
	public function register_block() {
		if ( ! file_exists( MMBB_PATH . 'build/blocks/box-builder/block.json' ) ) {
			return;
		}
		register_block_type( MMBB_PATH . 'build/blocks/box-builder' );

		$editor_handle = generate_block_asset_handle( self::BLOCK, 'editorScript' );
		wp_set_script_translations( $editor_handle, 'productboxes-mix-and-match-box-builder', MMBB_PATH . 'languages' );
	}

	/** Register `[mmbb_box]`. */
	public function register_shortcode() {
		add_shortcode( 'mmbb_box', array( $this, 'render_shortcode' ) );
	}

	/**
	 * Render `[mmbb_box id="12" layout="bar" columns="3" hero="false"]`.
	 *
	 * @param array|string $atts Shortcode attributes.
	 * @return string
	 */
	public function render_shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'id'       => 0,
				'layout'   => 'default',
				'columns'  => 0,
				'hero'     => 'true',
				'template' => '',
			),
			is_array( $atts ) ? $atts : array(),
			'mmbb_box'
		);

		$columns = absint( $atts['columns'] );
		return Renderer::render(
			absint( $atts['id'] ),
			array(
				'layout'    => in_array( $atts['layout'], Config::LAYOUTS, true ) ? $atts['layout'] : 'default',
				'columns'   => in_array( $columns, Config::COLUMNS, true ) ? $columns : 0,
				'show_hero' => false !== filter_var( $atts['hero'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE ),
				'template'  => in_array( $atts['template'], Config::DESIGN_TEMPLATES, true ) ? $atts['template'] : '',
			),
			false
		);
	}

	/**
	 * Enqueue the storefront assets for a builder that is about to render.
	 *
	 * @return bool False when the assets were never built.
	 */
	public static function enqueue() {
		if ( ! wp_script_is( self::HANDLE, 'registered' ) ) {
			return false;
		}
		wp_enqueue_style( self::HANDLE );
		wp_enqueue_script( self::HANDLE );
		return true;
	}

	/**
	 * With "Load assets only on pages with a builder" turned off, load them on every page,
	 * except in a page builder's editor, where boxes are placeholders.
	 */
	public function maybe_enqueue_everywhere() {
		if ( Settings::get( 'enabled' ) && ! Settings::get( 'assets_only_on_builder' ) && ! Renderer::is_page_builder_request() ) {
			self::enqueue();
		}
	}
}
