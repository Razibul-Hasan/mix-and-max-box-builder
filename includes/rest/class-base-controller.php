<?php
/**
 * Shared behaviour for every admin REST controller.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

defined( 'ABSPATH' ) || exit;

/** Namespace, permission check and small helpers for `mmbb/v1` controllers. */
abstract class Base_Controller extends \WP_REST_Controller {
	/** The capability every admin route requires. */
	const CAPABILITY = 'manage_woocommerce';

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	protected $namespace = 'mmbb/v1';

	/**
	 * Allow only store managers. Logged-out requests get 401, others 403.
	 *
	 * @return true|\WP_Error
	 */
	public function permissions_check() {
		if ( current_user_can( self::CAPABILITY ) ) {
			return true;
		}
		return new \WP_Error(
			'mmbb_rest_forbidden',
			__( 'Sorry, you are not allowed to manage box campaigns.', 'mix-and-max-box-builder' ),
			array( 'status' => rest_authorization_required_code() )
		);
	}

	/**
	 * Build a WP_Error with an HTTP status.
	 *
	 * @param string $code    Error code, prefixed `mmbb_`.
	 * @param string $message Translated message.
	 * @param int    $status  HTTP status.
	 * @param array  $data    Extra data.
	 * @return \WP_Error
	 */
	protected function error( $code, $message, $status, array $data = array() ) {
		return new \WP_Error( $code, $message, array_merge( $data, array( 'status' => $status ) ) );
	}

	/**
	 * Standard paging args.
	 *
	 * @param int $default_per_page Default page size.
	 * @param int $max_per_page     Largest page size.
	 * @return array
	 */
	protected function paging_args( $default_per_page = 20, $max_per_page = 50 ) {
		return array(
			'page'     => array(
				'description'       => __( 'Page of results.', 'mix-and-max-box-builder' ),
				'type'              => 'integer',
				'default'           => 1,
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
				'validate_callback' => 'rest_validate_request_arg',
			),
			'per_page' => array(
				'description'       => __( 'Results per page.', 'mix-and-max-box-builder' ),
				'type'              => 'integer',
				'default'           => $default_per_page,
				'minimum'           => 1,
				'maximum'           => $max_per_page,
				'sanitize_callback' => 'absint',
				'validate_callback' => 'rest_validate_request_arg',
			),
		);
	}

	/**
	 * Add pagination headers to a response.
	 *
	 * @param \WP_REST_Response $response Response.
	 * @param int               $total    Total items.
	 * @param int               $pages    Total pages.
	 * @return \WP_REST_Response
	 */
	protected function with_paging( \WP_REST_Response $response, $total, $pages ) {
		$response->header( 'X-WP-Total', (string) (int) $total );
		$response->header( 'X-WP-TotalPages', (string) (int) $pages );
		return $response;
	}
}
