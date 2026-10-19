<?php
/**
 * Box lines in the cart: session, server pricing, display, coupons and items mode.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Cart;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * A box is a container product line carrying `mmbb_box`. In items mode the container is a
 * header line priced at the gift-wrap fee only, and each item is its own line with `mmbb_parent`.
 */
final class Cart_Lines {
	/**
	 * Guards the repricing so removing a line inside it cannot start it again.
	 *
	 * @var bool
	 */
	private static $running = false;

	/** Register hooks. */
	public function register() {
		add_filter( 'woocommerce_get_cart_item_from_session', array( $this, 'restore_from_session' ), 10, 2 );
		add_action( 'woocommerce_before_calculate_totals', array( $this, 'reprice' ), 20 );
		add_filter( 'woocommerce_get_item_data', array( $this, 'item_data' ), 10, 2 );
		add_action( 'woocommerce_after_cart_item_name', array( $this, 'edit_link' ), 10, 2 );
		add_filter( 'woocommerce_coupon_is_valid_for_product', array( $this, 'coupon_valid_for_product' ), 10, 4 );
		add_filter( 'woocommerce_cart_item_quantity', array( $this, 'lock_quantity' ), 10, 3 );
		add_filter( 'woocommerce_store_api_product_quantity_editable', array( $this, 'quantity_editable' ), 10, 3 );
		add_filter( 'woocommerce_cart_item_remove_link', array( $this, 'hide_child_remove_link' ), 10, 2 );
		add_action( 'woocommerce_cart_item_removed', array( $this, 'remove_children' ), 10, 2 );
		add_action( 'woocommerce_blocks_loaded', array( $this, 'register_store_api_data' ) );
	}

	/**
	 * Remove a box line and, through the removal hook, its item lines.
	 *
	 * @param string $key Cart item key of the box line.
	 */
	public static function remove_box( $key ) {
		if ( function_exists( 'WC' ) && WC()->cart instanceof \WC_Cart ) {
			WC()->cart->remove_cart_item( $key );
		}
	}

