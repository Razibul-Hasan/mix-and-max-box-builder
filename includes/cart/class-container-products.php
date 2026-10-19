<?php
/**
 * The hidden product that carries a box through the cart.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Cart;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Post_Type;

defined( 'ABSPATH' ) || exit;

/** One hidden, zero-priced simple product per campaign. The server prices the cart line. */
final class Container_Products {
	/** Product meta that marks a container and names its campaign. */
	const META = '_mmbb_campaign_id';

	/**
	 * Campaign ids being set up, so a save inside ensure() does not start a second run.
	 *
	 * @var int[]
	 */
	private static $busy = array();

	/**
	 * While true, container products are purchasable (set around our own add to cart).
	 *
	 * @var bool
	 */
	private static $allow = false;

	/** Register hooks. */
	public function register() {
		add_filter( 'mmbb_ensure_container_product', array( $this, 'filter_ensure' ), 10, 2 );
		add_action( 'mmbb_campaign_saved', array( $this, 'on_campaign_saved' ), 10, 2 );
		add_action( 'transition_post_status', array( $this, 'on_status_change' ), 10, 3 );
		add_filter( 'woocommerce_is_purchasable', array( $this, 'filter_purchasable' ), 10, 2 );
		add_filter( 'display_post_states', array( $this, 'post_states' ), 10, 2 );
		add_action( 'edit_form_top', array( $this, 'edit_screen_warning' ) );
	}

	/**
	 * Let our own add to cart through for the length of a callback.
	 *
	 * @param callable $callback Work to do while container products are purchasable.
	 * @return mixed What the callback returns.
	 */
	public static function while_allowed( $callback ) {
		self::$allow = true;
		try {
			return call_user_func( $callback );
		} finally {
			self::$allow = false;
		}
	}

	/**
	 * Whether a product is a campaign container.
	 *
	 * @param \WC_Product $product Product.
	 * @return bool
	 */
	public static function is_container( $product ) {
		return $product instanceof \WC_Product && (int) $product->get_meta( self::META ) > 0;
	}

	/**
	 * Create or find the container for a campaign.
	 *
	 * @param int $campaign_id Campaign id.
	 * @return int|\WP_Error Product id.
	 */
	public static function ensure( $campaign_id ) {
		$campaign_id = absint( $campaign_id );
		$repo        = new Campaign_Repository();
		$campaign    = $repo->find( $campaign_id );
		if ( ! $campaign ) {
			return new \WP_Error( 'mmbb_not_found', __( 'Campaign not found.', 'mix-and-max-box-builder' ), array( 'status' => 404 ) );
		}
		if ( isset( self::$busy[ $campaign_id ] ) ) {
			return (int) $campaign['config']['container_product_id'];
		}
		self::$busy[ $campaign_id ] = true;

		try {
			$existing = self::existing( $campaign );
			if ( $existing instanceof \WC_Product ) {
				self::sync_title( $existing, $campaign['title'] );
				return (int) $existing->get_id();
			}

			$product = new \WC_Product_Simple();
			$product->set_name( self::title( $campaign['title'] ) );
			$product->set_status( 'publish' );
			$product->set_catalog_visibility( 'hidden' );
			$product->set_manage_stock( false );
			$product->set_stock_status( 'instock' );
			$product->set_regular_price( '0' );
			$product->set_sold_individually( false );
			$product->update_meta_data( self::META, (int) $campaign_id );
			$product_id = $product->save();
			if ( ! $product_id ) {
				return new \WP_Error( 'mmbb_container_failed', __( 'The box product could not be created.', 'mix-and-max-box-builder' ), array( 'status' => 500 ) );
			}

			$set = $repo->set_container_product( $campaign_id, (int) $product_id );
			if ( is_wp_error( $set ) ) {
				return $set;
			}
			return (int) $product_id;
		} finally {
			unset( self::$busy[ $campaign_id ] );
		}
	}

	/**
	 * The campaign's container product when it still exists, is not trashed and carries the marker.
	 *
	 * @param array $campaign Campaign from the repository.
	 * @return \WC_Product|null
	 */
	private static function existing( array $campaign ) {
		$id = (int) $campaign['config']['container_product_id'];
		if ( $id < 1 ) {
			return null;
		}
		$product = wc_get_product( $id );
		if ( ! $product instanceof \WC_Product || 'trash' === $product->get_status() ) {
			return null;
		}
		return (int) $product->get_meta( self::META ) === (int) $campaign['id'] ? $product : null;
	}

