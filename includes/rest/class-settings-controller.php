<?php
/**
 * REST route for plugin settings.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

use MixMax\BoxBuilder\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/** Reads and saves the plugin settings. */
class Settings_Controller extends Base_Controller {
	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'settings';

	/** Register the route. */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
				array(
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => $this->get_update_args(),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);
	}

	/**
	 * Return every setting.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		return rest_ensure_response( Settings::all() );
	}

	/**
	 * Save the settings present in the request.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function update_item( $request ) {
		$params  = $request->get_params();
		$changes = array();
		foreach ( array_keys( Settings::defaults() ) as $key ) {
			if ( array_key_exists( $key, $params ) ) {
				$changes[ $key ] = $params[ $key ];
			}
		}
		return rest_ensure_response( Settings::update( $changes ) );
	}

	/**
	 * Arguments for saving. None has a default, so a partial request changes only what it names.
	 *
	 * @return array
	 */
	protected function get_update_args() {
		$args = array();
		foreach ( $this->get_item_schema()['properties'] as $key => $property ) {
			unset( $property['default'], $property['readonly'] );
			$property['sanitize_callback'] = 'rest_sanitize_request_arg';
			$property['validate_callback'] = 'rest_validate_request_arg';
			$args[ $key ]                  = $property;
		}
		return $args;
	}

	/**
	 * Settings schema.
	 *
	 * @return array
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->add_additional_fields_schema( $this->schema );
		}

		$properties = array();
		foreach ( Settings::defaults() as $key => $default ) {
			if ( is_bool( $default ) ) {
				$properties[ $key ] = array( 'type' => 'boolean' );
			} else {
				$properties[ $key ] = array( 'type' => is_int( $default ) ? 'integer' : 'string' );
			}
		}
		$properties['default_page_id']['minimum']          = 0;
		$properties['columns']['enum']                     = Settings::COLUMNS;
		$properties['summary_layout']['enum']              = Settings::SUMMARY_LAYOUTS;
		$properties['cart_display']['enum']                = Settings::CART_DISPLAYS;
		$properties['cta_label']['maxLength']              = 32;
		$properties['empty_slot_hint']['maxLength']        = 60;
		$properties['analytics_retention_days']['minimum'] = 7;
		$properties['analytics_retention_days']['maximum'] = 730;
		$properties['low_stock']                           = array(
			'type'                 => 'object',
			'additionalProperties' => false,
			'properties'           => array(
				'enabled'   => array( 'type' => 'boolean' ),
				'threshold' => array(
					'type'    => 'integer',
					'minimum' => 1,
					'maximum' => 100,
				),
			),
		);

		$this->schema = array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'mmbb_settings',
			'type'       => 'object',
			'properties' => $properties,
		);
		return $this->add_additional_fields_schema( $this->schema );
	}
}
