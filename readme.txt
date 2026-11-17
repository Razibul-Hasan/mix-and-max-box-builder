=== ProductBoxes - Mix & Match Box Builder for WooCommerce ===
Contributors: bestwpexpert
Tags: build your own box, product bundles, mix and match, gift box, bundle discount
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: woocommerce
Stable tag: 2.0.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Free WooCommerce mix and match box builder. Let shoppers build their own box or gift set with tiered discounts and fixed-price bundles.

== Description ==

**ProductBoxes** is a free WooCommerce mix and match, product bundle and build-your-own-box plugin. Shoppers pick products from a grid, watch their bundle discount grow live, and add the finished box to the cart in one click.

Sell gift boxes, gift baskets, snack boxes, clothing bundles, beauty kits and samplers. Offer "pick any 3 for $18" deals, fixed-size boxes, or tiered volume discounts. No coding required.

= Live Demos & Documentation =

* **[ProductBoxes Website, Features & Documentation](https://bestwebexpert.com/productboxes/)**
* **[Demo: Build Your Own Capsule Wardrobe Box](https://bestwebexpert.com/capsule-wardrobe-box/)** - tiered discounts
* **[Demo: Gift Box Builder](https://bestwebexpert.com/gift-box-builder/)** - gift wrap and message
* **[Demo: Mix & Match Shirt Bundle](https://bestwebexpert.com/shirt-bundle/)** - any 3 for one price

= Watch the Video =

https://youtu.be/U_B8JJPrdC8

= Why ProductBoxes? =

* **Raise average order value** with "buy more, save more" bundle discounts.
* **Sell custom boxes**, not static bundles.
* **100% free** - no premium version, subscriptions or license keys.
* **Fast and private** - all scripts, styles and fonts are local. No CDN or telemetry.

= Key Features =

* **Build Your Own Box** from a customizable product grid.
* **Simple products and variations** (size, color, flavor) in one box.
* **Tiered discounts**, percentage or fixed, that grow as the box fills.
* **Fixed-size boxes** (small, medium, large) with their own pricing.
* **Fixed-price bundles** like any 3 for $18.
* **Gift wrap and gift messages** for gift boxes.
* **10 storefront templates** with a live preview in your theme on desktop, tablet and mobile.
* **Select products** manually or by WooCommerce category and tag.
* **Live discount progress bar** with the next milestone.
* **Mobile-friendly**, with a sticky summary and bottom sheet.
* **Edit boxes from the cart.**
* **WooCommerce ready:** classic and block cart/checkout, HPOS, stock management.
* **Analytics:** views, picks, conversions, revenue and discounts.
* **Gutenberg block and shortcode.**

= Campaign Types =

* **Tiered Discount** - bigger discounts for more products.
* **Fixed Box Size** - predefined sizes with individual pricing.
* **Bundle Price** - a set number of products for one price.

= Documentation & Support =

Guides and docs are on the [ProductBoxes plugin page](https://bestwebexpert.com/productboxes/). For questions, use the support forum here on WordPress.org.

== Installation ==

1. Install and activate WooCommerce 9.0 or later.
2. Go to **Plugins > Add New**, search for "ProductBoxes", then install and activate.
3. Open **ProductBoxes** in the admin menu and create a campaign.
4. Publish it, or add the **ProductBoxes Box Builder** block to a page.

= Shortcode =

`[mmbb_box id="12"]`

Optional: `layout` (panel, bar, both), `columns` (3, 4, 5), `hero` (true, false), `template` (template ID).

== Frequently Asked Questions ==

= Is ProductBoxes free? =

Yes. Every feature is included. No premium version or account required.

= How do I create a WooCommerce mix and match box? =

Create a campaign, pick products, set discount rules, choose a template and publish it with a page, the block or the shortcode. See the [documentation](https://bestwebexpert.com/productboxes/).

= Can I create custom gift boxes? =

Yes, with optional gift wrap and a personal message. See the [gift box demo](https://bestwebexpert.com/gift-box-builder/).

= Can I offer fixed-price bundles? =

Yes. Use **Bundle Price**, for example any 3 products for $18. See the [shirt bundle demo](https://bestwebexpert.com/shirt-bundle/).

= Can I offer bulk or tiered discounts? =

Yes. Use **Tiered Discount** for bigger savings as customers add products.

= Does it support variations, blocks, HPOS and multi-currency? =

Yes to all: variable products, Cart and Checkout blocks, HPOS and WooPayments Multi-Currency. It also has added compatibility for Astra, Blocksy and Inspiro.

= Will updating to 2.0.0 delete my data? =

No. Campaigns, boxes, settings, orders and analytics are preserved.

= Does it use external services? =

No. Everything is bundled locally.

== Screenshots ==

1. Dashboard with campaign performance and analytics.
2. Campaign management with placement links.
3. Three-step campaign editor with live preview.
4. Spotlight template.
5. Gift tray template.
6. Night template.
7. Mobile box builder with live discount progress.

== Changelog ==

= 2.0.2 =
* Fixed: a box sold as "One line" did not deliver downloads. The order, the confirmation page and the customer email now list the files of every downloadable product in the box, and My Account → Downloads shows them too. Download limits and expiry follow each product's own settings.
* Added: a "Box image" picker under Design → Content in the campaign editor. The image you choose is used as the box's photo in the cart, at checkout and in order emails.
* Improved: without a box image, the box uses the photo of the first product it offers instead of a grey placeholder. A photo you set yourself in WooCommerce → Products is never replaced.
* Improved: more automated tests for box downloads and box images.
* Improved: a smaller plugin download (about 0.8 MB, down from 1.2 MB). Files the plugin never loaded are no longer included: an unused image, two font files that were bundled twice, and two right-to-left stylesheets nothing used.
* Added: a Live Preview on the plugin page. Try a demo store with 10 working box campaigns, one for each storefront template, using real product photos and sample analytics, without installing anything.

= 2.0.1 =
* Fixed: with WooPayments Multi-Currency, items in an "Each item" cart showed the store-currency price struck through (for example AUD 19.95 shown as GBP 19.95) and a wrong savings label. Regular and sale prices now follow the shopper's currency.
* Fixed: boxes made only of virtual or downloadable products were charged shipping. A box now needs no shipping when everything in it is virtual. A physical item, a physical free gift or gift wrap still ships.
* Added: "Show headline" and "Show short intro" toggles in the campaign editor's design settings, so you can hide them without custom CSS.
* Added: a Fixed Box with only one size now skips the "Pick a box size" step and goes straight to choosing products.
* Fixed: the Style tab showed options that some templates set themselves. It now hides them for Clean list, Gift tray, Pastel, Editorial, Night, Split screen and Compact card.
* Fixed: "Heading size" now applies to Editorial, Night and Split screen, and "Products per row" now applies to Editorial, Night and Compact card.
* Added: compatibility for the Elastra, Extendable and Inspiro themes, plus a baseline style fix that keeps theme heading, list, link and image styles out of the box on any theme.
* Improved: more automated tests for multi-currency prices, shipping on virtual boxes and the new design options.

= 2.0.0 =
* Redesigned admin dashboard, analytics and settings.
* Added a three-step campaign editor with live theme-aware preview.
* Added 10 responsive storefront templates and guided publishing.
* Added local fonts, accessibility improvements and WooPayments Multi-Currency support.
* Added Astra and Blocksy compatibility.
* Preserved existing campaigns, boxes, orders, analytics, hooks, blocks and shortcodes.

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 2.0.2 =
Fixes missing download links and permissions for boxes sold as one line, and adds a box image picker so the cart and order emails show a photo of your box. Smaller download. No data changes.

= 2.0.1 =
Fixes cart prices with WooPayments Multi-Currency and removes shipping charges on boxes of virtual products. Style tab options now match each template, and the box looks right on more themes, including Elastra, Extendable and Inspiro. Adds options to hide the headline and intro. No data changes.

= 2.0.0 =
Major redesign with 10 templates, a three-step editor and live preview. Existing data is preserved.

== External Services ==

ProductBoxes connects to no external services. No remote fonts, CDNs, telemetry or license checks.

== Privacy ==

Optional analytics stay in your WordPress database. Session IDs use browser `sessionStorage` (no cookies), only daily salted hashes are stored, and no IP addresses or user agents are collected. Raw events are deleted after 90 days by default. Disable analytics in settings or with the `mmbb_track_events` filter. Gift messages are stored with order items and support WordPress personal data export and erasure.

== Developer Hooks ==

* `mmbb_campaign_config_defaults` - default campaign config.
* `mmbb_templates` - available templates.
* `mmbb_pricing_quote` - modify pricing quotes.
* `mmbb_campaign_saved` - after a campaign is saved.
* `mmbb_ensure_container_product` - hidden container product creation.
* `mmbb_track_events` - return false to disable analytics.

== Source Code and Build ==

Source is in `src/`. Build with Node.js 20.19+: `npm install` then `npm run build`. Config: `package.json`, `webpack.config.js`.

Repository: https://github.com/Razibul-Hasan/mix-and-max-box-builder

== Credits ==

Local fonts under SIL Open Font License 1.1: Bricolage Grotesque, DM Sans, Figtree, Fraunces, Inter, Inter Tight, Outfit, Plus Jakarta Sans, Space Grotesk. Licenses are in `assets/fonts/`.
