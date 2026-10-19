# SettingsPage

Store-wide defaults, grouped in a sticky section nav. Campaigns can override display and cart options.

**Features**
- General: master switch for all builders, default builder page, price format.
- Storefront display: products per row, box summary layout (Sidebar, Bottom bar, Both; phones always get the bar), savings stickers, low-stock warnings with threshold, tier-unlock toast, button and empty-slot text.
- Cart & checkout: box shown as one bundled line or box plus each item; edit box from cart; coupons on top of box discounts (off by default); reduce stock per item.
- Emails: box contents and gift message in order emails.
- Advanced: load scripts only on builder pages, delete data on uninstall (off by default), developer notes (REST namespace, hook prefix).
- License: for a Pro add-on, if one ships.

**Data**: one option `mmbb_settings` via `register_setting` with a sanitize callback; `GET/POST /mmbb/v1/settings`.
