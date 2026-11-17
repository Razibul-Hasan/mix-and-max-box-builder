<?php
/**
 * Plugin Name: ProductBoxes live preview pages
 * Description: Live preview only. The template gallery, the template switcher on each demo page and the "Hire an expert" call to action.
 *
 * The blueprint installs this as a must-use plugin. It is never shipped in the plugin zip.
 *
 * @package MixMax\BoxBuilder
 */

defined( 'ABSPATH' ) || exit;

/** Where the call to action sends visitors. A plain, followed link. */
const MMBB_DEMO_EXPERT_URL = 'https://bestwebexpert.com/';

add_filter( 'the_content', 'mmbb_demo_page_content', 20 );
add_filter( 'render_block', 'mmbb_demo_cta_before_footer', 10, 2 );
add_action( 'get_footer', 'mmbb_demo_cta_classic' );
add_action( 'wp_enqueue_scripts', 'mmbb_demo_site_style' );

/**
 * The demo pages, from the seeder.
 *
 * @return array { gallery: int, pages: array[] }
 */
function mmbb_demo_site_links() {
	$links = get_option( 'mmbb_demo_links', array() );
	return array(
		'gallery' => isset( $links['gallery'] ) ? (int) $links['gallery'] : 0,
		'pages'   => isset( $links['pages'] ) && is_array( $links['pages'] ) ? array_values( $links['pages'] ) : array(),
	);
}

/**
 * The gallery on the front page, and the template switcher above each box.
 *
 * @param string $content Rendered post content.
 * @return string
 */
function mmbb_demo_page_content( $content ) {
	if ( ! is_singular( 'page' ) || ! in_the_loop() || ! is_main_query() ) {
		return $content;
	}
	$links   = mmbb_demo_site_links();
	$page_id = get_the_ID();
	if ( $links['gallery'] && $page_id === $links['gallery'] ) {
		return mmbb_demo_gallery( $links['pages'] );
	}
	foreach ( $links['pages'] as $index => $page ) {
		if ( (int) $page['page_id'] === $page_id ) {
			return mmbb_demo_switcher( $links, $index ) . $content;
		}
	}
	return $content;
}

/**
 * Template colours from the plugin, so the cards match what each page shows.
 *
 * @param string $template Template id.
 * @return string Inline CSS custom properties.
 */
function mmbb_demo_palette( $template ) {
	$class = '\MixMax\BoxBuilder\Storefront\Template_Styles';
	$row   = class_exists( $class ) && isset( $class::DEFAULTS[ $template ] )
		? $class::DEFAULTS[ $template ]
		: array( '#ff4f1f', '#ffffff', '#f3f4f6', '#111111', '#555b66' );
	return sprintf( '--c-accent:%s;--c-bg:%s;--c-surface:%s;--c-text:%s;--c-muted:%s', $row[0], $row[1], $row[2], $row[3], $row[4] );
}

/**
 * The front page: a hero and one card per template.
 *
 * @param array[] $pages Demo pages.
 * @return string
 */
