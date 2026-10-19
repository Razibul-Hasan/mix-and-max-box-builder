<?php
/**
 * Campaign storage: post type, repository CRUD, duplicate, status and templates.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Integration;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Config;
use MixMax\BoxBuilder\Campaigns\Post_Type;
use MixMax\BoxBuilder\Campaigns\Templates;
use MixMax\BoxBuilder\Quotes;

/** Campaigns round-trip through the repository with a sanitized config. */
class CampaignRepositoryTest extends \WP_UnitTestCase {
	/**
	 * Repository under test.
	 *
	 * @var Campaign_Repository
	 */
	private $repo;

	/** Create the repository. */
	public function set_up() {
		parent::set_up();
		$this->repo = new Campaign_Repository();
	}

	/** The post type is private and mapped to the WooCommerce capability. */
	public function test_post_type_is_private_and_uses_woocommerce_capability() {
		$type = get_post_type_object( Post_Type::NAME );
		$this->assertNotNull( $type );
		$this->assertFalse( $type->public );
		$this->assertFalse( $type->show_ui );
		$this->assertFalse( $type->show_in_rest );
		$this->assertFalse( $type->rewrite );
		$this->assertSame( array( 'title' ), array_keys( get_all_post_type_supports( Post_Type::NAME ) ) );
		$this->assertSame( 'manage_woocommerce', $type->cap->edit_posts );
		$this->assertSame( 'manage_woocommerce', $type->cap->publish_posts );

		$subscriber = self::factory()->user->create( array( 'role' => 'subscriber' ) );
		$this->assertFalse( user_can( $subscriber, $type->cap->edit_posts ) );
	}

	/** A campaign starts as a draft from a template and loads back sanitized. */
	public function test_create_from_template_and_find() {
		$campaign = $this->repo->create_from_template( 'holiday' );

		$this->assertIsArray( $campaign );
		$this->assertSame( 'Holiday treat box', $campaign['title'] );
		$this->assertSame( 'draft', $campaign['post_status'] );
		$this->assertSame( 'draft', $campaign['status'] );
		$this->assertSame( 'tiered', $campaign['config']['type'] );
		$this->assertSame( array( 4, 6, 12 ), array_column( $campaign['config']['tiers'], 'qty' ) );
		$this->assertSame( $campaign, $this->repo->find( $campaign['id'] ) );
	}

	/** Every template makes a config that Config accepts unchanged. */
	public function test_templates_are_stable_under_sanitize() {
		$ids = array_column( Templates::all(), 'id' );
		$this->assertSame( array( 'blank', 'holiday', 'spa', 'snack', 'gift' ), $ids );
		foreach ( $ids as $id ) {
			$campaign = $this->repo->create_from_template( $id );
			$this->assertSame( $campaign['config'], Config::sanitize( $campaign['config'] ), $id );
		}
	}

	/** Templates can be filtered. */
	public function test_templates_filter() {
		add_filter(
			'mmbb_templates',
			static function ( $templates ) {
				$templates[] = array(
					'id'          => 'custom',
					'title'       => 'Custom',
					'type_label'  => 'Tiered mix',
					'description' => '',
					'art'         => array(),
					'config'      => array( 'box' => array( 'capacity' => 8 ) ),
				);
				return $templates;
			}
		);
		$campaign = $this->repo->create_from_template( 'custom' );
		$this->assertSame( 'Custom', $campaign['title'] );
		$this->assertSame( 8, $campaign['config']['box']['capacity'] );
	}

	/** Saving merges a partial config, sanitizes it and fires the action. */
	public function test_save_sanitizes_and_fires_action() {
		$campaign = $this->repo->create_from_template( 'blank' );
		$fired    = array();
		add_action(
			'mmbb_campaign_saved',
			static function ( $id, $config ) use ( &$fired ) {
				$fired[] = array( $id, $config );
			},
			10,
			2
		);

		$saved = $this->repo->save(
			$campaign['id'],
			array(
				'box'    => array( 'capacity' => 999 ),
				'design' => array( 'headline' => '<b>Hi</b> there' ),
			),
			'  New <i>name</i> '
		);

		$this->assertSame( 48, $saved['config']['box']['capacity'] );
		$this->assertSame( 'Hi there', $saved['config']['design']['headline'] );
		$this->assertSame( 'New name', $saved['title'] );
		$this->assertCount( 1, $fired );
		$this->assertSame( $campaign['id'], $fired[0][0] );
		$this->assertSame( $saved['config'], $fired[0][1] );

		$again = $this->repo->save( $campaign['id'], array( 'design' => array( 'columns' => 4 ) ) );
		$this->assertSame( 'Hi there', $again['config']['design']['headline'] );
		$this->assertSame( 4, $again['config']['design']['columns'] );
	}

