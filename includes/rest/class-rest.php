<?php
/**
 * Register the admin REST API.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

defined( 'ABSPATH' ) || exit;

/** Boot every `mmbb/v1` controller on `rest_api_init`. */
final class Rest {
	/** Register hooks. */
	public function register() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_filter( 'woocommerce_order_data_store_cpt_get_orders_query', array( Setup_Controller::class, 'legacy_order_query' ), 10, 2 );
	}

	/**
	 * Controllers, one per resource. Later phases add one line here.
	 *
	 * @return string[]
	 */
	public static function controllers() {
		return array(
			Campaigns_Controller::class,
			Products_Controller::class,
			Terms_Controller::class,
			Pages_Controller::class,
			Settings_Controller::class,
			Setup_Controller::class,
			Stats_Controller::class,
			Analytics_Controller::class,
		);
	}

	/** Register every controller's routes. */
	public function register_routes() {
		foreach ( self::controllers() as $controller ) {
			( new $controller() )->register_routes();
		}
	}
}
