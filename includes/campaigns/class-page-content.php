<?php
/**
 * The only post content this plugin ever writes: the builder block or shortcode.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Campaigns;

defined( 'ABSPATH' ) || exit;

/** Builds and detects the placeholders that put a campaign on a page. Pure PHP. */
final class Page_Content {
	/**
	 * The block comment for a campaign.
	 *
	 * @param int $campaign_id Campaign id.
	 * @return string
	 */
	public static function block( $campaign_id ) {
		return '<!-- wp:mmbb/box-builder {"campaignId":' . abs( (int) $campaign_id ) . '} /-->';
	}

	/**
	 * The shortcode for a campaign.
	 *
	 * @param int $campaign_id Campaign id.
	 * @return string
	 */
	public static function shortcode( $campaign_id ) {
		return '[mmbb_box id="' . abs( (int) $campaign_id ) . '"]';
	}

	/**
	 * Whether content already places this campaign, as a block or a shortcode.
	 *
	 * @param string $content     Post content.
	 * @param int    $campaign_id Campaign id.
	 * @return bool
	 */
	public static function contains( $content, $campaign_id ) {
		$id      = abs( (int) $campaign_id );
		$content = (string) $content;
		if ( preg_match( '/<!--\s+wp:mmbb\/box-builder\s+\{[^}]*"campaignId"\s*:\s*' . $id . '\s*[,}]/', $content ) ) {
			return true;
		}
		return (bool) preg_match( '/\[mmbb_box\s+[^\]]*\bid=["\']?' . $id . '["\']?[\s\]]/', $content );
	}

	/**
	 * Put the campaign first in the content. Content that already places the
	 * campaign is returned as it was.
	 *
	 * @param string $content      Existing post content.
	 * @param int    $campaign_id  Campaign id.
	 * @param bool   $uses_blocks  True when the content is block content.
	 * @return string
	 */
	public static function prepend( $content, $campaign_id, $uses_blocks ) {
		$content = (string) $content;
		if ( self::contains( $content, $campaign_id ) ) {
			return $content;
		}
		$marker = $uses_blocks ? self::block( $campaign_id ) : self::shortcode( $campaign_id );
		return '' === trim( $content ) ? $marker : $marker . "\n\n" . $content;
	}
}
