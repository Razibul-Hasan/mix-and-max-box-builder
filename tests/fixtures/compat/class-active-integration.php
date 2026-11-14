<?php
/**
 * Test double: an integration that is active.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Compatibility\Integration;

/** An integration that says it is active. */
class Mmbb_Test_Active_Integration extends Integration {
	/**
	 * Number of times register() ran.
	 *
	 * @var int
	 */
	public static $registered = 0;

	/**
	 * Always active.
	 *
	 * @return bool
	 */
	public function is_active() {
		return true;
	}

	/** Count the call. */
	public function register() {
		++self::$registered;
	}
}
