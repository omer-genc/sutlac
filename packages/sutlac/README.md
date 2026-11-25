# sütlaç

Turns the `docs/` folder in your repo into an issue tracker: every task, sprint and decision is a markdown file. A local UI (board, backlog, sprints, docs tree), a CLI and Claude Code skills. No runtime dependencies; it only needs [Bun](https://bun.sh).

```bash
bun add -d sutlac
bunx sutlac init --prefix KES --title "Project Docs"   # docs/ skeleton
bunx sutlac                                            # UI on :4400
```

| Command | What it does |
| --- | --- |
| `sutlac` | Opens the UI (`--port`, `--no-open`, `--dir <docs>`) |
| `sutlac init` | Creates the `docs/` skeleton (`--prefix`, `--title`, `--dir`) |
| `sutlac list` | Open tasks, one per line (`--all`, `--tag`, `--json`) |
| `sutlac next` | Next task number |
| `sutlac check` | Verifies that paths and image links mentioned in your docs exist in the repo |
| `sutlac skills` | Copies the skills and hooks into `.claude/` (`--no-hooks`, `--to`) |

The skills (`task-open`, `task-start`, `task-dispatch`, `task-work`, `task-collect`, `task-close`) cover a task's whole life: open, start, hand out to parallel worktree sessions, do, collect, close with evidence. They also install as a Claude Code plugin:

```
/plugin marketplace add omer-genc/sutlac
/plugin install sutlac@sutlac
```

Section headings inside task files (`## Bağlam` context, `## Kabul` acceptance criteria, `## Yorumlar` comments) are part of the file format and are Turkish.

More: https://sutlac.omergenc.net · https://github.com/omer-genc/sutlac
