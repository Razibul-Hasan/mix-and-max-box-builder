<?php
/**
 * Template style resolver tests.
 *
 * @package MixMax\BoxBuilder
 */

namespace MixMax\BoxBuilder\Tests\Unit;

defined( 'ABSPATH' ) || exit;

use MixMax\BoxBuilder\Storefront\Template_Styles;
use PHPUnit\Framework\TestCase;

/** Safe template defaults and merchant overrides. */
final class TemplateStylesTest extends TestCase {
	/** Unknown templates fall back and every required variable is present. */
	public function test_fallback_has_complete_contract() {
		$result = Template_Styles::resolve( array( 'template' => 'unknown' ) );
		$this->assertSame( 'spotlight', $result['template'] );
		foreach ( array( '--mmbb-accent', '--mmbb-button-text', '--mmbb-bg', '--mmbb-surface', '--mmbb-text', '--mmbb-muted', '--mmbb-savings', '--mmbb-font-heading', '--mmbb-font-body', '--mmbb-heading-size', '--mmbb-heading-weight', '--mmbb-btn-radius', '--mmbb-btn-height', '--mmbb-card-radius', '--mmbb-card-shadow', '--mmbb-cols', '--mmbb-ratio', '--mmbb-fit' ) as $name ) {
			$this->assertArrayHasKey( $name, $result['vars'] );
		}
	}

	/** Sanitized merchant values override a template. */
	public function test_merchant_values_override_defaults() {
		$result = Template_Styles::resolve(
			array(
				'template'   => 'night',
				'colors'     => array( 'accent' => '#abcdef' ),
				'cards'      => array(
					'columns'     => 5,
					'image_ratio' => '4/5',
				),
				'typography' => array( 'heading_size' => 72 ),
			)
		);
		$this->assertSame( '#abcdef', $result['vars']['--mmbb-accent'] );
		$this->assertSame( 5, $result['vars']['--mmbb-cols'] );
		$this->assertSame( '4 / 5', $result['vars']['--mmbb-ratio'] );
		$this->assertSame( '72px', $result['vars']['--mmbb-heading-size'] );
		$this->assertSame( array( 'space-grotesk' ), $result['fonts'] );
	}

	/** Night keeps accessible dark defaults until the merchant overrides them. */
	public function test_night_has_dark_defaults() {
		$result = Template_Styles::resolve( array( 'template' => 'night' ) );
		$this->assertSame( '#0c0c10', $result['vars']['--mmbb-bg'] );
		$this->assertSame( '#f4f4f5', $result['vars']['--mmbb-text'] );
		$this->assertSame( '#c8ff2e', $result['vars']['--mmbb-accent'] );
	}
}
