# Docs

Bu klasör dosya tabanlı bir iş takibidir ([sutlac](https://www.npmjs.com/package/sutlac)): **işler** (yapılacaklar) ve **dokümanlar** (bilgi, karar) ayrıdır, sprintler de birer dosyadır. Dış bir araç yoktur; her şey repodaki md dosyalarıdır.

| Yer | Ne |
| --- | --- |
| `tasks/` | **İşler**: `{{PREFIX}}-1.md`, `{{PREFIX}}-2.md`... Dosyanın yeri hiç değişmez (bkz. `tasks/README.md`) |
| `sprints/` | **Sprintler**: `sprint-1.md`... Tarihler, hedef, kapanışta devredilenler (bkz. `sprints/README.md`) |
| `knowledge/` | Doküman: kalıcı ortak bilgi (akışlar, ortamlar, tuzaklar) |
| `decisions/` | Doküman: alınan kararlar, `0001-kisa-baslik.md` biçiminde: bağlam, karar, sonuçlar |
| `images/` | Belgelerdeki resimler, `<id>.<uzantı>` adıyla tek klasörde (bkz. aşağıda "Resimler") |
| `config.json` | Arayüz adı (`title`), iş öneki (`prefix`: `{{PREFIX}}` → `{{PREFIX}}-12`), etiketler, durumlar, öncelikler ve işlere eklenebilen özel alanlar |

`tasks/` ve `sprints/` dışındaki her `.md` bir dokümandır; yeni bir klasör açmak doküman ağacına yeni bir bölüm ekler.

## Arayüz

`bunx sutlac` (varsayılan port 4400; `--port`, `--no-open`, `--dir <klasör>`). Klasör verilmezse çalışılan klasörden yukarı doğru ilk `docs/config.json` açılır. `prefix` ve `title` Ayarlar'da görünmez, `config.json`'dan değişir; önek değişirse var olan iş dosyaları elle yeniden adlandırılmalıdır. Her değişiklik doğrudan md dosyasına yazılır; dosya başka yerde değişince sayfa kendini yeniler.

| Sayfa | Ne |
| --- | --- |
| Board | Aktif sprintin işleri, durum kolonlarında; kart sürüklemek `status`u yazar |
| Backlog | Aktif sprintte olmayan açık işler; "Sprinte al" `sprint: N` yazar |
| Tüm işler | Her iş, durum/etiket/öncelik süzgeçleriyle |
| Sprintler | Sprint listesi ve sprint sayfası (hedef, işler, devredilenler) |
| Arşiv | Kapanmış ve sprinti olmayan ya da sprinti kapanmış işler (dosya taşınmaz, hesaplanır) |
| Dokümanlar | Solda klasör ağacı, sağda sayfa |
| Ayarlar | `config.json` düzenleyicisi |

İş ve doküman metni editörde düzenlenir; kayıtta değişmeyen paragraf, liste ve tablolar dosyadaki halleriyle kalır, yalnız düzenlenen blok yeniden yazılır. "Kaynak" düğmesi dosyanın tamamını düz metin açar. Yorumlar dosyanın sonundaki `## Yorumlar` bölümüne yazılır (biçim: `tasks/README.md`).

## Komut satırı

```bash
bunx sutlac list          # açık işler, satır başına bir iş (--all, --tag <etiket>, --json)
bunx sutlac next          # sıradaki iş numarası
bunx sutlac check         # belgelerdeki yollar ve resim bağlantıları repoda mı
```

## Resimler

Bütün resimler tek klasörde, `images/` altında durur; belge başına klasör yoktur ve dosya orijinal adıyla değil id'siyle adlanır: id içeriğin SHA-256 özetinin ilk 16 hex hanesidir (`images/3f9a0c1d2e4b5a67.png`), aynı resim iki kez eklenirse tek dosya olur. Kabul edilen türler PNG, JPEG, WebP ve GIF'tir (SVG içinde betik taşıyabildiği için yok), sınır 5 MB'tır. Belge resme standart markdown ve göreli yolla bağlanır: `tasks/{{PREFIX}}-12.md` içinde `![](../images/<id>.png)`; böylece dosya GitHub'da ve düz metinde de görünür. Arayüzde editöre ya da yoruma resim yapıştırmak veya sürükleyip bırakmak dosyayı `images/`'e yazar ve bağlantıyı ekler; elle eklerken de aynı ad ve yol kuralı geçerlidir. Bağlantısı kalmayan resim kendiliğinden silinmez. `bunx sutlac check` kırık resim bağlantısını yakalar.