function mmbb_demo_gallery( array $pages ) {
	$photos = array();
	foreach ( $pages as $page ) {
		foreach ( (array) $page['images'] as $image ) {
			$photos[ (int) $image ] = true;
		}
	}
	$photos = array_slice( array_keys( $photos ), 0, 6 );
	$first  = $pages ? get_permalink( $pages[0]['page_id'] ) : '';

	ob_start();
	?>
	<div class="mmbbd alignwide">
		<section class="mmbbd-hero">
			<div class="mmbbd-hero__copy">
				<p class="mmbbd-eyebrow"><span class="mmbbd-dot" aria-hidden="true"></span>Live demo &middot; ProductBoxes for WooCommerce</p>
				<h1 class="mmbbd-hero__title">10 box&#8209;builder templates. <span>Real products.</span></h1>
				<p class="mmbbd-hero__lead">Every page below is a working mix &amp; match box: tiered discounts, fixed sizes and bundle prices, each styled with a different storefront template. Add items, watch the price drop, check out.</p>
				<div class="mmbbd-actions">
					<a class="mmbbd-btn mmbbd-btn--dark" href="#mmbbd-templates">Browse the templates</a>
					<?php if ( $first ) : ?>
						<a class="mmbbd-btn mmbbd-btn--ghost" href="<?php echo esc_url( $first ); ?>">Try a live box &rarr;</a>
					<?php endif; ?>
				</div>
				<ul class="mmbbd-stats">
					<li><strong><?php echo (int) count( $pages ); ?></strong> design templates</li>
					<li><strong>3</strong> discount types</li>
					<li><strong>0</strong> lines of code</li>
				</ul>
			</div>
			<?php if ( $photos ) : ?>
				<div class="mmbbd-hero__art" aria-hidden="true">
					<?php foreach ( $photos as $n => $photo ) : ?>
						<div class="mmbbd-tile mmbbd-tile--<?php echo (int) $n + 1; ?>"><?php echo wp_get_attachment_image( $photo, 'medium', false, array( 'alt' => '', 'loading' => 'eager' ) ); ?></div>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
		</section>

		<section class="mmbbd-section" id="mmbbd-templates">
			<div class="mmbbd-section__head">
				<h2>Pick a template, open the live box</h2>
				<p>Same plugin, same products, ten looks. Each one is a real campaign you can edit in the admin.</p>
			</div>
			<ol class="mmbbd-grid">
				<?php foreach ( $pages as $index => $page ) : ?>
					<li class="mmbbd-card" style="<?php echo esc_attr( mmbb_demo_palette( $page['template'] ) ); ?>">
						<a class="mmbbd-card__link" href="<?php echo esc_url( get_permalink( $page['page_id'] ) ); ?>">
							<div class="mmbbd-card__stage">
								<span class="mmbbd-card__num"><?php echo esc_html( sprintf( '%02d', $index + 1 ) ); ?></span>
								<div class="mmbbd-fan">
									<?php foreach ( array_slice( (array) $page['images'], 0, 3 ) as $image ) : ?>
										<?php echo wp_get_attachment_image( (int) $image, 'medium', false, array( 'alt' => '' ) ); ?>
									<?php endforeach; ?>
								</div>
								<span class="mmbbd-swatches" aria-hidden="true"><i></i><i></i><i></i></span>
							</div>
							<div class="mmbbd-card__body">
								<p class="mmbbd-card__kicker"><?php echo esc_html( $page['name'] ); ?> template</p>
								<h3 class="mmbbd-card__title"><?php echo esc_html( $page['title'] ); ?></h3>
								<p class="mmbbd-card__text"><?php echo esc_html( $page['blurb'] ); ?></p>
								<p class="mmbbd-card__foot"><span class="mmbbd-pill"><?php echo esc_html( $page['type'] ); ?></span><span class="mmbbd-go">View live <span aria-hidden="true">&rarr;</span></span></p>
							</div>
						</a>
					</li>
				<?php endforeach; ?>
			</ol>
		</section>
	</div>
	<?php
	return (string) ob_get_clean();
}

/**
 * The strip above each box: back to the gallery, this template, previous and next, and every template.
 *
 * @param array $links Demo links.
 * @param int   $index This page's position.
 * @return string
 */
