# Docs

This folder is a file-based issue tracker ([sutlac](https://www.npmjs.com/package/sutlac)): **tasks** (work to do) and **docs** (knowledge, decisions) are separate, and sprints are files too. There is no external tool; everything is md files in the repo.

| Where | What |
| --- | --- |
| `tasks/` | **Tasks**: `{{PREFIX}}-1.md`, `{{PREFIX}}-2.md`... A file's location never changes (see `tasks/README.md`) |
| `sprints/` | **Sprints**: `sprint-1.md`... Dates, goal, what was carried over at close (see `sprints/README.md`) |
| `knowledge/` | Doc: lasting shared knowledge (flows, environments, pitfalls) |
| `decisions/` | Doc: decisions made, in the form `0001-short-title.md`: context, decision, consequences |
| `images/` | Images used in the docs, in a single folder, named `<id>.<ext>` (see "Images" below) |
| `config.json` | UI name (`title`), task prefix (`prefix`: `{{PREFIX}}` → `{{PREFIX}}-12`), tags, statuses, priorities and the custom fields that can be added to tasks |

Every `.md` outside `tasks/` and `sprints/` is a doc; creating a new folder adds a new section to the doc tree.

## UI

`bunx sutlac` (default port 4400; `--port`, `--no-open`, `--dir <folder>`). If no folder is given, the first `docs/config.json` found going upward from the working folder is opened. `prefix` and `title` don't appear in Settings; they are changed in `config.json`. If the prefix changes, existing task files must be renamed by hand. Every change is written straight to the md file; when a file changes elsewhere, the page refreshes itself.

| Page | What |
| --- | --- |
| Board | The active sprint's tasks, in status columns; dragging a card writes `status` |
| Backlog | Open tasks not in the active sprint; "Add to sprint" writes `sprint: N` |
| All tasks | Every task, with status/tag/priority filters |
| Sprints | The sprint list and the sprint page (goal, tasks, carried over) |
| Archive | Closed tasks that have no sprint or whose sprint is closed (the file isn't moved, it is computed) |
| Docs | Folder tree on the left, page on the right |
| Settings | `config.json` editor |

Task and doc text is edited in the editor; on save, unchanged paragraphs, lists and tables stay as they are in the file, and only the edited block is rewritten. The "Source" button opens the whole file as plain text. Comments are written to the `## Yorumlar` (comments) section at the end of the file (format: `tasks/README.md`).

## Command line

```bash
bunx sutlac list          # open tasks, one task per line (--all, --tag <tag>, --json)
bunx sutlac next          # the next task number
bunx sutlac check         # whether paths and image links in the docs exist in the repo
```

## Images

All images sit in a single folder, under `images/`; there is no folder per doc, and a file is named by its id, not its original name: the id is the first 16 hex digits of the content's SHA-256 digest (`images/3f9a0c1d2e4b5a67.png`), and the same image added twice becomes a single file. The accepted types are PNG, JPEG, WebP and GIF (no SVG, because it can carry script), and the limit is 5 MB. A doc links to an image with standard markdown and a relative path: `![](../images/<id>.png)` inside `tasks/{{PREFIX}}-12.md`; this way the file also shows on GitHub and in plain text. In the UI, pasting or dragging and dropping an image into the editor or a comment writes the file to `images/` and inserts the link; the same name and path rule applies when adding by hand. An image that no longer has a link is not deleted automatically. `bunx sutlac check` catches broken image links.
