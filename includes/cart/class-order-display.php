<?php
/**
 * Box details on order screens and in WooCommerce emails.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Cart;

use MixMax\BoxBuilder\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/** Format visible box metadata and apply email privacy preferences. */
final class Order_Display {
	/**
	 * The email currently rendering, or null outside an email order table.
	 *
	 * @var array|null
	 */
	private $email_context;

	/** Register order and email hooks. */
	public function register() {
		add_action( 'woocommerce_email_before_order_table', array( $this, 'begin_email' ), 1, 4 );
		add_action( 'woocommerce_email_after_order_table', array( $this, 'end_email' ), 999, 4 );
		add_filter( 'woocommerce_order_item_get_formatted_meta_data', array( $this, 'format_meta' ), 20, 2 );
	}

	/** Remember whether an admin or customer email is rendering.
	 *
	 * @param \WC_Order $order         Order.
	 * @param bool      $sent_to_admin Whether this email is for the merchant.
	 * @param bool      $plain_text    Whether the email is plain text.
	 * @param \WC_Email $email         Email object.
	 */
	public function begin_email( $order, $sent_to_admin, $plain_text, $email ) {
		unset( $order );
		$this->email_context = array(
			'gift'  => (bool) $sent_to_admin && $email instanceof \WC_Email && 'new_order' === $email->id,
			'plain' => (bool) $plain_text,
		);
	}

	/** Clear the email context after WooCommerce has rendered the order table.
	 *
	 * @param \WC_Order $order         Order.
	 * @param bool      $sent_to_admin Whether this email is for the merchant.
	 * @param bool      $plain_text    Whether the email is plain text.
	 * @param \WC_Email $email         Email object.
	 */
	public function end_email( $order, $sent_to_admin, $plain_text, $email ) {
		unset( $order, $sent_to_admin, $plain_text, $email );
		$this->email_context = null;
	}

	/** Filter and format the plugin's visible order-line metadata.
	 *
	 * @param array          $metadata Formatted metadata objects keyed by meta id.
	 * @param \WC_Order_Item $item     Order item.
	 * @return array
	 */
	public function format_meta( $metadata, $item ) {
		$box = $this->box_of( $item );
		if ( null === $box ) {
			return $metadata;
		}

		$labels  = array(
			'discount' => __( 'Box discount', 'mix-and-max-box-builder' ),
			'contents' => __( 'Contents', 'mix-and-max-box-builder' ),
			'gift'     => __( 'Gift message', 'mix-and-max-box-builder' ),
		);
		$ordered = array();
		$other   = array();

		foreach ( $metadata as $id => $meta ) {
			$type = array_search( $meta->key, $labels, true );
			if ( false === $type ) {
				$other[ $id ] = $meta;
				continue;
			}
			if ( 'contents' === $type && null !== $this->email_context && ! Settings::get( 'email_list_items' ) ) {
				continue;
			}
			if ( 'gift' === $type && null !== $this->email_context && ( ! Settings::get( 'email_gift_message' ) || ! $this->email_context['gift'] ) ) {
				continue;
			}

			if ( 'contents' === $type ) {
				$lines               = Box_Text::content_lines( (array) $box['items'] );
				$meta->display_value = $this->lines( $lines );
			} elseif ( 'gift' === $type ) {
				$message             = isset( $box['gift']['message'] ) ? sanitize_textarea_field( $box['gift']['message'] ) : '';
				$meta->display_value = $this->text( $message );
			}
			$ordered[ $type ] = array( $id, $meta );
		}

		foreach ( array( 'discount', 'contents', 'gift' ) as $type ) {
			if ( isset( $ordered[ $type ] ) ) {
				$other[ $ordered[ $type ][0] ] = $ordered[ $type ][1];
			}
		}
		return $other;
	}

	/** Format content lines for the active output mode.
	 *
	 * @param string[] $lines Plain text lines.
	 * @return string
	 */
	private function lines( array $lines ) {
		if ( null !== $this->email_context && $this->email_context['plain'] ) {
			return implode( "\n", $lines );
		}
		return implode( '<br>', array_map( 'esc_html', $lines ) );
	}

	/** Escape a merchant-entered message for HTML, or keep plain email text plain.
	 *
	 * @param string $value Plain text.
	 * @return string
	 */
	private function text( $value ) {
		if ( null !== $this->email_context && $this->email_context['plain'] ) {
			return $value;
		}
		return nl2br( esc_html( $value ) );
	}

	/** Decode the hidden box snapshot from an order line.
	 *
	 * @param \WC_Order_Item $item Order item.
	 * @return array|null
	 */
	private function box_of( $item ) {
		if ( ! $item instanceof \WC_Order_Item_Product ) {
			return null;
		}
		$box = json_decode( (string) $item->get_meta( Order_Boxes::META_BOX ), true );
		return is_array( $box ) && ! empty( $box['items'] ) ? $box : null;
	}
}
