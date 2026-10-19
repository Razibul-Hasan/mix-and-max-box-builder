<?php
/**
 * The storefront's add-to-cart endpoint: `?wc-ajax=mmbb_add_box`.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Cart;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/** Validates a box on the server and adds it to the cart as one priced line (or a box plus its items). */
final class Add_To_Cart {
	/** Nonce action for the endpoint. */
	const NONCE_ACTION = 'mmbb_add_box';

	/** Longest gift message kept, in characters. */
	const MAX_MESSAGE = 200;

	/** Register the WooCommerce AJAX actions. */
	public function register() {
		add_action( 'wc_ajax_mmbb_add_box', array( $this, 'handle_add' ) );
		add_action( 'wc_ajax_mmbb_nonce', array( $this, 'handle_nonce' ) );
	}

	/**
	 * Endpoint URLs for the storefront script.
	 *
	 * @return array { add_box, nonce }.
	 */
	public static function endpoints() {
		return array(
			'add_box' => \WC_AJAX::get_endpoint( 'mmbb_add_box' ),
			'nonce'   => \WC_AJAX::get_endpoint( 'mmbb_nonce' ),
		);
	}

	/** Answer with a fresh nonce, so a cached page can retry once. */
	public function handle_nonce() {
		wp_send_json_success( array( 'nonce' => wp_create_nonce( self::NONCE_ACTION ) ) );
	}

