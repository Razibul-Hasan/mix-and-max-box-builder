# ProductBoxes - Mix & Match Box Builder for WooCommerce — agent instructions

A WooCommerce plugin, headed for the WordPress.org Plugin Directory, that lets shoppers build their own box of products (pick items into slots, unlock bigger discounts as the box fills). Admin app in wp-admin (Dashboard, Campaigns, campaign wizard, Analytics, Settings) plus a storefront builder (block + shortcode) inside the merchant's theme. React UI through `@wordpress/element`.

## How we work

- The build is split into phases in `docs/BUILD-PLAN.md`. When asked to run "Phase N", read this file, `docs/PROGRESS.md`, the `## Phase N` section of the plan and every file it lists under **Read first**. Do only that phase. Never start the next one.
- Start by replying with a short plan: files you will create or change, and anything in the phase that conflicts with the code as it stands.
- Where the plan and existing code disagree, follow the plan unless it would break something already shipped in an earlier phase; then stop and write the conflict in `docs/PROGRESS.md`.
- Don't invent scope. If something is missing or impossible, record it under "Open issues" in `docs/PROGRESS.md`.
- Finish every phase with the **Done when** checks, then update `docs/PROGRESS.md` (done, decisions, deviations, checks run, open issues) and commit: `Phase N: <title>`.
- If a check can't run here (no Docker for wp-env, no browser), run everything else and list what was skipped and why.

## Fixed names (never change)

| Thing | Value |
| --- | --- |
| Plugin name | ProductBoxes - Mix & Match Box Builder for WooCommerce (renamed from "Mix and Max Box Builder" after the WordPress.org review; PHP namespace and `mmbb` prefix kept) |
| Slug, folder, text domain | `productboxes-mix-and-match-box-builder` |
| Main file | `productboxes-mix-and-match-box-builder.php` |
| PHP namespace | `MixMax\BoxBuilder` (WordPress file naming: `includes/rest/class-campaigns-controller.php` holds `MixMax\BoxBuilder\Rest\Campaigns_Controller`) |
| Prefix for everything global | `mmbb` — options, post meta, order meta, transients, hooks, nonces, REST namespace `mmbb/v1`, Action Scheduler hooks, table names `{$wpdb->prefix}mmbb_*`, script/style handles `mmbb-*`, CSS classes `mmbb-*`, JS globals `window.mmbb*`, browser storage keys `mmbb:*` |
| Constants | `MMBB_VERSION`, `MMBB_FILE`, `MMBB_PATH`, `MMBB_URL`, `MMBB_BASENAME` |
| Custom post type | `mmbb_campaign` |
| Block | `mmbb/box-builder` |
| Shortcode | `[mmbb_box id="12"]` |
| Admin pages | `admin.php?page=mmbb` (Dashboard), `mmbb-campaigns`, `mmbb-analytics`, `mmbb-settings` |
| Capability | `manage_woocommerce` for every admin screen and admin route |

Never prefix with `wp_`, `_` or `__`. Never use a 2–3 letter prefix.

## Stack and versions

- WordPress 6.6+ (needed for the `react-jsx-runtime` script). Test against the current release too.
- PHP 7.4+. Code must run unchanged on 7.4 through 8.4: no enums, readonly props, `match`, named arguments, nullsafe `?->`, union types or other 8.x-only syntax.
- WooCommerce 9.0+, declared with `Requires Plugins: woocommerce`.
- Node 20.19+, `@wordpress/scripts`, `@wordpress/env`. Composer is for dev tools only (WPCS, PHPCompatibilityWP, PHPUnit). The plugin has no runtime Composer packages and never ships `vendor/`.

## Layout

```
productboxes-mix-and-match-box-builder.php   uninstall.php   readme.txt   LICENSE
includes/            PHP classes (own autoloader, no Composer at runtime)
src/                 JS + CSS source (ships in the zip: WordPress.org requires source)
  components/        design-system components (ported from design/system/components)
  styles/            tokens.css (generated from design/system/tokens.json), components.css
  shared/            pricing.js and other logic shared by admin + storefront
  admin/  storefront/  blocks/box-builder/
build/               compiled output (gitignored, created by npm run build)
assets/fonts/        woff2 + OFL licence files
languages/
tests/php/{unit,integration}   tests/js   tests/fixtures
design/              design handoff: source of truth for UI, never shipped
docs/                BUILD-PLAN.md, PROGRESS.md, never shipped
```

