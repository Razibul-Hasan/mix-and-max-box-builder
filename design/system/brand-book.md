Mix and Max Box Builder is a WooCommerce plugin that lets shoppers build their own box (pick items into slots, unlock bigger discounts as the box fills) and gives merchants a clean admin to run those campaigns. Two surfaces share one system: the **admin** inside wp-admin (Dashboard, Campaigns, Analytics, Settings) and the **storefront builder** inside the merchant's theme. The admin is calm and dense; the storefront is minimal with one loud layer of savings stickers, tier messages and a Max Orange CTA. Components are React (they run on `@wordpress/element`) and live in `components/bundle.js` as `window.MixMax`.

## Voice and copy

- Lead with the number. "Save 25%", "Add 2 more to get 15% off", "Only 3 left". Specific beats loud: never "AMAZING DEAL!!!".
- Clickbait means curiosity plus a concrete payoff, and it must be true. Countdowns use the campaign's real end date; stock lines use real stock; no fake scarcity.
- Sentence case everywhere: titles, buttons, labels, tabs. Uppercase only inside a Sticker and the `overline` style.
- Buttons are verbs: "Create campaign", "Add to box", "Add box to cart", "Copy shortcode". Never "Submit" or "OK".
- Speak to the merchant as "you" in admin ("Your Holiday Treat Box is ready"); speak to the shopper as "you" on the storefront ("in your box").
- Help text says the consequence, not the mechanism: "Shoppers see 12 slots." not "Sets max_items".
- Empty and error states say what to do next in one sentence.
- No emoji. Icons carry the visual cues.
- Real copy from the system: "Mix 12 treats. Save 25%." · "10% off unlocked. Add 1 more to get 15% off" · "You unlocked 25% off. That's the max deal." · "2 steps to your first box sale".

## Color

- Neutral first. Pages sit on `canvas`; cards, tiles and inputs on `surface`; table headers, tracks and placeholders on `surface-sunken`; row hover is `surface-hover`. Borders are `line` (decorative) and `line-strong` (controls, 3:1).
- Text is `ink`, secondary `ink-muted`, placeholders and compare-at prices `ink-subtle`. Each text token's usage note lists the grounds it passes 4.5:1 on, in both themes.
- The primary admin button is an `ink` fill with `on-ink` text, Shopify-style. Max Orange is not the default action colour.
- `max` (Max Orange) is the brand, used as a FILL: the one hot CTA per view, tier-progress fill, the active nav and tab underline, the selected choice icon, the logo tile, the in-box count chip. Text on it is always `on-max` (ink), never white.
- Orange as text is `max-strong` (savings, unlocked-tier label, low stock) on `surface`, `canvas` or `max-soft`.
- `pop` (deal yellow) is only for Stickers, Best value tags and the storefront countdown, with `on-pop` text.
- Status: `win` success, `warn` warning, `alert` error/negative, `info` tips, each with its `-soft` ground. Status always carries a word or icon; `win` and `alert` are close in lightness, so colour alone never distinguishes them.
- `surface-strong` with `on-strong` / `on-strong-muted` is the dark bar: the storefront BoxSummaryBar, toasts and the editor's unsaved-changes bar. It stays dark in both themes; on it, highlights use `pop`.
- Charts: `chart-1` (orange) for the hero series, `chart-muted` for previous period, `chart-2` and `chart-3` for extra campaigns; gridlines `chart-grid`. Chart text uses text tokens, never series colours. Palette validated for colour-blind separation in both themes; `chart-3` is under 3:1 on light, so it ships with labels or the table view.
- Two themes: Light (WordPress admin, most stores) and Dark (dark store themes). Use the same token names; never hard-code a hex in component CSS.

## Type

- Two families, both bundled as variable woff2 under `fonts/` (SIL OFL, no external font requests: WordPress.org friendly).
- **Bricolage Grotesque** (`display`) for headlines, admin page titles, the box-size numbers, sticker text and the wordmark: `display-xl` storefront hero, `display-lg` section headline, `display-md` admin page title, `display-sm` unlock moments and empty states. Tight tracking, weight 700–800.
- **Figtree** (`sans`) for everything else: `title-md` card titles, `title-sm` product names, `body-lg` storefront copy, `body` admin copy (14px), `body-sm` help and meta, `label` form labels, `caption` badges and ticks, `overline` step kickers.
- Numbers: `stat` for KPI values (Figtree, proportional figures, never Bricolage), `price` on tiles, `price-lg` for box totals. Columns of numbers use tabular figures.
- `code` (system mono) for shortcodes, hooks and REST routes.

