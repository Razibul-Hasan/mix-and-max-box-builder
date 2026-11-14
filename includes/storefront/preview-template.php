<?php
/**
 * The page the box editor previews on when no real page shows the box: the theme's
 * styles and the box, nothing else.
 *
 * @package MixMax\BoxBuilder
 */

use MixMax\BoxBuilder\Storefront\Preview;
use MixMax\BoxBuilder\Storefront\Renderer;

defined( 'ABSPATH' ) || exit;

Preview::mark_printed();
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class( 'mmbb-preview-page' ); ?>>
<?php wp_body_open(); ?>
<main class="mmbb-preview-main">
	<?php echo Renderer::render( Preview::box_id() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Renderer::render() escapes everything it prints. ?>
</main>
<?php wp_footer(); ?>
</body>
</html>
