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

	/** Hidden line item meta: how many of the line's boxes a refund has restocked. */
	const META_RESTOCKED = '_mmbb_boxes_restocked';

	/**
	 * Hidden line item meta: the readable meta keys the line was saved with, by type, as JSON.
	 * Those keys are translated at checkout, so a store in another language can still find them.
	 */
	const META_LABELS = '_mmbb_labels';

	/** Register hooks. */
	public function register() {
		add_action( 'woocommerce_checkout_create_order_line_item', array( $this, 'copy_to_line_item' ), 10, 4 );
		add_filter( 'woocommerce_hidden_order_itemmeta', array( $this, 'hide_meta' ) );
		add_filter( 'woocommerce_order_item_get_formatted_meta_data', array( $this, 'hide_analytics_links' ) );
		add_action( 'woocommerce_reduce_order_stock', array( $this, 'reduce_stock' ) );
		add_action( 'woocommerce_restore_order_stock', array( $this, 'restore_stock' ) );
		add_action( 'woocommerce_refund_created', array( $this, 'restock_refund' ), 10, 2 );
	}

	/**
	 * The readable meta keys, by type, in the current language.
	 *
	 * @return array<string, string>
	 */
	public static function labels() {
		return array(
			'discount'  => __( 'Box discount', 'productboxes-mix-and-match-box-builder' ),
			'contents'  => __( 'Contents', 'productboxes-mix-and-match-box-builder' ),
			'gift'      => __( 'Gift message', 'productboxes-mix-and-match-box-builder' ),
			'free_gift' => __( 'Free gift', 'productboxes-mix-and-match-box-builder' ),
		);
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

		// What the shopper and the merchant read on the order and in the emails. The keys are in the
		// shopper's language, so they are recorded for Order_Display to find in any language.
		$labels   = self::labels();
		$discount = $quote ? Box_Text::discount( $quote ) : '';
		if ( '' !== $discount ) {
			$item->add_meta_data( $labels['discount'], $discount, true );
		}
		$item->add_meta_data( $labels['contents'], Box_Text::contents( $box['items'] ), true );
		if ( ! empty( $box['gift']['message'] ) ) {
			$item->add_meta_data( $labels['gift'], $box['gift']['message'], true );
		}
		if ( ! empty( $box['free_gift']['name'] ) ) {
			$item->add_meta_data( $labels['free_gift'], $box['free_gift']['name'], true );
		}
		$item->add_meta_data( self::META_LABELS, wp_json_encode( $labels ), true );

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
		return array_merge( (array) $keys, array( self::META_BOX, self::META_STOCK, self::META_PART, self::META_RESTOCKED, self::META_LABELS, 'mmbb_box_key', 'mmbb_box_parent' ) );
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
			$notes = $this->move_stock( $box, max( 1, (int) $item->get_quantity() ), 'decrease' );
			$item->update_meta_data( self::META_STOCK, 1 );
			$item->delete_meta_data( self::META_RESTOCKED );
			$item->save();
			if ( $notes ) {
				$order->add_order_note(
					sprintf(
						/* translators: 1: box name, 2: list of items with stock changes */
						__( 'Stock reduced for the items in %1$s: %2$s', 'productboxes-mix-and-match-box-builder' ),
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
	 * Boxes a refund already restocked are left out, so their items are not put back twice.
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
			$boxes = max( 0, max( 1, (int) $item->get_quantity() ) - (int) $item->get_meta( self::META_RESTOCKED ) );
			$notes = $boxes > 0 ? $this->move_stock( $box, $boxes, 'increase' ) : array();
			$item->delete_meta_data( self::META_STOCK );
			$item->delete_meta_data( self::META_RESTOCKED );
			$item->save();
			if ( $notes ) {
				$order->add_order_note(
					sprintf(
						/* translators: 1: box name, 2: list of items with stock changes */
						__( 'Stock restored for the items in %1$s: %2$s', 'productboxes-mix-and-match-box-builder' ),
						$item->get_name(),
						implode( ', ', $notes )
					)
				);
			}
		}
	}

	/**
	 * On `woocommerce_refund_created`: when the merchant chose to restock refunded items, put the
	 * items of refunded one-line boxes back. WooCommerce restocks only the box line itself, and the
	 * container product does not manage stock.
	 *
	 * @param int   $refund_id Refund id.
	 * @param array $args      Refund arguments: `restock_items` and `line_items` (item id => { qty }).
	 */
	public function restock_refund( $refund_id, $args ) {
		if ( ! is_array( $args ) || empty( $args['restock_items'] ) || empty( $args['line_items'] ) || ! is_array( $args['line_items'] ) ) {
			return;
		}
		$refund = wc_get_order( $refund_id );
		$order  = $refund instanceof \WC_Order_Refund ? wc_get_order( $refund->get_parent_id() ) : false;
		if ( ! $order instanceof \WC_Order ) {
			return;
		}
		foreach ( $order->get_items() as $item_id => $item ) {
			$refunded = isset( $args['line_items'][ $item_id ]['qty'] ) ? absint( $args['line_items'][ $item_id ]['qty'] ) : 0;
			$box      = $refunded > 0 ? $this->box_of( $item ) : null;
			if ( null === $box || ! $item->get_meta( self::META_STOCK ) || $this->is_items_mode( $box ) ) {
				continue;
			}
			$restocked = (int) $item->get_meta( self::META_RESTOCKED );
			$boxes     = min( $refunded, max( 0, max( 1, (int) $item->get_quantity() ) - $restocked ) );
			if ( $boxes < 1 ) {
				continue;
			}
			$notes = $this->move_stock( $box, $boxes, 'increase' );
			$item->update_meta_data( self::META_RESTOCKED, $restocked + $boxes );
			$item->save();
			if ( $notes ) {
				$order->add_order_note(
					sprintf(
						/* translators: 1: box name, 2: list of items with stock changes */
						__( 'Stock restored for the refunded items in %1$s: %2$s', 'productboxes-mix-and-match-box-builder' ),
						$item->get_name(),
						implode( ', ', $notes )
					)
				);
			}
		}
	}

	/**
	 * Move the stock of a box's items and free gift.
	 *
	 * @param array  $box       Box data.
	 * @param int    $boxes     How many boxes.
	 * @param string $direction `decrease` or `increase`.
	 * @return string[] One "name old → new" note per product whose stock changed.
	 */
	private function move_stock( array $box, $boxes, $direction ) {
		$notes = array();
		foreach ( $this->stock_rows( $box ) as $row ) {
			$product = wc_get_product( Box_Rules::key( (int) $row['product_id'], isset( $row['variation_id'] ) ? (int) $row['variation_id'] : 0 ) );
			if ( ! $product instanceof \WC_Product || ! $product->managing_stock() ) {
				continue;
			}
			$qty = (int) $row['qty'] * (int) $boxes;
			$new = wc_update_product_stock( $product, $qty, $direction );
			if ( false !== $new && null !== $new ) {
				$old = 'decrease' === $direction ? (int) $new + $qty : (int) $new - $qty;
				/* translators: 1: product name, 2: old stock, 3: new stock */
				$notes[] = sprintf( __( '%1$s %2$d → %3$d', 'productboxes-mix-and-match-box-builder' ), $product->get_name(), $old, (int) $new );
			}
		}
		return $notes;
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
	 * The rows whose stock a bundled box moves: its items and its free gift.
	 *
	 * @param array $box Box data.
	 * @return array[]
	 */
	private function stock_rows( array $box ) {
		$rows = $box['items'];
		if ( ! empty( $box['free_gift'] ) && is_array( $box['free_gift'] ) ) {
			$rows[] = $box['free_gift'];
		}
		return $rows;
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
