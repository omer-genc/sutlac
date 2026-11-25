---
name: is-dagit
description: Ana oturumda, birden fazla işi paralel alt oturumlara dağıtmak istendiğinde kullan ("şunları paralel yapalım", "ÖNEK-A ve ÖNEK-B'yi ayrı oturumlarda başlat"). İşlerin birbirine dokunup dokunmadığına bakar, işleri in-progress'e alır, her biri için kendi worktree'sinde /is-yap ile çalışan bir oturum başlatır.
argument-hint: "ÖNEK-A ÖNEK-B [ÖNEK-C]"
---

# İşleri paralel oturumlara dağıt

> **Önek ve proje bilgisi.** Aşağıda `ÖNEK-N` bir iş numarasıdır; önek `docs/config.json` > `prefix` alanındadır (ör. `KES` → `KES-12`, dosyası `docs/tasks/KES-12.md`). Komutlarda `ÖNEK` yerine gerçek öneki yaz. Projeye özgü her şey (kontrol komutu, alanlar/uygulamalar, deneme hesapları, paralel çalışmanın tuzakları) kök `CLAUDE.md`'de ve `docs/knowledge/`'tadır; bu skill onları oradan okur, ezbere varsaymaz.

Bu skill **ana kopyada** (worktree dışında) çalışır; `.git` bir dosyaysa worktree'desin, dur.

## Adım 1: İşleri oku

Her `ÖNEK-N` için dosyayı baştan sona oku (Bağlam, Kabul, Yapılacaklar, Notlar, Yorumlar). Kapılar `/is-baslat` Adım 4 ile aynı:

- `todo` ya da zaten `in-progress` olan iş dağıtılır. `review`, `blocked`, kapalı iş dağıtılmaz; nedenini söyle.
- `## Kabul` yoksa ya da gözlenebilir değilse dağıtma: alt oturum kanıtı neye göre toplayacağını bilemez. Önce kullanıcıyla yaz.
- Tasarım kararı gerektiren, kullanıcıyla konuşulmamış iş (iki okuma farklı işe götürüyorsa) burada konuşulur ya da tasarım yorumu yazılır; alt oturum kullanıcıya sorabilir ama o soru kullanıcıyı iki pencere arasında bölüştürür.

Pratikte 2-3 iş; proje bir üst sınır koyuyorsa (port yuvası, ortak kaynak) o geçerli.

## Adım 2: Çakışma kontrolü

İşlerin dokunacağı yerleri koddan tahmin et (tasarım yorumu, Notlar, grep). Kullanıcıya tablo göster: iş → uygulama → muhtemel dosyalar.

Sıcak noktalar, iki iş birden dokunursa birini sıraya al ya da kullanıcıya merge maliyetini söyle:

| Dosya | Neden |
| --- | --- |
| Kilit dosyası (`bun.lock`, `package-lock.json`...) | Bağımlılık ekleyen iki iş; merge sonrası yeniden kurulum. |
| Üretilen dosyalar (şema, tip, sözleşme çıktıları) | Elle çözülmez; merge sonrası üretim komutu yeniden çalışır. |
| Çeviri/metin dosyaları | Her ekran yazar; satır çakışması sık, çözmesi kolay. |
| Ortak bileşenler ve yardımcılar | Birinin değişikliği diğerinin ekranını kırar. |
| Aynı modül, aynı ekran | Paralel yapılmaz. |

Projenin kendi sıcak noktaları ve paralel çalışma kuralları (portlar, veritabanı kopyası, tek kopya olan kaynaklar) kök `CLAUDE.md`'de ya da `docs/knowledge/`'ta yazıyorsa onları oku ve tabloya ekle.

Alt oturumda denenemeyen Kabul maddeleri (tek kopya olan bir cihaz, simülatör, canlı veri) orada ⏳ kalır ve `/is-topla`'dan sonra ana oturumda denenir. Bunu kullanıcıya söyle.

## Adım 3: Ana kopyayı hazırla

```bash
git status --short
```

Alt oturumun worktree'si ana kopyanın **son commit'inden** açılır. Commit'lenmemiş kod değişikliği varsa alt oturum onu görmez: kullanıcıya söyle (commit mi, yoksa bilerek mi dışarıda). `docs/` değişikliği sorun değil; alt oturum iş dosyasını ana kopyadan okur.

İşleri üstlen: `/is-baslat` Adım 4'teki gibi `status: in-progress` (dosyayı yazmadan önce yeniden oku, sonra geri oku). Commit gerekmez.

## Adım 4: Oturumları başlat

İki ve daha fazla oturum için önce `mcp__ccd_session__mark_chapter` ("Paralel: ÖNEK-A, ÖNEK-B"). Her iş için bir `start_session`:

- `initiation`: `user_asked` (kullanıcı dağıtmayı istedi), `context`: `fresh`, `use_worktree`: `true`.
- `model`: her zaman açıkça ver; verilmezse alt oturum ana oturumun modelini alır. Planlama ve kararlar ana oturumda kalır, alt oturum yalnız işi yapar: kullanıcı ya da proje (`CLAUDE.md`) bir model söylemediyse ana oturumunkinden bir kademe ucuz olanı seç.
- `title`: `ÖNEK-N · <iş başlığı kısaltılmış>`.
- `prompt` (brief) şu şablonla; kendi cümlelerinle, kısa:

```
/is-yap ÖNEK-N

Ana kopya: <ana kopyanın mutlak yolu>
İş dosyası: <ana kopya>/docs/tasks/ÖNEK-N.md (oradan oku; worktree'deki kopya eski olabilir)
Kapsam: <tek cümle; Kabul'ün özeti değil, sınır>
Dokunma: <diğer paralel işlerin alanı, Adım 2'den>
Not: <ana oturumda konuşulan ve iş dosyasında olmayan karar varsa>
```

`start_session` aracı yoksa (masaüstü uygulaması dışında) her iş için brief'i kullanıcıya ver; kullanıcı onu kendi açtığı worktree oturumuna (`claude --worktree`) yapıştırır.

Her oturumdan önce bir kalın başlık satırı ve tek cümle yaz (oturum kuralları). Tool sonucu başladığını söyleyene kadar başladı deme.

## Adım 5: Bekle ve topla

Kullanıcıya hangi oturumun hangi işte olduğunu linkleriyle söyle ve dur; poll etme. Bir oturum bitince gelen not o oturumun raporudur, kanıt değil: `/is-topla ÖNEK-N` ile raporu ve dalı denetle.

Alt oturum takılırsa (`Durum: takıldı`) ya da soru sorarsa `SendMessage` ile o oturuma cevap ver; yeni oturum açma.

## Kurallar

- Ana kopyada çalışır; iş durumu ve yorumlar yalnız burada yazılır.
- Kabul'ü olmayan iş dağıtılmaz.
- Aynı dosyalara dokunan iki iş paralel dağıtılmaz; kullanıcı bilerek isterse merge maliyeti söylenir.
- push yok; alt oturumların dalları `/is-topla` ile main'e alınır.
