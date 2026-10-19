<?php
/**
 * Computed campaign status, including time-zone edges.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Campaigns\Status;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** Status is derived from the post status, the pause flag and the schedule. */
class StatusTest extends TestCase {
	/**
	 * Timestamp of a UTC moment.
	 *
	 * @param string $iso ISO 8601 UTC.
	 * @return int
	 */
	private function ts( $iso ) {
		return ( new \DateTimeImmutable( $iso ) )->getTimestamp();
	}

	/**
	 * Compute with sensible defaults.
	 *
	 * @param array $args post_status, paused, start, end, now, zone.
	 * @return string
	 */
	private function status( array $args ) {
		$args += array(
			'post_status' => 'publish',
			'paused'      => false,
			'start'       => null,
			'end'         => null,
			'now'         => '2026-10-19T12:00:00Z',
			'zone'        => 'UTC',
		);
		return Status::compute( $args['post_status'], $args['paused'], $args['start'], $args['end'], $this->ts( $args['now'] ), new \DateTimeZone( $args['zone'] ) );
	}

	/** Unpublished campaigns are drafts whatever the schedule says. */
	public function test_draft() {
		$this->assertSame( 'draft', $this->status( array( 'post_status' => 'draft' ) ) );
		$this->assertSame( 'draft', $this->status( array( 'post_status' => 'trash', 'paused' => true ) ) ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
	}

	/** Pause wins over the schedule. */
	public function test_paused() {
		$this->assertSame( 'paused', $this->status( array( 'paused' => true, 'end' => '2020-01-01T00:00:00Z' ) ) ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
	}

	/** No dates means always on. */
	public function test_always_on_is_active() {
		$this->assertSame( 'active', $this->status( array() ) );
	}

	/** Start and end are inclusive of the start instant and exclusive of the end instant. */
	public function test_schedule_boundaries() {
		$this->assertSame( 'scheduled', $this->status( array( 'start' => '2026-10-19T12:00:01Z' ) ) );
		$this->assertSame( 'active', $this->status( array( 'start' => '2026-10-19T12:00:00Z' ) ) );
		$this->assertSame( 'ended', $this->status( array( 'end' => '2026-10-19T12:00:00Z' ) ) );
		$this->assertSame( 'ending_soon', $this->status( array( 'end' => '2026-10-19T12:00:01Z' ) ) );
	}

	/** Seven or more days left is plain active. */
	public function test_ending_soon_threshold() {
		$this->assertSame( 'ending_soon', $this->status( array( 'end' => '2026-10-26T11:59:59Z' ) ) );
		$this->assertSame( 'active', $this->status( array( 'end' => '2026-10-26T12:00:00Z' ) ) );
	}

	/** A week that crosses a daylight-saving change is still seven days on the store's clock. */
	public function test_ending_soon_uses_store_wall_clock_across_dst() {
		// New York leaves daylight time on 1 Nov 2026: that week is 7 days + 1 hour long.
		$args = array(
			'now'  => '2026-10-26T16:00:00Z', // 12:00 EDT.
			'zone' => 'America/New_York',
		);
		// 16:30Z on 2 Nov is 11:30 EST: before 12:00 EST seven wall-clock days later.
		$this->assertSame( 'ending_soon', $this->status( $args + array( 'end' => '2026-11-02T16:30:00Z' ) ) );
		// 17:00Z on 2 Nov is exactly 12:00 EST: seven full days, not "fewer than".
		$this->assertSame( 'active', $this->status( $args + array( 'end' => '2026-11-02T17:00:00Z' ) ) );
		// The same instants in UTC use a flat 168 hours.
		$utc = array( 'now' => '2026-10-26T16:00:00Z' );
		$this->assertSame( 'active', $this->status( $utc + array( 'end' => '2026-11-02T16:30:00Z' ) ) );
	}

	/** An unparseable date is treated as not set. */
	public function test_bad_dates_are_ignored() {
		$this->assertSame( 'active', $this->status( array( 'start' => 'nope', 'end' => '' ) ) ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
	}

	/** Only active and ending-soon campaigns are live for shoppers. */
	public function test_is_live() {
		$live = array_filter( Status::all(), array( Status::class, 'is_live' ) );
		$this->assertSame( array( 'active', 'ending_soon' ), array_values( $live ) );
	}
}
