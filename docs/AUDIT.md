# Audit of the plugin before the redesign (Redesign Part 0)

Written 2026-11-11 from the code on branch `redesign` (plugin version 1.0.0). No plugin code was changed. Every name here is frozen; the short list is in the "Frozen identifiers" table in `AGENTS.md`.

A word on vocabulary: the code and stored data say **campaign** where the new design says **box**. The stored names stay `campaign`; only the labels shoppers and merchants read change.

## Identity

| Thing | Value |
| --- | --- |
| Plugin name | ProductBoxes - Mix & Match Box Builder for WooCommerce |
| Slug and folder | `productboxes-mix-and-match-box-builder` |
| Main file | `productboxes-mix-and-match-box-builder.php` |
| Version | `1.0.0` (header, `MMBB_VERSION`, readme `Stable tag`, `package.json`) |
| Requires at least | WordPress 6.6 |
| Requires PHP | 7.4 |
| Requires Plugins | `woocommerce` |
| WC requires at least / tested up to | 9.0 / 11.2.1 |
| Readme `Tested up to` | 7.1 |
| Text domain | `productboxes-mix-and-match-box-builder` |
| Domain Path | `/languages` (holds only a `README.txt`; no `.pot` is committed) |
| Licence | GPL-2.0-or-later |

**Text domain check.** A scan of every `__`, `_e`, `_n`, `_x`, `_nx`, `esc_html__`, `esc_attr__`, `esc_html_e`, `esc_attr_e`, `esc_html_x` and `esc_attr_x` call in `includes/`, `src/`, the main file and `uninstall.php` found 1,002 calls. All 1,002 pass `productboxes-mix-and-match-box-builder` as the last argument. No call uses another domain or omits it. `block.json` declares the same `textdomain`. There is no `load_plugin_textdomain()` call, which is correct for WordPress 6.6+ on WordPress.org.

`wp_set_script_translations()` is called for four handles, all with the frozen domain and `MMBB_PATH . 'languages'`: `mmbb-admin`, `mmbb-components`, `mmbb-storefront` and the block's generated editor handle.

## Code map

### PHP (`includes/`, own autoloader, namespace `MixMax\BoxBuilder`)

File naming is WordPress style: `includes/rest/class-campaigns-controller.php` holds `MixMax\BoxBuilder\Rest\Campaigns_Controller`. `Plugin::register()` runs on `plugins_loaded`, stops early when WooCommerce is missing (`Requirements`), and otherwise calls `register()` on each module.

