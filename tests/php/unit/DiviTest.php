<?php
/**
 * Divi theme integration: style fixes and the Divi Builder section.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Autoloader;
use MixMax\BoxBuilder\Campaigns\Page_Content;
use MixMax\BoxBuilder\Compatibility\Themes\Divi;
use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 3 ) . '/includes/class-autoloader.php';
Autoloader::register();

/** The pure parts of the Divi integration. */
final class DiviTest extends TestCase {
	/** Lists are reset with ID weight, because Divi styles them through `#left-area`. */
	public function test_list_reset_outweighs_an_id() {
		$css = Divi::css();
		$this->assertStringContainsString( '.mmbb-root:is(.mmbb-root,#mmbb-boost) :is(ul,ol){list-style:none;padding:0;line-height:inherit}', $css );
	}

	/** Element resets stay below the builder's own `.mmbb-root .mmbb-*` rules. */
	public function test_element_resets_are_low_weight() {
		$css = Divi::css();
		$this->assertStringContainsString( ':where(.mmbb-theme-divi) .mmbb-root :is(h1,h2,h3,h4,h5,h6){padding-bottom:0;font-weight:700}', $css );
		$this->assertStringContainsString( ':where(.mmbb-theme-divi) .mmbb-root p{padding-bottom:0}', $css );
		$this->assertStringContainsString( ':where(.mmbb-theme-divi) .mmbb-root.mmbb-builder{font-weight:400}', $css );
	}

	/** The drawer, and the Divi wrappers around it while it is open, sit above the fixed header. */
	public function test_drawer_clears_the_fixed_header() {
		$css = Divi::css();
		$this->assertStringContainsString( '.mmbb-theme-divi .mmbb-root .mmbb-drawer{z-index:100001}', $css );
		$this->assertMatchesRegularExpression( '/:is\([^)]*\.et_builder_inner_content[^)]*\.et_pb_column[^)]*\):has\(\.mmbb-drawer\)\{z-index:100001!important\}/', $css );
	}

	/** The sticky summary is offset by the header height the script measures. */
	public function test_sticky_summary_uses_the_measured_header() {
		$this->assertStringContainsString( 'var(--mmbb-divi-header,0px)', Divi::css() );
		$this->assertStringContainsString( '--mmbb-divi-header', Divi::header_script() );
		$this->assertStringContainsString( '#main-header', Divi::header_script() );
	}

	/** A box set to the content width keeps Divi's column on phones. */
	public function test_phone_width_respects_content_width() {
		$this->assertStringContainsString( '.mmbb-root.mmbb-builder:not([data-width=content]){width:calc(100vw - 32px)', Divi::css() );
	}

	/** The Divi Builder section holds the shortcode in a Code module, and is found as a placement. */
	public function test_section_wraps_the_shortcode_in_a_code_module() {
		$section = Divi::section( Page_Content::shortcode( 7 ) );
		$this->assertStringStartsWith( '[et_pb_section fb_built="1"', $section );
		$this->assertStringContainsString( '[et_pb_code', $section );
		$this->assertStringContainsString( '[mmbb_box id="7"][/et_pb_code]', $section );
		$this->assertStringEndsWith( '[/et_pb_section]', $section );
		$this->assertTrue( Page_Content::contains( $section, 7 ) );
	}
}
