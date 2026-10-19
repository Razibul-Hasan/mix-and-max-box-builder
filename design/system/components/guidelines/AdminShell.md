# AdminShell

The plugin's app frame inside wp-admin: a 60px top bar with the brand tile, horizontal page nav (Dashboard, Campaigns, Analytics, Settings) and right-side actions, over the `canvas` ground.

- Provide `active` (page id), `onNavigate(id)` for client-side routing, optional `nav` items (`{id, label, icon, count}`) and `right` (default: Help).
- Horizontal on purpose: wp-admin already has a left menu, so the plugin never adds a second sidebar.
- Mount it full-bleed: cancel `#wpcontent` left padding on the plugin page.
- Each nav item can carry `href` (the WordPress submenu URL, e.g. `admin.php?page=mmbb-analytics`); without it the item calls `onNavigate`.