| File | Responsibility |
| --- | --- |
| `class-autoloader.php` | Autoloads the namespaced classes |
| `class-plugin.php` | Registers the modules in order |
| `class-requirements.php` | WooCommerce check and the admin notice when it fails |
| `class-installer.php` | Activation, `dbDelta()` tables, default settings, version options, multisite, clearing schedules |
| `class-uninstaller.php`, `class-sites.php` | Delete data per site, only when `delete_data` is on |
| `class-assets.php` | Registers `mmbb-tokens` and `mmbb-components`; money settings from WooCommerce |
| `class-pricing.php` | Pricing engine, pure PHP, mirrored by `src/shared/pricing.js` |
| `class-quotes.php` | WordPress-aware entry to pricing (`mmbb_pricing_quote` filter) |
| `settings/class-settings.php` | The `mmbb_settings` option: defaults, sanitize, read, update |
| `campaigns/class-post-type.php` | The private `mmbb_campaign` post type |
| `campaigns/class-config.php` | Config schema: defaults, sanitize, validate (pure PHP) |
| `campaigns/class-campaign-repository.php` | The only reader and writer of campaign posts and meta |
| `campaigns/class-status.php` | Computed status (pure PHP) |
| `campaigns/class-templates.php` | Starting presets for a new campaign (`blank`, `holiday`, `spa`, `snack`, `gift`) |
| `campaigns/class-publisher.php` | Go live: container product, page placement, publish |
| `campaigns/class-placement.php` | Finds the page that shows a campaign |
| `campaigns/class-page-content.php` | Writes the block comment or shortcode into page content |
| `cart/class-add-to-cart.php` | `wc-ajax=mmbb_add_box` |
| `cart/class-box-resolver.php`, `class-box-rules.php` | Validate picks against the campaign and price them from WooCommerce |
| `cart/class-cart-lines.php` | Cart session, server pricing, display, coupons, items mode |
| `cart/class-container-products.php` | The hidden product that carries a box through the cart |
| `cart/class-order-boxes.php`, `class-order-display.php`, `class-box-text.php` | Order line meta, stock, order screens and emails |
| `storefront/class-storefront.php` | Block, shortcode, storefront assets, cache busting |
| `storefront/class-renderer.php` | Renders a builder wrapper and its inline payload |
| `storefront/class-payload.php` | The data the storefront app reads; cached product lists |
| `storefront/class-colors.php` | Resolves campaign design colours into CSS variables |
| `analytics/class-collector.php` | Public `POST mmbb/v1/events`, rate limit, daily salt |
| `analytics/class-rollup.php` | Daily summaries and the purchase ledger (Action Scheduler) |
| `analytics/class-query.php` | Report queries with transient caching |
| `analytics/class-privacy.php` | Privacy policy text and gift-message eraser |
| `admin/class-menu.php`, `class-admin-assets.php` | Menu, mount point, admin assets and `window.mmbbAdmin` |
| `rest/*` | `Rest` boots the controllers; `Base_Controller` holds the namespace and permission check |

### JS (`src/`)

| Entry (webpack) | Source | Output | Notes |
| --- | --- | --- | --- |
| `admin` | `src/admin/index.js` | `build/admin.js`, `admin.css` | Admin app: `App.js` routes by `data-page` and query args to Dashboard, Campaigns, Editor (5 steps), Analytics, Settings |
| `storefront` | `src/storefront/index.js` | `build/storefront.js`, `storefront.css` | The shopper builder |
| `components` | `src/styles/components.js` | `build/components.js`, `components.css` | Design-system components, exposed as `window.mmbbComponents` |
| `tokens` | `src/styles/tokens.js` | `build/tokens.css` | CSS custom properties generated from `design/system/tokens.json` |
| block | `src/blocks/box-builder/` | `build/blocks/box-builder/` | `block.json`, `index.js`, `render.php` |

Shared logic: `src/shared/pricing.js`, `tiers.js`, `colors.js`, `src/utils/money.js`. The admin and the storefront both use the plugin's own components in `src/components/` (42 files, classes `mmbb-*`).

### Build and tools

- `@wordpress/scripts` 31.8.0 with a small `webpack.config.js` that adds the four entries. `npm run build`, `start`, `lint:js`, `lint:css`, `test:js`, `plugin-zip`, `tokens`, `blueprint`.
- `package.json` dependencies: `@wordpress/api-fetch`, `block-editor`, `blocks`, `components`, `element`, `i18n`, `url`. Dev: `@wordpress/env` 10.30.0, `@wordpress/scripts`, `@testing-library/react`, `typescript`.
- `composer.json` is dev only: WPCS 3, PHPCompatibilityWP, PHPUnit 9.6, Yoast polyfills, wp-phpunit. Nothing from Composer ships.
- The release zip is the `files` list in `package.json`; `.distignore` also excludes `design/`, `docs/`, `tests/`, `tools/`, `AGENTS.md` and `CLAUDE.md`.
- Build output today: 622 KB in `build/` (`admin.js` 192 KB, `components.js` 48 KB, `storefront.js` 50 KB, block `index.js` 54 KB, `components.css` 50 KB, `admin.css` 26 KB).
- Fonts shipped: Bricolage Grotesque and Figtree (variable, Latin woff2) with OFL files in `assets/fonts/`.
- Tests: Jest in `tests/js/` (233 tests at the last run), PHPUnit unit tests in `tests/php/unit/` (10 files), integration tests in `tests/php/integration/` (15 files), shared fixtures `tests/fixtures/pricing-cases.json` and `color-cases.json`.

