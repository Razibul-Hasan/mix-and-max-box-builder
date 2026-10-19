# DashboardPage

The plugin home: what to do next, how boxes are selling, and what is live.

**Features**
- Setup checklist (until done): Install WooCommerce, Create a campaign, Add products, Place the builder on a page, Run a test order, Go live. The next step is highlighted with its action inline (Copy shortcode). Dismissible once complete.
- Date range (7 / 30 / 90 days) scoping every number on the page.
- KPIs: Box revenue, Boxes sold, Avg. box value, Builder conversion, each with delta and sparkline.
- Revenue chart, this period vs previous, linking to Analytics.
- Top campaigns table (status, boxes, revenue) linking to Campaigns.
- Live now card for the active campaign with the most traffic: countdown to its end date, boxes today, conversion, Edit / View on store.
- Most-picked products.

**Data**: `GET /mmbb/v1/stats?range=30d`, `GET /mmbb/v1/campaigns?status=active&orderby=revenue&per_page=3`, `GET /mmbb/v1/setup`.
