# Mix and Max Box Builder — build plan for Claude Code and Codex

This plan builds the plugin in 13 phases (0 to 12), from an empty repository to a WordPress.org submission. Each phase is a self-contained prompt: give an agent the phase number and it knows what to read, what to build, which WordPress.org rules apply and how to prove it's done.

- **Standing rules** live in `AGENTS.md` (Codex reads it automatically; Claude Code reads it through `CLAUDE.md`). Phases don't repeat them.
- **Design** lives in `design/`. `design/README.md` maps every screen to a PNG and to a prototype file.
- **Progress** lives in `docs/PROGRESS.md`. The agent updates it at the end of every phase, so the next phase (or the other agent) picks up where the last one stopped.

---

## How to use this plan

### 1. Set up the repository once

1. Create an empty git repository named `mix-and-max-box-builder`. The repository root is the plugin folder.
2. Unzip the starter kit into it. You should see `AGENTS.md`, `CLAUDE.md`, `docs/BUILD-PLAN.md`, `docs/PROGRESS.md` and `design/`.
3. Install Node 20+, Composer, and Docker (for `wp-env`). Codex cloud tasks may lack Docker. They run the checks they can and say which ones they skipped.
4. Commit: `Starter kit`.

### 2. Run one phase at a time

Open Claude Code or Codex in the repository root and send:

```text
Run Phase 3 of docs/BUILD-PLAN.md.
```

That is enough, because `AGENTS.md` tells the agent how to run a phase. If you want to spell it out, or the agent drifts, use the long form:

```text
Implement Phase {N} of docs/BUILD-PLAN.md.
1. Read AGENTS.md, docs/PROGRESS.md, then the "Phase {N}" section and every file it lists under "Read first".
2. Reply with a short plan: the files you will create or change, and anything in this phase that conflicts with the current code.
3. Build it. Stay inside this phase. Do not start Phase {N+1}.
4. Run every check under "Done when". Fix failures and re-run until they pass, or record why a check cannot run here.
5. Update docs/PROGRESS.md and commit with the message "Phase {N}: {phase title}".
```

### 3. Review with the other agent (recommended)

After a phase, ask the other tool to review it without changing code:

```text
Review Phase {N} against docs/BUILD-PLAN.md and AGENTS.md. Do not edit files.
List findings by severity (blocker / should fix / nice to have) with file and line,
and check especially: WordPress.org rules, security (capability + nonce + sanitize + escape),
prefixes, i18n, and whether the UI matches design/.
```

Then send the findings back to the builder:

```text
Fix these review findings for Phase {N}, re-run the Done-when checks, update docs/PROGRESS.md, and commit "Phase {N}: review fixes".
<paste findings>
```

### Phase map

| # | Phase | What exists afterwards | Needs |
| --- | --- | --- | --- |
| 0 | Tooling and repository | Build, lint, tests, local WordPress, zip | — |
| 1 | Plugin skeleton and lifecycle | Activatable plugin, requirements check, uninstall, readme draft | 0 |
| 2 | Design system inside the plugin | Tokens, fonts, 34 components, i18n, money formatting | 1 |
| 3 | Data layer and pricing engine | Campaign post type and config, settings, tables, templates, pricing in PHP and JS | 1 |
| 4 | REST API for the admin | `mmbb/v1` routes with permissions and schemas | 3 |
| 5 | Admin app: shell, dashboard, campaigns | wp-admin menu, Dashboard (both states), Campaigns list, pop-ups | 2, 4 |
| 6 | Campaign wizard | Create → products → rules → design → publish | 5 |
| 7 | Cart, orders and stock | Box add-to-cart, server pricing, order meta, child stock | 3 |
| 8 | Storefront: block, shortcode, builder | Block, shortcode, desktop and phone builder | 2, 7 |
| 9 | Analytics | Events, rollups, Analytics page, CSV export, privacy | 8 |
| 10 | Settings screen and emails | Settings UI applied everywhere, email meta | 9 |
| 11 | Hardening and WordPress.org compliance | Clean Plugin Check, audits, compatibility matrix | 10 |
| 12 | Release and submission | 1.0.0 zip, directory assets, submission, SVN | 11 |

Phases 3 and 2 can run in either order. Everything else runs in number order.

### Product decisions (apply to all phases)

| Topic | Decision |
| --- | --- |
| Campaign types | **Tiered mix**: up to N items, discount tiers by item count. **Fixed box**: shopper picks a size and fills every slot. **Bundle price**: exactly N items for one price. |
| Products in a box | Simple products and individual variations. Category and tag sources include simple products only. Grouped, external and subscription products are excluded. |
| Cart representation | Default **one bundled line**: a hidden "container" product per campaign, priced on the server, with the contents in cart item data. Optional **box plus each item** mode (Phase 7, step 11). |
| Storefront add-to-cart | A WooCommerce AJAX endpoint (`wc-ajax=mmbb_add_box`), so the cart and session are always loaded. This replaces the `POST /mmbb/v1/cart/box` route sketched in `design/system/wordpress-notes.md`. |
| Admin data | REST under `mmbb/v1`, capability `manage_woocommerce`. |
| Analytics | Stored only in this site's database. Anonymous session IDs, no IP or user agent. Can be switched off. Nothing is sent anywhere. |
| Money | Integer minor units (cents) in all calculations. Formatting follows WooCommerce settings. |
| Requirements | WordPress 6.6+, PHP 7.4+, WooCommerce 9.0+. |

---

## Phase 0 — Tooling and repository

**Goal:** a repository where build, lint, tests, a local WordPress with WooCommerce, and the release zip all work before any feature code exists.

**Read first:** `AGENTS.md`, `design/README.md`.

**Build:**

1. `package.json` (private) with scripts:
   - `build`, `start`: `wp-scripts build` / `wp-scripts start`.
   - `lint:js`, `lint:css`, `format`: the matching `wp-scripts` commands.
   - `test:js`: `wp-scripts test-unit-js`.
   - `plugin-zip`: `wp-scripts plugin-zip`.
   - `test:php`: PHPUnit integration tests inside wp-env.
   - `env:start`, `env:stop`: `wp-env start` / `wp-env stop`.
   - `tokens`: regenerate `src/styles/tokens.css` (the script itself arrives in Phase 2).

   Dev dependencies: `@wordpress/scripts`, `@wordpress/env`, `@testing-library/react`. Install the `@wordpress/*` runtime packages you import (`element`, `i18n`, `api-fetch`, `components`, `blocks`, `block-editor`, `url`, `dom-ready`) as dependencies so tests and editors resolve them. At build time they become WordPress globals.
2. `webpack.config.js`: extend the `@wordpress/scripts` default config. Keep its automatic `block.json` discovery under `src/` and add entries `admin` (`src/admin/index.js`) and `storefront` (`src/storefront/index.js`). Each entry gets an `.asset.php` file listing its WordPress script dependencies.
3. `composer.json` with **require-dev only**: `wp-coding-standards/wpcs` (^3), `phpcompatibility/phpcompatibility-wp`, `dealerdirect/phpcodesniffer-composer-installer`, `phpunit/phpunit` (^9.6, for PHP 7.4 support), `yoast/phpunit-polyfills`, `wp-phpunit/wp-phpunit`. Scripts: `lint` (phpcs), `lint:fix` (phpcbf), `test:unit`.
4. `phpcs.xml.dist`:
   - Rulesets `WordPress-Extra`, `WordPress-Docs` and `PHPCompatibilityWP` with `testVersion` `7.4-`.
   - `text_domain` `mix-and-max-box-builder`; `prefixes` `MixMax\BoxBuilder` and `mmbb`.
   - Exclude `build/`, `node_modules/`, `vendor/`, `design/`, `docs/`.
   - A lighter rule set for `tests/`.
5. `phpunit.xml.dist` with two suites:
   - `unit` (`tests/php/unit`): no WordPress loaded, for pure classes.
   - `integration` (`tests/php/integration`): WordPress plus WooCommerce loaded through `wp-phpunit` inside wp-env.

   Add a smoke test to each suite.
6. `.wp-env.json`:
   - Plugins: `"."`, `"https://downloads.wordpress.org/plugin/woocommerce.zip"`, `"https://downloads.wordpress.org/plugin/plugin-check.zip"`.
   - `phpVersion` `"8.2"`, plus `WP_DEBUG`, `WP_DEBUG_LOG` and `SCRIPT_DEBUG` set to true.
   - An override file, `.wp-env.override.json` (gitignored), lets you switch to PHP 7.4 for compatibility runs.
