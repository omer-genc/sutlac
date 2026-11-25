#!/usr/bin/env bash
# SessionStart: oturum bir git worktree'deyse (alt oturum) kurallarını hatırlatır ve
# projenin kendi worktree kurulumu varsa (scripts/worktree-setup.sh) çalıştırır.
# Ana kopyada sessizce çıkar.
r="${CLAUDE_PROJECT_DIR:-$(pwd)}"
[ -f "$r/.git" ] || exit 0 # worktree'de .git bir dosyadır; ana kopyada dizin
cd "$r" || exit 0

main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)")
[ -d "$main/docs" ] || exit 0 # sutlac kullanmayan repo

mkdir -p .worktree
setup_out=""
if [ -f scripts/worktree-setup.sh ]; then
  if ! setup_out=$(bash scripts/worktree-setup.sh 2>&1); then
    echo "Worktree kurulumu başarısız (bash scripts/worktree-setup.sh):"
    echo "$setup_out"
  fi
fi

cat <<EOT
Bu oturum bir worktree'de çalışıyor: alt oturum.
- Ana kopya: $main. İş dosyalarını oradan oku: $main/docs/tasks/ (worktree'deki kopya eski olabilir).
- docs/ ve kök CLAUDE.md'ye yazılmaz (hook engeller); iş durumu, yorum, yeni iş ana oturumun işi. Bulduğun hata ve doküman önerisi .worktree/rapor.md'ye.
- İş akışı: /is-yap <iş numarası>.
$setup_out
EOT
exit 0
