<?php
/**
 * Downloads for boxes sold as one line: permissions and links for the items inside the box.
 *
 * The cart line is the container product, which has no files, so WooCommerce grants nothing for it.
 * Items-mode boxes are ordinary item lines and WooCommerce already handles them.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Cart;

defined( 'ABSPATH' ) || exit;

/** Everything goes through WooCommerce CRUD: order, customer download and product objects. */
final class Order_Downloads {
	/** Register hooks. */
	public function register() {
		add_action( 'woocommerce_grant_product_download_permissions', array( $this, 'grant' ) );
		add_filter( 'woocommerce_order_get_downloadable_items', array( $this, 'add_links' ), 10, 2 );
	}

	/**
	 * Grant access to the files of every downloadable item inside the order's boxes.
	 *
	 * Runs when WooCommerce grants download permissions, so it follows the store's own rules for when that happens.
	 *
	 * @param int $order_id Order id.
	 */
	public function grant( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order instanceof \WC_Order ) {
			return;
		}
		$store = \WC_Data_Store::load( 'customer-download' );
		foreach ( $this->boxes( $order ) as $row ) {
			foreach ( $this->products( $row['box'] ) as $entry ) {
				$qty = $entry['qty'] * $row['qty'];
				foreach ( array_keys( $entry['product']->get_downloads() ) as $download_id ) {
					$existing = $store->get_downloads(
						array(
							'order_id'    => $order->get_id(),
							'product_id'  => $entry['product']->get_id(),
							'download_id' => $download_id,
							'return'      => 'ids',
						)
					);
					if ( $existing ) {
						continue;
					}
					wc_downloadable_file_permission( $download_id, $entry['product'], $order, $qty );
				}
			}
		}
	}

	/**
	 * List the box items' files wherever WooCommerce lists an order's downloads: the order page and the emails.
	 *
	 * @param array     $downloads Downloads WooCommerce found on the order's own lines.
	 * @param \WC_Order $order     Order.
	 * @return array
	 */
	public function add_links( $downloads, $order ) {
		if ( ! $order instanceof \WC_Order || ! $order->is_download_permitted() ) {
			return $downloads;
		}
		$boxes = $this->boxes( $order );
		if ( ! $boxes ) {
			return $downloads;
		}

		$email_hash = function_exists( 'hash' ) ? hash( 'sha256', $order->get_billing_email() ) : sha1( $order->get_billing_email() );
		$store      = \WC_Data_Store::load( 'customer-download' );
		$seen       = array();
		foreach ( $boxes as $row ) {
			foreach ( $this->products( $row['box'] ) as $entry ) {
				$product = $entry['product'];
				if ( isset( $seen[ $product->get_id() ] ) ) {
					continue;
				}
				$seen[ $product->get_id() ] = true;

				$permissions = $store->get_downloads(
					array(
						'user_email' => $order->get_billing_email(),
						'order_id'   => $order->get_id(),
						'product_id' => $product->get_id(),
					)
				);
				foreach ( $permissions as $permission ) {
					$download_id = $permission->get_download_id();
					if ( ! $product->has_file( $download_id ) ) {
						continue;
					}
					$file        = $product->get_file( $download_id );
					$downloads[] = array(
						'download_url'        => add_query_arg(
							array(
								'download_file' => $product->get_id(),
								'order'         => $order->get_order_key(),
								'uid'           => $email_hash,
								'key'           => $download_id,
							),
							trailingslashit( home_url() )
						),
						'download_id'         => $download_id,
						'product_id'          => $product->get_id(),
						'product_name'        => $product->get_name(),
						'product_url'         => $product->is_visible() ? $product->get_permalink() : '',
						'download_name'       => $file->get_name(),
						'order_id'            => $order->get_id(),
						'order_key'           => $order->get_order_key(),
						'downloads_remaining' => $permission->get_downloads_remaining(),
						'access_expires'      => $permission->get_access_expires(),
						'file'                => array(
							'name' => $file->get_name(),
							'file' => $file->get_file(),
						),
					);
				}
			}
		}
		return $downloads;
	}

	/**
	 * The order's one-line boxes: bundled boxes only, with their quantity.
	 *
	 * @param \WC_Order $order Order.
	 * @return array[] Each with box (array) and qty (int).
	 */
	private function boxes( \WC_Order $order ) {
		$rows = array();
		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof \WC_Order_Item_Product ) {
				continue;
			}
			$json = $item->get_meta( Order_Boxes::META_BOX );
			$box  = is_string( $json ) && '' !== $json ? json_decode( $json, true ) : null;
			if ( ! is_array( $box ) || empty( $box['items'] ) || ! is_array( $box['items'] ) ) {
				continue;
			}
			if ( isset( $box['mode'] ) && 'items' === $box['mode'] ) {
				continue;
			}
			$rows[] = array(
				'box' => $box,
				'qty' => max( 1, (int) $item->get_quantity() ),
			);
		}
		return $rows;
	}

	/**
	 * The downloadable products in a box: its items and its free gift.
	 *
	 * @param array $box Box data.
	 * @return array[] Each with product (WC_Product) and qty (int).
	 */
	private function products( array $box ) {
		$rows = $box['items'];
		if ( ! empty( $box['free_gift'] ) && is_array( $box['free_gift'] ) ) {
			$rows[] = $box['free_gift'];
		}
		$found = array();
		foreach ( $rows as $row ) {
			if ( empty( $row['product_id'] ) ) {
				continue;
			}
			$product = wc_get_product( Box_Rules::key( (int) $row['product_id'], isset( $row['variation_id'] ) ? (int) $row['variation_id'] : 0 ) );
			if ( ! $product instanceof \WC_Product || ! $product->is_downloadable() || ! $product->get_downloads() ) {
				continue;
			}
			$id = $product->get_id();
			if ( isset( $found[ $id ] ) ) {
				$found[ $id ]['qty'] += max( 1, isset( $row['qty'] ) ? (int) $row['qty'] : 1 );
				continue;
			}
			$found[ $id ] = array(
				'product' => $product,
				'qty'     => max( 1, isset( $row['qty'] ) ? (int) $row['qty'] : 1 ),
			);
		}
		return array_values( $found );
	}
}
