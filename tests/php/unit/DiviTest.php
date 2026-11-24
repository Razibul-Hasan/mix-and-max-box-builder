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

	/** A section Divi made from a classic page, holding only the box's Text module, becomes Divi::section(). */
	public function test_migration_replaces_a_text_only_section() {
		$before = 'Intro [et_pb_section fb_built="1" _builder_version="4.27.9"][et_pb_row _builder_version="4.27.9"][et_pb_column type="4_4" _builder_version="4.27.9"]'
			. '[et_pb_text _builder_version="4.27.9"]<p>[mmbb_box id="7"]</p>[/et_pb_text]'
			. '[/et_pb_column][/et_pb_row][/et_pb_section] Outro';

		$after = Divi::migrate_shortcode( $before, 7 );

		$this->assertSame( 'Intro ' . Divi::section( '[mmbb_box id="7"]' ) . ' Outro', $after );
		$this->assertStringNotContainsString( 'et_pb_text', $after );
		$this->assertStringNotContainsString( '<p>', $after );
	}

	/** In a section with other modules, only the Text module turns into a Code module; the rest stays. */
	public function test_migration_swaps_the_module_in_place() {
		$heading = '[et_pb_text admin_label="Heading"]<h2>Build a box</h2>[/et_pb_text]';
		$before  = '[et_pb_section fb_built="1" background_color="#fafafa"][et_pb_row][et_pb_column type="4_4"]'
			. $heading
			. '[et_pb_text text_font_size="18px"]' . "\n<p>[mmbb_box id=\"7\" layout=\"bar\"]</p>\n" . '[/et_pb_text]'
			. '[/et_pb_column][/et_pb_row][/et_pb_section]';

		$after = Divi::migrate_shortcode( $before, 7 );

		$this->assertSame(
			'[et_pb_section fb_built="1" background_color="#fafafa"][et_pb_row][et_pb_column type="4_4"]'
				. $heading
				. Divi::code_module( '[mmbb_box id="7" layout="bar"]' )
				. '[/et_pb_column][/et_pb_row][/et_pb_section]',
			$after
		);
	}

	/** A bare shortcode in a Text module (no paragraph) moves too. */
	public function test_migration_handles_a_bare_shortcode() {
		$after = Divi::migrate_shortcode( '[et_pb_column type="1_2"][et_pb_text][mmbb_box id="7"][/et_pb_text][/et_pb_column]', 7 );
		$this->assertSame( '[et_pb_column type="1_2"]' . Divi::code_module( '[mmbb_box id="7"]' ) . '[/et_pb_column]', $after );
	}

	/** Running the migration again changes nothing. */
	public function test_migration_is_idempotent() {
		$before = '[et_pb_section][et_pb_row][et_pb_column type="4_4"][et_pb_text]<p>[mmbb_box id="7"]</p>[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]'
			. '[et_pb_section][et_pb_row][et_pb_column type="4_4"][et_pb_image src="a.jpg"][/et_pb_image][et_pb_text]<p>[mmbb_box id="7"]</p>[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]';
		$once   = Divi::migrate_shortcode( $before, 7 );
		$this->assertNotSame( $before, $once );
		$this->assertSame( $once, Divi::migrate_shortcode( $once, 7 ) );
		$this->assertSame( 2, substr_count( $once, '[mmbb_box id="7"]' ) );
	}

	/** Other boxes, other shortcodes, Text modules with more text and Code modules are left alone. */
	public function test_migration_leaves_other_content_alone() {
		$cases = array(
			'other box'         => '[et_pb_section][et_pb_row][et_pb_column type="4_4"][et_pb_text]<p>[mmbb_box id="70"]</p>[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]',
			'other shortcode'   => '[et_pb_text]<p>[gallery ids="7"]</p>[/et_pb_text]',
			'text around it'    => '[et_pb_text]<p>Pick three.</p><p>[mmbb_box id="7"]</p>[/et_pb_text]',
			'already in code'   => Divi::section( '[mmbb_box id="7"]' ),
			'outside a module'  => '<p>[mmbb_box id="7"]</p>',
			'no divi at all'    => '<!-- wp:mmbb/box-builder {"campaignId":7} /-->',
			'id in another att' => '[et_pb_text]<p>[mmbb_box template="7" id="8"]</p>[/et_pb_text]',
		);
		foreach ( $cases as $name => $content ) {
			$this->assertSame( $content, Divi::migrate_shortcode( $content, 7 ), $name );
		}
		$this->assertSame( '[et_pb_text]<p>[mmbb_box id="7"]</p>[/et_pb_text]', Divi::migrate_shortcode( '[et_pb_text]<p>[mmbb_box id="7"]</p>[/et_pb_text]', 0 ) );
	}
}