7. Work out and document the exact integration-test command. Check the current `@wordpress/env` docs for which container (`cli` or `tests-cli`) has PHPUnit and the test library; it is typically run with `--env-cwd=wp-content/plugins/mix-and-max-box-builder`. Put the working command in `package.json` and in the Commands list in `AGENTS.md`.
8. What ships: the `files` field in `package.json`, used by `plugin-zip`, lists exactly `mix-and-max-box-builder.php`, `uninstall.php`, `readme.txt`, `LICENSE`, `includes/`, `build/`, `src/`, `assets/`, `languages/`, `package.json`, `webpack.config.js`. Mirror it with a `.distignore` (for SVN later) that excludes `design/`, `docs/`, `tests/`, `node_modules/`, `vendor/`, the `AGENTS.md` and `CLAUDE.md` files, dotfiles, `composer.*`, `phpcs.xml.dist`, `phpunit.xml.dist` and `.wp-env*`.
9. `.gitignore` (`node_modules/`, `vendor/`, `build/`, `*.zip`, `.wp-env.override.json`), `.editorconfig`, `LICENSE` (full GPLv2 text).
10. Optional `.github/workflows/ci.yml`: on push, `npm ci`, `composer install`, lint, `test:js`, `test:unit`, `build`.
11. Record pinned versions in `docs/PROGRESS.md`.

**WordPress.org checks this phase:** nothing ships yet. Make sure the zip file list can never include dev files.

**Done when:**

- `npm run build` succeeds (placeholder entry files are fine).
- `npm run lint:js`, `composer run lint`, `npm run test:js` and `composer run test:unit` pass.
- `npx wp-env start` serves WordPress with WooCommerce and Plugin Check active.
- `npm run test:php` runs the integration smoke test.
- `npm run plugin-zip` produces a zip containing only the listed files. Unzip it and list its contents in PROGRESS.