## Commands

Phase 0 creates these. Keep this list accurate whenever a command changes.

```
npm install && composer install
npm run build            # production build
npm run start            # watch
npm run lint:js && npm run lint:css && composer run lint
npm run test:js          # Jest
composer run test:unit   # pure-PHP unit tests (no WordPress)
npx wp-env start         # WordPress + WooCommerce + Plugin Check at http://localhost:8888 (admin / password)
npm run test:php         # PHPUnit integration tests inside wp-env
npx wp-env run tests-cli --env-cwd=wp-content/plugins/productboxes-mix-and-match-box-builder env MMBB_TEST_SUITE=integration vendor/bin/phpunit --testsuite=integration
npx wp-env run cli wp plugin check productboxes-mix-and-match-box-builder
# In-place check (e.g. from wp-admin on a Local site): copy tools/plugin-check-dev-ignores.php
# into wp-content/mu-plugins/ so Plugin Check skips the dev files .distignore excludes.
npm run plugin-zip       # release zip
npm run tokens           # regenerate committed CSS from design/system/tokens.json
npm run blueprint        # rebuild .wordpress-org/blueprints/blueprint.json (live preview) from tools/blueprint/
node tools/blueprint/build.mjs --local   # same, but activates a mounted checkout, for @wp-playground/cli
```

The integration command uses the `tests-cli` container in pinned wp-env 10.30.0
and Composer's PHPUnit. Install dev dependencies first. It loads `wp-phpunit`
with wp-env's `WP_TESTS_DIR` config and the isolated test database. The current
online wp-env docs describe `cli`, but this pinned release still provides the
separate `tests-cli` service (verified in its Docker configuration source).
Reference: https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/#using-composer-phpunit-and-wp-cli-tools
For a PHP 7.4 compatibility run, create the ignored `.wp-env.override.json` with
`{ "phpVersion": "7.4" }`, then run `npx wp-env start --update`.

### Without Docker (the Local site this checkout lives in)

Docker is not installed on the owner's machine. The checkout sits in a Local site
(`wp-content/plugins/productboxes-mix-and-match-box-builder`) whose WordPress, WooCommerce and
Plugin Check are used instead. PHP, WP-CLI and MySQL come with Local; none is on PATH. Start the
site in Local first (its MySQL listens on 127.0.0.1:10005). `<site id>` is the folder under
`%APPDATA%\Local\run\` that belongs to this site (its key in `%APPDATA%\Local\sites.json`).

```
# Git Bash
PHP="$APPDATA/Local/lightning-services/php-8.2.29+0/bin/win64/php.exe"
export PHPRC="$APPDATA/Local/run/<site id>/conf/php"        # Local's php.ini, with its extensions
WPCLI="/c/Program Files (x86)/Local/resources/extraResources/bin/wp-cli/wp-cli.phar"
SITE="$(cd ../../.. && pwd)"                                   # the WordPress root

"$PHP" vendor/bin/phpcs                                        # composer run lint
"$PHP" vendor/bin/phpunit --testsuite=unit                     # composer run test:unit

# Integration suite. Uses the separate database mmbb_test, never the site's own (wipes it).
export WP_TESTS_CONFIG_FILE_PATH="$PWD/tools/native-tests/wp-tests-config.php" MMBB_TEST_SUITE=integration
"$PHP" vendor/bin/phpunit --testsuite=integration
MMBB_TEST_HPOS=1 MMBB_TEST_DB_NAME=mmbb_test_hpos "$PHP" vendor/bin/phpunit --testsuite=integration
"$PHP" vendor/bin/phpunit --testsuite=integration --filter LegacyFixturesTest   # 1.0.0 data still works

