# Redesign progress

Updated by the agent at the end of every part.

| Part | Title | Status | Commit |
| --- | --- | --- | --- |
| 0 | Audit and freeze | done | Redesign Part 0: Audit and freeze |
| 1 | Baseline and safety net | done | Redesign Part 1: Baseline and safety net |
| 2 | Admin foundation | done | Redesign Part 2: Admin foundation |
| 3 | Home, Boxes, Create a box | done | Redesign Part 3: Home, Boxes list and Create a box |
| 4 | Editor shell and iframe preview | not started | |
| 5 | Products and Discounts steps | not started | |
| 6 | Design settings and Design step | not started | |
| 7 | Template engine and templates 01–05 | not started | |
| 8 | Templates 06–10, phone layout, fonts | not started | |
| 9 | Publish flow | not started | |
| 10 | Analytics and Settings | not started | |
| 11 | Migration, compatibility, hardening | not started | |
| 12 | Release | not started | |

## Log

### Kit set-up (2026-11-11)
**Done:** Branch `redesign` created from `review-fixes`. The kit was unpacked into the repository root and its folder removed. Commit `Redesign kit`.
**Decisions:**
- The repository already had `docs/PROGRESS.md` (the 1.0 build log) and `design/README.md` (the 1.0 design handoff). Both are kept. The kit's copies are `docs/REDESIGN-PROGRESS.md` (this file) and `design/REDESIGN.md`, and every reference in the plan and the agent instructions points to these names.
- The kit's `AGENTS.md` and `CLAUDE.md` are appended to the existing files under `## Redesign`, as the plan says. One sentence was added: where a redesign rule and a 1.0 rule disagree, the redesign rule wins.
- `design/canvas`, `design/before` and `design/images` sit beside the 1.0 `design/prototype`, `design/screens` and `design/system`. `design/system/tokens.json` is still the source for `npm run tokens`.
- `.distignore` and the `files` list in `package.json` already keep `design/`, `docs/`, `AGENTS.md` and `CLAUDE.md` out of the zip, so neither changed.

### Part 0 — Audit and freeze (2026-11-11)
**Done:** `docs/AUDIT.md` written (identity, code map, imports, data, interfaces, features today vs redesign, risks). The Frozen identifiers table in `AGENTS.md` is filled in, with one added row for the hooks the plugin fires.
**Decisions:**
- The code and stored data say "campaign" where the design says "box". Stored names keep "campaign"; only labels change.
- All 1,002 translation calls in PHP and JS use the frozen text domain. Nothing needs fixing.
**Frozen identifiers touched:** none
**Data changes and migration steps:** none
**Checks run:** `docs/AUDIT.md` exists ✅ · no `_Part 0_` left in `AGENTS.md` ✅ · this part changed only `AGENTS.md` and `docs/` ✅
**Skipped checks (and why):** Build, lint and tests were not run, because no plugin code changed.
**Open issues:** The working tree still holds uncommitted changes from before the redesign ("Builder shopper preview tidied", 2026-11-08): `docs/PROGRESS.md`, `src/admin/editor/Preview.js`, `PreviewCard.js`, `editor.css` and `tests/js/editor/editor.test.js`. They are not part of any redesign commit. Commit them before Part 1 so its baseline is clean.

