=== Mix and Max Box Builder ===
Contributors: bestwpexpert
Tags: mix and match, product bundles, gift box, box builder, discounts
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Let shoppers build their own box of products and unlock bigger discounts as the box fills. For WooCommerce.

== Description ==

Mix and Max Box Builder lets shoppers pick products into box slots and unlock bigger discounts as their box fills.

This 0.1.0 development draft provides the plugin lifecycle only. Campaign management and the storefront builder arrive in later development phases.

Requires WooCommerce 9.0 or later, WordPress 6.6 or later, and PHP 7.4 or later.

No data is removed on deactivation. Uninstall retains data unless the merchant has explicitly enabled deletion for that site. Orders are always retained.

External services: none. This plugin does not connect to any external service.

== Installation ==

1. Install and activate WooCommerce 9.0 or later.
2. Upload the mix-and-max-box-builder folder to /wp-content/plugins/.
3. Activate Mix and Max Box Builder from the Plugins screen. Network activation installs defaults for every site.

== Frequently Asked Questions ==

= Does this draft include a working box builder? =

No. Version 0.1.0 is the lifecycle foundation; shopping and campaign screens are still in development.

= How do I put a box builder on a page? =

Add the Mix and Max Box Builder block and choose a campaign, or use the shortcode [mmbb_box id="12"]. The shortcode also takes layout (panel, bar or both), columns (3, 4 or 5) and hero (true or false). On wide containers the box panel sits beside the products; below 760 pixels of container width the builder switches to two columns, a sticky summary bar and a bottom sheet. The builder loads its scripts and styles only on pages that show one, unless you turn off "Load assets only on pages with a builder" in Settings.

= What happens if WooCommerce is unavailable? =

Plugin modules stay inactive. Users who can activate plugins see a dismissible explanation on the Plugins screen and plugin screens.

= Does uninstall delete orders? =

No. Orders are retained even when plugin-data deletion is enabled. Each site on a multisite network has its own deletion preference, which defaults to off.

= How is a box taxed when its items have different tax classes? =

By default a box is one cart line, and WooCommerce taxes the whole line with the tax class of the hidden box product (Standard unless you change it). Items with different tax classes in one box are therefore taxed at the box's rate. This is a known limitation. If your items need their own tax rates, choose "Box plus each item" under Cart in the plugin settings: each item becomes its own line and is taxed by its own class.

= Do boxes work with the Cart and Checkout blocks? =

Yes. The contents, discount, gift message and next-discount hint appear in both the classic and block carts, and the box and its contents are saved on the order. The "Edit box" link and the locked quantities of "Box plus each item" are fully supported in the classic cart. The Cart block gets the address in its Store API data, but does not yet show the link itself.

= Developers: which hooks and filters are available? =

All hooks use the mmbb_ prefix.

* mmbb_campaign_config_defaults (filter): the config a blank campaign starts from. The result is sanitized again.
* mmbb_templates (filter): the templates in the new campaign picker. Each is an array with id, title, type_label, description, art and a partial config.
* mmbb_pricing_quote (filter): a box quote after the pricing engine has run. Arguments: the quote, the campaign config, the items and the options. All amounts are integer minor units, for example cents.
* mmbb_campaign_saved (action): fires after a campaign is saved. Arguments: the campaign ID and the sanitized config.
* mmbb_ensure_container_product (filter): called when a campaign goes live. Return the hidden container product ID, a WP_Error to stop publishing, or null. Arguments: the current value and the campaign ID.

== Screenshots ==

Screenshots will be added when the admin and storefront screens are implemented.

== Changelog ==

= 0.1.0 =
* Add dependency checks, activation, upgrades, multisite lifecycle handling and opt-in uninstall.

== Source code and build ==

JavaScript and CSS source is included in src/. Build configuration is included in package.json and webpack.config.js. Runtime libraries are supplied by WordPress.

With Node.js 20.19 or later and npm installed, run:

    npm install
    npm run build

The build writes production files to build/. Composer is used only for development tools; vendor/ is not part of the plugin distribution.

Public repository URL: [YOUR PUBLIC SOURCE REPOSITORY URL].

== Third-party resources ==

Figtree and Bricolage Grotesque variable fonts are bundled locally under the SIL Open Font License 1.1. License files: assets/fonts/Figtree-OFL.txt and assets/fonts/BricolageGrotesque-OFL.txt. No external font requests are made.

WordPress and WooCommerce supply their own runtime libraries. No third-party runtime package is bundled in this lifecycle draft.
