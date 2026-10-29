<?php
/**
 * Starting points for a new campaign.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Campaigns;

defined( 'ABSPATH' ) || exit;

/** The template picker's choices. Filterable with `mmbb_templates`. */
final class Templates {
	/**
	 * All templates.
	 *
	 * Each is { id, title, type_label, description, art[], config }. `config` is a
	 * partial config; it is sanitized onto the defaults when a campaign is created.
	 *
	 * @return array[]
	 */
	public static function all() {
		$templates = array(
			array(
				'id'          => 'blank',
				'title'       => __( 'Start blank', 'productboxes-mix-and-match-box-builder' ),
				'type_label'  => __( 'Any type', 'productboxes-mix-and-match-box-builder' ),
				'description' => __( 'Empty rules. Best when you already know your tiers.', 'productboxes-mix-and-match-box-builder' ),
				'art'         => array(),
				'config'      => array(),
			),
			array(
				'id'          => 'holiday',
				'title'       => __( 'Holiday treat box', 'productboxes-mix-and-match-box-builder' ),
				'type_label'  => __( 'Tiered mix', 'productboxes-mix-and-match-box-builder' ),
				'description' => __( 'Up to 12 items. 10 / 15 / 25% off. Countdown on.', 'productboxes-mix-and-match-box-builder' ),
				'art'         => array( 'cookie', 'macaron', 'donut', 'chocolate' ),
				'config'      => array(
					'type'     => 'tiered',
					'box'      => array(
						'capacity'         => 12,
						'min_items'        => 4,
						'allow_duplicates' => true,
						'max_per_product'  => 12,
						'hide_sold_out'    => false,
					),
					'tiers'    => array(
						self::step( 4, 'percent', 10 ),
						self::step( 6, 'percent', 15 ),
						self::step( 12, 'percent', 25 ),
					),
					'schedule' => array( 'countdown_days' => 14 ),
					'design'   => array(
						'headline' => __( 'Build your holiday treat box', 'productboxes-mix-and-match-box-builder' ),
						'intro'    => __( 'Pick your favourites. The more you add, the more you save.', 'productboxes-mix-and-match-box-builder' ),
						'sticker'  => __( 'Save up to 25%', 'productboxes-mix-and-match-box-builder' ),
					),
				),
			),
			array(
				'id'          => 'spa',
				'title'       => __( 'Build-a-spa kit', 'productboxes-mix-and-match-box-builder' ),
				'type_label'  => __( 'Fixed box', 'productboxes-mix-and-match-box-builder' ),
				'description' => __( 'Sizes 4 and 6. Gift wrap add-on.', 'productboxes-mix-and-match-box-builder' ),
				'art'         => array( 'soap', 'candle', 'honey', 'tea' ),
				'config'      => array(
					'type'   => 'fixed',
					'box'    => array(
						'capacity'         => 6,
						'min_items'        => 4,
						'allow_duplicates' => false,
						'max_per_product'  => 1,
					),
					'sizes'  => array(
						array_merge( self::step( 4, 'percent', 10 ), array( 'tag' => 'popular' ) ),
						array_merge( self::step( 6, 'percent', 15 ), array( 'tag' => 'best_value' ) ),
					),
					'extras' => array(
						'gift_wrap' => array(
							'enabled' => true,
							'fee'     => 3,
						),
					),
					'design' => array(
						'headline' => __( 'Build your own spa kit', 'productboxes-mix-and-match-box-builder' ),
						'sticker'  => __( 'Save up to 15%', 'productboxes-mix-and-match-box-builder' ),
					),
				),
			),
			array(
				'id'          => 'snack',
				'title'       => __( 'Snack pack', 'productboxes-mix-and-match-box-builder' ),
				'type_label'  => __( 'Bundle price', 'productboxes-mix-and-match-box-builder' ),
				'description' => __( 'Any 6 for one price. Duplicates allowed.', 'productboxes-mix-and-match-box-builder' ),
				'art'         => array( 'cookie', 'chocolate', 'donut', 'cookie' ),
				'config'      => array(
					'type'   => 'bundle',
					'box'    => array(
						'capacity'         => 6,
						'min_items'        => 6,
						'allow_duplicates' => true,
						'max_per_product'  => 6,
					),
					'bundle' => array(
						'qty'   => 6,
						'price' => 20,
					),
					'design' => array(
						'headline' => __( 'Any 6 snacks for one price', 'productboxes-mix-and-match-box-builder' ),
					),
				),
			),
			array(
				'id'          => 'gift',
				'title'       => __( 'Build-a-gift', 'productboxes-mix-and-match-box-builder' ),
				'type_label'  => __( 'Fixed box', 'productboxes-mix-and-match-box-builder' ),
				'description' => __( 'One size, gift message, no prices inside.', 'productboxes-mix-and-match-box-builder' ),
				'art'         => array( 'candle', 'tea', 'macaron', 'honey' ),
				'config'      => array(
					'type'   => 'fixed',
					'box'    => array(
						'capacity'         => 4,
						'min_items'        => 4,
						'allow_duplicates' => false,
						'max_per_product'  => 1,
					),
					'sizes'  => array(
						self::step( 4, 'percent', 0 ),
					),
					'extras' => array(
						'gift_message' => true,
						'gift_wrap'    => array(
							'enabled' => true,
							'fee'     => 3,
						),
					),
					'design' => array(
						'headline' => __( 'Build a gift box', 'productboxes-mix-and-match-box-builder' ),
					),
				),
			),
		);

		/**
		 * Filter the campaign templates.
		 *
		 * @param array[] $templates Templates, each { id, title, type_label, description, art, config }.
		 */
		$filtered = apply_filters( 'mmbb_templates', $templates );
		return is_array( $filtered ) ? array_values( $filtered ) : $templates;
	}

	/**
	 * Find one template.
	 *
	 * @param string $id Template id.
	 * @return array|null
	 */
	public static function get( $id ) {
		foreach ( self::all() as $template ) {
			if ( isset( $template['id'] ) && $template['id'] === $id ) {
				return $template;
			}
		}
		return null;
	}

	/**
	 * One tier or size row.
	 *
	 * @param int       $qty   Item count.
	 * @param string    $type  Discount type.
	 * @param int|float $value Discount value.
	 * @return array
	 */
	private static function step( $qty, $type, $value ) {
		return array(
			'qty'           => $qty,
			'discount_type' => $type,
			'value'         => $value,
		);
	}
}
