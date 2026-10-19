<?php
/**
 * Plugin Name:       Mix and Max Box Builder
 * Plugin URI:        https://bestwebexpert.com/
 * Description:       Let shoppers build their own box of products and unlock bigger discounts as the box fills. For WooCommerce.
 * Version:           0.1.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * Author:            bestwebexpert
 * Author URI:        https://bestwebexpert.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       mix-and-max-box-builder
 * Domain Path:       /languages
 * WC requires at least: 9.0
 * WC tested up to:   11.2.1
 *
 * @package MixMax\BoxBuilder
 */

defined( 'ABSPATH' ) || exit;

define( 'MMBB_VERSION', '0.1.0' );
define( 'MMBB_FILE', __FILE__ );
define( 'MMBB_PATH', plugin_dir_path( __FILE__ ) );
define( 'MMBB_URL', plugin_dir_url( __FILE__ ) );
define( 'MMBB_BASENAME', plugin_basename( __FILE__ ) );

require_once MMBB_PATH . 'includes/class-autoloader.php';
\MixMax\BoxBuilder\Autoloader::register();

register_activation_hook( __FILE__, array( \MixMax\BoxBuilder\Installer::class, 'activate' ) );
register_deactivation_hook( __FILE__, array( \MixMax\BoxBuilder\Installer::class, 'deactivate' ) );

add_action(
	'before_woocommerce_init',
	static function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
		}
	}
);

add_action( 'plugins_loaded', array( new \MixMax\BoxBuilder\Plugin(), 'register' ) );
