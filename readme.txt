=== ProductBoxes - Mix & Match Box Builder for WooCommerce ===
Contributors: bestwpexpert
Tags: build your own box, product bundles, mix and match, gift box, bundle discount
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: woocommerce
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Let shoppers build their own box of WooCommerce products and unlock bigger discounts as the box fills. Gift boxes, samplers and bundles.

== Description ==

**ProductBoxes - Mix & Match Box Builder for WooCommerce** adds a build-your-own-box experience to your store. Shoppers pick products into the slots of a box, watch their savings grow with every item, and add the whole box to the cart in one click. The fuller the box, the bigger the discount, and the next discount is always shown on screen.

Use it for gift boxes, snack boxes, sampler packs, bakery boxes, tea and coffee samplers, beauty kits, holiday bundles or any "pick any 6" offer.

Create a campaign in a step-by-step editor, choose which products can go in the box, set the discount rules, and add it to a page with a block or a shortcode. The server calculates every price, so the discount a shopper sees is the discount they pay.

Every feature is included. There is no paid version, no locked features and no account to create.

= Campaign types =

* **Tiered discount:** the discount grows with the number of items, for example 10% off 3 items, 15% off 5 and 25% off 12.
* **Fixed box size:** shoppers choose a box of 6, 12 or 24, and each size has its own discount or box price.
* **Bundle price:** one fixed price for a box of an exact number of items.

= Campaign options =

* Add products by hand, by category or by tag. Simple products and variations are supported.
* Optional gift wrap fee and gift message.
* Per-product limit inside a box.
* Start and end dates, with a countdown that only appears when a real end date is set.
* Sold-out items are shown as sold out and cannot be picked, or can be hidden.

= For shoppers =

* A storefront builder with product grid, category filter, sorting, and a box panel or sticky summary bar.
* A mobile-friendly bottom sheet on phones.
* Edit a box from the cart.
* Works with the classic cart and checkout and with the Cart and Checkout blocks.

= For store owners =

* Dashboard, campaign list, analytics (views, picks, conversion, revenue, discount given, top products) and settings.
* Box contents, discount and gift message are saved on the order and shown on order screens and in emails.
* Stock is reduced for every item inside a box when the order is paid.
* Compatible with High-Performance Order Storage (HPOS) and the Cart and Checkout blocks.
* Analytics stay in your own database. No external services.

= Requirements =

* WordPress 6.6 or later
* WooCommerce 9.0 or later
* PHP 7.4 or later

== Installation ==

1. Install and activate WooCommerce 9.0 or later.
2. In your admin, go to Plugins > Add New, search for "ProductBoxes" and click Install Now. Or upload the `productboxes-mix-and-match-box-builder` folder to `/wp-content/plugins/`.
3. Activate ProductBoxes - Mix & Match Box Builder for WooCommerce. On a multisite network each site gets its own defaults.
4. Open ProductBoxes in the admin menu and choose Create campaign.
5. Publish the campaign and choose a page, or add the ProductBoxes Box Builder block or the `[mmbb_box id="12"]` shortcode to any page.

== Frequently Asked Questions ==

= How do I put a box builder on a page? =

Publish the campaign and choose a page, or add the ProductBoxes Box Builder block to any page and choose a campaign. You can also use the shortcode `[mmbb_box id="12"]`, which takes the optional attributes `layout` (panel, bar or both), `columns` (3, 4 or 5) and `hero` (true or false).

= Which campaign types are there? =

Tiered discount (more items, bigger discount), fixed box size (the shopper picks a size) and bundle price (one price for a set number of items). Each campaign can also offer a gift wrap fee and a gift message.

= Can I sell a custom box at a fixed price, like any 3 for 18? =

Yes. Choose the bundle price campaign type, then set the number of items and the box price. Shoppers can pick any of the products you allow.

= Can shoppers choose product variations? =

Yes. Simple products and individual variations can go in a box.

= Does it work with my theme? =

The builder renders inside your theme's content area with its own scoped styles, so it works with themes that follow WordPress standards. It was tested with Twenty Twenty-Five and Storefront. On narrow screens it switches to two columns, a sticky summary bar and a bottom sheet.

= Does it work with the Cart and Checkout blocks? =

Yes. The box contents, discount, gift message, next-discount hint and "Edit box" link appear in both the classic and block carts, and the box is saved on the order. Locked item quantities in the "Box plus each item" cart mode are fully supported in the classic cart.

