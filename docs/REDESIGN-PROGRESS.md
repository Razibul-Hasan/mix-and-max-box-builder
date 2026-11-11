# Redesign progress

Updated by the agent at the end of every part.

| Part | Title | Status | Commit |
| --- | --- | --- | --- |
| 0 | Audit and freeze | done | Redesign Part 0: Audit and freeze |
| 1 | Baseline and safety net | not started | |
| 2 | Admin foundation | not started | |
| 3 | Home, Boxes, Create a box | not started | |
| 4 | Editor shell and iframe preview | not started | |
| 5 | Products and Discounts steps | not started | |
| 6 | Design settings and Design step | not started | |
| 7 | Template engine and templates 01–05 | not started | |
| 8 | Templates 06–10, phone layout, fonts | not started | |
| 9 | Publish flow | not started | |
| 10 | Analytics and Settings | not started | |
| 11 | Migration, compatibility, hardening | not started | |
| 12 | Release | not started | |

## Log

### Kit set-up (2026-11-11)
**Done:** Branch `redesign` created from `review-fixes`. The kit was unpacked into the repository root and its folder removed. Commit `Redesign kit`.
**Decisions:**
- The repository already had `docs/PROGRESS.md` (the 1.0 build log) and `design/README.md` (the 1.0 design handoff). Both are kept. The kit's copies are `docs/REDESIGN-PROGRESS.md` (this file) and `design/REDESIGN.md`, and every reference in the plan and the agent instructions points to these names.
- The kit's `AGENTS.md` and `CLAUDE.md` are appended to the existing files under `## Redesign`, as the plan says. One sentence was added: where a redesign rule and a 1.0 rule disagree, the redesign rule wins.
- `design/canvas`, `design/before` and `design/images` sit beside the 1.0 `design/prototype`, `design/screens` and `design/system`. `design/system/tokens.json` is still the source for `npm run tokens`.
- `.distignore` and the `files` list in `package.json` already keep `design/`, `docs/`, `AGENTS.md` and `CLAUDE.md` out of the zip, so neither changed.

### Part 0 — Audit and freeze (2026-11-11)
**Done:** `docs/AUDIT.md` written (identity, code map, imports, data, interfaces, features today vs redesign, risks). The Frozen identifiers table in `AGENTS.md` is filled in, with one added row for the hooks the plugin fires.
**Decisions:**
- The code and stored data say "campaign" where the design says "box". Stored names keep "campaign"; only labels change.
- All 1,002 translation calls in PHP and JS use the frozen text domain. Nothing needs fixing.
**Frozen identifiers touched:** none
**Data changes and migration steps:** none
**Checks run:** `docs/AUDIT.md` exists ✅ · no `_Part 0_` left in `AGENTS.md` ✅ · this part changed only `AGENTS.md` and `docs/` ✅
**Skipped checks (and why):** Build, lint and tests were not run, because no plugin code changed.
**Open issues:** The working tree still holds uncommitted changes from before the redesign ("Builder shopper preview tidied", 2026-11-08): `docs/PROGRESS.md`, `src/admin/editor/Preview.js`, `PreviewCard.js`, `editor.css` and `tests/js/editor/editor.test.js`. They are not part of any redesign commit. Commit them before Part 1 so its baseline is clean.

<!-- Copy for each part:

### Part N — Title (YYYY-MM-DD)
**Done:**
**Decisions:**
**Frozen identifiers touched:** none (or explain)
**Data changes and migration steps:**
**Checks run:** build ✅ · lint ✅ · tests ✅ · legacy fixtures ✅ · Plugin Check ✅ (vs baseline)
**Skipped checks (and why):**
**Open issues:**
-->

## Open issues

Questions for the owner from Part 0. The numbers in brackets are the risks in `docs/AUDIT.md`.

1. **The `design.layout` key (risk 1).** It is a string today and an object in the Part 6 schema. Proposed: keep the old string as it is and store the new width and padding under `design.spacing`.
2. **Old design keys (risk 2).** Proposed: the Part 6 migration copies `headline`, `intro`, `cta_label`, `columns`, `show_ladder`, accent and theme colours into the new nested keys once, and the old keys stay stored but unused.
3. **"Template" has two meanings (risk 4).** The five starting presets (Holiday treat box, Build-a-spa kit, Snack pack, Build-a-gift, blank) are not in the new Create a box modal. Keep them somewhere, or retire them? The `mmbb_templates` filter and the `template` REST arg stay either way.
4. **Coupons per box (risk 5).** The design has "Allow coupons on this box" and also keeps the store-wide setting. Which wins? Proposed: the box setting, defaulting to the store setting.
5. **Countdown (risk 6).** The design offers only "the last 3 days". Today a merchant picks 0 to 30 days. Keep the number, or fix it at 3 for new boxes?
6. **Gift wrap and note (risk 7).** One toggle in the design, two separate options today. Proposed: keep both keys and show two toggles.
7. **Features with no place in the new design:** size tags (popular, best value), fixed-amount and box-price tiers, the sticker text, custom ladder and countdown colours, low-stock notes, the unlock toast, the store-wide button label and empty-slot hint, and "Load assets only on builder pages". Proposed: keep the data and behaviour, and give each a control where it fits; none is removed without your say.
8. **Admin menu labels.** The design says Home and Boxes; the menu says Dashboard and Campaigns. Labels are not identifiers. Change them?
9. **Figtree.** Today's storefront and admin use it, and it is not in the new font list. Keep shipping it for the Spotlight template?
10. **`@wordpress/icons` (risk 9).** It is compiled into our script by `@wordpress/scripts`, not loaded from WordPress, so Part 2's `wp-icons` dependency does not apply. No minimum WordPress bump is needed so far.
11. **WP-CLI** is needed for `wp i18n make-pot` (Parts 2 and 11) and was not on PATH here.

## Compatibility matrix (Part 11)

| Environment | Result | Notes |
| --- | --- | --- |
