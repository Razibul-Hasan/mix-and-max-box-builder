<?php
/**
 * Tests for the pure box rules.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Campaigns\Config;
use MixMax\BoxBuilder\Cart\Box_Rules;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** Merging, capacity, duplicates and per-product caps. */
class BoxRulesTest extends TestCase {
	/**
	 * A tiered config with the given box rules.
	 *
	 * @param array $box   Box overrides.
	 * @param array $caps  Per-product caps.
	 * @param array $extra Top-level overrides.
	 * @return array
	 */
	private function config( array $box = array(), array $caps = array(), array $extra = array() ) {
		return Config::sanitize(
			array_merge(
				array(
					'box'      => array_merge( array( 'capacity' => 6 ), $box ),
					'products' => array( 'caps' => $caps ),
				),
				$extra
			)
		);
	}

	/** Merge adds rows for the same item and drops empty ones. */
	public function test_merge_adds_rows_for_the_same_item_and_drops_empty_ones() {
		$rows = Box_Rules::merge(
			array(
				array(
					'product_id'   => 5,
					'variation_id' => 0,
					'qty'          => 1,
				),
				array(
					'product_id'   => 5,
					'variation_id' => 0,
					'qty'          => 2,
				),
				array(
					'product_id'   => 9,
					'variation_id' => 12,
					'qty'          => 1,
				),
				array(
					'product_id'   => 9,
					'variation_id' => 13,
					'qty'          => 1,
				),
				array(
					'product_id'   => 7,
					'variation_id' => 0,
					'qty'          => 0,
				),
				array(
					'product_id'   => 0,
					'variation_id' => 0,
					'qty'          => 3,
				),
			)
		);

		$this->assertCount( 3, $rows );
		$this->assertSame( 3, $rows[0]['qty'] );
		$this->assertSame( 12, Box_Rules::key( $rows[1]['product_id'], $rows[1]['variation_id'] ) );
		$this->assertSame( 13, Box_Rules::key( $rows[2]['product_id'], $rows[2]['variation_id'] ) );
	}

	/** A box within its rules passes. */
	public function test_a_box_within_its_rules_passes() {
		$rows = array(
			array(
				'product_id'   => 1,
				'variation_id' => 0,
				'qty'          => 2,
			),
			array(
				'product_id'   => 2,
				'variation_id' => 0,
				'qty'          => 4,
			),
		);
		$this->assertNull( Box_Rules::check( $this->config(), $rows ) );
	}

	/** More items than the capacity is refused. */
	public function test_more_items_than_the_capacity_is_refused() {
		$rows = array(
			array(
				'product_id'   => 1,
				'variation_id' => 0,
				'qty'          => 7,
			),
		);
		$this->assertSame( 'over_capacity', Box_Rules::check( $this->config( array( 'max_per_product' => 6 ) ), $rows ) );
	}

	/** Without duplicates each item may appear once. */
	public function test_without_duplicates_each_item_may_appear_once() {
		$rows = array(
			array(
				'product_id'   => 1,
				'variation_id' => 0,
				'qty'          => 2,
			),
		);
		$this->assertSame( 'duplicate', Box_Rules::check( $this->config( array( 'allow_duplicates' => false ) ), $rows ) );
	}

	/** A per product cap applies below the box wide limit. */
	public function test_a_per_product_cap_applies_below_the_box_wide_limit() {
		$config = $this->config( array( 'max_per_product' => 5 ), array( 3 => 2 ) );
		$this->assertSame( 2, Box_Rules::limit_for( $config, 3 ) );
		$this->assertSame( 5, Box_Rules::limit_for( $config, 4 ) );
		$this->assertSame(
			'over_cap',
			Box_Rules::check(
				$config,
				array(
					array(
						'product_id'   => 3,
						'variation_id' => 0,
						'qty'          => 3,
					),
				)
			)
		);
	}

	/** A fixed box may hold up to its largest size. */
	public function test_a_fixed_box_may_hold_up_to_its_largest_size() {
		$config = $this->config(
			array( 'capacity' => 12 ),
			array(),
			array(
				'type'  => 'fixed',
				'sizes' => array(
					array(
						'qty'           => 4,
						'discount_type' => 'percent',
						'value'         => 5,
					),
					array(
						'qty'           => 6,
						'discount_type' => 'percent',
						'value'         => 10,
					),
				),
			)
		);
		$rows   = array(
			array(
				'product_id'   => 1,
				'variation_id' => 0,
				'qty'          => 6,
			),
		);
		$this->assertNull( Box_Rules::check( $config, $rows ) );
	}

	/** A bundle holds exactly its quantity at most. */
	public function test_a_bundle_holds_exactly_its_quantity_at_most() {
		$config = $this->config(
			array( 'capacity' => 12 ),
			array(),
			array(
				'type'   => 'bundle',
				'bundle' => array(
					'qty'   => 3,
					'price' => 20,
				),
			)
		);
		$rows   = array(
			array(
				'product_id'   => 1,
				'variation_id' => 0,
				'qty'          => 4,
			),
		);
		$this->assertSame( 'over_capacity', Box_Rules::check( $config, $rows ) );
	}
}
