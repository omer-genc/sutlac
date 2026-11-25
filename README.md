# sütlaç

Repodaki `docs/` klasörünü iş takibine çevirir: her iş, sprint ve karar bir markdown dosyasıdır. Sütlaç bu klasöre yerel bir arayüz (board, backlog, sprintler, doküman ağacı), bir komut satırı ve Claude Code skill'leri ekler. Dış araç ya da MCP yoktur.

## Bu repo

| Yer | Ne |
| --- | --- |
| `packages/sutlac` | Paketin kendisi: komut satırı ve sunucu (`src/`), arayüz (React, `bun run build` ile `dist/`e paketlenir), skill'ler (`skills/`), hook'lar (`hooks/`), `sutlac init` şablonları (`templates/`). Aynı klasör Claude Code eklentisinin de köküdür (`.claude-plugin/plugin.json`) |
| `apps/site` | Tanıtım sitesi: düz HTML + CSS, `bun build` ile statik çıktı |
| `.claude-plugin/marketplace.json` | Bu repoyu eklenti pazarı yapar; eklenti `packages/sutlac`'ı gösterir |
| `docs/` | Bu reponun kendi işleri (önek `SUT`); paket kendi üstünde kullanılır |

```bash
bun install
bun run docs          # arayüz, bu reponun docs/ klasörüyle (geliştirme kipi, HMR)
bun run dev:site      # site, :4500
bun run check         # belge yolları + typecheck + test
bun run build         # paketin arayüzü ve site
```

## Başka bir repoda kullanmak

```bash
bun add -d sutlac
bunx sutlac init --prefix KES --title "Keskin Docs"   # docs/ iskeleti
bunx sutlac                                           # arayüz, :4400
```

Paket çalışma anında bağımlılık istemez; yalnız [Bun](https://bun.sh) gerekir. Yayınlanmadan önce yerelde denemek için: `bun add -d /mutlak/yol/sutlac/packages/sutlac` (önce orada `bun run build`).

### Skill'ler

İki yol; ikisi birlikte kullanılmaz (skill'ler iki kez görünür):

1. **Eklenti** (önerilen; güncelleme tek yerden, hook'lar kendiliğinden gelir). Skill'ler `/sutlac:is-ac` biçiminde adlanır:

   ```
   /plugin marketplace add <github-kullanıcı>/sutlac
   /plugin install sutlac@sutlac
   ```

2. **Kopya** (repoya girer, projeye göre düzenlenebilir; `/is-ac`):

   ```bash
   bunx sutlac skills    # .claude/skills/, .claude/hooks/sutlac/, .claude/settings.json
   ```

| Skill | Ne zaman |
| --- | --- |
| `is-ac` | Yeni iş: önce arar, eşleşme varsa açmaz; gözlenebilir Kabul maddeleriyle yazar |
| `is-baslat` | Oturum başı: açık işleri özetler, seçileni `in-progress`'e alır |
| `is-dagit` | Birbirine dokunmayan işleri ayrı worktree oturumlarına dağıtır |
| `is-yap` | Alt oturumda tek işi yapar, `.worktree/rapor.md` yazar |
| `is-topla` | Alt oturumun dalını denetler, onayla ana dala alır, bulguları iş olarak açar |
| `is-kapat` | Kanıtla kapatır (`done` ya da `review`), karar ve bilgi dokümanlarını günceller |

Skill'ler projeye özgü hiçbir şeyi varsaymaz; kontrol komutunu, commit biçimini ve paralel çalışma kurallarını hedef reponun kök `CLAUDE.md`'sinden okur. Worktree'de açılan oturum için hedef repoda `scripts/worktree-setup.sh` varsa oturum başında çalıştırılır (env kopyalama, port seçimi gibi projeye özgü kurulum oraya yazılır). Hedef reponun `.gitignore`'unda `.worktree/` olmalı.

## Yayın

```bash
cd packages/sutlac && bun publish     # prepublishOnly: typecheck + test + build
```

Eklenti git reposundan kurulur, npm'den değil; sürüm `packages/sutlac/package.json` ve `packages/sutlac/.claude-plugin/plugin.json`'da birlikte artar.
