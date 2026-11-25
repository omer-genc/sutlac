#!/usr/bin/env bash
# PreToolUse: a session in a worktree (sub-session) cannot write to docs/ or the root CLAUDE.md.
# Task status, comments, new tasks, knowledge and decisions are updated in the main session; the
# sub-session writes them to .worktree/report.md. Blocks nothing in the main checkout.
r="${CLAUDE_PROJECT_DIR:-}"
[ -n "$r" ] && [ -f "$r/.git" ] || exit 0 # in a worktree .git is a file; in the main checkout a directory
command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")
msg="A sub-session (worktree) does not write to docs/ or the root CLAUDE.md: task status, comments, new tasks, knowledge and decisions belong to the main session. Write this to .worktree/report.md instead (Findings / Doc suggestions)."

if [ "$tool" = "Bash" ]; then
  cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
  # Only the forms that write to docs/ or the root CLAUDE.md: redirection, tee, sed/perl -i, mv/cp/rm, git mv/rm.
  target='[^|;&]*((^|[ /"'"'"'])docs/|(^|[ "'"'"'])(\./)?CLAUDE\.md)'
  if grep -Eq "(>>?|tee( -a)?)[[:space:]]*[^|;&[:space:]]*docs/|(sed|perl)[[:space:]]+-[a-zA-Z]*i$target|(^|[;&|[:space:]])(mv|cp|rm|touch)[[:space:]]$target|git[[:space:]]+(mv|rm)[[:space:]]$target" <<<"$cmd"; then
    echo "$msg" >&2
    exit 2
  fi
  exit 0
fi

f=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
case "$f" in
  "$r"/docs/* | "$r"/CLAUDE.md)
    echo "$msg" >&2
    exit 2
    ;;
esac
exit 0
