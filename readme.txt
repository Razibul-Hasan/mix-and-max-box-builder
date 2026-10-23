=== Mix and Max Box Builder ===
Contributors: bestwpexpert
Tags: mix and match, product bundles, gift box, box builder, discounts
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: woocommerce
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Let shoppers build their own box of products and unlock bigger discounts as the box fills. For WooCommerce.

== Description ==

Mix and Max Box Builder lets shoppers pick products into the slots of a box. The fuller the box, the bigger the discount, and the shopper sees the next discount while they build.

You create a campaign in a step-by-step editor, choose which products can go in the box, set the discount rules, and publish it on a page with a block or a shortcode. The server works out every price, so the discount a shopper sees is the discount they pay.

**What you can build**

* **Tiered discount:** the discount grows with the number of items, for example 10% off 3 items, 15% off 5 and 25% off 12.
* **Fixed box size:** shoppers fill a box of 6, 12 or 24 and each size has its own discount or box price.
* **Bundle price:** one price for a box of an exact number of items.
* Optional gift wrap fee and gift message, a per-product limit, and a start and end date with a countdown that only shows real end dates.
* Products by hand, by category or by tag. Simple products and variations. Sold-out items are shown as sold out and cannot be picked.

**For the shopper**

* A storefront builder with product grid, category filter, sort, a box panel or a sticky summary bar, and a bottom sheet on phones.
* Works with the classic cart and checkout and with the Cart and Checkout blocks.
* Edit a box from the cart.

**For the merchant**

* Dashboard, campaign list, analytics (views, picks, conversion, revenue, discount given, top products) and a Settings screen.
* Box contents, the discount and the gift message are saved on the order and shown in order screens and emails.
* Stock is reduced for the items inside a box when the order is paid.
* Compatible with High-Performance Order Storage and with the Cart and Checkout blocks.

Requires WooCommerce 9.0 or later, WordPress 6.6 or later, and PHP 7.4 or later.

No data is removed on deactivation. Uninstall keeps your data unless you turned on "Delete all plugin data" in Settings for that site. Orders are never deleted.

== External services ==

This plugin does not connect to any external service. It makes no requests to other servers, uses no CDN, no remote fonts, no telemetry, and no licence or update checks. All scripts, styles and fonts are included in the plugin.

== Installation ==

1. Install and activate WooCommerce 9.0 or later.
2. Upload the mix-and-max-box-builder folder to /wp-content/plugins/, or install the plugin from the Plugins screen.
3. Activate Mix and Max Box Builder. On a multisite network each site gets its own defaults.
4. Open Mix and Max in the admin menu and choose Create campaign.

== Frequently Asked Questions ==

= How do I put a box builder on a page? =

Publish the campaign and choose a page, or add the Mix and Max Box Builder block to any page and choose a campaign. You can also use the shortcode [mmbb_box id="12"]. The shortcode also takes layout (panel, bar or both), columns (3, 4 or 5) and hero (true or false). On wide containers the box panel sits beside the products; below 760 pixels of container width the builder switches to two columns, a sticky summary bar and a bottom sheet. The builder loads its scripts and styles only on pages that show one, unless you turn off "Load assets only on pages with a builder" in Settings.

= Which campaign types are there? =

Tiered discount (more items, bigger discount), fixed box size (the shopper picks a size) and bundle price (one price for a set number of items). Each campaign can also offer a gift wrap fee and a gift message.

= Does it work with my theme? =

It renders inside your theme's content area and uses its own scoped styles, so it should work with any theme that follows WordPress standards. It was checked with Twenty Twenty-Five and Storefront. If your theme or a page builder strips blocks and shortcodes from a page, add the block or shortcode in the normal content area.

= Does it work with the Cart and Checkout blocks? =

Yes. The contents, discount, gift message and next-discount hint appear in both the classic and block carts, and the box and its contents are saved on the order. The "Edit box" link and the locked quantities of "Box plus each item" are fully supported in the classic cart. The Cart block gets the address in its Store API data, but does not yet show the link itself.

= How is a box taxed when its items have different tax classes? =

