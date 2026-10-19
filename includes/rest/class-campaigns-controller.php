<?php
/**
 * REST routes for campaigns.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Rest;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Campaigns\Campaign_Repository;
use MixMax\BoxBuilder\Campaigns\Config;
use MixMax\BoxBuilder\Campaigns\Publisher;
use MixMax\BoxBuilder\Campaigns\Status;
use MixMax\BoxBuilder\Campaigns\Templates;

/** List, create, edit, duplicate, publish, preview and bulk-edit campaigns. */
final class Campaigns_Controller extends Base_Controller {
	const BULK_ACTIONS = array( 'pause', 'resume', 'duplicate', 'delete' );
	const PLACEMENTS   = array( 'new_page', 'existing_page', 'none' );
	const MAX_BULK     = 100;

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'campaigns';

	/**
	 * Campaign storage.
	 *
	 * @var Campaign_Repository
	 */
	private $repo;

	/** Create the controller. */
	public function __construct() {
		$this->repo = new Campaign_Repository();
	}

	/** Register routes. */
	public function register_routes() {
		$permission = array( $this, 'permissions_check' );
		$schema     = array( $this, 'get_public_item_schema' );
		$id_arg     = array(
			'id' => array(
				'description' => __( 'Campaign ID.', 'mix-and-max-box-builder' ),
				'type'        => 'integer',
				'minimum'     => 1,
			),
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => $permission,
					'args'                => $this->get_collection_params(),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => $permission,
					'args'                => array(
						'template' => array(
							'description'       => __( 'Template to start from.', 'mix-and-max-box-builder' ),
							'type'              => 'string',
							'default'           => 'blank',
							'sanitize_callback' => 'sanitize_key',
							'validate_callback' => array( $this, 'validate_template' ),
						),
						'title'    => $this->title_arg(),
					),
				),
				'schema' => $schema,
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/bulk',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'bulk' ),
					'permission_callback' => $permission,
					'args'                => array(
						'action' => array(
							'description' => __( 'What to do with the campaigns.', 'mix-and-max-box-builder' ),
							'type'        => 'string',
							'enum'        => self::BULK_ACTIONS,
							'required'    => true,
						),
						'ids'    => array(
							'description' => __( 'Campaign IDs.', 'mix-and-max-box-builder' ),
							'type'        => 'array',
							'items'       => array(
								'type'    => 'integer',
								'minimum' => 1,
							),
							'minItems'    => 1,
							'maxItems'    => self::MAX_BULK,
							'uniqueItems' => true,
							'required'    => true,
						),
					),
				),
				'schema' => array( $this, 'get_bulk_schema' ),
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>\d+)',
			array(
				'args'   => $id_arg,
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => $permission,
				),
				array(
					'methods'             => 'PUT',
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => $permission,
					'args'                => array(
						'title'  => $this->title_arg(),
						'config' => $this->config_arg( true ),
					),
				),
				array(
					'methods'             => 'PATCH',
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => $permission,
					'args'                => array(
						'title'  => $this->title_arg(),
						'config' => $this->config_arg( false ),
					),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_item' ),
					'permission_callback' => $permission,
				),
				'schema' => $schema,
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>\d+)/duplicate',
			array(
				'args'   => $id_arg,
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'duplicate_item' ),
					'permission_callback' => $permission,
				),
				'schema' => $schema,
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>\d+)/publish',
			array(
				'args'   => $id_arg,
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'publish_item' ),
					'permission_callback' => $permission,
					'args'                => array(
						'placement'  => array(
							'description' => __( 'Where to place the builder.', 'mix-and-max-box-builder' ),
							'type'        => 'string',
							'enum'        => self::PLACEMENTS,
							'required'    => true,
						),
						'page_id'    => array(
							'description' => __( 'Existing page to add the builder to.', 'mix-and-max-box-builder' ),
							'type'        => 'integer',
							'minimum'     => 0,
							'default'     => 0,
						),
						'page_title' => array(
							'description'       => __( 'Title of the new page.', 'mix-and-max-box-builder' ),
							'type'              => 'string',
							'maxLength'         => 200,
							'default'           => '',
							'sanitize_callback' => 'sanitize_text_field',
						),
						'page_slug'  => array(
							'description'       => __( 'Address of the new page.', 'mix-and-max-box-builder' ),
							'type'              => 'string',
							'maxLength'         => 200,
							'default'           => '',
							'sanitize_callback' => 'sanitize_title',
						),
					),
				),
				'schema' => $schema,
			)
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>\d+)/preview',
			array(
				'args'   => $id_arg,
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'preview_item' ),
					'permission_callback' => $permission,
				),
				'schema' => array( $this, 'get_preview_schema' ),
			)
		);
	}

	/**
	 * Query args for the list.
	 *
	 * @return array
	 */
	public function get_collection_params() {
		return array_merge(
			array(
				'status'  => array(
					'description' => __( 'Computed status to show. "live" is active plus ending soon.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'enum'        => array_merge( array( 'all', 'live' ), Status::all() ),
					'default'     => 'all',
				),
				'search'  => array(
					'description'       => __( 'Search campaign names.', 'mix-and-max-box-builder' ),
					'type'              => 'string',
					'maxLength'         => 200,
					'default'           => '',
					'sanitize_callback' => 'sanitize_text_field',
				),
				'type'    => array(
					'description' => __( 'Campaign type.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'enum'        => array_merge( array( '' ), Config::TYPES ),
					'default'     => '',
				),
				'orderby' => array(
					'description' => __( 'Sort by.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'enum'        => array( 'date', 'title', 'modified', 'revenue', 'conversion' ),
					'default'     => 'date',
				),
				'order'   => array(
					'description' => __( 'Sort direction.', 'mix-and-max-box-builder' ),
					'type'        => 'string',
					'enum'        => array( 'asc', 'desc' ),
					'default'     => 'desc',
				),
			),
			$this->paging_args( 20, 50 )
		);
	}

	/**
	 * List campaigns with per-status counts for the tabs.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function get_items( $request ) {
		$orderby = $request['orderby'];
		// Revenue and conversion come from analytics (Phase 9); until then they sort by date.
		if ( in_array( $orderby, array( 'revenue', 'conversion' ), true ) ) {
			$orderby = 'date';
		}

		$result = $this->repo->query(
			array(
				'status'   => $request['status'],
				'search'   => $request['search'],
				'type'     => $request['type'],
				'orderby'  => $orderby,
				'order'    => $request['order'],
				'page'     => $request['page'],
				'per_page' => $request['per_page'],
			)
		);

		$items = array();
		foreach ( $result['items'] as $campaign ) {
			$items[] = $this->prepare_campaign( $campaign );
		}

		$response = rest_ensure_response(
			array(
				'items'  => $items,
				'total'  => $result['total'],
				'pages'  => $result['pages'],
				'counts' => $result['counts'],
			)
		);
		return $this->with_paging( $response, $result['total'], $result['pages'] );
	}

	/**
	 * Create a draft from a template.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function create_item( $request ) {
		$campaign = $this->repo->create_from_template( $request['template'], $request['title'] );
		if ( is_wp_error( $campaign ) ) {
			return $campaign;
		}
		$response = rest_ensure_response( $this->prepare_campaign( $campaign ) );
		$response->set_status( 201 );
		return $response;
	}

	/**
	 * Get one campaign.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_item( $request ) {
		$campaign = $this->find( $request );
		if ( is_wp_error( $campaign ) ) {
			return $campaign;
		}
		return rest_ensure_response( $this->prepare_campaign( $campaign ) );
	}

	/**
	 * Replace (PUT) or merge (PATCH, for autosave) a campaign's config and title.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_item( $request ) {
		$campaign = $this->find( $request );
		if ( is_wp_error( $campaign ) ) {
			return $campaign;
		}

		$config = $request['config'];
		$saved  = $this->repo->save(
			$campaign['id'],
			is_array( $config ) ? $config : array(),
			$request->has_param( 'title' ) ? $request['title'] : null,
			'PUT' === $request->get_method()
		);
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}
		return rest_ensure_response( $this->prepare_campaign( $saved ) );
	}

	/**
	 * Move a campaign, and its container product, to the trash.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_item( $request ) {
		$campaign = $this->find( $request );
		if ( is_wp_error( $campaign ) ) {
			return $campaign;
		}
		$previous = $this->prepare_campaign( $campaign );
		if ( ! $this->repo->delete( $campaign['id'] ) ) {
			return $this->error( 'mmbb_delete_failed', __( 'The campaign could not be deleted.', 'mix-and-max-box-builder' ), 500 );
		}
		return rest_ensure_response(
			array(
				'deleted'  => true,
				'previous' => $previous,
			)
		);
	}

	/**
	 * Copy a campaign as a new draft.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function duplicate_item( $request ) {
		$campaign = $this->find( $request );
		if ( is_wp_error( $campaign ) ) {
			return $campaign;
		}
		$copy = $this->repo->duplicate( $campaign['id'] );
		if ( is_wp_error( $copy ) ) {
			return $copy;
		}
		$response = rest_ensure_response( $this->prepare_campaign( $copy ) );
		$response->set_status( 201 );
		return $response;
	}

	/**
	 * Go live: validate, place the builder on a page, create the container product
	 * (through the `mmbb_ensure_container_product` filter) and publish.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function publish_item( $request ) {
		$campaign = $this->find( $request );
		if ( is_wp_error( $campaign ) ) {
			return $campaign;
		}

		$placement = $request['placement'];
		if ( 'existing_page' === $placement ) {
			$page = get_post( (int) $request['page_id'] );
			if ( ! $page || 'page' !== $page->post_type || 'trash' === $page->post_status ) {
				return $this->error( 'mmbb_invalid_page', __( 'Choose an existing page for the builder.', 'mix-and-max-box-builder' ), 400 );
			}
		} elseif ( 'new_page' === $placement && '' === trim( (string) $request['page_title'] ) ) {
			return $this->error( 'mmbb_page_title_required', __( 'Give the new page a title.', 'mix-and-max-box-builder' ), 400 );
		}

		$errors = Config::validate( $campaign['config'] );
		if ( ! empty( $errors ) ) {
			return $this->error(
				'mmbb_invalid_config',
				__( 'Fix these before going live.', 'mix-and-max-box-builder' ),
				422,
				array( 'errors' => Config_Messages::describe( $errors ) )
			);
		}

		$published = ( new Publisher( $this->repo ) )->publish(
			$campaign['id'],
			array(
				'placement'  => $placement,
				'page_id'    => (int) $request['page_id'],
				'page_title' => $request['page_title'],
				'page_slug'  => $request['page_slug'],
			)
		);
		if ( is_wp_error( $published ) ) {
			return $published;
		}
		return rest_ensure_response( $this->prepare_campaign( $published ) );
	}

	/**
	 * The storefront payload for the wizard preview and the block editor.
	 * Phase 8 adds the resolved products and storefront settings.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function preview_item( $request ) {
		$campaign = $this->find( $request );
		if ( is_wp_error( $campaign ) ) {
			return $campaign;
		}
		$config = $campaign['config'];
		return rest_ensure_response(
			array(
				'id'       => $campaign['id'],
				'title'    => $campaign['title'],
				'status'   => $campaign['status'],
				'config'   => array(
					'type'     => $config['type'],
					'box'      => $config['box'],
					'tiers'    => $config['tiers'],
					'sizes'    => $config['sizes'],
					'bundle'   => $config['bundle'],
					'extras'   => $config['extras'],
					'design'   => $config['design'],
					'schedule' => array(
						'end'            => $config['schedule']['end'],
						'countdown_days' => $config['schedule']['countdown_days'],
					),
				),
				'products' => array(),
			)
		);
	}

	/**
	 * Apply one action to several campaigns. Each id gets its own result.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function bulk( $request ) {
		$action  = $request['action'];
		$results = array();

		foreach ( array_unique( array_map( 'absint', (array) $request['ids'] ) ) as $id ) {
			if ( ! $this->repo->find( $id ) ) {
				$results[] = $this->bulk_result( $id, new \WP_Error( 'mmbb_not_found', __( 'Campaign not found.', 'mix-and-max-box-builder' ) ) );
				continue;
			}
			if ( 'delete' === $action ) {
				$outcome = $this->repo->delete( $id )
					? true
					: new \WP_Error( 'mmbb_delete_failed', __( 'The campaign could not be deleted.', 'mix-and-max-box-builder' ) );
			} else {
				$outcome = $this->repo->$action( $id );
			}
			$results[] = $this->bulk_result( $id, $outcome );
		}

		return rest_ensure_response(
			array(
				'action'  => $action,
				'results' => $results,
			)
		);
	}

	/**
	 * Check a template id exists.
	 *
	 * @param mixed $value Template id.
	 * @return true|\WP_Error
	 */
	public function validate_template( $value ) {
		if ( is_string( $value ) && null !== Templates::get( sanitize_key( $value ) ) ) {
			return true;
		}
		return $this->error( 'mmbb_invalid_template', __( 'That template does not exist.', 'mix-and-max-box-builder' ), 400 );
	}

	/**
	 * Campaign item schema.
	 *
	 * @return array
	 */
	public function get_item_schema() {
		if ( $this->schema ) {
			return $this->add_additional_fields_schema( $this->schema );
		}

		$this->schema = array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'mmbb-campaign',
			'type'       => 'object',
			'properties' => self::campaign_properties(),
		);
		return $this->add_additional_fields_schema( $this->schema );
	}

	/**
	 * Bulk response schema.
	 *
	 * @return array
	 */
	public function get_bulk_schema() {
		return array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'mmbb-campaign-bulk',
			'type'       => 'object',
			'properties' => array(
				'action'  => array(
					'type' => 'string',
					'enum' => self::BULK_ACTIONS,
				),
				'results' => array(
					'type'  => 'array',
					'items' => array(
						'type'       => 'object',
						'properties' => array(
							'id'       => array( 'type' => 'integer' ),
							'ok'       => array( 'type' => 'boolean' ),
							'code'     => array( 'type' => array( 'string', 'null' ) ),
							'message'  => array( 'type' => array( 'string', 'null' ) ),
							'campaign' => array( 'type' => array( 'object', 'null' ) ),
						),
					),
				),
			),
		);
	}

	/**
	 * Preview response schema.
	 *
	 * @return array
	 */
	public function get_preview_schema() {
		return array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'mmbb-campaign-preview',
			'type'       => 'object',
			'properties' => array(
				'id'       => array( 'type' => 'integer' ),
				'title'    => array( 'type' => 'string' ),
				'status'   => array(
					'type' => 'string',
					'enum' => Status::all(),
				),
				'config'   => array( 'type' => 'object' ),
				'products' => array(
					'type'  => 'array',
					'items' => array( 'type' => 'object' ),
				),
			),
		);
	}

	/**
	 * Properties of one campaign in a response.
	 *
	 * @return array
	 */
	private static function campaign_properties() {
		return array(
			'id'          => array(
				'description' => __( 'Campaign ID.', 'mix-and-max-box-builder' ),
				'type'        => 'integer',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
			'title'       => array(
				'description' => __( 'Campaign name.', 'mix-and-max-box-builder' ),
				'type'        => 'string',
				'context'     => array( 'view', 'edit' ),
			),
			'status'      => array(
				'description' => __( 'Computed status.', 'mix-and-max-box-builder' ),
				'type'        => 'string',
				'enum'        => Status::all(),
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
			'post_status' => array(
				'description' => __( 'Stored post status.', 'mix-and-max-box-builder' ),
				'type'        => 'string',
				'enum'        => array( 'draft', 'publish' ),
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
			'paused'      => array(
				'description' => __( 'Whether the campaign is paused.', 'mix-and-max-box-builder' ),
				'type'        => 'boolean',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
			'type'        => array(
				'description' => __( 'Campaign type.', 'mix-and-max-box-builder' ),
				'type'        => 'string',
				'enum'        => Config::TYPES,
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
			'config'      => array(
				'description' => __( 'Sanitized campaign config.', 'mix-and-max-box-builder' ),
				'type'        => 'object',
				'context'     => array( 'view', 'edit' ),
			),
			'placement'   => array(
				'description' => __( 'Where the builder is placed.', 'mix-and-max-box-builder' ),
				'type'        => 'object',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
				'properties'  => array(
					'page_id'    => array( 'type' => 'integer' ),
					'page_title' => array( 'type' => 'string' ),
					'page_url'   => array( 'type' => 'string' ),
					'method'     => array(
						'type' => 'string',
						'enum' => array( 'block', 'shortcode', 'none' ),
					),
					'shortcode'  => array( 'type' => 'string' ),
				),
			),
			'stats'       => array(
				'description' => __( 'Sales figures. Filled by analytics.', 'mix-and-max-box-builder' ),
				'type'        => 'object',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
				'properties'  => array(
					'boxes_sold' => array( 'type' => 'integer' ),
					'revenue'    => array( 'type' => 'integer' ),
					'conversion' => array( 'type' => 'number' ),
				),
			),
			'edit_url'    => array(
				'description' => __( 'Campaign editor address.', 'mix-and-max-box-builder' ),
				'type'        => 'string',
				'format'      => 'uri',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
			'created'     => array(
				'description' => __( 'Created, UTC.', 'mix-and-max-box-builder' ),
				'type'        => 'string',
				'format'      => 'date-time',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
			'modified'    => array(
				'description' => __( 'Last saved, UTC.', 'mix-and-max-box-builder' ),
				'type'        => 'string',
				'format'      => 'date-time',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
		);
	}

	/**
	 * Load the campaign named in the URL.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return array|\WP_Error
	 */
	private function find( $request ) {
		$campaign = $this->repo->find( (int) $request['id'] );
		if ( ! $campaign ) {
			return $this->error( 'mmbb_not_found', __( 'Campaign not found.', 'mix-and-max-box-builder' ), 404 );
		}
		return $campaign;
	}

	/**
	 * Shape a campaign for a response.
	 *
	 * @param array $campaign Campaign from the repository.
	 * @return array
	 */
	private function prepare_campaign( array $campaign ) {
		return array(
			'id'          => $campaign['id'],
			'title'       => $campaign['title'],
			'status'      => $campaign['status'],
			'post_status' => $campaign['post_status'],
			'paused'      => $campaign['paused'],
			'type'        => $campaign['config']['type'],
			'config'      => $campaign['config'],
			'placement'   => $this->placement( $campaign ),
			// Phase 9 fills these from the daily stats table.
			'stats'       => array(
				'boxes_sold' => 0,
				'revenue'    => 0,
				'conversion' => 0,
			),
			'edit_url'    => admin_url( 'admin.php?page=mmbb-campaigns&action=edit&id=' . $campaign['id'] ),
			'created'     => $campaign['created'],
			'modified'    => $campaign['modified'],
		);
	}

	/**
	 * Describe where the builder is placed.
	 *
	 * @param array $campaign Campaign.
	 * @return array
	 */
	private function placement( array $campaign ) {
		$out  = array(
			'page_id'    => 0,
			'page_title' => '',
			'page_url'   => '',
			'method'     => 'none',
			'shortcode'  => sprintf( '[mmbb_box id="%d"]', $campaign['id'] ),
		);
		$page = get_post( $campaign['config']['placement']['page_id'] );
		if ( ! $page || 'trash' === $page->post_status ) {
			return $out;
		}

		$out['page_id']    = (int) $page->ID;
		$out['page_title'] = $page->post_title;
		$out['page_url']   = (string) get_permalink( $page );
		if ( has_block( 'mmbb/box-builder', $page ) ) {
			$out['method'] = 'block';
		} elseif ( has_shortcode( $page->post_content, 'mmbb_box' ) ) {
			$out['method'] = 'shortcode';
		}
		return $out;
	}

	/**
	 * One row of a bulk result.
	 *
	 * @param int                  $id      Campaign id.
	 * @param array|bool|\WP_Error $outcome Result of the action.
	 * @return array
	 */
	private function bulk_result( $id, $outcome ) {
		if ( is_wp_error( $outcome ) ) {
			return array(
				'id'       => $id,
				'ok'       => false,
				'code'     => $outcome->get_error_code(),
				'message'  => $outcome->get_error_message(),
				'campaign' => null,
			);
		}
		return array(
			'id'       => $id,
			'ok'       => true,
			'code'     => null,
			'message'  => null,
			'campaign' => is_array( $outcome ) ? $this->prepare_campaign( $outcome ) : null,
		);
	}

	/**
	 * The `title` argument.
	 *
	 * @return array
	 */
	private function title_arg() {
		return array(
			'description'       => __( 'Campaign name.', 'mix-and-max-box-builder' ),
			'type'              => 'string',
			'maxLength'         => 200,
			'sanitize_callback' => 'sanitize_text_field',
		);
	}

	/**
	 * The `config` argument. Its fields are sanitized by Config, which clamps
	 * every value; the REST layer only checks the shape is an object.
	 *
	 * @param bool $required Whether the config must be sent.
	 * @return array
	 */
	private function config_arg( $required ) {
		return array(
			'description'          => __( 'Campaign config. PATCH merges a partial config; PUT replaces it.', 'mix-and-max-box-builder' ),
			'type'                 => 'object',
			'required'             => $required,
			'additionalProperties' => true,
			'properties'           => array(
				'type' => array(
					'type' => 'string',
					'enum' => Config::TYPES,
				),
			),
		);
	}
}
