<?php
/**
 * Renders a builder on a page. Shared by the block and the shortcode.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Storefront;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Status;
use MixMax\BoxBuilder\Settings\Settings;

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
	 * @param array $view          Overrides: layout, columns, show_hero, template.
	 * @param bool  $block_wrapper Whether to take the wrapper attributes from the block supports.
	 * @return string HTML that is already escaped.
	 */
	public static function render( $campaign_id, array $view = array(), $block_wrapper = false ) {
		// The editor's preview shows its box whatever the store settings and the box status say.
		$preview = Preview::is_preview_of( absint( $campaign_id ) );
		if ( ! $preview && ! Settings::get( 'enabled' ) ) {
			return self::notice_for_managers( $campaign_id, __( 'Box builders are disabled in the plugin settings.', 'productboxes-mix-and-match-box-builder' ), false );
		}
		$campaign = ( new Campaign_Repository() )->find( absint( $campaign_id ) );
		if ( ! $campaign ) {
			return self::notice_for_managers( $campaign_id, __( 'This box builder points to a campaign that no longer exists.', 'productboxes-mix-and-match-box-builder' ), false );
		}
		if ( ! $preview && ! Status::is_live( $campaign['status'] ) ) {
			return self::notice_for_managers( $campaign['id'], __( 'This campaign is not live, so shoppers see nothing here.', 'productboxes-mix-and-match-box-builder' ), true );
		}
		$unpriced = $preview ? '' : self::unpriced_notice( $campaign );
		if ( self::is_page_builder_request() ) {
			return $unpriced . self::builder_placeholder( $campaign );
		}
		if ( ! Storefront::enqueue() ) {
			return '';
		}

		++self::$instances;
		$instance       = 'mmbb-' . self::$instances;
		$payload        = Payload::build(
			$campaign,
			array(
				'view'    => $view,
				'preview' => $preview,
			)
		);
		$advanced       = $campaign['config']['design']['advanced'];
		$template_style = Template_Styles::resolve( $payload['config']['design'] );
		wp_add_inline_style(
			Storefront::HANDLE,
			Template_Styles::font_css( $template_style['fonts'] ) . Template_Styles::rule( self::$instances, (array) $payload['styleVars'] )
		);
		if ( '' !== $advanced['custom_css'] ) {
			wp_add_inline_style(
				Storefront::HANDLE,
				'.mmbb-box-' . self::$instances . ' {' . $advanced['custom_css'] . '}'
			);
		}

		wp_add_inline_script(
			Storefront::HANDLE,
			'window.mmbbBuilders = window.mmbbBuilders || {}; window.mmbbBuilders[' . wp_json_encode( $instance ) . '] = ' . wp_json_encode( $payload ) . ';',
			'before'
		);

		$attributes = array(
			'class'         => trim( 'mmbb-root mmbb-builder mmbb-box-' . self::$instances . ' ' . $advanced['css_class'] ),
			'data-mmbb-id'  => $instance,
			'data-campaign' => (string) $campaign['id'],
			'data-template' => $payload['config']['design']['template'],
			'data-width'    => $payload['config']['design']['spacing']['width'],
		);
		if ( $preview ) {
			$attributes['data-mmbb-preview'] = '1';
		}
		if ( $payload['colors']['dark'] ) {
			$attributes['data-theme'] = 'dark';
		}
		return $unpriced . sprintf(
			'<div %1$s><h2 class="mmbb-builder__title">%2$s</h2><p class="mmbb-builder__loading">%3$s</p><noscript>%4$s</noscript></div>',
			self::attributes( $attributes, $block_wrapper ),
			esc_html( self::heading( $campaign ) ),
			esc_html__( 'Loading your box…', 'productboxes-mix-and-match-box-builder' ),
			esc_html__( 'Turn on JavaScript to build your box.', 'productboxes-mix-and-match-box-builder' )
		);
	}

	/**
	 * Whether a page builder is showing or rendering the page for editing, where the storefront
	 * script cannot run (the Divi Builder loads React 16 and renders shortcodes over admin-ajax).
	 * Theme and plugin integrations answer through the filter.
	 *
	 * @return bool
	 */
	public static function is_page_builder_request() {
		/**
		 * Whether this request is a page builder's editor, or the editor rendering a module.
		 * The box shows as a placeholder with a preview frame there, and loads no storefront assets.
		 *
		 * @param bool $is_builder False by default.
		 */
		return (bool) apply_filters( 'mmbb_is_page_builder_request', false );
	}

	/**
	 * What a page builder's editor shows for a box: its title, a label, and for store managers
	 * the box's preview page in a frame plus a link to edit the box. The frame starts 600px tall;
	 * the preview reports its height and an integration's script may size the frame to it.
	 *
	 * @param array $campaign Campaign from the repository.
	 * @return string HTML that is already escaped.
	 */
	public static function builder_placeholder( array $campaign ) {
		$label = esc_html__( 'Mix and match box. It runs on the live page, not in the page builder.', 'productboxes-mix-and-match-box-builder' );
		$extra = '';
		if ( current_user_can( Preview::CAPABILITY ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- WooCommerce registers this capability.
			$label = esc_html__( 'Mix and match box: preview. It runs on the live page, not in the page builder.', 'productboxes-mix-and-match-box-builder' );
			$extra = sprintf(
				'<iframe class="mmbb-builder-placeholder__frame" src="%1$s" title="%2$s" loading="lazy" style="display:block;width:100%%;height:600px;border:0;background:#fff"></iframe>'
				. '<p class="mmbb-builder-placeholder__actions" style="margin:12px 0 0;padding:0"><a href="%3$s" target="_blank" rel="noopener">%4$s</a></p>',
				esc_url( Preview::url( $campaign, true ) ),
				/* translators: %s: box name */
				esc_attr( sprintf( __( 'Preview of %s', 'productboxes-mix-and-match-box-builder' ), $campaign['title'] ) ),
				esc_url( self::edit_url( $campaign['id'] ) ),
				esc_html__( 'Edit box', 'productboxes-mix-and-match-box-builder' )
			);
		}
		return sprintf(
			'<div class="mmbb-builder-placeholder" data-campaign="%1$s" style="box-sizing:border-box;padding:16px;border:1px dashed #8c8f94;border-radius:8px">'
			. '<h2 class="mmbb-builder-placeholder__title" style="margin:0 0 4px;padding:0">%2$s</h2>'
			. '<p class="mmbb-builder-placeholder__label" style="margin:0 0 12px;padding:0;font-size:14px;opacity:.75">%3$s</p>%4$s</div>',
			esc_attr( (string) $campaign['id'] ),
			esc_html( self::heading( $campaign ) ),
			$label,
			$extra
		);
	}

	/**
	 * For store managers: a note that products without a price are left out of the box.
	 * Shoppers get nothing.
	 *
	 * @param array $campaign Campaign from the repository.
	 * @return string
	 */
	private static function unpriced_notice( array $campaign ) {
		if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- WooCommerce registers this capability.
			return '';
		}
		$count = Payload::unpriced_count( $campaign['config'], (int) $campaign['id'] );
		if ( $count < 1 ) {
			return '';
		}
		return self::notice_for_managers(
			$campaign['id'],
			sprintf(
				/* translators: %d: number of products */
				_n( '%d product is hidden because it has no price.', '%d products are hidden because they have no price.', $count, 'productboxes-mix-and-match-box-builder' ),
				$count
			),
			true
		);
	}

	/**
	 * The heading the box shows: its headline, or its name.
	 *
	 * @param array $campaign Campaign from the repository.
	 * @return string Not escaped.
	 */
	private static function heading( array $campaign ) {
		return '' !== (string) $campaign['config']['design']['headline'] ? (string) $campaign['config']['design']['headline'] : (string) $campaign['title'];
	}

	/**
	 * The box editor's address.
	 *
	 * @param int $campaign_id Campaign id.
	 * @return string Not escaped.
	 */
	private static function edit_url( $campaign_id ) {
		return admin_url( 'admin.php?page=mmbb-campaigns&action=edit&id=' . absint( $campaign_id ) );
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
				esc_url( self::edit_url( $campaign_id ) ),
				esc_html__( 'Edit campaign', 'productboxes-mix-and-match-box-builder' )
			);
		}
		return '<p class="mmbb-builder-notice">' . esc_html( $message ) . $link . '</p>';
	}
}
