<?php
/**
 * Shared design assets and WooCommerce display settings.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/** Register shared styles without loading them on unrelated screens. */
final class Assets {
	/** Register hooks. */
	public function register() {
		add_action( 'init', array( $this, 'register_assets' ) );
	}

	/** Register generated assets. Rendering modules enqueue these handles later. */
	public function register_assets() {
		foreach ( array( 'tokens', 'components' ) as $name ) {
			$asset_file = MMBB_PATH . 'build/' . $name . '.asset.php';
			if ( ! file_exists( $asset_file ) ) {
				continue;
			}
			$asset = require $asset_file;
			wp_register_style(
				'mmbb-' . $name,
				MMBB_URL . 'build/' . $name . '.css',
				'components' === $name ? array( 'mmbb-tokens' ) : array(),
				$asset['version']
			);
		}

		$script_asset = MMBB_PATH . 'build/components.asset.php';
		if ( file_exists( $script_asset ) ) {
			$asset = require $script_asset;
			wp_register_script( 'mmbb-components', MMBB_URL . 'build/components.js', $asset['dependencies'], $asset['version'], true );
			wp_set_script_translations( 'mmbb-components', 'mix-and-max-box-builder', MMBB_PATH . 'languages' );
			wp_add_inline_script( 'mmbb-components', 'window.mmbbMoneySettings = ' . wp_json_encode( self::get_money_settings() ) . ';', 'before' );
		}
	}

	/**
	 * Get settings for MoneyProvider; rendering modules pass these with wp_json_encode().
	 *
	 * @return array WooCommerce money display settings.
	 */
	public static function get_money_settings() {
		return array(
			'symbol'            => html_entity_decode( get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' ),
			'position'          => get_option( 'woocommerce_currency_pos', 'left' ),
			'decimals'          => wc_get_price_decimals(),
			'decimalSeparator'  => wc_get_price_decimal_separator(),
			'thousandSeparator' => wc_get_price_thousand_separator(),
		);
	}
}
