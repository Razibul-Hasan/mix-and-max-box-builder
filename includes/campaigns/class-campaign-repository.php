<?php
/**
 * Read and write campaigns.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Campaigns;

defined( 'ABSPATH' ) || exit;

/** The only place that touches campaign posts and their meta. */
final class Campaign_Repository {
	/**
	 * Default config, filterable with `mmbb_campaign_config_defaults`.
	 *
	 * @return array
	 */
	public static function defaults() {
		/**
		 * Filter the config a blank campaign starts from.
		 *
		 * @param array $defaults Default config.
		 */
		$defaults = apply_filters( 'mmbb_campaign_config_defaults', Config::defaults() );
		return Config::sanitize( is_array( $defaults ) ? $defaults : array() );
	}

	/**
	 * Load one campaign.
	 *
	 * @param int $id Campaign id.
	 * @return array|null { id, title, post_status, paused, status, config, created, modified }.
	 */
	public function find( $id ) {
		$post = get_post( absint( $id ) );
		if ( ! $post || Post_Type::NAME !== $post->post_type || 'trash' === $post->post_status ) {
			return null;
		}
		return $this->hydrate( $post );
	}

	/**
	 * List campaigns.
	 *
	 * The computed status and type live outside SQL, so every campaign is loaded
	 * and filtered here. Stores have a handful of campaigns, not thousands.
	 *
	 * @param array $args { status, search, type, orderby, order, page, per_page }. `status` may be `live` (active or ending soon).
	 * @return array { items, total, pages, counts }. `counts` ignores the status filter.
	 */
	public function query( array $args = array() ) {
		$args = wp_parse_args(
			$args,
			array(
				'status'   => '',
				'search'   => '',
				'type'     => '',
				'orderby'  => 'date',
				'order'    => 'DESC',
				'page'     => 1,
				'per_page' => 20,
			)
		);

		$orderby  = in_array( $args['orderby'], array( 'date', 'title', 'modified' ), true ) ? $args['orderby'] : 'date';
		$order    = 'ASC' === strtoupper( (string) $args['order'] ) ? 'ASC' : 'DESC';
		$per_page = max( 1, min( 50, absint( $args['per_page'] ) ) );
		$page     = max( 1, absint( $args['page'] ) );

		$query_args = array(
			'post_type'              => Post_Type::NAME,
			'post_status'            => array( 'draft', 'publish' ),
			'posts_per_page'         => -1,
			'orderby'                => $orderby,
			'order'                  => $order,
			'no_found_rows'          => true,
			'update_post_term_cache' => false,
		);
		if ( '' !== (string) $args['search'] ) {
			$query_args['s'] = (string) $args['search'];
		}

		$matching = array();
		foreach ( get_posts( $query_args ) as $post ) {
			$campaign = $this->hydrate( $post );
			if ( '' !== (string) $args['type'] && $campaign['config']['type'] !== $args['type'] ) {
				continue;
			}
			$matching[] = $campaign;
		}

		$counts = array( 'all' => count( $matching ) );
		foreach ( Status::all() as $status ) {
			$counts[ $status ] = 0;
		}
		$counts['live'] = 0;
		foreach ( $matching as $campaign ) {
			++$counts[ $campaign['status'] ];
			if ( Status::is_live( $campaign['status'] ) ) {
				++$counts['live'];
			}
		}

		if ( '' !== (string) $args['status'] && 'all' !== $args['status'] ) {
			$matching = array_values(
				array_filter(
					$matching,
					static function ( $campaign ) use ( $args ) {
						if ( 'live' === $args['status'] ) {
							return Status::is_live( $campaign['status'] );
						}
						return $campaign['status'] === $args['status'];
					}
				)
			);
		}

		$total = count( $matching );
		return array(
			'items'  => array_slice( $matching, ( $page - 1 ) * $per_page, $per_page ),
			'total'  => $total,
			'pages'  => (int) ceil( $total / $per_page ),
			'counts' => $counts,
		);
	}

