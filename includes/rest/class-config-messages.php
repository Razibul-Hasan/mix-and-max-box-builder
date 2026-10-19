<?php
/**
 * Translated messages for config validation codes.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

defined( 'ABSPATH' ) || exit;

/** Turn Config::validate() codes into messages the editor can show inline. */
final class Config_Messages {
	/**
	 * Add a translated message to each error.
	 *
	 * @param array[] $errors List of { path, code }.
	 * @return array[] List of { path, code, message }.
	 */
	public static function describe( array $errors ) {
		$out = array();
		foreach ( $errors as $error ) {
			$out[] = array(
				'path'    => $error['path'],
				'code'    => $error['code'],
				'message' => self::message( $error['code'] ),
			);
		}
		return $out;
	}

	/**
	 * Message for one code.
	 *
	 * @param string $code Validation code.
	 * @return string
	 */
	public static function message( $code ) {
		switch ( $code ) {
			case 'tiers_required':
				return __( 'Add at least one discount tier.', 'mix-and-max-box-builder' );
			case 'min_over_capacity':
				return __( 'The minimum can’t be more than the box holds.', 'mix-and-max-box-builder' );
			case 'sizes_required':
				return __( 'Add at least one box size.', 'mix-and-max-box-builder' );
			case 'price_required':
				return __( 'Set a bundle price above zero.', 'mix-and-max-box-builder' );
			case 'qty_not_ascending':
				return __( 'Each tier needs more items than the one before it.', 'mix-and-max-box-builder' );
			case 'qty_over_capacity':
				return __( 'A tier can’t need more items than the box holds.', 'mix-and-max-box-builder' );
			case 'percent_too_high':
				return __( 'Percent discounts go up to 90%.', 'mix-and-max-box-builder' );
			case 'products_required':
				return __( 'Pick at least one product.', 'mix-and-max-box-builder' );
			case 'terms_required':
				return __( 'Pick at least one category or tag.', 'mix-and-max-box-builder' );
			case 'end_before_start':
				return __( 'The end date must be after the start date.', 'mix-and-max-box-builder' );
			default:
				return __( 'Check this setting.', 'mix-and-max-box-builder' );
		}
	}
}