By default a box is one cart line, and WooCommerce taxes the whole line with the tax class of the hidden box product (Standard unless you change it). Items with different tax classes in one box are therefore taxed at the box's rate. This is a known limitation. If your items need their own tax rates, choose "Box plus each item" under Cart in the plugin settings: each item becomes its own line and is taxed by its own class.

= What is the hidden "Box container" product? =

Each published campaign has one hidden WooCommerce product that carries the box through the cart. Mix and Max sets its name and price, so edit the campaign, not the product. It is trashed with the campaign.

= What happens if WooCommerce is unavailable? =

Plugin modules stay inactive and nothing breaks. Users who can activate plugins see a dismissible explanation on the Plugins screen and plugin screens.

= Does uninstall delete orders? =

No. Orders are retained even when plugin-data deletion is enabled. Each site on a multisite network has its own deletion preference, which defaults to off.

= Does it collect personal data? =

Analytics are optional and stay in your database. See the Privacy section.

= Can I build the plugin from source? =

Yes. See "Source code and build" below.

= Developers: which hooks and filters are available? =

All hooks use the mmbb_ prefix.

* mmbb_campaign_config_defaults (filter): the config a blank campaign starts from. The result is sanitized again.
* mmbb_templates (filter): the templates in the new campaign picker. Each is an array with id, title, type_label, description, art and a partial config.
* mmbb_pricing_quote (filter): a box quote after the pricing engine has run. Arguments: the quote, the campaign config, the items and the options. All amounts are integer minor units, for example cents.
* mmbb_campaign_saved (action): fires after a campaign is saved. Arguments: the campaign ID and the sanitized config.
* mmbb_ensure_container_product (filter): called when a campaign goes live. Return the hidden container product ID, a WP_Error to stop publishing, or null. Arguments: the current value and the campaign ID.
* mmbb_track_events (filter): return false to stop all analytics collection.

== Screenshots ==

1. The Dashboard with live campaign totals and the setup checklist.
2. The Campaigns list with status, discount and revenue.
3. The campaign editor: box rules and discount tiers with a shopper preview.
4. The storefront builder on a wide screen, with the box panel beside the products.
5. The storefront builder on a phone, with the sticky summary bar.
6. The Mix and Max Box Builder block in the block editor.

== Changelog ==

= 0.1.0 =
* Development version: campaigns, storefront builder, cart and order handling, analytics, settings and emails.

== Source code and build ==

JavaScript and CSS source is included in src/. Build configuration is included in package.json and webpack.config.js. Runtime libraries (React, the @wordpress packages) are supplied by WordPress and are not bundled.

With Node.js 20.19 or later and npm installed, run:

    npm install
    npm run build

The build writes production files to build/. Composer is used only for development tools (coding standards and PHPUnit); vendor/ is not part of the plugin distribution.

Public repository: https://github.com/Razibul-Hasan/mix-and-max-box-builder

== Third-party resources ==

Figtree and Bricolage Grotesque variable fonts are bundled locally under the SIL Open Font License 1.1. License files: assets/fonts/Figtree-OFL.txt and assets/fonts/BricolageGrotesque-OFL.txt. No external font requests are made.

WordPress and WooCommerce supply the runtime libraries the plugin uses. The build uses the GPL-compatible @wordpress packages (api-fetch, blocks, block-editor, components, element, i18n and url), which stay external and are loaded from WordPress.

== Privacy ==

Optional builder analytics stay in this site's database. They collect builder
views, product picks, tier milestones, cart additions and box purchases. A random
session ID is stored in browser sessionStorage, with no tracking cookie. Only a
daily salted hash reaches the database; no IP address or user agent is recorded.
The analytics_enabled setting and mmbb_track_events filter stop all collection,
including new purchases. Raw browsing events expire after analytics_retention_days
(default 90); daily aggregates and order-line sales records remain for reports
and late refunds. Refund and cancellation corrections continue when tracking is off.
Session counts are daily and campaign scoped; they cannot identify returning people.
Gift messages are stored with WooCommerce order items. WordPress privacy tools
export them and erase them when WooCommerce's order data removal setting allows it.
