# ProductBoxes redesign — update plan for Claude Code and Codex

This plan updates your **existing** plugin to the new design in 13 parts (0 to 12). Each part is a self-contained prompt: give an agent the part number and it knows what to read, what to change, what must stay the same, and how to prove the part is done.

- **Standing rules** are in `AGENTS.md`. The most important: the text domain, slug, prefix, imports and stored data stay exactly as they are today.
- **The design** is in `design/`. `design/REDESIGN.md` maps each screen to its file and lists the template defaults and the component map.
- **Progress** is tracked in `docs/REDESIGN-PROGRESS.md`, which the agent updates after every part.

---

## How to use it

### 1. Set up once

1. Open your plugin's git repository and create a branch: `git checkout -b redesign`.
2. Unzip this kit **into the repository root**. You get `AGENTS.md`, `CLAUDE.md`, `docs/REDESIGN-PLAN.md`, `docs/REDESIGN-PROGRESS.md` and `design/`.
   - If the repo already has an `AGENTS.md` or `CLAUDE.md`, keep yours and paste this kit's content below it under a heading `## Redesign`.
3. Make sure `design/` and `docs/` are excluded from the release zip. That means `.distignore`, and the `files` field in `package.json` if the plugin uses `wp-scripts plugin-zip`.
4. Commit: `Redesign kit`.

### 2. Run one part at a time

Open Claude Code or Codex in the repository root and send:

```text
Run Part 0 of docs/REDESIGN-PLAN.md.
```

Longer form, if the agent drifts:

```text
Implement Part {N} of docs/REDESIGN-PLAN.md on the existing plugin.
1. Read AGENTS.md (especially "Frozen identifiers"), docs/REDESIGN-PROGRESS.md, the "Part {N}" section, and every file under "Read first".
2. Reply with a short plan: the files you'll change or add, and anything that conflicts with the current code.
3. Build it. Keep the text domain, prefix, imports and stored data unchanged. Stay inside this part.
4. Run every "Done when" check. Fix failures, or record why a check can't run here.
5. Update docs/REDESIGN-PROGRESS.md and commit "Redesign Part {N}: {title}".
```

### 3. Have the other agent review (recommended)

```text
Review Redesign Part {N} against docs/REDESIGN-PLAN.md and AGENTS.md. Don't edit files.
Report findings by severity (blocker / should fix / nice to have) with file and line.
Check especially: frozen identifiers unchanged, text domain on every string, existing data still works,
security (capability + nonce + sanitize + escape), WordPress.org rules, and the UI against design/.
```

Then hand the findings back to the builder:

```text
Fix these review findings for Redesign Part {N}, re-run the Done-when checks, update docs/REDESIGN-PROGRESS.md
and commit "Redesign Part {N}: review fixes".
<paste findings>
```

### Part map

| # | Part | Result | Needs |
| --- | --- | --- | --- |
| 0 | Audit and freeze | `docs/AUDIT.md` written, Frozen identifiers filled in. No code changes | — |
| 1 | Baseline and safety net | Tests and Plugin Check baseline, upgrade routine, fixtures of today's data | 0 |
| 2 | Admin foundation | Admin shell, header nav, routing and shared pieces built on `@wordpress/components` | 1 |
| 3 | Home, Boxes, Create a box | The three entry screens | 2 |
| 4 | Editor shell and iframe preview | Full-screen editor, 3 steps, live iframe preview, save, autosave, undo | 3 |
| 5 | Products and Discounts steps | Steps 1 and 2 on the existing box data | 4 |
| 6 | Design settings and Design step | Style schema, Template / Style / Content sidebar, Match my site | 5 |
| 7 | Template engine and templates 01–05 | CSS-variable engine plus five templates | 6 |
| 8 | Templates 06–10, phone layout, fonts | All ten templates, phone bar and drawer, local fonts | 7 |
| 9 | Publish flow | Placement, schedule, success state, block and shortcode updates | 8 |
| 10 | Analytics and Settings | Both screens restyled on the same data | 2 |
| 11 | Migration, compatibility, hardening | Old boxes upgraded, Plugin Check clean, compatibility matrix | 9, 10 |
| 12 | Release | Version bump, changelog, readme, screenshots, zip, SVN | 11 |

Part 10 can run any time after Part 2.

---

## Part 0 — Audit and freeze

**Goal:** know exactly what exists before changing anything, and lock every identifier that must never change. **Don't change any plugin code in this part.**

**Read first:** `AGENTS.md`, `design/REDESIGN.md`, `design/before/*.png`, and the whole plugin source (main file, `includes/` or equivalent, `src/`, `package.json`, `composer.json`, `readme.txt`, any `block.json`).

**Do:**

1. Write `docs/AUDIT.md` with these sections:
   - **Identity:** plugin name, slug, main file, version, the `Requires …` headers, **text domain** and Domain Path. Confirm every `__()`, `_e()`, `esc_html__()` and JS `__()` call uses that text domain, and list any call that doesn't.
   - **Code map:** PHP classes and files with their responsibilities, the JS entry points, build tooling and output, and the dependencies in `package.json` and `composer.json`.
   - **Imports:** how JS imports WordPress packages today (named imports from `@wordpress/*`, or the `wp.*` globals), and which `@wordpress/*` packages are used. List the script handles and their dependencies, from `.asset.php` files or `wp_register_script`.
   - **Data:**
     - every option, transient, post meta, order meta and order item meta key, each with an example value;
     - the custom post type and its statuses;
     - the custom tables with their schema;
     - the shape of a box/campaign config, with a real JSON example taken from the code or the database;
     - the stored settings.
   - **Interfaces:** REST routes (method, path, permission), AJAX and wc-ajax actions, the shortcode and its attributes, block names and attributes, hooks the plugin fires (`do_action` / `apply_filters`), and admin page slugs.
   - **Features today vs redesign:** a table with one row per screen in `design/REDESIGN.md`. Columns: what exists now, what changes, what's new, and the data it needs. Flag anything in the design that has no backing data yet, such as free gift, button style or the template slug.
   - **Risks:** places where the new UI needs a data change, and anything that would break existing boxes.
