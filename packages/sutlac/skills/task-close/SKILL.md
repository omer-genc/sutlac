---
name: task-close
description: Use when a task is finished - runs the checks, audits the effect on other areas, moves the task file to done (or to review if acceptance still has to be tried in the real environment), writes the closing note as a comment, and updates the decision and knowledge docs. A task number can be given as the argument.
argument-hint: "[PREFIX-N]"
---

# Close the task

> **Prefix and project info.** Below, `PREFIX-N` is a task number; the prefix is in `docs/config.json` > `prefix` (e.g. `KES` → `KES-12`, file `docs/tasks/KES-12.md`). In commands, write the real prefix in place of `PREFIX`. Everything project-specific (the check command, areas/apps, test accounts, the pitfalls of parallel work) is in the root `CLAUDE.md` and in `docs/knowledge/`; this skill reads it from there and does not assume it from memory.

Closes a task and makes what was learned permanent. Format and rules: `docs/tasks/README.md`.

## Step 0: Identify the task

If `$ARGUMENTS` contains a `PREFIX-N`, use it. Otherwise find the ones in progress and in review with `grep -l '^status: \(in-progress\|review\)' docs/tasks/PREFIX-*.md`: if there is exactly one, assume it and continue **while saying so**; if there is more than one, ask; if there is none, ask for a number.

Read the file from top to bottom: `## Bağlam` (context), `## Kabul` (acceptance criteria), `## Yapılacaklar` (to-dos), `## Notlar` (notes) and, if present, `## Yorumlar` (comments). A later comment that contradicts the body (narrowing the scope, changing a criterion) replaces the body.

## Step 1: Verify what was done

**Don't close without evidence.**

```bash
git status --short
git log --oneline -5
```

If the working tree is dirty, ask: will it be committed, or is the task really not finished?

Run the project's check command and **look at the output**. The command is written in the root `CLAUDE.md` (typically a single command that runs typecheck + lint + test together, e.g. `bun run check`); if it isn't, find it in the `package.json` scripts and tell the user which one you ran. In a project with generated files (schema, types, contract), having run the generation command is also part of this step.

If the checks don't pass, don't close the task; state the situation and stop.

## Step 2: Is anything blocking the close

