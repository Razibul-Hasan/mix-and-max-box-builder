<?php
/**
 * Theme design tokens for the box editor.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

defined( 'ABSPATH' ) || exit;

/** Expose local theme colours, typography and button styles to store managers. */
final class Theme_Controller extends Base_Controller {
	/** Register the read-only admin route. */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/theme',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_item' ),
				'permission_callback' => array( $this, 'permissions_check' ),
			)
		);
	}

	/**
	 * Return theme.json presets, with classic-theme fallbacks.
	 *
	 * @param \WP_REST_Request $request Request (unused).
	 * @return \WP_REST_Response
	 */
	public function get_item( $request ) {
		unset( $request );
		$palette = function_exists( 'wp_get_global_settings' ) ? wp_get_global_settings( array( 'color', 'palette' ) ) : array();
		$fonts   = function_exists( 'wp_get_global_settings' ) ? wp_get_global_settings( array( 'typography', 'fontFamilies' ) ) : array();
		$sizes   = function_exists( 'wp_get_global_settings' ) ? wp_get_global_settings( array( 'typography', 'fontSizes' ) ) : array();

		if ( empty( $palette ) ) {
			$palette = get_theme_support( 'editor-color-palette' );
			$palette = isset( $palette[0] ) && is_array( $palette[0] ) ? $palette[0] : array();
		}
		if ( empty( $sizes ) ) {
			$sizes = get_theme_support( 'editor-font-sizes' );
			$sizes = isset( $sizes[0] ) && is_array( $sizes[0] ) ? $sizes[0] : array();
		}

		$theme        = wp_get_theme();
		$body_font    = function_exists( 'wp_get_global_styles' ) ? wp_get_global_styles( array( 'typography', 'fontFamily' ) ) : '';
		$heading_font = function_exists( 'wp_get_global_styles' ) ? wp_get_global_styles( array( 'elements', 'heading', 'typography', 'fontFamily' ) ) : '';
		return rest_ensure_response(
			array(
				'name'           => $theme->get( 'Name' ),
				'palette'        => $this->presets( $palette, 'color' ),
				'font_families'  => $this->presets( $fonts, 'fontFamily' ),
				'font_sizes'     => $this->presets( $sizes, 'size' ),
				'button'         => function_exists( 'wp_get_global_styles' ) ? (array) wp_get_global_styles( array( 'elements', 'button' ) ) : array(),
				'typography'     => array(
					'body'    => is_string( $body_font ) ? sanitize_text_field( $body_font ) : '',
					'heading' => is_string( $heading_font ) ? sanitize_text_field( $heading_font ) : '',
				),
				'can_custom_css' => current_user_can( 'unfiltered_html' ),
			)
		);
	}

	/**
	 * Flatten theme/default/custom preset origins into one safe list.
	 *
	 * @param mixed  $value Presets from WordPress.
	 * @param string $field Value field.
	 * @return array
	 */
	private function presets( $value, $field ) {
		$out  = array();
		$walk = static function ( $node ) use ( &$walk, &$out, $field ) {
			if ( ! is_array( $node ) ) {
				return;
			}
			if ( isset( $node['slug'], $node[ $field ] ) ) {
				$out[] = array(
					'name'  => isset( $node['name'] ) ? sanitize_text_field( $node['name'] ) : sanitize_key( $node['slug'] ),
					'slug'  => sanitize_key( $node['slug'] ),
					'value' => sanitize_text_field( $node[ $field ] ),
				);
				return;
			}
			foreach ( $node as $child ) {
				$walk( $child );
			}
		};
		$walk( $value );
		return $out;
	}
}