function mmbb_demo_switcher( array $links, $index ) {
	$pages = $links['pages'];
	$count = count( $pages );
	$page  = $pages[ $index ];
	$prev  = $pages[ ( $index - 1 + $count ) % $count ];
	$next  = $pages[ ( $index + 1 ) % $count ];

	ob_start();
	?>
	<nav class="mmbbd mmbbd-switch alignwide" aria-label="Demo templates" style="<?php echo esc_attr( mmbb_demo_palette( $page['template'] ) ); ?>">
		<div class="mmbbd-switch__row">
			<?php if ( $links['gallery'] ) : ?>
				<a class="mmbbd-switch__back" href="<?php echo esc_url( get_permalink( $links['gallery'] ) ); ?>"><span aria-hidden="true">&larr;</span> All templates</a>
			<?php endif; ?>
			<p class="mmbbd-switch__now">
				<span class="mmbbd-switch__count"><?php echo esc_html( sprintf( '%02d / %02d', $index + 1, $count ) ); ?></span>
				<strong><?php echo esc_html( $page['name'] ); ?></strong>
				<span class="mmbbd-switch__type"><?php echo esc_html( $page['type'] ); ?></span>
			</p>
			<span class="mmbbd-switch__arrows">
				<a href="<?php echo esc_url( get_permalink( $prev['page_id'] ) ); ?>" title="<?php echo esc_attr( $prev['name'] ); ?>"><span aria-hidden="true">&larr;</span><span class="screen-reader-text">Previous template: <?php echo esc_html( $prev['name'] ); ?></span></a>
				<a href="<?php echo esc_url( get_permalink( $next['page_id'] ) ); ?>" title="<?php echo esc_attr( $next['name'] ); ?>"><span aria-hidden="true">&rarr;</span><span class="screen-reader-text">Next template: <?php echo esc_html( $next['name'] ); ?></span></a>
			</span>
		</div>
		<ul class="mmbbd-switch__chips">
			<?php foreach ( $pages as $n => $item ) : ?>
				<li><a href="<?php echo esc_url( get_permalink( $item['page_id'] ) ); ?>" style="<?php echo esc_attr( mmbb_demo_palette( $item['template'] ) ); ?>"<?php echo $n === $index ? ' aria-current="page"' : ''; ?>><i aria-hidden="true"></i><?php echo esc_html( $item['name'] ); ?></a></li>
			<?php endforeach; ?>
		</ul>
	</nav>
	<?php
	return (string) ob_get_clean();
}

/**
 * The call to action, shown once per page above the footer.
 *
 * @return string
 */
function mmbb_demo_cta() {
	static $done = false;
	if ( $done || is_admin() ) {
		return '';
	}
	$done = true;

	ob_start();
	?>
	<aside class="mmbbd mmbbd-cta" aria-label="Hire an expert">
		<div class="mmbbd-cta__inner">
			<div class="mmbbd-cta__copy">
				<p class="mmbbd-eyebrow mmbbd-eyebrow--light"><span class="mmbbd-dot" aria-hidden="true"></span>Done-for-you setup</p>
				<h2 class="mmbbd-cta__title">Want a box builder like this on your store?</h2>
				<p class="mmbbd-cta__text">Our WooCommerce experts install ProductBoxes, match it to your brand, set up your bundles and discounts, and tune it to sell more boxes.</p>
				<ul class="mmbbd-cta__list">
					<li>Custom template design</li>
					<li>Bundle &amp; pricing strategy</li>
					<li>Theme and plugin compatibility</li>
				</ul>
			</div>
			<div class="mmbbd-cta__action">
				<a class="mmbbd-btn mmbbd-btn--accent mmbbd-btn--lg" href="<?php echo esc_url( MMBB_DEMO_EXPERT_URL ); ?>" target="_blank" rel="noopener">Hire an expert <span aria-hidden="true">&rarr;</span></a>
				<p class="mmbbd-cta__note">Best Web Expert &middot; WooCommerce specialists</p>
			</div>
		</div>
	</aside>
	<?php
	return (string) ob_get_clean();
}

/**
 * Block themes: put the call to action just before the footer template part.
 *
 * @param string $html  Rendered block.
 * @param array  $block Block.
 * @return string
 */
function mmbb_demo_cta_before_footer( $html, $block ) {
	if ( is_admin() || 'core/template-part' !== $block['blockName'] ) {
		return $html;
	}
	$attrs = isset( $block['attrs'] ) ? $block['attrs'] : array();
	$slug  = isset( $attrs['slug'] ) ? (string) $attrs['slug'] : '';
	$area  = isset( $attrs['tagName'] ) ? (string) $attrs['tagName'] : '';
	if ( false === strpos( $slug, 'footer' ) && 'footer' !== $area ) {
		return $html;
	}
	return mmbb_demo_cta() . $html;
}

