# Mix and Max Box Builder — agent instructions

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
| Plugin name | Mix and Max Box Builder |
| Slug, folder, text domain | `mix-and-max-box-builder` |
| Main file | `mix-and-max-box-builder.php` |
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
mix-and-max-box-builder.php   uninstall.php   readme.txt   LICENSE
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
npx wp-env run tests-cli --env-cwd=wp-content/plugins/mix-and-max-box-builder env MMBB_TEST_SUITE=integration vendor/bin/phpunit --testsuite=integration
npx wp-env run cli wp plugin check mix-and-max-box-builder
npm run plugin-zip       # release zip
npm run tokens           # generator arrives in Phase 2
```

The integration command uses the `tests-cli` container in pinned wp-env 10.30.0
and Composer's PHPUnit. Install dev dependencies first. It loads `wp-phpunit`
with wp-env's `WP_TESTS_DIR` config and the isolated test database. The current
online wp-env docs describe `cli`, but this pinned release still provides the
separate `tests-cli` service (verified in its Docker configuration source).
Reference: https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/#using-composer-phpunit-and-wp-cli-tools
For a PHP 7.4 compatibility run, create the ignored `.wp-env.override.json` with
`{ "phpVersion": "7.4" }`, then run `npx wp-env start --update`.

## WordPress.org rules (a broken rule means rejection)

1. Everything is GPLv2-or-later compatible. Bundled fonts are SIL OFL: ship the licence files and list them in readme.txt.
2. Every PHP file starts with `defined( 'ABSPATH' ) || exit;` (`uninstall.php` checks `WP_UNINSTALL_PLUGIN` instead).
3. Use the libraries WordPress ships. React, ReactDOM, the JSX runtime, `@wordpress/*` packages, jQuery and lodash come from WordPress through the dependency extraction in `@wordpress/scripts`. Never bundle a copy.
4. Nothing loads from or calls out to another server: no CDN, no Google Fonts URL, no remote images, no telemetry, no licence or update checks, no "phone home". All CSS, JS and fonts are local.
5. No trialware or locked features. Admin notices appear only on our screens (or Plugins for a missing requirement) and are dismissible. Never hide or remove other plugins' notices, change active plugins, or add front-end credit links.
6. Source for everything in `build/` ships in `src/` along with `package.json` and the webpack config. readme.txt explains how to build.
7. Security on every request that changes state: capability check, nonce (REST `permission_callback` plus the REST nonce from `apiFetch`; `wc-ajax` handlers `check_ajax_referer`), input via `wp_unslash()` then a `sanitize_*`/`absint`/schema check, output escaped late (`esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`). Every SQL statement with a variable uses `$wpdb->prepare()`. Never use `eval`, `extract`, `base64_*` for code, HEREDOC/NOWDOC, `$_REQUEST`, or `wp_redirect` with user URLs (`wp_safe_redirect`).
8. Scripts and styles only through `wp_register_*`/`wp_enqueue_*`, data only through `wp_add_inline_script()` with `wp_json_encode()`. Never echo `<script>` or `<style>`. Admin assets load only on our pages, storefront assets only where the block or shortcode renders.
9. i18n: every user-facing string uses the text domain `mix-and-max-box-builder` (PHP `__`, `esc_html__`, `_n`, `_x`, `sprintf` with `/* translators: */` comments; JS `@wordpress/i18n` plus `wp_set_script_translations()`). Never build a sentence by concatenation.
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
