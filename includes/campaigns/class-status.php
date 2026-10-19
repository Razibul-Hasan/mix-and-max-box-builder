<?php
/**
 * Computed campaign status. Pure PHP: the clock and time zone are passed in.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Campaigns;

defined( 'ABSPATH' ) || exit;

/** Work out whether a campaign is draft, scheduled, active, ending soon, ended or paused. */
final class Status {
	const DRAFT       = 'draft';
	const SCHEDULED   = 'scheduled';
	const ACTIVE      = 'active';
	const ENDING_SOON = 'ending_soon';
	const ENDED       = 'ended';
	const PAUSED      = 'paused';

	/** A campaign with fewer than this many days left is "ending soon". */
	const ENDING_SOON_DAYS = 7;

	/**
	 * All computed statuses.
	 *
	 * @return string[]
	 */
	public static function all() {
		return array( self::DRAFT, self::SCHEDULED, self::ACTIVE, self::ENDING_SOON, self::ENDED, self::PAUSED );
	}

	/**
	 * Compute the status.
	 *
	 * "Fewer than 7 days left" is counted on the store's wall clock, so a week that
	 * crosses a daylight-saving change is still seven calendar days.
	 *
	 * @param string        $post_status Post status (`draft` or `publish`).
	 * @param bool          $paused      Whether the campaign is paused.
	 * @param string|null   $start       Schedule start, UTC ISO 8601.
	 * @param string|null   $end         Schedule end, UTC ISO 8601.
	 * @param int           $now         Current Unix timestamp.
	 * @param \DateTimeZone $zone        The store's time zone.
	 * @return string
	 */
	public static function compute( $post_status, $paused, $start, $end, $now, \DateTimeZone $zone ) {
		if ( 'publish' !== $post_status ) {
			return self::DRAFT;
		}
		if ( $paused ) {
			return self::PAUSED;
		}

		$start_ts = Config::timestamp( $start );
		$end_ts   = Config::timestamp( $end );

		if ( null !== $start_ts && $start_ts > $now ) {
			return self::SCHEDULED;
		}
		if ( null !== $end_ts && $end_ts <= $now ) {
			return self::ENDED;
		}
		if ( null !== $end_ts ) {
			$limit = ( new \DateTimeImmutable( '@' . $now ) )
				->setTimezone( $zone )
				->modify( '+' . self::ENDING_SOON_DAYS . ' days' );
			if ( $end_ts < $limit->getTimestamp() ) {
				return self::ENDING_SOON;
			}
		}
		return self::ACTIVE;
	}

	/**
	 * Whether shoppers can use the campaign right now.
	 *
	 * @param string $status Computed status.
	 * @return bool
	 */
	public static function is_live( $status ) {
		return self::ACTIVE === $status || self::ENDING_SOON === $status;
	}
}
