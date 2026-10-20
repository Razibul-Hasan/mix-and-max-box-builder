# Cost Router for Claude Code

Opus plans and verifies; Haiku and Sonnet subagents do the reading, searching
and implementation. Cuts token cost while keeping Opus in charge of quality.

## Contents

```
skills/cost-router/SKILL.md   orchestration rules for the main (Opus) session
agents/scout.md               Haiku — search, summarize, run tests (read-only)
agents/mechanic.md            Haiku — mechanical, fully specified edits
agents/builder.md             Sonnet — implementation, tests, reviews
```

## Install

User-wide (all projects):

```bash
mkdir -p ~/.claude/skills ~/.claude/agents
cp -r skills/cost-router ~/.claude/skills/
cp agents/*.md ~/.claude/agents/
```

Or per project: copy into `.claude/skills/` and `.claude/agents/` in the repo.

## Use

1. Run the main session on Opus (`/model opus`).
2. Ask for work normally — the skill triggers on multi-step coding tasks — or
   say "use cost-router" to force it.
3. Check `/agents` to confirm scout, mechanic and builder are listed.

## Tips for the biggest savings

- Put stable project conventions (stack, test command, code style) in
  `CLAUDE.md` so Opus doesn't repeat them in every brief.
- Small tasks stay on Opus by design — subagent startup overhead isn't worth it
  for a one-file change.
- To tune: if Haiku agents often fail on your codebase, change `mechanic` to
  `model: sonnet`; if Sonnet is rarely needed, route more to Haiku.