## Imports

JS uses **named ES imports from `@wordpress/*`**, never the `wp.*` globals. The packages come from WordPress through dependency extraction; no copy is bundled.

| Package | Imports in `src/` | Used by |
| --- | --- | --- |
| `@wordpress/element` | 41 files | everything |
| `@wordpress/i18n` | everywhere strings appear | everything |
| `@wordpress/url` | 6 | admin, block |
| `@wordpress/api-fetch` | 2 (`src/admin/api.js`, `src/blocks/box-builder/api.js`) | admin, block |
| `@wordpress/components` | 1 (`src/blocks/box-builder/edit.js`) | block editor only |
| `@wordpress/block-editor`, `@wordpress/blocks` | 1 each | block editor only |

One file imports a type from `react` (resolved to the WordPress copy). The admin app does **not** use `@wordpress/components`, `@wordpress/data`, `@wordpress/notices` or `@wordpress/icons` today. It uses the plugin's own components and its own toast.

| Handle | Kind | File | Dependencies |
| --- | --- | --- | --- |
| `mmbb-tokens` | style | `build/tokens.css` | none |
| `mmbb-components` | style | `build/components.css` | `mmbb-tokens` |
| `mmbb-components` | script | `build/components.js` | `react-jsx-runtime`, `wp-element`, `wp-i18n` |
| `mmbb-admin` | style | `build/admin.css` | `mmbb-components` |
| `mmbb-admin` | script | `build/admin.js` | `react-jsx-runtime`, `wp-api-fetch`, `wp-element`, `wp-i18n`, `wp-url` |
| `mmbb-storefront` | style | `build/storefront.css` | `mmbb-components` |
| `mmbb-storefront` | script | `build/storefront.js` | `react-jsx-runtime`, `wp-element`, `wp-i18n` |
| block editor script (generated handle) | script | `build/blocks/box-builder/index.js` | `react-jsx-runtime`, `wp-api-fetch`, `wp-block-editor`, `wp-blocks`, `wp-components`, `wp-element`, `wp-i18n`, `wp-url` |

The block's `viewScript` and `style` are both `mmbb-storefront`.

## Data

### Options

| Option | Autoload | Example | Purpose |
| --- | --- | --- | --- |
| `mmbb_settings` | yes | see "Stored settings" | All merchant settings |
| `mmbb_version` | no | `"1.0.0"` | Last installed plugin version |
| `mmbb_db_version` | no | `"0.9.0"` | Schema version (`Installer::DB_VERSION`) |
| `mmbb_catalog_generation` | no | `7` | Bumped to drop cached product lists |
| `mmbb_analytics_generation` | no | `12` | Bumped to drop cached reports |
| `mmbb_analytics_salt` | no | `{"day":"2026-11-11","value":"<64 chars>"}` | Daily salt for hashing sessions |
| `mmbb_analytics_transients` | no | `{"mmbb_report_ab12…":1}` | Registry of transient keys so uninstall can delete them |
| `mmbb_setup_test_done` | no | `1` | The setup checklist's "test order" step |

`register_setting()` group: `mmbb_settings_group` (not shown in REST).

### Transients

`mmbb_products_<hash>` (cached product list per campaign), `mmbb_report_<md5>` and `mmbb_campaign_totals_<md5>` (reports, 10 minutes), `mmbb_rate_<hash>_<YmdH>` (event rate limit, 1 hour).

### Post meta

| Key | On | Example |
| --- | --- | --- |
| `_mmbb_config` | `mmbb_campaign` | JSON string, see "Campaign config" |
| `_mmbb_paused` | `mmbb_campaign` | `"1"` while paused, absent otherwise |
| `_mmbb_campaign_id` | `product` (the hidden container product) | `12` |

### Order and order item meta (written through WooCommerce CRUD)