	/**
	 * Keep the product title equal to the campaign name.
	 *
	 * @param \WC_Product $product Container product.
	 * @param string      $title   Campaign title.
	 */
	private static function sync_title( \WC_Product $product, $title ) {
		$wanted = self::title( $title );
		if ( $product->get_name() !== $wanted ) {
			$product->set_name( $wanted );
			$product->save();
		}
	}

	/**
	 * The product title for a campaign title.
	 *
	 * @param string $title Campaign title.
	 * @return string
	 */
	private static function title( $title ) {
		$title = trim( (string) $title );
		return '' === $title ? __( 'Untitled campaign', 'mix-and-max-box-builder' ) : $title;
	}

	/**
	 * Filter callback for Publisher: make sure the container exists and return its id.
	 *
	 * @param int|\WP_Error|null $result      Value so far.
	 * @param int                $campaign_id Campaign id.
	 * @return int|\WP_Error|null
	 */
	public function filter_ensure( $result, $campaign_id ) {
		if ( null !== $result ) {
			return $result;
		}
		return self::ensure( $campaign_id );
	}

	/**
	 * After any save: keep the title in sync, and give a published campaign without a container one.
	 *
	 * @param int   $campaign_id Campaign id.
	 * @param array $config      Saved config.
	 */
	public function on_campaign_saved( $campaign_id, $config ) {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return;
		}
		$has_container = is_array( $config ) && ! empty( $config['container_product_id'] );
		if ( ! $has_container && 'publish' !== get_post_status( $campaign_id ) ) {
			return;
		}
		self::ensure( $campaign_id );
	}

	/**
	 * A campaign that goes live gets its container, however it was published.
	 *
	 * @param string   $new_status New post status.
	 * @param string   $old_status Old post status.
	 * @param \WP_Post $post       Post.
	 */
	public function on_status_change( $new_status, $old_status, $post ) {
		if ( 'publish' === $new_status && 'publish' !== $old_status && $post instanceof \WP_Post && Post_Type::NAME === $post->post_type && function_exists( 'wc_get_product' ) ) {
			self::ensure( $post->ID );
		}
	}

	/**
	 * Container products can be bought only as part of a box: while our add to cart runs,
	 * or when the cart (or the stored session cart, while it loads) already holds a box line.
	 *
	 * @param bool        $purchasable Value so far.
	 * @param \WC_Product $product     Product.
	 * @return bool
	 */
	public function filter_purchasable( $purchasable, $product ) {
		if ( ! $purchasable || ! self::is_container( $product ) ) {
			return $purchasable;
		}
		return self::$allow || self::cart_has_box( (int) $product->get_id() );
	}

	/**
	 * Whether the cart holds a box line for the container product.
	 *
	 * @param int $product_id Container product id.
	 * @return bool
	 */
	private static function cart_has_box( $product_id ) {
		if ( ! function_exists( 'WC' ) ) {
			return false;
		}
		$lines = array();
		if ( WC()->cart instanceof \WC_Cart ) {
			$lines = array_merge( $lines, (array) WC()->cart->cart_contents );
		}
		// The session cart is read while WooCommerce rebuilds the cart from it.
		if ( WC()->session instanceof \WC_Session ) {
			$lines = array_merge( $lines, (array) WC()->session->get( 'cart', array() ) );
		}
		foreach ( $lines as $line ) {
			if ( is_array( $line ) && isset( $line['mmbb_box'], $line['product_id'] ) && (int) $line['product_id'] === $product_id ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Label containers in the Products list.
	 *
	 * @param string[] $states Post states.
	 * @param \WP_Post $post   Post.
	 * @return string[]
	 */
	public function post_states( $states, $post ) {
		if ( $post instanceof \WP_Post && 'product' === $post->post_type && (int) get_post_meta( $post->ID, self::META, true ) > 0 ) {
			$states['mmbb_container'] = __( 'Box container — managed by Mix and Max', 'mix-and-max-box-builder' );
		}
		return $states;
	}

	/**
	 * Warn on a container's edit screen. Printed inside the form, not as a site-wide notice.
	 *
	 * @param \WP_Post $post Post being edited.
	 */
	public function edit_screen_warning( $post ) {
		if ( ! $post instanceof \WP_Post || 'product' !== $post->post_type || (int) get_post_meta( $post->ID, self::META, true ) < 1 ) {
			return;
		}
		echo '<div class="notice notice-warning inline"><p>';
		echo esc_html__( 'This product carries a Mix and Max box through the cart. Mix and Max sets its name and price. Edit the campaign instead of this product.', 'mix-and-max-box-builder' );
		echo '</p></div>';
	}
}
