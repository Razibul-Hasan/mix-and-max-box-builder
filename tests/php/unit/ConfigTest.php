<?php
/**
 * Config schema: defaults, bounds, clamps and validation.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Campaigns\Config;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** The config is the one contract between the editor, REST, storefront and pricing. */
class ConfigTest extends TestCase {
	/** Garbage in always gives a complete default config out. */
	public function test_non_array_input_gives_defaults() {
		foreach ( array( null, 'x', 12, true ) as $input ) {
			$this->assertSame( Config::defaults(), Config::sanitize( $input ) );
		}
	}

	/** Sanitizing a sanitized config changes nothing. */
	public function test_sanitize_is_idempotent() {
		$once = Config::sanitize(
			array(
				'type'   => 'fixed',
				'sizes'  => array(
					array(
						'qty'           => 6,
						'discount_type' => 'box_price',
						'value'         => '19.999',
						'tag'           => 'best_value',
					),
				),
				'design' => array( 'headline' => '  Mix  <b>6</b>  ' ),
			)
		);
		$this->assertSame( $once, Config::sanitize( $once ) );
		$this->assertSame( $once, Config::sanitize( array(), $once ) );
	}

	/** Unknown enum values fall back instead of being stored. */
	public function test_enums_reject_unknown_values() {
		$config = Config::sanitize(
			array(
				'type'     => 'mystery',
				'products' => array(
					'source' => 'sql',
					'order'  => 'random',
				),
				'design'   => array(
					'layout' => 'floating',
					'accent' => 'pink',
					'theme'  => 'sepia',
				),
			)
		);
		$this->assertSame( 'tiered', $config['type'] );
		$this->assertSame( 'manual', $config['products']['source'] );
		$this->assertSame( 'manual', $config['products']['order'] );
		$this->assertSame( 'default', $config['design']['layout'] );
		$this->assertSame( 'max', $config['design']['accent'] );
		$this->assertSame( 'light', $config['design']['theme'] );
	}

	/** Box numbers are clamped to their documented ranges. */
	public function test_box_bounds() {
		$box = Config::sanitize( array( 'box' => array( 'capacity' => 500, 'min_items' => 99, 'max_per_product' => 0 ) ) )['box']; // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
		$this->assertSame( 48, $box['capacity'] );
		$this->assertSame( 48, $box['min_items'] );
		$this->assertSame( 1, $box['max_per_product'] );

		$box = Config::sanitize( array( 'box' => array( 'capacity' => -4, 'min_items' => 'abc' ) ) )['box']; // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
		$this->assertSame( 1, $box['capacity'] );
		$this->assertSame( 1, $box['min_items'] );
	}

	/** Lowering the capacity re-clamps what depends on it. */
	public function test_capacity_reclamps_dependants() {
		$base   = Config::sanitize(
			array(
				'box'      => array(
					'capacity'        => 12,
					'min_items'       => 8,
					'max_per_product' => 10,
				),
				'tiers'    => array(
					array(
						'qty'           => 4,
						'discount_type' => 'percent',
						'value'         => 10,
					),
					array(
						'qty'           => 12,
						'discount_type' => 'percent',
						'value'         => 25,
					),
				),
				'products' => array( 'caps' => array( 5 => 10 ) ),
			)
		);
		$config = Config::sanitize( array( 'box' => array( 'capacity' => 6 ) ), $base );
		$this->assertSame( 6, $config['box']['min_items'] );
		$this->assertSame( 6, $config['box']['max_per_product'] );
		$this->assertSame( array( 4, 6 ), array_column( $config['tiers'], 'qty' ) );
		$this->assertSame( array( 5 => 6 ), $config['products']['caps'] );
	}

	/** Tiers are sorted, unique by quantity, limited to six and bounded. */
	public function test_tiers_sort_dedupe_and_limit() {
		$rows   = array(
			array(
				'qty'           => 12,
				'discount_type' => 'percent',
				'value'         => 25,
			),
			array(
				'qty'           => 4,
				'discount_type' => 'percent',
				'value'         => 10,
			),
			array(
				'qty'           => 4,
				'discount_type' => 'percent',
				'value'         => 99,
			),
			'not a row',
			array(
				'qty'           => 6,
				'discount_type' => 'percent',
				'value'         => 150,
			),
			array(
				'qty'           => 5,
				'discount_type' => 'weird',
				'value'         => -3,
			),
		);
		$config = Config::sanitize( array( 'tiers' => $rows ) );

		$this->assertSame( array( 4, 5, 6, 12 ), array_column( $config['tiers'], 'qty' ) );
		// The first of two tiers with the same quantity wins.
		$this->assertSame( 10, $config['tiers'][0]['value'] );
		// An unknown discount type becomes percent; negative values become zero.
		$this->assertSame( 'percent', $config['tiers'][1]['discount_type'] );
		$this->assertSame( 0, $config['tiers'][1]['value'] );
		// Percent is capped at 90.
		$this->assertSame( 90, $config['tiers'][2]['value'] );

		$many = array();
		for ( $i = 1; $i <= 10; $i++ ) {
			$many[] = array(
				'qty'           => $i,
				'discount_type' => 'percent',
				'value'         => $i,
			);
		}
		$this->assertCount( 6, Config::sanitize( array( 'tiers' => $many ) )['tiers'] );
	}

