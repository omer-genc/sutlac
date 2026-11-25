# sütlaç

Repodaki `docs/` klasörünü iş takibine çeviren paket (`packages/sutlac`) ve tanıtım sitesi (`apps/site`). Yapı ve kullanım: `README.md`.

```bash
bun run docs      # arayüz, bu reponun docs/ klasörüyle (HMR)
bun run check     # sutlac check + typecheck + test; iş kapatmadan önce yeşil olmalı
bun run build     # packages/sutlac/dist ve apps/site/dist
```

## Paket (`packages/sutlac`)

- Runtime Bun'dır; yayınlanan paketin `dependencies`'i yoktur. Arayüzün bütün bağımlılıkları `devDependencies`'tedir ve `build.ts` ile `dist/`e paketlenir. Sunucu tarafı kod (`src/cli.ts`, `src/server.ts`, `src/check.ts`, `src/docs.ts`...) yalnız `node:` ve `Bun` kullanır; oraya npm bağımlılığı eklenmez.
- İki giriş: `src/dev.ts` (HTML import + HMR; Tailwind eklentisi `bunfig.toml`'dan gelir, bu yüzden paket klasöründen çalışır) ve `src/cli.ts` (`dist/`i sunar; her klasörden çalışır).
- `skills/`, `hooks/` ve `templates/` hem npm paketiyle hem eklentiyle dağıtılır ve **başka repolarda** çalışır: içlerine bu repoya ya da belli bir projeye özgü yol, komut, ürün adı yazılmaz. Proje bilgisi hedef reponun `CLAUDE.md`'sinden okunur. Skill'lerde iş numarası `PREFIX-N` diye geçer.
- Şablonlarda `{{PREFIX}}` ve `{{DOCS}}` `sutlac init` sırasında doldurulur.
- `src/body.test.ts` ve `src/components/markdown/markdown.test.ts` bu reponun `docs/` klasöründeki her dosyayı editörden geçirir; `docs/`'a eklenen belge o testlerin girdisidir.
- Dil: arayüz, CLI çıktısı, skill'ler, hook mesajları, şablonlar, README'ler ve site İngilizce. Kod yorumları ve test adları Türkçe. `.md` dosya biçimi başlıkları da İngilizce yazılır (`## Context`, `## Acceptance`, `## To-do`, `## Notes`, `## Comments`, `## Carried over`, `## Goal`); 0.3 öncesinin Türkçe başlıkları (`## Yorumlar`, `## Devredilenler`, `**Durum:**`, `**Tarih:**`, `**Kaynak:**`) okunmaya devam eder ve var olan `## Yorumlar` başlığı yorum eklenince korunur (`src/body.ts`, `src/docs.ts`).

## İşler

Bu repo paketi kendi üstünde kullanır: işler `docs/tasks/SUT-N.md`, biçim `docs/tasks/README.md`. Commit: Conventional Commits, Türkçe; ilgili iş varsa mesajda `SUT-N`. Commit ve push yalnız kullanıcı isteyince.
