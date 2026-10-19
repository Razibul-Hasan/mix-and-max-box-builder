# AnalyticsPage

What sells in boxes and where shoppers drop off.

**Features**
- One filter row scoping everything: date range (Today, 7, 30, 90 days, Custom), campaign, compare to previous period.
- KPIs: Box revenue, Boxes sold, Avg. items per box, Discount given (a cost, so a rise is shown as bad).
- Revenue line chart with crosshair tooltip.
- Builder funnel: Viewed builder, Added first item, Reached a tier, Added box to cart, Purchased.
- Most-picked products, and Where boxes stop (share of boxes by tier reached) to tune tier thresholds.
- Campaign performance table: views, started, sold, conversion, avg. box value, revenue.
- Export CSV of the current filter.

**Data**: events recorded on the storefront (`view`, `add_item`, `tier_reached`, `add_to_cart`) into `{prefix}mmbb_events`, joined with WooCommerce orders; `GET /mmbb/v1/analytics?range=&campaign=&compare=1`.
