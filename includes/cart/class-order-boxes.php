<?php
/**
 * Boxes on orders: line item meta, the order flag and per-item stock.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Cart;

use MixMax\BoxBuilder\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/** Everything goes through WooCommerce CRUD: order, line item and product objects. */
final class Order_Boxes {
	/** Hidden line item meta holding the box as JSON. */
	const META_BOX = '_mmbb_box';

	/** Hidden line item meta set once the box's items had their stock reduced. */
	const META_STOCK = '_mmbb_stock_reduced';

	/** Hidden line item meta on an item line that belongs to an items-mode box. */
	const META_PART = '_mmbb_box_part';

	/** Order meta that marks an order holding a box. */
	const META_ORDER = '_mmbb_has_box';

	/** Register hooks. */
	public function register() {
		add_action( 'woocommerce_checkout_create_order_line_item', array( $this, 'copy_to_line_item' ), 10, 4 );
		add_filter( 'woocommerce_hidden_order_itemmeta', array( $this, 'hide_meta' ) );
		add_filter( 'woocommerce_order_item_get_formatted_meta_data', array( $this, 'hide_analytics_links' ) );
		add_action( 'woocommerce_reduce_order_stock', array( $this, 'reduce_stock' ) );
		add_action( 'woocommerce_restore_order_stock', array( $this, 'restore_stock' ) );
	}

	/**
	 * Copy the box from the cart line onto the order line. Classic and Store API checkout both fire this.
	 *
	 * @param \WC_Order_Item_Product $item          Order line item.
	 * @param string                 $cart_item_key Cart item key.
	 * @param array                  $values        Cart item.
	 * @param \WC_Order              $order         Order.
	 */
	public function copy_to_line_item( $item, $cart_item_key, $values, $order ) {
		if ( isset( $values['mmbb_parent'] ) && ! isset( $values['mmbb_box'] ) ) {
			$item->add_meta_data( self::META_PART, 1, true );
			$item->add_meta_data( 'mmbb_box_parent', $values['mmbb_parent'], true );
			return;
		}
		if ( empty( $values['mmbb_box'] ) || ! is_array( $values['mmbb_box'] ) ) {
			return;
		}

		$item->add_meta_data( 'mmbb_box_key', $cart_item_key, true );
		$box   = $values['mmbb_box'];
		$quote = isset( $box['quote'] ) && is_array( $box['quote'] ) ? $box['quote'] : array();
		$item->add_meta_data( self::META_BOX, wp_json_encode( $box ), true );

		// What the shopper and the merchant read on the order and in the emails.
		$item->add_meta_data( __( 'Contents', 'mix-and-max-box-builder' ), Box_Text::contents( $box['items'] ), true );
		$discount = $quote ? Box_Text::discount( $quote ) : '';
		if ( '' !== $discount ) {
			$item->add_meta_data( __( 'Box discount', 'mix-and-max-box-builder' ), $discount, true );
		}
		if ( ! empty( $box['gift']['message'] ) ) {
			$item->add_meta_data( __( 'Gift message', 'mix-and-max-box-builder' ), $box['gift']['message'], true );
		}

		if ( $order instanceof \WC_Order ) {
			$order->update_meta_data( self::META_ORDER, 1 );
		}
		// The first order with a box counts as the setup checklist's test order.
		if ( ! get_option( 'mmbb_setup_test_done' ) ) {
			update_option( 'mmbb_setup_test_done', 1, false );
		}
	}

	/**
	 * Keep the internal keys out of the order screen.
	 *
	 * @param string[] $keys Hidden keys.
	 * @return string[]
	 */
	public function hide_meta( $keys ) {
		return array_merge( (array) $keys, array( self::META_BOX, self::META_STOCK, self::META_PART, 'mmbb_box_key', 'mmbb_box_parent' ) );
	}

	/** Keep internal analytics associations out of customer-facing formatted metadata.
	 *
	 * @param array $metadata Formatted order item metadata.
	 * @return array
	 */
	public function hide_analytics_links( $metadata ) {
		foreach ( $metadata as $id => $meta ) {
			if ( in_array( $meta->key, array( 'mmbb_box_key', 'mmbb_box_parent' ), true ) ) {
				unset( $metadata[ $id ] ); }
		}
		return $metadata;
	}

