# CampaignsPage

Every box builder on the store, with status, placement and results.

**Features**
- Status tabs with counts: All, Active, Scheduled, Drafts, Ended.
- Search by name; filter by type (Tiered mix, Fixed box, Bundle price); sort by newest, revenue or conversion.
- Rows show product thumbnails, name and type summary, status badge, schedule, placement (page with the block, or the shortcode, or Not placed as a warning), boxes sold, revenue, conversion.
- Row actions: Edit, and a menu with View on store, Duplicate, Pause/Resume, Copy shortcode, Delete.
- Bulk actions on selection: Duplicate, Pause, Delete (with confirm).
- Create campaign, or start from a template (Holiday box, Spa kit, Snack pack, Build-a-gift).
- Pagination at 20 rows.

**Data**: `GET /mmbb/v1/campaigns?status=&search=&type=&orderby=&page=`, `POST /mmbb/v1/campaigns/bulk`.
