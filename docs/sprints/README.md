# Sprints

Her sprint bu klasörde bir md dosyasıdır: `sprint-1.md`, `sprint-2.md`... Aynı anda en fazla bir sprint açıktır (`closed` boş). Sprintler arayüzde (`bunx sutlac`) Board'dan başlatılıp bitirilir; elle de yazılabilir.

```md
---
name: Ödeme akışı        # opsiyonel; görünen ad "Sprint 3 — Ödeme akışı"
start: 2026-01-15
end: 2026-01-29          # hedef bitiş
closed:                  # kapanış tarihi; boşsa aktif sprint
---

## Hedef
Bu sprintte neyi bitirmek istiyoruz.

## Devredilenler
- SUT-120 Devredilen işin başlığı
```

## Kurallar

- İş bir sprinte `docs/tasks/SUT-N.md` frontmatter'ındaki `sprint: N` ile bağlanır. Alan boşsa iş backlog'dadır.
- Board yalnız aktif sprintin işlerini gösterir. Backlog = aktif sprintte olmayan açık işler.
- Sprint bitince biten işler `sprint: N` ile sprintte kalır ve arşive geçer; bitmeyenlerin `sprint` alanı boşaltılır (backlog'a döner) ve sprint dosyasına `## Devredilenler` olarak yazılır.
- Arşiv hesaplanır, dosya taşınmaz: kapalı durumdaki iş, sprinti yoksa ya da sprinti kapanmışsa arşivdedir.