	/** JSON with quotes and backslashes survives the meta round trip. */
	public function test_config_with_special_characters_round_trips() {
		$campaign = $this->repo->create_from_template( 'blank' );
		$saved    = $this->repo->save( $campaign['id'], array( 'design' => array( 'headline' => 'Say "hi" \\ there' ) ) );
		$this->assertSame( 'Say "hi" \\ there', $this->repo->find( $saved['id'] )['config']['design']['headline'] );
	}

	/** Saving a campaign that does not exist is an error, not a new campaign. */
	public function test_save_missing_campaign() {
		$result = $this->repo->save( 999999, array() );
		$this->assertWPError( $result );
		$this->assertSame( 'mmbb_not_found', $result->get_error_code() );
		$this->assertNull( $this->repo->find( 999999 ) );
		$this->assertNull( $this->repo->find( self::factory()->post->create() ) );
	}

	/** A copy is a separate draft without the page or container product. */
	public function test_duplicate() {
		$campaign = $this->repo->create_from_template( 'holiday' );
		$this->repo->save(
			$campaign['id'],
			array(
				'placement'            => array( 'page_id' => 77 ),
				// Ignored: only set_container_product() may set the id.
				'container_product_id' => 99,
			),
			'Winter box'
		);
		$this->assertSame( 0, $this->repo->find( $campaign['id'] )['config']['container_product_id'] );
		$this->repo->set_container_product( $campaign['id'], 88 );
		$this->assertSame( 88, $this->repo->find( $campaign['id'] )['config']['container_product_id'] );
		$this->repo->publish( $campaign['id'] );

		$copy = $this->repo->duplicate( $campaign['id'] );

		$this->assertNotSame( $campaign['id'], $copy['id'] );
		$this->assertSame( 'Winter box (copy)', $copy['title'] );
		$this->assertSame( 'draft', $copy['post_status'] );
		$this->assertSame( 0, $copy['config']['placement']['page_id'] );
		$this->assertSame( 0, $copy['config']['container_product_id'] );
		$this->assertSame( $campaign['config']['tiers'], $copy['config']['tiers'] );
		$this->assertSame( 77, $this->repo->find( $campaign['id'] )['config']['placement']['page_id'] );
	}