# Plugin Check. Copy tools/plugin-check-dev-ignores.php into wp-content/mu-plugins/ first.
"$PHP" "$WPCLI" --path="$SITE" plugin check productboxes-mix-and-match-box-builder \
  --include-experimental --include-low-severity-errors --include-low-severity-warnings
# The same review ruleset on the packaged zip (unpack npm run plugin-zip somewhere first):
"$PHP" ../plugin-check/vendor/squizlabs/php_codesniffer/bin/phpcs \
  --standard=../plugin-check/phpcs-rulesets/plugin-review.xml --extensions=php <unpacked folder>
```

The test databases (`mmbb_test`, `mmbb_test_hpos`) must exist; create them once with Local's
`mysql.exe` (`CREATE DATABASE mmbb_test`). Override the connection with `MMBB_TEST_DB_NAME`,
`MMBB_TEST_DB_USER`, `MMBB_TEST_DB_PASSWORD` and `MMBB_TEST_DB_HOST`. PHP warns that
`php_imagick.dll` is missing on every run; that warning is harmless. Baselines to compare
against live in `docs/baseline/`.

## WordPress.org rules (a broken rule means rejection)

1. Everything is GPLv2-or-later compatible. Bundled fonts are SIL OFL: ship the licence files and list them in readme.txt.
2. Every PHP file starts with `defined( 'ABSPATH' ) || exit;` (`uninstall.php` checks `WP_UNINSTALL_PLUGIN` instead).
3. Use the libraries WordPress ships. React, ReactDOM, the JSX runtime, `@wordpress/*` packages, jQuery and lodash come from WordPress through the dependency extraction in `@wordpress/scripts`. Never bundle a copy.
4. Nothing loads from or calls out to another server: no CDN, no Google Fonts URL, no remote images, no telemetry, no licence or update checks, no "phone home". All CSS, JS and fonts are local.
5. No trialware or locked features. Admin notices appear only on our screens (or Plugins for a missing requirement) and are dismissible. Never hide or remove other plugins' notices, change active plugins, or add front-end credit links.
6. Source for everything in `build/` ships in `src/` along with `package.json` and the webpack config. readme.txt explains how to build.
7. Security on every request that changes state: capability check, nonce (REST `permission_callback` plus the REST nonce from `apiFetch`; `wc-ajax` handlers `check_ajax_referer`), input via `wp_unslash()` then a `sanitize_*`/`absint`/schema check, output escaped late (`esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`). Every SQL statement with a variable uses `$wpdb->prepare()`. Never use `eval`, `extract`, `base64_*` for code, HEREDOC/NOWDOC, `$_REQUEST`, or `wp_redirect` with user URLs (`wp_safe_redirect`).
8. Scripts and styles only through `wp_register_*`/`wp_enqueue_*`, data only through `wp_add_inline_script()` with `wp_json_encode()`. Never echo `<script>` or `<style>`. Admin assets load only on our pages, storefront assets only where the block or shortcode renders.
9. i18n: every user-facing string uses the text domain `productboxes-mix-and-match-box-builder` (PHP `__`, `esc_html__`, `_n`, `_x`, `sprintf` with `/* translators: */` comments; JS `@wordpress/i18n` plus `wp_set_script_translations()`). Never build a sentence by concatenation.
10. REST routes always have a real `permission_callback`. `__return_true` is allowed only for public read-only routes. Public write routes (analytics events) verify a nonce and rate-limit.
11. Tables are created with `dbDelta()` on activation and on version upgrades. Data is deleted on uninstall only when the merchant has turned on "Delete all plugin data".

## WooCommerce rules

- Declare compatibility for HPOS (`custom_order_tables`) and the Cart & Checkout blocks (`cart_checkout_blocks`) in the main file on `before_woocommerce_init`.
- Orders only through CRUD: `wc_get_order()`, `$order->get_meta()` / `update_meta_data()` / `save()`, `$item->add_meta_data()`. Never post meta or direct SQL on orders.
- The server computes every price (`MixMax\BoxBuilder\Pricing`). The browser only displays, and the server ignores any price it sends.
- Money is formatted from WooCommerce settings (symbol, position, decimals, separators). Never hard-code `$`.
- Everything works with both the classic cart/checkout (shortcodes) and the Cart/Checkout blocks.

## Design rules

- `design/` is the source of truth: `design/README.md` maps every screen to its PNG and prototype file. Match layout, copy and states.
- Colours, spacing, radii and shadows come only from tokens (CSS custom properties scoped to `.mmbb-root`). No raw hex values in component CSS (emails are the exception).
- At most one orange `max` button per view. Primary admin actions use the ink `primary` button. Status always pairs a word or icon with its colour. Visible 2px focus ring. Touch targets of 44px or more on the storefront. Honour `prefers-reduced-motion`.
- Copy: sentence case, verb-led buttons, number-led savings, no emoji, honest urgency (real end dates and real stock only).
- The admin uses the `AdminShell` top bar, never a second sidebar.

## Code standards

- PHP: WordPress Coding Standards (`WordPress-Extra`, `WordPress-Docs`) plus `PHPCompatibilityWP` with `testVersion 7.4-`. One class per file. Hook registration lives in each module's `register()` method, not at file scope.
- JS: `@wordpress/scripts` lint configs. Function components and hooks only. Talk to the server only through `src/*/api.js` wrappers around `@wordpress/api-fetch` (or `fetch` for `wc-ajax`).
- Tests: pure logic (pricing, config validation, reducers) gets unit tests in PHP and JS. Pricing PHP and JS share `tests/fixtures/pricing-cases.json` and must give identical results.
- No new runtime JS dependency without a note in PROGRESS explaining why a WordPress package can't do the job.

## Definition of done (every phase)

`npm run build`, the lints and every test pass. Plugin Check shows no errors (warnings are explained in PROGRESS). No PHP notices with `WP_DEBUG` on. PROGRESS is updated. The work is committed.

## Redesign

The 1.0 build above is finished. The redesign below is the current work. Where a redesign rule and an earlier rule disagree (for example the admin shell, or which design files are the source of truth), the redesign rule wins. The fixed names, commands, WordPress.org rules and WooCommerce rules above still apply. Redesign progress is logged in `docs/REDESIGN-PROGRESS.md`, not `docs/PROGRESS.md`, and the redesign screen map is `design/REDESIGN.md`.

This repository is an **existing, working WordPress plugin** (a WooCommerce box builder: shoppers fill a box with products and unlock bigger discounts). We are **updating** it to a new UI/UX, not rewriting it. The new design is in `design/`. The work is split into parts in `docs/REDESIGN-PLAN.md`.

### The three rules that matter most

1. **Keep what already exists.** The text domain, plugin slug, main file name, PHP namespace, prefix, constants, option names, post meta keys, order meta keys, custom post type, database tables, REST namespace and routes, block name, shortcode tag and attributes, script and style handles, hook names and admin page slugs **stay exactly as they are**. Part 0 writes them into the "Frozen identifiers" table below. After that, never rename any of them.
2. **Keep the imports the same.** Use the import style and packages the plugin already uses (for example `import { Button } from '@wordpress/components';`), the same build tool, the same folder layout and the same module names. Add new files beside the old ones. Don't move or rename existing modules unless a part says so.
3. **Never lose merchant data.** Every existing box, setting, order and analytics row must keep working after an update. Any change to stored data goes through a versioned upgrade routine, as Part 1 describes.

Names that appear in the design copy (for example `productboxes_`, `[productboxes id="12"]`, `/wp-json/productboxes/v1`) are **placeholders**. Always use the real identifiers from the table below.

### How we work

- When asked to "run Part N", read this file, `docs/REDESIGN-PROGRESS.md`, the `## Part N` section of `docs/REDESIGN-PLAN.md`, and every file listed under **Read first**. Do only that part.
- Start by replying with a short plan: the files you'll change or add, and anything in the part that conflicts with the code as it stands.
- If the plan and the existing code disagree, follow the existing code's names and data, and record the difference under "Decisions" in `docs/REDESIGN-PROGRESS.md`.
- Finish every part with its **Done when** checks. Then update `docs/REDESIGN-PROGRESS.md` and commit `Redesign Part N: <title>`.
- If a check can't run here (no Docker, no browser), run everything else and record what you skipped and why.

### Frozen identifiers (filled in by Part 0, never change them)

| Thing | Value in this plugin |
| --- | --- |
| Plugin name (header) | ProductBoxes - Mix & Match Box Builder for WooCommerce |
| Slug / folder | `productboxes-mix-and-match-box-builder` |
| Main file | `productboxes-mix-and-match-box-builder.php` |
| **Text domain** | `productboxes-mix-and-match-box-builder` |
| Domain Path | `/languages` |
| PHP namespace / class prefix | `MixMax\BoxBuilder` (files `includes/<module>/class-<name>.php`) |
| Global prefix (functions, options, hooks, meta, handles) | `mmbb` (`mmbb_` in PHP and data, `mmbb-` in handles and CSS classes, `mmbb:` in browser storage) |
| Constants | `MMBB_VERSION`, `MMBB_FILE`, `MMBB_PATH`, `MMBB_URL`, `MMBB_BASENAME` |
| Custom post type(s) | `mmbb_campaign` (post statuses `draft`, `publish`, `trash`; computed statuses `draft`, `scheduled`, `active`, `ending_soon`, `ended`, `paused`) |
| Options | `mmbb_settings` (and every key inside it), `mmbb_version`, `mmbb_db_version`, `mmbb_catalog_generation`, `mmbb_analytics_generation`, `mmbb_analytics_salt`, `mmbb_analytics_transients`, `mmbb_setup_test_done`. Settings group `mmbb_settings_group`. Transient prefixes `mmbb_products_`, `mmbb_report_`, `mmbb_campaign_totals_`, `mmbb_rate_` |
| Post / order / item meta keys | Post: `_mmbb_config` (and every key inside the JSON config), `_mmbb_paused`, `_mmbb_campaign_id`. Order: `_mmbb_has_box`. Order item: `_mmbb_box`, `mmbb_box_key`, `_mmbb_box_part`, `mmbb_box_parent`, `_mmbb_stock_reduced`. Cart item data: `mmbb_box`, `mmbb_instance`, `mmbb_parent`, `mmbb_free_gift`. User: `mmbb_checklist_dismissed` (added in Redesign Part 3) |
| Custom tables | `{prefix}mmbb_events`, `{prefix}mmbb_stats_daily`, `{prefix}mmbb_purchases` (columns in `docs/AUDIT.md`) |
| REST namespace and routes | `mmbb/v1`: `/campaigns`, `/campaigns/bulk`, `/campaigns/<id>`, `/campaigns/<id>/duplicate`, `/campaigns/<id>/publish`, `/campaigns/<id>/preview` (GET; POST for an unsaved draft from Part 4), `/products`, `/terms`, `/pages`, `/settings`, `/setup`, `/stats`, `/analytics`, `/analytics/export`, `/events` (public, nonce `mmbb_track`) |
| AJAX / wc-ajax actions | `wc-ajax=mmbb_add_box`. Nonce actions `mmbb_add_box`, `mmbb_edit_box`, `mmbb_track`. Query args `mmbb_edit`, `mmbb_edit_nonce`. Editor preview (Part 4): query args `mmbb_preview` and `_wpnonce`, nonce action `mmbb_preview_<id>` |
| Block name(s) | `mmbb/box-builder` with attributes `campaignId`, `layout`, `columns`, `showHero` |
| Shortcode tag and attributes | `[mmbb_box id="12" layout="bar" columns="3" hero="false"]` |
| Admin page slugs | `mmbb` (Dashboard), `mmbb-campaigns` (with `action=new`, or `action=edit&id=<id>` and optional `step`), `mmbb-analytics`, `mmbb-settings` |
| Script / style handles | `mmbb-tokens`, `mmbb-components`, `mmbb-admin`, `mmbb-storefront`, plus the block editor handle WordPress generates |
| JS globals / storage keys | Globals `window.mmbbAdmin`, `window.mmbbBuilders`, `window.mmbbMoneySettings`, `window.mmbbComponents`, `window.mmbbPreview` (Part 4). postMessage types `mmbb:preview:config`, `mmbb:preview:ready`, `mmbb:preview:height` (Part 4). Body class `mmbb-is-fullscreen` (Part 4). localStorage `mmbb:checklist-dismissed`, `mmbb:editor:<id>`, `mmbb:editor:device`. sessionStorage `mmbb:box:<id>`, `mmbb:analytics-session`, `mmbb:view:<id>` |
| Hooks fired | Actions `mmbb_campaign_saved`, `mmbb_rollup_daily` (scheduled). Filters `mmbb_campaign_config_defaults`, `mmbb_templates`, `mmbb_ensure_container_product`, `mmbb_pricing_quote`, `mmbb_track_events` |
| Capability used for admin | `manage_woocommerce` |
| Current version, Requires at least, Requires PHP, WC requires | 1.0.0 · WordPress 6.6 · PHP 7.4 · WooCommerce 9.0 (DB schema version `0.9.0` in 1.0.0; `Installer::DB_VERSION` is `2.0.0` from Redesign Part 1, and each migration step in `includes/class-upgrades.php` raises it) |

The full inventory, with example values, is in `docs/AUDIT.md`.

### Stack rules

- **Admin UI uses the real WordPress React components** from `@wordpress/components`, with `@wordpress/element`, `@wordpress/i18n`, `@wordpress/api-fetch`, `@wordpress/icons`, `@wordpress/data` and `@wordpress/notices`. They are loaded from WordPress through the dependency extraction in `@wordpress/scripts`, never bundled. Enqueue the `wp-components` stylesheet on our admin screens.
- Wrap every `__experimental*` component in **one file**, `src/admin/components/wp.js` (or whatever path matches the existing layout), so later swaps happen in one place. Pass `__next40pxDefaultSize` and `__nextHasNoMarginBottom` where the component supports them.
- **Storefront:** keep the front-end stack the plugin already uses. Don't load `@wordpress/components` on the front end.
- Keep the existing minimum versions unless a part needs a higher one. If it does, say so in PROGRESS and in the readme changelog.

### WordPress.org rules (each one is a rejection if broken)

1. GPL-compatible code and assets. Bundled fonts are SIL OFL: ship the licence files and list them in readme.txt.
2. Nothing loads from another server: no Google Fonts URL, no CDN, no remote images, no tracking. Template fonts ship as local woff2 files.
3. Use the libraries WordPress ships (React, `@wordpress/*`). Never bundle them.
4. Every request that changes state checks the capability and a nonce, sanitizes input and escapes output late. Every SQL query with a variable uses `$wpdb->prepare()`.
5. Load scripts and styles only with `wp_enqueue_*`, and pass data only with `wp_add_inline_script()`. Admin assets load only on our screens, storefront assets only where a box renders.
6. Every user-facing string is translatable with **the existing text domain**. JS strings use `wp_set_script_translations()` with that same domain.
7. Custom CSS from merchants is saved only by users with `unfiltered_html`. It is stripped of tags and printed only through `wp_add_inline_style()`.
8. The source for everything in `build/` ships in the zip, and readme.txt explains how to build it.

### Design rules

- `design/REDESIGN.md` maps every screen to its source file. Match layout, copy, states and spacing.
- The admin follows the WordPress editor's look: a full-screen editor with the settings sidebar on the right and a live **iframe** preview in the middle.
- Storefront templates read every colour, font, radius and size from CSS custom properties, so the merchant's design settings apply without changing any markup.
- Status always pairs a word with its colour. Focus rings are visible. Touch targets on the storefront are at least 44px. Respect `prefers-reduced-motion`.
- Copy is in sentence case. Buttons start with a verb. Urgency must be honest: show real end dates and real stock only.

### Definition of done (every part)

- Build, lints and all tests pass.
- Plugin Check shows no new errors compared with the Part 1 baseline.
- No PHP notices with `WP_DEBUG` on.
- Existing boxes still render and still check out correctly.
- PROGRESS is updated and the work is committed.
