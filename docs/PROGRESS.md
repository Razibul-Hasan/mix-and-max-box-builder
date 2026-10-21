# Build progress

Updated by the agent at the end of every phase. Newest entry first under each phase.

| Phase | Title | Status | Commit |
| --- | --- | --- | --- |
| 0 | Tooling and repository | done; native checks passed, wp-env pending | `Phase 0: Tooling and repository` |
| 1 | Plugin skeleton and lifecycle | done; native lifecycle/network tests passed | `Phase 1: Plugin skeleton and lifecycle` |
| 2 | Design system inside the plugin | done; native tests passed | `Phase 2: Design system inside the plugin` |
| 3 | Data layer and pricing engine | done; native tests passed | `Phase 3: Data layer and pricing engine` |
| 4 | REST API for the admin | done; native tests passed | `Phase 4: REST API for the admin` |
| 5 | Admin app: shell, dashboard, campaigns | done; native tests and Dashboard smoke passed | `Phase 5: Admin app: shell, dashboard, campaigns` |
| 6 | Campaign wizard | done; native tests passed, browser walkthrough pending | `Phase 6: Campaign wizard` |
| 7 | Cart, orders and stock | done; HPOS/legacy tests and classic checkout passed; UI gaps remain | `Phase 7: Cart, orders and stock` |
| 8 | Storefront: block, shortcode, builder | done; native tests and browser smoke passed | `Phase 8: Storefront: block, shortcode, builder` |
| 9 | Analytics | done; native legacy/HPOS tests, browser and Plugin Check passed | `Phase 9: Analytics` |
| 10 | Settings screen and emails | done; native legacy/HPOS tests, browser and Plugin Check passed | `Phase 10: Settings screen and emails` |
| 11 | Hardening and WordPress.org compliance | not started | |
| 12 | Release and submission | not started | |

## Pinned versions

Record exact versions installed in Phase 0 (WordPress in wp-env, WooCommerce, PHP in wp-env, Node, @wordpress/scripts, @wordpress/env, WPCS, PHPUnit).

Phase 0 uses committed `package-lock.json` and `composer.lock` for exact dependency
resolution. Composer's platform is PHP 7.4.33, so dev dependencies remain
installable on the minimum supported PHP branch.

