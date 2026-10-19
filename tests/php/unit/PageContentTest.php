<?php
/**
 * The block and shortcode that place a campaign on a page.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Campaigns\Page_Content;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** Only the generated block comment or shortcode is ever written to a page. */
class PageContentTest extends TestCase {
	/** The block comment and shortcode have fixed shapes. */
	public function test_markers() {
		$this->assertSame( '<!-- wp:mmbb/box-builder {"campaignId":12} /-->', Page_Content::block( 12 ) );
		$this->assertSame( '[mmbb_box id="12"]', Page_Content::shortcode( 12 ) );
		$this->assertSame( '[mmbb_box id="0"]', Page_Content::shortcode( 'not a number' ) );
	}

	/** Detection matches this campaign only. */
	public function test_contains() {
		$this->assertTrue( Page_Content::contains( Page_Content::block( 12 ), 12 ) );
		$this->assertTrue( Page_Content::contains( 'Hello [mmbb_box id="12"] there', 12 ) );
		$this->assertTrue( Page_Content::contains( "[mmbb_box id='12']", 12 ) );
		$this->assertFalse( Page_Content::contains( Page_Content::block( 123 ), 12 ) );
		$this->assertFalse( Page_Content::contains( '[mmbb_box id="123"]', 12 ) );
		$this->assertFalse( Page_Content::contains( '<p>Nothing here</p>', 12 ) );
	}

	/** The marker goes first, and is never added twice. */
	public function test_prepend() {
		$this->assertSame(
			"[mmbb_box id=\"5\"]\n\n<p>Shop</p>",
			Page_Content::prepend( '<p>Shop</p>', 5, false )
		);
		$this->assertSame(
			"<!-- wp:mmbb/box-builder {\"campaignId\":5} /-->\n\n<!-- wp:paragraph --><p>Shop</p><!-- /wp:paragraph -->",
			Page_Content::prepend( '<!-- wp:paragraph --><p>Shop</p><!-- /wp:paragraph -->', 5, true )
		);
		$this->assertSame( Page_Content::block( 5 ), Page_Content::prepend( '  ', 5, true ) );

		$already = "<p>Hi</p>\n[mmbb_box id=\"5\"]";
		$this->assertSame( $already, Page_Content::prepend( $already, 5, false ) );
	}
}
