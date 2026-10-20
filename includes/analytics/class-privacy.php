<?php
/**
 * Local analytics disclosure and gift-message privacy tools.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Analytics;

defined( 'ABSPATH' ) || exit;

/** Integrate with WordPress privacy tools using WooCommerce order CRUD. */
final class Privacy {
	/** Register privacy callbacks. */
	public function register() {
		add_action( 'admin_init', array( $this, 'policy' ) );
		add_filter( 'wp_privacy_personal_data_exporters', array( $this, 'exporters' ) );
		add_filter( 'wp_privacy_personal_data_erasers', array( $this, 'erasers' ) );
	}
	/** Offer suggested privacy text to the site owner. */
	public function policy() {
		if ( function_exists( 'wp_add_privacy_policy_content' ) ) {
			wp_add_privacy_policy_content( __( 'Mix and Max Box Builder', 'mix-and-max-box-builder' ), wpautop( __( 'Builder analytics are anonymous and stay on this site. They record builder views, product picks, tiers reached, boxes added to the cart and box sales. Random browser session IDs use session storage, without tracking cookies, IP addresses or user agents. Daily salted hashes are kept for the configured raw-event retention period; aggregate statistics remain. Gift messages are stored with orders and can be exported or erased using the site privacy tools, subject to the store order data removal setting.', 'mix-and-max-box-builder' ) ) );
		}
	}
	/** Register the gift-message exporter.
	 *
	 * @param array $exporters Exporters.
	 * @return array
	 */
	public function exporters( $exporters ) {
		$exporters['mmbb-gift-messages'] = array(
			'exporter_friendly_name' => __( 'Box gift messages', 'mix-and-max-box-builder' ),
			'callback'               => array( $this, 'export' ),
		);
		return $exporters;
	}
	/** Run before WooCommerce erases billing emails needed by the lookup.
	 *
	 * @param array $erasers Erasers.
	 * @return array
	 */
	public function erasers( $erasers ) {
		return array_merge(
			array(
				'mmbb-gift-messages' => array(
					'eraser_friendly_name' => __( 'Box gift messages', 'mix-and-max-box-builder' ),
					'callback'             => array( $this, 'erase' ),
				),
			),
			$erasers
		);
	}
	/** Read a stable page of customer orders.
	 *
	 * @param string $email Email address.
	 * @param int    $page Page number.
	 * @return array
	 */
	private function orders( $email, $page ) {
		return wc_get_orders(
			array(
				'billing_email' => sanitize_email( $email ),
				'limit'         => 20,
				'page'          => max( 1, (int) $page ),
				'orderby'       => 'ID',
				'order'         => 'ASC',
				'type'          => 'shop_order',
			)
		);
	}
	/** Export the gift message from the internal box snapshot.
	 *
	 * @param string $email Email address.
	 * @param int    $page Page number.
	 * @return array
	 */
	public function export( $email, $page = 1 ) {
		$orders = $this->orders( $email, $page );
		$data   = array();
		foreach ( $orders as $order ) {
			foreach ( $order->get_items() as $id => $item ) {
				$box = json_decode( (string) $item->get_meta( '_mmbb_box' ), true );
				if ( empty( $box['gift']['message'] ) ) {
					continue;
				}
				$data[] = array(
					'group_id'    => 'mmbb-gift-messages',
					'group_label' => __( 'Box gift messages', 'mix-and-max-box-builder' ),
					'item_id'     => 'mmbb-order-' . $order->get_id() . '-' . $id,
					'data'        => array(
						array(
							'name'  => __( 'Order', 'mix-and-max-box-builder' ),
							'value' => $order->get_order_number(),
						),
						array(
							'name'  => __( 'Gift message', 'mix-and-max-box-builder' ),
							'value' => $box['gift']['message'],
						),
					),
				);
			}
		}
		return array(
			'data' => $data,
			'done' => count( $orders ) < 20,
		);
	}
	/** Erase both hidden JSON and visible message metadata when store policy permits.
	 *
	 * @param string $email Email address.
	 * @param int    $page Page number.
	 * @return array
	 */
	public function erase( $email, $page = 1 ) {
		$orders  = $this->orders( $email, $page );
		$result  = array(
			'items_removed'  => false,
			'items_retained' => false,
			'messages'       => array(),
			'done'           => count( $orders ) < 20,
		);
		$enabled = wc_string_to_bool( get_option( 'woocommerce_erasure_request_removes_order_data', 'no' ) );
		foreach ( $orders as $order ) {
			foreach ( $order->get_items() as $item ) {
				$box = json_decode( (string) $item->get_meta( '_mmbb_box' ), true );
				if ( empty( $box['gift']['message'] ) ) {
					continue;
				}
				if ( ! $enabled ) {
					$result['items_retained'] = true;
					continue;
				}
				foreach ( $item->get_meta_data() as $meta ) {
					if ( $meta->value === $box['gift']['message'] ) {
						$item->delete_meta_data_by_mid( $meta->id );
					}
				}
				$box['gift']['message'] = '';
				$item->update_meta_data( '_mmbb_box', wp_json_encode( $box ) );
				$item->save();
				$result['items_removed'] = true;
			}
		}
		if ( $result['items_retained'] ) {
			$result['messages'][] = __( 'Gift messages were retained because order data removal is disabled in WooCommerce.', 'mix-and-max-box-builder' );
		}
		return $result;
	}
}
