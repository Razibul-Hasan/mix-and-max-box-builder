# Button

Actions. `primary` is the ink default; `max` (Max Orange, ink label) is the one hot conversion CTA per view.

- Provide `children` (a verb: "Create campaign", "Add box to cart"), optional `icon` / `iconRight`, `size` (`sm` in tables and toolbars, `md` default, `lg` on the storefront).
- `variant`: `primary` for the main admin action, `max` for the storefront Add to cart and the empty-state Create campaign, `secondary` (default) for everything else, `ghost` for low-weight row and card actions, `danger` only inside a confirm.
- `loading` swaps the icon for a spinner and disables the button; keep the label.
- Icon-only: pass `icon` with no children and an `aria-label`.
- Don't put two `max` buttons in one view, and never set white text on `max`.
- `href` renders the same button as a link (`<a>`): WordPress admin URLs such as `admin.php?page=mmbb-campaigns`, View on store, and prototype links between screens.
