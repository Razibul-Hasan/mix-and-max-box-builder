# ProductBoxes redesign — agent instructions

This repository is an **existing, working WordPress plugin** (a WooCommerce box builder: shoppers fill a box with products and unlock bigger discounts). We are **updating** it to a new UI/UX, not rewriting it. The new design is in `design/`. The work is split into parts in `docs/REDESIGN-PLAN.md`.

## The three rules that matter most

1. **Keep what already exists.** The text domain, plugin slug, main file name, PHP namespace, prefix, constants, option names, post meta keys, order meta keys, custom post type, database tables, REST namespace and routes, block name, shortcode tag and attributes, script and style handles, hook names and admin page slugs **stay exactly as they are**. Part 0 writes them into the "Frozen identifiers" table below. After that, never rename any of them.
2. **Keep the imports the same.** Use the import style and packages the plugin already uses (for example `import { Button } from '@wordpress/components';`), the same build tool, the same folder layout and the same module names. Add new files beside the old ones. Don't move or rename existing modules unless a part says so.
3. **Never lose merchant data.** Every existing box, setting, order and analytics row must keep working after an update. Any change to stored data goes through a versioned upgrade routine, as Part 1 describes.

Names that appear in the design copy (for example `productboxes_`, `[productboxes id="12"]`, `/wp-json/productboxes/v1`) are **placeholders**. Always use the real identifiers from the table below.

## How we work

- When asked to "run Part N", read this file, `docs/PROGRESS.md`, the `## Part N` section of `docs/REDESIGN-PLAN.md`, and every file listed under **Read first**. Do only that part.
- Start by replying with a short plan: the files you'll change or add, and anything in the part that conflicts with the code as it stands.
- If the plan and the existing code disagree, follow the existing code's names and data, and record the difference under "Decisions" in `docs/PROGRESS.md`.
- Finish every part with its **Done when** checks. Then update `docs/PROGRESS.md` and commit `Redesign Part N: <title>`.
- If a check can't run here (no Docker, no browser), run everything else and record what you skipped and why.

## Frozen identifiers (filled in by Part 0, never changed afterwards)

| Thing | Value in this plugin |
| --- | --- |
| Plugin name (header) | ProductBoxes - Mix & Match Box Builder for WooCommerce |
| Slug / folder | `productboxes-mix-and-match-box-builder` |
| Main file | `productboxes-mix-and-match-box-builder.php` |
| **Text domain** | `productboxes-mix-and-match-box-builder` |
| Domain Path | `/languages` |
| PHP namespace / class prefix | `MixMax\\BoxBuilder` (files `includes/<module>/class-<name>.php`) |
| Global prefix (functions, options, hooks, meta, handles) | `mmbb` (`mmbb_` in PHP and data, `mmbb-` in handles and CSS classes, `mmbb:` in browser storage) |
| Constants | `MMBB_VERSION`, `MMBB_FILE`, `MMBB_PATH`, `MMBB_URL`, `MMBB_BASENAME` |
| Custom post type(s) | `mmbb_campaign` (post statuses `draft`, `publish`, `trash`; computed statuses `draft`, `scheduled`, `active`, `ending_soon`, `ended`, `paused`) |
| Options | `mmbb_settings` (and every key inside it), `mmbb_version`, `mmbb_db_version`, `mmbb_catalog_generation`, `mmbb_analytics_generation`, `mmbb_analytics_salt`, `mmbb_analytics_transients`, `mmbb_setup_test_done`. Settings group `mmbb_settings_group`. Transient prefixes `mmbb_products_`, `mmbb_report_`, `mmbb_campaign_totals_`, `mmbb_rate_` |
| Post / order / item meta keys | Post: `_mmbb_config` (and every key inside the JSON config), `_mmbb_paused`, `_mmbb_campaign_id`. Order: `_mmbb_has_box`. Order item: `_mmbb_box`, `mmbb_box_key`, `_mmbb_box_part`, `mmbb_box_parent`, `_mmbb_stock_reduced`. Cart item data: `mmbb_box`, `mmbb_instance`, `mmbb_parent`, `mmbb_free_gift`. User: `mmbb_checklist_dismissed` |
| Custom tables | `{prefix}mmbb_events`, `{prefix}mmbb_stats_daily`, `{prefix}mmbb_purchases` (columns in `docs/AUDIT.md`) |
| REST namespace and routes | `mmbb/v1`: `/campaigns`, `/campaigns/bulk`, `/campaigns/<id>`, `/campaigns/<id>/duplicate`, `/campaigns/<id>/publish`, `/campaigns/<id>/preview`, `/products`, `/terms`, `/pages`, `/settings`, `/theme`, `/setup`, `/stats`, `/analytics`, `/analytics/export`, `/events` |
| AJAX / wc-ajax actions | `wc-ajax=mmbb_add_box`. Nonce actions `mmbb_add_box`, `mmbb_edit_box`, `mmbb_track`. Query args `mmbb_edit`, `mmbb_edit_nonce`, `mmbb_preview`, `_wpnonce`; preview nonce action `mmbb_preview_<id>` |
| Block name(s) | `mmbb/box-builder` with attributes `campaignId`, `layout`, `columns`, `showHero` |
| Shortcode tag and attributes | `[mmbb_box id="12" layout="bar" columns="3" hero="false"]` |
| Admin page slugs | `mmbb`, `mmbb-campaigns`, `mmbb-analytics`, `mmbb-settings` |
| Script / style handles | `mmbb-tokens`, `mmbb-components`, `mmbb-admin`, `mmbb-storefront`, plus the block editor handle generated by WordPress |
| JS globals / storage keys | Globals `window.mmbbAdmin`, `window.mmbbBuilders`, `window.mmbbMoneySettings`, `window.mmbbComponents`, `window.mmbbPreview`. postMessage types `mmbb:preview:config`, `mmbb:preview:ready`, `mmbb:preview:height`. Body class `mmbb-is-fullscreen`. localStorage `mmbb:checklist-dismissed`, `mmbb:editor:<id>`, `mmbb:editor:device`. sessionStorage `mmbb:box:<id>`, `mmbb:analytics-session`, `mmbb:view:<id>` |
| Hooks fired | Actions `mmbb_campaign_saved`, `mmbb_rollup_daily`. Filters `mmbb_campaign_config_defaults`, `mmbb_templates`, `mmbb_ensure_container_product`, `mmbb_pricing_quote`, `mmbb_track_events` |
| Capability used for admin | `manage_woocommerce` |
| Current version, Requires at least, Requires PHP, WC requires | 1.0.0 · WordPress 6.6 · PHP 7.4 · WooCommerce 9.0 (`Installer::DB_VERSION` is `2.0.2`) |

