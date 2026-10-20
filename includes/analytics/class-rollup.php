<?php
/**
 * Daily durable summaries and purchase ledger.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Analytics;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery -- Owned tables; Query caches reports, writes invalidate them.
/** Roll up anonymous sessions; keep order-line identities for late refunds and deduplication. */
final class Rollup {
	/** Register scheduling and order lifecycle hooks. */
	public function register() {
		add_action( 'init', array( $this, 'schedule' ), 20 );
		add_action( 'mmbb_rollup_daily', array( $this, 'run' ) );
		add_action( 'woocommerce_order_status_processing', array( $this, 'purchase' ) );
		add_action( 'woocommerce_order_status_completed', array( $this, 'purchase' ) );
		add_action( 'woocommerce_order_status_cancelled', array( $this, 'refund' ) );
		add_action( 'woocommerce_order_status_refunded', array( $this, 'refund' ) );
		add_action( 'woocommerce_order_fully_refunded', array( $this, 'refund' ) );
	}
	/** Schedule near 02:00 in the store timezone, after Action Scheduler initializes. */
	public function schedule() {
		if ( function_exists( 'as_has_scheduled_action' ) && ! as_has_scheduled_action( 'mmbb_rollup_daily', array(), 'mmbb' ) ) {
			$next = new \DateTimeImmutable( 'today 02:00', wp_timezone() );
			if ( $next->getTimestamp() <= time() ) {
				$next = $next->modify( '+1 day' );
			}
			as_schedule_recurring_action( $next->getTimestamp(), DAY_IN_SECONDS, 'mmbb_rollup_daily', array(), 'mmbb', true );
		}
	}
	/** Record each paid box line once, including items-mode child totals.
	 *
	 * @param int $order_id Order id.
	 */
	public function purchase( $order_id ) {
		global $wpdb;
		if ( ! Collector::enabled() ) {
			return;
		}
		$order = wc_get_order( $order_id );
		if ( ! $order || ! $order->get_meta( '_mmbb_has_box' ) ) {
			return;
		}
		foreach ( $order->get_items() as $line_id => $line ) {
			$box = json_decode( (string) $line->get_meta( '_mmbb_box' ), true );
			if ( ! is_array( $box ) || empty( $box['campaign_id'] ) ) {
				continue;
			}
			$total        = (float) $line->get_total();
			$subtotal     = (float) $line->get_subtotal();
			$legacy_child = false;
			foreach ( $order->get_items() as $child ) {
				if ( '' === (string) $line->get_meta( 'mmbb_box_key' ) && isset( $box['mode'] ) && 'items' === $box['mode'] ) {
					if ( $child->get_id() === $line->get_id() ) {
						$legacy_child = true;
						continue; }
					if ( ! $child->get_meta( '_mmbb_box_part' ) ) {
						$legacy_child = false; }
					if ( $legacy_child ) {
						$total    += (float) $child->get_total();
						$subtotal += (float) $child->get_subtotal(); }
				}
				if ( '' !== (string) $line->get_meta( 'mmbb_box_key' ) && (string) $child->get_meta( 'mmbb_box_parent' ) === (string) $line->get_meta( 'mmbb_box_key' ) ) {
					$total    += (float) $child->get_total();
					$subtotal += (float) $child->get_subtotal();
				}
			}
			$boxes    = max( 1, (int) $line->get_quantity() );
			$date     = $order->get_date_paid() ? $order->get_date_paid() : $order->get_date_created();
			$day      = wp_date( 'Y-m-d', $date->getTimestamp(), wp_timezone() );
			$discount = ( isset( $box['quote']['discount'] ) ? $box['quote']['discount'] : 0 ) * $boxes / pow( 10, wc_get_price_decimals() );
			$wpdb->query(
				$wpdb->prepare(
					'INSERT IGNORE INTO %i (order_id,line_id,campaign_id,day,boxes,items,tier,value,discount,tier_data) VALUES (%d,%d,%d,%s,%d,%d,%d,%f,%f,%s)',
					$wpdb->prefix . 'mmbb_purchases',
					$order_id,
					$line_id,
					$box['campaign_id'],
					$day,
					$boxes,
					array_sum( array_column( $box['items'], 'qty' ) ) * $boxes,
					isset( $box['quote']['tier']['qty'] ) ? $box['quote']['tier']['qty'] : 0,
					$total,
					$discount + max( 0, $subtotal - $total ),
					wp_json_encode( isset( $box['quote']['tier'] ) ? $box['quote']['tier'] : null )
				)
			);
		}
		Query::bust();
	}
	/** Exclude full refunds and cancellations, preserving the deduplication key.
	 *
	 * @param int $order_id Order id.
	 */
	public function refund( $order_id ) {
		global $wpdb;
		$wpdb->update( $wpdb->prefix . 'mmbb_purchases', array( 'refunded' => 1 ), array( 'order_id' => absint( $order_id ) ) );
		$this->sync_sales();
		Query::bust();
	}
	/** Catch up every unrolled day before deleting raw rows; repeat runs replace identical totals. */
	public function run() {
		global $wpdb;
		Collector::session_hash( '' );
		$today = new \DateTimeImmutable( 'today', wp_timezone() );
		$end   = $today->setTimezone( new \DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );
		$dates = $wpdb->get_col( $wpdb->prepare( 'SELECT DISTINCT created_at FROM %i WHERE created_at < %s', $wpdb->prefix . 'mmbb_events', $end ) );
		$days  = array();
		foreach ( $dates as $date ) {
			$days[ wp_date( 'Y-m-d', strtotime( $date . ' UTC' ), wp_timezone() ) ] = true;
		}
		foreach ( array_keys( $days ) as $day ) {
			foreach ( Query::raw_days( $day, $day, 0 ) as $row ) {
				$wpdb->replace( $wpdb->prefix . 'mmbb_stats_daily', $row );
			}
		}
		$this->sync_sales();
		$cutoff = $today->modify( '-' . (int) \MixMax\BoxBuilder\Settings\Settings::get( 'analytics_retention_days' ) . ' days' )->setTimezone( new \DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );
		$wpdb->query( $wpdb->prepare( 'DELETE FROM %i WHERE created_at < %s', $wpdb->prefix . 'mmbb_events', $cutoff ) );
		Query::bust();
	}
	/** Refresh durable daily sales totals, including refunds after raw-event retention.
	 * Today stays live; the sales ledger preserves unique order and line identities.
	 */
	private function sync_sales() {
		global $wpdb;
		$wpdb->query(
			$wpdb->prepare(
				'INSERT INTO %i (day,campaign_id,orders,items,revenue,discount) SELECT day,campaign_id,SUM(IF(refunded=0,boxes,0)),SUM(IF(refunded=0,items,0)),SUM(IF(refunded=0,value,0)),SUM(IF(refunded=0,discount,0)) FROM %i GROUP BY day,campaign_id ON DUPLICATE KEY UPDATE orders=VALUES(orders),items=VALUES(items),revenue=VALUES(revenue),discount=VALUES(discount)',
				$wpdb->prefix . 'mmbb_stats_daily',
				$wpdb->prefix . 'mmbb_purchases'
			)
		);
	}
}