### Part 1 — Baseline and safety net (2026-11-11)
**Done:**
- Branch `release/2.0.0` cut from `redesign`. The uncommitted "Builder shopper preview tidied" work flagged in Part 0 is committed on its own first ("Tidy the builder shopper preview"), so this part starts clean.
- **Local environment.** Docker is still not installed, so wp-env cannot start. `tools/native-tests/wp-tests-config.php` runs the integration suite against the WordPress this checkout sits in (the Local site: WordPress 7.1.4, WooCommerce 11.2.2, Plugin Check 2.2.0, PHP 8.2.29) with a separate test database. The exact commands are in `AGENTS.md`, under "Commands → Without Docker". `tools/` is in `.distignore`, so none of it ships.
- **Baselines** in `docs/baseline/`: `plugin-check.txt` (0 errors, 0 warnings, in place with every category and on the packaged zip), `phpcs.txt` (0 errors, 0 warnings), `build-size.txt` (622 KB `build/`, zip 536,965 bytes).
- **Legacy fixtures** in `tests/fixtures/legacy/`, exported by running the unchanged 1.0.0 code: three boxes (tiered, fixed sizes using all three discount types, bundle) with their raw `_mmbb_config` and container products, the `mmbb_settings` option, a processing order with a box line and all its meta, and `expected.json` (what 1.0.0 answered). `tests/php/integration/LegacyFixturesTest.php` loads the rows, runs the upgrade as wp-admin would, then checks each box reads back, prices to the cent, renders through the shortcode (with and without overrides) and the block, and adds to the cart at the same total. It also checks the order still shows its discount, contents and gift message, and is not reduced from stock a second time.
- **Upgrade routine.** `includes/class-upgrades.php` (`MixMax\BoxBuilder\Upgrades`) holds ordered steps keyed by schema version. `Installer::install()` runs the pending ones. That covers activation, `admin_init` through the existing `maybe_upgrade()`, and new network sites. Each step saves `mmbb_db_version` when it finishes, so a failed run resumes at the step that failed. One empty step, `2.0.0`, for Parts 6 and 11. `Installer::DB_VERSION` is `2.0.0`.
- Tests: `tests/php/unit/UpgradesTest.php` covers ordering, skipping and downgrade, and that the constant matches the newest step. `tests/php/integration/UpgradesTest.php` covers order, the second run doing nothing, the retry after a failure, and a 1.0.0 site upgrading once with its settings and config byte for byte (the second `maybe_upgrade()` runs zero queries). It also checks that the version options are not autoloaded.
- Pricing parity already existed: `tests/php/unit/PricingTest.php` and `tests/js/pricing.test.js` share `tests/fixtures/pricing-cases.json`. Nothing added.

**Decisions:**
- No new option. The plan asks for "a stored DB/schema version option with the frozen prefix". That option already exists (`mmbb_db_version`, frozen), so the routine uses it and the `Installer::DB_VERSION` constant. Neither name changed.
- The schema version jumps from `0.9.0` to `2.0.0` so it lines up with the release. `maybe_upgrade()` already compares both version options, so the jump is what makes every 1.0.0 site run the new steps once.
- The fixtures use fixed post ids (9101–9303) so the stored references (product ids in the config, `container_product_id`, `_mmbb_campaign_id`) stay valid when loaded. The test inserts each container before its box, because publishing a box without one creates a second container.
- `LegacyFixturesTest` checks that every value 1.0.0 recorded is still there and allows new keys. Later parts can add config and payload keys without editing the fixtures.

