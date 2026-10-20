---
name: cost-router
description: Use for any multi-step coding task (features, bug fixes, refactors, audits, migrations) when the main session runs on Opus. Opus plans and verifies; it routes reading, searching, mechanical edits and well-specified implementation to cheaper Haiku/Sonnet subagents to cut token cost without losing quality.
---

# Cost Router

You are the **orchestrator** (Opus). Your tokens are the most expensive in the
system, so spend them on judgment: understanding the goal, planning, writing
precise briefs, and verifying results. Delegate everything that is mechanical,
high-volume, or fully specified.

The goal is **lowest total cost for a correct result**. A cheap model that
fails and needs a redo costs more than doing it right once. Never trade
correctness for savings.

---

## 1. Decide: do it yourself or delegate?

Every subagent starts cold. It pays to re-read context you may already have.
Delegate only when the savings beat that overhead.

**Do it yourself (no subagent) when:**
- The task is under ~3 tool calls or touches 1–2 small files you already know.
- The answer is already in your context.
- The work needs judgment you can't fully specify in a brief (ambiguous bug,
  design trade-off, unclear requirements).
- Writing the brief would take as long as doing the work.

**Delegate when:**
- The work requires *reading a lot to return a little* (search, audit,
  log/test-output triage, "where is X used?"). This is the biggest saving:
  the subagent absorbs the input tokens, you only see the summary.
- The work is *specified enough to write as a checklist* (rename, add a field
  everywhere, write tests for a given function, implement a function with a
  known signature).
- There are 2+ independent pieces that can run in parallel.

---

## 2. Pick the cheapest model that will succeed

| Tier | Agent | Use for | Never use for |
|---|---|---|---|
| **Haiku** | `scout` | Finding files/symbols, grep sweeps, reading and summarizing files, running tests/linters/builds and reporting failures, listing usages, checking conventions | Writing non-trivial logic, anything needing design judgment |
| **Haiku** | `mechanic` | Mechanical edits with exact instructions: renames, find-and-replace, formatting, adding imports, updating version strings, boilerplate from a given template, translation strings | Edits where the right change depends on understanding behavior |
| **Sonnet** | `builder` | Implementing features from a clear spec, writing tests, refactors with a defined target shape, fixing a bug whose cause is already identified, code review of a diff | Open-ended architecture, root-causing a mystery bug |
| **Opus** | you | Planning, architecture, ambiguous debugging, security-sensitive logic, integrating results, final verification | Bulk reading, mechanical edits |

Rule of thumb: **if you can write the exact acceptance check, it can go one
tier down.**

---

## 3. Write tight briefs (this is where most savings come from)

A subagent's cost is driven by how much it has to explore. A vague brief makes
it read the whole repo. Every brief must contain:

```
GOAL: <one sentence>
FILES: <exact paths, plus line ranges if known>
CONTEXT: <only the facts it needs — conventions, signatures, the decision already made>
DO: <numbered steps or checklist>
DON'T: <scope limits — files not to touch, no refactors beyond X>
DONE WHEN: <concrete check, e.g. "npm test passes", "no remaining matches for oldName">
RETURN: <exact format and length cap>
```

**Always cap the return.** Examples:
- "Return only: file:line list, max 30 lines."
- "Return: PASS, or FAIL + the first failing test name and the 10 most relevant error lines."
- "Return a 5-bullet summary, under 120 words. Do not paste code."
- "Return the list of files changed and a one-line description of each. No diffs."

Long returns land in *your* expensive context. Ask for pointers (path:line),
not content. Read the specific lines yourself only if you need them.

---

## 4. Workflow

1. **Understand** — Read the request. If scope is unclear and the task is
   expensive to redo, ask the user one focused question first.
2. **Scout (Haiku)** — If you don't already know the relevant code, send
   `scout` to locate it. Ask for paths, line ranges, and a short summary —
   not file contents.
3. **Plan (you)** — Break the work into units. For each unit choose
   self / `mechanic` / `builder`. Mark which units are independent.
4. **Dispatch** — Launch independent units in parallel (multiple Agent calls
   in one message). Run dependent units in order.
5. **Verify (cheap first)** — Send `scout` to run tests/lint/build and report
   PASS/FAIL compactly. Only read code yourself where something failed or
   where the change is high-risk.
6. **Review (only when it matters)** — For non-trivial changes, have `builder`
   review the diff against the plan and return only real issues. Skip for
   mechanical edits that tests already cover.
7. **Report** — Tell the user what changed, briefly.

---

## 5. Escalation ladder

- A Haiku agent fails or returns something wrong → retry **once** with a
  sharper brief (add the missing context it lacked). Fails again → give the
  unit to `builder`.
- `builder` fails twice → take it yourself; the task needed judgment the brief
  couldn't carry. Note why so you route similar work correctly next time.
- Never loop the same model on the same failure more than twice.
- When re-dispatching, use SendMessage to continue the same agent if its
  context is still useful — it's cheaper than a cold restart.

---

## 6. Keep your own context lean

- Don't Read large files "to get a feel". Send `scout` and ask for the
  20 lines that matter.
- Don't paste big outputs (test logs, diffs, search results) into your
  context. Have a subagent digest them.
- Don't re-read files you just delegated edits on; trust the agent's
  report plus the test result, and spot-check only risky spots.
- Keep briefs reusable: put stable project conventions in CLAUDE.md so you
  don't repeat them in every brief.

---

## 7. Anti-patterns (these cost more, not less)

- Spawning a subagent for a one-line edit.
- Sending Haiku a vague task ("fix the checkout bug") — it will thrash.
- Asking a subagent to "return the full file" or "show the diff".
- Chaining agents where each re-discovers the same context — pass the
  findings from one brief into the next.
- Re-doing a subagent's whole job yourself to double-check it. Verify with
  tests, not by redoing.
- Using Opus subagents. You *are* Opus; if a unit needs Opus, do it inline.

---

## Quick routing examples

| Task | Route |
|---|---|
| "Where is the payment webhook handled?" | `scout` → return path:line + 3-line summary |
| Rename `getUser` → `fetchUser` across repo | `scout` lists usages → `mechanic` edits → `scout` runs tests |
| Add a REST endpoint matching existing ones | you plan the contract → `builder` implements + tests → `scout` runs tests |
| Intermittent race condition in the queue | you (needs judgment); `scout` only to gather logs |
| Write unit tests for 6 utility functions | 2–3 `builder` agents in parallel, split by file |
| Bump plugin version in 4 files + changelog line | `mechanic` with the exact values |
| Review a 40-file PR | `scout` summarizes per-area changes → you pick risky areas → `builder` reviews those |
