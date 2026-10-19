<?php
/**
 * Run lifecycle operations in each site's own database context.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder;

defined( 'ABSPATH' ) || exit;

/** Share bounded multisite traversal between activation and uninstall. */
final class Sites {
	/**
	 * Visit all sites, restoring the original context even on failure.
	 *
	 * @param callable $callback Operation for the current site.
	 */
	public static function for_each( $callback ) {
		if ( ! is_multisite() ) {
			call_user_func( $callback );
			return;
		}

		$offset = 0;
		do {
			$ids = get_sites(
				array(
					'fields'  => 'ids',
					'number'  => 100,
					'offset'  => $offset,
					'orderby' => 'id',
					'order'   => 'ASC',
				)
			);
			foreach ( $ids as $site_id ) {
				switch_to_blog( (int) $site_id );
				try {
					call_user_func( $callback );
				} finally {
					restore_current_blog();
				}
			}
			$count   = count( $ids );
			$offset += $count;
		} while ( 100 === $count );
	}
}
