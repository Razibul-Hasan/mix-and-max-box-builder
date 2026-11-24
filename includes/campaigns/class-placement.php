<?php
/**
 * Where a campaign's builder actually lives.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Campaigns;

defined( 'ABSPATH' ) || exit;

/** Finds the page that shows a campaign, even when the merchant moved the builder by hand. */
final class Placement {
	/**
	 * Posts found by candidates(), by needle, for this request.
	 *
	 * @var array<string, \WP_Post[]>
	 */
	private static $candidates = array();

	/**
	 * The page that shows the campaign: the saved page while it still holds the
	 * builder, else a published page or post that does, else the saved page.
	 *
	 * @param array $campaign Campaign with id and config.
	 * @return \WP_Post|null Null when there is no usable page.
	 */
	public static function page( array $campaign ) {
		$id      = isset( $campaign['id'] ) ? (int) $campaign['id'] : 0;
		$page_id = isset( $campaign['config']['placement']['page_id'] ) ? (int) $campaign['config']['placement']['page_id'] : 0;
		// get_post( 0 ) returns the global post (the page being viewed), never "no page".
		$saved = $page_id > 0 ? get_post( $page_id ) : null;
		if ( $saved && 'trash' === $saved->post_status ) {
			$saved = null;
		}
		if ( $saved && Page_Content::contains( $saved->post_content, $id ) ) {
			return $saved;
		}
		$found = self::find( $id );
		return $found ? $found : $saved;
	}

	/**
	 * A published page or post that shows this campaign's block or shortcode.
	 *
	 * @param int $campaign_id Campaign id.
	 * @return \WP_Post|null
	 */
	private static function find( $campaign_id ) {
		if ( $campaign_id < 1 ) {
			return null;
		}
		foreach ( array( 'mmbb/box-builder', 'mmbb_box' ) as $needle ) {
			foreach ( self::candidates( $needle ) as $post ) {
				if ( Page_Content::contains( $post->post_content, $campaign_id ) ) {
					return $post;
				}
			}
		}
		return null;
	}

	/**
	 * Published pages and posts whose content mentions a needle, searched once per request.
	 *
	 * A list of campaigns looks each one up, so the search is shared by all of them.
	 *
	 * @param string $needle Block name or shortcode tag.
	 * @return \WP_Post[]
	 */
	private static function candidates( $needle ) {
		if ( ! isset( self::$candidates[ $needle ] ) ) {
			self::$candidates[ $needle ] = get_posts(
				array(
					'post_type'      => array( 'page', 'post' ),
					'post_status'    => 'publish',
					'posts_per_page' => 20,
					's'              => $needle,
					'no_found_rows'  => true,
				)
			);
		}
		return self::$candidates[ $needle ];
	}

	/** Forget the searched posts. On `clean_post_cache`, so a saved page is searched again. */
	public static function flush() {
		self::$candidates = array();
	}
}
