<?php
/**
 * Anonymous local analytics ingestion.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Analytics;

use MixMax\BoxBuilder\Settings\Settings;
use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Status;
use MixMax\BoxBuilder\Cart\Box_Resolver;
use MixMax\BoxBuilder\Installer;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- Plugin-owned analytics tables; report caching lives in Query.
/** Validate and store anonymous builder events. */
final class Collector {
	/** Register the public write route. */
	public function register() {
		// Automatic updates can receive storefront/REST traffic before an admin visit.
		add_action( 'init', array( Installer::class, 'maybe_upgrade' ), 0 );
		add_action( 'rest_api_init', array( $this, 'routes' ) );
	}
	/** Whether the merchant permits collection, including server purchase tracking.
	 *
	 * @return bool
	 */
	public static function enabled() {
		/**
		 * Allow the site to disable every analytics collection path.
		 *
		 * @param bool $enabled Whether to collect events.
		 */
		return (bool) Settings::get( 'analytics_enabled' ) && (bool) apply_filters( 'mmbb_track_events', true );
	}
	/** Register the nonce-protected events resource. */
	public function routes() {
		register_rest_route(
			'mmbb/v1',
			'/events',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'collect' ),
				'permission_callback' => array( $this, 'permission' ),
				'args'                => array(
					'nonce'   => array(
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'session' => array(
						'type'     => 'string',
						'required' => true,
						'pattern'  => '^[a-f0-9]{32}$',
					),
					'events'  => array(
						'type'     => 'array',
						'required' => true,
						'minItems' => 1,
						'maxItems' => 20,
						'items'    => array(
							'type'       => 'object',
							'required'   => array( 'event', 'campaign_id' ),
							'properties' => array(
								'event'       => array(
									'type' => 'string',
									'enum' => array( 'view', 'add_item', 'tier_reached' ),
								),
								'campaign_id' => array(
									'type'    => 'integer',
									'minimum' => 1,
								),
								'product_id'  => array(
									'type'    => 'integer',
									'minimum' => 1,
								),
								'qty'         => array(
									'type'    => 'integer',
									'minimum' => 1,
									'maximum' => 100,
								),
							),
						),
					),
				),
			)
		);
	}
	/** Check the tracking nonce and merchant preference.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return bool
	 */
	public function permission( $request ) {
		return self::enabled() && (bool) wp_verify_nonce( $request['nonce'], 'mmbb_track' );
	}
	/** Rotate the daily salt without retaining previous salts.
	 *
	 * @param string $session Browser random session.
	 * @return string
	 */
	public static function session_hash( $session ) {
		$day  = wp_date( 'Y-m-d' );
		$salt = get_option( 'mmbb_analytics_salt', array() );
		if ( ! is_array( $salt ) || ! isset( $salt['day'], $salt['value'] ) || $day !== $salt['day'] ) {
			$salt = array(
				'day'   => $day,
				'value' => wp_generate_password( 64, true, true ),
			);
			update_option( 'mmbb_analytics_salt', $salt, false );
		}
		return md5( $session . $salt['value'] );
	}
	/** Store a validated batch; never accept browser sales values.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function collect( $request ) {
		$validated = array();
		foreach ( $request['events'] as $event ) {
			$campaign = ( new Campaign_Repository() )->find( $event['campaign_id'] );
			if ( ! $campaign || ! Status::is_live( $campaign['status'] ) ) {
				return new \WP_Error( 'mmbb_invalid_event', __( 'This campaign is unavailable.', 'mix-and-max-box-builder' ), array( 'status' => 400 ) );
			}
			$product = isset( $event['product_id'] ) ? absint( $event['product_id'] ) : 0;
			$qty     = isset( $event['qty'] ) ? absint( $event['qty'] ) : 0;
			if ( 'bundle' === $campaign['config']['type'] ) {
				$tiers = array( $campaign['config']['bundle']['qty'] );
			} else {
				$tiers = array_column( 'fixed' === $campaign['config']['type'] ? $campaign['config']['sizes'] : $campaign['config']['tiers'], 'qty' );
			}
			if ( ( 'add_item' === $event['event'] && ! in_array( $product, Box_Resolver::allowed_ids( $campaign['config'] ), true ) ) || ( 'tier_reached' === $event['event'] && ! in_array( $qty, $tiers, true ) ) ) {
				return new \WP_Error( 'mmbb_invalid_event', __( 'The event does not belong to this campaign.', 'mix-and-max-box-builder' ), array( 'status' => 400 ) );
			}
			$validated[] = array(
				'campaign_id' => absint( $event['campaign_id'] ),
				'event'       => sanitize_key( $event['event'] ),
				'product_id'  => 'add_item' === $event['event'] ? $product : 0,
				'qty'         => 'tier_reached' === $event['event'] ? $qty : 0,
			);
		}
		$hash = self::session_hash( $request['session'] );
		$key  = 'mmbb_rate_' . $hash . '_' . gmdate( 'YmdH' );
		$used = (int) get_transient( $key );
		if ( $used + count( $validated ) > 120 ) {
			return new \WP_Error( 'mmbb_rate_limit', __( 'Too many analytics events.', 'mix-and-max-box-builder' ), array( 'status' => 429 ) );
		}
		set_transient( $key, $used + count( $validated ), HOUR_IN_SECONDS );
		self::remember( $key );
		foreach ( $validated as $event ) {
			self::insert( $event, $hash );
		}
		Query::bust();
		return new \WP_REST_Response( null, 204 );
	}
	/** Track transient names for persistent-cache uninstall cleanup.
	 *
	 * @param string $key Transient name.
	 */
	public static function remember( $key ) {
		$keys         = get_option( 'mmbb_analytics_transients', array() );
		$keys         = array_filter(
			(array) $keys,
			static function ( $expires ) {
				return $expires > time();
			}
		);
		$keys[ $key ] = time() + HOUR_IN_SECONDS;
		update_option( 'mmbb_analytics_transients', $keys, false );
	}
	/** Insert a trusted event.
	 *
	 * @param array  $event Event values.
	 * @param string $hash Daily anonymous hash.
	 */
	public static function insert( array $event, $hash = '' ) {
		global $wpdb;
		$wpdb->insert(
			$wpdb->prefix . 'mmbb_events',
			array_merge(
				array(
					'session'    => $hash,
					'created_at' => current_time( 'mysql', true ),
				),
				$event
			)
		);
	}
}
