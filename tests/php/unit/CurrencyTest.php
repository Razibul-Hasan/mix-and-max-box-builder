<?php
/**
 * Campaign amounts moved into the shopper's currency.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Currency;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** Only money amounts change; percentages, counts and everything else stay. */
final class CurrencyTest extends TestCase {
	/**
	 * A config with every kind of amount.
	 *
	 * @return array
	 */
	private function config() {
		return array(
			'type'   => 'tiered',
			'box'    => array( 'capacity' => 12 ),
			'tiers'  => array(
				array(
					'qty'           => 4,
					'discount_type' => 'percent',
					'value'         => 10,
				),
				array(
					'qty'           => 6,
					'discount_type' => 'fixed_amount',
					'value'         => 5,
				),
				array(
					'qty'           => 8,
					'discount_type' => 'box_price',
					'value'         => 40,
				),
			),
			'sizes'  => array(
				array(
					'qty'           => 6,
					'discount_type' => 'box_price',
					'value'         => 30,
				),
			),
			'bundle' => array(
				'qty'   => 6,
				'price' => 25,
			),
			'extras' => array( 'gift_wrap' => array( 'fee' => 2 ) ),
		);
	}

	/** Each amount is tagged with its kind, so an integration can round them differently. */
	public function test_amounts_are_passed_with_their_kind() {
		$seen = array();
		Currency::map_amounts(
			$this->config(),
			static function ( $amount, $kind ) use ( &$seen ) {
				$seen[] = $kind . ':' . $amount;
				return $amount;
			}
		);
		$this->assertSame( array( 'discount:5', 'price:40', 'price:30', 'price:25', 'fee:2' ), $seen );
	}

	/** Percentages and counts are never converted. */
	public function test_percentages_and_counts_are_left_alone() {
		$out = Currency::map_amounts(
			$this->config(),
			static function ( $amount ) {
				return $amount * 10;
			}
		);
		$this->assertSame( 10, $out['tiers'][0]['value'] );
		$this->assertSame( 4, $out['tiers'][0]['qty'] );
		$this->assertSame( 12, $out['box']['capacity'] );
		$this->assertSame( 50, $out['tiers'][1]['value'] );
		$this->assertSame( 400, $out['tiers'][2]['value'] );
		$this->assertSame( 300, $out['sizes'][0]['value'] );
		$this->assertSame( 250, $out['bundle']['price'] );
		$this->assertSame( 20, $out['extras']['gift_wrap']['fee'] );
	}

	/** A config without optional sections still works. */
	public function test_missing_sections_are_fine() {
		$out = Currency::map_amounts(
			array( 'type' => 'fixed' ),
			static function ( $amount ) {
				return $amount * 2;
			}
		);
		$this->assertSame( array( 'type' => 'fixed' ), $out );
	}
}