	/** Add a box to the cart. */
	public function handle_add() {
		// 1. Nonce. A cached page may hold an old one, so the front end can fetch a new one and retry.
		if ( ! check_ajax_referer( self::NONCE_ACTION, 'nonce', false ) ) {
			$this->fail( 'mmbb_nonce_expired' );
		}

		if ( ! function_exists( 'WC' ) || ! function_exists( 'wc_load_cart' ) ) {
			$this->fail( 'cart_unavailable' );
		}
		if ( ! WC()->cart instanceof \WC_Cart ) {
			wc_load_cart();
		}
		if ( ! WC()->cart instanceof \WC_Cart ) {
			$this->fail( 'cart_unavailable' );
		}

		// 2. Campaign.
		$campaign_id = isset( $_POST['campaign_id'] ) ? absint( wp_unslash( $_POST['campaign_id'] ) ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified by check_ajax_referer() above.
		$campaign    = ( new Campaign_Repository() )->find( $campaign_id );
		if ( ! $campaign ) {
			$this->fail( 'campaign_not_found' );
		}

		// 3 and 4. Picks, rules, stock, and the quote from WooCommerce prices.
		$gift     = $this->read_gift( $campaign['config'] );
		$resolved = Box_Resolver::resolve(
			$campaign,
			$this->read_items(),
			array(
				'size'      => isset( $_POST['size'] ) ? absint( wp_unslash( $_POST['size'] ) ) : 0, // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified above.
				'gift_wrap' => $gift['enabled'],
			),
			$this->edit_key()
		);
		if ( null !== $resolved['error'] ) {
			$this->fail( $resolved['error'] );
		}

		$box         = $this->build_box( $campaign, $resolved, $gift );
		$box['mode'] = 'items' === Settings::get( 'cart_display' ) ? 'items' : 'bundle';

		$container_id = Container_Products::ensure( $campaign['id'] );
		if ( is_wp_error( $container_id ) || (int) $container_id < 1 ) {
			$this->fail( 'cart_unavailable' );
		}

		// 5. Editing replaces the old line (and, in items mode, its children).
		$edit_key = $this->edit_key();
		if ( '' !== $edit_key ) {
			Cart_Lines::remove_box( $edit_key );
		}

		// 6. Add.
		$added = Container_Products::while_allowed(
			static function () use ( $container_id, $box ) {
				return WC()->cart->add_to_cart( (int) $container_id, 1, 0, array(), array( 'mmbb_box' => $box ) );
			}
		);
		if ( ! $added ) {
			$this->fail( 'invalid_box' );
		}
		if ( 'items' === $box['mode'] && ! Cart_Lines::add_children( $added, $box ) ) {
			Cart_Lines::remove_box( $added );
			$this->fail( 'invalid_box' );
		}

		WC()->cart->calculate_totals();
		wp_send_json_success(
			array(
				'cart_url'  => wc_get_cart_url(),
				'cart_hash' => WC()->cart->get_cart_hash(),
			)
		);
	}

	/**
	 * The data stored on the cart line.
	 *
	 * @param array $campaign Campaign.
	 * @param array $resolved Result of Box_Resolver::resolve().
	 * @param array $gift     { enabled, message }.
	 * @return array
	 */
	private function build_box( array $campaign, array $resolved, array $gift ) {
		$size = 'fixed' === $campaign['config']['type'] && isset( $resolved['quote']['tier']['qty'] ) ? (int) $resolved['quote']['tier']['qty'] : 0;

		$sorted = $resolved['items'];
		usort(
			$sorted,
			static function ( $a, $b ) {
				return Box_Rules::key( $a['product_id'], $a['variation_id'] ) <=> Box_Rules::key( $b['product_id'], $b['variation_id'] );
			}
		);
		$hash_source = array();
		foreach ( $sorted as $item ) {
			$hash_source[] = array( $item['product_id'], $item['variation_id'], $item['qty'] );
		}

		return array(
			'campaign_id' => (int) $campaign['id'],
			'items'       => $resolved['items'],
			'size'        => $size,
			'gift'        => $gift,
			'quote'       => $resolved['quote'],
			'hash'        => md5( wp_json_encode( array( $campaign['id'], $hash_source, $size, $gift ) ) ),
		);
	}

	/**
	 * Read the picked items. Only whole numbers are kept, and prices are never read.
	 *
	 * @return array[] List of { product_id, variation_id, qty }.
	 */
	private function read_items() {
		$raw = isset( $_POST['items'] ) && is_array( $_POST['items'] ) ? wp_unslash( $_POST['items'] ) : array(); // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Verified above; every field is cast with absint() below.
		$out = array();
		foreach ( array_slice( $raw, 0, 100 ) as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$out[] = array(
				'product_id'   => isset( $row['product_id'] ) ? absint( $row['product_id'] ) : 0,
				'variation_id' => isset( $row['variation_id'] ) ? absint( $row['variation_id'] ) : 0,
				'qty'          => isset( $row['qty'] ) ? absint( $row['qty'] ) : 0,
			);
		}
		return $out;
	}

	/**
	 * Read the gift options, keeping only what the campaign offers.
	 *
	 * @param array $config Campaign config.
	 * @return array { enabled: bool, message: string }.
	 */
	private function read_gift( array $config ) {
		$raw = isset( $_POST['gift'] ) && is_array( $_POST['gift'] ) ? wp_unslash( $_POST['gift'] ) : array(); // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Verified above; each field is sanitized below.

		$wants_wrap = isset( $raw['enabled'] ) && rest_sanitize_boolean( $raw['enabled'] );
		$message    = '';
		if ( ! empty( $config['extras']['gift_message'] ) && isset( $raw['message'] ) && is_scalar( $raw['message'] ) ) {
			$message = mb_substr( sanitize_textarea_field( (string) $raw['message'] ), 0, self::MAX_MESSAGE );
		}
		return array(
			'enabled' => $wants_wrap && ! empty( $config['extras']['gift_wrap']['enabled'] ),
			'message' => $message,
		);
	}

	/**
	 * The cart item key being edited, when it is a box line of this cart.
	 *
	 * @return string
	 */
	private function edit_key() {
		$key = isset( $_POST['edit_key'] ) ? sanitize_key( wp_unslash( $_POST['edit_key'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing -- Verified above.
		if ( '' === $key || ! WC()->cart instanceof \WC_Cart ) {
			return '';
		}
		$line = WC()->cart->get_cart_item( $key );
		return ! empty( $line['mmbb_box'] ) ? $key : '';
	}

	/**
	 * Send an error and stop.
	 *
	 * @param string $code Error code.
	 */
	private function fail( $code ) {
		$error = Box_Text::error( $code );
		wp_send_json_error(
			array(
				'code'    => $error['code'],
				'message' => $error['message'],
			),
			$error['status']
		);
	}
}
