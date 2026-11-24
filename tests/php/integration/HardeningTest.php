<?php
/**
 * Upgrade locking, the shared placement search and the container product's page.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Page_Content;
use MixMax\BoxBuilder\Campaigns\Placement;
use MixMax\BoxBuilder\Cart\Container_Products;
use MixMax\BoxBuilder\Installer;

/** Behaviour that keeps busy stores safe. */
class HardeningTest extends \WP_UnitTestCase {
	/** Install the schema. */
	public function set_up() {
		parent::set_up();
		Installer::install();
	}

	/**
	 * Write the upgrade lock row as another request would.
	 *
	 * @param int $since When the lock was taken.
	 */
	private function hold_lock( $since ) {
		global $wpdb;
		$wpdb->replace( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- Fixture lock row.
			$wpdb->options,
			array(
				'option_name'  => Installer::LOCK_OPTION,
				'option_value' => (string) $since,
				'autoload'     => 'off',
			)
		);
	}

	/** A running upgrade blocks a second one; a lock left by a dead request is taken over and released. */
	public function test_upgrade_runs_once_at_a_time() {
		global $wpdb;
		update_option( 'mmbb_version', '0', false );

		$this->hold_lock( time() );
		Installer::maybe_upgrade();
		$this->assertSame( '0', get_option( 'mmbb_version' ), 'Another request holds the lock.' );

		$this->hold_lock( time() - HOUR_IN_SECONDS );
		Installer::maybe_upgrade();
		$this->assertSame( MMBB_VERSION, get_option( 'mmbb_version' ), 'A stale lock is taken over.' );
		$this->assertNull( $wpdb->get_var( $wpdb->prepare( 'SELECT option_value FROM %i WHERE option_name = %s', $wpdb->options, Installer::LOCK_OPTION ) ), 'The lock is released.' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Reads the lock row.
	}

	/** The placement search is shared within a request and forgotten when a post changes. */
	public function test_placement_search_is_shared_and_refreshed() {
		$repo     = new Campaign_Repository();
		$campaign = $repo->create_from_template( 'blank', 'Placed box' );
		// A page being viewed (the cart, say) must not count as the box's page.
		$GLOBALS['post'] = get_post( self::factory()->post->create( array( 'post_type' => 'page' ) ) ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Simulates the page being viewed.
		$this->assertNull( Placement::page( $campaign ) );
		unset( $GLOBALS['post'] );

		$page_id = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_content' => Page_Content::block( $campaign['id'] ),
			)
		);
		$found   = Placement::page( $campaign );
		$this->assertSame( $page_id, $found ? (int) $found->ID : 0, 'Creating a page clears the shared search.' );
	}

	/** A container product's page leads to the box's page, or to a 404 when the box has none. */
	public function test_container_product_page_leads_to_the_box() {
		$repo     = new Campaign_Repository();
		$campaign = $repo->create_from_template( 'blank', 'Boxed' );
		$product  = Container_Products::ensure( $campaign['id'] );
		$this->assertGreaterThan( 0, $product );
		$this->assertSame( '', Container_Products::product_page_target( $product ), 'No page yet: 404.' );

		$page_id = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_content' => Page_Content::block( $campaign['id'] ),
			)
		);
		$this->assertSame( get_permalink( $page_id ), Container_Products::product_page_target( $product ) );

		$plain = new \WC_Product_Simple();
		$plain->set_name( 'Plain' );
		$this->assertNull( Container_Products::product_page_target( $plain->save() ), 'Other products are left alone.' );
	}
}
