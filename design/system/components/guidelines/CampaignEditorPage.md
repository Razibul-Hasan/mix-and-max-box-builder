# CampaignEditorPage

Create and edit a campaign as a 5-step wizard (Basics, Products, Box rules, Design, Publish) with a live shopper preview. Steps stay clickable after the first save.

**Features**
- Contextual save bar (dark, top) whenever there are unsaved changes: Discard, Save campaign.
- Basics: name, slug, description, schedule (start/end), status.
- Products: pick products, categories or tags; per-product max; variations allowed or not; sort order (manual, bestselling, price).
- Box rules (shown): campaign type (Tiered mix, Fixed box, Bundle price); box capacity and minimum to check out; allow duplicates with a per-product cap; hide sold-out products.
- Discount tiers: item count → percent, fixed amount or box price; add/remove tiers; a live sentence shows exactly what shoppers will read.
- Extras: gift message, paid gift wrap, countdown with end date.
- Design: layout (sidebar panel, bottom bar, both), products per row, accent (Max Orange or theme), headline and sticker text, button text.
- Publish: choose or create a page with the Box Builder block, copy the shortcode, run a test order.
- Shopper preview: a working mini builder that reflects every change, desktop/mobile toggle.

**Data**: `GET/PUT /mmbb/v1/campaigns/{id}`, `GET /mmbb/v1/products?search=`, autosave draft every 30 s.
