<?php
/**
 * Filtered analytics queries. Monetary responses use WooCommerce minor units.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Analytics;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- Owned tables; reports cached for ten minutes with a mutation generation.
/** Merge durable daily summaries with unrolled events and the permanent sales ledger. */
final class Query {
	/** Option holding the last store day the daily rollup has summarised, Y-m-d. */
	const ROLLED_OPTION = 'mmbb_rollup_through';

	/**
	 * Invalidate reports after a purchase, refund or rollup.
	 *
	 * Builder events (views, picks, carts) do not call this: busting on every event would leave
	 * reports uncached on a busy store. Reports pick those up when their ten-minute cache ends.
	 */
	public static function bust() {
		update_option( 'mmbb_analytics_generation', wp_generate_uuid4(), false );
	}

	/**
	 * The last store day the daily rollup has summarised. Days up to it are read from
	 * `mmbb_stats_daily` only; later days from the raw events.
	 *
	 * @return string Y-m-d, or '' before the first rollup.
	 */
	public static function rolled_through() {
		$day = (string) get_option( self::ROLLED_OPTION, '' );
		return preg_match( '/^\d{4}-\d{2}-\d{2}$/', $day ) ? $day : '';
	}

	/**
	 * The day after a store day.
	 *
	 * @param string $day Y-m-d.
	 * @return string Y-m-d.
	 */
	public static function next_day( $day ) {
		return ( new \DateTimeImmutable( $day, wp_timezone() ) )->modify( '+1 day' )->format( 'Y-m-d' );
	}
	/** Get UTC boundaries for inclusive store dates.
	 *
	 * @param string $from First store day.
	 * @param string $to Last store day.
	 * @return array
	 */
	public static function bounds( $from, $to ) {
		$utc = new \DateTimeZone( 'UTC' );
		return array( ( new \DateTimeImmutable( $from, wp_timezone() ) )->setTimezone( $utc )->format( 'Y-m-d H:i:s' ), ( new \DateTimeImmutable( $to, wp_timezone() ) )->modify( '+1 day' )->setTimezone( $utc )->format( 'Y-m-d H:i:s' ) );
	}
	/** Aggregate raw rows into per-day per-campaign session counts and product picks.
	 *
	 * @param string $from First date.
	 * @param string $to Last date.
	 * @param int    $campaign Campaign filter.
	 * @return array
	 */
	public static function raw_days( $from, $to, $campaign ) {
		global $wpdb;
		$table               = $wpdb->prefix . 'mmbb_events';
		list( $start, $end ) = self::bounds( $from, $to );
		// Start at the first day that has events, so an open range does not walk empty days.
		$first = $wpdb->get_var( $wpdb->prepare( 'SELECT MIN(created_at) FROM %i WHERE created_at >= %s AND created_at < %s AND (%d = 0 OR campaign_id = %d)', $table, $start, $end, $campaign, $campaign ) );
		if ( ! $first ) {
			return array();
		}
		$day    = max( (string) $from, wp_date( 'Y-m-d', strtotime( $first . ' UTC' ), wp_timezone() ) );
		$groups = array();
		$map    = array(
			'view'         => 'views',
			'add_item'     => 'started',
			'tier_reached' => 'tier_reached',
			'add_to_cart'  => 'carts',
		);
		// One query per store day: each groups that day's events by session, so no raw rows reach PHP.
		while ( $day <= $to ) {
			list( $day_start, $day_end ) = self::bounds( $day, $day );
			$events                      = $wpdb->get_results( $wpdb->prepare( 'SELECT campaign_id,event,session,product_id,COUNT(*) AS n FROM %i WHERE created_at >= %s AND created_at < %s AND (%d = 0 OR campaign_id = %d) GROUP BY campaign_id,event,session,product_id', $table, $day_start, $day_end, $campaign, $campaign ), ARRAY_A );
			foreach ( $events as $event ) {
				$key = $day . ':' . $event['campaign_id'];
				if ( ! isset( $groups[ $key ] ) ) {
					$groups[ $key ] = array(
						'day'          => $day,
						'campaign_id'  => (int) $event['campaign_id'],
						'views'        => array(),
						'started'      => array(),
						'tier_reached' => array(),
						'carts'        => array(),
						'products'     => array(),
					);
				}
				if ( isset( $map[ $event['event'] ] ) ) {
					$groups[ $key ][ $map[ $event['event'] ] ][ $event['session'] ] = true;
				}
				if ( 'add_item' === $event['event'] ) {
					$id                                = (int) $event['product_id'];
					$groups[ $key ]['products'][ $id ] = ( isset( $groups[ $key ]['products'][ $id ] ) ? $groups[ $key ]['products'][ $id ] : 0 ) + (int) $event['n'];
				}
			}
			$day = self::next_day( $day );
		}
		foreach ( $groups as &$row ) {
			foreach ( $map as $column ) {
				$row[ $column ] = count( $row[ $column ] );
			}
			ksort( $row['products'] );
			$row['products'] = wp_json_encode( $row['products'] );
		}
		unset( $row );
		return array_values( $groups );
	}
	/** Read daily rows, falling back to raw events for days the rollup has not summarised yet.
	 *
	 * Only days after Query::rolled_through() are read from the raw events, so a report reads the
	 * small daily table plus, usually, today's events. Before the first rollup every day is read raw.
	 *
	 * @param string $from First date.
	 * @param string $to Last date.
	 * @param int    $campaign Campaign filter.
	 * @return array
	 */
	private static function rows( $from, $to, $campaign ) {
		global $wpdb;
		$rows   = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i WHERE day >= %s AND day <= %s AND (%d = 0 OR campaign_id = %d)', $wpdb->prefix . 'mmbb_stats_daily', $from, $to, $campaign, $campaign ), ARRAY_A );
		$merged = array();
		foreach ( $rows as $row ) {
			$merged[ $row['day'] . ':' . $row['campaign_id'] ] = $row;
		}
		$rolled   = self::rolled_through();
		$raw_from = '' !== $rolled && $rolled >= $from ? self::next_day( $rolled ) : $from;
		if ( $raw_from > $to ) {
			return array_values( $merged );
		}
		foreach ( self::raw_days( $raw_from, $to, $campaign ) as $row ) {
			$merged[ $row['day'] . ':' . $row['campaign_id'] ] = $row;
		}
		return array_values( $merged );
	}
	/** Get a complete report for validated filters.
	 *
	 * @param string $from First date.
	 * @param string $to Last date.
	 * @param int    $campaign Campaign filter.
	 * @param bool   $compare Include previous period.
	 * @return array
	 */
	public function report( $from, $to, $campaign = 0, $compare = true ) {
		$key    = 'mmbb_report_' . md5( wp_json_encode( array( $from, $to, $campaign, $compare, get_option( 'mmbb_analytics_generation' ), get_locale(), wc_get_price_decimals() ) ) );
		$cached = get_transient( $key );
		if ( false !== $cached ) {
			return $cached;
		}
		$current  = $this->period( $from, $to, $campaign );
		$start    = new \DateTimeImmutable( $from, wp_timezone() );
		$length   = $start->diff( new \DateTimeImmutable( $to, wp_timezone() ) )->days + 1;
		$previous = $compare ? $this->period( $start->modify( '-' . $length . ' days' )->format( 'Y-m-d' ), $start->modify( '-1 day' )->format( 'Y-m-d' ), $campaign ) : null;
		$kpis     = array();
		foreach ( array( 'revenue', 'boxes', 'avg_box_value', 'items_per_box', 'discount', 'conversion' ) as $name ) {
			$value         = $current['totals'][ $name ];
			$prev          = $previous ? $previous['totals'][ $name ] : null;
			$kpis[ $name ] = array(
				'value'    => $value,
				'previous' => $prev,
				'delta'    => $prev ? ( 'conversion' === $name ? $value - $prev : ( $value - $prev ) / $prev * 100 ) : null,
				'series'   => array_column( $current['daily'], $name ),
			);
		}
		$series = array();
		foreach ( array_values( $current['daily'] ) as $i => $row ) {
			$series[] = array(
				'date'     => $row['date'],
				'revenue'  => $row['revenue'],
				'previous' => $previous ? array_values( $previous['daily'] )[ $i ]['revenue'] : null,
			);
		}
		$result = array(
			'from'              => $from,
			'to'                => $to,
			'campaign'          => (int) $campaign,
			'compare'           => $compare,
			'kpis'              => $kpis,
			'series'            => $series,
			'funnel'            => $current['funnel'],
			'top_products'      => $current['products'],
			'tier_distribution' => $current['tiers'],
			'campaigns'         => $current['campaigns'],
		);
		set_transient( $key, $result, 10 * MINUTE_IN_SECONDS );
		return $result;
	}
	/** Aggregate one period.
	 *
	 * @param string $from First date.
	 * @param string $to Last date.
	 * @param int    $campaign Campaign filter.
	 * @return array
	 */
	private function period( $from, $to, $campaign ) {
		global $wpdb;
		$daily = array();
		$day   = new \DateTimeImmutable( $from, wp_timezone() );
		while ( $day->format( 'Y-m-d' ) <= $to ) {
			$date           = $day->format( 'Y-m-d' );
			$daily[ $date ] = array_merge( array( 'date' => $date ), self::empty_totals() );
			$day            = $day->modify( '+1 day' );
		}
		$campaigns = array();
		$products  = array();
		$tiers     = array();
		foreach ( self::rows( $from, $to, $campaign ) as $row ) {
			$id = (int) $row['campaign_id'];
			if ( ! isset( $campaigns[ $id ] ) ) {
				$campaigns[ $id ] = self::empty_totals();
			}
			foreach ( array( 'views', 'started', 'tier_reached', 'carts' ) as $column ) {
				$daily[ $row['day'] ][ $column ] += (int) $row[ $column ];
				$campaigns[ $id ][ $column ]     += (int) $row[ $column ];
			}
			foreach ( (array) json_decode( $row['products'] ? $row['products'] : '{}', true ) as $product_id => $count ) {
				$products[ $product_id ] = ( isset( $products[ $product_id ] ) ? $products[ $product_id ] : 0 ) + $count;
			}
		}
		$sales = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM %i WHERE day >= %s AND day <= %s AND refunded = 0 AND (%d = 0 OR campaign_id = %d)', $wpdb->prefix . 'mmbb_purchases', $from, $to, $campaign, $campaign ), ARRAY_A );
		foreach ( $sales as $sale ) {
			$id = (int) $sale['campaign_id'];
			if ( ! isset( $campaigns[ $id ] ) ) {
				$campaigns[ $id ] = self::empty_totals();
			}
			$values = array(
				'boxes'    => (int) $sale['boxes'],
				'items'    => (int) $sale['items'],
				'revenue'  => \MixMax\BoxBuilder\Pricing::to_minor( $sale['value'], wc_get_price_decimals() ),
				'discount' => \MixMax\BoxBuilder\Pricing::to_minor( $sale['discount'], wc_get_price_decimals() ),
			);
			foreach ( $values as $column => $value ) {
				$daily[ $sale['day'] ][ $column ] += $value;
				$campaigns[ $id ][ $column ]      += $value;
			}
			$tier           = $sale['tier_data'] ? $sale['tier_data'] : 'null';
			$tiers[ $tier ] = ( isset( $tiers[ $tier ] ) ? $tiers[ $tier ] : 0 ) + (int) $sale['boxes'];
		}
		$total = self::empty_totals();
		foreach ( $daily as &$row ) {
			foreach ( $total as $column => $unused ) {
				$total[ $column ] += $row[ $column ];
			}
			$row = self::ratios( $row );
		}
		unset( $row );
		$total         = self::ratios( $total );
		$performance   = array();
		$deleted       = self::empty_totals();
		$deleted_count = 0;
		foreach ( $campaigns as $id => $values ) {
			$post = get_post( $id );
			if ( ! $post ) {
				++$deleted_count;
				foreach ( $deleted as $column => $unused ) {
					$deleted[ $column ] += $values[ $column ];
				}
				continue;
			}
			$performance[] = array_merge(
				array(
					'id'   => $id,
					'name' => get_the_title( $post ),
				),
				self::ratios( $values )
			);
		}
		if ( $deleted_count ) {
			$performance[] = array_merge(
				array(
					'id'      => 0,
					/* translators: %d: Number of deleted box campaigns represented by this row. */
					'name'    => sprintf( _n( 'Deleted box (%d)', 'Deleted boxes (%d)', $deleted_count, 'productboxes-mix-and-match-box-builder' ), $deleted_count ),
					'deleted' => true,
				),
				self::ratios( $deleted )
			);
		}
		usort(
			$performance,
			static function ( $a, $b ) {
				return $b['revenue'] <=> $a['revenue'];
			}
		);
		arsort( $products );
		$picks = array();
		$other = 0;
		foreach ( $products as $id => $count ) {
			if ( count( $picks ) >= 6 && count( $products ) > 7 ) {
				$other += $count;
				continue;
			}
			$product = wc_get_product( $id );
			$picks[] = array(
				'id'    => (int) $id,
				'name'  => $product ? $product->get_name() : __( 'Deleted product', 'productboxes-mix-and-match-box-builder' ),
				'count' => $count,
			);
		}
		if ( $other ) {
			$picks[] = array(
				'id'    => 0,
				'name'  => __( 'Other', 'productboxes-mix-and-match-box-builder' ),
				'count' => $other,
			);
		}
		arsort( $tiers );
		$distribution = array();
		$other_boxes  = 0;
		foreach ( $tiers as $json => $boxes ) {
			if ( count( $distribution ) >= 6 && count( $tiers ) > 7 ) {
				$other_boxes += $boxes;
				continue; }
			$tier           = json_decode( $json, true );
			$distribution[] = array(
				'qty'   => isset( $tier['qty'] ) ? (int) $tier['qty'] : 0,
				'tier'  => $tier,
				'boxes' => $boxes,
				'share' => $total['boxes'] ? 100 * $boxes / $total['boxes'] : 0,
			);
		}
		if ( $other_boxes ) {
			$distribution[] = array(
				'qty'   => 0,
				'other' => true,
				'boxes' => $other_boxes,
				'share' => 100 * $other_boxes / $total['boxes'],
			); }

		$funnel = array();
		foreach ( array(
			'view'         => 'views',
			'started'      => 'started',
			'tier_reached' => 'tier_reached',
			'add_to_cart'  => 'carts',
			'purchased'    => 'boxes',
		) as $step => $column ) {
			$funnel[] = array(
				'step'  => $step,
				'count' => $total[ $column ],
			);
		}
		return array(
			'totals'    => $total,
			'daily'     => $daily,
			'campaigns' => $performance,
			'products'  => $picks,
			'tiers'     => $distribution,
			'funnel'    => $funnel,
		);
	}
	/**
	 * All-time totals for each campaign, for the Campaigns list: boxes sold, revenue in minor units and conversion.
	 *
	 * @return array<int, array{boxes_sold:int, revenue:int, conversion:float}>
	 */
	public static function campaign_totals() {
		global $wpdb;
		$key    = 'mmbb_campaign_totals_' . md5( (string) get_option( 'mmbb_analytics_generation' ) . wc_get_price_decimals() );
		$cached = get_transient( $key );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$views = array();
		foreach ( self::rows( '1970-01-01', wp_date( 'Y-m-d' ), 0 ) as $row ) {
			$id           = (int) $row['campaign_id'];
			$views[ $id ] = ( isset( $views[ $id ] ) ? $views[ $id ] : 0 ) + (int) $row['views'];
		}

		$totals = array();
		$sales  = $wpdb->get_results( $wpdb->prepare( 'SELECT campaign_id, SUM(boxes) AS boxes, SUM(value) AS value FROM %i WHERE refunded = 0 GROUP BY campaign_id', $wpdb->prefix . 'mmbb_purchases' ), ARRAY_A );
		foreach ( $sales as $sale ) {
			$id            = (int) $sale['campaign_id'];
			$boxes         = (int) $sale['boxes'];
			$totals[ $id ] = array(
				'boxes_sold' => $boxes,
				'revenue'    => \MixMax\BoxBuilder\Pricing::to_minor( $sale['value'], wc_get_price_decimals() ),
				'conversion' => ! empty( $views[ $id ] ) ? min( 100, 100 * $boxes / $views[ $id ] ) : 0,
			);
		}

		set_transient( $key, $totals, 10 * MINUTE_IN_SECONDS );
		return $totals;
	}

	/** Initial counters.
	 *
	 * @return array
	 */
	private static function empty_totals() {
		return array_fill_keys( array( 'views', 'started', 'tier_reached', 'carts', 'boxes', 'items', 'revenue', 'discount' ), 0 );
	}
	/** Derived metrics, guarded for empty periods.
	 *
	 * @param array $row Counters.
	 * @return array
	 */
	private static function ratios( $row ) {
		$row['avg_box_value'] = $row['boxes'] ? (int) round( $row['revenue'] / $row['boxes'] ) : 0;
		$row['items_per_box'] = $row['boxes'] ? $row['items'] / $row['boxes'] : 0;
		$row['conversion']    = $row['views'] ? 100 * $row['boxes'] / $row['views'] : 0;
		return $row;
	}
}
