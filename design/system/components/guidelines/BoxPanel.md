# BoxPanel

The desktop sidebar that sells the box: title and count, BoxSlots, TierProgress, optional extras (gift option), subtotal, discount, total, and one Max Orange CTA.

- Provide `size`, `items`, `tiers`, `subtotal`, `total`, `minItems`, `onRemove`, `onCheckout`, optional `footnote` (shipping promise) and children for extras.
- Below `minItems` the CTA says what's missing ("Add 2 more to continue") instead of a bare disabled button.
- Make it sticky beside a 3-column product grid.
- `ctaHref` turns the CTA into a link (the cart URL after a server-side add).