2. Fill in the **Frozen identifiers** table in `AGENTS.md` from the audit.
3. List open questions for the owner in `docs/REDESIGN-PROGRESS.md` under "Open issues". Examples: a feature in the design the plugin doesn't have; a minimum WordPress version bump.

**Done when:** `docs/AUDIT.md` exists, the Frozen identifiers table has no `_Part 0_` left in it, `git diff` shows no changes outside `AGENTS.md` and `docs/`, and PROGRESS is updated.

**References:** [Plugin header requirements](https://developer.wordpress.org/plugins/plugin-basics/header-requirements/), [How to internationalize your plugin](https://developer.wordpress.org/plugins/internationalization/how-to-internationalize-your-plugin/), [Dependency extraction](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-dependency-extraction-webpack-plugin/).

---

## Part 1 — Baseline and safety net

**Goal:** before the UI changes, capture how the plugin behaves today so every later part can prove nothing broke.

**Read first:** `docs/AUDIT.md`, `AGENTS.md`.

**Build:**

1. **Local environment:** make sure `@wordpress/env` (or the repo's existing setup) starts WordPress with WooCommerce and Plugin Check. Write the exact commands in `AGENTS.md` under a new "Commands" section.
2. **Baselines:**
   - Run Plugin Check (all categories) and PHPCS if the repo has it. Save the results to `docs/baseline/plugin-check.txt` and `docs/baseline/phpcs.txt`.
   - Record the current build output size.
3. **Data fixtures:**
   - Export 3 real-looking boxes covering each discount type, the settings option and one order with a box line into `tests/fixtures/legacy/`, as JSON in the existing stored shapes.
   - Add an integration test that loads them and checks that each box still prices, renders and adds to the cart correctly.
4. **Upgrade routine:**
   - If the plugin has no versioned upgrade routine yet, add one: compare a stored DB/schema version option (use the frozen prefix) with a constant, run ordered migration steps on `admin_init` and on activation, and make every step idempotent.
   - Add one empty step for the redesign (filled in Parts 6 and 11).
   - Never drop or rename stored keys. New fields get defaults.
5. **Pricing parity:** if the plugin has pricing in both PHP and JS, add shared fixture tests if they don't exist yet.

**WordPress.org checks this part:** `dbDelta()` for any table change, `$wpdb->prepare()` for every query, and no autoloaded large options.

**Done when:**

- The legacy-fixture tests pass on the current code.
- The upgrade routine runs twice with no changes the second time.
- The baselines are saved.
- Lint and build are unchanged or clean.

**References:** [@wordpress/env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/), [Plugin Check](https://wordpress.org/plugins/plugin-check/), [Activation and deactivation hooks](https://developer.wordpress.org/plugins/plugin-basics/activation-deactivation-hooks/), [dbDelta()](https://developer.wordpress.org/reference/functions/dbdelta/).

---

## Part 2 — Admin foundation on `@wordpress/components`

**Goal:** one admin app shell that every redesigned screen uses, built from the real WordPress components and loaded the WordPress way.

**Read first:**

- `design/canvas/Main.dc.html`: the header and nav bar markup, `.pb-head`, `.pb-nav`, `.pb-main`.
- `design/canvas/wp.css`
- `design/canvas/lib/components-map.js`
- `design/REDESIGN.md` → "Admin component map"

**Build:**

1. **Script dependencies:** keep the existing admin entry and handle names. Add `wp-components`, `wp-element`, `wp-i18n`, `wp-api-fetch`, `wp-data`, `wp-notices` and `wp-icons` to the admin script's dependencies. With `@wordpress/scripts` they come from the `.asset.php` file automatically. Enqueue the `wp-components` style on our pages only.
2. **Experimental components:** create `src/admin/components/wp.js`, or the equivalent path in the existing layout, re-exporting the experimental components under stable names:

   ```js
   export {
   	__experimentalToggleGroupControl as ToggleGroupControl,
   	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
   	__experimentalNumberControl as NumberControl,
   	__experimentalBoxControl as BoxControl,
   	__experimentalItemGroup as ItemGroup,
   	__experimentalItem as Item,
   	__experimentalHStack as HStack,
   	__experimentalVStack as VStack,
   } from '@wordpress/components';
   ```

   Screens import from this file. Everything else is imported directly from `@wordpress/components`, the same way the plugin already imports it.
3. **Shell:** add `AppShell`, which contains:
   - a white header bar with the logo mark and name;
   - nav links Home / Boxes / Analytics / Settings as real `admin.php?page=…` links, using the frozen page slugs;
   - Help on the right;
   - a content area with a max width of 1160px.

   Keep the WordPress admin menu entries and slugs exactly as they are today. Only change the labels if the audit shows a label differs from the design. (A label isn't an identifier, but ask the owner if unsure.)
4. **Shared pieces:**
   - `PageHeader` (title, description, actions)
   - `StatCard`
   - `StatusBadge` (word + dot)
   - `EmptyState`
   - `DataTable` (a plain accessible `<table>` styled like the design, with sort and selection)
   - snackbar notices through `@wordpress/notices` and `SnackbarList`
5. **Styles:** move the admin rules from `wp.css` into the admin stylesheet, scoped under the app root class with the frozen prefix. Use the `--wp-admin-theme-color` variable for the accent so the merchant's admin colour scheme is respected.
6. **i18n:** call `wp_set_script_translations( '<admin handle>', '<frozen text domain>' )`.

**WordPress.org checks this part:** assets only on our admin pages, no bundled React or `@wordpress/*`, and no notices outside our screens.

**Done when:**

- Every existing admin page still loads inside the new shell, even if a page's content is still the old UI.
- The `.asset.php` dependencies list `wp-components` and no React copy is in the bundle.
- `wp i18n make-pot` with the frozen domain runs clean, so every new string uses it.
- Build, lint and Plugin Check show no new errors.

**References:** [Components reference](https://developer.wordpress.org/block-editor/reference-guides/components/), [ToggleGroupControl](https://developer.wordpress.org/block-editor/reference-guides/components/toggle-group-control/), [@wordpress/scripts](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/), [wp_set_script_translations()](https://developer.wordpress.org/reference/functions/wp_set_script_translations/), [Administration menus](https://developer.wordpress.org/plugins/administration-menus/).

---

## Part 3 — Home, Boxes list and Create a box

**Goal:** the three entry screens match the design and run on the plugin's existing data and REST routes.

**Read first:** `design/canvas/Main.dc.html`, `design/canvas/Boxes.dc.html`, `design/canvas/NewBox.dc.html`, `design/before/01-dashboard.png`, `design/before/02-campaigns.png`, `docs/AUDIT.md` (REST routes and data).

**Build:**

1. **Home:**
   - Setup checklist: 4 steps — create a box, add products, put it on a page, place a test order. The next step is highlighted with its action inline, and the card can be dismissed (store that per user with user meta under the frozen prefix).
   - A period switch (7 / 30 / 90 days) as a `ToggleGroupControl`.
   - Four stat cards.
   - A "Your boxes" table: thumbnails, status, sold, revenue, Edit.
   - "Most picked" bars.
   - All of it comes from the existing stats endpoints. If one is missing, add it under the frozen REST namespace with a real `permission_callback`.
2. **Boxes list:**
   - Tabs with counts: All / Live / Drafts / Ended.
   - Debounced search.
   - Table columns: checkbox, Box (thumbnail stack + summary line such as "Bigger box, bigger discount · up to 12"), Status, Shown on (page link, or an "Add to a page" link that opens Publish), Sold, Revenue, actions (Edit button and a `DropdownMenu` with Duplicate, Pause or Resume, Move to trash).
   - Bulk actions on selection.
   - Map these to the existing endpoints and statuses. Don't rename statuses in storage; translate them in the UI.
3. **Create a box:** a `Modal` with:
   - a box name `TextControl`;
   - "How does the discount work?" as three choice cards, mapping to the plugin's existing discount types (tiered, fixed size, bundle, or whatever the audit names them);
   - an info `Notice`;
   - Cancel and "Create and pick products".

   On create, POST to the existing create route, then open the editor at step 1. The old template picker, if any, becomes the Template tab in Part 6.
4. **States:** loading uses `Spinner` placeholders that keep the layout steady. Errors show a `Notice` with Retry. Empty states follow the design.

**Done when:**

- With the Part 1 fixtures loaded, all three screens show real data.
- Create → editor works.
- Duplicate, Pause and Trash work and keep existing data.
- Keyboard and screen-reader basics pass (focus trap in the modal, Esc closes it, labels on icon buttons).
- No new Plugin Check errors.

**References:** [Modal](https://developer.wordpress.org/block-editor/reference-guides/components/modal/), [DropdownMenu](https://developer.wordpress.org/block-editor/reference-guides/components/dropdown-menu/), [@wordpress/api-fetch](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-api-fetch/), [Adding custom REST endpoints](https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/).

---

## Part 4 — Editor shell and live iframe preview

**Goal:** a full-screen box editor like the WordPress site editor. It has three steps, settings on the right and a **real iframe** of the storefront that updates as the merchant types.

**Read first:**

- `design/canvas/EditorDesign.dc.html`: the header, stage and sidebar layout.
- `design/canvas/wp.css`: `.ed-top2`, `.ed-stage`, `.browser`, `.iframe-body`, `.phone`.
- The `n1` note in `design/canvas/canvas.json`.
- `design/before/03-editor-basics.png` to `07-editor-publish.png` (the current 5-step editor).

**Build:**

1. **Route:** keep the existing edit URL and its query args. The editor fills the screen: hide the admin menu with a body class on this screen only, and add a back link to the Boxes list.
2. **Header (64px):**
   - a dark square back link with the logo;
   - Undo and Redo `Button`s with icons;
   - the step buttons `Products · Discounts · Design`: the current step is `secondary`, the others `tertiary`, and finished steps show a check icon;
   - a preview size switch (Desktop / Tablet / Phone) as a `ToggleGroupControl`;
   - an open-preview-in-new-tab icon button;
   - "Save draft" and "Publish".

   Steps map onto the old 5 steps:
   - Basics fields move to Design → Content;
   - the schedule moves to Discounts → Schedule and to Publish;
   - Box rules become Discounts;
   - Design stays Design;
   - Publish becomes a modal (Part 9).
3. **State:** one store (a `@wordpress/data` store or a reducer; follow the existing pattern) holding the saved config, the draft config, a dirty flag and an undo stack (keep up to 50 snapshots). Autosave the draft every 30 seconds while dirty, warn in `beforeunload`, and show "Saved" in a snackbar.
4. **Preview endpoint (PHP):**
   - **URL:** if the box is placed on a page, use that page's permalink; otherwise use `home_url( '/' )`. Add `<prefix>_preview=<box id>` and a nonce from `wp_create_nonce( '<prefix>_preview_<id>' )`.
   - **Checks:** on `template_redirect`, verify the nonce and the frozen admin capability. If either fails, ignore the param and render normally.
   - **Preview mode:**
     - hide the admin bar (`show_admin_bar( false )`);
     - send `X-Frame-Options: SAMEORIGIN` and a `frame-ancestors 'self'` CSP header;
     - mark the response `noindex`;
     - if the box isn't on that page, render it at the top of the main content;
     - set `window.<prefix>Preview = { boxId, origin }` with `wp_add_inline_script`.
   - Add-to-cart is disabled in preview, and a small "Preview — checkout is off" note shows.
5. **postMessage bridge:**
   - Admin → iframe: `{ type: '<prefix>:preview:config', boxId, config }` on every draft change, debounced 150ms.
   - Iframe → admin: `{ type: '<prefix>:preview:ready' }` and `{ type: '<prefix>:preview:height', height }`.
   - Both sides check `event.origin` against the expected origin and ignore anything else. The storefront app listens only when `window.<prefix>Preview` is set, and renders the draft config instead of the saved one.
6. **Stage:**
   - a dotted grey background with a browser-style frame containing a URL bar and a "Preview" tag;
   - the iframe renders at a virtual width (desktop 1280, tablet 820) and is scaled to fit with CSS `transform: scale()`;
   - the phone size uses a 390px phone frame;
   - a spinner shows until `ready` arrives.

**WordPress.org checks this part:** nonce and capability on the preview, preview params never cached (send `nocache_headers()`), and no data in the URL except the id and nonce.

**Done when:**

- Editing a field in any step updates the iframe within a moment, without saving.
- Reloading the editor restores the draft.
- Undo and redo work.
- The preview URL opened logged out shows the normal page.
- A message from another origin is ignored (cover this with a unit test on the bridge).
- No new Plugin Check errors.

**References:** [MDN: Window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage), [Nonces](https://developer.wordpress.org/plugins/security/nonces/), [Checking user capabilities](https://developer.wordpress.org/plugins/security/checking-user-capabilities/), [wp_add_inline_script()](https://developer.wordpress.org/reference/functions/wp_add_inline_script/), [@wordpress/data](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-data/).

---

## Part 5 — Products and Discounts steps

**Goal:** steps 1 and 2 match the design and read and write the **existing** box config keys.

**Read first:** `design/canvas/EditorProducts.dc.html`, `design/canvas/EditorDiscounts.dc.html`, `design/before/04-editor-products.png`, `design/before/05-editor-box-rules.png`, `docs/AUDIT.md` (config shape).

**Build:**

1. **Products sidebar:**
   - The heading "What goes in the box" with the count.
   - A source switch (Pick / Category / Tag) as a `ToggleGroupControl`.
   - `SearchControl` (debounced, against the existing product search route).
   - A category `SelectControl`.
   - Product rows: `CheckboxControl`, 40px thumbnail, name, stock line in grey / amber / red, price.
   - Footer: "Clear all" and "Continue to discounts".
   - Keep the existing per-product caps and ordering if the plugin has them, in a "Picked" view with up/down buttons.
2. **Discounts sidebar**, as `Panel` and `PanelBody` sections:
   - **Discount type:** `RadioControl`.
   - **Box size:** `RangeControl` for "Holds up to" and "Minimum to buy".
   - **Discount steps:** rows of two `NumberControl`s ("From items", "% off") with a remove button, plus "Add step" (up to 6). An info `Notice` shows the sentence shoppers first read, built from the same i18n strings the storefront uses.
   - **Rules:** same product more than once plus "Max of one product", hide sold-out, allow coupons.
   - **Extras:** gift wrap and its fee; free gift, only if the plugin supports it or the owner approved it in Part 0.
   - **Schedule:** Always / Between dates, an end `datetime-local` in the store time zone, and a countdown toggle.

   Fixed-size and bundle types show their own fields (sizes list, bundle quantity and price) in place of the discount steps.
3. **Validation:** inline errors on the control (`help` text in red), and Continue is blocked until the step is valid. The server validates again on save using the existing sanitize functions.

**Done when:**

- The Part 1 fixture boxes open in the new steps with every value correct.
- Saving them unchanged produces byte-identical stored config (add a test).
- New values save, and the iframe shows them.
- No new Plugin Check errors.

**References:** [RadioControl](https://developer.wordpress.org/block-editor/reference-guides/components/radio-control/), [RangeControl](https://developer.wordpress.org/block-editor/reference-guides/components/range-control/), [SearchControl](https://developer.wordpress.org/block-editor/reference-guides/components/search-control/), [Securing input](https://developer.wordpress.org/plugins/security/securing-input/).

---

## Part 6 — Design settings and the Design step

**Goal:** the merchant can match the box to their site. This part adds a design settings object to the box config, and the Template / Style / Content sidebar that edits it.

**Read first:** `design/canvas/EditorDesign.dc.html` (every control and its options are in the markup and in `renderVals()`), `design/REDESIGN.md` (template defaults), `design/before/06-editor-design.png`.

**Build:**

1. **Schema:** add a `design` key to the box config, or reuse the existing design key if the audit found one and extend it without renaming. Everything is optional; empty means "template default".

   | Key | Values |
   | --- | --- |
   | `template` | `spotlight` · `clean` · `steps` · `gift` · `bold` · `pastel` · `editorial` · `night` · `split` · `compact` |
   | `sync_theme` | bool. When true, colours and fonts are stored as theme preset references (for example `var(--wp--preset--color--contrast)`) so they follow theme changes |
   | `colors.accent`, `colors.button_text`, `colors.background`, `colors.surface`, `colors.text`, `colors.muted`, `colors.savings` | hex (`sanitize_hex_color`) or a preset reference matching `^var\(--wp--preset--color--[a-z0-9-]+\)$` |
   | `typography.heading_font`, `typography.body_font` | `theme` · a theme preset font reference · one of the 10 bundled font slugs |
   | `typography.heading_size` | 32–96 (px) |
   | `typography.heading_weight` | 400 · 500 · 600 · 700 · 800 |
   | `typography.button_uppercase` | bool |
   | `buttons.style` | `fill` · `outline` · `soft` |
   | `buttons.size` | `s` · `m` · `l` |
   | `buttons.radius` | 0–32 |
   | `cards.columns` | 2–5 |
   | `cards.image_ratio` | `1/1` · `4/5` · `4/3` |
   | `cards.image_fit` | `cover` · `contain` |
   | `cards.radius` | 0–32 |
   | `cards.shadow` | `none` · `soft` · `strong` |
   | `cards.show_compare_price`, `cards.show_sale_badge` | bool |
   | `summary.position` | `left` · `right` · `bar` |
   | `summary.progress` | `bar` · `segments` |
   | `summary.slots` | `photos` · `numbers` |
   | `summary.show_ladder` | bool |
   | `layout.width` | `content` · `wide` · `full` |
   | `layout.padding` | `{ top, right, bottom, left }` CSS lengths, validated by a regex allowing px / rem / em / % / vw |
   | `advanced.css_class` | space-separated `sanitize_html_class` values |
   | `advanced.custom_css` | string, saved only by users with `unfiltered_html`, `wp_strip_all_tags`, 10 KB max |
   | `content.headline`, `content.intro`, `content.add_label`, `content.cart_label` | text (`sanitize_text_field` / `sanitize_textarea_field`), empty = translated default |

   Add a PHP sanitizer with allowlists for every enum, a JS default object per template (from `design/REDESIGN.md`), and the Part 1 migration step that sets `design.template = 'spotlight'` for existing boxes, or maps their old design fields (old layout, accent, theme) to the new keys.
2. **"Match my site":** add a REST route under the frozen namespace (admin capability) that returns:
   - the theme palette, from `wp_get_global_settings( array( 'color', 'palette' ) )`, merging the `theme`, `default` and `custom` origins;
   - font families, from `wp_get_global_settings( array( 'typography', 'fontFamilies' ) )`;
   - font sizes;
   - button styles, from `wp_get_global_styles( array( 'elements', 'button' ) )`;
   - the theme name.

   For classic themes, fall back to `get_theme_support( 'editor-color-palette' )` and `editor-font-sizes`. The **Match** button maps:
   - contrast → accent and text;
   - base → background;
   - the lightest accent → surface;
   - the theme button radius → button radius;
   - the theme heading and body fonts → fonts.

   It sets `sync_theme` when "Keep in sync" is on.
3. **Sidebar** (360px on the right), with tabs as a `ToggleGroupControl` (`isBlock`):
   - **Template:** a 2-column grid of the 10 template thumbnails (`aria-pressed`) and "Reset style to template defaults".
   - **Style:**
     - The **Match my site** card: theme name, a Match button, a "Keep in sync with my theme" `ToggleControl`, and a success `Notice`.
     - Then `PanelBody` sections:
       - **Colours:** an `ItemGroup` of 7 items with `ColorIndicator`. Each opens a `Dropdown` holding a `ColorPalette` (theme palette first, custom colour allowed).
       - **Typography:** two font `SelectControl`s, a `FontSizePicker`, a weight `SelectControl`, and an uppercase toggle.
       - **Buttons:** style and size `ToggleGroupControl`s, and a radius `RangeControl`.
       - **Product cards:** per-row and radius `RangeControl`s, shape and fit `ToggleGroupControl`s, a shadow `SelectControl`, and two `ToggleControl`s.
       - **Box summary:** position, progress and slots `ToggleGroupControl`s, and a ladder toggle.
       - **Spacing and width:** a width `SelectControl` and a `BoxControl`.
       - **Advanced:** a CSS class `TextControl`, and a custom CSS `TextareaControl`, hidden without `unfiltered_html`.
   - **Content:** headline and intro as `TextareaControl`s, the two button labels as `TextControl`s, and an info `Notice`.

   Every change goes into the draft and through the Part 4 bridge into the iframe.

**WordPress.org checks this part:** every value sanitized against an allowlist, the custom CSS capability check, and no remote font or palette fetches.

**Done when:**

- Each control changes the iframe.
- Match my site works on Twenty Twenty-Five and on a classic theme such as Storefront.
- Unit tests show the sanitizer rejects bad values (bad hex, unknown enum, `</style>` in CSS, oversized CSS).
- Existing boxes open with `spotlight` and look the same as before or better (record this in PROGRESS).

**References:** [wp_get_global_settings()](https://developer.wordpress.org/reference/functions/wp_get_global_settings/), [Global settings and styles (theme.json)](https://developer.wordpress.org/themes/global-settings-and-styles/), [Introduction to theme.json](https://developer.wordpress.org/themes/global-settings-and-styles/introduction-to-theme-json/), [New API to access global settings and styles](https://make.wordpress.org/core/2022/01/04/new-api-to-access-global-settings-styles/), [ColorPalette](https://developer.wordpress.org/block-editor/reference-guides/components/color-palette/), [FontSizePicker](https://developer.wordpress.org/block-editor/reference-guides/components/font-size-picker/), [BoxControl](https://developer.wordpress.org/block-editor/reference-guides/components/box-control/).

---

## Part 7 — Template engine and templates 01–05

**Goal:** one storefront engine that renders any template from the same box state, with every design setting applied through CSS custom properties.

**Read first:**

- `design/canvas/TplClassic.dc.html`: this is the reference for **how settings map to styles**; its `renderVals()` shows every mapping.
- `TplMinimal.dc.html`, `TplSteps.dc.html`, `TplGiftBox.dc.html`, `TplBold.dc.html`
- `design/REDESIGN.md` (defaults)
- `design/before/10-storefront.png`

**Build:**

1. **Engine:**
   - Keep the existing storefront app, its state, pricing and add-to-cart.
   - Add a `templates/` folder with one component per template slug. All templates share the same props: products, box state, quote, actions and strings.
   - A `TemplateRenderer` picks the template from `design.template` and falls back to `spotlight`.
2. **CSS variables:** in PHP, convert the design settings (merged over the template defaults) into variables scoped to the box wrapper:
   - names: `--<prefix>-accent`, `--<prefix>-button-text`, `--<prefix>-bg`, `--<prefix>-surface`, `--<prefix>-text`, `--<prefix>-muted`, `--<prefix>-savings`, `--<prefix>-font-heading`, `--<prefix>-font-body`, `--<prefix>-heading-size`, `--<prefix>-heading-weight`, `--<prefix>-btn-radius`, `--<prefix>-btn-height`, `--<prefix>-card-radius`, `--<prefix>-card-shadow`, `--<prefix>-cols`, `--<prefix>-ratio`, `--<prefix>-fit`;
   - print them with `wp_add_inline_style()` on the storefront handle, as one rule per rendered instance: `.<prefix>-box-<instance>{…}`;
   - template CSS reads only these variables, never hard-coded colours;
   - the preview applies the same variables from the draft in JS.
3. **Templates 01–05:** build Spotlight, Clean list, Guided steps, Gift tray and Color block to match their files, including their states (empty, part-filled, tier unlocked, full, below minimum). Guided steps uses the existing fixed-size type: size → fill → review.
4. **Shared behaviours:**
   - tier messages in an `aria-live` region;
   - add / stepper / remove controls at least 44px;
   - sold-out tiles disabled, or hidden per the rules;
   - the summary position (`left` / `right` / `bar`), progress style and slot style work in every template where it makes sense;
   - record any template that ignores an option in `design/REDESIGN.md`, for example Split screen always keeps the box on the left.
5. **Theme fit:** all CSS is scoped under the wrapper class with the frozen prefix, with no global resets. The wrapper respects alignwide and alignfull. Test with Twenty Twenty-Five and Storefront.

**WordPress.org checks this part:** no remote fonts or images, styles only through enqueue and `wp_add_inline_style`, and every value escaped with `esc_attr` / `safecss_filter_attr` where it lands in CSS.

**Done when:**

- The five templates render real products in wp-env, add to cart works, and the Part 1 fixture boxes still check out.
- Changing every Style control on Spotlight changes the storefront.
- There's a visual comparison note for each template in PROGRESS.
- No new Plugin Check errors.

**References:** [wp_add_inline_style()](https://developer.wordpress.org/reference/functions/wp_add_inline_style/), [safecss_filter_attr()](https://developer.wordpress.org/reference/functions/safecss_filter_attr/), [Securing output](https://developer.wordpress.org/plugins/security/securing-output/), [block.json metadata](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/).

---

## Part 8 — Templates 06–10, phone layout and fonts

**Goal:** all ten templates are complete and work on phones, using local fonts only.

**Read first:** `design/canvas/TplPastel.dc.html`, `TplEditorial.dc.html`, `TplNight.dc.html`, `TplSplit.dc.html`, `TplCompact.dc.html`, `Mobile.dc.html`, `design/REDESIGN.md`.

**Build:**

1. **Templates:** Pastel, Editorial, Night, Split screen and Compact card on the Part 7 engine and variables.
   - Pastel's per-product tints come from a small palette derived from the surface colour.
   - Night is a dark template: its defaults set dark background and surface colours, and contrast checks must still pass.
2. **Phone layout:** under 760px of container width, every template switches to:
   - a 2-up grid, or a list for Clean list;
   - a sticky bottom summary bar with a handle, count, progress, total and CTA;
   - tapping the bar opens a bottom-sheet drawer listing the box lines, the gift option, totals and checkout. The drawer has a focus trap, closes with Esc and returns focus when closed.

   Use container queries (or a ResizeObserver fallback) so this also works in narrow theme columns.
3. **Fonts:**
   - ship the 10 template font families as local woff2 files (Latin subset, variable where available) with their OFL licence files, under the plugin's assets folder;
   - register them with `@font-face` in a stylesheet that loads only the fonts the rendered template needs, and only when the box isn't using theme fonts;
   - list every font and its licence in readme.txt under "Third-party resources".
4. **Accent override:** every template accepts the merchant's colours, including the dark ones. Night keeps its dark background unless the merchant changes it.

**Done when:**

- All 10 templates pass the Part 7 checks.
- At 390px wide each one shows the bar and drawer.
- Network requests on a box page show no external hosts.
- The plugin zip size is recorded in PROGRESS.
- No new Plugin Check errors.

**References:** [MDN: CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries), [Plugin guidelines (no remote assets)](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/), [SIL Open Font License](https://openfontlicense.org/).

---

## Part 9 — Publish flow

**Goal:** one clear modal that places the box on the site, schedules it and confirms that it's live.

**Read first:** `design/canvas/Publish.dc.html`, `design/before/07-editor-publish.png`, `docs/AUDIT.md` (block, shortcode, placement data).

**Build:**

1. **Publish `Modal`:**
   - Summary badges: size, tiers, product count, template.
   - "Where should shoppers find it?" with three choices:
     - **Add to a page I have:** a page `SelectControl` (searchable); the block goes at the top.
     - **Create a new page:** a title `TextControl` with the address preview.
     - **I'll place it myself:** the **existing** shortcode (frozen tag and attributes) with a Copy button, plus "or add the <block title> block".
   - "When": Right away / Pick dates, with start and end in the store time zone and the countdown toggle.
   - Cancel and Publish.
2. **Server side:** reuse the existing publish and placement logic. Insert the **existing** block comment or shortcode, never new names. Check `edit_pages` and `publish_pages` for page changes, and sanitize titles and slugs.
3. **Success state:** a check icon, "Your box is live", the live URL, "Back to boxes" and "View on store".
4. **Block and shortcode:** keep the names and attributes. Add an optional `template` attribute to the block and shortcode that overrides the box's template for that placement. In the block inspector, add a `SelectControl` for it and a link to the box editor.

**Done when:**

- All three placement choices work on a block theme and a classic theme.
- Existing shortcodes and blocks in posts keep rendering.
- Scheduling hides and shows the box at the right times (unit-test the computed status in the store time zone).
- No new Plugin Check errors.

**References:** [wp_insert_post()](https://developer.wordpress.org/reference/functions/wp_insert_post/), [has_blocks()](https://developer.wordpress.org/reference/functions/has_blocks/), [Shortcode API](https://developer.wordpress.org/plugins/shortcodes/), [Modal](https://developer.wordpress.org/block-editor/reference-guides/components/modal/).

---

## Part 10 — Analytics and Settings

**Goal:** both screens look like the design and run on the same data and options as today.

**Read first:** `design/canvas/Analytics.dc.html`, `design/canvas/Settings.dc.html`, `design/before/08-analytics.png`, `design/before/09-settings.png`.

**Build:**

1. **Analytics:**
   - Filters: a period `ToggleGroupControl` (Today / 7 / 30 / 90 / Custom), a box `SelectControl`, and a "Compare to previous" `CheckboxControl`. Export CSV is a `Button` that calls the existing export.
   - Four stat cards.
   - The revenue chart, using the existing chart code if there is one; otherwise an accessible SVG line with a hidden data table.
   - A shopper journey funnel, most picked products, and a "By box" table. Show deleted boxes as one "Deleted boxes (n)" row.
   - A tip `Notice` that's shown only when the data supports it.
2. **Settings:** one column of `Card`s:
   - **General:** builders on, main box page.
   - **Cart and checkout:** one line or each item; edit from cart; coupons; reduce item stock.
   - **Order emails:** list items; gift note.
   - **Data and privacy:** analytics; keep days; delete data on uninstall.

   Use `ToggleControl`, `SelectControl` and `NumberControl` bound to the **existing option and keys**. Save is a primary button that's disabled until something changes, followed by a "Saved" snackbar. Move storefront display defaults that are now per box (Part 6) out of Settings, but keep their stored values so the migration in Part 11 can copy them into boxes.

**Done when:** every setting round-trips to the same stored option as before (test this), analytics numbers match the old screen for the same range, and there are no new Plugin Check errors.

**References:** [Card](https://developer.wordpress.org/block-editor/reference-guides/components/card/), [ToggleControl](https://developer.wordpress.org/block-editor/reference-guides/components/toggle-control/), [register_setting()](https://developer.wordpress.org/reference/functions/register_setting/), [Privacy in plugins](https://developer.wordpress.org/plugins/privacy/).

---

## Part 11 — Migration, compatibility and hardening

**Goal:** updating from the current release is invisible to shoppers and safe for merchants, and the plugin passes review.

**Read first:** `AGENTS.md`, `docs/AUDIT.md`, `docs/baseline/*`, [Detailed plugin guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/), [Common issues](https://developer.wordpress.org/plugins/wordpress-org/common-issues/).

**Do:**

1. **Migration step** (the Part 1 framework):
   - Give every existing box `design.template = 'spotlight'`, or the closest template to its old look.
   - Map old store-wide display settings into each box's `design` where the box has no value.
   - Keep the old option keys, read-only, for one major version.
   - The step is idempotent and logged to the debug log only when `WP_DEBUG` is on.
2. **Upgrade test:** install the current release zip, create the Part 1 fixtures, then update to the branch build. Check boxes, pages, cart, orders, analytics and settings, and record the results in PROGRESS.
3. **Frozen identifiers check:** diff the Part 0 table against the code with `rg` for each old name. Nothing is renamed; old names may only gain new aliases.
4. **Text domain check:**
   - Run `wp i18n make-pot` with the frozen domain; there must be no warnings.
   - Every new string has a translators comment where it has placeholders.
   - JS strings appear in the .pot.
   - Nothing uses another domain.
5. **Security sweep:**
   - `rg` for `$_GET`, `$_POST` and `$_REQUEST`, every `echo`, every `$wpdb->`, `register_rest_route`, and the preview endpoint.
   - The postMessage origin checks have tests.
6. **Plugin Check and PHPCS:** zero errors, and every warning fixed or justified against the Part 1 baseline.
7. **Accessibility:** keyboard through the editor (all tabs and panels), both modals and every template. Run axe on Home, Boxes, the editor and a storefront page.
8. **Performance:**
   - admin assets only on our screens;
   - storefront assets and fonts only on box pages;
   - no N+1 product queries;
   - the preview iframe loads in under 2 seconds locally.
9. **Compatibility matrix in PROGRESS:**
   - WordPress minimum and current
   - WooCommerce minimum and current
   - PHP minimum and 8.3+
   - HPOS on and off
   - Cart/Checkout blocks and the classic shortcodes
   - Twenty Twenty-Five and Storefront
   - RTL (`wp-components` ships RTL styles; check the editor and every template)

**Done when:** every item shows pass in PROGRESS or has a justification a reviewer would accept.

**References:** [Plugin Check](https://wordpress.org/plugins/plugin-check/), [Securing input](https://developer.wordpress.org/plugins/security/securing-input/), [Securing output](https://developer.wordpress.org/plugins/security/securing-output/), [HPOS recipe book](https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book/), [Cart and Checkout blocks](https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/).

---

## Part 12 — Release

**Goal:** ship the redesign as an update on WordPress.org.

**Read first:** `docs/REDESIGN-PROGRESS.md`, [How your readme.txt works](https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/), [Plugin assets](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/), [Using Subversion](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/).

**Do:**

1. **Version:** this is a big UI change, so bump the minor or major version per the current scheme. Update the plugin header, version constant, readme `Stable tag` and `package.json`. Update `Tested up to` and `WC tested up to`, and raise `Requires at least` only if Part 0 or Part 2 decided to.
2. **readme.txt:**
   - Description: the new flow and the 10 templates.
   - FAQ: matching your theme, the iframe preview, custom CSS (who can use it), fonts.
   - Changelog entry with an "Upgrade notice" saying existing boxes are kept and moved to the Spotlight template.
   - Third-party resources: fonts and licences.
3. **Screenshots:** new `screenshot-1…n.png` in the order of the readme captions — Home, Boxes, editor Design step, three templates, phone.
4. **Build and inspect the zip:**
   - `design/`, `docs/`, `tests/`, `node_modules/`, `AGENTS.md` and `CLAUDE.md` are absent;
   - `src/`, `build/`, the fonts and their licences are present;
   - list the zip's contents in PROGRESS.
5. **Fresh install test:** a clean site with only the zip and WooCommerce. Create a box with each template, publish it, buy it, and check the order and analytics.
6. **SVN:** copy to `trunk/`, `svn cp trunk tags/<version>`, update `/assets` with the new screenshots, `svn ci`. Then confirm the plugin page and that auto-update from the previous version works.

**Done when:** the release is live, the upgrade from the previous version has been checked on a real site, and PROGRESS records the date and version.

**References:** [Detailed plugin guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/), [Using Subversion](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/), [Plugin assets](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/).

---

## References

**WordPress components and editor packages**

- [Components reference](https://developer.wordpress.org/block-editor/reference-guides/components/)
- [ToggleGroupControl](https://developer.wordpress.org/block-editor/reference-guides/components/toggle-group-control/)
- [ToggleGroupControlOption](https://developer.wordpress.org/block-editor/reference-guides/components/toggle-group-control-option/)
- [@wordpress/scripts](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/)
- [Dependency extraction](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-dependency-extraction-webpack-plugin/)
- [@wordpress/env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/)
- [@wordpress/api-fetch](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-api-fetch/)
- [@wordpress/data](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-data/)

**Matching the theme**

- [wp_get_global_settings()](https://developer.wordpress.org/reference/functions/wp_get_global_settings/)
- [New API to access global settings and styles](https://make.wordpress.org/core/2022/01/04/new-api-to-access-global-settings-styles/)
- [Global settings and styles (theme.json)](https://developer.wordpress.org/themes/global-settings-and-styles/)
- [Introduction to theme.json](https://developer.wordpress.org/themes/global-settings-and-styles/introduction-to-theme-json/)

**Plugin basics, security, i18n**

- [Header requirements](https://developer.wordpress.org/plugins/plugin-basics/header-requirements/)
- [Internationalization](https://developer.wordpress.org/plugins/internationalization/how-to-internationalize-your-plugin/)
- [wp_set_script_translations()](https://developer.wordpress.org/reference/functions/wp_set_script_translations/)
- [Nonces](https://developer.wordpress.org/plugins/security/nonces/)
- [Checking user capabilities](https://developer.wordpress.org/plugins/security/checking-user-capabilities/)
- [Securing input](https://developer.wordpress.org/plugins/security/securing-input/)
- [Securing output](https://developer.wordpress.org/plugins/security/securing-output/)
- [wp_add_inline_script()](https://developer.wordpress.org/reference/functions/wp_add_inline_script/)
- [wp_add_inline_style()](https://developer.wordpress.org/reference/functions/wp_add_inline_style/)
- [Adding custom REST endpoints](https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/)
- [Privacy](https://developer.wordpress.org/plugins/privacy/)

**WooCommerce**

- [HPOS recipe book](https://developer.woocommerce.com/docs/features/high-performance-order-storage/recipe-book/)
- [Cart and Checkout blocks](https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/)
- [Extending the Store API](https://developer.woocommerce.com/docs/apis/store-api/extending-store-api/)

**WordPress.org**

- [Detailed plugin guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/)
- [Common issues](https://developer.wordpress.org/plugins/wordpress-org/common-issues/)
- [Plugin Check](https://wordpress.org/plugins/plugin-check/)
- [readme.txt](https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/)
- [Plugin assets](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/)
- [Using Subversion](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/)

**Web platform**

- [MDN: Window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [MDN: Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)

**Agents**

- [Codex: AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Claude Code: memory and AGENTS.md](https://code.claude.com/docs/en/memory)
