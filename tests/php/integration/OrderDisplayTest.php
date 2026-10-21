<?php
/**
 * Box details on order screens and in emails.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Cart\Order_Boxes;
use MixMax\BoxBuilder\Cart\Order_Display;
use MixMax\BoxBuilder\Settings\Settings;

/** Visible box metadata and email privacy preferences. */
class OrderDisplayTest extends \WP_UnitTestCase {
	/** Reset settings before each assertion. */
	public function set_up() {
		parent::set_up();
		update_option( Settings::OPTION, Settings::defaults() );
	}

	/** Reset settings changed by a test. */
	public function tear_down() {
		update_option( Settings::OPTION, Settings::defaults() );
		parent::tear_down();
	}

	/**
	 * Create a persisted box order line with two picked products.
	 *
	 * @param bool $with_gift Whether the snapshot includes a gift message.
	 * @return \WC_Order_Item_Product
	 */
	private function box_item( $with_gift = true ) {
		$products = array();
		foreach ( array( 'Brown Butter Chip', 'Smoky Earl Grey' ) as $name ) {
			$product = new \WC_Product_Simple();
			$product->set_name( $name );
			$product->set_regular_price( '5.00' );
			$product->set_status( 'publish' );
			$product->save();
			$products[] = $product;
		}

		$order   = wc_create_order();
		$item_id = $order->add_product( $products[0], 1 );
		$item    = $order->get_item( $item_id );
		$box     = array(
			'items' => array(
				array(
					'product_id'   => $products[0]->get_id(),
					'variation_id' => 0,
					'qty'          => 2,
				),
				array(
					'product_id'   => $products[1]->get_id(),
					'variation_id' => 0,
					'qty'          => 1,
				),
			),
			'gift'  => array( 'message' => $with_gift ? "Keep <b>this</b> secret\nSecond line" : '' ),
		);
		$item->add_meta_data( Order_Boxes::META_BOX, wp_json_encode( $box ), true );
		$item->add_meta_data( __( 'Contents', 'mix-and-max-box-builder' ), 'old one-line contents', true );
		if ( $with_gift ) {
			$item->add_meta_data( __( 'Gift message', 'mix-and-max-box-builder' ), 'old gift', true );
		}
		$item->add_meta_data( __( 'Box discount', 'mix-and-max-box-builder' ), '10% (-$1.00)', true );
		$item->save();
		return $item;
	}

	/**
	 * Map formatted metadata by its label.
	 *
	 * @param array $metadata Formatted metadata.
	 * @return array
	 */
	private function values( array $metadata ) {
		$values = array();
		foreach ( $metadata as $meta ) {
			$values[ $meta->key ] = $meta->display_value;
		}
		return $values;
	}

	/**
	 * Load a core WooCommerce email through its mailer.
	 *
	 * @param string $email_class Email class key.
	 * @return \WC_Email
	 */
	private function email( $email_class ) {
		$emails = WC()->mailer()->get_emails();
		return $emails[ $email_class ];
	}

	/** Order screens show the box details in a stable, readable order. */
	public function test_order_screen_formats_box_details() {
		$item    = $this->box_item();
		$display = new Order_Display();
		$data    = $display->format_meta( $item->get_formatted_meta_data(), $item );
		$values  = $this->values( $data );

		$this->assertSame( array( 'Box discount', 'Contents', 'Gift message' ), array_keys( $values ) );
		$this->assertStringContainsString( 'Brown Butter Chip', $values['Contents'] );
		$this->assertStringContainsString( '<br>', $values['Contents'] );
		$this->assertSame( "Keep this secret<br />\nSecond line", $values['Gift message'] );
	}

	/** Customer emails never receive gift messages. */
	public function test_customer_email_hides_gift_message() {
		$item    = $this->box_item();
		$display = new Order_Display();
		$display->begin_email( wc_create_order(), false, false, $this->email( 'WC_Email_Customer_Processing_Order' ) );
		$values = $this->values( $display->format_meta( $item->get_formatted_meta_data(), $item ) );
		$display->end_email( null, false, false, null );

		$this->assertArrayHasKey( 'Contents', $values );
		$this->assertArrayNotHasKey( 'Gift message', $values );
	}