| Key | On | Example |
| --- | --- | --- |
| `_mmbb_has_box` | order | `1` |
| `_mmbb_box` | order line item | JSON of the box: `{"campaign_id":12,"items":[{"product_id":31,"variation_id":0,"qty":2,…}],"size":0,"gift":{"enabled":false,"message":""},"quote":{…},"free_gift":null,"hash":"<md5>","mode":"bundle"}` |
| `mmbb_box_key` | order line item (box line) | the cart item key |
| `_mmbb_box_part` | order line item (child line, items mode) | `1` |
| `mmbb_box_parent` | order line item (child line) | parent cart item key |
| `_mmbb_stock_reduced` | order line item | `1` |
| Visible, translated labels | order line item | "Box discount", "Contents", "Gift message", "Free gift" |

### Cart item data (WooCommerce session)

`mmbb_box` (the box array above), `mmbb_instance` (UUID, items mode), `mmbb_parent` (child lines), `mmbb_free_gift` (free gift line). Cart edit links use the query args `mmbb_edit` and `mmbb_edit_nonce`.

### Custom post type

`mmbb_campaign`: private, no UI, not in REST, supports `title`, every capability mapped to `manage_woocommerce`. Post statuses used: `draft`, `publish`, `trash`.

Computed statuses (never stored; from post status, `_mmbb_paused` and the schedule): `draft`, `scheduled`, `active`, `ending_soon` (fewer than 7 days left), `ended`, `paused`. "Live" means `active` or `ending_soon`.

### Custom tables (`dbDelta()` on activation and upgrade)

```sql
{prefix}mmbb_events (
  id bigint unsigned AUTO_INCREMENT PRIMARY KEY, campaign_id bigint unsigned, event varchar(20),
  session char(32), product_id bigint unsigned NULL, qty smallint unsigned DEFAULT 0,
  value decimal(19,4) NULL, order_id bigint unsigned NULL, created_at datetime,
  KEY campaign_event_created (campaign_id,event,created_at), KEY order_id (order_id) )

{prefix}mmbb_stats_daily (
  day date, campaign_id bigint unsigned, views, started, tier_reached, carts, orders, items int unsigned DEFAULT 0,
  revenue decimal(19,4), discount decimal(19,4), products longtext NULL,
  PRIMARY KEY (day,campaign_id) )

{prefix}mmbb_purchases (
  order_id bigint unsigned, line_id bigint unsigned, campaign_id bigint unsigned, day date,
  boxes int unsigned DEFAULT 1, items int unsigned DEFAULT 0, tier smallint unsigned DEFAULT 0,
  tier_data longtext NULL, value decimal(19,4), discount decimal(19,4), refunded tinyint(1) DEFAULT 0,
  PRIMARY KEY (order_id,line_id), KEY campaign_day (campaign_id,day) )
```

Event names: `view`, `add_item`, `tier_reached` (from the browser) and `add_to_cart` (from the server).

### Campaign config (`_mmbb_config`)

Stored as one JSON string. `Config::sanitize()` runs on every read and write, so the stored shape is always complete and **unknown keys are dropped**. This is `Config::defaults()` with the "Holiday treat box" preset applied:

