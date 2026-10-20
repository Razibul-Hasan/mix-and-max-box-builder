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
	/** Invalidate reports after every collection, purchase, refund or rollup. */
	public static function bust() {
		update_option( 'mmbb_analytics_generation', wp_generate_uuid4(), false );
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
		list( $start, $end ) = self::bounds( $from, $to );
		$events              = $wpdb->get_results( $wpdb->prepare( 'SELECT campaign_id,event,session,product_id,created_at FROM %i WHERE created_at >= %s AND created_at < %s AND (%d = 0 OR campaign_id = %d)', $wpdb->prefix . 'mmbb_events', $start, $end, $campaign, $campaign ), ARRAY_A );
		$groups              = array();
		$map                 = array(
			'view'         => 'views',
			'add_item'     => 'started',
			'tier_reached' => 'tier_reached',
			'add_to_cart'  => 'carts',
		);
		foreach ( $events as $event ) {
			$day = wp_date( 'Y-m-d', strtotime( $event['created_at'] . ' UTC' ), wp_timezone() );
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
				$groups[ $key ]['products'][ $id ] = isset( $groups[ $key ]['products'][ $id ] ) ? $groups[ $key ]['products'][ $id ] + 1 : 1;
			}
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
	/** Read daily rows, falling back to raw events when a day has not rolled up.
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
		foreach ( self::raw_days( $from, $to, $campaign ) as $row ) {
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
		Collector::remember( $key );
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
		$total       = self::ratios( $total );
		$performance = array();
		foreach ( $campaigns as $id => $values ) {
			$performance[] = array_merge(
				array(
					'id'   => $id,
					'name' => get_the_title( $id ) ? get_the_title( $id ) : __( 'Deleted campaign', 'mix-and-max-box-builder' ),
				),
				self::ratios( $values )
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
				'name'  => $product ? $product->get_name() : __( 'Deleted product', 'mix-and-max-box-builder' ),
				'count' => $count,
			);
		}
		if ( $other ) {
			$picks[] = array(
				'id'    => 0,
				'name'  => __( 'Other', 'mix-and-max-box-builder' ),
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
