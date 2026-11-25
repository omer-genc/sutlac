---
id: SUT-1
title: Paketi npm'e ilk kez yayınla
status: todo
tags: []
priority: normal
sprint:
created: 2026-11-25
closed:
---

## Context
Paket Keskin monoreposundaki `docs-viewer`'dan ayrıldı; başka repolarda `bunx sutlac` ile kullanılabilmesi için npm'de olması gerekiyor. `sutlac` adının npm'de boş olup olmadığına bakılmadı.

## Acceptance
1. Boş bir klasörde `bunx sutlac init --prefix DNM` docs iskeletini kurar.
2. Aynı klasörde `bunx sutlac` arayüzü açar; Board, Backlog ve Ayarlar yüklenir.
3. `bunx sutlac skills` altı skill'i `.claude/skills/` altına kopyalar.

## To-do
- [ ] npm'de ad kontrolü (doluysa scope: `@<kullanıcı>/sutlac`)
- [ ] `bun publish` (prepublishOnly: typecheck + test + build)

## Notes