```json
{
  "type": "tiered",
  "box": { "capacity": 12, "min_items": 4, "allow_duplicates": true, "max_per_product": 12, "hide_sold_out": false },
  "tiers": [
    { "qty": 4, "discount_type": "percent", "value": 10 },
    { "qty": 6, "discount_type": "percent", "value": 15 },
    { "qty": 12, "discount_type": "percent", "value": 25 }
  ],
  "sizes": [],
  "bundle": { "qty": 3, "price": 0 },
  "products": { "source": "manual", "ids": [31, 32, 33, 34, 35], "term_ids": [], "order": "manual", "caps": {} },
  "schedule": { "start": null, "end": null, "countdown_days": 14, "countdown_end": null },
  "extras": {
    "gift_message": false,
    "gift_wrap": { "enabled": false, "fee": 0 },
    "free_gift": { "enabled": false, "product_id": 0, "min_items": 12 }
  },
  "design": {
    "layout": "default", "columns": 0,
    "headline": "Build your holiday treat box",
    "intro": "Pick your favourites. The more you add, the more you save.",
    "sticker": "Save up to 25%", "cta_label": "",
    "show_hero": true, "show_ladder": true, "show_stickers": true,
    "accent": "max", "accent_color": "#f04e12",
    "theme": "light", "theme_canvas": "#f5f5f2", "theme_surface": "#ffffff",
    "ladder": "default",
    "ladder_top": "#f04e12", "ladder_top_text": "#141414",
    "ladder_near": "#ffd23f", "ladder_near_text": "#141414",
    "ladder_base": "#ffffff", "ladder_base_text": "#141414",
    "countdown": "default", "countdown_bg": "#ffd23f", "countdown_text": "#141414"
  },
  "placement": { "page_id": 0 },
  "container_product_id": 0
}
```

Allowed values: `type` tiered / fixed / bundle. `discount_type` percent / fixed_amount / box_price. Size `tag` "" / popular / best_value. `products.source` manual / category / tag. `products.order` manual / bestselling / price / newest. `design.layout` default / panel / bar / both. `design.columns` 0 / 3 / 4 / 5. `design.accent` max / theme / custom. `design.theme` light / dark / custom. Limits: capacity 48, 6 tiers, 90%, 200 products, 50 terms, countdown 30 days. Dates are UTC ISO 8601 (`2026-11-01T00:00:00Z`). Money is a store-currency number with up to 4 decimals. `container_product_id` is set only by server code.

A campaign as the repository and REST return it: `{ id, title, post_status, paused, status, config, created, modified }`.

### Stored settings (`mmbb_settings`)

```json
{
  "enabled": true, "default_page_id": 0, "columns": 4, "summary_layout": "both", "stickers": true,
  "low_stock": { "enabled": true, "threshold": 5 }, "unlock_toast": true,
  "cta_label": "", "empty_slot_hint": "",
  "cart_display": "bundle", "edit_from_cart": true, "allow_coupons": false, "reduce_item_stock": true,
  "email_list_items": true, "email_gift_message": true,
  "assets_only_on_builder": true,
  "analytics_enabled": true, "analytics_retention_days": 90,
  "delete_data": false
}
```

`columns` 3 / 4 / 5. `summary_layout` panel / bar / both. `cart_display` bundle / items. Retention 7 to 730 days.

### Browser storage and JS globals