**Frozen identifiers touched:** none. Only the value stored in `mmbb_db_version` moves (0.9.0 → 2.0.0); the note in the Frozen identifiers table says so.
**Data changes and migration steps:** step `2.0.0` added, and it is empty. It changes no stored data. No table changed, so `dbDelta()` statements are as before. No query was added; the new code only calls `get_option()` and `update_option()`. Version options stay non-autoloaded (tested).
**Checks run:** build ✅ (622 KB, unchanged) · lint:js ✅ · lint:css ✅ · PHPCS ✅ (0/0) · test:js ✅ (233) · test:unit ✅ (109 tests, 553 assertions) · integration, legacy orders: 190 tests, 7 failures, all from before this part (below) · integration, HPOS: same 7 · legacy fixtures ✅ (15 tests) · upgrade runs twice with no change the second time ✅ · Plugin Check ✅ (0 errors, 0 warnings) · no PHP notices or deprecations in either integration log with `WP_DEBUG` on ✅
**Skipped checks (and why):** wp-env, `npm run test:php` and container Plugin Check need Docker, which is not installed; the native runs above replace them. Plugin Check's runtime checks were not run, because they load the plugin into a live request and the only site here holds the owner's data. The minimum WordPress 6.6 / WooCommerce 9.0 / PHP 7.4 runtime is still for Part 11; PHPCompatibilityWP 7.4- passes statically.
**Open issues:**
- **7 integration tests already fail on the code before this part** (checked by rerunning them with the Part 1 installer change reverted). `PublisherTest` (5 tests) and `RestCampaignsTest::test_publish` build a box from the "holiday" preset with one product. The newer `not_enough_products` validation (min 4 items, one product) rejects it, so the publish route answers 422. `RestCampaignsTest::test_preview` expects the payload keys from before `colors` and `freeGift` were added. These are stale tests, not broken features, and the legacy fixtures publish, price and render fine. Fixing them is outside this part; suggest a short fix commit before Part 4, which changes publish and preview.
- The Local site runs this checkout. Its `mmbb_db_version` moves to `2.0.0` the next time wp-admin loads. The step is empty, so no data changes.

### Part 2 — Admin foundation (2026-11-11)
**Done:**
- `src/admin/components/` holds the new shared admin pieces, built on `@wordpress/components`:
  - `wp.js` is the only file that imports `__experimental*` components. It re-exports the eight from the plan under stable names.
  - `AppShell`: white header with the box mark and name, real `admin.php?page=…` links (`aria-current` on the current one), Help on the right, and content up to 1160px wide.
  - `PageHeader`, `StatCard` + `StatGroup`, `StatusBadge` (word + dot for all six computed statuses), `EmptyState`.
  - `DataTable`: a plain `<table>` with a hidden caption, `aria-sort`, sort buttons (sorted here, or by the caller through `sort`/`onSort`), and row and select-all checkboxes (`CheckboxControl`, indeterminate).
  - `Notices`: a `SnackbarList` fed by the `core/notices` store in its own context (`mmbb-admin`), plus `useSnackbar()`. Mounted once in `App.js`.
- `src/admin/components/app.css` carries the admin rules from `design/canvas/wp.css` (header, nav, main, title, stats, badge, table, empty state, snackbars), scoped under `.mmbb-app` / `.mmbb-app-*`. The accent is `var(--wp-admin-theme-color)`, so the merchant's admin colour scheme applies. It is bundled into the existing `build/admin.css` (handle `mmbb-admin`).
- `src/admin/Shell.js`, the wrapper all five screens already use, now renders `AppShell`. Dashboard, Campaigns (list and new), the editor, Analytics and Settings all load inside the new header and keep their old content until Parts 3–10. The editor passes `wide` so its two-column layout isn't squeezed to 1160px before Part 4 replaces it.
- `Admin_Assets::enqueue()` enqueues the `wp-components` stylesheet, only on our four screens (the existing `Menu::page_for_hook()` gate). `mmbb-admin` depends on it. `wp_set_script_translations( 'mmbb-admin', 'productboxes-mix-and-match-box-builder', … )` was already in place and is unchanged.
- `build/admin.asset.php` now lists `react-jsx-runtime, wp-api-fetch, wp-components, wp-data, wp-element, wp-i18n, wp-notices, wp-primitives, wp-url`.
- Tests: `tests/js/admin/app-components.test.js` (17) covers the experimental re-exports, shell links and current page, frozen slugs in the nav, the header pieces, every status badge, DataTable sort (own and controlled), selection, the empty row, and that snackbars from another context don't show. `AdminMenuTest` now asserts that `wp-components` is enqueued on our screen only, and that the labels changed while the slugs did not.