**References:** [@wordpress/scripts](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/), [@wordpress/env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/), [WordPress Coding Standards](https://github.com/WordPress/WordPress-Coding-Standards), [PHPCompatibilityWP](https://github.com/PHPCompatibility/PHPCompatibilityWP), [Plugin Check](https://wordpress.org/plugins/plugin-check/).

---

## Phase 1 — Plugin skeleton and lifecycle

**Goal:** an activatable plugin with correct headers, autoloading, requirement checks, WooCommerce compatibility declarations, safe activation and upgrade, opt-in uninstall, and a first readme.

**Read first:** `AGENTS.md` (Fixed names, WordPress.org rules), `design/system/brand-book.md` (product description wording).

**Build:**

1. `mix-and-max-box-builder.php` header:

   ```php
   /**
    * Plugin Name:       Mix and Max Box Builder
    * Plugin URI:        [YOUR PLUGIN PAGE URL]
    * Description:       Let shoppers build their own box of products and unlock bigger discounts as the box fills. For WooCommerce.
    * Version:           0.1.0
    * Requires at least: 6.6
    * Requires PHP:      7.4
    * Requires Plugins:  woocommerce
    * Author:            [YOUR NAME OR COMPANY]
    * Author URI:        [YOUR WEBSITE]
    * License:           GPL-2.0-or-later
    * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
    * Text Domain:       mix-and-max-box-builder
    * Domain Path:       /languages
    * WC requires at least: 9.0
    * WC tested up to:   [CURRENT WOOCOMMERCE VERSION]
    */
   ```

   Then `defined( 'ABSPATH' ) || exit;`, the constants from `AGENTS.md`, the autoloader, `register_activation_hook()` / `register_deactivation_hook()`, and boot on `plugins_loaded`.
2. In the main file, declare WooCommerce compatibility on `before_woocommerce_init` (guarded with `class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class )`): `declare_compatibility( 'custom_order_tables', __FILE__, true )` and `declare_compatibility( 'cart_checkout_blocks', __FILE__, true )`.
3. `includes/class-autoloader.php`: maps `MixMax\BoxBuilder\Sub\Class_Name` to `includes/sub/class-class-name.php` (lowercase, underscores to dashes). Register it with `spl_autoload_register`.
4. `includes/class-plugin.php`: boots modules in order. Each module class has a `register()` method that adds its hooks. Later phases add modules. Keep the list in one array, so a phase adds one line.
5. `includes/class-requirements.php`: confirms WooCommerce is loaded and at least 9.0. If not:
   - Show a dismissible notice. Only users who can activate plugins see it, and only on the Plugins screen and our screens.
   - Boot no other module.

   `Requires Plugins` already blocks activation on WordPress 6.5+. The check covers WooCommerce being deactivated or downgraded later.
6. `includes/class-installer.php`:
   - On activation: add `mmbb_version` and `mmbb_db_version`, run `dbDelta()` over a schema registry (empty now; Phase 3 adds tables), and seed default settings.
   - Run the same upgrade routine on `admin_init` whenever the stored versions are older. Activation hooks don't run on plugin updates or for new sites in a network.
   - Deactivation clears scheduled actions (the list fills in Phase 9). It doesn't flush rewrite rules, because the plugin has no public post types.
7. `uninstall.php`: check `WP_UNINSTALL_PLUGIN`. Only if `mmbb_settings['delete_data']` is true:
   - Delete `mmbb_*` options and transients.
   - Delete `mmbb_campaign` posts and their meta.
   - Delete the container products the plugin created, identified by the `_mmbb_campaign_id` meta.
   - Drop the `mmbb_*` tables.

   Never touch orders. On multisite, repeat for every site.
8. `readme.txt` draft in the WordPress.org format:
   - Title: `=== Mix and Max Box Builder ===`.
   - `Contributors: [your-wporg-username]`.
   - `Tags` (at most 5): `mix and match, product bundles, gift box, box builder, discounts`.
   - `Requires at least: 6.6`, `Tested up to: [CURRENT MAJOR WORDPRESS VERSION]`, `Requires PHP: 7.4`, `Stable tag: 0.1.0`, `License: GPLv2 or later`.
   - A short description of 150 characters or fewer.
   - Sections: Description, Installation, Frequently Asked Questions, Screenshots, Changelog, "Source code and build", and "Third-party resources" (Figtree and Bricolage Grotesque, SIL OFL 1.1).
9. `languages/` with a `.gitkeep`. Plugins hosted on WordPress.org get translations loaded automatically, so `load_plugin_textdomain()` isn't needed.

**WordPress.org checks this phase:** header fields, text domain equal to the slug, the ABSPATH guard in every PHP file, no global functions (namespaced classes only), opt-in data deletion, a readme that validates.

**Done when:**

- In wp-env the plugin activates with WooCommerce active, and deactivates and reactivates without notices.
- With WooCommerce deactivated, the plugin shows its notice and doesn't fatal.
- `composer run lint` is clean.
- `npx wp-env run cli wp plugin check mix-and-max-box-builder` reports no errors.
- Integration tests cover: the installer sets versions, the upgrade routine is idempotent, and uninstall with `delete_data` off keeps data (call the uninstall routine through a testable class method).

**References:** [Header requirements](https://developer.wordpress.org/plugins/plugin-basics/header-requirements/), [Plugin dependencies (Requires Plugins)](https://make.wordpress.org/core/2024/03/05/introducing-plugin-dependencies-in-wordpress-6-5/), [Activation and deactivation hooks](https://developer.wordpress.org/plugins/plugin-basics/activation-deactivation-hooks/), [Uninstall methods](https://developer.wordpress.org/plugins/plugin-basics/uninstall-methods/), [Readme format](https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/), [HPOS recipe book](https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book/), [Cart and Checkout blocks compatibility](https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/).

---

## Phase 2 — Design system inside the plugin

**Goal:** the Mix and Max design system becomes plugin code: tokens and fonts in CSS, 34 React components on `@wordpress/element`, every string translatable, and money formatted the WooCommerce way.

**Read first:**

- `design/README.md`
- `design/system/brand-book.md`
- `design/system/tokens.json`, `design/system/tokens.css`
- `design/system/components/index.jsx`, `design/system/components/components.css`, `design/system/components/index.d.ts`
- `design/system/components/guidelines/*.md`
- `design/screens/components/*.png`

**Build:**

1. **Tokens.** `tools/build-tokens.mjs`, run by `npm run tokens`, reads `design/system/tokens.json` and writes `src/styles/tokens.css`:
   - Light values go under `.mmbb-root`, dark values under `.mmbb-root[data-theme="dark"]`.
   - Spacing, radius, shadow and font-family variables also go under `.mmbb-root`.
   - Add `@font-face` rules pointing at `../../assets/fonts/…`. Check the relative path from the built CSS location.
   - Commit the generated file, so the build doesn't depend on `design/`, which doesn't ship.
2. **Fonts.** Copy both woff2 files and both OFL licence files from `design/system/fonts/` into `assets/fonts/`.
3. **Component CSS.** Port `design/system/components/components.css` to `src/styles/components.css`.
   - Remove anything that styles `body` or elements outside `.mmbb-root`.
   - Keep the `prefers-reduced-motion` block.
   - Admin-only layout fixes go in `src/admin/admin.css`, scoped to our screens' body classes. One example: removing `#wpcontent` left padding so `AdminShell` runs edge to edge.
4. **Components.** Split `index.jsx` into one file per component in `src/components/` (`Button.js`, `ProductTile.js` and so on), plus `src/components/index.js`.
   - Replace `const React = window.React` with imports from `@wordpress/element` (`useState`, `useEffect`, `useRef`, `useMemo`, `useId`, `Fragment`, `createElement`).
   - Keep the props exactly as in `index.d.ts`, including the `href` props.
   - Delete the `window.MixMax` assignment.
5. **i18n in components.** Wrap every user-facing default string with `__`, `_n` and `sprintf` from `@wordpress/i18n`, using the domain `mix-and-max-box-builder`. That includes button labels, "Box is full", "Sold out", "Only %d left", the tier sentences, "Deal ends in", "in your box", Subtotal / Box discount / Total, "Add %d more to continue", "%d to go", and aria labels such as Increase, Decrease, Remove and Dismiss.
   - Tier sentences are full translatable strings with placeholders, for example `/* translators: 1: number of items, 2: discount such as "15% off" */ __( 'Add %1$d more to get %2$s', … )`.
   - Use `_n` wherever a count appears.
6. **Money.**
   - Replace `formatMoney(n, '$')` with `src/utils/money.js`, which exports `createMoneyFormatter({ symbol, position, decimals, decimalSeparator, thousandSeparator })`. `position` is one of `left`, `right`, `left_space`, `right_space`.
   - Provide it through a small `MoneyContext`; components read the formatter from the context.
   - PHP passes these values from `get_woocommerce_currency_symbol()`, `get_option( 'woocommerce_currency_pos' )`, `wc_get_price_decimals()`, `wc_get_price_decimal_separator()` and `wc_get_price_thousand_separator()`.
   - Decode HTML entities in the symbol in PHP before passing it.
7. **Icons and art.** Keep the design's own `Icon` set; don't switch to `@wordpress/icons`. Keep `ProductArt` as the fallback for products without images. Real images render `<img>` with `src`, `srcset`, `sizes` and `alt` (the product name) from WooCommerce image data.
8. **Asset registration.** `includes/class-assets.php` registers style handles `mmbb-tokens` and `mmbb-components` from the built CSS. They are not enqueued yet; later phases enqueue them per screen. Version strings come from the `.asset.php` files.
9. **Component tests.** In `tests/js/components/`, render every component with sample props from the design, using `@testing-library/react`. Assert key behaviour: the stepper clamps to min and max, `TierProgress` shows the right sentence for counts 2, 5 and 12 with tiers 4/6/12, `Button` with `href` renders `<a>`, and the money formatter covers all four positions and zero-decimal currencies.

**WordPress.org checks this phase:**

- The built bundles must not contain React. The `.asset.php` dependencies list `react`, `react-dom` or `react-jsx-runtime`, and `wp-element` / `wp-i18n` instead.
- Fonts are local, and the licences ship with them.
- There is no external URL in any CSS.

**Done when:**

- `npm run build`, `npm run lint:js`, `npm run lint:css` and `npm run test:js` pass.
- `rg -n "window\.React|'\\$'|\"\\$\"" src/components` finds nothing.
- `rg -n "https?://" src/styles build/*.css` finds nothing.
- PROGRESS lists any component whose behaviour you changed from the design, with the reason.

**References:** [@wordpress/element](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-element/), [@wordpress/i18n](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/), [Dependency extraction](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-dependency-extraction-webpack-plugin/), [Internationalizing JavaScript](https://developer.wordpress.org/block-editor/how-to-guides/internationalization/), [wp_set_script_translations()](https://developer.wordpress.org/reference/functions/wp_set_script_translations/).

---

## Phase 3 — Data layer and pricing engine

**Goal:** campaigns, settings, templates, database tables, and the one pricing engine that both PHP and JS use. All of it tested.

**Read first:**

- `design/system/features.md`
- `design/system/components/guidelines/CampaignEditorPage.md`, `SettingsPage.md`, `AnalyticsPage.md`
- `design/prototype/WizardRules.dc.html` (tier editor data)
- `design/prototype/CampaignsTemplates.dc.html` (templates)

**Build:**

1. **Post type** `mmbb_campaign` (`includes/campaigns/class-post-type.php`):
   - `public => false`, `show_ui => false`, `show_in_rest => false`, `rewrite => false`, `supports => array( 'title' )`.
   - Capabilities mapped to `manage_woocommerce`.
   - Statuses: `draft` and `publish`. "Paused" is the `_mmbb_paused` meta.
2. **Config schema** (`includes/campaigns/class-config.php`): one schema as a PHP array with defaults, used for sanitizing, validating and the REST `args`. The stored shape is JSON in post meta `_mmbb_config`. Clamp string lengths: headline 80, intro 240, sticker 24, cta 32.

   | Key | Shape |
   | --- | --- |
   | `type` | `tiered` \| `fixed` \| `bundle` |
   | `box` | `capacity` 1–48, `min_items` 1–capacity, `allow_duplicates` bool, `max_per_product` 1–capacity, `hide_sold_out` bool |
   | `tiers` | ≤ 6 × `{ qty, discount_type: percent\|fixed_amount\|box_price, value }`, unique ascending `qty` ≤ capacity, percent 0–90 |
   | `sizes` | ≤ 6 × `{ qty, discount_type, value, tag: ''\|popular\|best_value }` (fixed box) |
   | `bundle` | `{ qty, price }` |
   | `products` | `source: manual\|category\|tag`, `ids[]` (products or variations), `term_ids[]`, `order: manual\|bestselling\|price\|newest`, `caps: { id: max }` |
   | `schedule` | `start`, `end` (UTC ISO 8601 or null), `countdown_days` 0–30 |
   | `extras` | `gift_message` bool, `gift_wrap: { enabled, fee }` |
   | `design` | `layout: default\|panel\|bar\|both`, `columns: 0\|3\|4\|5` (0 = use settings), `headline`, `intro`, `sticker`, `cta_label`, `show_hero`, `show_ladder`, `show_stickers`, `accent: max\|theme`, `theme: light\|dark` |
   | `placement` | `page_id` |
   | `container_product_id` | set in Phase 7 |

3. **Repository** (`class-campaign-repository.php`):
   - `find`, `query` (status, search, type, orderby, page, per_page), `create_from_template`, `save`, `duplicate`, `pause`, `resume`, `delete`.
   - Computed status: `draft`, `scheduled`, `active`, `ending_soon` (fewer than 7 days left), `ended`, `paused`. Compute it in the store's time zone (`wp_timezone()`).
   - Fire `do_action( 'mmbb_campaign_saved', $id, $config )`.
4. **Templates** (`class-templates.php`): Start blank, Holiday treat box, Build-a-spa kit, Snack pack and Build-a-gift, with values taken from the prototype. Filterable with `mmbb_templates`.
5. **Settings** (`includes/settings/class-settings.php`): `register_setting()` for option `mmbb_settings` with `type => object`, a sanitize callback and defaults. `Settings::get( $key )` reads it. Fields:
   - `enabled`, `default_page_id`, `columns`, `summary_layout`, `stickers`
   - `low_stock` (`enabled`, `threshold`), `unlock_toast`, `cta_label`, `empty_slot_hint`
   - `cart_display` (`bundle`|`items`), `edit_from_cart`, `allow_coupons` (default false), `reduce_item_stock` (default true)
   - `email_list_items`, `email_gift_message`
   - `assets_only_on_builder` (true), `analytics_enabled` (true), `analytics_retention_days` (90), `delete_data` (false)
6. **Tables**, added to the installer's `dbDelta()` registry with `$wpdb->get_charset_collate()`. Bump `mmbb_db_version`.
   - `{prefix}mmbb_events`: `id` BIGINT UNSIGNED AUTO_INCREMENT PK, `campaign_id`, `event` VARCHAR(20), `session` CHAR(32), `product_id` NULL, `qty` SMALLINT, `value` DECIMAL(19,4) NULL, `order_id` NULL, `created_at` DATETIME. Indexes `(campaign_id, event, created_at)` and `(order_id)`.
   - `{prefix}mmbb_stats_daily`: `day` DATE, `campaign_id`, `views`, `started`, `tier_reached`, `carts`, `orders`, `items`, `revenue` DECIMAL(19,4), `discount` DECIMAL(19,4). PK `(day, campaign_id)`.
7. **Pricing engine**: `includes/class-pricing.php` (pure PHP, no WordPress calls) and `src/shared/pricing.js`, with identical logic.
   - **Input:** `config`; `items` as `[{ product_id, variation_id, qty, unit_price_minor }]`; `options` as `{ size, gift_wrap, decimals }`.
   - **Rules:**
     - `count` = Σ `qty`. `subtotal` = Σ `qty × unit_price_minor`.
     - **Tiered:** valid when `min_items ≤ count ≤ capacity`. The reached tier is the highest tier with `qty ≤ count`.
     - **Fixed:** the chosen size must exist and `count` must equal its `qty`.
     - **Bundle:** `count` must equal `bundle.qty`.
     - **Discount:** `percent` = round(subtotal × value / 100); `fixed_amount` = min(value, subtotal); `box_price` = max(0, subtotal − value), and the box never costs more than its items. Bundle uses `box_price` with `bundle.price`.
     - The gift wrap fee is added after the discount and is never discounted.
     - Round half up, once, in minor units.
   - **Output:** `{ valid, errors[], count, subtotal, discount, fee, total, tier|null, next: { qty, needed, discount_type, value }|null }`.
   - **Fixtures:** `tests/fixtures/pricing-cases.json` with at least 25 cases. Cover every type and discount mode, tier boundaries, `box_price` above the subtotal, rounding (3 × 3.33 at 15%), a zero-decimal currency, invalid counts, and fees. A PHPUnit unit test and a Jest test both run every case and must match.
8. **Developer hooks:** filters `mmbb_campaign_config_defaults`, `mmbb_templates` and `mmbb_pricing_quote`; action `mmbb_campaign_saved`. Document them in a "Developers" readme FAQ entry.

**WordPress.org checks this phase:** prefixed keys and tables, `dbDelta` formatting (two spaces after `PRIMARY KEY`, one field per line), `$wpdb->prepare()` for every variable query, no autoloaded big options.

**Done when:**

- Unit tests for Config (bad input, bounds, tier sort and dedupe, length clamps) and computed status (time-zone edges) pass.
- The shared pricing fixtures pass in both PHP and JS.
- Integration tests for repository CRUD, duplicate and the installer creating both tables pass.
- `composer run lint` is clean and Plugin Check shows no errors.

**References:** [register_post_type()](https://developer.wordpress.org/reference/functions/register_post_type/), [register_setting()](https://developer.wordpress.org/reference/functions/register_setting/), [dbDelta()](https://developer.wordpress.org/reference/functions/dbdelta/), [$wpdb::prepare()](https://developer.wordpress.org/reference/classes/wpdb/prepare/).

---

## Phase 4 — REST API for the admin

**Goal:** every admin screen has a typed, permission-checked route to call.

**Read first:** `AGENTS.md` (security rules), `design/system/components/guidelines/DashboardPage.md`, `CampaignsPage.md`, `CampaignEditorPage.md`, `AnalyticsPage.md`, `SettingsPage.md` (each one's "Data" line).

**Build:** controllers under `includes/rest/` extending `WP_REST_Controller`, namespace `mmbb/v1`. Every route uses `permission_callback => current_user_can( 'manage_woocommerce' )`, declares `args` (type, enum, min/max, sanitize, validate) and provides `get_item_schema()`. Errors are `WP_Error` with a code, a translated message and an HTTP status.

| Route | Methods | Notes |
| --- | --- | --- |
| `/campaigns` | GET, POST | GET: `status`, `search`, `type`, `orderby` (`date`, `revenue`, `conversion`), `page`, `per_page` ≤ 50. The response includes `counts` per status for the tabs. POST: `{ template }` creates a draft. |
| `/campaigns/(?P<id>\d+)` | GET, PUT, PATCH, DELETE | PATCH is for autosave and accepts a partial config. DELETE moves the campaign to the trash and its container product to the trash. |
| `/campaigns/(?P<id>\d+)/duplicate` | POST | |
| `/campaigns/(?P<id>\d+)/publish` | POST | `{ placement: new_page\|existing_page\|none, page_id, page_title, page_slug }`. Phase 6 implements it. Define the contract now. |
| `/campaigns/(?P<id>\d+)/preview` | GET | The public storefront payload, used by the wizard preview and the block editor. Phase 8 fills it. |
| `/campaigns/bulk` | POST | `{ action: pause\|resume\|duplicate\|delete, ids[] }`. |
| `/products` | GET | `search`, `category`, `tag`, `include[]`, `page`, `per_page`. Returns id, parent, name, sku, price (minor units and HTML), regular price, stock status and quantity, `purchasable`, thumbnail `src`/`srcset`/`alt`, and category names. Only supported product types. |
| `/terms` | GET | Product categories and tags for the pickers. |
| `/pages` | GET | Pages for the placement select, with `has_builder`. |
| `/settings` | GET, POST | Uses `Settings` sanitize. |
| `/setup` | GET | Checklist state: WooCommerce ok, has campaign, has products, placed on a page (`has_block( 'mmbb/box-builder' )` or `has_shortcode( …, 'mmbb_box' )`), test order done (option `mmbb_setup_test_done` or any order with a box line), live. Also `POST { test_done: true }`. |
| `/stats` | GET | `range`. Placeholder zeros until Phase 9; the final shape is defined now. |
| `/analytics` | GET | `range`, `from`, `to`, `campaign`, `compare`. Placeholder until Phase 9. |

`apiFetch` sends the REST nonce automatically in wp-admin. Don't add a second nonce scheme for admin routes.

**WordPress.org checks this phase:** no `__return_true` on any of these routes; every input sanitized; every output built from arrays (no HTML strings except WooCommerce's `price_html`, which is already escaped).

**Done when:** integration tests per route cover a logged-out request (401), a subscriber (403), invalid args (400) and the happy path; schema keys match the responses; lint and Plugin Check are clean.

**References:** [Adding custom endpoints](https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/), [Controller classes](https://developer.wordpress.org/rest-api/extending-the-rest-api/controller-classes/), [Schema](https://developer.wordpress.org/rest-api/extending-the-rest-api/schema/), [@wordpress/api-fetch](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-api-fetch/), [Checking user capabilities](https://developer.wordpress.org/plugins/security/checking-user-capabilities/).

---

## Phase 5 — Admin app: shell, dashboard, campaigns

**Goal:** the wp-admin experience up to the campaign list, matching the designs: menu, AdminShell, Dashboard (first run and active), Campaigns list, template picker and delete dialog.

**Read first:**

- `design/screens/DashboardPage.png`, `design/screens/CampaignsPage.png`
- `design/prototype/Main.dc.html`, `DashboardFirstRun.dc.html`, `Campaigns.dc.html`, `CampaignsTemplates.dc.html`, `CampaignsDelete.dc.html`, `canvas.json` (developer notes for Admin)
- Guidelines: `AdminShell`, `PageHeader`, `StatCard`, `LineChart`, `BarList`, `DataTable`, `EmptyState`, `Notice`, `Tabs`, `Toast`, `DashboardPage`, `CampaignsPage`

**Build:**

1. **Menu** (`includes/admin/class-menu.php`): `add_menu_page()` titled "Mix and Max", capability `manage_woocommerce`, slug `mmbb`, a dashicon such as `dashicons-archive`, positioned after WooCommerce Products. Submenus: Dashboard (`mmbb`), Campaigns (`mmbb-campaigns`), Analytics (`mmbb-analytics`), Settings (`mmbb-settings`). Each callback checks the capability, then prints `<div id="mmbb-admin" class="mmbb-root" data-page="…"></div>`.
2. **Assets:**
   - Enqueue `build/admin.js` and its CSS (plus `mmbb-tokens` and `mmbb-components`) only when the hook suffix is one of our four pages.
   - Pass data with `wp_add_inline_script( 'mmbb-admin', 'window.mmbbAdmin = ' . wp_json_encode( $data ) . ';', 'before' )`. `$data` holds `page`, `urls` (all four pages and the new-campaign flow), `money`, `adminUrl`, `version`, `wcVersion` and `timezone`.
   - Call `wp_set_script_translations( 'mmbb-admin', 'mix-and-max-box-builder' )`.
3. **App** (`src/admin/`): `index.js` mounts with `createRoot` from `@wordpress/element`. `App.js` picks the screen from `data-page` plus the `action`, `id` and `step` query args. `api.js` wraps `apiFetch` with `path: '/mmbb/v1/…'`. `AdminShell` nav items use real `admin.php?page=…` hrefs, so the browser's back button and WordPress's own menu both work.
4. **Dashboard:**
   - **First-run state** (no box has sold yet): welcome header, the "Launch your first box" panel, the 3-step explainer, and the setup checklist from `/setup`, with the next step highlighted and its action inline.
   - **Active state:** checklist card (until complete or dismissed), date range (7/30/90 days) scoping every number, four StatCards, the revenue LineChart, Top campaigns, the Live now card (Countdown to the real end date), and Most-picked products.
   - "Copy shortcode" uses `navigator.clipboard` and shows a Toast.
5. **Campaigns list:** tabs with counts, debounced search, type filter, sort, 20 per page, row selection with the bulk bar (Duplicate, Pause, Delete), row actions (Edit link, Delete), placement column (page with block, shortcode, or a "Not placed" warning), and a status Badge with a dot.
6. **Pop-ups.** Add one accessible `Modal` component to `src/components/`, drawn from tokens as in the prototype: scrim, `surface`, `radius-xl`, `shadow-raise`. It needs `role="dialog"` (or `alertdialog`), `aria-modal`, labelled heading, focus trap, Esc to close, and focus returned to the opener.
   - **Template picker:** choosing a template POSTs `/campaigns` and opens the wizard at step 1.
   - **Delete dialog:** offers Cancel, "Pause instead" and Delete. Focus starts on Cancel.
7. **States:** while data reloads, keep the previous render at reduced opacity, with no layout jump. Errors show a critical `Notice` with Retry. Empty states follow the design.

**WordPress.org checks this phase:**

- Assets load only on our pages. Open Posts or Plugins and confirm `mmbb-*` handles are absent.
- No notices outside our screens.
- Capability check inside every page callback.
- No `<script>` tags printed.

**Done when:**

- Every screen renders in wp-env against real REST data. Compare each with its PNG or prototype and list visual gaps in PROGRESS.
- Jest tests for the list state (filters, selection, bulk) and the Modal (focus trap, Esc) pass.
- Lint, build and Plugin Check are clean.

**References:** [Administration menus](https://developer.wordpress.org/plugins/administration-menus/), [wp_add_inline_script()](https://developer.wordpress.org/reference/functions/wp_add_inline_script/), [Admin notices: Guideline 11](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/), [WordPress accessibility handbook](https://make.wordpress.org/accessibility/handbook/).

---

## Phase 6 — Campaign wizard

**Goal:** a merchant can create, edit and publish a campaign through the 5-step wizard, with autosave, the unsaved-changes bar and a live shopper preview.

**Read first:**

- `design/prototype/WizardBasics.dc.html`, `WizardProducts.dc.html`, `WizardRules.dc.html`, `WizardDesign.dc.html`, `WizardPublish.dc.html`, `WizardPublished.dc.html`
- `design/screens/CampaignEditorPage.png`
- Guidelines: `CampaignEditorPage`, `Steps`, `ChoiceCard`, `TextField`, `SegmentedControl`, `Toggle`, `QuantityStepper`, `TierProgress`, `ProductTile`, `BoxSummaryBar`, `BoxPanel`
- `canvas.json` notes for the wizard

**Build:**

1. **Routing:** `admin.php?page=mmbb-campaigns&action=edit&id={id}&step={basics|products|rules|design|publish|published}`. `Steps` items carry hrefs; finished steps stay clickable. Next is the primary button, Back is secondary, Save draft is ghost.
2. **State:**
   - One reducer holds the draft config, the saved copy and the dirty flag.
   - The dark unsaved-changes bar appears on the first edit: Discard restores the saved copy, Save campaign sends a PUT.
   - Autosave every 30 seconds while dirty (PATCH), plus a `beforeunload` warning.
   - Use the sanitized config from the server's response as the new saved copy.
3. **Step 1, Basics:** campaign name, page address, headline, intro line, schedule (Always on / Between dates, as `datetime-local` inputs in the store time zone, converted to UTC for storage), countdown toggle, and the time-zone notice.
4. **Step 2, Products:**
   - Source (Pick products / By category / By tag); debounced search via `/products`; category chips.
   - A list with checkboxes and stock badges (Only N left, Out of stock disabled).
   - The "In this box" list: reorder with keyboard-accessible up/down buttons plus a drag handle, a per-product cap stepper, and remove.
   - Don't add a drag-and-drop library unless PROGRESS justifies it.
5. **Step 3, Box rules:**
   - Type ChoiceCards; capacity and minimum; duplicates and per-product cap; hide sold-out.
   - Tiers editor: add, remove, edit, plus the discount-type control. Validate inline: quantities ascending and ≤ capacity, discounts in bounds.
   - Fixed-box sizes editor with "Most popular" and "Best value" tags; bundle quantity and price.
   - Extras: gift message, gift wrap fee.
   - The "Shoppers read: …" sentence comes from `src/shared/pricing.js` plus the component i18n strings, never hard-coded.
   - The shopper preview mounts the real storefront components with the draft config and the selected products' data.
6. **Step 4, Design:** layout ChoiceCards; products per row; headline, sticker and button text; toggles for sticker, tier ladder and countdown; accent (Max Orange, or the theme colour: `var(--wp--preset--color--primary, var(--max))`); light or dark builder theme. The preview updates live.
7. **Step 5, Publish:**
   - **New page:** create a page with title and slug whose content is `<!-- wp:mmbb/box-builder {"campaignId":ID} /-->`.
   - **Existing page:** if `has_blocks()`, prepend that block to the content; otherwise prepend the shortcode.
   - Also: copy the shortcode, the pre-launch checklist (placed, schedule, test order with "Open builder" and a "Test order placed" checkbox that calls `/setup`), and Go live. Go live calls `/publish`, which validates the whole config, publishes the campaign, creates the container product (via Phase 7's service; if Phase 7 isn't done yet, call an interface it will implement), and saves `placement.page_id`.
8. **Published screen:** live URL with Copy link, View on store, Back to dashboard, and the three next-step cards.
9. **Validation gate:** Next stays blocked while the step has errors, and the errors show inline. Go live requires at least one product and valid rules.

**WordPress.org checks this phase:**

- Page creation and editing go through `wp_insert_post()` / `wp_update_post()` with `current_user_can( 'edit_pages' )`, and through `publish_pages` when publishing.
- Sanitize page titles and slugs.
- Never write unsanitized HTML into `post_content`; only the generated block comment or shortcode.

**Done when:**

- In wp-env you can go from the template picker through Go live to the published screen, reload any step without losing data, and autosave fires.
- Jest covers the reducer and every validation rule.
- Integration tests cover publish with a new page, an existing block page and an existing classic page, and refusal when the config is invalid.
- Lint, build and Plugin Check are clean.

**References:** [wp_insert_post()](https://developer.wordpress.org/reference/functions/wp_insert_post/), [has_blocks()](https://developer.wordpress.org/reference/functions/has_blocks/), [Block editor key concepts (serialization)](https://developer.wordpress.org/block-editor/explanations/architecture/key-concepts/).

---

## Phase 7 — Cart, orders and stock

**Goal:** a box becomes one correct cart line, priced on the server, that survives sessions, checks out through classic or block checkout, records its contents on the order, and reduces each item's stock.

**Read first:** `design/prototype/Cart.dc.html`, `design/prototype/OrderEmail.dc.html`, `design/system/features.md`, `includes/class-pricing.php`, and the WooCommerce links below.

**Build:**

1. **Container product** (`includes/cart/class-container-products.php`): when a campaign is published (and whenever its config is saved without one), create a simple product named after the campaign.
   - Settings: `catalog_visibility` hidden, published, `manage_stock` false, regular price 0, meta `_mmbb_campaign_id`. Keep its title in sync with the campaign.
   - Make it purchasable only through the builder: `woocommerce_is_purchasable` returns false unless the cart item carries `mmbb_box`.
   - In the Products list, label it "Box container — managed by Mix and Max" and warn on its edit screen.
   - Trashing a campaign trashes its container.
2. **Add-to-cart endpoint:** `add_action( 'wc_ajax_mmbb_add_box', … )` and `wc_ajax_mmbb_nonce`. URLs come from `WC_AJAX::get_endpoint()`.
   - **Request:** `nonce`, `campaign_id`, `items[{ product_id, variation_id, qty }]`, `size` (fixed box), `gift { enabled, message }` and an optional `edit_key`.
   - **Order of checks:**
     1. `check_ajax_referer( 'mmbb_add_box', 'nonce', false )`. On failure, return HTTP 403 with `{ code: 'mmbb_nonce_expired' }`. The front end then GETs a fresh nonce from `wc-ajax=mmbb_nonce` and retries once. Cached pages keep working.
     2. Load the campaign. It must be active and within its schedule.
     3. Sanitize and validate every item: the product belongs to the campaign, is purchasable, and has stock for the requested quantity plus any already in the cart. Check duplicates and caps, capacity, minimum and size against the Config rules.
     4. Compute the quote with `Pricing`, using unit prices from WooCommerce, never from the request.
     5. If `edit_key` is set, remove that line first.
     6. Add the container product with cart item data `mmbb_box = { campaign_id, items[{ product_id, variation_id, qty, unit_price_minor }], size, gift, quote, hash }`.
   - **Respond:** `wp_send_json_success( { cart_url, cart_hash } )`, or `wp_send_json_error( { code, message }, status )` with translated messages.
3. **Sessions:** use `woocommerce_get_cart_item_from_session` to restore `mmbb_box`.
4. **Pricing in the cart:** in `woocommerce_before_calculate_totals` (priority 20, guarded so it runs once per calculation), for every `mmbb_box` line:
   - Re-check that its items are still purchasable and in stock. Otherwise remove the line and `wc_add_notice()` a clear message.
   - Recompute the quote from current product prices (sale prices included), then `$item['data']->set_price( total )`.
   - Set the weight to the sum of child weights so shipping is right.
   - Let WooCommerce tax the line with the container product's tax class (standard by default). Mixed tax classes inside one box are a known limitation: document it in the readme FAQ and point to the items mode.
5. **Line display:** `woocommerce_get_item_data` adds Contents ("2 × Brown Butter Chip …"), Box discount ("10% (−$3.00)"), Gift wrap, and Gift message (escaped). This feeds both the classic cart and the Store API (Cart and Checkout blocks). When a next tier exists, add an upsell row: "Add 1 more item to get 15% off".
6. **Edit box:**
   - Classic cart: `woocommerce_after_cart_item_name` prints an "Edit box" link to the builder page with `?mmbb_edit={cart_item_key}` (`esc_url`, `wp_nonce_url` not needed because it only preloads).
   - Cart block: research the Store API and `registerCheckoutFilters` options. Implement the best supported approach and document the result in PROGRESS.
7. **Coupons:** `woocommerce_coupon_is_valid_for_product` returns false for box lines unless `allow_coupons` is on.
8. **Orders:** in `woocommerce_checkout_create_order_line_item` (used by both classic and Store API checkout), copy `mmbb_box` into line item meta.
   - Hidden meta: `_mmbb_box` (JSON).
   - Visible meta: Contents, Box discount, Gift message.
   - Hide internal keys with `woocommerce_hidden_order_itemmeta`.
   - Set order meta `_mmbb_has_box` through CRUD.
9. **Stock:** when `reduce_item_stock` is on, after WooCommerce reduces order stock (`woocommerce_reduce_order_stock`), reduce each child with `wc_update_product_stock( $product, $qty, 'decrease' )`, add an order note, and flag the line `_mmbb_stock_reduced`. Reverse this on `woocommerce_restore_order_stock` (cancellations) only for flagged lines. The container product never manages stock.
10. **First order:** when the first order containing a box is created, set `mmbb_setup_test_done`.
11. **Items mode** (`cart_display = items`): add each child as its own line with the per-item discounted price and `mmbb_parent` linking to a zero-priced container header line. Removing the header removes its children, and child quantities are locked. Implement this fully for the classic cart. For the Cart block, implement what the Store API supports and record the gaps. If they can't be closed, show a notice in Settings next to the option.

**WordPress.org checks this phase:**

- The AJAX handler does nonce, then sanitize, then validate, and never trusts prices from the request.
- Orders are touched only through CRUD.
- No direct SQL on WooCommerce tables.

**Done when:**

- Integration tests pass for: a valid box is added; invalid boxes are rejected (over capacity, foreign product, out of stock, wrong size, tampered price ignored); the total is recomputed when a product price changes; coupons are excluded by default; order meta is present; stock is reduced and then restored on cancel; the nonce-expired code is returned.
- Manual check in wp-env with HPOS on and off (WooCommerce › Settings › Advanced › Features), the classic `[woocommerce_cart]`/`[woocommerce_checkout]` pages and the Cart/Checkout blocks, and Cash on delivery. Record results in PROGRESS.
- Lint and Plugin Check are clean.

**References:** [WooCommerce cart & checkout blocks](https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/), [Extending the Store API](https://developer.woocommerce.com/docs/apis/store-api/extending-store-api/), [HPOS recipe book](https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book/), [WooCommerce extension best practices](https://developer.woocommerce.com/docs/extensions/best-practices-extensions/compatibility/), [WooCommerce code reference](https://woocommerce.github.io/code-reference/).

---

## Phase 8 — Storefront: block, shortcode, builder

**Goal:** shoppers build boxes on any page, through the block or the shortcode, on desktop and phone, exactly as designed.

**Read first:**

- `design/screens/StorefrontPage.png`, `StorefrontMobile.png`, and the two `-dark` variants
- `design/prototype/StoreTiered.dc.html`, `StoreFixed.dc.html`, `MobileFill.dc.html`, `MobileDrawer.dc.html`, `MobileComplete.dc.html`, `BlockEditor.dc.html`
- Guidelines: `ProductTile`, `BoxSlots`, `TierProgress`, `BoxPanel`, `BoxSummaryBar`, `BoxSizePicker`, `Countdown`, `Sticker`, `Toast`, `Chips`, `StorefrontPage`, `StorefrontMobile`
- `canvas.json` notes for the storefront

**Build:**

1. **Block** `src/blocks/box-builder/block.json`:
   - `apiVersion` 3, `name` `mmbb/box-builder`, `title` "Mix and Max Box Builder", `category` `woocommerce`, `textdomain`.
   - Attributes: `campaignId` (number), `layout` (`default|panel|bar|both`), `columns` (number), `showHero` (boolean, default true).
   - `supports: { align: [ 'wide', 'full' ], html: false }`.
   - `editorScript` and `editorStyle` for the editor; `viewScript` is the storefront app; `style` is tokens plus components.
   - `"render": "file:./render.php"`.

   Register it with `register_block_type( MMBB_PATH . 'build/blocks/box-builder' )`.
2. **Renderer** (`includes/storefront/class-renderer.php`), shared by `render.php` and the shortcode:
   - If the campaign isn't live, render nothing for shoppers. Users with `manage_woocommerce` see a small notice with a link to the campaign.
   - Otherwise output `<div {get_block_wrapper_attributes()} class="mmbb-root mmbb-builder" data-theme="…" data-mmbb-id="{instance}">`. Inside it, a server-rendered heading and a "Loading your box…" placeholder, replaced on mount.
   - Attach the payload with `wp_add_inline_script( $view_handle, 'window.mmbbBuilders = window.mmbbBuilders || {}; window.mmbbBuilders["{instance}"] = ' . wp_json_encode( $payload ) . ';', 'before' )`.
   - **Payload:** public config (type, rules, tiers or sizes or bundle, design texts, schedule end and countdown days), resolved products (id, name, short meta, price in minor units, compare-at price, stock status, stock quantity only when ≤ the low-stock threshold, image `src`/`srcset`/`alt`, categories), money format, nonce `mmbb_add_box`, `wc-ajax` URLs, cart URL, and preloaded items when `?mmbb_edit={key}` matches a box line of this campaign in the current cart.
   - Products resolve on the server, cached in a transient that is busted on product save and campaign save. Cap at 200 products per campaign.
3. **Shortcode** `[mmbb_box id="12"]`: same renderer, and it enqueues the same handles.
4. **Storefront app** (`src/storefront/`):
   - Mounts every `.mmbb-builder` on the page, so several builders on one page work.
   - Implements Tiered mix, Fixed box (size picker; changing size trims the box) and Bundle price, using `src/components` and `src/shared/pricing.js`. Enforce capacity, caps and duplicates in the reducer.
   - Behaviour: tier messages in a live region; one Toast per newly unlocked tier (when the setting is on); Countdown only when an end date exists and is within `countdown_days`; low-stock line; sold-out tiles disabled (or hidden, per config); category chips and sort on the client.
   - **Layout:** desktop is the grid plus a sticky `BoxPanel` (`panel` or `both`). Below 760px of container width: a 2-up grid plus a sticky `BoxSummaryBar`, and a bottom-sheet drawer with focus trap and Esc that shows the box, gift option and message, totals and checkout.
   - **Add to cart:** POST `mmbb_add_box`. On `mmbb_nonce_expired`, refresh the nonce once and retry. On success, go to the cart URL. On error, show the server's message in a `Notice`.
   - Keep the box in progress in `sessionStorage` under `mmbb:box:{campaignId}`, wrapped in try/catch, so a reload keeps the shopper's picks.
   - Call `track()` from `src/storefront/track.js`, a no-op stub that Phase 9 fills.
5. **Theme fit:** everything is scoped under `.mmbb-root`, with no global resets. The wrapper respects alignwide and alignfull. Test with Twenty Twenty-Five (block theme) and Storefront (classic theme). Images use the theme's aspect-ratio-safe CSS. Touch targets are at least 44px.
6. **Editor** (`edit.js`):
   - `InspectorControls` with a campaign `SelectControl` (active and scheduled campaigns from `/campaigns`), layout `ToggleGroupControl`, columns, Show the hero, and an "Edit campaign" link.
   - The canvas renders the real storefront app in preview mode from `/campaigns/{id}/preview`, with add-to-cart disabled.
   - Before a campaign is chosen, show a `Placeholder` with "Create campaign".
   - Match `BlockEditor.dc.html`.

**WordPress.org checks this phase:**

- `viewScript` and styles load only on pages containing the block; the shortcode enqueues them only when it runs.
- Data goes through `wp_add_inline_script` with `wp_json_encode`.
- `render.php` escapes everything, and its wrapper attributes come from `get_block_wrapper_attributes()`.
- No external images or fonts.
- With `assets_only_on_builder` on, nothing of ours loads on other pages.

**Done when:**

- In wp-env you can insert the block, pick a campaign, build a box on the front end, check out, and edit the box from the cart.
- The shortcode works, and two builders on one page work.
- At 390px wide the phone layout matches `MobileFill`, `MobileDrawer` and `MobileComplete`.
- The source of a page without a builder contains no `mmbb` assets.
- Jest covers the builder reducer and the add-to-cart retry.
- Lint, build and Plugin Check are clean.

**References:** [block.json metadata](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/), [Block registration](https://developer.wordpress.org/block-editor/getting-started/fundamentals/registration-of-a-block/), [Dynamic blocks](https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/creating-dynamic-blocks/), [Shortcode API](https://developer.wordpress.org/plugins/shortcodes/), [Components reference](https://developer.wordpress.org/block-editor/reference-guides/components/).

---

## Phase 9 — Analytics

**Goal:** real numbers on the Dashboard and Analytics pages, collected privately on the site, rolled up daily, exportable as CSV.

**Read first:** `design/screens/AnalyticsPage.png`, `design/screens/DashboardPage.png`, `design/prototype/Analytics.dc.html`, guidelines `AnalyticsPage`, `StatCard`, `LineChart`, `FunnelChart`, `BarList`.

**Build:**

1. **Events in:**
   - `src/storefront/track.js` batches events (up to 20, or every 5 seconds, and with `navigator.sendBeacon` on `pagehide`) to `POST /mmbb/v1/events`.
   - Events: `view` (once per session per campaign), `add_item` (with `product_id`), `tier_reached` (with tier `qty`). Record `add_to_cart` on the server inside the `mmbb_add_box` handler.
   - The session ID is random, created in the browser and kept in `sessionStorage`. It is neither a cookie nor personal data. The server stores `md5( session . daily salt )`, where the salt option rotates daily.
   - `permission_callback`: verify the `mmbb_track` nonce from the payload and check `Settings::get( 'analytics_enabled' )`. Validate that the campaign is live and that products belong to it.
   - Rate-limit to 120 events per session hash per hour with a transient. A stale nonce on a cached page drops the batch silently.
   - Allow `apply_filters( 'mmbb_track_events', true )` to turn tracking off.
2. **Purchases:** on `woocommerce_order_status_processing` and `_completed`, for orders with `_mmbb_has_box`, insert one `purchase` row per box line, made idempotent by `(order_id, line id)`. Store:
   - `value` = the line total after discounts, excluding tax (matches WooCommerce Analytics net sales)
   - the discount amount
   - the item count

   Mark rows refunded on full refunds or cancellations.
3. **Rollup:** register the daily Action Scheduler action `mmbb_rollup_daily` (`as_schedule_recurring_action`, group `mmbb`, around 02:00 store time), only if `as_has_scheduled_action` returns false.
   - It aggregates yesterday's events and purchases into `mmbb_stats_daily` and deletes raw events older than `analytics_retention_days`.
   - "Today" is computed live from events.
   - Deactivation calls `as_unschedule_all_actions( 'mmbb_rollup_daily' )`.
4. **Queries** (`includes/analytics/class-query.php`, all through `$wpdb->prepare()`):
   - KPIs: revenue, boxes sold, average box value, average items per box, discount given, and builder conversion (purchases ÷ viewing sessions). Each with deltas against the previous period of equal length.
   - Daily series, funnel steps, most-picked products (from `add_item`, joined to product names), where boxes stop (purchased boxes by tier reached), and campaign performance.
   - Ranges: today, 7, 30 or 90 days, or custom; plus a campaign filter. Cache 10 minutes in transients, busted when a purchase is recorded.
5. **REST:** implement `/stats` and `/analytics`. Add `GET /analytics/export`: CSV with `Content-Type: text/csv`, `Content-Disposition` filename `mmbb-analytics-YYYY-MM-DD.csv`, the current filters, and cells beginning with `= + - @` prefixed with `'` to block formula injection.
6. **UI:**
   - **Analytics page:** one filter row scoping everything, four StatCards ("Discount given" uses `upIsGood={false}`), a LineChart of this period against the previous one, the Funnel, two BarLists, and the performance table.
   - **Dashboard:** uses `/stats`. Charts follow the design system: legend for two series, crosshair tooltip, hidden data table.
7. **Privacy:**
   - `wp_add_privacy_policy_content()` with suggested text: builder analytics are anonymous and stay on this site; gift messages are stored with orders.
   - Register a personal data exporter and eraser for gift messages on the customer's orders (`wp_privacy_personal_data_exporters` / `_erasers`). The eraser respects WooCommerce's "Remove personal data from orders" setting.

**WordPress.org checks this phase (Guideline 7):**

- No data leaves the site.
- No cookies are set for tracking.
- The setting turns collection off entirely.
- readme.txt explains what is collected.
- The export route requires `manage_woocommerce`.

**Done when:**

- Integration tests: a fixture of events and orders produces exact expected KPIs, funnel and series.
- The rollup is idempotent: `npx wp-env run cli wp action-scheduler run --hooks=mmbb_rollup_daily` twice gives the same rows.
- Retention cleanup works.
- The CSV escapes formulas.
- Rate limiting works.
- A manual run in wp-env shows live numbers on both pages.
- Lint and Plugin Check are clean.

**References:** [Action Scheduler API](https://actionscheduler.org/api/), [Privacy in plugins](https://developer.wordpress.org/plugins/privacy/), [Detailed Plugin Guidelines (7: no tracking without consent)](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/), [Transients API](https://developer.wordpress.org/apis/transients/).

---

## Phase 10 — Settings screen and emails

**Goal:** every store-wide setting is editable, applied wherever it matters, and box details read well in emails and on the order screen.

**Read first:** `design/screens/SettingsPage.png`, `design/prototype/Settings.dc.html`, `design/prototype/OrderEmail.dc.html`, guidelines `SettingsPage`, `Toggle`, `ChoiceCard`.

**Build:**

1. **Settings page:** the section nav (General, Storefront display, Cart & checkout, Emails, Advanced) with anchors and scroll-spy highlighting, bound to `/mmbb/v1/settings`.
   - The unsaved-changes bar and Save behave like the wizard. Success shows a Toast. Validation messages appear inline.
   - Advanced includes "Collect builder analytics", "Keep raw analytics for N days", and "Delete all plugin data when uninstalling" (with an explanatory description).
2. **Apply everywhere:**
   - Storefront defaults (columns, summary layout, stickers, low-stock threshold, toast, button text, empty-slot hint).
   - Cart display mode, edit from cart, coupons, item stock, asset loading, analytics.
   - Per-campaign design values override the defaults when set.
3. **Emails:**
   - Visible line item meta already appears in WooCommerce emails; make sure the order and format match `OrderEmail.dc.html`.
   - Honour `email_list_items` and `email_gift_message`. When the box is a gift, show the gift message in the admin new-order email but not in emails to the customer. Use `woocommerce_email_before_order_table` / `woocommerce_email_after_order_table` to know which email is rendering (`$sent_to_admin`), and `woocommerce_order_item_get_formatted_meta_data` to filter the rows.
   - Plain-text emails must read cleanly too.
4. **Order screen:** the box line shows the contents list and gift message. Works with HPOS and legacy orders.

**WordPress.org checks this phase:**

- The settings route sanitizes every field (invalid values return 400 with messages).
- No option is stored unsanitized.
- Emails escape user content (the gift message).

**Done when:**

- Integration tests cover settings sanitization and email meta filtering (admin vs customer, gift vs not).
- A WooCommerce email preview, or a real test order email in wp-env (use a mail catcher or log), matches the design.
- Lint and Plugin Check are clean.

**References:** [register_setting()](https://developer.wordpress.org/reference/functions/register_setting/), [WooCommerce emails (code reference)](https://woocommerce.github.io/code-reference/), [Securing output](https://developer.wordpress.org/plugins/security/securing-output/).

---

## Phase 11 — Hardening and WordPress.org compliance

**Goal:** the plugin passes a reviewer's eye before a reviewer sees it. Fix every finding as you go and record each check in PROGRESS.

**Read first:** `AGENTS.md`, [Detailed Plugin Guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/), [Common issues](https://developer.wordpress.org/plugins/wordpress-org/common-issues/).

**Do:**

1. **Plugin Check:** run all categories (plugin repo, security, performance, accessibility, general). Zero errors; every remaining warning fixed or justified in PROGRESS.
2. **PHPCS:** `WordPress-Extra`, `WordPress-Docs` and `PHPCompatibilityWP 7.4-`, with zero errors. Remove `phpcs:ignore` comments that lack a written reason.
3. **Security sweep:** grep and fix.

   ```bash
   rg -n "\$_(GET|POST|REQUEST|COOKIE|SERVER)" includes        # each: wp_unslash + sanitize, nonce where state changes
   rg -n "echo |print |printf\(" includes                         # each: escaped late
   rg -n "\$wpdb->(query|get_|prepare)" includes                  # every variable query prepared
   rg -n "register_rest_route|wc_ajax_" includes                  # permission + nonce reviewed
   rg -n "wp_redirect\(|file_get_contents|curl_|eval\(|base64_|extract\(" includes
   ```

4. **Prefix sweep:** every global name starts with `mmbb` or lives in `MixMax\BoxBuilder`: functions, classes, hooks (`do_action( 'mmbb_…` and `apply_filters( 'mmbb_…`), options, transients, meta keys, handles, nonces, Action Scheduler hooks, CSS classes, `window.*` globals and storage keys.
5. **i18n sweep:**
   - `npx wp-env run cli wp i18n make-pot wp-content/plugins/mix-and-max-box-builder wp-content/plugins/mix-and-max-box-builder/languages/mix-and-max-box-builder.pot --exclude=node_modules,vendor,design,docs,tests` runs without warnings.
   - Every placeholder has a translators comment.
   - Every script handle with strings calls `wp_set_script_translations`, and `block.json` has `textdomain`.
6. **Accessibility:**
   - Keyboard through every admin screen and the storefront (including the drawer and modals).
   - Run axe on the Dashboard, Campaigns, the wizard, Settings and a builder page (dev-only `@axe-core/playwright`).
   - Visible focus everywhere; contrast from tokens.
7. **Performance:**
   - Our assets appear only on our admin pages and builder pages.
   - `mmbb_settings` is the only autoloaded option and is small.
   - No queries on normal page loads.
   - Storefront payload under about 150 KB for 200 products.
   - No N+1 product queries (prime caches).
8. **Compatibility matrix:** record a result table in PROGRESS. Cover:
   - WordPress 6.6 and current
   - WooCommerce 9.0 and current
   - PHP 7.4 and 8.3 or later
   - HPOS on and off
   - Cart/Checkout blocks and classic shortcodes
   - Twenty Twenty-Five and Storefront themes
   - Multisite subsite activation
   - WooCommerce deactivated while the plugin is active (no fatal errors)
   - `WP_DEBUG` with no notices or deprecations
9. **Uninstall:** with `delete_data` off, everything stays. With it on, all plugin data is gone and orders are untouched.
10. **Readme final pass:**
    - An honest description and an FAQ: campaign types, themes, cart blocks, mixed tax classes, how to build from source, developer hooks.
    - "External services: none. This plugin does not connect to any external service."
    - The source and build section, with a link to the public repository.
    - Third-party resources and licences.
    - Screenshot captions matching the assets planned in Phase 12, the changelog, and no keyword stuffing.
11. **Clean-up:** no `console.log`, `error_log`, `var_dump` or debug flags. No TODOs left in shipped code.

**Done when:** every item above shows pass in PROGRESS, or carries a recorded justification a reviewer would accept.

**References:** [Plugin Check](https://wordpress.org/plugins/plugin-check/), [Securing input](https://developer.wordpress.org/plugins/security/securing-input/), [Securing output](https://developer.wordpress.org/plugins/security/securing-output/), [Nonces](https://developer.wordpress.org/plugins/security/nonces/), [Checking user capabilities](https://developer.wordpress.org/plugins/security/checking-user-capabilities/), [Readme format](https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/).

---

## Phase 12 — Release and submission

**Goal:** a 1.0.0 zip that installs cleanly, directory assets ready, the plugin submitted, and the SVN release steps written down.

**Read first:** `docs/PROGRESS.md` (Phase 11 results), [Plugin assets](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/), [Using Subversion](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/).

**Build:**

1. **Version 1.0.0** everywhere: the plugin header, `MMBB_VERSION`, readme `Stable tag`, `package.json`. Add `npm run version:check`, which fails if they differ. Set `Tested up to` to the current major WordPress version and `WC tested up to` to the current WooCommerce version.
2. **Build and inspect:**
   - Run `npm ci && npm run build && npm run plugin-zip`.
   - Unzip into a temp folder and list the files in PROGRESS. Present: `build/`, `src/`, `package.json`, `assets/fonts` with licences. Absent: `node_modules`, `vendor`, `tests`, `design`, `docs`, dotfiles, the `AGENTS.md` and `CLAUDE.md` files.
3. **Fresh install test:** a clean wp-env that maps only the unzipped release and WooCommerce. Run the whole journey:
   - Template, publish, then buy a box with Cash on delivery.
   - Check the order email.
   - Run the rollup and check Analytics.
   - Uninstall with "Delete all plugin data" on.
4. **Directory assets** for SVN `/assets`, not the zip, made from the design system (Max Orange tile, pop yellow, the wordmark in Bricolage):
   - `icon-128x128.png` and `icon-256x256.png`
   - `banner-772x250.png` and `banner-1544x500.png`
   - `screenshot-1.png` … `screenshot-6.png`, matching the readme captions in order: Dashboard, Campaigns, wizard box rules, storefront desktop, storefront phone, block editor
5. **Submit** at https://wordpress.org/plugins/developers/add/ while logged in to your WordPress.org account. Upload the zip and request the slug `mix-and-max-box-builder`.
   - The display name may add "for WooCommerce" at the end. The slug must not start with "woocommerce".
   - Answer reviewer emails by uploading a fixed zip. Keep the version number unless they ask otherwise.
6. **After approval**, follow the documented steps:
   - `svn co` the repository.
   - Copy the release files into `trunk/`.
   - `svn cp trunk tags/1.0.0`.
   - Put the images into `assets/`.
   - `svn ci -m "Release 1.0.0"`, then check the plugin page.
   - For each later release: bump the version, update the changelog, copy to trunk, tag. Never commit work in progress to SVN.
7. **Public source:** push the git repository publicly, tag `v1.0.0`, and make sure the readme links to it.

**Done when:** the zip has passed the fresh install test, the assets exist with the exact names and sizes, the submission is sent (record the date in PROGRESS), and the SVN steps are written down in PROGRESS.

**References:** [Add your plugin](https://wordpress.org/plugins/developers/add/), [Plugin assets](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/), [Using Subversion](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/), [Detailed Plugin Guidelines (14, 15, 16)](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/).

---

## Final submission checklist

- [ ] Slug, folder and text domain are all `mix-and-max-box-builder`. The name doesn't start with another product's trademark.
- [ ] GPLv2-or-later headers and a `LICENSE` file. Every bundled file is GPL-compatible, and the font licences ship with the fonts.
- [ ] The main file has a complete header, including `Requires at least`, `Requires PHP`, `Requires Plugins: woocommerce`, `WC requires at least` and `WC tested up to`.
- [ ] `readme.txt` validates: at most 5 tags, a short description of 150 characters or fewer, `Stable tag` equal to `Version`, a current major `Tested up to`, and sections for external services, source code and third-party resources.
- [ ] Every PHP file starts with the ABSPATH guard. `uninstall.php` checks `WP_UNINSTALL_PLUGIN`.
- [ ] Everything global is prefixed `mmbb` or namespaced `MixMax\BoxBuilder`.
- [ ] Every state change has a capability check, a nonce, sanitized input and late-escaped output.
- [ ] Every REST route has a meaningful `permission_callback`.
- [ ] Every variable SQL query is prepared. Orders are handled only through WooCommerce CRUD.
- [ ] React and the other WordPress libraries come from WordPress, never bundled.
- [ ] No external requests: no CDN, Google Fonts, telemetry or update checker.
- [ ] No locked or trial features, and no nags outside our screens.
- [ ] Assets load only on our admin pages and builder pages, and only through `wp_enqueue_*` and `wp_add_inline_script`.
- [ ] All strings are translatable. JS translations are wired up, and the `.pot` builds cleanly.
- [ ] Source in `src/` plus `package.json` ships in the zip. The readme explains the build and links the public repository.
- [ ] The zip contains no dev or hidden files.
- [ ] Plugin Check shows 0 errors, and PHPCS shows 0 errors.
- [ ] HPOS and Cart/Checkout block compatibility are declared and tested.
- [ ] Data is deleted on uninstall only when the merchant opts in.
- [ ] The fresh install test passed on the release zip.

---

## References

**WordPress.org directory**

- [Detailed Plugin Guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/)
- [Common issues found in review](https://developer.wordpress.org/plugins/wordpress-org/common-issues/)
- [How your readme.txt works](https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/)
- [Plugin assets (icons, banners, screenshots)](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/)
- [Using Subversion](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/)
- [Add your plugin](https://wordpress.org/plugins/developers/add/)
- [Plugin Check (PCP)](https://wordpress.org/plugins/plugin-check/)

**Plugin basics and security**

- [Header requirements](https://developer.wordpress.org/plugins/plugin-basics/header-requirements/)
- [Plugin dependencies in WordPress 6.5](https://make.wordpress.org/core/2024/03/05/introducing-plugin-dependencies-in-wordpress-6-5/)
- [Activation and deactivation hooks](https://developer.wordpress.org/plugins/plugin-basics/activation-deactivation-hooks/)
- [Uninstall methods](https://developer.wordpress.org/plugins/plugin-basics/uninstall-methods/)
- [Securing input](https://developer.wordpress.org/plugins/security/securing-input/) · [Securing output](https://developer.wordpress.org/plugins/security/securing-output/) · [Nonces](https://developer.wordpress.org/plugins/security/nonces/) · [Checking user capabilities](https://developer.wordpress.org/plugins/security/checking-user-capabilities/)
- [Privacy in plugins](https://developer.wordpress.org/plugins/privacy/)
- [WordPress Coding Standards](https://github.com/WordPress/WordPress-Coding-Standards) · [PHPCompatibilityWP](https://github.com/PHPCompatibility/PHPCompatibilityWP)

**JavaScript, blocks and REST**

- [@wordpress/scripts](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/) · [@wordpress/env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/) · [Dependency extraction](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-dependency-extraction-webpack-plugin/)
- [block.json metadata](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/) · [Components reference](https://developer.wordpress.org/block-editor/reference-guides/components/)
- [Internationalization in JavaScript](https://developer.wordpress.org/block-editor/how-to-guides/internationalization/) · [wp_set_script_translations()](https://developer.wordpress.org/reference/functions/wp_set_script_translations/)
- [Adding custom REST endpoints](https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/) · [@wordpress/api-fetch](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-api-fetch/)

**WooCommerce**

- [HPOS recipe book](https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book/)
- [Cart and Checkout blocks for extensions](https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/)
- [Extending the Store API](https://developer.woocommerce.com/docs/apis/store-api/extending-store-api/)
- [Extension compatibility best practices](https://developer.woocommerce.com/docs/extensions/best-practices-extensions/compatibility/)
- [WooCommerce code reference](https://woocommerce.github.io/code-reference/)
- [Action Scheduler API](https://actionscheduler.org/api/)

**Agents**

- [Codex: custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Claude Code: CLAUDE.md and AGENTS.md](https://code.claude.com/docs/en/memory)
