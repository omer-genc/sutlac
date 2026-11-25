# sütlaç

Turns the `docs/` folder in your repo into an issue tracker: every task, sprint and decision is a markdown file. Sütlaç adds a local UI (board, backlog, sprints, docs tree), a CLI and Claude Code skills on top of that folder. No external service, no MCP.

## This repo

| Path | What |
| --- | --- |
| `packages/sutlac` | The package: CLI and server (`src/`), UI (React, bundled into `dist/` by `bun run build`), skills (`skills/`), hooks (`hooks/`), `sutlac init` templates (`templates/`). The same folder is the root of the Claude Code plugin (`.claude-plugin/plugin.json`) |
| `apps/site` | Landing site: plain HTML + CSS, static output via `bun build` |
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

1. **Plugin** (recommended: one place to update, hooks come along). Skills are named `/sutlac:is-ac` and so on:

   ```
   /plugin marketplace add omer-genc/sutlac
   /plugin install sutlac@sutlac
   ```

2. **Copy** (checked into your repo, editable per project; `/is-ac`):

   ```bash
   bunx sutlac skills    # .claude/skills/, .claude/hooks/sutlac/, .claude/settings.json
   ```

| Skill | When |
| --- | --- |
| `is-ac` | Open a task: searches existing tasks first and writes observable acceptance criteria |
| `is-baslat` | Start of a session: summarises open tasks and moves the chosen one to `in-progress` |
| `is-dagit` | Hand out tasks that don't overlap to separate worktree sessions |
| `is-yap` | In a sub-session: do one task and write `.worktree/rapor.md` |
| `is-topla` | Review the sub-session's branch, merge it with approval, file its findings as tasks |
| `is-kapat` | Close with evidence (`done` or `review`) and update decision and knowledge docs |

The skills assume nothing project-specific; they read the check command, commit style and parallel-work rules from the target repo's root `CLAUDE.md`. If the target repo has a `scripts/worktree-setup.sh`, it runs at the start of every worktree session (copying env files, picking ports and similar setup belongs there). The target repo's `.gitignore` should contain `.worktree/`.

> **Language.** Everything is in English except the skill command names (`/is-ac` …) and the section headings inside task files: `## Bağlam` (context), `## Kabul` (acceptance criteria), `## Yapılacaklar` (to-dos), `## Notlar` (notes), `## Yorumlar` (comments). The UI parses those headings, so they are part of the file format.

## Releasing

```bash
cd packages/sutlac && npm publish --access public     # prepublishOnly: typecheck + test + build
```

The plugin installs from the git repo, not from npm; bump the version in `packages/sutlac/package.json` and `packages/sutlac/.claude-plugin/plugin.json` together.