	/** Pause and resume use meta; publish and status follow the schedule. */
	public function test_pause_resume_and_computed_status() {
		$campaign = $this->repo->create_from_template( 'blank' );
		$this->assertSame( 'draft', $campaign['status'] );

		$this->assertSame( 'active', $this->repo->publish( $campaign['id'] )['status'] );
		$this->assertSame( 'paused', $this->repo->pause( $campaign['id'] )['status'] );
		$this->assertSame( '1', get_post_meta( $campaign['id'], Post_Type::META_PAUSED, true ) );
		$this->assertSame( 'active', $this->repo->resume( $campaign['id'] )['status'] );
		$this->assertSame( '', get_post_meta( $campaign['id'], Post_Type::META_PAUSED, true ) );

		$soon = gmdate( 'Y-m-d\TH:i:s\Z', time() + DAY_IN_SECONDS * 2 );
		$this->assertSame( 'ending_soon', $this->repo->save( $campaign['id'], array( 'schedule' => array( 'end' => $soon ) ) )['status'] );

		$past = gmdate( 'Y-m-d\TH:i:s\Z', time() - HOUR_IN_SECONDS );
		$this->assertSame( 'ended', $this->repo->save( $campaign['id'], array( 'schedule' => array( 'end' => $past ) ) )['status'] );

		$future = gmdate( 'Y-m-d\TH:i:s\Z', time() + DAY_IN_SECONDS * 3 );
		$this->assertSame( 'scheduled', $this->repo->save( $campaign['id'], array( 'schedule' => array( 'start' => $future, 'end' => null ) ) )['status'] ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing

		$this->assertSame( 'draft', $this->repo->unpublish( $campaign['id'] )['status'] );
	}

	/** Delete trashes by default and removes permanently on request. */
	public function test_delete() {
		$one = $this->repo->create_from_template( 'blank' );
		$two = $this->repo->create_from_template( 'blank' );

		$this->assertTrue( $this->repo->delete( $one['id'] ) );
		$this->assertSame( 'trash', get_post_status( $one['id'] ) );
		$this->assertNull( $this->repo->find( $one['id'] ) );

		$this->assertTrue( $this->repo->delete( $two['id'], true ) );
		$this->assertNull( get_post( $two['id'] ) );
		$this->assertFalse( $this->repo->delete( 999999 ) );
		$this->assertFalse( $this->repo->delete( self::factory()->post->create() ) );
	}

	/** Query filters, searches, sorts, paginates and counts per status. */
	public function test_query() {
		$holiday = $this->repo->create_from_template( 'holiday' );
		$spa     = $this->repo->create_from_template( 'spa' );
		$snack   = $this->repo->create_from_template( 'snack' );
		$this->repo->publish( $holiday['id'] );
		$this->repo->publish( $spa['id'] );
		$this->repo->pause( $spa['id'] );

		$all = $this->repo->query();
		$this->assertSame( 3, $all['total'] );
		$this->assertSame( 1, $all['pages'] );
		$this->assertSame(
			array(
				'all'         => 3,
				'draft'       => 1,
				'scheduled'   => 0,
				'active'      => 1,
				'ending_soon' => 0,
				'ended'       => 0,
				'paused'      => 1,
			),
			$all['counts']
		);

		$drafts = $this->repo->query( array( 'status' => 'draft' ) );
		$this->assertSame( array( $snack['id'] ), array_column( $drafts['items'], 'id' ) );
		$this->assertSame( 3, $drafts['counts']['all'] );

		$fixed = $this->repo->query( array( 'type' => 'fixed' ) );
		$this->assertSame( array( $spa['id'] ), array_column( $fixed['items'], 'id' ) );
		$this->assertSame( 1, $fixed['counts']['all'] );

		$found = $this->repo->query( array( 'search' => 'Holiday' ) );
		$this->assertSame( array( $holiday['id'] ), array_column( $found['items'], 'id' ) );

		$by_title = $this->repo->query( array( 'orderby' => 'title', 'order' => 'ASC' ) ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
		$this->assertSame( array( 'Build-a-spa kit', 'Holiday treat box', 'Snack pack' ), array_column( $by_title['items'], 'title' ) );

		$page_two = $this->repo->query( array( 'orderby' => 'title', 'order' => 'ASC', 'per_page' => 2, 'page' => 2 ) ); // phpcs:ignore WordPress.Arrays.ArrayDeclarationSpacing
		$this->assertSame( array( 'Snack pack' ), array_column( $page_two['items'], 'title' ) );
		$this->assertSame( 2, $page_two['pages'] );
		$this->assertSame( 3, $page_two['total'] );
	}

	/** Trashed campaigns are left out of lists. */
	public function test_query_excludes_trash() {
		$one = $this->repo->create_from_template( 'blank' );
		$this->repo->create_from_template( 'blank' );
		$this->repo->delete( $one['id'] );
		$this->assertSame( 1, $this->repo->query()['total'] );
	}

	/** Defaults are filterable and re-sanitized. */
	public function test_defaults_filter() {
		add_filter(
			'mmbb_campaign_config_defaults',
			static function ( $defaults ) {
				$defaults['box']['capacity']  = 8;
				$defaults['box']['min_items'] = 500;
				return $defaults;
			}
		);
		$config = Campaign_Repository::defaults();
		$this->assertSame( 8, $config['box']['capacity'] );
		$this->assertSame( 8, $config['box']['min_items'] );
		$this->assertSame( 8, $this->repo->create_from_template( 'blank' )['config']['box']['capacity'] );
	}

	/** The pricing filter can change a quote, and decimals default to the store's. */
	public function test_pricing_quote_filter() {
		$config = Config::sanitize(
			array(
				'tiers' => array(
					array(
						'qty'           => 2,
						'discount_type' => 'fixed_amount',
						'value'         => 1,
					),
				),
			)
		);
		$items  = array(
			array(
				'product_id'       => 1,
				'variation_id'     => 0,
				'qty'              => 2,
				'unit_price_minor' => 500,
			),
		);

		$quote = Quotes::quote( $config, $items );
		$this->assertSame( 100, $quote['discount'] );

		add_filter(
			'mmbb_pricing_quote',
			static function ( $quote ) {
				$quote['discount'] = 0;
				return $quote;
			}
		);
		$this->assertSame( 0, Quotes::quote( $config, $items )['discount'] );
	}
}
