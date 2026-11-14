<?php
/**
 * Test double: an integration for something that is not installed.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Compatibility\Integration;

/** An integration for something that is not installed. */
class Mmbb_Test_Inactive_Integration extends Integration {
	/**
	 * Never active.
	 *
	 * @return bool
	 */
	public function is_active() {
		return false;
	}

	/** Must not run. */
	public function register() {
		Mmbb_Test_Active_Integration::$registered += 100;
	}
}
