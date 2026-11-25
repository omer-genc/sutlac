---
name: is-yap
description: Alt oturumda (worktree'de), ana oturumun /is-dagit ile verdiği tek bir işi yapmak için kullan. İşi ana kopyadan okur, kendi dalında geliştirir, dener, kontrolleri çalıştırır, commit atar ve sonucu, kanıtları ve bulunan hataları .worktree/rapor.md'ye yazar. docs/'a dokunmaz.
argument-hint: "ÖNEK-N"
---

# Alt oturumda işi yap

> **Önek ve proje bilgisi.** Aşağıda `ÖNEK-N` bir iş numarasıdır; önek `docs/config.json` > `prefix` alanındadır (ör. `KES` → `KES-12`, dosyası `docs/tasks/KES-12.md`). Komutlarda `ÖNEK` yerine gerçek öneki yaz. Projeye özgü her şey (kontrol komutu, alanlar/uygulamalar, deneme hesapları, paralel çalışmanın tuzakları) kök `CLAUDE.md`'de ve `docs/knowledge/`'tadır; bu skill onları oradan okur, ezbere varsaymaz.

## Adım 0: Yer

```bash
git rev-parse --path-format=absolute --git-common-dir   # ana kopya = bunun üst klasörü
git branch --show-current
```

`.git` bir dizinse ana kopyadasın: dur, bu skill ana kopyada çalışmaz (ana kopyada `/is-baslat`). Dal adı projenin ana dalıysa (`main`) dur: alt oturum kendi dalında çalışır.

Projenin worktree kurulumu varsa (`scripts/worktree-setup.sh`; oturum başında hook çalıştırır) çıktısındaki port ve veri bilgisini kullan. Rapor için `.worktree/` klasörü olmalı (`mkdir -p .worktree`; git'e girmez).

## Adım 1: İşi oku

İş dosyasını **ana kopyadan** oku: `<ana kopya>/docs/tasks/ÖNEK-N.md` (worktree'deki kopya dağıtımdan önceki commit'tedir; durum ve son yorumlar ana kopyada). Baştan sona: Bağlam, Kabul, Yapılacaklar, Notlar, Yorumlar; tasarım yorumu varsa o üzerinde anlaşılmış tasarımdır. Brief'teki "Kapsam" ve "Dokunma" satırları sınırdır.

Kök `CLAUDE.md`'yi ve değiştireceğin alt klasörün kendi `CLAUDE.md`'si varsa onu oku.

Brief ile iş dosyası çelişiyorsa ya da tasarım kararı gerekiyorsa: kullanıcıya bu oturumda sor (`AskUserQuestion`); cevabı rapordaki "Sorulanlar"a yaz. Ana oturumun dosyalarına yazma.

## Adım 2: Geliştir

- Kapsam dışına çıkma. Yolda bulunan hata ya da iyileştirme **düzeltilmez**, rapordaki "Bulgular"a yazılır (Adım 4). Tek istisna: işi engelleyen hata; o zaman düzelt ve raporda ayrıca söyle.
- `docs/` ve kök `CLAUDE.md` yazılmaz (hook engeller). Alt klasörün kendi `CLAUDE.md`'si kodla birlikte değişmesi gerekiyorsa değiştirilir ve raporda söylenir.
- Üretilen dosyası olan bir şey değiştiyse (şema, tip, sözleşme) üretim komutunu çalıştır; çıktılar aynı commit'e girer.
- Bağımlılık eklemek kilit dosyasını değiştirir; gerekli değilse ekleme, gerekliyse raporda söyle (merge'de çakışabilir).

## Adım 3: Dene ve kontrol et

- Dev sunucusu ve önizleme yalnız bu worktree'nin kendi portlarıyla; ana kopyanın çalışan sunucusuna, veritabanına ve dosyalarına yazma. Projenin paralel çalışma kuralları (port, veri kopyası, ortak ve uzak kaynaklar, deneme hesapları) kök `CLAUDE.md`'de ya da `docs/knowledge/`'tadır; oradakine uy, kullanıcıdan şifre isteme.
- Tek kopya olan kaynakları (cihaz, simülatör, paylaşılan uzak servis) kullanma. Orada görülmesi gereken Kabul maddesi raporda ⏳ kalır ve nasıl deneneceği yazılır.
- Kontroller: projenin kontrol komutu (kök `CLAUDE.md`; ör. `bun run check`). Kırmızıysa düzelt; düzeltemiyorsan rapora `Durum: takıldı` yaz.

## Adım 4: Commit ve rapor

Commit bu skill'in parçasıdır (kullanıcı `/is-dagit` ile istedi): yalnız bu dala, projenin commit biçimiyle (kök `CLAUDE.md`), mesajda `ÖNEK-N`. push yok, main'e dokunma, rebase/merge yapma (ana oturum `/is-topla` ile yapar).

Sonra `.worktree/rapor.md`'yi bu şablonla yaz (varsa üzerine):

```md
# ÖNEK-N rapor

- Dal: <dal> · Commit'ler: <kısa hash> <başlık>, ...
- Durum: hazır | takıldı (<neden>)
- Değişen alanlar: <etiketler>

## Yapılan
İki-üç cümle: ne değişti, neden bu yol.

## Kabul
1. ✓ <kanıt: test adı, komut çıktısı, önizlemede görülen>
2. ⏳ <cihaz / canlı veri gerektiriyor; nasıl denenecek>
3. ✗ <karşılanmadı; neden>

## Kontroller
`<kontrol komutu>`: <sonuç, test sayıları>

## Diğer alanlara etki
Yok / <uç, alan, davranış; hangi uygulama ya da paket, ne yapılmalı>

## Bulgular
İş adayları; ana oturum /is-ac ile arayıp açar. Her biri:
### <davranışı anlatan başlık cümlesi>
- tags: <docs/config.json'daki etiketler>
- Belirti: <ürün diliyle>
- Yeniden üretme: 1. ... 2. ... (rol, hesap, veri)
- Önerilen Kabul: <gözlenebilir iddia>
- Kanıt ve yer: <hata çıktısı, dosya:satır>

## Doküman önerileri
`docs/knowledge/`, `docs/decisions/` ya da kök `CLAUDE.md` için öneri; değiştirilen alt klasör `CLAUDE.md`'si.

## Sorulanlar
- Soru: ... · Seçim: ... · Sorulmasaydı: ...
```

Boş bölüm "Yok" yazar; silinmez.

## Adım 5: Bitir

Son mesaj kısa olsun; ana oturuma ilk 400 karakteri ulaşır:

```
ÖNEK-N hazır · dal <dal> · <n> commit · check ✓ · Kabul ✓3 ⏳1 · bulgu 2
Rapor: <worktree mutlak yolu>/.worktree/rapor.md
```

Sonra dur. Ana oturum geri bildirim gönderirse (`SendMessage`) düzelt, yeni commit at, raporu güncelle.

## Kurallar

- docs/ ve kök CLAUDE.md yazılmaz; bulgu ve öneri rapora.
- Kapsam dışı düzeltme yok; bulgu olarak yazılır.
- Kendi portları ve verisi; tek kopya kaynak yok; push yok; ana dala dokunma.
- Kanıtsız ✓ yok (`/is-kapat` ile aynı ölçü).