	/**
	 * Create a draft campaign from a template.
	 *
	 * @param string      $template_id Template id; unknown ids behave as the blank template.
	 * @param string|null $title       Campaign name. Defaults to the template's title.
	 * @return array|\WP_Error The new campaign.
	 */
	public function create_from_template( $template_id, $title = null ) {
		$template = Templates::get( (string) $template_id );
		$config   = Config::sanitize( $template && isset( $template['config'] ) ? $template['config'] : array(), self::defaults() );

		if ( null === $title || '' === trim( (string) $title ) ) {
			$title = $template && 'blank' !== $template['id']
				? $template['title']
				: __( 'Untitled campaign', 'mix-and-max-box-builder' );
		}

		$id = wp_insert_post(
			array(
				'post_type'   => Post_Type::NAME,
				'post_status' => 'draft',
				'post_title'  => sanitize_text_field( (string) $title ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$this->write_config( $id, $config );
		/** This action is documented in Campaign_Repository::save(). */
		do_action( 'mmbb_campaign_saved', $id, $config );
		return $this->find( $id );
	}

	/**
	 * Save a (possibly partial) config and optionally the title.
	 *
	 * @param int         $id      Campaign id.
	 * @param array       $input   Raw config, merged onto the saved one.
	 * @param string|null $title   New title, or null to keep it.
	 * @param bool        $replace Replace the config (onto the defaults) instead of merging.
	 *                             The server-owned container product id is always kept.
	 * @return array|\WP_Error The saved campaign, with the sanitized config.
	 */
	public function save( $id, array $input, $title = null, $replace = false ) {
		$current = $this->find( $id );
		if ( ! $current ) {
			return new \WP_Error( 'mmbb_not_found', __( 'Campaign not found.', 'mix-and-max-box-builder' ), array( 'status' => 404 ) );
		}

		$config                         = Config::sanitize( $input, $replace ? self::defaults() : $current['config'] );
		$config['container_product_id'] = $current['config']['container_product_id'];

		if ( null !== $title ) {
			$result = wp_update_post(
				array(
					'ID'         => $current['id'],
					'post_title' => sanitize_text_field( (string) $title ),
				),
				true
			);
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}

		$this->write_config( $current['id'], $config );

		/**
		 * Fires after a campaign's config is saved.
		 *
		 * @param int   $id     Campaign id.
		 * @param array $config The sanitized config that was saved.
		 */
		do_action( 'mmbb_campaign_saved', $current['id'], $config );
		return $this->find( $current['id'] );
	}

	/**
	 * Record the campaign's container product. Only server code calls this;
	 * save() never takes the id from input.
	 *
	 * @param int $id         Campaign id.
	 * @param int $product_id Container product id, or 0 to clear it.
	 * @return array|\WP_Error
	 */
	public function set_container_product( $id, $product_id ) {
		$current = $this->find( $id );
		if ( ! $current ) {
			return new \WP_Error( 'mmbb_not_found', __( 'Campaign not found.', 'mix-and-max-box-builder' ), array( 'status' => 404 ) );
		}
		$config                         = $current['config'];
		$config['container_product_id'] = max( 0, (int) $product_id );
		$this->write_config( $current['id'], $config );
		/** This action is documented in Campaign_Repository::save(). */
		do_action( 'mmbb_campaign_saved', $current['id'], $config );
		return $this->find( $current['id'] );
	}

	/**
	 * Publish a campaign (set it live). Validation is the caller's job.
	 *
	 * @param int $id Campaign id.
	 * @return array|\WP_Error
	 */
	public function publish( $id ) {
		return $this->set_post_status( $id, 'publish' );
	}

	/**
	 * Move a campaign back to draft.
	 *
	 * @param int $id Campaign id.
	 * @return array|\WP_Error
	 */
	public function unpublish( $id ) {
		return $this->set_post_status( $id, 'draft' );
	}

	/**
	 * Copy a campaign as a new draft.
	 *
	 * @param int $id Campaign id.
	 * @return array|\WP_Error The copy.
	 */
	public function duplicate( $id ) {
		$source = $this->find( $id );
		if ( ! $source ) {
			return new \WP_Error( 'mmbb_not_found', __( 'Campaign not found.', 'mix-and-max-box-builder' ), array( 'status' => 404 ) );
		}

		$config                         = $source['config'];
		$config['container_product_id'] = 0;
		$config['placement']['page_id'] = 0;

		$new_id = wp_insert_post(
			array(
				'post_type'   => Post_Type::NAME,
				'post_status' => 'draft',
				/* translators: %s: campaign name */
				'post_title'  => sprintf( __( '%s (copy)', 'mix-and-max-box-builder' ), $source['title'] ),
			),
			true
		);
		if ( is_wp_error( $new_id ) ) {
			return $new_id;
		}

		$this->write_config( $new_id, $config );
		/** This action is documented in Campaign_Repository::save(). */
		do_action( 'mmbb_campaign_saved', $new_id, $config );
		return $this->find( $new_id );
	}

	/**
	 * Pause a campaign.
	 *
	 * @param int $id Campaign id.
	 * @return array|\WP_Error
	 */
	public function pause( $id ) {
		return $this->set_paused( $id, true );
	}

	/**
	 * Resume a paused campaign.
	 *
	 * @param int $id Campaign id.
	 * @return array|\WP_Error
	 */
	public function resume( $id ) {
		return $this->set_paused( $id, false );
	}

	/**
	 * Delete a campaign. By default it goes to the trash, and so does its
	 * container product (only a product carrying this campaign's marker).
	 *
	 * @param int  $id    Campaign id.
	 * @param bool $force Delete permanently. The container product is still only trashed.
	 * @return bool
	 */
	public function delete( $id, $force = false ) {
		$post = get_post( absint( $id ) );
		if ( ! $post || Post_Type::NAME !== $post->post_type ) {
			return false;
		}

		$config     = Config::sanitize( $this->read_config( $post->ID ), self::defaults() );
		$product_id = $config['container_product_id'];
		if ( $product_id > 0 && 'product' === get_post_type( $product_id ) && (int) get_post_meta( $product_id, '_mmbb_campaign_id', true ) === (int) $post->ID ) {
			wp_trash_post( $product_id );
		}

		$result = $force ? wp_delete_post( $post->ID, true ) : wp_trash_post( $post->ID );
		return (bool) $result;
	}

	/**
	 * Shape a post as a campaign.
	 *
	 * @param \WP_Post $post Campaign post.
	 * @return array
	 */
	private function hydrate( \WP_Post $post ) {
		$config = Config::sanitize( $this->read_config( $post->ID ), self::defaults() );
		$paused = (bool) get_post_meta( $post->ID, Post_Type::META_PAUSED, true );

		return array(
			'id'          => (int) $post->ID,
			'title'       => $post->post_title,
			'post_status' => $post->post_status,
			'paused'      => $paused,
			'status'      => Status::compute(
				$post->post_status,
				$paused,
				$config['schedule']['start'],
				$config['schedule']['end'],
				time(),
				wp_timezone()
			),
			'config'      => $config,
			'created'     => get_post_time( 'c', true, $post ),
			'modified'    => get_post_modified_time( 'c', true, $post ),
		);
	}

	/**
	 * Decode the stored JSON config.
	 *
	 * @param int $id Campaign id.
	 * @return array
	 */
	private function read_config( $id ) {
		$raw     = get_post_meta( $id, Post_Type::META_CONFIG, true );
		$decoded = is_string( $raw ) ? json_decode( $raw, true ) : null;
		return is_array( $decoded ) ? $decoded : array();
	}

	/**
	 * Store the config as JSON. update_post_meta() unslashes, so slash first.
	 *
	 * @param int   $id     Campaign id.
	 * @param array $config Sanitized config.
	 */
	private function write_config( $id, array $config ) {
		update_post_meta( $id, Post_Type::META_CONFIG, wp_slash( wp_json_encode( $config ) ) );
	}

	/**
	 * Change the post status.
	 *
	 * @param int    $id     Campaign id.
	 * @param string $status draft or publish.
	 * @return array|\WP_Error
	 */
	private function set_post_status( $id, $status ) {
		if ( ! $this->find( $id ) ) {
			return new \WP_Error( 'mmbb_not_found', __( 'Campaign not found.', 'mix-and-max-box-builder' ), array( 'status' => 404 ) );
		}
		$result = wp_update_post(
			array(
				'ID'          => absint( $id ),
				'post_status' => $status,
			),
			true
		);
		return is_wp_error( $result ) ? $result : $this->find( $id );
	}

	/**
	 * Set or clear the paused flag.
	 *
	 * @param int  $id     Campaign id.
	 * @param bool $paused Paused state.
	 * @return array|\WP_Error
	 */
	private function set_paused( $id, $paused ) {
		if ( ! $this->find( $id ) ) {
			return new \WP_Error( 'mmbb_not_found', __( 'Campaign not found.', 'mix-and-max-box-builder' ), array( 'status' => 404 ) );
		}
		if ( $paused ) {
			update_post_meta( absint( $id ), Post_Type::META_PAUSED, '1' );
		} else {
			delete_post_meta( absint( $id ), Post_Type::META_PAUSED );
		}
		return $this->find( $id );
	}
}
