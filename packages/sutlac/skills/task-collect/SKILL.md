---
name: task-collect
description: Use in the main session when a sub-session has finished its task (or the user says "take / collect PREFIX-N"). Inspects the sub-session's report and branch, brings it into main with the user's approval, runs the checks, closes the task with /task-close, opens the bugs in the report as tasks with /task-open, and cleans up the worktree.
argument-hint: "PREFIX-N"
---

# Collect a sub-session's work

> **Prefix and project info.** Below, `PREFIX-N` is a task number; the prefix is in `docs/config.json` > `prefix` (e.g. `KES` → `KES-12`, file `docs/tasks/KES-12.md`). In commands, write the real prefix in place of `PREFIX`. Everything project-specific (the check command, areas/apps, test accounts, the pitfalls of parallel work) is in the root `CLAUDE.md` and in `docs/knowledge/`; this skill reads it from there and does not assume it from memory.

This skill runs in the **main checkout**.

## Step 1: Find the worktree and the report

```bash
git worktree list --porcelain | awk '/^worktree /{w=$2} /^branch /{print w, $2}'
grep -l "^# PREFIX-N report" <each worktree>/.worktree/report.md
```

If there is no report, the sub-session has not finished or has not written it: look at the session's state with `mcp__ccd_session_mgmt__list_sessions` (`linked: true`); if it is running, wait; if it has finished, ask it for the report with `SendMessage` (`to`: its `local_…` session id).

Read the report from start to finish. If it says `Status: stuck`, show the user the reason; decide together (instructions to the sub-session, a scope change, cancel). Do not move on to collecting.

## Step 2: Verify the report

The report is the sub-session's statement, not evidence:

```bash
git -C <wt> status --short            # must be clean
git log --oneline main..<branch>      # the commits in the report
git diff --stat main...<branch>
```

- If the working tree is dirty or the commits do not match the report, ask the sub-session.
- If the diff has out-of-scope files, `docs/` changes or anything in the brief's "Don't touch" area, show the user.
- If the project has review agents that look at a diff (`.claude/agents/`), a large task can be given to them (optional).

## Step 3: Bring into main (with approval)

Below, `main` is the project's main branch (if it has a different name, use that). Show the user the commit list and ask: "Shall I bring the n commits of PREFIX-N into main?" No merge without approval.

If the main checkout has uncommitted code changes, discuss that first. Then, for a linear history, first move the branch on top of main, then fast-forward:

```bash
git -C <wt> rebase main
git merge --ff-only <branch>
```

If the rebase conflicts:

- Generated files (schema, type, contract outputs): do not resolve by hand; take either side, run the generation command once the rebase is done, separate commit if anything changed.
- Lock file: take main's, reinstall dependencies once the rebase is done, separate commit if anything changed.
- Text files and code: resolve keeping both sides; if unsure, show the user.

The `.worktree/` in the worktree is not affected during the rebase (it is outside git).

## Step 4: Checks

In the main checkout, the project's check command (root `CLAUDE.md`; `/task-close` Step 1).

If it is red, do not close: say what broke; if the fix is small do it here, otherwise send it back to the sub-session (`SendMessage`).

## Step 5: Close the task

Apply the steps of `/task-close PREFIX-N`; use the items in the report as evidence for `## Acceptance`, but re-verify the ✓ items where needed (does the test name exist, does the command really pass). The ⏳ items in the report:

- Those that can only be tried in the main session (device, simulator, single-copy resource) can be tried now (ask the user), or the task is moved to `review`.
- "Questions asked" goes into the closing comment.

## Step 6: Findings and doc suggestions

- For each finding in the report apply `/task-open`: search first (if there is a match, write to that task), then show the user the title, tags and Acceptance and open it with approval. The findings can be listed in one message and opened with a single approval.
- Doc suggestions: as in `/task-close` Step 5; suggest, get approval, write.
- If "Impact on other areas" is filled in, `/task-close` Step 3.

All of these can go into a single `docs:` commit together with the task file; show the message, get approval.

## Step 7: Cleanup

Ask the user; if they approve:

- Archive the sub-session (`mcp__ccd_session_mgmt__archive_session`); the app cleans up its worktree itself.
- If the app did not clean it up: `git worktree remove <wt>` and `git branch -d <branch>` (if the branch was brought into main, `-d` is enough; do not use `-D`).

## Rules

- The report is a statement; the diff and the check output are evidence.
- Bringing into main and committing happen with the user's approval; no push.
- The worktree is not deleted before the findings are opened as tasks: the report goes away with the worktree.
