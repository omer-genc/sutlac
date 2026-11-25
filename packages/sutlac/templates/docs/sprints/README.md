# Sprints

Each sprint is an md file in this folder: `sprint-1.md`, `sprint-2.md`... At most one sprint is open at a time (`closed` empty). Sprints are started and finished in the UI (`bunx sutlac`) from the Board; they can also be written by hand.

```md
---
name: Payment flow       # optional; displayed name "Sprint 3 — Payment flow"
start: 2026-01-15
end: 2026-01-29          # target end
closed:                  # closing date; if empty, the active sprint
---

## Hedef
What we want to finish in this sprint.

## Devredilenler
- {{PREFIX}}-120 Title of the carried-over task
```

## Rules

- A task is tied to a sprint by `sprint: N` in the frontmatter of `{{DOCS}}/tasks/{{PREFIX}}-N.md`. If the field is empty, the task is in the backlog.
- The Board shows only the active sprint's tasks. Backlog = open tasks not in the active sprint.
- When a sprint ends, finished tasks stay in the sprint with `sprint: N` and move to the archive; the `sprint` field of unfinished ones is cleared (they return to the backlog) and they are written to the sprint file under `## Devredilenler` (carried over).
- The archive is computed, no file is moved: a task in a closed status is in the archive if it has no sprint or its sprint is closed.