= Does it slow down my site? =

No. The builder loads its scripts and styles only on pages that show a builder. You can change this under "Load assets only on pages with a builder" in Settings.

= How is a box taxed when its items have different tax classes? =

By default a box is one cart line, taxed with the tax class of the hidden box product (Standard unless you change it). If your items need their own tax rates, choose "Box plus each item" under Cart in the plugin settings. Each item then becomes its own cart line and is taxed by its own class.

= What is the hidden "Box container" product? =

Each published campaign has one hidden WooCommerce product that carries the box through the cart. ProductBoxes manages its name and price, so edit the campaign, not the product. It is trashed together with the campaign.

= What happens if WooCommerce is not active? =

The plugin stays inactive and nothing breaks. Users who can activate plugins see a dismissible notice on the Plugins screen.

= Does uninstalling delete my data or orders? =

Data is kept on deactivation and on uninstall unless you turn on "Delete all plugin data" in Settings. Orders are never deleted. On multisite each site has its own setting, off by default.

= Does it collect personal data or contact external servers? =

No external servers are contacted. Optional analytics stay in your own database and record no IP addresses. See the Privacy section below.

= Can I build the plugin from source? =

Yes. See "Source code and build" below.

= Which hooks and filters are available for developers? =

All hooks use the `mmbb_` prefix.

* `mmbb_campaign_config_defaults` (filter): the config a blank campaign starts from. The result is sanitized again.
* `mmbb_templates` (filter): the templates in the new campaign picker. Each is an array with id, title, type_label, description, art and a partial config.
* `mmbb_pricing_quote` (filter): a box quote after the pricing engine has run. Arguments: the quote, the campaign config, the items and the options. Amounts are integer minor units (for example cents).
* `mmbb_campaign_saved` (action): fires after a campaign is saved. Arguments: the campaign ID and the sanitized config.
* `mmbb_ensure_container_product` (filter): called when a campaign goes live. Return the hidden container product ID, a WP_Error to stop publishing, or null. Arguments: the current value and the campaign ID.
* `mmbb_track_events` (filter): return false to stop all analytics collection.

== Screenshots ==

1. The storefront box builder: shoppers pick products, watch the discount tiers unlock and add the box to the cart.
2. The campaign editor: choose a campaign type, set box rules and discount tiers, and see a live shopper preview.
3. The dashboard with box revenue, boxes sold, conversion, top campaigns and most-picked products.

== Changelog ==

= 1.0.0 =
* Initial release: tiered, fixed-size and bundle-price box campaigns, storefront builder block and shortcode, classic and block cart and checkout support, order and email details, analytics and settings.

== Upgrade Notice ==

= 1.0.0 =
Initial release.

== External services ==

This plugin does not connect to any external service. It makes no requests to other servers and uses no CDN, remote fonts, telemetry, or licence or update checks. All scripts, styles and fonts are included in the plugin.

== Privacy ==

Optional builder analytics are stored only in this site's database. They record builder views, product picks, tier milestones, cart additions and box purchases.

* A random session ID is kept in the browser's sessionStorage. No tracking cookie is set.
* Only a daily salted hash of that ID is stored. No IP address or user agent is recorded, and the salt changes every day, so sessions cannot be linked across days.
* The analytics setting and the `mmbb_track_events` filter stop all collection, including new purchases. Refund and cancellation corrections still apply when tracking is off.
* Raw events are deleted after the retention period (90 days by default). Daily totals and order-line sales records are kept for reports and late refunds.

Gift messages are stored with WooCommerce order items. The WordPress personal data tools export them, and erase them when WooCommerce's order data removal setting allows it.

== Source code and build ==

The JavaScript and CSS source is included in the `src/` folder, with the build configuration in `package.json` and `webpack.config.js`. React and the @wordpress packages are supplied by WordPress and are not bundled.

To build with Node.js 20.19 or later:

    npm install
    npm run build

The build writes production files to `build/`. Composer is used only for development tools (coding standards and PHPUnit) and is not needed to run the plugin.

Public repository: https://github.com/Razibul-Hasan/productboxes-mix-and-match-box-builder

== Credits ==

The Figtree and Bricolage Grotesque fonts are bundled locally under the SIL Open Font License 1.1. Licence files: `assets/fonts/Figtree-OFL.txt` and `assets/fonts/BricolageGrotesque-OFL.txt`.
