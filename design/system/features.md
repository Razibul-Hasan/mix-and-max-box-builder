# Plugin features

What Mix and Max Box Builder does, per surface. Each admin page and storefront screen card lists its own features in detail; this is the map.

## Campaign types

| Type | Shopper experience | Pricing |
| --- | --- | --- |
| Tiered mix | Add any items, up to a box capacity (for example 12). Discounts unlock at item counts. | Tiers: 4 items → 10%, 6 → 15%, 12 → 25% (percent, fixed amount or box price) |
| Fixed box | Pick a size (4 / 6 / 12), fill every slot. | Each size has its own price or discount |
| Bundle price | Any N items for one price. | "Any 5 for $25" |

## Backend (wp-admin)

**Dashboard**
- Setup checklist with the next step's action inline, dismissible when complete.
- KPIs with deltas and sparklines: box revenue, boxes sold, average box value, builder conversion.
- Revenue chart vs previous period, top campaigns, the live campaign with its countdown, most-picked products.

**Campaigns**
- List with status tabs (All, Active, Scheduled, Drafts, Ended), search, type filter, sort, pagination.
- Per row: thumbnails, type summary, status, schedule, placement (block page, shortcode, or a Not placed warning), boxes sold, revenue, conversion.
- Bulk duplicate, pause and delete. Templates: Holiday box, Spa kit, Snack pack, Build-a-gift.

**Campaign editor** (Basics → Products → Box rules → Design → Publish)
- Products by hand, category or tag; per-product cap; variations; sort order.
- Box rules: capacity, minimum to check out, duplicates with a cap, hide sold-out products.
- Discount tiers with a live sentence of what shoppers will read.
- Extras: gift message, paid gift wrap, countdown tied to the end date.
- Design: sidebar panel, bottom bar or both; products per row; headline, sticker and button text.
- Publish: pick or create a page with the block, copy the shortcode, run a test order.
- Live shopper preview (desktop / mobile) and a contextual save bar.

**Analytics**
- One filter row: date range, campaign, compare to previous period. CSV export.
- Revenue, boxes, items per box, discount given; revenue chart; builder funnel; most-picked products; where boxes stop (tier reached); campaign performance table.

**Settings**
- Master switch, default builder page, price format.
- Display defaults: products per row, summary layout, savings stickers, low-stock threshold, tier-unlock toast, button and empty-slot text.
- Cart: one bundled line or box plus items, edit box from cart, coupon stacking (off by default), per-item stock reduction.
- Emails: box contents and gift message in order emails.
- Advanced: load scripts only on builder pages, delete data on uninstall (off by default).

## Frontend (storefront)

- Box Builder block (`mmbb/box-builder`) and shortcode `[mmbb_box id="12"]`.
- Hero with one sticker, a number-led headline, a real countdown and a tier ladder.
- Category chips and sort; Shopify-style product tiles with square images, compare-at prices, Only N left, sold-out state.
- One-tap add; quantity stepper once an item is in the box; the box-full state locks the grid.
- Visible box: numbered slots that fill as you pick, remove from any slot.
- Tier progress sentence: "Add 1 more to get 15% off", then "You unlocked 25% off".
- Desktop: sticky BoxPanel with subtotal, discount, total and one CTA. Phone: sticky BoxSummaryBar.
- Fixed box: size picker with Most popular and Best value stickers.
- Gift option and message; the box goes to the cart as one line with its contents listed (or box plus items).
- Edit box from cart reopens the builder with the same picks.
- Prices and rules are re-checked on the server; a tampered request can't change the discount.
- Accessible: keyboard throughout, visible focus, live-region tier messages, labelled controls, colour never the only signal, reduced motion respected.
- Fast: assets only on pages with a builder, fonts bundled locally, no third-party requests.

## The clickbait toolkit (and its rules)

| Lever | Component | Rule |
| --- | --- | --- |
| Savings number | Sticker, TierProgress | Always the real tier discount |
| Next-item nudge | TierProgress | Shows only when a next tier exists |
| Urgency | Countdown | Only with a real campaign end date; never per-visitor timers |
| Scarcity | ProductTile "Only N left" | Real stock, at or below the threshold in Settings |
| Social proof | Sticker "Most popular" / "Bestseller" | Backed by sales data or set by the merchant on purpose |
| Celebration | Toast on unlock | Once per tier, short |