The full inventory, with example values, is in `docs/AUDIT.md`.

## Commands

```text
npm install && composer install
npm run build
npm run lint:js && npm run lint:css && composer run lint
npm run test:js
composer run test:unit
npx wp-env start
npm run test:php
npx wp-env run cli wp plugin check productboxes-mix-and-match-box-builder
npm run plugin-zip
```

Without Docker, run the native suites from PowerShell against the dedicated test databases (never the site's live database):

```powershell
$phpBinary = 'C:\xampp\php\php.exe'
$env:WP_TESTS_DIR = (Resolve-Path 'vendor\wp-phpunit\wp-phpunit').Path
$env:WP_TESTS_CONFIG_FILE_PATH = (Resolve-Path 'tools\native-tests\wp-tests-config.php').Path
$env:MMBB_TEST_SUITE = 'integration'
& $phpBinary vendor/bin/phpcs --standard=phpcs.xml.dist
& $phpBinary vendor/bin/phpunit --testsuite=unit
& $phpBinary vendor/bin/phpunit --testsuite=integration
$env:MMBB_TEST_HPOS = '1'
$env:MMBB_TEST_DB_NAME = 'mmbb_test_hpos'
& $phpBinary vendor/bin/phpunit --testsuite=integration
```

## Stack rules

- **Admin UI uses the real WordPress React components** from `@wordpress/components`, with `@wordpress/element`, `@wordpress/i18n`, `@wordpress/api-fetch`, `@wordpress/icons`, `@wordpress/data` and `@wordpress/notices`. They are loaded from WordPress through the dependency extraction in `@wordpress/scripts`, never bundled. Enqueue the `wp-components` stylesheet on our admin screens.
- Wrap every `__experimental*` component in **one file**, `src/admin/components/wp.js` (or whatever path matches the existing layout), so later swaps happen in one place. Pass `__next40pxDefaultSize` and `__nextHasNoMarginBottom` where the component supports them.
- **Storefront:** keep the front-end stack the plugin already uses. Don't load `@wordpress/components` on the front end.
- Keep the existing minimum versions unless a part needs a higher one. If it does, say so in PROGRESS and in the readme changelog.

## WordPress.org rules (each one is a rejection if broken)

1. GPL-compatible code and assets. Bundled fonts are SIL OFL: ship the licence files and list them in readme.txt.
2. Nothing loads from another server: no Google Fonts URL, no CDN, no remote images, no tracking. Template fonts ship as local woff2 files.
3. Use the libraries WordPress ships (React, `@wordpress/*`). Never bundle them.
4. Every request that changes state checks the capability and a nonce, sanitizes input and escapes output late. Every SQL query with a variable uses `$wpdb->prepare()`.
5. Load scripts and styles only with `wp_enqueue_*`, and pass data only with `wp_add_inline_script()`. Admin assets load only on our screens, storefront assets only where a box renders.
6. Every user-facing string is translatable with **the existing text domain**. JS strings use `wp_set_script_translations()` with that same domain.
7. Custom CSS from merchants is saved only by users with `unfiltered_html`. It is stripped of tags and printed only through `wp_add_inline_style()`.
8. The source for everything in `build/` ships in the zip, and readme.txt explains how to build it.

## Design rules

- `design/README.md` maps every screen to its source file. Match layout, copy, states and spacing.
- The admin follows the WordPress editor's look: a full-screen editor with the settings sidebar on the right and a live **iframe** preview in the middle.
- Storefront templates read every colour, font, radius and size from CSS custom properties, so the merchant's design settings apply without changing any markup.
- Status always pairs a word with its colour. Focus rings are visible. Touch targets on the storefront are at least 44px. Respect `prefers-reduced-motion`.
- Copy is in sentence case. Buttons start with a verb. Urgency must be honest: show real end dates and real stock only.

## Definition of done (every part)

- Build, lints and all tests pass.
- Plugin Check shows no new errors compared with the Part 1 baseline.
- No PHP notices with `WP_DEBUG` on.
- Existing boxes still render and still check out correctly.
- PROGRESS is updated and the work is committed.