## Space, shape, depth

- 4px base. `space-3` input padding, `space-4` compact card padding and mobile gutter, `space-5` card padding, `space-6` gap between cards and desktop gutter, `space-8` between page sections, `space-12`/`space-16` storefront section padding.
- Radii: `radius-xs` checkbox and code, `radius-sm` inputs and slot thumbnails, `radius-md` buttons and notices, `radius-lg` cards, tiles, choice cards and slots, `radius-xl` BoxPanel and BoxSummaryBar, `radius-pill` badges, stickers, chips, toggles and progress.
- Depth is mostly borders. `shadow-card` on resting cards (none in dark, where `line` does the work), `shadow-raise` on hovered tiles, tooltips and toasts, `shadow-bar` on the sticky bar.
- Selected states use an ink border plus a 1px inset ink ring (ChoiceCard, BoxSizePicker, in-box ProductTile). No coloured left-border accents, no gradients.

## Layout

- Admin: AdminShell top bar (60px) with horizontal nav, because wp-admin already has a left menu. Content max 1240px, `space-6` gutters. Dashboard and Analytics use a 4-up StatCard row, then a 2:1 split. Settings use a 220px sticky section nav plus cards. The campaign editor is a 1.45:1 split with the live preview sticky on the right.
- Storefront desktop: hero, then a 3-column product grid with a 380px sticky BoxPanel. Storefront phone: hero, compact Steps, size pills, chips, a 2-up grid, and BoxSummaryBar sticky at `bottom: 12px`.
- Product images are square (1:1). Products without an image get ProductArt, never a broken image.

## Motion and states

- Fast and physical: 150ms colour transitions, 180ms toggle knob, 200ms tile lift (`translateY(-2px)` + `shadow-raise`), 300ms "pop" when an item lands in a slot or the count chip appears, 500ms tier-fill growth. The CTA arrow nudges 3px on hover.
- Everything respects `prefers-reduced-motion` (animations and transitions off).
- Hover: secondary and ghost buttons tint, tiles lift, rows wash with `surface-hover`. Disabled: 45% opacity; the disabled Max CTA instead turns `surface-sunken` with `ink-muted` text and says what's missing ("Add 2 more to continue").
- Focus: a 2px solid `focus` ring, offset 2px, on every interactive element (3:1+ on all surfaces in both themes). On `surface-strong` the ring is `pop`.

## Iconography

- One custom line set drawn for this system (`Icon`, 50 glyphs): 24px grid, 1.75 stroke, round caps and joins, `currentColor`. Sizes 16 (small buttons, badges), 18 (nav, inputs), 20 (default), 22 (tiles, choice cards).
- Icons always sit beside a label, except icon-only buttons, which carry an `aria-label`.
- If you build admin screens with `@wordpress/components`, keep this set rather than mixing in `@wordpress/icons`.
- No logo has been designed yet: the wordmark is "Mix and Max" set in Bricolage 800 beside the Max Orange tile with the `box` icon, tilted -4°. Treat that as a placeholder until a mark exists.

## Using the components

- Admin pages: `AdminShell` → `PageHeader` → `Card`s holding `DataTable`, `StatCard`, `LineChart`, `BarList`, `FunnelChart`, forms (`TextField`, `SelectField`, `Toggle`, `Checkbox`, `ChoiceCard`, `SegmentedControl`), feedback (`Notice`, `EmptyState`, `Toast`, `ProgressBar`), and `Tabs` / `Steps` for navigation inside a page.
- Storefront: `Sticker`, `Countdown`, `Steps`, `BoxSizePicker`, `Chips`, `ProductTile` (+ `ProductArt`), `BoxSlots`, `TierProgress`, `BoxPanel`, `BoxSummaryBar`, `QuantityStepper`.
- The page cards under Admin screens and Storefront screens show the components composed into the real pages; their guidelines list each page's features.
- Every class is prefixed `mmbb-`, every PHP function, option, hook and REST route `mmbb_` / `mmbb/v1`, the JS global is `window.MixMax`. Keep that prefix in anything you add so the plugin never collides with themes or other plugins.
- Components never declare tokens themselves: load `tokens.css`, then `components/bundle.css`, then React and `components/bundle.js`. In the plugin, scope the token block to `.mmbb-root` instead of `:root` so the storefront never repaints the merchant's theme.