	/** Tier quantities beyond the capacity are clamped, then deduplicated. */
	public function test_tier_quantities_clamp_to_capacity() {
		$config = Config::sanitize(
			array(
				'box'   => array( 'capacity' => 6 ),
				'tiers' => array(
					array(
						'qty'           => 8,
						'discount_type' => 'percent',
						'value'         => 10,
					),
					array(
						'qty'           => 20,
						'discount_type' => 'percent',
						'value'         => 20,
					),
				),
			)
		);
		$this->assertSame( array( 6 ), array_column( $config['tiers'], 'qty' ) );
		$this->assertSame( 10, $config['tiers'][0]['value'] );
	}

	/** Fixed-box sizes keep a tag from the allowed list. */
	public function test_sizes_carry_a_valid_tag() {
		$config = Config::sanitize(
			array(
				'sizes' => array(
					array(
						'qty'           => 6,
						'discount_type' => 'percent',
						'value'         => 15,
						'tag'           => 'popular',
					),
					array(
						'qty'           => 4,
						'discount_type' => 'percent',
						'value'         => 10,
						'tag'           => '<script>',
					),
				),
			)
		);
		$this->assertSame( array( 4, 6 ), array_column( $config['sizes'], 'qty' ) );
		$this->assertSame( array( '', 'popular' ), array_column( $config['sizes'], 'tag' ) );
	}

	/** Free text is stripped of markup and clamped to its documented length. */
	public function test_text_length_clamps() {
		$config = Config::sanitize(
			array(
				'design' => array(
					'headline'  => str_repeat( 'a', 200 ),
					'intro'     => str_repeat( 'b', 500 ),
					'sticker'   => str_repeat( 'c', 60 ),
					'cta_label' => "<b>Add</b>\n\tbox " . str_repeat( 'd', 60 ),
				),
			)
		)['design'];
		$this->assertSame( 80, strlen( $config['headline'] ) );
		$this->assertSame( 240, strlen( $config['intro'] ) );
		$this->assertSame( 24, strlen( $config['sticker'] ) );
		$this->assertSame( 32, strlen( $config['cta_label'] ) );
		$this->assertStringStartsWith( 'Add box ddd', $config['cta_label'] );
	}

	/** Length is counted in characters, not bytes. */
	public function test_text_clamp_counts_characters() {
		$text = Config::sanitize( array( 'design' => array( 'sticker' => str_repeat( 'é', 40 ) ) ) )['design']['sticker'];
		$this->assertSame( 24, mb_strlen( $text ) );
	}

	/** Columns accept 0, 3, 4 and 5 only. */
	public function test_columns() {
		$this->assertSame( 4, Config::sanitize( array( 'design' => array( 'columns' => '4' ) ) )['design']['columns'] );
		$this->assertSame( 0, Config::sanitize( array( 'design' => array( 'columns' => 7 ) ) )['design']['columns'] );
	}

	/** Product ids are unique positive integers; caps are bounded by the capacity. */
	public function test_products() {
		$products = Config::sanitize(
			array(
				'box'      => array( 'capacity' => 6 ),
				'products' => array(
					'ids'      => array( '5', 5, 0, -3, 'x', 9, 12 ),
					'term_ids' => array( 3, '3', 4 ),
					'caps'     => array(
						9  => 99,
						12 => 'many',
						0  => 2,
					),
				),
			)
		)['products'];
		$this->assertSame( array( 5, 9, 12 ), $products['ids'] );
		$this->assertSame( array( 3, 4 ), $products['term_ids'] );
		$this->assertSame( array( 9 => 6 ), $products['caps'] );

		$ids = Config::sanitize( array( 'products' => array( 'ids' => range( 1, 300 ) ) ) )['products']['ids'];
		$this->assertCount( 200, $ids );
	}