	/** Admin HTML and plain-text emails format gift and content text safely. */
	public function test_admin_email_formats_html_and_plain_text() {
		$item    = $this->box_item();
		$display = new Order_Display();
		$email   = $this->email( 'WC_Email_New_Order' );
		$display->begin_email( wc_create_order(), true, false, $email );
		$html = $this->values( $display->format_meta( $item->get_formatted_meta_data(), $item ) );
		$display->end_email( null, true, false, null );

		$this->assertStringContainsString( '<br>', $html['Contents'] );
		$this->assertStringNotContainsString( '<b>', $html['Gift message'] );
		$this->assertStringContainsString( '<br />', $html['Gift message'] );

		$display->begin_email( wc_create_order(), true, true, $email );
		$plain = $this->values( $display->format_meta( $item->get_formatted_meta_data(), $item ) );
		$display->end_email( null, true, true, null );
		$this->assertStringContainsString( "\n", $plain['Contents'] );
		$this->assertStringNotContainsString( '<br>', $plain['Contents'] );
		$this->assertSame( "Keep this secret\nSecond line", $plain['Gift message'] );
	}

	/** Email switches remove item lists and gift text without affecting the discount. */
	public function test_email_settings_filter_optional_details() {
		Settings::update(
			array(
				'email_list_items'   => false,
				'email_gift_message' => false,
			)
		);
		$item    = $this->box_item();
		$display = new Order_Display();
		$display->begin_email( wc_create_order(), true, false, $this->email( 'WC_Email_New_Order' ) );
		$values = $this->values( $display->format_meta( $item->get_formatted_meta_data(), $item ) );
		$display->end_email( null, true, false, null );

		$this->assertSame( array( 'Box discount' ), array_keys( $values ) );
	}

	/** Gift text is limited to the merchant's new-order email. */
	public function test_other_admin_emails_hide_gift_message() {
		$item    = $this->box_item();
		$display = new Order_Display();
		$display->begin_email( wc_create_order(), true, false, $this->email( 'WC_Email_Cancelled_Order' ) );
		$values = $this->values( $display->format_meta( $item->get_formatted_meta_data(), $item ) );
		$display->end_email( null, true, false, null );

		$this->assertArrayHasKey( 'Contents', $values );
		$this->assertArrayNotHasKey( 'Gift message', $values );
	}

	/** A box without a gift does not grow an empty gift row. */
	public function test_non_gift_box_has_no_gift_message() {
		$item    = $this->box_item( false );
		$display = new Order_Display();
		$display->begin_email( wc_create_order(), true, false, $this->email( 'WC_Email_New_Order' ) );
		$values = $this->values( $display->format_meta( $item->get_formatted_meta_data(), $item ) );
		$display->end_email( null, true, false, null );

		$this->assertArrayHasKey( 'Contents', $values );
		$this->assertArrayNotHasKey( 'Gift message', $values );
	}

	/** A WooCommerce test order renders the same privacy rules in real email templates. */
	public function test_woocommerce_email_templates_render_box_details() {
		$item  = $this->box_item();
		$order = wc_get_order( $item->get_order_id() );
		$email = $this->email( 'WC_Email_New_Order' );
		$args  = array(
			'order'         => $order,
			'sent_to_admin' => true,
			'plain_text'    => false,
			'email'         => $email,
		);
		$html  = wc_get_template_html( 'emails/email-order-details.php', $args );

		$this->assertStringContainsString( 'Smoky Earl Grey', $html );
		$this->assertStringContainsString( 'Keep this secret', $html );
		$this->assertStringNotContainsString( '<b>this</b>', $html );

		$args['sent_to_admin'] = false;
		$customer              = wc_get_template_html( 'emails/email-order-details.php', $args );
		$this->assertStringContainsString( 'Smoky Earl Grey', $customer );
		$this->assertStringNotContainsString( 'Keep this secret', $customer );

		$args['sent_to_admin'] = true;
		$args['plain_text']    = true;
		$plain                 = wc_get_template_html( 'emails/plain/email-order-details.php', $args );
		$this->assertStringContainsString( 'Smoky Earl Grey', $plain );
		$this->assertStringNotContainsString( '<br>', $plain );
	}
}
