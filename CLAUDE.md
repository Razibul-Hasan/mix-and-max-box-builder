@AGENTS.md

## Notes for Claude Code

- "Run Phase N" means: follow "How we work" in AGENTS.md for the `## Phase N` section of `docs/BUILD-PLAN.md`.
- Look at the PNGs in `design/screens/` with the Read tool before building a screen, and compare your result against them.
- Prefer small, reviewable commits inside a phase. The final commit message is `Phase N: <title>`.

## Redesign

- "Run Part N" means: follow "How we work" in AGENTS.md for the `## Part N` section of `docs/REDESIGN-PLAN.md`.
- This is an update to an existing plugin. Before renaming, moving or deleting anything, check the Frozen identifiers table and `docs/AUDIT.md`.
- Before building a screen, read its `design/canvas/*.dc.html` file and compare it with the matching `design/before/*.png` screenshot (open the screenshot with the Read tool).
- Prefer small, reviewable commits inside a part. The final commit message is `Redesign Part N: <title>`.
