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
		$route             = rest_get_server()->get_routes()['/mmbb/v1/analytics'][0];
		$route['callback'] = array( $this, 'export' );
		$route['methods']  = \WP_REST_Server::READABLE;
		register_rest_route( $this->namespace, '/analytics/export', $route );
		add_filter( 'rest_pre_serve_request', array( $this, 'serve_csv' ), 10, 4 );
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
	 * Reads live and rolled-up local analytics.
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

		$from            = $start->format( 'Y-m-d' );
		$to              = $end->format( 'Y-m-d' );
		$report          = ( new \MixMax\BoxBuilder\Analytics\Query() )->report( $from, $to, (int) $request['campaign'], $compare );
		$report['range'] = $range;
		return rest_ensure_response( $report );
	}

	/** Export all sections for the current filters as CSV.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function export( $request ) {
		$response = $this->get_item( $request );
		if ( is_wp_error( $response ) ) {
			return $response; }
		$data    = $response->get_data();
		$rows    = array(
			array(
				__( 'Section', 'mix-and-max-box-builder' ),
				__( 'From', 'mix-and-max-box-builder' ),
				__( 'To', 'mix-and-max-box-builder' ),
				__( 'Campaign', 'mix-and-max-box-builder' ),
				__( 'Date', 'mix-and-max-box-builder' ),
				__( 'Metric', 'mix-and-max-box-builder' ),
				__( 'Value', 'mix-and-max-box-builder' ),
				__( 'Previous', 'mix-and-max-box-builder' ),
				__( 'Unit', 'mix-and-max-box-builder' ),
			),
		);
		$names   = array(
			'revenue'       => __( 'Revenue', 'mix-and-max-box-builder' ),
			'boxes'         => __( 'Boxes sold', 'mix-and-max-box-builder' ),
			'avg_box_value' => __( 'Average box value', 'mix-and-max-box-builder' ),
			'items_per_box' => __( 'Average items per box', 'mix-and-max-box-builder' ),
			'discount'      => __( 'Discount given', 'mix-and-max-box-builder' ),
			'conversion'    => __( 'Conversion', 'mix-and-max-box-builder' ),
			'views'         => __( 'Builder views', 'mix-and-max-box-builder' ),
			'started'       => __( 'Started a box', 'mix-and-max-box-builder' ),
		);
		$minor   = __( 'Currency minor units', 'mix-and-max-box-builder' );
		$number  = __( 'Number', 'mix-and-max-box-builder' );
		$percent = __( 'Percent', 'mix-and-max-box-builder' );
		$filter  = $data['campaign'] ? get_the_title( $data['campaign'] ) : __( 'All campaigns', 'mix-and-max-box-builder' );
		foreach ( $data['kpis'] as $name => $metric ) {
			$unit = in_array( $name, array( 'revenue', 'discount', 'avg_box_value' ), true ) ? $minor : $number;
			if ( 'conversion' === $name ) {
				$unit = $percent; }
			$rows[] = array( __( 'Summary', 'mix-and-max-box-builder' ), $data['from'], $data['to'], $filter, '', $names[ $name ], $metric['value'], $metric['previous'], $unit );
		}
		foreach ( $data['series'] as $row ) {
			$rows[] = array( __( 'Daily revenue', 'mix-and-max-box-builder' ), $data['from'], $data['to'], $filter, $row['date'], $names['revenue'], $row['revenue'], $row['previous'], $minor );
		}
		$steps = array(
			'view'         => __( 'Viewed builder', 'mix-and-max-box-builder' ),
			'started'      => __( 'Added first item', 'mix-and-max-box-builder' ),
			'tier_reached' => __( 'Reached a tier', 'mix-and-max-box-builder' ),
			'add_to_cart'  => __( 'Added box to cart', 'mix-and-max-box-builder' ),
			'purchased'    => __( 'Purchased', 'mix-and-max-box-builder' ),
		);
		foreach ( $data['funnel'] as $row ) {
			$rows[] = array( __( 'Funnel', 'mix-and-max-box-builder' ), $data['from'], $data['to'], $filter, '', $steps[ $row['step'] ], $row['count'], '', $number );
		}
		foreach ( $data['top_products'] as $row ) {
			$rows[] = array( __( 'Product picks', 'mix-and-max-box-builder' ), $data['from'], $data['to'], $filter, '', $row['name'], $row['count'], '', $number );
		}
		foreach ( $data['tier_distribution'] as $row ) {
			$rows[] = array( __( 'Tier share', 'mix-and-max-box-builder' ), $data['from'], $data['to'], $filter, '', ! empty( $row['other'] ) ? __( 'Other', 'mix-and-max-box-builder' ) : wp_json_encode( $row['tier'] ), $row['share'], '', $percent );
		}
		foreach ( $data['campaigns'] as $row ) {
			foreach ( array( 'views', 'started', 'boxes', 'conversion', 'avg_box_value', 'revenue', 'discount' ) as $name ) {
				$unit = in_array( $name, array( 'revenue', 'discount', 'avg_box_value' ), true ) ? $minor : $number;
				if ( 'conversion' === $name ) {
					$unit = $percent; }
				$rows[] = array( __( 'Campaign performance', 'mix-and-max-box-builder' ), $data['from'], $data['to'], $row['name'], '', $names[ $name ], $row[ $name ], '', $unit );
			}
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen -- Memory stream, not a filesystem operation.
		$stream = fopen( 'php://temp', 'r+' );
		foreach ( $rows as $row ) {
			fputcsv( $stream, array_map( array( self::class, 'csv_cell' ), $row ), ',', '"', '' ); }
		rewind( $stream );
		$csv = stream_get_contents( $stream );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- Close the memory stream.
		fclose( $stream );
		return new \WP_REST_Response(
			$csv,
			200,
			array(
				'Content-Type'        => 'text/csv; charset=UTF-8',
				'Content-Disposition' => 'attachment; filename="mmbb-analytics-' . wp_date( 'Y-m-d' ) . '.csv"',
				'Cache-Control'       => 'no-store',
			)
		);
	}
	/** Guard spreadsheet formulas, including whitespace-prefixed formulas.
	 *
	 * @param mixed $value Cell value.
	 * @return string
	 */
	public static function csv_cell( $value ) {
		$value = (string) $value;
		return preg_match( '/^[\s]*[=+@-]/', $value ) ? "'" . $value : $value;
	}
	/** Serve CSV without REST JSON encoding.
	 *
	 * @param bool              $served Already served.
	 * @param \WP_HTTP_Response $result Response.
	 * @param \WP_REST_Request  $request Request.
	 * @param \WP_REST_Server   $server Server.
	 * @return bool
	 */
	public function serve_csv( $served, $result, $request, $server ) {
		if ( '/mmbb/v1/analytics/export' !== $request->get_route() || 200 !== $result->get_status() || $served ) {
			return $served;
		}
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSV bytes are formula-escaped by export(); HTML escaping would corrupt the file.
		echo $result->get_data();
		return true;
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
						'avg_box_value' => $kpi,
						'conversion'    => $kpi,
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