**Decisions:**
- **Menu and nav labels are now Home and Boxes** (open issue 8). The plan says to change labels where the audit shows they differ from the design. Slugs (`mmbb`, `mmbb-campaigns`) and page ids are unchanged. The old screens' own page titles ("Dashboard", "Campaigns") stay until Part 3 rebuilds those screens. Reverting means two strings in `class-menu.php` and two in `Shell.js`.
- **No `wp-icons` dependency** (open issue 10, audit risk 9). `@wordpress/scripts` 31.8.0 bundles `@wordpress/icons`; WordPress ships no `wp-icons` handle for 6.6. The two icons used (help, external) are tree-shaken into `admin.js`, and `@wordpress/primitives` comes from WordPress (`wp-primitives`). `admin.js` grew 605 bytes.
- **New packages pinned to the same WordPress release as `@wordpress/components` 30.3.0**: `@wordpress/data` 10.30.0, `@wordpress/notices` 5.30.0, `@wordpress/icons` 10.30.0. There is also an npm `overrides` entry pinning `@wordpress/rich-text` to 7.30.0. The lockfile had `rich-text` 7.57.0, whose nested `@wordpress/private-apis` 2.0.0 cannot unlock the objects `components` 30.3.0 locks with 1.x. Importing `@wordpress/components` in Jest failed with "Cannot unlock an object that was not locked before". The block editor code never hit it because no test imported it. Production is unaffected either way: all of these are externals loaded from WordPress.
- `.mmbb-app__main` has no flex gap, so the old screens keep their spacing. New screens wrap their content in `.mmbb-app-stack` (24px rhythm, as in the design).
- The existing `ToastProvider` (plugin toasts) stays for the old screens. New screens use `useSnackbar()`. Old design-system components (`src/components`, `window.mmbbComponents`, `AdminShell`) are untouched.
- `.stylelintrc.json` gives `app.css` the `mmbb-` class pattern, with WordPress's own `folded` / `auto-fold` body classes allowed (the snackbar list moves with the folded admin menu).

**Frozen identifiers touched:** none. Handles, page slugs, the mount point (`#mmbb-admin.mmbb-root`), `window.mmbbAdmin` and the text domain are unchanged. Only two menu labels changed (labels are not identifiers).
**Data changes and migration steps:** none.
**Checks run:** build ✅ (`build/` 642 KB; `admin.js` 192,664 bytes, +605; `admin.css` 32,925 bytes) · no React or `@wordpress/*` copy in `admin.js` ✅ (searched for React internals and package code) · `admin.asset.php` lists `wp-components` ✅ · lint:js ✅ · lint:css ✅ · PHPCS ✅ (0/0) · test:js ✅ (250, 17 new) · test:unit ✅ (109) · integration, legacy orders: 190 tests, the same 7 failures as Part 1 and no new ones · integration, HPOS: same 7 · legacy fixtures ✅ (15 tests) · `AdminMenuTest` ✅ · `wp i18n make-pot . --domain=productboxes-mix-and-match-box-builder` ✅. It printed three duplicate-translator-comment warnings, all from before this part. A fourth, from the new `Select %s`, was fixed by reusing the existing comment. · Plugin Check in place ✅ (no errors, same as the baseline) · plugin-review PHPCS ruleset on the packaged zip ✅ (zip 551,328 bytes)
**Skipped checks (and why):** No browser was driven here, so the shell was not looked at against `design/canvas/Main.dc.html` on screen. Every screen renders inside it in Jest (dashboard, campaigns, settings, analytics and editor tests). wp-env needs Docker, as in Part 1.
**Open issues:**
- Open issue 8 is answered by the plan's rule (labels now Home and Boxes). Say so if you'd rather keep Dashboard and Campaigns.
- The 7 stale integration tests from Part 1 still fail. They are untouched here.

