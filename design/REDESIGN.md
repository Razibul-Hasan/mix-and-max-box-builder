# Design handoff — ProductBoxes redesign

This folder is the source of truth for the new UI. **Don't ship it**: it is excluded from the plugin zip.

| Folder | What's in it |
| --- | --- |
| `canvas/*.dc.html` | One file per screen, exported from the design canvas. Read them as HTML: the layout, copy, spacing and states are in the markup. Each file ends with a `<script>` holding its sample data and interaction logic (`renderVals()`). |
| `canvas/wp.css` | Shared styles behind the mockups: admin colours, spacing and the editor frame (`.browser`, `.ed-stage`, `.phone`). |
| `canvas/lib/components-map.js` | The exact `@wordpress/components` exports the mockups mount. `WPC.ToggleGroupControl` is `__experimentalToggleGroupControl`, and so on. |
| `canvas/canvas.json` | Board list with titles. Its note `n1` describes the iframe preview. |
| `before/*.png` | Screenshots of the plugin as it is today, for comparison. |
| `images/*.png` | Sample product images used in the mockups. |

A note on images: in the `.dc.html` files, images point to `/_blob/<id>`, which only works on the canvas. The files in `images/` are the same pictures (`a21d…` beanie, `dbf6…` belt, `7bb4…` cap, `3b8a…` sunglasses, `e086…` T-shirt).

The canvas mounts **real** WordPress components with `<x-import component-from-global-scope="WPC.Button" variant="primary">`. In the plugin, each of those is a normal import:

```js
import { Button } from '@wordpress/components';
// <Button variant="primary">…</Button>
```

## Screen map

| Screen | File | Part |
| --- | --- | --- |
| Home (setup checklist, key numbers, your boxes, most picked) | `canvas/Main.dc.html` | 3 |
| Boxes list (tabs, search, table, row actions) | `canvas/Boxes.dc.html` | 3 |
| Create a box (modal: name and discount type) | `canvas/NewBox.dc.html` | 3 |
| Editor step 1, Products | `canvas/EditorProducts.dc.html` | 4, 5 |
| Editor step 2, Discounts | `canvas/EditorDiscounts.dc.html` | 4, 5 |
| Editor step 3, Design (Template / Style / Content) | `canvas/EditorDesign.dc.html` | 6 |
| Publish (modal: placement, schedule, success) | `canvas/Publish.dc.html` | 9 |
| Analytics | `canvas/Analytics.dc.html` | 10 |
| Settings | `canvas/Settings.dc.html` | 10 |
| Template 01 Spotlight (supports every style setting) | `canvas/TplClassic.dc.html` | 7 |
| Template 02 Clean list | `canvas/TplMinimal.dc.html` | 7 |
| Template 03 Guided steps | `canvas/TplSteps.dc.html` | 7 |
| Template 04 Gift tray | `canvas/TplGiftBox.dc.html` | 7 |
| Template 05 Color block | `canvas/TplBold.dc.html` | 7 |
| Template 06 Pastel | `canvas/TplPastel.dc.html` | 8 |
| Template 07 Editorial | `canvas/TplEditorial.dc.html` | 8 |
| Template 08 Night | `canvas/TplNight.dc.html` | 8 |
| Template 09 Split screen | `canvas/TplSplit.dc.html` | 8 |
| Template 10 Compact card | `canvas/TplCompact.dc.html` | 8 |
| Phone layout (bottom bar and box drawer) | `canvas/Mobile.dc.html` | 8 |

## Template defaults

Each template ships its own defaults. The merchant's design settings override them, and an empty setting means "use the template default".

| # | Slug | Name | Accent | Background | Text | Heading font | Body font | Layout idea |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | `spotlight` | Spotlight | `#ff4f1f` | `#ffffff` | `#111111` | Bricolage Grotesque | Bricolage Grotesque | Big headline, rising discount ladder, grid plus box panel |
| 02 | `clean` | Clean list | `#111111` | `#ffffff` | `#111111` | Inter Tight | Inter Tight | Centred list, 12-segment progress, floating dark bar |
| 03 | `steps` | Guided steps | `#5b3df5` | `#f6f4ff` | `#1b1240` | Plus Jakarta Sans | Plus Jakarta Sans | Pick size → fill → review |
| 04 | `gift` | Gift tray | `#f2c14e` | `#0f3d2e` | `#f6efe3` | Fraunces | DM Sans | Cream tray with 12 slots above the products |
| 05 | `bold` | Color block | `#2b4bff` (banner) + `#ffe14d` | `#f2f3f5` | `#0e0e10` | Bricolage Grotesque | Bricolage Grotesque | Full-width colour banner, overlapping cards, dark bottom bar |
| 06 | `pastel` | Pastel | `#8b5cf6` | `#fff8f3` | `#2d2433` | Outfit | Outfit | One pastel per product, lilac box panel with round slots |
| 07 | `editorial` | Editorial | `#c2410c` | `#f5f1ea` | `#1a1a1a` | Fraunces | Inter | Magazine layout with a numbered product list |
| 08 | `night` | Night | `#c8ff2e` | `#0c0c10` | `#f4f4f5` | Space Grotesk | Space Grotesk | Dark theme, progress ring, glowing bar |
| 09 | `split` | Split screen | `#ff6b4a` | `#ffffff` | `#111111` | Bricolage Grotesque | Inter | Box in a coloured left half, products on the right |
| 10 | `compact` | Compact card | `#e11d74` | `#f4f4f2` | `#111111` | Bricolage Grotesque | Inter | Narrow card for product pages and sidebars |

All 10 fonts are under the SIL Open Font License. Ship them as local woff2 files (Latin subset, variable where possible) and load a template's fonts only when that template renders and "Use my theme's fonts" is off.

## Admin component map (design → `@wordpress/components`)

| UI piece | Component |
| --- | --- |
| Header actions, steps, links | `Button` (`variant` primary / secondary / tertiary, `href` for links, `icon` from `@wordpress/icons`) |
| Device switch, sidebar tabs, segmented choices | `ToggleGroupControl` + `ToggleGroupControlOption` (`isBlock`) |
| Collapsible sidebar sections | `Panel`, `PanelBody` (`initialOpen`) |
| Colour list | `ItemGroup` + `Item` + `ColorIndicator`. Each item opens a `Dropdown` with a `ColorPalette` (theme palette first, custom colour allowed) |
| Heading size | `FontSizePicker` (sizes from the theme when available) |
| Selects, toggles, sliders, text | `SelectControl`, `ToggleControl`, `RangeControl`, `TextControl`, `TextareaControl` |
| Numbers | `NumberControl` (`__experimentalNumberControl`) |
| Padding | `BoxControl` (`__experimentalBoxControl`) |
| Discount type | `RadioControl` |
| Product search and pick | `SearchControl`, `SelectControl`, `CheckboxControl` |
| Messages | `Notice`. Use snackbars from `@wordpress/notices` for "Saved" |
| Create box, Publish | `Modal` |
| Home and Settings cards | `Card`, `CardHeader`, `CardBody` |
