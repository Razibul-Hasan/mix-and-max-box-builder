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
	 * Combines stored daily summaries and live local events.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		$range  = (string) $request['range'];
		$to     = wp_date( 'Y-m-d' );
		$from   = ( new \DateTimeImmutable( $to, wp_timezone() ) )->modify( '-' . ( (int) $range - 1 ) . ' days' )->format( 'Y-m-d' );
		$query  = new \MixMax\BoxBuilder\Analytics\Query();
		$report = $query->report( $from, $to );
		$series = array();
		foreach ( $report['series'] as $row ) {
			$series[] = array(
				'date'     => $row['date'],
				'current'  => $row['revenue'],
				'previous' => $row['previous'],
			);
		}
		$live       = ( new \MixMax\BoxBuilder\Campaigns\Campaign_Repository() )->query(
			array(
				'status'   => 'live',
				'per_page' => 1,
			)
		);
		$live_stats = null;
		if ( $live['items'] ) {
			$id         = $live['items'][0]['id'];
			$today      = $query->report( $to, $to, $id, false );
			$period     = $query->report( $from, $to, $id, false );
			$live_stats = array(
				'id'          => $id,
				'boxes_today' => $today['kpis']['boxes']['value'],
				'conversion'  => $period['kpis']['conversion']['value'],
			);
		}
		return rest_ensure_response(
			array(
				'range'          => $range,
				'from'           => $from,
				'to'             => $to,
				'kpis'           => $report['kpis'],
				'revenue_series' => $series,
				'top_campaigns'  => $report['campaigns'],
				'live_campaign'  => $live_stats,
				'top_products'   => $report['top_products'],
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
