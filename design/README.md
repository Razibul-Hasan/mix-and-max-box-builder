# Design handoff — Mix and Max Box Builder

Everything the build phases reference. Design source of truth; do not ship this folder in the plugin zip (it is listed in `.distignore`).

| Path | What it is | Use it for |
| --- | --- | --- |
| `system/brand-book.md` | Usage rules: voice, colour, type, spacing, motion, iconography, prefixes | Read before any UI work |
| `system/features.md` | Feature map, campaign types, the "clickbait toolkit" rules | Scope of each screen |
| `system/wordpress-notes.md` | First architecture sketch | Background only. Where it differs from `docs/BUILD-PLAN.md`, the plan wins |
| `system/tokens.json` | All design tokens, light + dark themes | Source of every colour, space, radius, shadow, type style |
| `system/tokens.css` | Tokens compiled to CSS custom properties (`:root` + `[data-theme="dark"]`) | Starting point for `src/styles/tokens.css` (rescope to `.mmbb-root`) |
| `system/components/index.jsx` | React source of all 34 components (reads `window.React`) | Port into `src/components/` with `@wordpress/element` imports |
| `system/components/components.css` | Component styles, every class prefixed `mmbb-` | Port into `src/styles/components.css` |
| `system/components/index.d.ts` | Props of every component | API contract while porting |
| `system/components/bundle.js` | Built bundle of the above | Reference only, never ship |
| `system/components/guidelines/*.md` | Per-component usage rules; page guidelines (`DashboardPage.md` …) list each screen's features | Behaviour and copy |
| `system/fonts/` | Figtree + Bricolage Grotesque variable woff2, SIL OFL licences | Ship in `assets/fonts/` with the licence files |
| `screens/*.png` | Rendered admin and storefront screens (light; two dark storefront variants) | Visual target for each page |
| `screens/components/*.png` | Rendered component previews | Visual target for each component |
| `prototype/*.dc.html` | Source of the clickable design canvas (21 screens). HTML plus `<x-import component-from-global-scope="MixMax.X" …>` tags that mount the components above with the given props; data sits in the `renderVals()` script at the bottom | Exact layout, copy and props for screens that have no PNG: wizard steps 1–5 + published, template picker, delete dialog, first-run dashboard, cart, phone drawer, phone box-complete, block editor, order email |
| `prototype/canvas.json` | Board list with titles and developer notes | Screen inventory |

Screen → file map

| Screen | PNG | Prototype |
| --- | --- | --- |
| Dashboard (active) | `screens/DashboardPage.png` | `prototype/Main.dc.html` |
| Dashboard (first run) | — | `prototype/DashboardFirstRun.dc.html` |
| Campaigns list | `screens/CampaignsPage.png` | `prototype/Campaigns.dc.html` |
| Template picker | — | `prototype/CampaignsTemplates.dc.html` |
| Delete dialog | — | `prototype/CampaignsDelete.dc.html` |
| Analytics | `screens/AnalyticsPage.png` | `prototype/Analytics.dc.html` |
| Settings | `screens/SettingsPage.png` | `prototype/Settings.dc.html` |
| Wizard 1 Basics | — | `prototype/WizardBasics.dc.html` |
| Wizard 2 Products | — | `prototype/WizardProducts.dc.html` |
| Wizard 3 Box rules | `screens/CampaignEditorPage.png` | `prototype/WizardRules.dc.html` |
| Wizard 4 Design | — | `prototype/WizardDesign.dc.html` |
| Wizard 5 Publish | — | `prototype/WizardPublish.dc.html` |
| Published | — | `prototype/WizardPublished.dc.html` |
| Storefront, Tiered mix (desktop) | `screens/StorefrontPage.png` | `prototype/StoreTiered.dc.html` |
| Storefront, Fixed box (desktop) | — | `prototype/StoreFixed.dc.html` |
| Storefront, phone | `screens/StorefrontMobile.png` | `prototype/MobileFill.dc.html` |
| Phone box drawer | — | `prototype/MobileDrawer.dc.html` |
| Phone box complete | — | `prototype/MobileComplete.dc.html` |
| Cart | — | `prototype/Cart.dc.html` |
| Block editor | — | `prototype/BlockEditor.dc.html` |
| Order email | — | `prototype/OrderEmail.dc.html` |

Product names, prices, store name ("Northwind Pantry") and numbers in the designs are sample data. Real screens read live WooCommerce data.