	/**
	 * Add one line per item under a header line (items mode).
	 *
	 * @param string $header_key Header cart item key.
	 * @param array  $box        Box data.
	 * @return bool Whether every item was added.
	 */
	public static function add_children( $header_key, array $box ) {
		foreach ( $box['items'] as $item ) {
			$attributes = $item['variation_id'] > 0 ? wc_get_product_variation_attributes( $item['variation_id'] ) : array();
			$added      = WC()->cart->add_to_cart(
				$item['product_id'],
				$item['qty'],
				$item['variation_id'],
				$attributes,
				array(
					'mmbb_parent' => $header_key,
				)
			);
			if ( ! $added ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Keep box data when the cart is rebuilt from the session.
	 *
	 * @param array $data   Cart item built so far.
	 * @param array $values Stored session values.
	 * @return array
	 */
	public function restore_from_session( $data, $values ) {
		if ( isset( $values['mmbb_box'] ) && is_array( $values['mmbb_box'] ) ) {
			$data['mmbb_box'] = $values['mmbb_box'];
		}
		if ( isset( $values['mmbb_parent'] ) && is_string( $values['mmbb_parent'] ) ) {
			$data['mmbb_parent'] = $values['mmbb_parent'];
		}
		return $data;
	}

	/**
	 * Price every box line from current product prices. Runs once per calculation.
	 *
	 * A box that is no longer valid (campaign over, item gone or out of stock) is removed with a notice.
	 *
	 * @param \WC_Cart $cart Cart.
	 */
	public function reprice( $cart ) {
		if ( self::$running || ( is_admin() && ! wp_doing_ajax() ) || ! $cart instanceof \WC_Cart ) {
			return;
		}
		self::$running = true;
		try {
			$repo = new Campaign_Repository();
			foreach ( $cart->get_cart() as $key => $line ) {
				// Lines removed earlier in this loop (a header takes its children with it) are skipped.
				if ( ! isset( $cart->cart_contents[ $key ] ) ) {
					continue;
				}
				if ( isset( $line['mmbb_parent'] ) ) {
					$this->check_child( $cart, $key, $line );
				} elseif ( isset( $line['mmbb_box'] ) ) {
					$this->price_box( $cart, $repo, $key, $line );
				}
			}
		} finally {
			self::$running = false;
		}
	}

	/**
	 * Price one box line.
	 *
	 * @param \WC_Cart            $cart Cart.
	 * @param Campaign_Repository $repo Repository.
	 * @param string              $key  Cart item key.
	 * @param array               $line Cart item.
	 */
	private function price_box( \WC_Cart $cart, Campaign_Repository $repo, $key, array $line ) {
		$box      = $line['mmbb_box'];
		$campaign = is_array( $box ) && isset( $box['campaign_id'] ) ? $repo->find( (int) $box['campaign_id'] ) : null;
		if ( ! $campaign || empty( $box['items'] ) || ! is_array( $box['items'] ) ) {
			$this->drop( $cart, $key, $line, 'campaign_unavailable' );
			return;
		}

		$items_mode = isset( $box['mode'] ) && 'items' === $box['mode'];
		$picks      = $box['items'];
		if ( $items_mode ) {
			$picks = $this->picks_from_children( $cart, $key );
			if ( ! $this->children_match( $box['items'], $picks ) ) {
				$this->drop( $cart, $key, $line, 'invalid_box' );
				return;
			}
		}

		$gift     = isset( $box['gift'] ) && is_array( $box['gift'] ) ? $box['gift'] : array();
		$resolved = Box_Resolver::resolve(
			$campaign,
			$picks,
			array(
				'size'      => isset( $box['size'] ) ? (int) $box['size'] : 0,
				'gift_wrap' => ! empty( $gift['enabled'] ),
			),
			$key,
			$items_mode ? 1 : max( 1, (int) $line['quantity'] )
		);
		if ( null !== $resolved['error'] ) {
			$this->drop( $cart, $key, $line, $resolved['error'] );
			return;
		}

		$quote = $resolved['quote'];
		$cart->cart_contents[ $key ]['mmbb_box']['items'] = $resolved['items'];
		$cart->cart_contents[ $key ]['mmbb_box']['quote'] = $quote;

		if ( $items_mode ) {
			$cart->cart_contents[ $key ]['data']->set_price( Box_Resolver::to_decimal( $quote['fee'] ) );
			$this->price_children( $cart, $key, $resolved['items'], $quote );
			return;
		}

		$cart->cart_contents[ $key ]['data']->set_price( Box_Resolver::to_decimal( $quote['total'] ) );
		$cart->cart_contents[ $key ]['data']->set_weight( (string) $this->weight( $resolved['items'] ) );
	}

	/**
	 * An item line whose header is gone cannot stay.
	 *
	 * @param \WC_Cart $cart Cart.
	 * @param string   $key  Cart item key.
	 * @param array    $line Cart item.
	 */
	private function check_child( \WC_Cart $cart, $key, array $line ) {
		$parent = $line['mmbb_parent'];
		if ( ! isset( $cart->cart_contents[ $parent ]['mmbb_box'] ) ) {
			$cart->remove_cart_item( $key );
		}
	}

	/**
	 * Remove a box line and tell the shopper why.
	 *
	 * @param \WC_Cart $cart Cart.
	 * @param string   $key  Cart item key.
	 * @param array    $line Cart item.
	 * @param string   $code Error code from Box_Text.
	 */
	private function drop( \WC_Cart $cart, $key, array $line, $code ) {
		$error = Box_Text::error( $code );
		$name  = isset( $line['data'] ) && $line['data'] instanceof \WC_Product ? $line['data']->get_name() : __( 'Your box', 'mix-and-max-box-builder' );
		wc_add_notice(
			sprintf(
				/* translators: 1: box name, 2: the reason, a sentence */
				__( '%1$s was removed from your cart. %2$s', 'mix-and-max-box-builder' ),
				$name,
				$error['message']
			),
			'error'
		);
		$cart->remove_cart_item( $key );
	}

	/**
	 * The picks a header's child lines currently hold.
	 *
	 * @param \WC_Cart $cart       Cart.
	 * @param string   $header_key Header key.
	 * @return array[]
	 */
	private function picks_from_children( \WC_Cart $cart, $header_key ) {
		$picks = array();
		foreach ( $cart->cart_contents as $line ) {
			if ( isset( $line['mmbb_parent'] ) && $line['mmbb_parent'] === $header_key ) {
				$picks[] = array(
					'product_id'   => (int) $line['product_id'],
					'variation_id' => (int) $line['variation_id'],
					'qty'          => (int) $line['quantity'],
				);
			}
		}
		return $picks;
	}

	/**
	 * Whether the child lines still hold exactly the header's items.
	 *
	 * @param array[] $expected Items stored on the header.
	 * @param array[] $actual   Picks read from the child lines.
	 * @return bool
	 */
	private function children_match( array $expected, array $actual ) {
		$flatten = static function ( array $rows ) {
			$map = array();
			foreach ( Box_Rules::merge( $rows ) as $row ) {
				$map[ Box_Rules::key( $row['product_id'], $row['variation_id'] ) ] = $row['qty'];
			}
			ksort( $map );
			return $map;
		};
		return $flatten( $expected ) === $flatten( $actual );
	}

	/**
	 * Give each child line its share of the discounted price.
	 *
	 * The discounted item total is split in proportion to line subtotals, and the last line
	 * takes the rounding remainder so the lines add up to the quote.
	 *
	 * @param \WC_Cart $cart       Cart.
	 * @param string   $header_key Header key.
	 * @param array[]  $items      Priced items.
	 * @param array    $quote      Quote.
	 */
	private function price_children( \WC_Cart $cart, $header_key, array $items, array $quote ) {
		$target    = (int) $quote['subtotal'] - (int) $quote['discount'];
		$subtotal  = max( 1, (int) $quote['subtotal'] );
		$remaining = $target;
		$unit_of   = array();
		$last      = count( $items ) - 1;
		foreach ( $items as $index => $item ) {
			$line_subtotal = $item['unit_price_minor'] * $item['qty'];
			$share         = $index === $last ? $remaining : (int) floor( $line_subtotal * $target / $subtotal + 0.5 );
			$remaining    -= $share;
			$unit_of[ Box_Rules::key( $item['product_id'], $item['variation_id'] ) ] = $share / max( 1, $item['qty'] );
		}

		$decimals = wc_get_price_decimals();
		foreach ( $cart->cart_contents as $child_key => $line ) {
			if ( ! isset( $line['mmbb_parent'] ) || $line['mmbb_parent'] !== $header_key ) {
				continue;
			}
			$id = Box_Rules::key( (int) $line['product_id'], (int) $line['variation_id'] );
			if ( isset( $unit_of[ $id ] ) ) {
				$cart->cart_contents[ $child_key ]['data']->set_price( (string) ( $unit_of[ $id ] / pow( 10, $decimals ) ) );
			}
		}
	}

	/**
	 * Combined weight of a box's items.
	 *
	 * @param array[] $items Box items.
	 * @return float
	 */
	private function weight( array $items ) {
		$weight = 0.0;
		foreach ( $items as $item ) {
			$product = wc_get_product( Box_Rules::key( $item['product_id'], $item['variation_id'] ) );
			if ( $product instanceof \WC_Product && '' !== (string) $product->get_weight() ) {
				$weight += (float) $product->get_weight() * (int) $item['qty'];
			}
		}
		return $weight;
	}

	/**
	 * Lines shown under the product name in the classic cart, the mini cart and the Cart block.
	 *
	 * @param array $item_data Rows so far.
	 * @param array $cart_item Cart item.
	 * @return array
	 */
	public function item_data( $item_data, $cart_item ) {
		if ( isset( $cart_item['mmbb_parent'] ) && ! isset( $cart_item['mmbb_box'] ) ) {
			$parent = function_exists( 'WC' ) && WC()->cart instanceof \WC_Cart ? WC()->cart->get_cart_item( $cart_item['mmbb_parent'] ) : array();
			if ( ! empty( $parent['data'] ) ) {
				$item_data[] = array(
					'key'   => __( 'Part of', 'mix-and-max-box-builder' ),
					'value' => $parent['data']->get_name(),
				);
			}
			return $item_data;
		}
		if ( ! isset( $cart_item['mmbb_box'] ) || ! is_array( $cart_item['mmbb_box'] ) || empty( $cart_item['mmbb_box']['items'] ) ) {
			return $item_data;
		}

		$box   = $cart_item['mmbb_box'];
		$quote = isset( $box['quote'] ) && is_array( $box['quote'] ) ? $box['quote'] : array();
		$rows  = array(
			__( 'Contents', 'mix-and-max-box-builder' ) => Box_Text::contents( $box['items'] ),
			__( 'Box discount', 'mix-and-max-box-builder' ) => $quote ? Box_Text::discount( $quote ) : '',
		);
		if ( ! empty( $box['gift']['enabled'] ) && ! empty( $quote['fee'] ) ) {
			$rows[ __( 'Gift wrap', 'mix-and-max-box-builder' ) ] = Box_Text::money( $quote['fee'] );
		}
		if ( ! empty( $box['gift']['message'] ) ) {
			$rows[ __( 'Gift message', 'mix-and-max-box-builder' ) ] = $box['gift']['message'];
		}
		if ( $quote ) {
			$rows[ __( 'Next discount', 'mix-and-max-box-builder' ) ] = Box_Text::nudge( $quote );
		}

		foreach ( $rows as $label => $value ) {
			if ( '' !== (string) $value ) {
				$item_data[] = array(
					'key'   => $label,
					'value' => $value,
				);
			}
		}
		return $item_data;
	}

	/**
	 * The address of the builder page that reopens a box, or an empty string.
	 *
	 * @param array $box Box data.
	 * @return string
	 */
	private function builder_url( array $box ) {
		$campaign = ( new Campaign_Repository() )->find( isset( $box['campaign_id'] ) ? (int) $box['campaign_id'] : 0 );
		$page_id  = $campaign ? (int) $campaign['config']['placement']['page_id'] : 0;
		if ( $page_id < 1 || 'publish' !== get_post_status( $page_id ) ) {
			$page_id = (int) Settings::get( 'default_page_id' );
		}
		if ( $page_id < 1 || 'publish' !== get_post_status( $page_id ) ) {
			return '';
		}
		return (string) get_permalink( $page_id );
	}

	/**
	 * "Edit box" link in the classic cart. It only preloads the builder, so it needs no nonce.
	 *
	 * @param array  $cart_item     Cart item.
	 * @param string $cart_item_key Cart item key.
	 */
	public function edit_link( $cart_item, $cart_item_key ) {
		if ( ! Settings::get( 'edit_from_cart' ) || empty( $cart_item['mmbb_box'] ) || ! is_array( $cart_item['mmbb_box'] ) ) {
			return;
		}
		$url = $this->builder_url( $cart_item['mmbb_box'] );
		if ( '' === $url ) {
			return;
		}
		printf(
			' <a class="mmbb-edit-box" href="%1$s">%2$s</a>',
			esc_url( add_query_arg( 'mmbb_edit', rawurlencode( (string) $cart_item_key ), $url ) ),
			esc_html__( 'Edit box', 'mix-and-max-box-builder' )
		);
	}

	/**
	 * Keep coupons off box lines unless the merchant allows them.
	 *
	 * @param bool        $valid   Whether the coupon applies to this product.
	 * @param \WC_Product $product Product.
	 * @param \WC_Coupon  $coupon  Coupon.
	 * @param array|null  $values  Cart item, when there is one.
	 * @return bool
	 */
	public function coupon_valid_for_product( $valid, $product, $coupon, $values = null ) {
		if ( ! $valid || Settings::get( 'allow_coupons' ) ) {
			return $valid;
		}
		if ( is_array( $values ) && ( isset( $values['mmbb_box'] ) || isset( $values['mmbb_parent'] ) ) ) {
			return false;
		}
		return $valid;
	}

	/**
	 * Items-mode lines show their quantity as text: the header and its items change together.
	 *
	 * @param string $quantity      Quantity markup.
	 * @param string $cart_item_key Cart item key.
	 * @param array  $cart_item     Cart item.
	 * @return string
	 */
	public function lock_quantity( $quantity, $cart_item_key, $cart_item ) {
		if ( self::is_locked( $cart_item ) ) {
			return esc_html( (string) (int) $cart_item['quantity'] );
		}
		return $quantity;
	}

	/**
	 * The Cart and Checkout blocks follow the same rule.
	 *
	 * @param bool        $editable  Whether the quantity can change.
	 * @param \WC_Product $product   Product.
	 * @param array|null  $cart_item Cart item.
	 * @return bool
	 */
	public function quantity_editable( $editable, $product, $cart_item = null ) {
		return is_array( $cart_item ) && self::is_locked( $cart_item ) ? false : $editable;
	}

	/**
	 * Item lines cannot be removed one by one; remove the header instead.
	 *
	 * @param string $link          Remove link markup.
	 * @param string $cart_item_key Cart item key.
	 * @return string
	 */
	public function hide_child_remove_link( $link, $cart_item_key ) {
		$line = function_exists( 'WC' ) && WC()->cart instanceof \WC_Cart ? WC()->cart->get_cart_item( $cart_item_key ) : array();
		return ! empty( $line['mmbb_parent'] ) ? '' : $link;
	}

	/**
	 * Removing a header removes its item lines.
	 *
	 * @param string   $cart_item_key Removed key.
	 * @param \WC_Cart $cart          Cart.
	 */
	public function remove_children( $cart_item_key, $cart ) {
		$removed = isset( $cart->removed_cart_contents[ $cart_item_key ] ) ? $cart->removed_cart_contents[ $cart_item_key ] : array();
		if ( empty( $removed['mmbb_box']['mode'] ) || 'items' !== $removed['mmbb_box']['mode'] ) {
			return;
		}
		foreach ( $cart->cart_contents as $key => $line ) {
			if ( isset( $line['mmbb_parent'] ) && $line['mmbb_parent'] === $cart_item_key ) {
				$cart->remove_cart_item( $key );
			}
		}
	}

	/**
	 * Whether a line belongs to an items-mode box.
	 *
	 * @param array $cart_item Cart item.
	 * @return bool
	 */
	private static function is_locked( array $cart_item ) {
		return isset( $cart_item['mmbb_parent'] ) || ( isset( $cart_item['mmbb_box']['mode'] ) && 'items' === $cart_item['mmbb_box']['mode'] );
	}

	/** Tell the Cart block about box lines through Store API extension data. */
	public function register_store_api_data() {
		if ( ! function_exists( 'woocommerce_store_api_register_endpoint_data' ) ) {
			return;
		}
		woocommerce_store_api_register_endpoint_data(
			array(
				'endpoint'        => 'cart-item',
				'namespace'       => 'mmbb',
				'data_callback'   => array( $this, 'store_api_data' ),
				'schema_callback' => array( $this, 'store_api_schema' ),
				'schema_type'     => ARRAY_A,
			)
		);
	}

	/**
	 * Extension data for one cart item.
	 *
	 * @param array $cart_item Cart item.
	 * @return array
	 */
	public function store_api_data( $cart_item ) {
		$box = isset( $cart_item['mmbb_box'] ) && is_array( $cart_item['mmbb_box'] ) ? $cart_item['mmbb_box'] : null;
		return array(
			'is_box'   => null !== $box,
			'edit_url' => null !== $box && Settings::get( 'edit_from_cart' ) ? $this->builder_url( $box ) : '',
		);
	}

	/**
	 * Schema for the extension data.
	 *
	 * @return array
	 */
	public function store_api_schema() {
		return array(
			'is_box'   => array(
				'description' => __( 'Whether this line is a Mix and Max box.', 'mix-and-max-box-builder' ),
				'type'        => 'boolean',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
			'edit_url' => array(
				'description' => __( 'Builder page address for editing the box.', 'mix-and-max-box-builder' ),
				'type'        => 'string',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
		);
	}
}
