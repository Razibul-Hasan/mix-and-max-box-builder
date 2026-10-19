<?php
/**
 * REST route for the dashboard stats.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

defined( 'ABSPATH' ) || exit;

/** Dashboard numbers for a range of days. */
class Stats_Controller extends Base_Controller {
	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'stats';

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
					'args'                => array(
						'range' => array(
							'description'       => __( 'Range of days to report on.', 'mix-and-max-box-builder' ),
							'type'              => 'string',
							'enum'              => array( '7d', '30d', '90d' ),
							'default'           => '30d',
							'sanitize_callback' => 'sanitize_key',
							'validate_callback' => 'rest_validate_request_arg',
						),
					),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);
	}

	/**
	 * Return the stats.
	 *
	 * Phase 9 fills this from the `mmbb_stats_daily` table. Until then every
	 * number is zero, but the shape is final.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		$range = (string) $request['range'];
		$count = (int) $range; // "7d" becomes 7.
		$to    = new \DateTimeImmutable( 'today', wp_timezone() );
		$from  = $to->modify( '-' . ( $count - 1 ) . ' days' );
		$days  = $this->days( $from->format( 'Y-m-d' ), $to->format( 'Y-m-d' ) );

		$zeros = array_fill( 0, count( $days ), 0 );
		$kpi   = array(
			'value'    => 0,
			'previous' => 0,
			'delta'    => null,
			'series'   => $zeros,
		);

		$revenue_series = array();
		foreach ( $days as $day ) {
			$revenue_series[] = array(
				'date'     => $day,
				'current'  => 0,
				'previous' => 0,
			);
		}

		return rest_ensure_response(
			array(
				'range'          => $range,
				'from'           => $from->format( 'Y-m-d' ),
				'to'             => $to->format( 'Y-m-d' ),
				'kpis'           => array(
					'revenue'       => $kpi,
					'boxes'         => $kpi,
					'avg_box_value' => $kpi,
					'conversion'    => array_merge( $kpi, array( 'value' => 0.0, 'previous' => 0.0 ) ), // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing.AssociativeArrayFound
				),
				'revenue_series' => $revenue_series,
				'top_campaigns'  => array(),
				'live_campaign'  => null,
				'top_products'   => array(),
			)
		);
	}

	/**
	 * List the Y-m-d days from one date to another, both included.
	 *
	 * @param string $from First day, Y-m-d.
	 * @param string $to   Last day, Y-m-d.
	 * @return string[]
	 */
	protected function days( $from, $to ) {
		$days = array();
		$day  = new \DateTimeImmutable( $from, wp_timezone() );
		$end  = new \DateTimeImmutable( $to, wp_timezone() );
		while ( $day <= $end ) {
			$days[] = $day->format( 'Y-m-d' );
			$day    = $day->modify( '+1 day' );
		}
		return $days;
	}

	/**
	 * Stats schema.
	 *
	 * @return array
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->add_additional_fields_schema( $this->schema );
		}

		$kpi = array(
			'type'       => 'object',
			'properties' => array(
				'value'    => array( 'type' => 'number' ),
				'previous' => array( 'type' => 'number' ),
				'delta'    => array( 'type' => array( 'number', 'null' ) ),
				'series'   => array(
					'type'  => 'array',
					'items' => array( 'type' => 'number' ),
				),
			),
		);

		$this->schema = array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'mmbb_stats',
			'type'       => 'object',
			'properties' => array(
				'range'          => array(
					'type' => 'string',
					'enum' => array( '7d', '30d', '90d' ),
				),
				'from'           => array( 'type' => 'string' ),
				'to'             => array( 'type' => 'string' ),
				'kpis'           => array(
					'type'       => 'object',
					'properties' => array(
						'revenue'       => $kpi,
						'boxes'         => $kpi,
						'avg_box_value' => $kpi,
						'conversion'    => $kpi,
					),
				),
				'revenue_series' => array(
					'type'  => 'array',
					'items' => array(
						'type'       => 'object',
						'properties' => array(
							'date'     => array( 'type' => 'string' ),
							'current'  => array( 'type' => 'integer' ),
							'previous' => array( 'type' => 'integer' ),
						),
					),
				),
				'top_campaigns'  => array(
					'type'  => 'array',
					'items' => array( 'type' => 'object' ),
				),
				'live_campaign'  => array( 'type' => array( 'object', 'null' ) ),
				'top_products'   => array(
					'type'  => 'array',
					'items' => array( 'type' => 'object' ),
				),
			),
		);
		return $this->add_additional_fields_schema( $this->schema );
	}
}
