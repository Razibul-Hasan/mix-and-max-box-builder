<?php
/**
 * REST route for the analytics screen.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

defined( 'ABSPATH' ) || exit;

/** Analytics numbers for a range of days. */
class Analytics_Controller extends Base_Controller {
	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'analytics';

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
						'range'    => array(
							'description'       => __( 'Range of days to report on.', 'mix-and-max-box-builder' ),
							'type'              => 'string',
							'enum'              => array( 'today', '7d', '30d', '90d', 'custom' ),
							'default'           => '30d',
							'sanitize_callback' => 'sanitize_key',
							'validate_callback' => 'rest_validate_request_arg',
						),
						'from'     => array(
							'description'       => __( 'First day of a custom range, Y-m-d.', 'mix-and-max-box-builder' ),
							'type'              => 'string',
							'format'            => 'date',
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => array( $this, 'validate_date' ),
						),
						'to'       => array(
							'description'       => __( 'Last day of a custom range, Y-m-d.', 'mix-and-max-box-builder' ),
							'type'              => 'string',
							'format'            => 'date',
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => array( $this, 'validate_date' ),
						),
						'campaign' => array(
							'description'       => __( 'Campaign id, or 0 for all campaigns.', 'mix-and-max-box-builder' ),
							'type'              => 'integer',
							'minimum'           => 0,
							'default'           => 0,
							'sanitize_callback' => 'absint',
							'validate_callback' => 'rest_validate_request_arg',
						),
						'compare'  => array(
							'description'       => __( 'Include the previous period.', 'mix-and-max-box-builder' ),
							'type'              => 'boolean',
							'default'           => false,
							'sanitize_callback' => 'rest_sanitize_boolean',
							'validate_callback' => 'rest_validate_request_arg',
						),
					),
				),
				'schema' => array( $this, 'get_public_item_schema' ),
			)
		);
	}

	/**
	 * Check that a value is a real Y-m-d date.
	 *
	 * @param mixed            $value   Value.
	 * @param \WP_REST_Request $request Request.
	 * @param string           $param   Parameter name.
	 * @return true|\WP_Error
	 */
	public function validate_date( $value, $request, $param ) {
		$valid = rest_validate_request_arg( $value, $request, $param );
		if ( true !== $valid ) {
			return $valid;
		}
		$date = \DateTimeImmutable::createFromFormat( '!Y-m-d', (string) $value );
		if ( ! $date || $date->format( 'Y-m-d' ) !== (string) $value ) {
			return new \WP_Error(
				'rest_invalid_param',
				/* translators: %s: parameter name. */
				sprintf( __( '%s must be a date in the format Y-m-d.', 'mix-and-max-box-builder' ), $param )
			);
		}
		return true;
	}

	/**
	 * Return the analytics.
	 *
	 * Phase 9 fills this from the analytics tables. Until then every number is
	 * zero, but the shape is final.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_item( $request ) {
		$range   = (string) $request['range'];
		$compare = (bool) $request['compare'];
		$today   = new \DateTimeImmutable( 'today', wp_timezone() );

		if ( 'custom' === $range ) {
			$from = (string) $request['from'];
			$to   = (string) $request['to'];
			if ( '' === $from || '' === $to ) {
				return $this->error( 'mmbb_invalid_range', __( 'A custom range needs a start and an end date.', 'mix-and-max-box-builder' ), 400 );
			}
			$start = new \DateTimeImmutable( $from, wp_timezone() );
			$end   = new \DateTimeImmutable( $to, wp_timezone() );
			if ( $end < $start ) {
				return $this->error( 'mmbb_invalid_range', __( 'The end date must not be before the start date.', 'mix-and-max-box-builder' ), 400 );
			}
			if ( $start->diff( $end )->days + 1 > 366 ) {
				return $this->error( 'mmbb_invalid_range', __( 'A custom range can span at most 366 days.', 'mix-and-max-box-builder' ), 400 );
			}
		} else {
			$count = 'today' === $range ? 1 : (int) $range;
			$end   = $today;
			$start = $today->modify( '-' . ( $count - 1 ) . ' days' );
		}

		$from     = $start->format( 'Y-m-d' );
		$to       = $end->format( 'Y-m-d' );
		$previous = $compare ? 0 : null;

		$kpi = array(
			'value'    => 0,
			'previous' => $previous,
			'delta'    => null,
		);

		$series = array();
		foreach ( $this->days( $from, $to ) as $day ) {
			$series[] = array(
				'date'     => $day,
				'revenue'  => 0,
				'previous' => $previous,
			);
		}

		$funnel = array();
		foreach ( array( 'view', 'started', 'tier_reached', 'add_to_cart', 'purchased' ) as $step ) {
			$funnel[] = array(
				'step'  => $step,
				'count' => 0,
			);
		}

		return rest_ensure_response(
			array(
				'range'             => $range,
				'from'              => $from,
				'to'                => $to,
				'campaign'          => (int) $request['campaign'],
				'compare'           => $compare,
				'kpis'              => array(
					'revenue'       => $kpi,
					'boxes'         => $kpi,
					'items_per_box' => $kpi,
					'discount'      => $kpi,
				),
				'series'            => $series,
				'funnel'            => $funnel,
				'top_products'      => array(),
				'tier_distribution' => array(),
				'campaigns'         => array(),
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
	 * Analytics schema.
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
				'previous' => array( 'type' => array( 'number', 'null' ) ),
				'delta'    => array( 'type' => array( 'number', 'null' ) ),
			),
		);

		$list = array(
			'type'  => 'array',
			'items' => array( 'type' => 'object' ),
		);

		$this->schema = array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'mmbb_analytics',
			'type'       => 'object',
			'properties' => array(
				'range'             => array(
					'type' => 'string',
					'enum' => array( 'today', '7d', '30d', '90d', 'custom' ),
				),
				'from'              => array( 'type' => 'string' ),
				'to'                => array( 'type' => 'string' ),
				'campaign'          => array( 'type' => 'integer' ),
				'compare'           => array( 'type' => 'boolean' ),
				'kpis'              => array(
					'type'       => 'object',
					'properties' => array(
						'revenue'       => $kpi,
						'boxes'         => $kpi,
						'items_per_box' => $kpi,
						'discount'      => $kpi,
					),
				),
				'series'            => array(
					'type'  => 'array',
					'items' => array(
						'type'       => 'object',
						'properties' => array(
							'date'     => array( 'type' => 'string' ),
							'revenue'  => array( 'type' => 'integer' ),
							'previous' => array( 'type' => array( 'integer', 'null' ) ),
						),
					),
				),
				'funnel'            => array(
					'type'  => 'array',
					'items' => array(
						'type'       => 'object',
						'properties' => array(
							'step'  => array( 'type' => 'string' ),
							'count' => array( 'type' => 'integer' ),
						),
					),
				),
				'top_products'      => $list,
				'tier_distribution' => $list,
				'campaigns'         => $list,
			),
		);
		return $this->add_additional_fields_schema( $this->schema );
	}
}