- Globals: `window.mmbbAdmin`, `window.mmbbBuilders` (payload per instance id `mmbb-1`, `mmbb-2`, …), `window.mmbbMoneySettings`, `window.mmbbComponents`.
- `localStorage`: `mmbb:checklist-dismissed`, `mmbb:editor:<campaign id>` (unsaved editor draft), `mmbb:editor:device`.
- `sessionStorage`: `mmbb:box:<campaign id>` (the shopper's picks), `mmbb:analytics-session`, `mmbb:view:<campaign id>`.
- User meta: `mmbb_checklist_dismissed` (Home checklist hidden, per user; added in Redesign Part 3). 1.0 stored no user meta.

## Interfaces

### REST (`mmbb/v1`)

Every admin route uses `Base_Controller::permissions_check()`, which requires `manage_woocommerce`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/campaigns` | List with status, search, type, orderby, paging; returns counts |
| POST | `/campaigns` | Args `template` (preset id, default `blank`), `title` and, from Redesign Part 3, `type` (tiered / fixed / bundle, used with the blank template) |
| POST | `/campaigns/bulk` | `action` pause / resume / duplicate / delete, `ids` (up to 100) |
| GET | `/campaigns/<id>` | One campaign |
| PUT | `/campaigns/<id>` | Replace config (`title`, `config`) |
| PATCH | `/campaigns/<id>` | Merge a partial config (autosave) |
| DELETE | `/campaigns/<id>` | Trash |
| POST | `/campaigns/<id>/duplicate` | |
| POST | `/campaigns/<id>/publish` | `placement` new_page / existing_page / none, `page_id`, `page_title`, `page_slug` |
| GET | `/campaigns/<id>/preview` | Storefront payload for the admin preview |
| GET | `/products` | `search`, `category`, `tag`, `include`, paging |
| GET | `/terms` | Product categories and tags |
| GET | `/pages` | Pages for placement |
| GET, POST/PUT/PATCH | `/settings` | Read and update `mmbb_settings` |
| GET, POST | `/setup` | Setup checklist state; mark the test order done; from Redesign Part 3, `dismissed` per user |
| GET | `/stats` | Dashboard numbers, `range` |
| GET | `/analytics` | `range` today / 7d / 30d / 90d / custom, `from`, `to`, `campaign`, `compare` |
| GET | `/analytics/export` | CSV, same args |
| POST | `/events` | **Public.** Permission: analytics on, and a valid `mmbb_track` nonce. Rate limited. Body `nonce`, `session`, `events[]` |

No route uses `__return_true`.

### AJAX

`wc-ajax=mmbb_add_box` (`Add_To_Cart::handle_add`). Nonce action `mmbb_add_box` in the `nonce` field. POST fields: `campaign_id`, `items[]` (`product_id`, `variation_id`, `qty`), `size`, `gift[enabled]`, `gift[message]`, `analytics_session`. Prices from the browser are never read. There are no `wp_ajax_*` actions.

Nonce actions: `mmbb_add_box`, `mmbb_edit_box`, `mmbb_track`, plus `wp_rest`.

### Shortcode

`[mmbb_box id="12" layout="bar" columns="3" hero="false"]`. Attributes: `id`, `layout` (default / panel / bar / both), `columns` (0 / 3 / 4 / 5), `hero` (boolean).

### Block

`mmbb/box-builder`, API version 3, category `woocommerce`, server rendered. Attributes: `campaignId` (number), `layout` (string enum as above), `columns` (number), `showHero` (boolean). Supports `align` wide and full.

The block comment the publisher writes into pages is `<!-- wp:mmbb/box-builder {"campaignId":12} /-->`.

### Hooks the plugin fires

| Hook | Type | Arguments |
| --- | --- | --- |
| `mmbb_campaign_saved` | action | `$id`, `$config` |
| `mmbb_campaign_config_defaults` | filter | `$defaults` |
| `mmbb_templates` | filter | `$templates` (the starting presets) |
| `mmbb_ensure_container_product` | filter | container product id or error |
| `mmbb_pricing_quote` | filter | the quote |
| `mmbb_track_events` | filter | `true` |

Scheduled action: `mmbb_rollup_daily` (Action Scheduler, group `mmbb`).

### Admin pages

| Page | URL |
| --- | --- |
| Dashboard (top-level menu "ProductBoxes", position 56) | `admin.php?page=mmbb` |
| Campaigns | `admin.php?page=mmbb-campaigns` |
| New campaign | `admin.php?page=mmbb-campaigns&action=new` |
| Edit campaign | `admin.php?page=mmbb-campaigns&action=edit&id=<id>` (optional `&step=`) |
| Analytics | `admin.php?page=mmbb-analytics` |
| Settings | `admin.php?page=mmbb-settings` |

Mount point: `<div id="mmbb-admin" class="mmbb-root" data-page="…">`. Body class on our screens: `mmbb-admin-page`. Storefront wrapper: `<div class="mmbb-root mmbb-builder" data-mmbb-id="mmbb-1" data-campaign="12">`.

## Features today vs redesign

| Screen (design file) | Exists now | Changes | New | Data it needs |
| --- | --- | --- | --- | --- |
| Home (`Main`) | Dashboard with setup checklist, stat cards, campaigns, most picked; `GET /stats`, `GET /setup` | Renamed "Home"; rebuilt on `@wordpress/components`; period switch 7 / 30 / 90 | Checklist dismissal in user meta (today it is `localStorage` `mmbb:checklist-dismissed`) | Existing routes. One new user meta key under `mmbb_` |
| Boxes (`Boxes`) | Campaigns list with tabs, search, bulk actions, row menu | Tabs become All / Live / Drafts / Ended; "Shown on" column | Nothing in storage | `GET /campaigns` and `/bulk`. "Shown on" uses the `placement` field each campaign already carries in the REST response |
| Create a box (`NewBox`) | "New campaign" opens a template picker with 5 presets | A modal with a name and three discount-type cards | Nothing | `POST /campaigns`. The three cards map to `type` tiered / fixed / bundle. The route takes a preset id, not a type, so it needs a `type` arg or a preset per type |
| Editor shell (`EditorDesign`) | 5 steps (Basics, Products, Box rules, Design, Publish) with a React preview card beside the form | 3 steps in a full-screen editor | Real iframe preview, postMessage bridge, undo and redo, 30-second autosave | Preview query arg and nonce (`mmbb_preview`). Autosave already exists through `PATCH /campaigns/<id>`; the unsaved draft is in `localStorage` |
| Editor 1, Products (`EditorProducts`) | Products step: source, search, picks, caps, order | Moves into the right sidebar | Nothing | `config.products`, `GET /products`, `GET /terms` |
| Editor 2, Discounts (`EditorDiscounts`) | Basics and Box rules steps | Merged into one sidebar of panels | **Per-box "Allow coupons"** (today a store-wide setting). **One "Gift wrap and note" toggle** (today two keys). **"Countdown in the last 3 days" toggle** (today `countdown_days` 0 to 30 plus `countdown_end`) | `config.type`, `box`, `tiers`, `sizes`, `bundle`, `extras`, `schedule`. Free gift **already exists** (`extras.free_gift`) |
| Editor 3, Design (`EditorDesign`) | Design step: layout, columns, sticker, button label, hero and ladder toggles, accent, theme, ladder and countdown colours | Replaced by Template / Style / Content tabs | 10 storefront templates, Match my site, typography, buttons, cards, summary, spacing, custom CSS, `add_label` | **None of the new design keys exist.** See Risks 1 to 4 |
| Publish (`Publish`) | Publish step with new page / existing page / place it myself, schedule on Basics | A modal | "Template" badge; optional `template` attribute on block and shortcode | `POST /campaigns/<id>/publish` already matches the three choices |
| Analytics (`Analytics`) | Period, campaign filter, compare, CSV export, stat cards, revenue chart, funnel, most picked, by-campaign table | Restyled | "Deleted boxes (n)" row and the tip notice need checking against `Query` | `GET /analytics`, `/analytics/export` |
| Settings (`Settings`) | One screen with all `mmbb_settings` keys | Four cards. The design drops `columns`, `summary_layout`, `stickers`, `low_stock`, `unlock_toast`, `cta_label`, `empty_slot_hint` and `assets_only_on_builder` from the screen | Nothing | `mmbb_settings` unchanged. Dropped keys stay stored (Part 10, Part 11) |
| Templates 01 to 10 (`Tpl*`) | One storefront look ("Max"): hero, ladder, grid, box panel, bottom bar, light or dark | A template engine; today's look becomes `spotlight` | 9 more templates, CSS-variable engine | `design.template` and the new style keys |
| Phone layout (`Mobile`) | Bottom bar and drawer exist (`BoxSummaryBar`, `Drawer`) | Applied to every template; container queries | Nothing | None |
| Fonts | Bricolage Grotesque and Figtree ship locally | | 8 more families: Inter Tight, Plus Jakarta Sans, Fraunces, DM Sans, Outfit, Inter, Space Grotesk (Figtree is not in the new list) | Local woff2 and OFL files; zip size grows |

Features that exist today and are **not drawn** in the new design: size tags (popular / best value), `fixed_amount` and `box_price` discount types on tiers, per-product caps, product order, the sticker text, `show_hero`, custom ladder and countdown colours, low-stock notes, unlock toast, the store-wide button label and empty-slot hint, "Load assets only on builder pages", and the 5 starting presets.

## Risks

1. **`design.layout` changes type.** Today `design.layout` is a string (`default` / `panel` / `bar` / `both`). The Part 6 schema makes `layout` an object (`layout.width`, `layout.padding`). The same key cannot hold both, and the block attribute `layout` and shortcode attribute `layout` use the old string values. The new object needs another name (for example `design.spacing`), or the old string must be migrated to `summary.position` first.
2. **Flat keys vs nested keys.** New keys overlap old ones: `content.headline` / `content.intro` vs `design.headline` / `design.intro`; `content.cart_label` vs `design.cta_label`; `cards.columns` (2 to 5) vs `design.columns` (0, 3, 4, 5); `summary.show_ladder` vs `design.show_ladder`; `colors.accent` vs `design.accent` + `accent_color`; `colors.background` / `surface` vs `theme_canvas` / `theme_surface`. Part 6 must either keep reading the old keys or migrate them, never leave two sources of truth.
3. **`Config::sanitize()` drops unknown keys.** Any new key must be added to the sanitizer before it can be saved. After a downgrade to 1.0.0, the old sanitizer would strip the new keys on the next save of that campaign.
4. **"Template" already means something else.** `Templates`, the `mmbb_templates` filter and the `template` arg of `POST /campaigns` are starting presets. One preset id is `gift`, and the new storefront template list also has `gift`. The new concept needs distinct names in code (for example "layout template" or `design.template` only), and the `POST /campaigns` arg keeps its old meaning.
5. **Per-box coupons.** `allow_coupons` is store-wide and enforced in `Cart_Lines`. A per-box switch needs a new config key that falls back to the store setting, and a migration that copies the current store value.
6. **Countdown.** The design's single "last 3 days" toggle is narrower than `countdown_days` (0 to 30) and `countdown_end` (for always-on campaigns). Existing campaigns with 14 days must keep 14.
7. **Gift wrap and note.** `extras.gift_message` and `extras.gift_wrap.enabled` are separate today, and each can be on without the other. One toggle must not switch off a note-only campaign.
8. **The admin and the storefront share `mmbb-components`.** Moving the admin to `@wordpress/components` must leave `src/components/`, the `mmbb-components` handle and `window.mmbbComponents` in place for the storefront.
9. **`@wordpress/icons` is bundled, not a script handle.** The dependency extraction plugin in `@wordpress/scripts` 31.8.0 lists `@wordpress/icons` under `BUNDLED_PACKAGES`. Part 2's instruction to add `wp-icons` as a dependency does not apply; the icons used are compiled into `admin.js`. `@wordpress/data`, `@wordpress/notices` and `@wordpress/icons` also need adding to `package.json`.
10. **The upgrade routine is not stepwise.** `Installer::maybe_upgrade()` only re-runs `install()` when a version option is behind. `DB_VERSION` is `0.9.0` while the plugin is `1.0.0`. Part 1 has to add ordered, idempotent migration steps on top of this without changing either option name.
11. **Block and shortcode overrides.** `layout`, `columns` and `hero` / `showHero` exist in saved posts. They must keep working when templates arrive, even where a template ignores them.
12. **Colours.** `Colors::resolve()` works out text and line colours from the surface for contrast. The new schema lets the merchant set text and muted colours directly and allows `var(--wp--preset--color--…)` references, which the current hex-only contrast code cannot evaluate.
13. **Stored drafts in the browser.** `mmbb:editor:<id>` holds a draft in the old flat shape. After the update, the new editor must ignore or convert a draft it does not recognise.
14. **Zip size and fonts.** Eight more font families are added. Figtree is used by today's storefront and admin; removing it would change existing boxes that stay on today's look.
15. **`languages/` has no `.pot`.** Part 2 and Part 11 call `wp i18n make-pot`, which needs WP-CLI. It was not on PATH in the last sessions.
