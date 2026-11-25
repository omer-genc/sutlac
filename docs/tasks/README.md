# Tasks

Each task is a single md file in this folder: `SUT-1.md`, `SUT-2.md`... The folder is used like a small database; which area a task concerns is written as a tag in the `tags` field (it can stay untagged: `tags: []`), the status is in the `status` field, its sprint is in the `sprint` field. There are no subfolders; a finished or archived task stays in place too, so `SUT-N` links don't break. No file other than tasks sits in this folder (docs go in `knowledge/`, `decisions/`).

## New task

Numbering is a single sequence, not split by tag. The next number:

```bash
bunx sutlac next
```

In code, commits and PRs a task is referred to as `SUT-12`.

## Template

```md
---
id: SUT-12
title: A sentence that describes the behaviour
status: todo          # docs/config.json > statuses
tags: []              # docs/config.json > tags
priority: normal      # docs/config.json > priorities
sprint: 3             # empty: backlog (see docs/sprints/README.md)
created: 2026-01-15
closed:
---

## Bağlam
Why it is needed, who asked for it. For a bug, the reproduction steps.

## Kabul
1. A behaviour claim that can be called true/false without reading the code.

## Yapılacaklar
- [ ] ...

## Notlar
- 2026-01-15: What changed / why it matters / what to do.
```

Valid values (tags, statuses, priorities) and the custom fields that can be added to tasks are in `docs/config.json`; they can also be edited in the UI under Settings. Statuses that count as closed (`closed: true`) require a closing date. A custom field is added to the frontmatter as `key: value`.

## Comments

Comments are in the `## Yorumlar` (comments) section at the very end of the file; each comment starts with a `### date time` heading (no author is kept). The UI shows this section separately from the editor; it can also be added by hand:

```md
## Yorumlar

### 2026-01-15 21:30

Comment text (markdown). It uses no `## ` heading and no line of the form `### <date time>`.
```

`## Notlar` (notes) is for notices to other areas (the rule below); a comment is free conversation.

## Queries

```bash
bunx sutlac list                                                  # open tasks: task|status|priority|tags|sprint|title|comments|last comment
bunx sutlac list --tag api                                        # a tag's open tasks
grep -l '^status: review' docs/tasks/SUT-*.md          # waiting to be tried
grep -H '^title:' docs/tasks/SUT-*.md                  # title list
grep -l '^sprint: 3$' docs/tasks/SUT-*.md              # tasks in Sprint 3
```

## Rules

- Before opening a task, existing tasks are searched; if there is a match, no new task is opened and the evidence is added there. `## Bağlam` (context) and `## Kabul` (acceptance criteria) describe the behaviour in product language; file paths and symbol names go stale and stay in `## Notlar` or in a comment. Details: `/is-ac`.
- The Kabul section is a numbered list (not checkboxes); at closing each item is marked with evidence (`/is-kapat`).
- A note that affects another area (app, package) answers three questions: **what changed**, **why it matters**, **what needs to be done**. "Not affected" is a valid answer; it is written in the note and that is that.
- Status flow: `todo` → `in-progress` → `review` → `done`. `review`: the code is finished and committed, the checks are green; Kabul still has to be tried in the real environment or is waiting for the user's approval. Once the user has tried it they drag it to `done` on the board; if a problem turns up, the task goes back to `in-progress`. `/is-kapat` applies the rule.
- When a task is finished, `status: done` and the `closed` date are written (the UI writes the closing date itself). Lasting knowledge goes to `docs/knowledge/`, a decision made goes to `docs/decisions/`.
