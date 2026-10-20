<?php
/**
 * Server render for the Mix and Max Box Builder block.
 *
 * @package MixMax\BoxBuilder
 *
 * @var array $attributes Block attributes.
 */

defined( 'ABSPATH' ) || exit;

$mmbb_columns = isset( $attributes['columns'] ) ? absint( $attributes['columns'] ) : 0;

echo wp_kses_post(
	\MixMax\BoxBuilder\Storefront\Renderer::render(
		isset( $attributes['campaignId'] ) ? absint( $attributes['campaignId'] ) : 0,
		array(
			'layout'    => isset( $attributes['layout'] ) ? sanitize_key( $attributes['layout'] ) : 'default',
			'columns'   => $mmbb_columns,
			'show_hero' => ! isset( $attributes['showHero'] ) || false !== $attributes['showHero'],
		),
		true
	)
);
