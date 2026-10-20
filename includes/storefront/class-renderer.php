<?php
/**
 * Renders a builder on a page. Shared by the block and the shortcode.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Storefront;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Status;

defined( 'ABSPATH' ) || exit;

/** Outputs the mount point and hands the payload to the storefront script. */
final class Renderer {
	/**
	 * How many builders this request has rendered, for unique instance ids.
	 *
	 * @var int
	 */
	private static $instances = 0;

	/**
	 * Render one builder.
	 *
	 * @param int   $campaign_id   Campaign id.
	 * @param array $view          Overrides: layout, columns, show_hero.
	 * @param bool  $block_wrapper Whether to take the wrapper attributes from the block supports.
	 * @return string HTML that is already escaped.
	 */
	public static function render( $campaign_id, array $view = array(), $block_wrapper = false ) {
		$campaign = ( new Campaign_Repository() )->find( absint( $campaign_id ) );
		if ( ! $campaign ) {
			return self::notice_for_managers( $campaign_id, __( 'This box builder points to a campaign that no longer exists.', 'mix-and-max-box-builder' ), false );
		}
		if ( ! Status::is_live( $campaign['status'] ) ) {
			return self::notice_for_managers( $campaign['id'], __( 'This campaign is not live, so shoppers see nothing here.', 'mix-and-max-box-builder' ), true );
		}
		if ( ! Storefront::enqueue() ) {
			return '';
		}

		++self::$instances;
		$instance = 'mmbb-' . self::$instances;
		$payload  = Payload::build( $campaign, array( 'view' => $view ) );

		wp_add_inline_script(
			Storefront::HANDLE,
			'window.mmbbBuilders = window.mmbbBuilders || {}; window.mmbbBuilders[' . wp_json_encode( $instance ) . '] = ' . wp_json_encode( $payload ) . ';',
			'before'
		);

		$attributes = array(
			'class'         => 'mmbb-root mmbb-builder',
			'data-mmbb-id'  => $instance,
			'data-campaign' => (string) $campaign['id'],
		);
		if ( 'dark' === $campaign['config']['design']['theme'] ) {
			$attributes['data-theme'] = 'dark';
		}

		$heading = '' !== (string) $campaign['config']['design']['headline'] ? $campaign['config']['design']['headline'] : $campaign['title'];

		return sprintf(
			'<div %1$s><h2 class="mmbb-builder__title">%2$s</h2><p class="mmbb-builder__loading">%3$s</p><noscript>%4$s</noscript></div>',
			self::attributes( $attributes, $block_wrapper ),
			esc_html( $heading ),
			esc_html__( 'Loading your box…', 'mix-and-max-box-builder' ),
			esc_html__( 'Turn on JavaScript to build your box.', 'mix-and-max-box-builder' )
		);
	}

	/**
	 * Wrapper attributes, escaped.
	 *
	 * @param array $attributes    Attribute name => value.
	 * @param bool  $block_wrapper Use get_block_wrapper_attributes() so alignment and spacing support apply.
	 * @return string
	 */
	private static function attributes( array $attributes, $block_wrapper ) {
		if ( $block_wrapper && function_exists( 'get_block_wrapper_attributes' ) ) {
			return get_block_wrapper_attributes( $attributes );
		}
		$out = array();
		foreach ( $attributes as $name => $value ) {
			$out[] = sprintf( '%1$s="%2$s"', esc_attr( $name ), esc_attr( $value ) );
		}
		return implode( ' ', $out );
	}

	/**
	 * A short note for people who manage the store. Shoppers get nothing.
	 *
	 * @param int    $campaign_id Campaign id.
	 * @param string $message     What is wrong.
	 * @param bool   $can_edit    Whether the campaign exists, so an edit link makes sense.
	 * @return string
	 */
	private static function notice_for_managers( $campaign_id, $message, $can_edit ) {
		if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- WooCommerce registers this capability.
			return '';
		}
		$link = '';
		if ( $can_edit ) {
			$link = sprintf(
				' <a href="%1$s">%2$s</a>',
				esc_url( admin_url( 'admin.php?page=mmbb-campaigns&action=edit&id=' . absint( $campaign_id ) ) ),
				esc_html__( 'Edit campaign', 'mix-and-max-box-builder' )
			);
		}
		return '<p class="mmbb-builder-notice">' . esc_html( $message ) . $link . '</p>';
	}
}
