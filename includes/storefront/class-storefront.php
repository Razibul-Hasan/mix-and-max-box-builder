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

	/** Register hooks. */
	public function register() {
		add_action( 'init', array( $this, 'register_assets' ), 9 );
		add_action( 'init', array( $this, 'register_block' ) );
		add_action( 'init', array( $this, 'register_shortcode' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue_everywhere' ) );

		// Product lists are cached per campaign. Anything that changes them drops the cache.
		add_action( 'mmbb_campaign_saved', array( Payload::class, 'bust' ) );
		add_action( 'update_option_' . Settings::OPTION, array( Payload::class, 'bust' ) );
		foreach ( array( 'woocommerce_new_product', 'woocommerce_update_product', 'woocommerce_delete_product', 'woocommerce_trash_product', 'woocommerce_new_product_variation', 'woocommerce_update_product_variation', 'woocommerce_delete_product_variation', 'woocommerce_product_set_stock', 'woocommerce_variation_set_stock', 'woocommerce_product_set_stock_status', 'woocommerce_variation_set_stock_status' ) as $hook ) {
			add_action( $hook, array( Payload::class, 'bust' ) );
		}
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
		wp_set_script_translations( self::HANDLE, 'mix-and-max-box-builder', MMBB_PATH . 'languages' );
	}

	/** Register the block from its built folder. */
	public function register_block() {
		if ( ! file_exists( MMBB_PATH . 'build/blocks/box-builder/block.json' ) ) {
			return;
		}
		register_block_type( MMBB_PATH . 'build/blocks/box-builder' );

		$editor_handle = generate_block_asset_handle( self::BLOCK, 'editorScript' );
		wp_set_script_translations( $editor_handle, 'mix-and-max-box-builder', MMBB_PATH . 'languages' );
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
				'id'      => 0,
				'layout'  => 'default',
				'columns' => 0,
				'hero'    => 'true',
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

	/** With "Load assets only on pages with a builder" turned off, load them on every page. */
	public function maybe_enqueue_everywhere() {
		if ( ! Settings::get( 'assets_only_on_builder' ) ) {
			self::enqueue();
		}
	}
}