### Part 3 — Home, Boxes list and Create a box (2026-11-11)
**Done:**
- **Home** (`src/admin/dashboard/Dashboard.js`, rewritten in place) on `@wordpress/components`:
  - Page header "Home" with a 7 / 30 / 90 days `ToggleGroupControl` (from `components/wp.js`) and Create box.
  - The setup checklist card.
  - Four stat cards: revenue and boxes sold with "+$x vs previous 30 days", average box value with "6 items per box", conversion with "37 visits, 1 order".
  - "Your boxes": thumbnail, name, detail line, status, this period's sold and revenue, Edit.
  - "Most picked" bars scaled to the top product.
- **Setup checklist** (`SetupChecklist.js`, rewritten):
  - Four steps: create a box, add products, put it on a page, place a test order. Done steps show what was done ("Holiday treat box", "5 products picked").
  - The next step is highlighted, and its action is the primary button: Create a box, Add products → editor `step=products`, Add to a page → editor `step=publish`, Open the box plus Mark as done.
  - Dismissing it stores the new user meta `mmbb_checklist_dismissed` through `POST /setup { dismissed }`. A 1.0 dismissal in `localStorage` (`mmbb:checklist-dismissed`) is carried over to user meta the first time Home loads.
- **Boxes** (`src/admin/campaigns/Campaigns.js`, rewritten):
  - Tabs All / Live / Drafts / Ended with counts, and a 300 ms debounced `SearchControl`.
  - `DataTable` columns: checkbox, Box (thumbnail stack + "Bigger box, bigger discount · up to 12"), Status, Shown on (page path, or "Add to a page" → editor `step=publish`), Sold, Revenue, Edit, and a `DropdownMenu` with Duplicate, Pause or Resume, and Move to trash.
  - A bulk bar on selection: Duplicate, Pause, Resume, Move to trash, Clear selection. Results show as snackbars.
  - Move to trash asks first (`TrashDialog.js`) and uses the existing bulk `delete` action, which trashes the box and its container product.