| Tool | Version |
| --- | --- |
| Node / npm used locally | 24.21.0 / 11.19.0 |
| Node minimum for the resolved toolchain | 20.19.0 |
| @wordpress/scripts | 31.8.0 (Node 20 compatible; 36.1.0 requires Node 22+) |
| @wordpress/env | 10.30.0 (Docker workflow; Node 20 compatible) |
| @testing-library/react | 16.3.3 |
| TypeScript (dev tool peer pin) | 5.9.3 |
| @wordpress/element / @wordpress/i18n | 9.0.0 / 6.30.0 |
| Composer used locally | 2.10.3 |
| PHP used locally | 8.2.29 (Local's existing CLI binary) |
| WPCS / PHPCompatibilityWP / PHP_CodeSniffer | 3.4.1 / 2.1.8 / 3.13.6 |
| PHPUnit / PHPUnit Polyfills / wp-phpunit | 9.6.38 / 4.0.0 / 6.9.8 |
| PHP in wp-env | 8.2 configured; not installed here (Docker unavailable) |
| WordPress / WooCommerce / Plugin Check in wp-env | Not installed here; latest release URLs configured, exact installed versions pending Docker run |

## Log

### Phase 10 — Settings screen and emails (2026-10-21)

**Done:** Replaced the Settings placeholder with the complete five-section screen:
General, Storefront display, Cart & checkout, Emails and Advanced. It loads and
saves the existing typed `/mmbb/v1/settings` resource, lists builder pages, tracks
the active anchor while scrolling, warns before leaving with changes, validates
numeric/text limits inline, supports discard, and shows the shared success toast.
Every stored setting is editable, including analytics collection/retention and
opt-in uninstall deletion. The screen uses the supplied shell, cards, choice
cards, segmented controls, toggles and tokens, with responsive section navigation.

Applied the global enabled switch to rendered builders, eager asset loading and
the add-to-cart endpoint, so a stale cached builder cannot bypass it. The existing
storefront payload/cart/analytics/uninstall consumers now have UI coverage for all
their settings; campaign layout, columns and CTA continue to override store-wide
defaults only when explicitly set.

Added an order-display module that keeps Box discount, Contents and Gift message
in a stable order, renders each picked product on its own readable line, and uses
the hidden server-owned snapshot rather than browser-supplied display text. Order
screens retain the contents and gift message. Emails honor both email settings;
customer and non-new-order admin emails never receive gift text, while the merchant
new-order email can include it. HTML values are escaped and line-broken; plain-text
emails use clean newlines. Tests render WooCommerce's actual HTML and plain email
order-detail templates from a persisted test order.

**Decisions / deviations:** The handoff's price-format selector includes a
"No decimals" choice, but the fixed WooCommerce rule requires money to follow the
store's currency settings. Settings therefore shows the active WooCommerce format
as a read-only preview and does not add a conflicting option. The prototype's
License section was omitted because the phase specifies five sections and the
plugin cannot ship locked/trial features. The Settings prototype specifically
uses switches in a saved form, so it takes precedence over the generic Toggle
guideline's checkbox preference. No runtime dependency was added.

**Checks run:**

- Production build, JS lint, CSS lint, WPCS/WordPress-Docs/PHPCompatibilityWP
  7.4-, PHP syntax across 74 PHP files and `git diff --check`: pass.
- JavaScript: 213 tests across 18 suites pass. New Settings tests cover all five
  sections, a complete typed save, the unsaved bar/toast, inline validation and
  discard restoration.
- Pure PHP: 80 tests, 493 assertions pass.
- Native integration, legacy orders: 165 tests pass with 711 assertions. HPOS:
  165 tests pass with 712 assertions. Two multisite-only tests are intentionally
  skipped in each single-site run; the separate multisite run passes both with
  11 assertions. Final runs produced no WP_DEBUG messages.
- Integration coverage includes every REST constraint and text sanitization,
  master-switch rendering/assets/add-to-cart behavior, visible order metadata,
  HTML/plain email formatting, email preferences, admin new-order versus customer
  and other admin emails, gift versus non-gift boxes, legacy storage and HPOS.
- Chrome on the local development site: the Settings screen matches the supplied
  layout, every section/control is present, the active anchor follows the viewport,
  and the sticky unsaved bar/discard flow works. The temporary coupon toggle was
  discarded; no merchant setting was saved. Console errors came only from browser
  extensions, not the plugin.
- Final release archive: 181 files, required build/source/font/licence files
  present, zero dev/hidden/forbidden files. Packaged Plugin Check with runtime
  checks enabled: **0 errors, 11 warnings**. The warnings are the pre-existing
  prepared discovery/deletion queries and owned-table DROP in `Uninstaller`, which
  require fresh reads and schema removal after per-site opt-in.

**Skipped checks / environment:** Docker remains unavailable, so `npx wp-env`
could not run. Equivalent isolated native legacy, HPOS, multisite, email-template
and packaged Plugin Check runs used Local's PHP/MySQL services. The minimum PHP
7.4 / WordPress 6.6 / WooCommerce 9.0 runtime matrix remains for Phase 11.

**Open issues:** No new Phase 10 issue is known.

### Phase 9 — Analytics (2026-10-20)

**Done:** Added `includes/analytics/` Collector, Query, Rollup and Privacy modules.
The storefront batches `view`, `add_item` and `tier_reached` events (20 events,
five seconds, or a pagehide beacon). Views are once per browser session per
campaign. The random ID lives in sessionStorage; the server stores only an MD5
with a daily rotating random salt. The REST write checks `mmbb_track`, the
merchant setting, `mmbb_track_events`, a live campaign, product membership and the
current campaign type's actual tier quantities. Batches are bounded and limited
to 120 events per session hash per UTC clock hour. Expired cached nonces drop
silently. Add-to-cart is recorded inside the successful WooCommerce AJAX handler,
never accepted as a browser event. Previews have no tracking payload.

Paid-order hooks record one purchase per `(order_id, line_id)` with net line
revenue excluding tax, box plus coupon discount, box/item counts and the purchased
tier snapshot. Items-mode revenue includes the header and its own child lines;
new hidden cart-key associations preserve this relationship on orders. Earlier
items-mode snapshots fall back to their contiguous marked child lines. Full
refunds and cancellations exclude those purchases without deleting the unique
identity. Collection stops entirely when disabled; existing refund corrections
and retention continue.

The unique daily `mmbb_rollup_daily` Action Scheduler action runs around 02:00
store time in group `mmbb`; deactivation clears it. Rollup catches up missed days,
replaces daily aggregates idempotently, preserves product pick counts and removes
expired raw events only after aggregation. Daily sales totals are refreshed from
the purchase ledger, so late refunds can correct old periods after raw cleanup.
Queries use prepared SQL, store-date/UTC boundaries, ten-minute transient caches
and mutation invalidation. `/stats` and `/analytics` now return six real KPIs,
equal-length comparisons, daily series, funnel, products, tier shares and campaign
performance. Conversion deltas use percentage points; other deltas are relative
percent changes. Sessions are daily and campaign scoped; no cross-day person
tracking or purchase-to-browser identity linkage is attempted.

The Analytics page matches the supplied layout: shared range/campaign/compare
filters, custom dates, four StatCards, comparison chart with the existing keyboard
crosshair and hidden data table, funnel, two BarLists and performance table.
Discount uses `upIsGood={false}`. Product and tier lists fold beyond seven rows
into Other. Dashboard uses the live stats, including its top-campaign values.
Manager-only CSV exports every section for the current filters, including prior
values when compared; money is explicitly identified as minor units. Formula
prefixes, including whitespace-prefixed `= + - @`, are apostrophe-escaped.
The raw CSV response has the required MIME type and dated filename.

Added suggested privacy-policy content, gift-message exporter and eraser, and
readme disclosure. The eraser runs before WooCommerce removes billing emails,
respects its order-data removal setting, and removes both visible message meta
and the hidden JSON copy through WooCommerce CRUD. Tracking/report transient
names are registered for persistent-cache cleanup on opt-in uninstall. Schema
upgrades also run before storefront/REST traffic at init, so an automatic update
does not depend on an admin visit. Internal order associations use the `mmbb`
prefix and are hidden from both admin and customer-facing formatted metadata.

**Decisions / deviations:** Bumped the database schema to 0.9.0. The Phase 3
schema cannot represent unique order-line purchases or retain them independently
of anonymous browsing events, so added `mmbb_purchases` and a `products` JSON
column on `mmbb_stats_daily`. Purchase rows live in that separate ledger rather
than in the expiring events table; this preserves idempotence and late refund
corrections without retaining session hashes. The ledger and aggregate statistics
remain until opt-in uninstall. Scheduling uses a 24-hour recurring interval from
02:00 store time (so a DST transition may move it by an hour). No runtime dependency
was added. Settings UI and email-display work remain Phase 10.

**Checks run:**

- Production build, JS lint, CSS lint, WPCS/WordPress-Docs/PHPCompatibilityWP 7.4-:
  pass. PHP syntax passes across 71 source/test PHP files.
- JavaScript: 210 tests, 17 suites pass. New tests cover batching, pagehide beacon,
  session/view deduplication, disabled/blocked storage, real report rendering,
  custom dates, comparison and matching CSV filters.
- Pure PHP: 80 tests, 490 assertions pass.
- Native integration, legacy orders: 152 pass, 667 assertions; two multisite-only
  tests skipped. HPOS: 152 pass, 668 assertions; the same two tests skipped.
  Separate multisite run: both network tests pass, 11 assertions. No database
  errors, warnings or notices appear in the final integration output.
- New integration coverage verifies exact revenue/discount/count/average/
  conversion/funnel/series values, equal-length previous periods, campaign
  filtering, store-midnight UTC boundaries, daily salt rotation, nonce/settings/
  filter/membership/rate guards, unique paid lines, items-mode sales, full refunds,
  retention, rollup idempotence, scheduling/deactivation, server cart events,
  manager-only CSV/formula escaping, and both gift-message copies in privacy tools.
- CLI Action Scheduler ran the rollup twice on the disposable site. Both produced
  60 daily rows with identical hash `9184817635b05432c5ddb19806ed7566`.
- Release archive audit: 179 files; required source/build/fonts/licences present,
  no dev folders or dotfiles. Extracted PHP matches the working tree. Packaged
  Plugin Check with runtime checks enabled: **0 errors, 11 warnings**. All warnings
  are the existing prepared discovery/deletion queries and owned-table DROP in
  Uninstaller. These require fresh reads and schema removal after per-site opt-in;
  no new analytics file reports a Plugin Check warning.
- Chrome on a disposable Twenty Twenty-Five site: Analytics and Dashboard both
  show the fixture's $940.50 / 30 boxes for 30 days, comparison series, product
  picks, tier share and campaign totals. Dashboard shows one box today. CSV
  downloads with a dated filename. Real builder use adds one view, two product
  picks, a tier event and a server-owned cart event to the database. The browser run uses a separate site
  and database, with outgoing mail disabled; no merchant data is modified.
- `git diff --check`: pass. No later phase was started.

**Cleanup:** Stopped the disposable PHP web server and removed both databases
created for this phase's native tests and browser checks. Both test CSV downloads
were inspected successfully; they were already absent from Downloads at cleanup
time. Logs and the extracted release remain in the OS-temp audit directory. The user's existing `.claude/` directory remains untouched
and excluded from the commit.

**Skipped checks / environment:** `npx wp-env start`, `npm run test:php` and
container Plugin Check each report `Could not connect to Docker. Is it running?`.
The equivalent integration, scheduler, browser and packaged Plugin Check checks
above ran natively using Local's existing PHP/MySQL services and isolated test
and browser databases. PHP 7.4 / minimum WordPress/WooCommerce runtime checks
remain part of the existing compatibility open issue. During fixture setup an
incomplete hand-built snapshot omitted `variation_id`, causing stock-hook warnings;
the fixture was repaired. Subsequent browser/runtime activity produced no new
WP_DEBUG messages. An initial CSV download-event waiter timed out in the browser
extension, but the actual dated CSV was downloaded and inspected successfully.

**Open issues:** Docker-specific verification and the existing minimum-version
runtime matrix remain pending. Partial-refund allocation is outside this phase's
full-refund/cancellation scope. No other Phase 9 implementation issue is known.

### Phases 0–8 — Review and regression fixes (2026-10-20)

**Scope:** Reviewed the completed phases; no Phase 9–12 features were started.
This entry supersedes the original logs' integration-test skips. Docker is still
unavailable, but Local's PHP/MySQL services made isolated native tests possible.
The test database and temporary browser site were separate from the merchant's
database. Local reported WordPress 7.1.3, WooCommerce 11.2.1 and PHP 8.2.29.

**Fixed:**

- Campaign capabilities used `map_meta_cap=true` while assigning all meta
  capabilities the primitive `manage_woocommerce`. WordPress consequently mapped
  that capability to `delete_post`, denying manager access throughout the plugin.
  Primitive capabilities now remain primitive; manager/subscriber tests cover it.
- WooCommerce recalculated after adding an items-mode header, before its children
  existed, and removed the incomplete box. Assembly now defers box validation,
  identical items-mode boxes get separate groups, and a failed replacement restores
  the original cart. Edit keys must belong to the requested campaign and respect
  the edit-from-cart setting.
- Rounding each discounted child independently could leave the final child with
  a negative price. Cumulative allocation preserves a nonnegative distribution and
  the exact quoted total.
- Sibling variations sharing parent-managed stock could each claim all available
  stock. Validation now aggregates picks and existing cart quantities by stock owner.
- A nested low-stock settings update reset an existing disabled preference.
  Merge nested input before sanitizing and return keys in stable default order.
- Once-per-request cache invalidation left product lists stale after subsequent
  saves in the same request. Every invalidation now changes the generation.
- Setup's order lookup used HPOS-only `meta_query` arguments with the legacy order
  datastore. It now uses WooCommerce's datastore query hook for legacy orders and
  its native meta query for HPOS; both find box orders without the setup flag.
- Store API metadata registration handles WooCommerce Blocks having already loaded.
  Tests inspect the real cart endpoint, including its quantity-editability response.
  Changing campaigns remounts the block preview. Countdown rendering applies the
  server clock offset. At 390 px, long summary actions wrap without overlapping prices.
- Renamed our Clipboard API wrapper to `copy-text.js`: Plugin Check mistook the
  filename `clipboard.js` for a bundled copy of WordPress's clipboard library.
  Added `languages/README.txt` so the declared Domain Path exists in the archive.

**Test infrastructure:** Install WooCommerce before `init` queries its tables and
before test transactions. `MMBB_TEST_HPOS=1` enables HPOS for the integration suite;
the smoke test verifies it really is enabled. Updated old fixtures to coexist with
later phases: real owned container products, draft lifecycle fixtures, registered
option defaults, asset queue cleanup, and temporary-table-aware schema assertions.
The initial native run had 3 errors and 77 failures; fixes and regression coverage
produce the passing results below.

**Checks run:**

- Production build, JS lint, CSS lint, PHPCS/WPCS/PHPCompatibilityWP: pass.
- JavaScript: 204 tests across 15 suites pass, including the clock-offset regression.
- Pure PHP: 80 tests, 481 assertions pass without WordPress loaded.
- Integration, legacy orders: 144 pass, 607 assertions; two network tests skipped.
- Integration, HPOS: 144 pass, 608 assertions; two network tests skipped.
- Separate multisite run: both network tests pass, 11 assertions.
- PHP syntax: all 67 PHP source/test files pass. Token regeneration is unchanged.
- Release archive: 174 files; required source, build assets, local fonts/licences
  and language directory present; no tests, vendor, node_modules, design, docs,
  agent instructions or dotfiles. Plugin Check static and runtime scans (runtime
  enabled with Plugin Check's `--require=.../cli.php`): **0 errors, 11 warnings**.
  All warnings are the five prepared, uncached data-discovery/deletion queries and
  the owned-table DROP in `Uninstaller`. They execute only after per-site opt-in;
  fresh discovery and schema removal are necessary to delete owned data completely.
- Chrome with Twenty Twenty-Five: live Dashboard renders; builder selects products
  and shows the 10% discount; classic cart shows $18.00; edit preloads the original
  picks and successfully replaces the line. At 390 px the two-column grid, summary
  and drawer render; Escape closes the drawer and returns focus to its opener.
  The summary's price and wrapped update action have separate bounds. An unrelated
  page has no plugin script/style URLs.
- Storefront 4.6.2 in the temporary site: the builder mounts within the theme's
  content area, and an unrelated page has no plugin script/style URLs. This is
  a rendering/asset smoke check, not the entire theme/checkout compatibility matrix.
- Disposable classic checkout: Cash on delivery order #20 reaches the receipt,
  status `processing`, total 18.00, hidden box metadata and order box flag present;
  Cookie and Chocolate stocks decrease from 20 to 19. Outgoing mail was disabled
  on this test site. Evidence: OS-temp `mmbb-review-20261020/order-confirmation.png`.

**Cleanup:** Stopped the temporary web server and removed both audit databases.
Logs, the receipt screenshot and the extracted package remain in OS-temp for review.
The user's existing `.claude/` directory was left untouched and is not committed.

**Remaining limits:** PHP 7.4 / WordPress 6.6 / WooCommerce 9.0 runtime runs and
the full browser matrix remain pending. The Cart block's visible Edit box link,
items-mode remove-button limitations, wildcard-variation limitation and future
Settings/email/Analytics work are unchanged from their phase logs. No full
block-editor publishing walkthrough or full accessibility audit is claimed.
Full-page caches must still refresh their embedded server timestamp for a fresh
countdown; the clock-offset fix cannot make an indefinitely cached timestamp current.

### Phase 8 — Storefront: block, shortcode, builder (2026-10-20)

**Done:** `includes/storefront/`: `Storefront` (registers the `mmbb-storefront` script and style on `init` without enqueueing, the block from `build/blocks/box-builder`, `[mmbb_box]`, and cache invalidation), `Renderer` (shared by `render.php` and the shortcode; escapes everything; payload through `wp_add_inline_script( …, 'before' )` with `wp_json_encode()`; managers see a note with an edit link when a campaign is not live, shoppers see nothing), `Payload` (public config, resolved products cached in a transient, money, nonce and `wc-ajax` URLs, `?mmbb_edit=` preload). `/campaigns/{id}/preview` now returns this payload (without `cart`). Block `src/blocks/box-builder/` (`block.json`, `render.php`, `index.js`, `edit.js`, `api.js`, `editor.css`). Storefront app `src/storefront/`: `Builder` (all three campaign types, category chips, sort, hero, gift options, toast, error `Notice`), `Hero`, `Drawer` (bottom sheet with focus trap, Esc, scrim, focus return), `state.js` (reducer and helpers), `api.js` (add to cart with one nonce refresh and retry), `storage.js` (`mmbb:box:{id}` in `sessionStorage`), `track.js` (no-op stub), `hooks.js` (container width). `src/shared/tiers.js` now holds `tierLabel`, `tierList` and `sizeTag`; the admin wizard imports them from there.

**Decisions:**

- **Layout by container width, not window.** A `ResizeObserver` on the builder sets wide or narrow at 760 px. `layout` means: wide + `panel` or `both` = sticky `BoxPanel` beside the grid; wide + `bar` = sticky `BoxSummaryBar`; narrow + `panel` = panel stacked under the grid; narrow + `bar` or `both` = bar plus bottom-sheet drawer. Only one tier live region exists at a time. Grid columns drop by one next to the panel when the container is under 1100 px. Precedence: block or shortcode, then campaign design, then Settings.
- **Box = ordered item list** (one id per item), so slot positions stay put. The reducer enforces capacity, caps, duplicates, size trimming and the stock the page knows about; the server re-checks everything.
- **Products cache.** Transient `mmbb_products_{campaign}_{generation}` (1 hour). `mmbb_catalog_generation` is bumped once per request on campaign save, settings save, product and variation save or delete, and stock or stock-status changes. Uninstall already removes `mmbb_*` options and `_transient_mmbb_*`. Stock counts reach the page only at or below the low-stock threshold (and not at all when low stock is off); sold out is always sent.
- **Countdown** uses the server's `now` so a wrong device clock or a cached page does not skew it; it shows only when an end date exists and fewer than `countdown_days` days remain.
- **Edit from cart.** `?mmbb_edit={key}` preloads only a box line of the same campaign and sends `edit_key` back so the old line is replaced. Shown with an info `Notice` and the CTA "Update your box".
- **Gift wrap fee** is folded into the panel's Subtotal so "Box discount" stays correct (`BoxPanel` computes discount as subtotal minus total).
- **Block JS packages.** Added `@wordpress/blocks` 15.3.0, `@wordpress/block-editor` 15.3.0 and `@wordpress/components` 30.3.0 (versions published with the pinned `api-fetch` 7.30.0). The block needs `registerBlockType`, `InspectorControls` and the controls; no WordPress package other than these can do it. They stay external (`wp-blocks`, `wp-block-editor`, `wp-components`), nothing is bundled. `ToggleGroupControl` falls back to its experimental export so WordPress 6.6 works.
- `block.json` `viewScript` and `style` name the registered handle `mmbb-storefront`, so the same bundle serves the block and the shortcode and loads only when a builder renders (or everywhere when "assets only on builder" is off).
- Components `BoxPanel` and `BoxSummaryBar` gained additive `ctaDisabled` and `ctaLoading` props (editor preview and busy state). `Box_Resolver::is_offerable()` is now public so the payload applies the same purchasable rules.

**Deviations from the plan (and why):**

- No Desktop/Mobile preview toggle in the block editor; the canvas follows the editor's width (the builder reacts to its container).
- `empty_slot_hint` and the Settings-driven strings are carried in the payload but not applied yet (Phase 10 owns Settings).
- Analytics `track()` calls (`view`, `item_added`, `tier_unlocked`, `box_added`) are placed; the function is the stub the plan asks for.
- Sort offers Featured, price both ways and name (no "Bestselling" client sort; the campaign's own product order can be bestselling on the server).
- `stylelint` class pattern is relaxed for `src/storefront/storefront.css` like the other BEM stylesheets.

**Checks run:** build ✅ · lint:js ✅ · lint:css ✅ · composer lint ✅ · test:js ✅ (203; new: reducer, tier and countdown helpers, add-to-cart retry, Builder flow with unlock toast, failed add, session storage, preview) · test:unit ✅ (80 tests, 478 assertions; new `PayloadViewTest`) · `php -l` ✅ · source scan of `includes/storefront` and `src/blocks`: no `<script>`/`<style>`, `__return_true`, `wp_redirect`, `$_REQUEST`, `eval`, `extract` or `$wpdb` · test:php ⏭ · Plugin Check ⏭

**Skipped checks (and why):** No Docker, so `StorefrontTest` (shortcode and block output, escaping, two builders, not-live behaviour for shoppers and managers, payload products and badges, cache busting, preview without cart, assets only on builder, edit preload) and the updated `test_preview` are authored and linted but **not executed**. No browser pass was done: the plan's wp-env walkthrough (insert block, build, check out, edit from cart), the 390 px comparison with `MobileFill`, `MobileDrawer` and `MobileComplete`, Twenty Twenty-Five and Storefront theme tests, and "page source has no mmbb assets" are unverified.

**Open issues:** Run the integration suites and a live walkthrough when Docker is available. Check in a browser: block editor canvas in the iframed editor (styles through the `style` handle, `ResizeObserver` across the iframe), sticky bar and bottom sheet over real themes, the `MobileComplete` "Box complete" banner (not built; the bar and unlock toast cover that state), and whether a page-caching plugin keeps `?mmbb_edit=` uncached. `Payload::edit_box()` needs the WooCommerce cart loaded, which holds on front-end requests but not in REST. Phase 10 applies the Settings (empty-slot hint, CTA label, columns, summary layout, low stock).

### Phase 7 — Cart, orders and stock (2026-10-19)

**Done:** `includes/cart/`. `Container_Products` (hidden, published, unmanaged-stock, price 0 product with `_mmbb_campaign_id`; created on go-live through `mmbb_ensure_container_product`, on the draft-to-publish transition, and on any save of a published campaign without one; title follows the campaign; "Box container — managed by Mix and Max" in the Products list; inline warning on its edit screen; trashed with the campaign by Phase 3's `delete()`). `Box_Rules` (pure: merge rows, capacity, duplicates, caps). `Box_Resolver` (live campaign, membership, purchasable, stock including what is already in the cart, unit prices from WooCommerce, quote through `Quotes`). `Add_To_Cart` (`wc-ajax=mmbb_add_box` and `mmbb_nonce`; order of checks is nonce, campaign, items, quote, edit-key removal, add). `Cart_Lines` (session restore, repricing at priority 20 with a re-entry guard, weight, item data, "Edit box" link, coupons, items mode, Store API extension data). `Order_Boxes` (line meta, order flag, `mmbb_setup_test_done`, per-item stock). `Box_Text` holds the translated messages and strings.

**Decisions:**

- **Purchasable gate.** `woocommerce_is_purchasable` is true for a container only while our own add-to-cart runs, or when the cart (or, while WooCommerce rebuilds the cart, the stored session cart) holds a line carrying `mmbb_box`. WooCommerce checks purchasability before `woocommerce_get_cart_item_from_session`, so reading the session is needed.
- **Request format.** The endpoint takes form fields: `nonce`, `campaign_id`, `items[i][product_id|variation_id|qty]`, `size`, `gift[enabled|message]`, `edit_key`. Any price field is ignored. Gift wrap and message are kept only when the campaign offers them; the message is capped at 200 characters.
- **Error codes** (`data.code`): `mmbb_nonce_expired` (403), `campaign_not_found`, `campaign_unavailable`, `empty`, `below_minimum`, `over_capacity`, `duplicate`, `over_cap`, `invalid_size`, `wrong_count`, `foreign_product`, `unavailable_product`, `out_of_stock` (409), `invalid_box`, `cart_unavailable`. Phase 8 can read `Add_To_Cart::endpoints()` for the two URLs.
- **Repricing** re-resolves the box from product ids and quantities, never from stored prices, then rewrites `mmbb_box.items` and `.quote`. A box that is no longer valid (campaign ended or paused, item gone, sold out, rules changed) is removed with a `wc_add_notice()`.
- **Line quantity above one** (the same box added twice) multiplies the stock check.
- **Items mode:** the header line is priced at the gift-wrap fee only. Each item line gets its share of the discounted item total (split by line subtotal, last line takes the rounding remainder). Item lines carry `mmbb_parent`; their quantities are shown as text (classic) or non-editable (Store API filter), and their remove link is hidden. Removing the header removes the items; removing or changing an item line anywhere else makes the next calculation drop the whole box with a notice. Item-mode orders skip our stock step because WooCommerce already reduced those ordinary lines. Order lines of items get hidden `_mmbb_box_part`.
- **Line display:** Contents, Box discount (`10% (−$3.00)`), Gift wrap, Gift message and a "Next discount" upsell row come from `woocommerce_get_item_data`, so classic cart, mini cart and Cart block share them. The order gets Contents, Box discount and Gift message as visible meta, `_mmbb_box` JSON hidden.
- **Container gift fee and tax:** the whole line, fee included, uses the container's tax class (documented in the readme FAQ).

**Deviations from the plan (and why):**

- **Cart block "Edit box" link not rendered.** A visible link needs a `registerCheckoutFilters` script loaded in the Cart block, which I could not test without a browser. The edit URL and an `is_box` flag are exposed as Store API extension data (`extensions.mmbb` on each cart item) so it can be added later. The classic cart link is done. Stated in the readme FAQ.
- **Items mode in the Cart block:** quantities are locked through `woocommerce_store_api_product_quantity_editable`. The remove button on an item line cannot be hidden without JS, but removing one is handled on the next calculation (the box is dropped with a notice). Gaps to confirm in a browser; no Settings notice yet because the Settings screen is Phase 10.
- **Mixed tax classes** are not split in bundled mode (as the plan accepts).
- Variations whose attributes are "Any" cannot be added in items mode (WooCommerce needs every attribute); bundled mode has no such limit.
- The container is created for a draft only when the campaign is published, not on every draft save, so drafts never litter the Products list.

**Checks run:** build ✅ · lint:js ✅ · lint:css ✅ · composer lint ✅ (61 files, WPCS + PHPCompatibilityWP 7.4-) · test:js ✅ (184) · test:unit ✅ (75 tests, 464 assertions; new `BoxRulesTest`) · `php -l` ✅ · source scan of `includes/cart/`: no `<script>`/`<style>`, `__return_true`, `wp_redirect`, `$_REQUEST`, `eval`, `extract` or `$wpdb` · test:php ⏭ · Plugin Check ⏭ · manual wp-env checks ⏭

**Skipped checks (and why):** No Docker, so wp-env, the integration suites and Plugin Check did not run. `CartBoxTest` (container hidden and unpurchasable outside the builder, follows and trashes with the campaign, valid box added, contents and discount rows, expired nonce code, nonce endpoint, over capacity / foreign product / out of stock / empty / wrong size rejected, tampered price ignored, total follows a price change, sold-out item removes the box with a notice, gift wrap and message, coupons off by default and on by setting, order meta and hidden keys, stock reduced then restored, stock reduction setting off, items mode and header removal, edit replaces the line) is authored and linted but **not executed**. The manual checks with HPOS on and off, classic and block cart/checkout, and Cash on delivery did not run either.

**Open issues:** Run the integration suites and the manual matrix when Docker is available (HPOS on/off × classic/blocks × Cash on delivery). Confirm in a live site that Store API checkout copies only what `woocommerce_checkout_create_order_line_item` adds (no duplicate Contents rows) and that `woocommerce_reduce_order_stock` fires for a container line with no managed stock. Phase 8 reads `?mmbb_edit={cart_item_key}`, calls the two endpoints, and may add the Cart block link. Phase 10 adds the Settings notice for items mode in the Cart block. Confirm the nonce works for guests with a cached page (WooCommerce guest sessions).

### Phase 6 — Campaign wizard (2026-10-19)

**Done:** `src/admin/editor/`: the 5-step wizard plus the Published screen, behind
`action=edit&id=…&step=…`. One reducer (`state.js`) holds the saved copy, the draft and the
dirty flag; the dark unsaved bar shows on the first edit (Discard, Save campaign = PUT);
autosave PATCHes every 30 s while dirty; `beforeunload` warns. The server's sanitized
response becomes the saved copy. Steps: Basics (schedule as `datetime-local` in the store
zone, converted to UTC in `time.js`), Products (manual / category / tag, debounced search,
category chips, reorder with up/down buttons plus native drag, per-product cap),
Box rules (type cards, tiers or sizes editor, bundle, extras, inline validation),
Design (layout, words, toggles, accent, theme), Publish, Published. The shopper preview
(`Preview.js`) mounts the real storefront components with the draft and `quote()` from
`src/shared/pricing.js`; "Shoppers read" uses `TierProgress`, so the sentence comes from the
component strings. PHP: `Campaigns\Publisher` (container product, page, placement, publish),
`Campaigns\Page_Content` (the only content ever written: block comment or shortcode),
`/publish` now works. `Steps` accepts `href` and `onStep` together (client-side navigation
that still works as a link).

**Decisions:**

- **Container product (Phase 7).** An interface file would not autoload (the autoloader maps
  `class-*.php` only), so Phase 7 hooks the filter `mmbb_ensure_container_product`
  (return product id, `WP_Error`, or null). With no handler the campaign still goes live.
  Documented in readme.txt.
- **Page address and page title** are not part of the campaign config, so they live in
  `localStorage` (`mmbb:editor:{id}`) until go-live; the slug follows the campaign name
  until edited. The server stores only `placement.page_id`.
- Empty existing pages get the block, not the shortcode (the plan only says "otherwise
  shortcode" for pages with content and no blocks).
- Steps are all links; going forward past an invalid step sends you to that step with its
  errors shown. Errors appear after the first blocked Next, then stay live.
- Validation is stricter than the server in one place: a tier, size or percent value must be
  above zero (zero would give a free box on "box price").
- Save campaign turns secondary on the Publish step, so Go live is the only orange button.
- Fixed a Phase 5 bug: `tierSummary` read `t.type` instead of `discount_type`, so the
  "10 / 15 / 25% off" badge never showed on real data (its test fixture had the same slip).
- Dragging is native HTML5; no library added.

**Deviations from the plan (and why):**

- The preview has no Desktop/Mobile toggle and the Rules step has no Placement card (both in
  the older PNG, not in the plan). Duplicate/overflow buttons on a live campaign are not
  built; View on store is.
- Category/tag sources list terms (first 100) rather than products; term names beyond that
  are not shown.

**Visual comparison** (headless Edge, 1280 px and 390 px, mock REST data, not live
wp-admin): all five steps, fixed and bundle rules, dark panel design, Published and the
unsaved bar were compared with `CampaignEditorPage.png` and the Wizard prototypes. Layout,
copy and states match. Gaps: the sticky bar's 32 px admin-bar offset only shows in real
wp-admin; phone steps truncate the current label; "Shoppers read" is a stepper plus
`TierProgress` rather than one sentence. No JS errors, no external requests.

**Checks run:** build ✅ · lint:js ✅ · lint:css ✅ · composer lint ✅ · test:js ✅ (184: reducer,
every validation rule, time zones, slugs, editor flow with autosave on fake timers, blocked
Next, go-live new page / existing page / server 422) · test:unit ✅ (68; `Page_Content`) ·
test:php ⏭ · Plugin Check ⏭

**Skipped checks (and why):** No Docker, so `PublisherTest` (new page, existing block page,
existing classic page, invalid config refused, no `publish_pages`, container filter) and the
updated `RestCampaignsTest` are authored and linted but **not executed**; Plugin Check and
the live wp-env walkthrough (template picker to Go live, reload each step) also did not run.

**Open issues:** Run the integration suites and a live walkthrough when Docker is available.
Check how `wp_insert_post` kses treats the block comment for a user without
`unfiltered_html`. Phase 7 must register `mmbb_ensure_container_product`; Phase 8 registers
the `mmbb/box-builder` block the wizard writes.

### Phase 5 — Admin app: shell, dashboard, campaigns (2026-10-19)

**Done:** `Admin\Menu` (top-level "Mix and Max" at position 56 with Dashboard,
Campaigns, Analytics, Settings; every callback checks `manage_woocommerce` and prints
only `<div id="mmbb-admin" class="mmbb-root" data-page="…">`) and `Admin\Admin_Assets`
(enqueues `mmbb-components`, the `mmbb-admin` style and script only when the hook suffix
is one of ours; data through `wp_add_inline_script( …, 'before' )` with
`wp_json_encode()`; `wp_set_script_translations()`). `window.mmbbAdmin` holds `page`,
`urls`, `templates`, `money`, `adminUrl`, `storeUrl`, `version`, `wcVersion`,
`timezone` and `locale`. App in `src/admin/`: `App.js` picks the screen from
`data-page` plus `action`, `id` and `step`; `api.js` wraps `apiFetch`; the `AdminShell`
nav items are real `admin.php?page=…` links. Screens: Dashboard (first-run and active),
Campaigns list, template picker, delete dialog, and a "not available yet" screen for
the editor, Analytics and Settings. New `Modal` component in `src/components/`
(role `dialog` or `alertdialog`, `aria-modal`, labelled heading, Tab trap, Esc and scrim
close, initial focus on a chosen control, focus returned to the opener). `DataTable`
gained a `rowLabel` prop for the checkbox names.

**Decisions:**

- **Active tab.** The design's Active tab includes "Ending soon" rows, but
  `/campaigns?status=` takes one status. I added a `live` value (active plus ending soon)
  to the REST `status` enum and a `live` key in `counts`. It is additive, so nothing
  from Phase 4 changes. A Paused tab only shows when paused campaigns exist.
- **First-run vs active.** The Dashboard is first-run while the box count for the
  selected range and the previous range are both zero (stats have no all-time figure).
  Until Phase 9 fills `/stats`, every site sees first-run. The active layout was
  verified against mock data only.
- **Shapes Phase 9 must fill** (the schema only says `object`): `live_campaign` is
  `{ id, boxes_today, conversion }`; `top_products[]` is `{ name, count, note? }`;
  `kpis.*.series` are numbers (money in minor units); conversion is a percentage
  number. The Live now card falls back to the first live campaign when `live_campaign`
  is null. Top campaigns come from `/campaigns?orderby=revenue&per_page=50` filtered
  to live ones, because `/stats` has no campaign rows yet.
- **Create and Edit links.** "Create campaign" and "Start from a template" on the
  Dashboard go to `admin.php?page=mmbb-campaigns&action=new`, which opens the picker.
  Choosing a template POSTs `/campaigns` and goes to `edit_url` plus `&step=basics`.
  Phase 6 owns that screen; until then it shows the "not available yet" page.
- **Checklist actions.** campaign: Start (picker); products: Add products (editor,
  `step=products`); placed: Copy shortcode; test order: Mark as done (POST `/setup`);
  live: Go live (editor, `step=publish`). "Hide checklist" is remembered in
  `localStorage` under `mmbb:checklist-dismissed` (a per-browser convenience only).
- **Row menu** (View on store, Duplicate, Pause/Resume, Copy shortcode, Delete) is a
  small own component: `role="menu"`, arrow keys, Esc, fixed position so the table's
  scroll area cannot clip it. Pause, Resume, Duplicate and Delete all go through
  `POST /campaigns/bulk` with one id.
- **Thumbnails** come from `GET /products?include[]=` for the first three products of
  each campaign on the page. Campaigns with none show placeholder art, or one neutral
  tile when no products were picked.
- **Dates** use `Intl` with the store `timezone` (IANA name or fixed offset) and the
  user's `locale`; the year is added only when it differs from this year.
- **Padding fix.** Phase 2's admin CSS targeted `woocommerce_page_*` body classes. The
  menu is top level, so `Menu` adds `mmbb-admin-page` through `admin_body_class` and
  the CSS uses that. This closes the Phase 2 open issue.
- **Dependencies.** Added `@wordpress/api-fetch` 7.30.0 and `@wordpress/url` 4.30.0
  (the planned `api.js` wrapper needs them). Both are WordPress packages and stay
  external (`wp-api-fetch` and `wp-url` in `build/admin.asset.php`); nothing is bundled.
- The admin bundle imports components directly, so only the `mmbb-components` style is
  enqueued, not its script.
- The Help link opens the plugin's WordPress.org support forum in a new tab. It is a
  plain link the user clicks; nothing is requested in the background.

**Deviations from the plan (and why):**

- The delete dialog from the design has an "Also delete their analytics history"
  checkbox. There is no analytics store to delete from until Phase 9, so I left it out
  rather than ship a control that does nothing.
- Sorting by revenue or conversion still sorts by date (Phase 4 limitation).
- The shell's Help button is a link to the support forum (see above); the design
  shows a plain button.

**Visual comparison** (headless Edge, 1280 px, mock REST data; not live wp-admin):
Dashboard (active), Dashboard (first run), Campaigns with a selection, the template
picker, the delete dialog and the row menu were compared with
`design/screens/DashboardPage.png`, `CampaignsPage.png` and the prototype files.
Layout, copy, status badges, the bulk bar and the dialogs match. Remaining gaps:
"Hide checklist" (needed for the dismiss behaviour) is not in the design; the side
column is 380 px (the PNG shows about 388); thumbnails are placeholder art unless the
product has an image; the Dashboard header row sits about 20 px higher than in the PNG
because the control row is taller than the title block. No JavaScript errors or
external requests in the harness.

**Checks run:** build ✅ · lint:js ✅ · lint:css ✅ · composer lint ✅ (48 files) ·
test:js ✅ (132 tests, 9 suites: list reducer; Campaigns page filters, debounced
search, paging, selection and bulk, delete confirmation with focus on Cancel and
Pause instead, error with Retry; Dashboard first-run and active, range switch,
checklist dismiss; Modal focus trap, Esc, scrim, focus return; formatters) ·
test:unit ✅ (65 tests, 427 assertions) · test:php ⏭ · Plugin Check ⏭ · `php -l` on
every new PHP file ✅ · source scan: no `<script>`, `<style>`, `__return_true`,
superglobal or `wp_redirect` in `includes/admin/`.

**Skipped checks (and why):** Docker is not installed, so wp-env, the integration
suites and Plugin Check did not run. Authored but not executed: `AdminMenuTest`
(menu and capability, mount point, `wp_die` for a subscriber, assets loaded on our
screens and absent on Posts, Plugins and the WordPress dashboard, data keys) and the
new `live` assertions in `CampaignRepositoryTest` and `RestCampaignsTest`. The plan's
"every screen renders in wp-env against real REST data", "open Posts or Plugins and
confirm `mmbb-*` handles are absent" and the `WP_DEBUG` checks are therefore
unverified in a live WordPress.

**Open issues:** Run the integration suites and Plugin Check when Docker is
available, and look at the screens in a real wp-admin (page-hook suffixes, the
`mmbb-admin-page` body class, notices from other plugins, the 46 px admin bar on
phones). Phase 6 builds the editor behind `action=edit&id=…&step=…` (steps `basics`,
`products` and `publish` are already linked). Phase 9 must fill the shapes listed under
Decisions, make `orderby=revenue|conversion` real, and decide whether the delete
dialog gets its analytics checkbox. The Analytics and Settings screens are
placeholders until Phases 9 and 10.

### Phase 4 — REST API for the admin (2026-10-19)

**Done:** `Rest\Rest` module (boots every controller on `rest_api_init`) and
`Base_Controller` (namespace `mmbb/v1`; one `permissions_check()` requiring
`manage_woocommerce`, 401 when logged out and 403 otherwise; paging args and
`X-WP-Total` headers). Controllers, each with declared `args` and a schema:
`Campaigns_Controller` (`/campaigns` GET/POST, `/campaigns/{id}` GET/PUT/PATCH/DELETE,
`/duplicate`, `/publish`, `/preview`, `/bulk`), `Products_Controller`,
`Terms_Controller`, `Pages_Controller`, `Settings_Controller`, `Setup_Controller`
(GET plus POST `test_done`), `Stats_Controller`, `Analytics_Controller`.
`Config_Messages` translates `Config::validate()` codes for inline display.

**Decisions:**

- `GET /campaigns` returns `{ items, total, pages, counts }` (counts per computed
  status, ignoring the status filter) plus the standard paging headers.
- PUT replaces the config (sanitized onto the defaults) and PATCH merges a partial
  config (autosave). Neither accepts `container_product_id` from the client: the new
  `Campaign_Repository::set_container_product()` is the only writer, for Phase 7.
- DELETE trashes the campaign and its container product, but only when the
  product carries this campaign's `_mmbb_campaign_id`.
- `/publish` validates placement (400) and the whole config (422
  `mmbb_invalid_config` with `{ path, code, message }` errors), then answers 501
  `mmbb_not_implemented` until Phase 6. `/preview` returns the public config with
  `products: []` until Phase 8. `/stats` and `/analytics` return their final shape
  with zeros until Phase 9. `orderby=revenue|conversion` sorts by date until then.
- `/products` lists simple products and variations only; a category or tag
  filter limits it to simple products (variations carry no terms), and an unknown
  term is 400 `mmbb_invalid_term`. Prices are integer minor units plus WooCommerce's
  `price_html`.
- `/settings` POST args have no defaults, so a partial request changes only what
  it names. `/analytics` validates `from`/`to` as strict `Y-m-d` and limits a custom
  range to 366 days.
- WordPress checks argument validity before `permission_callback`, so an
  unauthenticated request with invalid arguments gets 400, not 401. Tests send valid
  bodies when asserting 401/403.

**Deviations from the plan (and why):** Phase 3 had committed
`SettingsSettings::class` and `CampaignsPost_Type::class` in `class-plugin.php`, and
`SettingsSettings::defaults()` in the installer. A shell-escaping slip dropped the
namespace backslashes, and the plugin would have fataled on boot. Fixed. Added
`tests/php/unit/ClassReferencesTest.php`, which resolves every `::class` in the
module and controller lists to a file, so the unit suite catches this without
WordPress. The work was split between this session and subagents (cost-router skill).

**Checks run:** build ✅ · lint:js ✅ · lint:css ✅ · composer lint ✅ (whole repo) · `php -l` on every REST file ✅ · test:js ✅ (90) · test:unit ✅ (65 tests, 421 assertions; the new class-reference guard was confirmed to fail on a reintroduced `SettingsSettings::class`) · test:php ⏭ · Plugin Check ⏭. Every route uses `Base_Controller::permissions_check`; there is no `__return_true`, superglobal or raw SQL in `includes/rest/`.

**Skipped checks (and why):** Docker is not installed, so the four new REST
integration suites (`RestCampaignsTest`, `RestCatalogTest`, `RestStoreTest`; 401,
403, 400 and happy path per route, schema keys against responses), the Phase 3
integration tests and Plugin Check have **not run**. They are authored and linted only.

**Open issues:** Run the integration suites when Docker is available.
The schema-key assertions in `RestStoreTest` read the schema from an OPTIONS
request; confirm that against a live server.

### Phase 3 — Data layer and pricing engine (2026-10-19)

**Done:** Added the private `mmbb_campaign` post type (all capabilities map to
`manage_woocommerce`), `Campaigns\Config` (schema, defaults, sanitize, validate),
`Campaigns\Status` (computed status), `Campaign_Repository` (find, query, create
from template, save, publish/unpublish, duplicate, pause, resume, delete), five
`Templates`, `Settings\Settings` (option `mmbb_settings`, all planned fields), the
`mmbb_events` and `mmbb_stats_daily` tables in the installer registry
(`DB_VERSION` 0.3.0), the pure `Pricing` engine with its JS twin
`src/shared/pricing.js`, and `Quotes` (store decimals plus the
`mmbb_pricing_quote` filter). Hooks: `mmbb_campaign_config_defaults`,
`mmbb_templates`, `mmbb_pricing_quote`, `mmbb_campaign_saved`; documented in a
"Developers" readme FAQ entry. `Plugin` now boots Settings and Post_Type.

**Decisions:**

- Money in a config (fixed amounts, box prices, bundle price, gift wrap fee) is a
  store-currency number such as 4.5. `Pricing` converts it with the `decimals`
  option (this is why the option exists); items, quotes and totals are integer minor units.
- Pure classes (`Pricing`, `Config`, `Status`) call no WordPress function, so they run
  in the unit suite. Filters live in `Quotes` and the repository. Config reports
  validation problems as `{ path, code }`; REST (Phase 4) translates the codes.
- A quote that is not valid has no discount, no fee and no tier; `next` is still
  returned for a tiered box so the UI can show progress. Errors: `empty`,
  `below_minimum`, `over_capacity`, `invalid_size`, `wrong_count`.
- Tiers and sizes: quantities are clamped to the capacity, then the first row per
  quantity wins, then they are sorted. Lowering the capacity re-clamps everything
  that depends on it.
- "Ending soon" counts 7 days on the store wall clock (`wp_timezone()`), so a week
  across a daylight-saving change is still 7 days. Status is computed in PHP, so
  `query()` loads all campaigns and filters/paginates in memory (a store has few).
- `Settings::sanitize` returns only the keys it was given (never fills defaults), and
  `Settings::get/all` merge defaults on read; `Settings::update` merges partial
  changes for the Phase 4 route. The installer now seeds the full defaults. Empty
  `cta_label` and `empty_slot_hint` mean "use the built-in translated text".
- Query `orderby` supports `date`, `title`, `modified`; `revenue` and `conversion`
  need Phase 9 data.

**Deviations from the plan (and why):**

- Post meta keys `_mmbb_config` and `_mmbb_paused` start with an underscore because
  the plan names them, as in Phase 1 for `_mmbb_campaign_id`.
- Phase 1 integration tests asserted the seeded settings were exactly
  `{ delete_data: false }`; they now compare with `Settings::defaults()`, and one
  fixture lists `enabled` before `delete_data` because sanitizing follows the schema order.
- The "Build-a-gift" template's "no prices inside" and "gift message required" have no
  config key in the Phase 3 schema; the template turns `gift_message` on and the rest
  is an open issue.
- Template prices (bundle 20, gift wrap 3) are placeholders in the store currency.

**Checks run:** build ✅ · lint:js ✅ · lint:css ✅ · composer lint ✅ (30 files) · test:js ✅ (90 tests, 4 suites; 33 shared pricing fixtures plus the minor-unit converter) · test:unit ✅ (63 tests, 378 assertions: Config bad input, bounds, tier sort and dedupe, length clamps; status including a DST edge; the same 33 pricing fixtures) · test:php ⏭ · Plugin Check ⏭

**Skipped checks (and why):** Docker is not installed, so `npx wp-env start`,
`npm run test:php` and Plugin Check could not run. The new integration tests
(`CampaignRepositoryTest`, `SettingsAndSchemaTest`: repository CRUD, duplicate,
query counts, status, templates, filters, settings sanitizing, both tables and
their keys) are authored and linted but **not executed**. `dbDelta` output, the
post type registration and `WP_DEBUG` notices are unverified.

**Open issues:** Run the Docker checks and fix anything the integration tests find.
Decide how the gift template expresses "no prices inside" and "message required"
(new config keys, Phase 6/8). Phase 7 must trash the container product when a
campaign is trashed (`Campaign_Repository::delete` does not know about products yet).

### Phase 2 — Design system inside the plugin (2026-10-19)

**Done:** Added `tools/build-tokens.mjs` and committed generated light/dark,
spacing, radius, shadow, family and type tokens under `.mmbb-root`. Copied both
variable fonts and both OFL licenses, and updated the readme's resource credits.
Ported the supplied component CSS with every selector scoped to `.mmbb-root`,
including the reduced-motion rules. Added isolated admin padding fixes.
Split every design component into its own module, with WordPress element imports,
local icon/art data, declarations and barrel exports. The handoff says 34
components but actually exports **35 including Sparkline**; all 35 are retained.

Added translations for default copy, complete tier sentences with reordered rich
placeholders, counted messages, countdown units, chart abbreviations and accessible
labels. Added a minor-unit money formatter and MoneyProvider for all price-bearing
components. Added Assets to the module registry: it registers shared CSS and the
component library, dependencies, translations and inline WooCommerce money settings
without enqueueing anything. Currency symbols are decoded in PHP before JSON.
Admin/storefront applications and their per-screen enqueues remain later work.

**Decisions:** All monetary component values are integer minor units (450 displays
as 4.50 with two decimals), consistent with the standing money rule and the future
pricing engine. The original `currency` props remain in the type contract as
deprecated inputs; MoneyProvider's WooCommerce settings determine formatting.
Without settings, the formatter assumes no currency symbol. Existing image URL
props still work; image objects additionally accept `src`, `srcset` and `sizes`.
Product names provide real-image alt text. Original icons and illustration colors
are retained. No runtime dependency was added.

Explicit `tokens` and `components` webpack entries emit separate CSS and asset
manifests. The component library exports through the permitted `window.mmbbComponents`
name; the prototype's `window.React` and `window.MixMax` are removed. PHP registers
`window.mmbbMoneySettings` with `wp_add_inline_script()` and `wp_json_encode()`;
MoneyProvider consumes it by default. Later rendering modules can also import
components directly and pass explicit settings. Webpack resolves source font URLs
from `../../assets/fonts/` into local `build/fonts/` files; built URLs were checked
on disk and in the browser. Release builds consume committed CSS, without design
files or the token generator.

**Behavior changes from the design (and why):**

- Button: disabled/loading links also suppress callbacks and leave the tab order;
  loading links expose `aria-busy`. Removing href alone did not disable callbacks.
- ProductTile, BoxSizePicker, BoxPanel and BoxSummaryBar: prices use minor units
  and context settings rather than the prototype's major-unit dollar formatter.
  BoxPanel shows any positive minor-unit saving, with no fractional-dollar epsilon.
- ProductTile, Chips, BoxSizePicker pills and BoxSlots remove buttons: storefront
  targets are at least 44px; the smaller handoff controls failed the standing rule.
- ProductTile, BoxSlots and BoxSummaryBar media: responsive image metadata is
  supported in addition to the original URL prop.
- TierProgress, BoxSlots, BoxSizePicker, BoxPanel, BoxSummaryBar, DataTable,
  Countdown, StatCard, LineChart, ProgressBar, QuantityStepper, Notice, Toast and
  AdminShell: default text/aria messages are translatable, with plural selection
  for count-bearing phrases. Tier emphasis and countdown number weight remain.
- FunnelChart: continuation from a zero-value preceding step displays 0% instead
  of Infinity/NaN. No other funnel calculation or interaction changed.
- Button hover: replaced the one raw CSS white value with the existing on-strong
  token, so the dark theme follows its token palette. Spacing and radius literals
  in the port use existing tokens or calculations preserving the handoff geometry.

**Tooling deviations:** Scoped ESLint's nested-ternary style exception to the
component port to preserve the design's rendering branches. Native label checks
remain enabled with depth 3 to recognize the wrapped inputs. Scoped Stylelint's
class pattern to allow the design's prefixed BEM/state classes, and disabled its
descending-specificity heuristic only for the component stylesheet's intentional
state/variant overrides. Admin body classes use WordPress's underscore names.
Other lint rules remain active. `lint:js` and `format` now include `tools/`, and
the Commands entry in AGENTS now describes the working token generator.

**Checks run:**

- `npm run tokens`: pass, reproducible generated CSS; `npm run build`: pass.
- `npm run lint:js` and `npm run lint:css`: pass, including generator and tests.
- `npm run test:js`: pass (56 tests, 3 suites): all 35 components render; stepper
  boundaries, tiers at 2/5/12, complete reordered translations, anchor behavior,
  responsive image attributes, money context, stock/fullness states, selection
  and chart keyboard behavior. Money tests cover all four positions, zero/three
  decimals, separators, negative amounts and an absent currency symbol.
- `composer run lint`: pass (17 PHP files, PHPCompatibilityWP 7.4-).
  `composer run test:unit`: pass (3 tests, 6 assertions). Reused the existing
  verified temporary Composer and Local PHP configuration; no machine changes.
- Authored/linted integration tests for registration without enqueueing, style
  dependency/version, script dependencies/translations, and decoded WooCommerce
  settings. These tests have not executed because Docker is unavailable.
- Headless Edge preview through a temporary Playwright harness: all 35 components
  rendered in both themes (70 examples), no JavaScript errors or external requests.
  Both local font families loaded, product stepper buttons measured 44px,
  reduced-motion transitions measured 0s, and outside content retained its theme
  font. Inspected light/dark previews plus product/panel screenshots against the
  supplied component PNG contact sheet. This was an isolated component preview,
  not a live wp-admin/storefront verification.
- Source scans: no prototype React global or quoted dollar default in components;
  no HTTP URLs in source/built CSS; no raw component CSS hex colors. AST scan found
  no untranslated JSX text or accessible-label defaults. Built font URLs resolve.
- `npm run plugin-zip`: pass, extracted/audited 84 files, no dev or hidden files.
  Both font/license pairs match their design originals byte-for-byte. Rebuilt the
  extracted package using installed dev dependencies, with no `design/` directory:
  pass. Webpack module audit found zero bundled React/ReactDOM modules; externals
  are WordPress element/i18n and ReactJSXRuntime. The components asset manifest
  lists `react-jsx-runtime`, `wp-element`, `wp-i18n`.
- `git diff --check`: pass. Existing no-root-entry scanner message remains harmless;
  all four explicit entries compile. No later phase was started.

**Skipped checks (and why):** Retried `npx wp-env start`, `npm run test:php` and
`npx wp-env run cli wp plugin check mix-and-max-box-builder`; all report
`Could not connect to Docker. Is it running?`. Integration execution, Plugin
Check, live WordPress enqueues/translations and WP_DEBUG logs remain unverified.
Actual PHP 7.4 and WordPress minimum/current runtime checks remain pending.

**Open issues:** Run the skipped Docker checks when available. Phase 5 must verify
the admin body-class padding selectors against its actual registered page hooks.
No admin menu or storefront builder was added in this phase.

### Phase 1 — Plugin skeleton and lifecycle (2026-10-19)

**Done:** Replaced the scaffold with the 0.1.0 plugin header, fixed constants,
own namespace autoloader, lifecycle hooks, and guarded HPOS and Cart/Checkout
blocks compatibility declarations. Added dependency-gated module registration
and dismissible WooCommerce requirement notices restricted to authorized users
on Plugins and plugin screens. Added activation, version-based admin upgrades,
network activation and new-site initialization, and an empty schema/schedule
registry for later phases. Added opt-in per-site uninstall, the guarded uninstall
entry point, a draft WordPress.org readme, and `languages/.gitkeep`.

**Decisions:** Default settings contain only `delete_data => false` in this phase;
Phase 3 adds the full settings schema and defaults. Existing merchant settings
are never overwritten by activation or upgrade, and newer stored versions are
never downgraded. Version options are not autoloaded. Network traversal uses
batches of 100 sites and restores the original blog context with `finally`.
New network sites initialize only when this plugin is network-active.
Deactivation preserves data and does not flush rewrite rules.

Uninstall checks each site's own deletion preference, deletes campaign posts
and metadata, selects only `product` records with the explicit container marker,
uses WooCommerce product CRUD when available (WordPress deletion otherwise),
and removes options, database-backed transients, and tables with escaped literal
prefixes. SQL values and identifiers use `$wpdb->prepare()` (`%i` is supported by
the WordPress minimum). Orders and order items are never selected for deletion.

The user supplied contributor `bestwpexpert`, author `bestwebexpert`, and website
`https://bestwebexpert.com/`; the website serves as both plugin and author URI
until a dedicated plugin page is available. Verified current release metadata
from the [WordPress version API](https://api.wordpress.org/core/version-check/1.7/)
(7.1.3) and [WooCommerce plugin API](https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request%5Bslug%5D=woocommerce)
(11.2.1). Draft compatibility headers target WordPress 7.1 and WooCommerce 11.2.1;
these are metadata targets, not completed runtime compatibility tests.

**Deviations from the plan (and why):** The general prefix rule forbids leading
underscores, but Phase 1 explicitly requires `_mmbb_campaign_id` for container
ownership; followed that specific key. Test-only campaign fixtures also use the
planned `_mmbb_config` key. Added a small shared `Sites` helper and a testable
`Uninstaller` class to support the required multisite lifecycle and uninstall
tests. Aligned `package.json` and its lockfile to 0.1.0. The first archive included
`languages/.gitkeep`; added `!**/.*` to the packaging allowlist and mirrored it in
`.distignore` so the Phase 0 no-hidden-files guarantee remains intact. No command
or dependency changed. Fonts and their licenses are accurately described as
pending Phase 2 rather than claimed as already bundled.

**Checks run:**

- `npm run build`: pass. The existing no-root-entry scanner message remains;
  both explicit placeholder entries compile successfully.
- `npm run lint:js` and `npm run lint:css`: pass.
- `composer run lint`: pass (15 PHP files; WPCS and PHPCompatibilityWP 7.4-).
- `npm run test:js`: pass (1 test).
- `composer run test:unit`: pass (3 tests, 6 assertions), including own-autoloader
  resolution, rejected foreign/invalid class names, and absent-WooCommerce checks.
- Added integration tests for installed versions/defaults, idempotent upgrades,
  preserving newer versions and settings, deactivation/reactivation, retained
  data with five non-opt-in preferences, opt-in removal with unrelated data and
  WooCommerce orders preserved, network activation, per-site deletion preferences,
  and new network sites. These tests are authored, linted, and not executed here.
- Local readme/metadata audit: pass (107-character short description, five tags,
  required sections present, and plugin/package/lockfile/readme versions agree).
  This is not an official WordPress.org validator or Plugin Check result.
- `npm run plugin-zip`: pass. Extracted and audited all 23 files against the
  allowlist in a unique OS-temp directory; no dev files or dotfiles. Contents:
  `LICENSE`, main plugin file, `uninstall.php`, `readme.txt`, `package.json`,
  `webpack.config.js`, six `includes/class-*.php` files, eight `build/` files,
  and the three existing `src/` files. The empty languages directory is tracked
  in Git; its placeholder is intentionally excluded from the zip.
- `git diff --check`: pass.

PHP/Composer were not on PATH in this shell. Used Local's existing PHP 8.2.29
binary with a temporary PHP configuration enabling its bundled mbstring,
OpenSSL and cURL extensions. Used Composer 2.10.3 from an OS-temp directory,
verified against its official SHA-256 checksum. No machine-wide configuration
or live WordPress database was changed.

**Skipped checks (and why):** Retried `npx wp-env start`, `npm run test:php`,
and `npx wp-env run cli wp plugin check mix-and-max-box-builder`; each reports
`Could not connect to Docker. Is it running?`. Therefore activation with
WooCommerce, deactivation/reactivation without notices, behavior after
WooCommerce deactivation/downgrade, the integration suites, Plugin Check, browser
notice behavior, and WP_DEBUG-log checks remain unverified. Actual PHP 7.4 and
WordPress-minimum/current runtime tests also require the missing environment.
These are skips, not passes. No later phase was started.

**Open issues:** Run the above Docker checks and compatibility checks when Docker
is available. Run the network tests as well as the single-site suite; the network
tests explicitly skip on single-site. With a multisite wp-env, pass the test
library's `WP_MULTISITE=1` flag:

```sh
npx wp-env run tests-cli --env-cwd=wp-content/plugins/mix-and-max-box-builder env MMBB_TEST_SUITE=integration WP_MULTISITE=1 vendor/bin/phpunit --testsuite=integration
```

Configure multisite through the ignored wp-env override (`"multisite": true`)
and restart with `npx wp-env start --update` before that run. Restore the desired
single-site configuration afterward. The public source repository URL remains
a clearly marked draft placeholder; replace it before submission. No plugin
transients are produced yet; when later phases add them, register their keys for
uninstall cleanup in persistent object caches (WordPress has no portable API to
enumerate arbitrary cached transient keys).

### Phase 0 — Tooling and repository (2026-10-19)

**Done:** Added private npm tooling, webpack extension with admin/storefront
placeholders and default block discovery, WordPress lint/format configs, Composer
dev tools, PHPCS/PHPCompatibility rules, two PHPUnit suites, React/PHP smoke tests,
wp-env config, GPLv2 licence, editor/Git settings, and release allowlist/exclusions.
Added the exact integration command and PHP override instructions to `AGENTS.md`.

**Decisions:** Only the two WordPress runtime packages currently imported are
direct dependencies; add other WordPress packages as later phases import them.
Pin `@wordpress/scripts` 31.8.0 for Node 20 compatibility. The `tokens` command is
reserved now; its generator and generated tokens intentionally arrive in Phase 2.
Pin wp-env 10.30.0 because newer versions pull Playground packages requiring Node
24.18+. Pin TypeScript 5.9.3 because npm otherwise selects TypeScript 7, which the
WordPress ESLint tooling cannot load. Checked every declared Node engine in the
resolved lockfile against Node 20.19.0: no incompatible package remains. This is
an engine-range check; commands were executed on Node 24.21.0.

**Deviations from the plan (and why):** The supplied starter kit had `docs/` and
`design/` nested under `mix-and-max-starter-kit/` and no Git repository. Moved the
two folders to the plugin root, initialized Git, and committed `Starter kit`
(`4f9ff1a`). A guarded no-op plugin header lets wp-env recognize the mapped plugin;
the actual bootstrap, lifecycle, uninstall and readme remain Phase 1 work. The
test bootstrap establishes `ABSPATH` before its guard, because pure PHPUnit runs
without WordPress; this test-only entry point is excluded from the release.

**Integration command:**

```sh
npx wp-env run tests-cli --env-cwd=wp-content/plugins/mix-and-max-box-builder env MMBB_TEST_SUITE=integration vendor/bin/phpunit --testsuite=integration
```

The current [wp-env docs](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/#using-composer-phpunit-and-wp-cli-tools)
describe `cli`. Checked the actual 10.30.0 package source:
`lib/build-docker-compose-config.js` creates `tests-cli`,
mounts `WP_TESTS_DIR=/wordpress-phpunit`, and uses a separate test database.
`lib/wordpress.js` generates its `wp-tests-config.php` with the
correct WordPress `ABSPATH`. The bootstrap reuses this config with Composer's
`wp-phpunit` library, loads WooCommerce on `muplugins_loaded`, and keeps the unit
suite independent of WordPress. Runtime verification remains pending Docker.

**Checks run:**

- `npm install` and Composer install: pass; both lockfiles committed.
- `npm run build`: pass. Both `.asset.php` files list `wp-element` and `wp-i18n`.
  The bundles reference `window.wp`; WordPress libraries are external.
- `npm run lint:js`, `npm run lint:css`, `npm run format`: pass.
- `composer run lint`: pass (5 PHP files); strict Composer manifest validation
  and platform requirement checks also pass.
- `npm run test:js`: pass (1 rendering smoke test).
- `composer run test:unit`: pass (1 test, 2 assertions; no WordPress loaded).
- `npm run plugin-zip`: pass. Extracted into a unique directory under the OS temp
  folder and checked every entry against the allowlist: 15 files, no dev folders
  or hidden files. Full contents are listed below.
- `git diff --check`: pass.

**Tool warnings:** The default webpack scanner says `No entry file discovered in
the "src" directory` because there is no root `src/index.js` or block metadata
yet. The two additional entries compile successfully; automatic block discovery
remains enabled for later phases. npm reports transitive deprecations and 111
development-dependency advisories (1 low, 38 moderate, 70 high, 2 critical).
`npm audit --omit=dev --json` reports zero advisories. Dependency directories are
excluded from the zip. Track the dev-tool advisories for a compatible toolchain
upgrade; no forced major upgrades were applied. npm 11 also leaves optional
native/core-js install scripts unapproved; all available local checks pass without them.

**Skipped checks (and why):** Docker is not installed/on PATH. wp-env startup,
integration smoke, Plugin Check, browser service checks, and WordPress debug-log
verification require that environment. No live merchant/local-site database was
used as a substitute. `npx wp-env start` on the final pinned version reports
`Could not connect to Docker. Is it running?`; earlier startup also confirmed
`spawn docker ENOENT`. Integration and Plugin Check on the final pinned version
also report that Docker is unavailable. They have not passed and are not counted
as passes.

**Open issues:** Run the Docker checks and record actual WordPress, WooCommerce
and Plugin Check versions before declaring the environment verified.
Review the development-tool advisories during hardening.

**Extracted zip contents** (`mix-and-max-box-builder/` root):

```text
LICENSE
mix-and-max-box-builder.php
package.json
webpack.config.js
build/admin-rtl.css
build/admin.asset.php
build/admin.css
build/admin.js
build/storefront-rtl.css
build/storefront.asset.php
build/storefront.css
build/storefront.js
src/admin/index.js
src/storefront/index.js
src/styles/scaffold.css
```

The remaining allowlisted plugin files/directories arrive in their planned
phases. This is a tooling scaffold archive, not a submission release.

<!-- Copy this block for each phase:

### Phase N — Title (YYYY-MM-DD)
**Done:**
**Decisions:**
**Deviations from the plan (and why):**
**Checks run:** build ✅ · lint ✅ · test:js ✅ · test:unit ✅ · test:php ✅ · Plugin Check ✅ (0 errors, n warnings: …)
**Skipped checks (and why):**
**Open issues:**
-->

## Open issues

The cross-phase review above replaces the historical "not executed" notes for
the PHP integration suites, network lifecycle tests and packaged Plugin Check.

- Runtime compatibility remains to be tested on PHP 7.4, WordPress 6.6 and
  WooCommerce 9.0. PHPCompatibilityWP checks pass; they do not replace those runs.
- The full browser matrix remains pending: Cart/Checkout blocks end to end with
  HPOS on/off, every campaign type, dark mode, both themes, and block-editor/wizard
  publishing. The completed browser smoke and classic COD order are listed above.
- Phase 7: the Cart block has no visible Edit box link yet. Items-mode child remove
  controls and wildcard-attribute variations retain the limitations in that phase's
  log. Store API metadata and quantity editability are covered by executed tests.
- Phase 3: the gift template still lacks config keys for "no prices inside" and
  "message required".
- A cached page's countdown depends on refreshing its embedded server timestamp;
  the device-clock offset does not fix indefinitely stale full-page HTML.
- Phase 1: Replace the readme's public source repository placeholder before
  submission; a dedicated plugin page can replace the supplied website URI.
- Phase 1: Future transient producers must register their keys so uninstall can
  also clean persistent object-cache entries, which cannot be enumerated through
  a portable WordPress API.
- Phase 0: Docker is unavailable. The pinned wp-env startup and container commands
  remain unverified; native tests used isolated databases with Local's services.
- Phase 0: npm reports 111 development-dependency advisories. Runtime dependencies
  have zero reported advisories; review compatible dev-tool updates in hardening.

## Compatibility matrix (Phase 11)

| Environment | Result | Notes |
| --- | --- | --- |
