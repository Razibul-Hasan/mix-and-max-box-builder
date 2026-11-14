@AGENTS.md

## Notes for Claude Code

- "Run Part N" means: follow "How we work" in AGENTS.md for the `## Part N` section of `docs/REDESIGN-PLAN.md`.
- This is an update to an existing plugin. Before renaming, moving or deleting anything, check the Frozen identifiers table and `docs/AUDIT.md`.
- Before building a screen, open its picture `design/screens/<Name>.png` with the Read tool, then read `design/canvas/<Name>.dc.html` for exact copy and states. Compare with `design/before/*.png` to see what changes. Never open a `.dc.html` file directly in a browser; see `design/README.md`.
- Prefer small, reviewable commits inside a part. The final commit message is `Redesign Part N: <title>`.