/** Classic themes: print the call to action before footer.php. */
function mmbb_demo_cta_classic() {
	echo mmbb_demo_cta(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped when built.
}

/** The demo pages' styles. */
function mmbb_demo_site_style() {
	wp_register_style( 'mmbb-demo-site', false, array(), '1' );
	wp_enqueue_style( 'mmbb-demo-site' );
	wp_add_inline_style( 'mmbb-demo-site', mmbb_demo_site_css() );
}

/**
 * Styles for the gallery, the switcher and the call to action. Phone first.
 *
 * @return string
 */
function mmbb_demo_site_css() {
	return <<<'CSS'
.mmbbd{--ink:#0e0e10;--ink-2:#5b6069;--line:rgb(14 14 16/10%);--paper:#fff;--orange:#ff4f1f;--radius:22px;box-sizing:border-box;color:var(--ink);font-family:inherit;-webkit-font-smoothing:antialiased}
.mmbbd *,.mmbbd *::before,.mmbbd *::after{box-sizing:border-box}
.mmbbd a{text-decoration:none}
.mmbbd img{display:block;max-width:100%;height:auto}
.mmbbd h1,.mmbbd h2,.mmbbd h3,.mmbbd p{margin:0}
.mmbbd ul,.mmbbd ol{margin:0;padding:0;list-style:none}
.mmbbd-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;background:var(--paper);font-size:13px;font-weight:600;letter-spacing:.01em}
.mmbbd-eyebrow--light{background:rgb(255 255 255/8%);border-color:rgb(255 255 255/16%);color:#fff}
.mmbbd-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgb(34 197 94/55%);animation:mmbbd-pulse 2s infinite}
@keyframes mmbbd-pulse{70%{box-shadow:0 0 0 8px rgb(34 197 94/0%)}100%{box-shadow:0 0 0 0 rgb(34 197 94/0%)}}
.mmbbd-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 22px;border-radius:999px;font-size:15px;font-weight:700;line-height:1;transition:transform .2s,box-shadow .2s,background .2s}
.mmbbd-btn:hover{transform:translateY(-2px)}
.mmbbd-btn:focus-visible,.mmbbd a:focus-visible{outline:3px solid var(--orange);outline-offset:3px}
.mmbbd-btn--dark{background:var(--ink);color:#fff!important;box-shadow:0 10px 24px -12px rgb(14 14 16/60%)}
.mmbbd-btn--ghost{border:1.5px solid var(--ink);color:var(--ink)!important}
.mmbbd-btn--accent{background:var(--orange);color:#fff!important;box-shadow:0 14px 30px -12px rgb(255 79 31/70%)}
.mmbbd-btn--accent:hover{background:#ff6a3d}
.mmbbd-btn--lg{min-height:58px;padding:0 30px;font-size:17px}

/* Gallery hero */
.mmbbd-hero{display:grid;gap:40px;align-items:center;padding:40px 0 24px}
.mmbbd-hero__copy{display:grid;gap:20px;justify-items:start}
.mmbbd-hero__title{font-size:clamp(2.3rem,7vw,4.6rem);line-height:1;font-weight:800;letter-spacing:-.035em}
.mmbbd-hero__title span{color:var(--ink-2)}
.mmbbd-hero__lead{max-width:34em;font-size:clamp(1rem,2.2vw,1.15rem);line-height:1.6;color:var(--ink-2)}
.mmbbd-actions{display:flex;flex-wrap:wrap;gap:12px}
.mmbbd-stats{display:flex;flex-wrap:wrap;gap:8px 24px;padding-top:8px;font-size:14px;color:var(--ink-2)}
.mmbbd-stats strong{color:var(--ink);font-size:20px;font-weight:800;margin-right:4px}
.mmbbd-hero__art{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.mmbbd-tile{overflow:hidden;border-radius:18px;background:#f3f4f6;aspect-ratio:1;box-shadow:0 18px 40px -24px rgb(14 14 16/45%)}
.mmbbd-tile img{width:100%;height:100%;object-fit:cover;transition:transform .6s}
.mmbbd-tile:hover img{transform:scale(1.06)}
.mmbbd-tile--2,.mmbbd-tile--5{transform:translateY(18px)}

/* Gallery cards */
.mmbbd-section{padding:56px 0 32px}
.mmbbd-section__head{display:grid;gap:8px;margin-bottom:24px}
.mmbbd-section__head h2{font-size:clamp(1.6rem,4vw,2.4rem);font-weight:800;letter-spacing:-.025em;line-height:1.1}
.mmbbd-section__head p{color:var(--ink-2);line-height:1.6}
.mmbbd-grid{display:grid;gap:18px;grid-template-columns:1fr}
.mmbbd-card{border-radius:var(--radius);background:var(--c-bg);color:var(--c-text);border:1px solid var(--line);overflow:hidden;transition:transform .25s,box-shadow .25s}
.mmbbd-card:hover{transform:translateY(-4px);box-shadow:0 24px 50px -28px rgb(14 14 16/55%)}
.mmbbd-card__link{display:flex;flex-direction:column;height:100%;color:inherit!important}
.mmbbd-card__stage{position:relative;display:grid;place-items:center;aspect-ratio:16/10;background:var(--c-surface);overflow:hidden}
.mmbbd-card__stage::after{content:"";position:absolute;inset:auto -20% -60% auto;width:70%;aspect-ratio:1;border-radius:50%;background:var(--c-accent);opacity:.16}
.mmbbd-card__num{position:absolute;top:14px;left:16px;z-index:2;font-size:13px;font-weight:800;letter-spacing:.06em;color:var(--c-text);opacity:.7}
.mmbbd-fan{position:relative;z-index:1;width:62%;max-width:280px;aspect-ratio:1.6}
.mmbbd-fan img{position:absolute;top:50%;left:50%;width:46%;aspect-ratio:1;object-fit:cover;border-radius:14px;border:3px solid #fff;box-shadow:0 14px 28px -14px rgb(0 0 0/55%);transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.mmbbd-fan img:nth-child(1){transform:translate(-115%,-50%) rotate(-9deg)}
.mmbbd-fan img:nth-child(2){z-index:2;transform:translate(-50%,-56%)}
.mmbbd-fan img:nth-child(3){transform:translate(15%,-50%) rotate(9deg)}
.mmbbd-card:hover .mmbbd-fan img:nth-child(1){transform:translate(-128%,-46%) rotate(-14deg)}
.mmbbd-card:hover .mmbbd-fan img:nth-child(2){transform:translate(-50%,-62%) scale(1.05)}
.mmbbd-card:hover .mmbbd-fan img:nth-child(3){transform:translate(28%,-46%) rotate(14deg)}
.mmbbd-swatches{position:absolute;right:14px;top:14px;z-index:2;display:flex}
.mmbbd-swatches i{width:16px;height:16px;border-radius:50%;border:2px solid var(--c-surface);margin-left:-5px}
.mmbbd-swatches i:nth-child(1){background:var(--c-accent)}
.mmbbd-swatches i:nth-child(2){background:var(--c-text)}
.mmbbd-swatches i:nth-child(3){background:var(--c-bg)}
.mmbbd-card__body{display:grid;gap:8px;padding:20px 20px 22px;flex:1}
.mmbbd-card__kicker{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--c-accent)}
.mmbbd-card__title{font-size:22px;font-weight:800;letter-spacing:-.02em;line-height:1.15;color:var(--c-text)}
.mmbbd-card__text{font-size:15px;line-height:1.55;color:var(--c-muted)}
.mmbbd-card__foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:6px}
.mmbbd-pill{padding:5px 10px;border-radius:999px;border:1px solid currentColor;font-size:12px;font-weight:600;color:var(--c-muted)}
.mmbbd-go{font-size:14px;font-weight:700;color:var(--c-text);white-space:nowrap}
.mmbbd-go span{display:inline-block;transition:transform .2s}
.mmbbd-card:hover .mmbbd-go span{transform:translateX(4px)}

/* Switcher above each box */
.mmbbd-switch{margin-top:16px!important;margin-bottom:8px!important;padding:12px;border:1px solid var(--line);border-radius:18px;background:var(--paper);color:var(--ink)}
.mmbbd-switch__row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.mmbbd-switch__back{font-size:14px;font-weight:700;color:var(--ink)!important;padding:8px 4px}
.mmbbd-switch__now{display:flex;align-items:center;gap:8px;font-size:14px;order:3;width:100%}
.mmbbd-switch__count{padding:3px 8px;border-radius:999px;background:var(--c-accent);color:#fff;font-size:12px;font-weight:800;letter-spacing:.04em;mix-blend-mode:normal}
.mmbbd-switch__type{color:var(--ink-2)}
.mmbbd-switch__arrows{display:flex;gap:6px}
.mmbbd-switch__arrows a{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);color:var(--ink)!important;font-size:18px;transition:background .2s,color .2s}
.mmbbd-switch__arrows a:hover{background:var(--ink);color:#fff!important}
.mmbbd-switch__chips{display:flex;gap:8px;margin-top:10px!important;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:2px}
.mmbbd-switch__chips::-webkit-scrollbar{display:none}
.mmbbd-switch__chips a{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;border:1px solid var(--line);font-size:13px;font-weight:600;color:var(--ink)!important;white-space:nowrap}
.mmbbd-switch__chips a:hover{border-color:var(--ink)}
.mmbbd-switch__chips a[aria-current]{background:var(--ink);color:#fff!important;border-color:var(--ink)}
.mmbbd-switch__chips i{width:10px;height:10px;border-radius:50%;background:var(--c-accent);box-shadow:inset 0 0 0 1px rgb(0 0 0/10%)}

/* Call to action */
.mmbbd-cta{padding:24px 16px;margin:32px 0 0}
.mmbbd-cta__inner{position:relative;overflow:hidden;display:grid;gap:28px;max-width:1240px;margin:0 auto;padding:32px 22px;border-radius:28px;background:#0e0e10;color:#fff;isolation:isolate}
.mmbbd-cta__inner::before{content:"";position:absolute;z-index:-1;inset:-40% -10% auto auto;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgb(255 79 31/55%),transparent 65%)}
.mmbbd-cta__inner::after{content:"";position:absolute;z-index:-1;inset:auto auto -55% -15%;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgb(91 61 245/40%),transparent 65%)}
.mmbbd-cta__copy{display:grid;gap:14px;justify-items:start}
.mmbbd-cta__title{font-size:clamp(1.7rem,5vw,2.8rem);font-weight:800;line-height:1.05;letter-spacing:-.03em;color:#fff}
.mmbbd-cta__text{max-width:36em;color:rgb(255 255 255/72%);line-height:1.6}
.mmbbd-cta__list{display:flex;flex-wrap:wrap;gap:8px}
.mmbbd-cta__list li{padding:6px 12px;border-radius:999px;background:rgb(255 255 255/8%);font-size:13px;font-weight:600}
.mmbbd-cta__list li::before{content:"\2713";margin-right:6px;color:#22c55e}
.mmbbd-cta__action{display:grid;gap:10px;justify-items:start}
.mmbbd-cta__action .mmbbd-btn{width:100%}
.mmbbd-cta__note{font-size:13px;color:rgb(255 255 255/55%)}

@media (min-width:600px){
.mmbbd-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.mmbbd-switch__now{order:0;width:auto}
.mmbbd-cta__action .mmbbd-btn{width:auto}
}
@media (min-width:960px){
.mmbbd-hero{grid-template-columns:1.1fr .9fr;gap:56px;padding:64px 0 32px}
.mmbbd-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}
.mmbbd-cta{padding:40px 24px}
.mmbbd-cta__inner{grid-template-columns:1.5fr 1fr;align-items:center;padding:56px}
.mmbbd-cta__action{justify-items:end;text-align:right}
}
@media (max-width:599px){
.mmbbd-hero{padding-top:24px}
.mmbbd-hero__art{grid-template-columns:repeat(3,1fr);gap:8px}
.mmbbd-tile{border-radius:12px}
.mmbbd-tile--4,.mmbbd-tile--5,.mmbbd-tile--6{display:none}
.mmbbd-tile--2{transform:translateY(10px)}
.mmbbd-actions .mmbbd-btn{flex:1 1 100%}
}
@media (prefers-reduced-motion:reduce){
.mmbbd *{animation:none!important;transition:none!important}
}
CSS;
}
