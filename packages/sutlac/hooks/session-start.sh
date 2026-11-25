#!/usr/bin/env bash
# SessionStart: if the session is in a git worktree (sub-session), reminds it of its rules and
# runs the project's own worktree setup if there is one (scripts/worktree-setup.sh).
# Exits silently in the main checkout.
r="${CLAUDE_PROJECT_DIR:-$(pwd)}"
[ -f "$r/.git" ] || exit 0 # in a worktree .git is a file; in the main checkout a directory
cd "$r" || exit 0

main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)")
[ -d "$main/docs" ] || exit 0 # a repo that does not use sutlac

mkdir -p .worktree
setup_out=""
if [ -f scripts/worktree-setup.sh ]; then
  if ! setup_out=$(bash scripts/worktree-setup.sh 2>&1); then
    echo "Worktree setup failed (bash scripts/worktree-setup.sh):"
    echo "$setup_out"
  fi
fi

cat <<EOT
This session runs in a worktree: it is a sub-session.
- Main checkout: $main. Read task files from there: $main/docs/tasks/ (the copy in the worktree may be stale).
- Do not write to docs/ or the root CLAUDE.md (the hook blocks it); task status, comments, new tasks, knowledge and decisions belong to the main session. Put findings and doc suggestions in .worktree/rapor.md (Findings / Doc suggestions).
- Workflow: /is-yap <task number>.
$setup_out
EOT
exit 0
