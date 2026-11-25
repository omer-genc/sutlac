# sütlaç

Repodaki `docs/` klasörünü iş takibine çevirir: her iş, sprint ve karar bir markdown dosyasıdır. Yerel arayüz (board, backlog, sprintler, doküman ağacı), komut satırı ve Claude Code skill'leri. Çalışma anında bağımlılık yok; yalnız [Bun](https://bun.sh) gerekir.

```bash
bun add -d sutlac
bunx sutlac init --prefix KES --title "Proje Docs"   # docs/ iskeleti
bunx sutlac                                          # arayüz, :4400
```

| Komut | Ne yapar |
| --- | --- |
| `sutlac` | Arayüzü açar (`--port`, `--no-open`, `--dir <docs>`) |
| `sutlac init` | `docs/` iskeletini kurar (`--prefix`, `--title`, `--dir`) |
| `sutlac list` | Açık işler, satır başına bir iş (`--all`, `--tag`, `--json`) |
| `sutlac next` | Sıradaki iş numarası |
| `sutlac check` | Belgelerdeki yollar ve resim bağlantıları repoda mı |
| `sutlac skills` | Skill ve hook'ları `.claude/` altına kopyalar (`--no-hooks`, `--to`) |

Skill'ler (`is-ac`, `is-baslat`, `is-dagit`, `is-yap`, `is-topla`, `is-kapat`) Claude Code eklentisi olarak da kurulur:

```
/plugin marketplace add omer-genc/sutlac
/plugin install sutlac@sutlac
```

Ayrıntı: https://github.com/omer-genc/sutlac
