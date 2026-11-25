---
name: task-work
description: Use in a sub-session (in a worktree) to do the single task the main session handed out with /task-dispatch. Reads the task from the main checkout, develops it on its own branch, tries it, runs the checks, commits, and writes the result, the evidence and any bugs found to .worktree/report.md. Does not touch docs/.
argument-hint: "PREFIX-N"
---

# Do the task in a sub-session

> **Prefix and project info.** Below, `PREFIX-N` is a task number; the prefix is in `docs/config.json` > `prefix` (e.g. `KES` → `KES-12`, file `docs/tasks/KES-12.md`). In commands, write the real prefix in place of `PREFIX`. Everything project-specific (the check command, areas/apps, test accounts, the pitfalls of parallel work) is in the root `CLAUDE.md` and in `docs/knowledge/`; this skill reads it from there and does not assume it from memory.

## Step 0: Location

```bash
git rev-parse --path-format=absolute --git-common-dir   # main checkout = the parent folder of this
git branch --show-current
```

If `.git` is a directory you are in the main checkout: stop, this skill does not run in the main checkout (use `/task-start` there). If the branch name is the project's main branch (`main`), stop: a sub-session works on its own branch.

If the project has a worktree setup (`scripts/worktree-setup.sh`; a hook runs it at session start), use the port and data information in its output. The `.worktree/` folder must exist for the report (`mkdir -p .worktree`; it does not go into git).

## Step 1: Read the task

Read the task file **from the main checkout**: `<main checkout>/docs/tasks/PREFIX-N.md` (the copy in the worktree is at the commit from before the hand-out; the status and the latest comments are in the main checkout). From start to finish: `## Context`, `## Acceptance`, `## To-do`, `## Notes`, `## Comments`; if there is a design comment, that is the agreed design. The "Scope" and "Don't touch" lines in the brief are the boundary.

Read the root `CLAUDE.md` and, if the subfolder you will change has its own `CLAUDE.md`, that one too.

If the brief and the task file contradict each other, or a design decision is needed: ask the user in this session (`AskUserQuestion`); write the answer under "Questions asked" in the report. Do not write to the main session's files.

## Step 2: Develop

- Do not go out of scope. A bug or improvement found along the way is **not fixed**; it is written under "Findings" in the report (Step 4). The only exception: a bug that blocks the task; then fix it and say so separately in the report.
- `docs/` and the root `CLAUDE.md` are not written (the hook blocks it). A subfolder's own `CLAUDE.md` is changed if it has to change together with the code, and the report says so.
- If something that has generated files changed (schema, type, contract), run the generation command; the outputs go into the same commit.
- Adding a dependency changes the lock file; do not add one unless necessary, and if necessary say so in the report (it may conflict at merge).

## Step 3: Try and check

- Dev server and preview only on this worktree's own ports; do not write to the main checkout's running server, database or files. The project's parallel-work rules (port, data copy, shared and remote resources, test accounts) are in the root `CLAUDE.md` or in `docs/knowledge/`; follow what is there, do not ask the user for passwords.
- Do not use single-copy resources (device, simulator, shared remote service). A Acceptance item that has to be seen there stays ⏳ in the report, with how to try it.
- Checks: the project's check command (root `CLAUDE.md`; e.g. `bun run check`). If it is red, fix it; if you cannot, write `Status: stuck` in the report.

## Step 4: Commit and report

Committing is part of this skill (the user asked for it with `/task-dispatch`): only to this branch, in the project's commit format (root `CLAUDE.md`), with `PREFIX-N` in the message. No push, do not touch main, do not rebase/merge (the main session does that with `/task-collect`).

Then write `.worktree/report.md` with this template (overwrite if it exists):

```md
# PREFIX-N report

- Branch: <branch> · Commits: <short hash> <subject>, ...
- Status: ready | stuck (<reason>)
- Areas changed: <tags>

## What changed
Two or three sentences: what changed, why this approach.

## Acceptance
1. ✓ <evidence: test name, command output, what was seen in the preview>
2. ⏳ <needs a device / live data; how to try it>
3. ✗ <not met; why>

## Checks
`<check command>`: <result, test counts>

## Impact on other areas
None / <endpoint, field, behavior; which app or package, what should be done>

## Findings
Task candidates; the main session searches and opens them with /task-open. Each one:
### <title sentence describing the behavior>
- tags: <tags from docs/config.json>
- Symptom: <in product language>
- Steps to reproduce: 1. ... 2. ... (role, account, data)
- Suggested acceptance: <observable claim>
- Evidence and location: <error output, file:line>

## Doc suggestions
Suggestions for `docs/knowledge/`, `docs/decisions/` or the root `CLAUDE.md`; any subfolder `CLAUDE.md` that was changed.

## Questions asked
- Question: ... · Choice: ... · If not asked: ...
```

An empty section says "None"; it is not removed.

## Step 5: Finish

Keep the final message short; the first 400 characters reach the main session:

```
PREFIX-N ready · branch <branch> · <n> commits · check ✓ · Acceptance ✓3 ⏳1 · findings 2
Report: <absolute worktree path>/.worktree/report.md
```

Then stop. If the main session sends feedback (`SendMessage`), fix it, make a new commit, update the report.

## Rules

- docs/ and the root CLAUDE.md are not written; findings and suggestions go in the report.
- No out-of-scope fixes; they are written as findings.
- Own ports and data; no single-copy resources; no push; do not touch the main branch.
- No ✓ without evidence (the same bar as `/task-close`).