- **Create a box** (`campaigns/CreateBoxModal.js`):
  - A WordPress `Modal` with a Box name `TextControl`, three radio choice cards (tiered / fixed / bundle) and the info `Notice`.
  - Cancel and "Create and pick products". Creating POSTs `{ template: 'blank', title, type }` and opens the editor at `step=products`.
  - It opens from Home, the Boxes header and the empty states, and on load from `action=new` (the menu's existing `newCampaign` link).
- **States:** `Spinner` placeholders sit inside the real cards and table rows, so the layout doesn't jump. Reloads dim the table. Failures show an error `Notice` with Retry. Empty states follow the design.
- **Server:**
  - `POST /campaigns` takes an optional `type` (enum `''` / tiered / fixed / bundle). With the blank template it starts from `Templates::starter( $type )`: tiered 4 = 10%, 6 = 15%, up to 12; fixed one 6-pack at 10%; bundle 3 items, price to set.
  - `POST /setup`: `test_done` is no longer required; it takes `test_done` and/or `dismissed`, and sending neither is a 400 as before.
  - `GET /setup` adds `dismissed` for the current user.
  - `GET /stats` adds `funnel`, which the report already computed.
  - Uninstall with "Delete all plugin data" removes `mmbb_checklist_dismissed` from every user.
- New shared pieces: `components/BoxThumbs.js`, `components/screens.css` (bundled into `build/admin.css`; modal rules scoped to `.mmbb-app-modal` because WordPress renders modals outside `.mmbb-app`), format helpers `boxTypeTitle`, `boxSummary`, `boxDetails`, `shownOnPath`, and `src/admin/navigate.js` (one place that calls `location.assign`, so Jest can stand in for it).
- Tests:
  - `tests/js/admin/dashboard.test.js` (10) and `campaigns.test.js` (13) are rewritten for the new screens.
  - New `box-format.test.js` (4).
  - PHP: `RestCampaignsTest::test_create_with_type`, `RestStoreTest::test_setup_dismissed_is_per_user` (and the old "requires test_done" test, now "test_done or dismissed"), a funnel assertion in `test_stats_7d_has_seven_days`, and the user meta in `LifecycleTest`'s opt-in uninstall.

**Decisions:**
- **Rewritten in place, not added beside.** Home and Boxes keep their module names and paths (`dashboard/Dashboard.js`, `dashboard/SetupChecklist.js`, `campaigns/Campaigns.js`), so imports and `App.js` routing are unchanged. The only change in `App.js` is that `Campaigns`' prop is now `openCreate`.
- **Old modules left in place, now unused by these screens:** `TemplatePicker.js`, `DeleteDialog.js`, `RowMenu.js`, `CampaignThumbs.js` (its `useProductImages` hook is still used). Nothing else imports them. Deleting them can wait for Part 6 (TemplatePicker) or Part 11.
- **Four checklist steps, six in the payload.** `GET /setup` still reports `woocommerce` and `live`. Home draws the four from the design. A missing WooCommerce already gets the Plugins-screen notice from `Requirements`. The design's "About two minutes left" was dropped: there is nothing to base an honest estimate on.
- **Tabs:** scheduled and paused boxes have no tab of their own and show under All, as in the design. Stored statuses are unchanged. "Live" is the existing `live` filter (active + ending soon).
- **Create a box vs presets (open issue 3).** The modal creates from `type` with the blank template. The five presets still exist: the `mmbb_templates` filter and the `template` arg keep their meaning, and the type applies only with `blank`. No screen offers the presets right now. Part 6 decides whether they come back.
- **Bundle example** in the modal reads "3 for one price" rather than an amount: no price exists before the box does.
- **Home "Your boxes" uses this period's numbers** (from `stats.top_campaigns`), matching "How your boxes did in the last 30 days". Boxes shows all-time numbers, as 1.0 did.
- The Boxes list loses 1.0's type filter, sort select and Copy shortcode menu item, which the design doesn't draw. The REST args stay. Copy shortcode belongs to Publish (Part 9).
- `screens.css` gets its own stylelint override that also allows `components-*` classes, because it adjusts spacing inside WordPress components. `app.css` keeps its stricter pattern.
- "Untitled campaign" (the server's default name) is unchanged. It is shared with the editor and container products; relabel it with the editor in Part 4.

**Frozen identifiers touched:** none renamed. One **new** identifier: user meta `mmbb_checklist_dismissed`, added to the Frozen identifiers table and `docs/AUDIT.md`. The localStorage key `mmbb:checklist-dismissed` is still read, for the one-time carry-over.
**Data changes and migration steps:** No stored data changes, and no upgrade step is needed. The one-time carry-over of the localStorage dismissal runs in the browser and only adds user meta. No query was added beyond `get_user_meta` / `update_user_meta` / `delete_user_meta`, plus one `delete_metadata()` on opt-in uninstall.
**Checks run:**
- build ✅ (`build/` 646 KB; `admin.js` 191,486 bytes, −1,178; `admin.css` 39,463 bytes)
- `admin.asset.php` unchanged, still with `wp-components` and no React copy ✅
- lint:js ✅ · lint:css ✅ · PHPCS ✅ (0/0)
- test:js ✅ (20 suites, 261 tests) · test:unit ✅ (109)
- integration, legacy orders: 192 tests, the same 7 stale failures as Parts 1–2 and no new ones · integration, HPOS: the same
- legacy fixtures ✅ (15 tests)
- Plugin Check in place ✅ (no errors, same as the baseline) · plugin-review PHPCS ruleset on the packaged zip ✅ (zip 560,778 bytes)
- `wp i18n make-pot` with the frozen domain ✅. One new duplicate-translator-comment warning ("%d selected") was fixed by reusing the existing comment; the three from before this part remain.
- Keyboard and screen reader, in Jest: Escape closes both modals; Cancel closes Create a box; the radio cards are native radios in a fieldset with a legend; icon buttons have labels ("Hide the setup checklist", "More actions for …"); row checkboxes are named "Select …"; and the external page links say "(opens in a new tab)".

**Skipped checks (and why):**
- No browser was driven, so the screens were not compared on screen with `design/canvas/Main`, `Boxes` and `NewBox`, and focus moving into the modal was not observed. WordPress's `Modal` traps focus and is asked to focus the name field (`focusOnMount="firstContentElement"`). jsdom has no layout, so the tabbable lookup finds nothing there and that assertion can't run in Jest.
- "With the Part 1 fixtures loaded, all three screens show real data" was checked through the REST routes the screens call, in the integration suite, and through the screens in Jest with fixture-shaped data. It was not checked by loading wp-admin on the Local site, which holds the owner's data.
- wp-env needs Docker, as in Part 1.

**Open issues:**
- Open issue 3 (presets) is now visible: no screen offers the five presets. Say whether Part 6 should bring them back as a "Start from" choice, or retire them.
- The 7 stale integration tests from Part 1 still fail (`PublisherTest`, `RestCampaignsTest::test_publish` and `test_preview`). Part 4 changes publish and preview, so fix them before or in Part 4.

<!-- Copy for each part:

### Part N — Title (YYYY-MM-DD)
**Done:**
**Decisions:**
**Frozen identifiers touched:** none (or explain)
**Data changes and migration steps:**
**Checks run:** build ✅ · lint ✅ · tests ✅ · legacy fixtures ✅ · Plugin Check ✅ (vs baseline)
**Skipped checks (and why):**
**Open issues:**
-->

## Open issues

Questions for the owner from Part 0. The numbers in brackets are the risks in `docs/AUDIT.md`.

1. **The `design.layout` key (risk 1).** It is a string today and an object in the Part 6 schema. Proposed: keep the old string as it is and store the new width and padding under `design.spacing`.
2. **Old design keys (risk 2).** Proposed: the Part 6 migration copies `headline`, `intro`, `cta_label`, `columns`, `show_ladder`, accent and theme colours into the new nested keys once, and the old keys stay stored but unused.
3. **"Template" has two meanings (risk 4).** The five starting presets (Holiday treat box, Build-a-spa kit, Snack pack, Build-a-gift, blank) are not in the new Create a box modal. Keep them somewhere, or retire them? The `mmbb_templates` filter and the `template` REST arg stay either way.
4. **Coupons per box (risk 5).** The design has "Allow coupons on this box" and also keeps the store-wide setting. Which wins? Proposed: the box setting, defaulting to the store setting.
5. **Countdown (risk 6).** The design offers only "the last 3 days". Today a merchant picks 0 to 30 days. Keep the number, or fix it at 3 for new boxes?
6. **Gift wrap and note (risk 7).** One toggle in the design, two separate options today. Proposed: keep both keys and show two toggles.
7. **Features with no place in the new design:** size tags (popular, best value), fixed-amount and box-price tiers, the sticker text, custom ladder and countdown colours, low-stock notes, the unlock toast, the store-wide button label and empty-slot hint, and "Load assets only on builder pages". Proposed: keep the data and behaviour, and give each a control where it fits; none is removed without your say.
8. **Admin menu labels.** The design says Home and Boxes; the menu says Dashboard and Campaigns. Labels are not identifiers. Change them? *Part 2: changed to Home and Boxes per the plan; slugs unchanged. Easy to revert.*
9. **Figtree.** Today's storefront and admin use it, and it is not in the new font list. Keep shipping it for the Spotlight template?
10. **`@wordpress/icons` (risk 9).** It is compiled into our script by `@wordpress/scripts`, not loaded from WordPress, so Part 2's `wp-icons` dependency does not apply. No minimum WordPress bump is needed so far. *Part 2: confirmed, no `wp-icons` handle; icons are tree-shaken into `admin.js`.*
11. **WP-CLI** is needed for `wp i18n make-pot` (Parts 2 and 11) and was not on PATH here.

## Compatibility matrix (Part 11)

| Environment | Result | Notes |
| --- | --- | --- |