- **Kabul:** Show evidence for each item: the test that verifies it, command output, request/response or what was seen in the browser. "The code does this" is not evidence. An item that can't be proven is either proven, or changed together with the user, or the reason it couldn't be proven is written in the closing note (with the user's approval), or the task is moved to `review` (Step 4). No ticking without evidence. Try the items that have no evidence and can be tried locally now (run the app, send the request, look at the screen; if the project has a skill for this, use it) and write what you saw as evidence.
- **Scope:** If the task changed more than one area or brought a new screen, table or flow, give the task file and the diff to a sub-agent (to the project's critique agent, if it has one): was Kabul really met, is there a piece left that nobody will use? Show the verdict to the user; if there is a "blocker" finding, don't close before the user decides. If the user accepts the finding and closes anyway, write that in the closing note.
- **Yapılacaklar:** If there is an unticked checkbox, either satisfy it or remove it together with the user. Don't close with an unmet item.
- **Yorumlar:** If there is an unanswered question in `## Yorumlar` (a question was asked, no answer below it), don't close. If you know the answer, write it as a comment; if you don't, ask the user. Don't answer it out of your own head and move on.

## Step 3: Other areas

In a single-part project this step is skipped. If there is more than one app or package: did the work change something another one uses (an endpoint, a response field, an exported function, a behaviour)? If this check is skipped, the other side silently falls behind.

Gather evidence first, don't guess:

- If types are shared, a typecheck from the root shows the places that break (it already ran in Step 1). Typecheck doesn't see behaviour changes where the type doesn't change; search for the call sites:

  ```bash
  grep -rn "<distinctive fragment of the endpoint or function>" <source folders of the other areas>
  ```

  If the output is empty, that area doesn't use it. Singular/plural and the trailing slash vary in names; search with the distinctive fragment, not the full path.

If an area is affected, **the default is to do the adaptation in the same task.** Show the finding to the user and ask:

```
This change affects mobile: src/hooks/use-order.ts:42 calls this endpoint.
Shall we do the adaptation now, or should I open a separate task?
```

If a separate task is wanted, open it by the rules of `/task-open` (search first; if there is a match, not a new task but a dated line in that task's `## Notlar`). What is specific to a notice task:

- `tags` is the target area; the source task goes in the first line: `Source: PREFIX-N`.
- `## Bağlam` answers three questions: **what changed** (what was there before, what is there now; with the real endpoint and field names), **why it matters**, **what should be done**. The `file:line` grep found goes into `## Notlar` as a dated line, not into Bağlam; it can go stale.
- `## Kabul` is the behaviour to be observed in the target area: "Order detail lists the line items with the new `items[]` shape".

If the change doesn't concern another area, say so in one sentence in the closing note.

## Step 4: Close the task or move it to review

**What `review` means:** the code is finished and committed, the checks are green (Step 1); what is missing is trying one or more Kabul items in the real environment (in the app, on live data) or the user's approval. If the checks are red, or there is an unmet checkbox in Yapılacaklar or an unanswered question, the task doesn't go to `review` either; it stays in `in-progress`.

- If every Kabul item has evidence (or its unprovability was written in the note with the user's approval): `done`.
- If an item can only be proven by trying it in the real environment and it hasn't been tried yet: `review`. Tell the user which item is left and why.

1. Make the completed checkboxes in Yapılacaklar `- [x]`.
2. Frontmatter: for `done`, `status: done`, `closed: <date +%F>` (get the date from the command, don't make it up); for `review`, `status: review`, `closed` stays empty.
3. Add the closing note **as a comment** to the `## Yorumlar` section at the very end of the file; if the section doesn't exist, create it. The body is the definition of the task, the comment is the record of what happened.

```md
## Yorumlar

### 2026-10-24 21:30

**What changed:** two or three sentences; what changed, why this route was chosen. Effect on other areas: none / PREFIX-N opened / adapted in the same task.

**Acceptance:**
1. ✓ `order.service.test.ts` "branch scope" test
2. ✓ `GET /api/v1/orders/123` → 403 (local, branch account)
3. ✗ Push notification: couldn't be tried without a live device; closed with the user's approval.

Commit: `abc1234` feat(...): ...
```

If the direction diverged from the body (the task was solved another way, or the scope narrowed), say that in the note too; the body is not changed.

For a task moved to `review` the note has the same format; an item waiting to be tried is marked with `⏳` and how to try it is written: `3. ⏳ Order card: with the demo account, the shipping row shows in the order detail (not tried on a device)`. If the user tries it and drags it to `done` on the board, that is the approval; the UI writes `closed` itself. If the trial turns up a problem, the task goes back to `in-progress` and the finding is added as a comment. If the user asks, `/task-close PREFIX-N` is run again: the `⏳` items are proven, the task becomes `done` and the evidence is added in a second comment.

- The comment heading is only the time: `date '+%F %H:%M'`. No author is kept.
- The comment text uses no `## ` heading and no line of the form `### <date time>`; the UI splits comments on these headings.
- `## Yorumlar` is always the last section. When adding a line to `## Notlar`, add it before that.

If the task is a notice task being closed because it doesn't concern the other area (its Bağlam has `Source: PREFIX-N` or `### Kaynak`), no code check is needed; the note becomes `**Outcome:** Not affected. <why, in one sentence>`.

A task that is abandoned rather than closed becomes `cancelled`, not `done`; the reason is written in `## Notlar`.

## Step 5: Decision and knowledge

Go through them in order; if you know the answer, propose it and get it approved.

- **Was a lasting decision made?** If the sentence "we did this that way because of this" can be formed, open `docs/decisions/NNNN-short-title.md` (next number: `ls docs/decisions | tail -1`). The format is the same as the existing decisions: `# NNNN · Title`, `- **Tarih:**` (date), `- **Durum:** kabul` (status: accepted), `- **İlgili:** PREFIX-N` (related), followed by `## Bağlam`, `## Karar` (decision), `## Sonuçlar` (consequences). A rule that concerns only a single subfolder, where that folder has its own `CLAUDE.md`, is written there.
- **Has knowledge gone stale?** If the task touched a flow described by a page in `docs/knowledge/` or by `CLAUDE.md`, update that page. Don't rewrite it from scratch; change only the stale part. `bunx sutlac check` catches stale paths in the docs.

## Step 6: Commit and summary

The task file (and any opened task, decision or knowledge changes) goes into the same commit if the work hasn't been committed yet; if it has, it becomes a separate `docs:` commit. Show the message and get approval before committing.

The summary is three lines: whether the task closed (or what is waiting to be tried in `review`), which checks ran, which doc was opened or updated. Don't ask what's next; `/task-start` is there for that.

## Rules

- No close if the checks aren't green (except a notice task that doesn't concern the area).
- No close if there is an unmet criterion, a Kabul item without evidence or an unanswered question. If the only thing left is an item waiting to be tried in the real environment, the task becomes `review`, not `done`.
- Don't open a task without approval and without a search (`/task-open`).
- The closing note is a comment; it is not written in the body.
- If decisions and knowledge aren't updated here, they are never updated; don't skip Step 5.
