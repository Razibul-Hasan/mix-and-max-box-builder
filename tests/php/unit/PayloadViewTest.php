<?php
/**
 * Which layout, columns and hero the storefront uses.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Campaigns\Config;
use MixMax\BoxBuilder\Storefront\Payload;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** The block or shortcode wins, then the campaign design, then the settings. */
class PayloadViewTest extends TestCase {
	/**
	 * A config with design overrides.
	 *
	 * @param array $design Design values to change.
	 * @return array
	 */
	private function config( array $design = array() ) {
		$config           = Config::defaults();
		$config['design'] = array_merge( $config['design'], $design );
		return $config;
	}

	/**
	 * Plugin settings.
	 *
	 * @return array
	 */
	private function settings() {
		return array(
			'summary_layout' => 'both',
			'columns'        => 4,
		);
	}

	/** With nothing set anywhere, the settings decide. */
	public function test_settings_are_the_fallback() {
		$view = Payload::view( $this->config(), $this->settings(), array() );
		$this->assertSame( 'both', $view['layout'] );
		$this->assertSame( 4, $view['columns'] );
		$this->assertTrue( $view['showHero'] );
	}

	/** The campaign design beats the settings. */
	public function test_design_beats_settings() {
		$view = Payload::view(
			$this->config(
				array(
					'layout'  => 'bar',
					'columns' => 5,
				)
			),
			$this->settings(),
			array()
		);
		$this->assertSame( 'bar', $view['layout'] );
		$this->assertSame( 5, $view['columns'] );
	}

	/** The block or shortcode beats the design, and may hide the hero. */
	public function test_block_beats_design() {
		$view = Payload::view(
			$this->config(
				array(
					'layout'  => 'bar',
					'columns' => 5,
				)
			),
			$this->settings(),
			array(
				'layout'    => 'panel',
				'columns'   => 3,
				'show_hero' => false,
			)
		);
		$this->assertSame( 'panel', $view['layout'] );
		$this->assertSame( 3, $view['columns'] );
		$this->assertFalse( $view['showHero'] );
	}

	/** Bad values fall through to the next level. */
	public function test_invalid_values_fall_through() {
		$view = Payload::view(
			$this->config(),
			$this->settings(),
			array(
				'layout'  => 'sideways',
				'columns' => 9,
			)
		);
		$this->assertSame( 'both', $view['layout'] );
		$this->assertSame( 4, $view['columns'] );
	}

	/** A block cannot turn the hero on when the campaign hides it. */
	public function test_block_cannot_force_the_hero_on() {
		$view = Payload::view( $this->config( array( 'show_hero' => false ) ), $this->settings(), array( 'show_hero' => true ) );
		$this->assertFalse( $view['showHero'] );
	}
}
