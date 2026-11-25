---
name: task-dispatch
description: Use in the main session when several tasks should be handed out to parallel sub-sessions ("let's do these in parallel", "start PREFIX-A and PREFIX-B in separate sessions"). Checks whether the tasks touch each other, moves them to in-progress, and starts one session per task that runs /task-work in its own worktree.
argument-hint: "PREFIX-A PREFIX-B [PREFIX-C]"
---

# Hand tasks out to parallel sessions

> **Prefix and project info.** Below, `PREFIX-N` is a task number; the prefix is in `docs/config.json` > `prefix` (e.g. `KES` → `KES-12`, file `docs/tasks/KES-12.md`). In commands, write the real prefix in place of `PREFIX`. Everything project-specific (the check command, areas/apps, test accounts, the pitfalls of parallel work) is in the root `CLAUDE.md` and in `docs/knowledge/`; this skill reads it from there and does not assume it from memory.

This skill runs in the **main checkout** (outside a worktree); if `.git` is a file you are in a worktree, stop.

## Step 1: Read the tasks

For each `PREFIX-N`, read the file from start to finish: `## Bağlam` (context), `## Kabul` (acceptance criteria), `## Yapılacaklar` (to-dos), `## Notlar` (notes), `## Yorumlar` (comments). The gates are the same as `/task-start` Step 4:

- A task that is `todo` or already `in-progress` is handed out. A `review`, `blocked` or closed task is not; say why.
- If there is no Kabul section, or it is not observable, do not hand the task out: the sub-session cannot know what to collect evidence against. Write it with the user first.
- A task that needs a design decision and has not been discussed with the user (two readings lead to different work) is discussed here, or a design comment is written; the sub-session can ask the user, but that question splits the user between two windows.

In practice 2-3 tasks; if the project sets an upper limit (port slots, a shared resource), that applies.

## Step 2: Conflict check

Estimate from the code where the tasks will touch (design comment, the Notlar section, grep). Show the user a table: task → app → likely files.

Hot spots: if two tasks both touch one, queue one of them or tell the user the merge cost:

| File | Why |
| --- | --- |
| Lock file (`bun.lock`, `package-lock.json`...) | Two tasks adding dependencies; reinstall after merge. |
| Generated files (schema, type, contract outputs) | Not resolved by hand; the generation command is rerun after merge. |
| Translation/text files | Every screen writes to them; line conflicts are frequent, easy to resolve. |
| Shared components and helpers | One task's change breaks the other's screen. |
| Same module, same screen | Not done in parallel. |

If the project's own hot spots and parallel-work rules (ports, database copy, single-copy resources) are written in the root `CLAUDE.md` or in `docs/knowledge/`, read them and add them to the table.

Kabul items that cannot be tried in a sub-session (a single-copy device, a simulator, live data) stay ⏳ there and are tried in the main session after `/task-collect`. Tell the user this.

## Step 3: Prepare the main checkout

```bash
git status --short
```

The sub-session's worktree is created from the main checkout's **last commit**. If there are uncommitted code changes the sub-session does not see them: tell the user (commit them, or are they left out on purpose). `docs/` changes are not a problem; the sub-session reads the task file from the main checkout.

Claim the tasks: `status: in-progress`, as in `/task-start` Step 4 (reread the file before writing, then read it back). No commit needed.

## Step 4: Start the sessions

For two or more sessions, first `mcp__ccd_session__mark_chapter` ("Parallel: PREFIX-A, PREFIX-B"). One `start_session` per task:

- `initiation`: `user_asked` (the user asked for the hand-out), `context`: `fresh`, `use_worktree`: `true`.
- `model`: always give it explicitly; if omitted the sub-session takes the main session's model. Planning and decisions stay in the main session, the sub-session only does the task: if neither the user nor the project (`CLAUDE.md`) named a model, pick the one a tier cheaper than the main session's.
- `title`: `PREFIX-N · <task title, shortened>`.
- `prompt` (brief) with this template; in your own sentences, short:

```
/task-work PREFIX-N

Main checkout: <absolute path of the main checkout>
Task file: <main checkout>/docs/tasks/PREFIX-N.md (read it from there; the copy in the worktree may be stale)
Scope: <one sentence; not a summary of Kabul, the boundary>
Don't touch: <the areas of the other parallel tasks, from Step 2>
Note: <any decision discussed in the main session that is not in the task file>
```

If the `start_session` tool is not available (outside the desktop app), give the user the brief for each task; the user pastes it into a worktree session they open themselves (`claude --worktree`).

Before each session write one bold title line and one sentence (session rules). Do not say it started until the tool result says it started.

## Step 5: Wait and collect

Tell the user which session is on which task, with links, and stop; do not poll. The note that arrives when a session finishes is that session's report, not evidence: inspect the report and the branch with `/task-collect PREFIX-N`.

If a sub-session gets stuck (`Status: stuck`) or asks a question, answer that session with `SendMessage`; do not open a new session.

## Rules

- Runs in the main checkout; task status and comments are written only here.
- A task without Kabul is not handed out.
- Two tasks touching the same files are not handed out in parallel; if the user wants it knowingly, the merge cost is stated.
- No push; the sub-sessions' branches are brought into main with `/task-collect`.
