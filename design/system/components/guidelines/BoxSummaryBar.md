# BoxSummaryBar

The sticky bottom bar on phones (and optionally desktop): thumbnails, count, compact TierProgress, total with compare-at, and the CTA, on `surface-strong`.

- Provide `size`, `items`, `tiers`, `total`, `compareAt`, `minItems`, `onOpen` (opens a box drawer) and `onCheckout`.
- Below 620px wide it stacks the tier line on top.
- Position it `sticky; bottom: 12px` with 10px side insets.
- `openHref` and `ctaHref` make the summary and the CTA links (a drawer page, the cart).
