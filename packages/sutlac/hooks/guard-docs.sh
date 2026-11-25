#!/usr/bin/env bash
# PreToolUse: worktree'deki (alt) oturum docs/ ve kök CLAUDE.md'ye yazamaz.
# İş durumu, yorum, yeni iş, bilgi ve karar ana oturumda güncellenir; alt oturum
# bunları .worktree/rapor.md'ye yazar. Ana kopyada hiçbir şeyi engellemez.
r="${CLAUDE_PROJECT_DIR:-}"
[ -n "$r" ] && [ -f "$r/.git" ] || exit 0 # worktree'de .git bir dosyadır; ana kopyada dizin
command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")
msg="Alt oturum (worktree) docs/ ve kök CLAUDE.md'ye yazmaz: iş durumu, yorum, yeni iş, bilgi ve karar ana oturumun işi. Bunu .worktree/rapor.md'ye yaz (Bulgular / Doküman önerileri)."

if [ "$tool" = "Bash" ]; then
  cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
  # Yalnız docs/'a ya da kök CLAUDE.md'ye yazan biçimler: yönlendirme, tee, sed/perl -i, mv/cp/rm, git mv/rm.
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
