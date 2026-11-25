---
name: task-start
description: Use at the start of a session or when asked "where were we / what's next" - summarizes the open tasks in docs/tasks/ as active sprint and backlog, shows which ones have comments, and moves the chosen task to in-progress. A tag or a task number can be given as the argument.
argument-hint: "[tag | PREFIX-N]"
---

# Start work

> **Prefix and project info.** Below, `PREFIX-N` is a task number; the prefix is in `docs/config.json` > `prefix` (e.g. `KES` → `KES-12`, file `docs/tasks/KES-12.md`). In commands, write the real prefix in place of `PREFIX`. Everything project-specific (the check command, areas/apps, test accounts, the pitfalls of parallel work) is in the root `CLAUDE.md` and in `docs/knowledge/`; this skill reads it from there and does not assume it from memory.

Answers "where were we" in one step. Changes no file during the reading phase; the only write is claiming a task after the user picks one (Step 4).

Format and rules: `docs/tasks/README.md`, `docs/sprints/README.md`. Valid statuses, tags and priorities are in `docs/config.json`; read them from there, don't write them from memory.

## Step 1: Scope

- If `$ARGUMENTS` is a `PREFIX-N`, go straight to Step 4.
- If it is a tag from `docs/config.json` > `tags`, show only the tasks that have it in their `tags` (`--tag`).
- If it is empty, show everything. Don't ask the user "which area?".

## Step 2: Read

One command gives the open tasks (those in a status that doesn't count as closed) and the active sprint; don't open the files one by one:

```bash
bunx sutlac list            # --tag <tag> · --json
```

The output is one task per line: `task|status|priority|tags|sprint|title|comments|last comment`. The first line is the active sprint (the `docs/sprints/sprint-N.md` whose `closed` field is empty); if there is none, every open task is in the backlog. A task whose `sprint` field is the active sprint's number is in the sprint, one whose field is empty is in the backlog.

If the command is missing (the package isn't installed), the same information is read from the files: `grep -H -e '^status:' -e '^title:' -e '^tags:' -e '^sprint:' -e '^priority:' docs/tasks/PREFIX-*.md`.

## Step 3: Print the summary

Keep it short, don't print the task text: number, priority, tag and title are enough.

```
## Open tasks (Sprint 3 — Payment flow)

### In progress
- PREFIX-120 · mobile · Order status is shown wrong

### In review (waiting to be tried)
- PREFIX-1 · mobile · Move mobile to the current API contract

### Blocked
- PREFIX-87 · api · Daily cache for list endpoints

### In the sprint, up next
- PREFIX-146 · high · mobile · Order detail doesn't list the line items
  💬 2 comments, last: 2026-01-15 21:30

### Backlog (14)
- high: PREFIX-2 · mobile, api · No notification is sent after payment
- api: 9 · mobile: 3 · web: 1
```

- First `in-progress`, then `review`, then `blocked`, then the active sprint's `todo` tasks; `high` first in each group. A `review` task is finished on the code side; it appears in the list because it is waiting for the user to try it. Sprint or backlog makes no difference: every task in `review` is written in this group.
- In the backlog, write out only the `high` ones individually and give the count of the rest per tag. List all of them if the user asks.
- For a task with comments, show the comment count and the time of the last comment (the `### date time` heading). Don't summarize or answer the comment; show that it exists, the user opens it if interested.
- If there are no open tasks, say so.

Then ask a single question: which one do we start with?

## Step 4: Claim the chosen task

When the user picks a task (or says "let's start PREFIX-N" directly, without `/task-start`), read the file **from top to bottom**: `## Bağlam` (context), `## Kabul` (acceptance criteria), `## Yapılacaklar` (to-dos), `## Notlar` (notes) and `## Yorumlar` (comments). The comments matter as much as the body; a later comment that contradicts the body replaces the body. Also open the `PREFIX-N`s mentioned in Bağlam.

**Gates**, before writing:

- If `status` is not `todo`, don't touch it. If it is already `in-progress`, continue. If it is `review`, show the `⏳` items in the last closing comment and ask: will the user try it, or is there a problem? If there is a problem and it will be fixed, change `status: review` → `in-progress` and add the finding as a dated comment. If it is `blocked`, ask whether the blocker has been lifted; don't change it yourself. If it is closed, say so and stop.
- Don't pull a task opened for exploration like "let's take a look at this first"; the transition is the record of the decision to start the work.

Claiming means setting the status to `in-progress`. Read the file again right before writing it (another session may have changed it), then:

```bash
# With the Edit tool, `status: todo` → `status: in-progress`, then read back what was written:
grep '^status:' docs/tasks/PREFIX-N.md
```

- Don't touch the body, the `sprint` field or any other field.
- If this transition isn't made, `/task-close` can't find which task is open.

## Step 5: Dig and explain

**The task is a proposal, not a decision.** The solution direction written in the body can change, be rejected or be implemented as is, together with the user in this session.

Read the code and the `git log` of the relevant area, and look at the root `CLAUDE.md` (and the subfolder's own `CLAUDE.md`, if there is one) and the relevant page in `docs/knowledge/`. Then, **before asking anything**, give a short summary (`/task-open` > Asking questions): the situation, what you found, what you plan to do, the open questions. If there is no open question, say so and don't ask.

- **If there is a design comment** (`**Design — <date>**`, `/task-open` > Step 5), it is the design agreed on, together with the user's answers; don't ask the same questions again. But it was written against that day's code: if the code still matches, it holds; name the point that doesn't match and reopen only that. Don't throw away the whole design over one stale paragraph, and don't follow it silently either.
- **If there is no Kabul or it isn't observable**, write it with the user before starting; `/task-close` asks for evidence against it.

If the work can't proceed because of tooling (broken build, no access to the DB), try once; if it still fails, put the task you claimed back as you found it (`status: todo`), say why and stop. An `in-progress` left behind a dead session is invisible to both sides.

## Rules

- Opening and closing tasks is not this skill's job: opening is `/task-open`, closing is `/task-close`.