	/** Dates are normalised to UTC; bad dates become null; the countdown is bounded. */
	public function test_schedule() {
		$schedule = Config::sanitize(
			array(
				'schedule' => array(
					'start'          => '2026-11-01T09:00:00+02:00',
					'end'            => 'not a date',
					'countdown_days' => 99,
				),
			)
		)['schedule'];
		$this->assertSame( '2026-11-01T07:00:00Z', $schedule['start'] );
		$this->assertNull( $schedule['end'] );
		$this->assertSame( 30, $schedule['countdown_days'] );

		$schedule = Config::sanitize( array( 'schedule' => array( 'end' => '2026-12-24 23:59:00' ) ) )['schedule'];
		$this->assertSame( '2026-12-24T23:59:00Z', $schedule['end'] );
		$this->assertNull( Config::sanitize( array( 'schedule' => array( 'start' => '' ) ) )['schedule']['start'] );
	}

	/** Money values are never negative and keep four decimals at most. */
	public function test_money() {
		$config = Config::sanitize(
			array(
				'bundle' => array(
					'qty'   => 5,
					'price' => '24.99999',
				),
				'extras' => array(
					'gift_message' => 'yes',
					'gift_wrap'    => array(
						'enabled' => 'true',
						'fee'     => -4,
					),
				),
			)
		);
		$this->assertSame( 25, $config['bundle']['price'] );
		$this->assertSame( 0, $config['extras']['gift_wrap']['fee'] );
		$this->assertTrue( $config['extras']['gift_message'] );
		$this->assertTrue( $config['extras']['gift_wrap']['enabled'] );
		$this->assertSame( 4.5, Config::sanitize( array( 'extras' => array( 'gift_wrap' => array( 'fee' => '4.50' ) ) ) )['extras']['gift_wrap']['fee'] );
	}

	/** A partial config merges onto the saved one, section by section. */
	public function test_partial_merge_keeps_other_keys() {
		$base   = Config::sanitize(
			array(
				'design' => array(
					'headline' => 'Keep me',
					'columns'  => 4,
				),
			)
		);
		$config = Config::sanitize( array( 'design' => array( 'columns' => 3 ) ), $base );
		$this->assertSame( 'Keep me', $config['design']['headline'] );
		$this->assertSame( 3, $config['design']['columns'] );
	}

	/** A blank tiered campaign is not ready to go live. */
	public function test_validate_flags_a_blank_campaign() {
		$errors = Config::validate( Config::defaults() );
		$codes  = array_column( $errors, 'code' );
		$this->assertContains( 'tiers_required', $codes );
		$this->assertContains( 'products_required', $codes );
	}

	/** A complete campaign has no errors. */
	public function test_validate_accepts_a_complete_campaign() {
		$config = Config::sanitize(
			array(
				'tiers'    => array(
					array(
						'qty'           => 4,
						'discount_type' => 'percent',
						'value'         => 10,
					),
				),
				'products' => array( 'ids' => array( 11 ) ),
			)
		);
		$this->assertSame( array(), Config::validate( $config ) );
	}

	/** Each type has its own required parts. */
	public function test_validate_per_type() {
		$fixed = Config::sanitize(
			array(
				'type'     => 'fixed',
				'products' => array(
					'source'   => 'category',
					'term_ids' => array( 2 ),
				),
			)
		);
		$this->assertSame( array( 'sizes_required' ), array_column( Config::validate( $fixed ), 'code' ) );

		$bundle = Config::sanitize(
			array(
				'type'     => 'bundle',
				'products' => array( 'ids' => array( 1 ) ),
			)
		);
		$this->assertSame( array( 'price_required' ), array_column( Config::validate( $bundle ), 'code' ) );
		$bundle['bundle']['price'] = 18;
		$this->assertSame( array(), Config::validate( $bundle ) );

		$tag = Config::sanitize(
			array(
				'tiers'    => array(
					array(
						'qty'           => 4,
						'discount_type' => 'percent',
						'value'         => 10,
					),
				),
				'products' => array( 'source' => 'tag' ),
			)
		);
		$this->assertSame( array( 'terms_required' ), array_column( Config::validate( $tag ), 'code' ) );
	}

	/** Validation catches problems that bypass sanitizing, and the schedule order. */
	public function test_validate_catches_unsanitized_input() {
		$config                    = Config::sanitize(
			array(
				'tiers'    => array(
					array(
						'qty'           => 4,
						'discount_type' => 'percent',
						'value'         => 10,
					),
				),
				'products' => array( 'ids' => array( 1 ) ),
				'schedule' => array(
					'start' => '2026-12-01T00:00:00Z',
					'end'   => '2026-11-01T00:00:00Z',
				),
			)
		);
		$config['tiers'][1]        = array(
			'qty'           => 3,
			'discount_type' => 'percent',
			'value'         => 95,
		);
		$config['box']['capacity'] = 2;
		$codes                     = array_column( Config::validate( $config ), 'code' );
		$this->assertContains( 'qty_not_ascending', $codes );
		$this->assertContains( 'qty_over_capacity', $codes );
		$this->assertContains( 'percent_too_high', $codes );
		$this->assertContains( 'end_before_start', $codes );
	}
}
