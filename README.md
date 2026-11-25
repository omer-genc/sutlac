# sütlaç

Turns the `docs/` folder in your repo into an issue tracker: every task, sprint and decision is a markdown file. Sütlaç adds a local UI (board, backlog, sprints, docs tree), a CLI and Claude Code skills on top of that folder. No external service, no MCP.

## This repo

| Path | What |
| --- | --- |
| `packages/sutlac` | The package: CLI and server (`src/`), UI (React, bundled into `dist/` by `bun run build`), skills (`skills/`), hooks (`hooks/`), `sutlac init` templates (`templates/`). The same folder is the root of the Claude Code plugin (`.claude-plugin/plugin.json`) |
| `apps/site` | Landing site at https://sutlac.omergenc.net: plain HTML + CSS, static output via `bun build`, deployed to Cloudflare Workers static assets with `bun --filter @sutlac/site deploy` |
| `.claude-plugin/marketplace.json` | Makes this repo a plugin marketplace; the plugin points at `packages/sutlac` |
| `docs/` | This repo's own tasks (prefix `SUT`); the package is used on itself |

```bash
bun install
bun run docs          # UI against this repo's docs/ folder (dev mode, HMR)
bun run dev:site      # site on :4500
bun run check         # doc paths + typecheck + tests
bun run build         # package UI and site
```

## Using it in another repo

```bash
bun add -d sutlac
bunx sutlac init --prefix KES --title "Project Docs"   # docs/ skeleton
bunx sutlac                                            # UI on :4400
```

The package has no runtime dependencies; it only needs [Bun](https://bun.sh). To try an unpublished build locally: `bun add -d /absolute/path/to/sutlac/packages/sutlac` (run `bun run build` there first).

| Command | What it does |
| --- | --- |
| `sutlac` | Opens the UI (`--port`, `--no-open`, `--dir <docs>`) |
| `sutlac init` | Creates the `docs/` skeleton (`--prefix`, `--title`, `--dir`) |
| `sutlac list` | Open tasks, one per line (`--all`, `--tag`, `--json`) |
| `sutlac next` | Next task number |
| `sutlac check` | Verifies that paths and image links mentioned in your docs exist in the repo |
| `sutlac skills` | Copies the skills and hooks into `.claude/` (`--no-hooks`, `--to`) |

### Skills

Two ways to install them; don't use both (the skills would show up twice):

1. **Plugin** (recommended: one place to update, hooks come along). Skills are named `/sutlac:task-open` and so on:

   ```
   /plugin marketplace add omer-genc/sutlac
   /plugin install sutlac@sutlac
   ```

2. **Copy** (checked into your repo, editable per project; `/task-open`):

   ```bash
   bunx sutlac skills    # .claude/skills/, .claude/hooks/sutlac/, .claude/settings.json
   ```

| Skill | When |
| --- | --- |
| `task-open` | Open a task: searches existing tasks first and writes observable acceptance criteria |
| `task-start` | Start of a session: summarises open tasks and moves the chosen one to `in-progress` |
| `task-dispatch` | Hand out tasks that don't overlap to separate worktree sessions |
| `task-work` | In a sub-session: do one task and write `.worktree/report.md` |
| `task-collect` | Review the sub-session's branch, merge it with approval, file its findings as tasks |
| `task-close` | Close with evidence (`done` or `review`) and update decision and knowledge docs |

Upgrading from 0.1.x: the skills were renamed (`is-ac` → `task-open`, `is-baslat` → `task-start`, `is-dagit` → `task-dispatch`, `is-yap` → `task-work`, `is-topla` → `task-collect`, `is-kapat` → `task-close`) and the sub-session report moved to `.worktree/report.md`. If you copied the skills with `sutlac skills`, delete the old `.claude/skills/is-*` folders after copying again.

The skills assume nothing project-specific; they read the check command, commit style and parallel-work rules from the target repo's root `CLAUDE.md`. If the target repo has a `scripts/worktree-setup.sh`, it runs at the start of every worktree session (copying env files, picking ports and similar setup belongs there). The target repo's `.gitignore` should contain `.worktree/`.

> **Compatibility.** Files written before 0.3 with Turkish section headings (`## Yorumlar`, `## Devredilenler`, `- **Durum:**` …) are still read, and an existing `## Yorumlar` heading is kept when comments are added.

## Releasing

```bash
cd packages/sutlac && npm publish --access public     # prepublishOnly: typecheck + test + build
```

The plugin installs from the git repo, not from npm; bump the version in `packages/sutlac/package.json` and `packages/sutlac/.claude-plugin/plugin.json` together.