	/**
	 * Reduce each item's stock after WooCommerce has reduced the order's. The container never manages stock.
	 *
	 * Items-mode boxes are skipped: their items are ordinary lines that WooCommerce already reduced.
	 *
	 * @param \WC_Order $order Order.
	 */
	public function reduce_stock( $order ) {
		if ( ! $order instanceof \WC_Order || ! Settings::get( 'reduce_item_stock' ) ) {
			return;
		}
		foreach ( $order->get_items() as $item ) {
			$box = $this->box_of( $item );
			if ( null === $box || $item->get_meta( self::META_STOCK ) || $this->is_items_mode( $box ) ) {
				continue;
			}
			$notes = array();
			foreach ( $box['items'] as $row ) {
				$product = wc_get_product( Box_Rules::key( (int) $row['product_id'], (int) $row['variation_id'] ) );
				if ( ! $product instanceof \WC_Product || ! $product->managing_stock() ) {
					continue;
				}
				$qty = (int) $row['qty'] * max( 1, (int) $item->get_quantity() );
				$new = wc_update_product_stock( $product, $qty, 'decrease' );
				if ( false !== $new && null !== $new ) {
					/* translators: 1: product name, 2: old stock, 3: new stock */
					$notes[] = sprintf( __( '%1$s %2$dÃ¢â€ â€™%3$d', 'mix-and-max-box-builder' ), $product->get_name(), (int) $new + $qty, (int) $new );
				}
			}
			$item->update_meta_data( self::META_STOCK, 1 );
			$item->save();
			if ( $notes ) {
				$order->add_order_note(
					sprintf(
						/* translators: 1: box name, 2: list of items with stock changes */
						__( 'Stock reduced for the items in %1$s: %2$s', 'mix-and-max-box-builder' ),
						$item->get_name(),
						implode( ', ', $notes )
					)
				);
			}
		}
	}

	/**
	 * Put stock back for boxes this plugin reduced, when an order is cancelled or refunded.
	 *
	 * @param \WC_Order $order Order.
	 */
	public function restore_stock( $order ) {
		if ( ! $order instanceof \WC_Order ) {
			return;
		}
		foreach ( $order->get_items() as $item ) {
			$box = $this->box_of( $item );
			if ( null === $box || ! $item->get_meta( self::META_STOCK ) ) {
				continue;
			}
			$notes = array();
			foreach ( $box['items'] as $row ) {
				$product = wc_get_product( Box_Rules::key( (int) $row['product_id'], (int) $row['variation_id'] ) );
				if ( ! $product instanceof \WC_Product || ! $product->managing_stock() ) {
					continue;
				}
				$qty = (int) $row['qty'] * max( 1, (int) $item->get_quantity() );
				$new = wc_update_product_stock( $product, $qty, 'increase' );
				if ( false !== $new && null !== $new ) {
					/* translators: 1: product name, 2: old stock, 3: new stock */
					$notes[] = sprintf( __( '%1$s %2$dÃ¢â€ â€™%3$d', 'mix-and-max-box-builder' ), $product->get_name(), (int) $new - $qty, (int) $new );
				}
			}
			$item->delete_meta_data( self::META_STOCK );
			$item->save();
			if ( $notes ) {
				$order->add_order_note(
					sprintf(
						/* translators: 1: box name, 2: list of items with stock changes */
						__( 'Stock restored for the items in %1$s: %2$s', 'mix-and-max-box-builder' ),
						$item->get_name(),
						implode( ', ', $notes )
					)
				);
			}
		}
	}

	/**
	 * The box stored on an order line, or null for any other line.
	 *
	 * @param \WC_Order_Item $item Order item.
	 * @return array|null
	 */
	private function box_of( $item ) {
		if ( ! $item instanceof \WC_Order_Item_Product ) {
			return null;
		}
		$json = $item->get_meta( self::META_BOX );
		$box  = is_string( $json ) && '' !== $json ? json_decode( $json, true ) : null;
		return is_array( $box ) && ! empty( $box['items'] ) && is_array( $box['items'] ) ? $box : null;
	}

	/**
	 * Whether the box was sold as separate item lines.
	 *
	 * @param array $box Box data.
	 * @return bool
	 */
	private function is_items_mode( array $box ) {
		return isset( $box['mode'] ) && 'items' === $box['mode'];
	}
}
