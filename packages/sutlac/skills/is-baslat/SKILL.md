---
name: is-baslat
description: Oturum başında ya da "nerede kalmıştık / sırada ne var" denince kullan - docs/tasks/'taki açık işleri aktif sprint ve backlog olarak özetler, yorumu olanları gösterir, seçilen işi in-progress'e alır. Argüman olarak etiket ya da iş numarası verilebilir.
argument-hint: "[etiket | ÖNEK-N]"
---

# İşe başla

> **Önek ve proje bilgisi.** Aşağıda `ÖNEK-N` bir iş numarasıdır; önek `docs/config.json` > `prefix` alanındadır (ör. `KES` → `KES-12`, dosyası `docs/tasks/KES-12.md`). Komutlarda `ÖNEK` yerine gerçek öneki yaz. Projeye özgü her şey (kontrol komutu, alanlar/uygulamalar, deneme hesapları, paralel çalışmanın tuzakları) kök `CLAUDE.md`'de ve `docs/knowledge/`'tadır; bu skill onları oradan okur, ezbere varsaymaz.

"Nerede kalmıştık" sorusunu tek adımda cevaplar. Okuma aşamasında hiçbir dosyayı değiştirmez; tek yazma, kullanıcı bir iş seçtikten sonra onu üstlenmektir (Adım 4).

Biçim ve kurallar: `docs/tasks/README.md`, `docs/sprints/README.md`. Geçerli durum, etiket ve öncelikler `docs/config.json`'dadır; oradan oku, ezbere yazma.

## Adım 1: Kapsam

- `$ARGUMENTS` bir `ÖNEK-N` ise doğrudan Adım 4'e geç.
- `docs/config.json` > `tags` içindeki bir etiketse yalnız `tags`'inde o geçen işleri göster (`--tag`).
- Boşsa hepsini göster. Kullanıcıya "hangi alan?" diye sorma.

## Adım 2: Oku

Tek komut açık işleri (kapalı sayılmayan durumdakiler) ve aktif sprinti verir; dosyaları tek tek açma:

```bash
bunx sutlac list            # --tag <etiket> · --json
```

Çıktı satır başına bir iştir: `iş|durum|öncelik|etiketler|sprint|başlık|yorum sayısı|son yorum`. İlk satır aktif sprinttir (`closed` alanı boş olan `docs/sprints/sprint-N.md`); yoksa her açık iş backlog'dadır. `sprint` alanı aktif sprintin numarası olan iş sprinttedir, boş olan backlog'da.

Komut yoksa (paket kurulu değil) aynı bilgi dosyalardan okunur: `grep -H -e '^status:' -e '^title:' -e '^tags:' -e '^sprint:' -e '^priority:' docs/tasks/ÖNEK-*.md`.

## Adım 3: Özeti bas

Kısa tut, iş metnini basma: numara, öncelik, etiket, başlık yeter.

```
## Açık işler (Sprint 3 — Ödeme akışı)

### Devam eden
- ÖNEK-120 · mobile · Sipariş durumu yanlış görünüyor

### Review'da (denenmeyi bekliyor)
- ÖNEK-1 · mobile · Mobili güncel API sözleşmesine geçir

### Engelli
- ÖNEK-87 · api · Liste uçlarına günlük önbellek

### Sprintte, sırada
- ÖNEK-146 · high · mobile · Sipariş detayında kalemler listelenmiyor
  💬 2 yorum, son: 2026-01-15 21:30

### Backlog (14)
- high: ÖNEK-2 · mobile, api · Ödeme sonrası bildirim gitmiyor
- api: 9 · mobile: 3 · web: 1
```

- Önce `in-progress`, sonra `review`, sonra `blocked`, sonra aktif sprintin `todo`'ları; her grupta `high` önce. `review` iş kod tarafında bitmiştir; listede kullanıcının denemesini beklediği için görünür. Sprint ya da backlog fark etmez, `review`'daki her iş bu grupta yazılır.
- Backlog'da yalnız `high` olanları tek tek yaz, kalanların etiket bazında sayısını ver. Kullanıcı isterse tamamını listele.
- Yorumu olan işte yorum sayısını ve son yorumun zamanını (`### tarih saat` başlığı) göster. Yorumu özetleme ve cevaplama; varlığını göster, kullanıcı ilgilenirse açar.
- Açık iş yoksa söyle.

Ardından tek soru sor: hangisiyle başlıyoruz?

## Adım 4: Seçilen işi üstlen

Kullanıcı bir iş seçtiğinde (ya da `/is-baslat` olmadan doğrudan "ÖNEK-N'e başlayalım" dediğinde) dosyayı **baştan sona** oku: Bağlam, Kabul, Yapılacaklar, Notlar ve `## Yorumlar`. Yorumlar gövde kadar önemlidir; gövdeyle çelişen sonraki bir yorum gövdenin yerini alır. Bağlam'da geçen `ÖNEK-N`'leri de aç.

**Kapılar**, yazmadan önce:

- `status` `todo` değilse dokunma. Zaten `in-progress` ise devam et. `review` ise son kapanış yorumundaki `⏳` maddeleri göster ve sor: kullanıcı deneyecek mi, yoksa bir sorun mu var? Sorun varsa ve düzeltilecekse `status: review` → `in-progress` yap, bulguyu tarihli yorum olarak ekle. `blocked` ise engelin kalkıp kalkmadığını sor, kendin değiştirme. Kapalıysa söyle ve dur.
- "Önce şuna bir bakalım" gibi keşif için açılan işi çekme; geçiş, işe başlama kararının kaydıdır.

Üstlenmek durumu `in-progress` yapmaktır. Dosyayı yazmadan hemen önce yeniden oku (başka bir oturum değiştirmiş olabilir), sonra:

```bash
# Edit aracıyla `status: todo` → `status: in-progress`, sonra yazılanı geri oku:
grep '^status:' docs/tasks/ÖNEK-N.md
```

- Gövdeye, `sprint` alanına ve başka alanlara dokunma.
- Bu geçiş yapılmazsa `/is-kapat` hangi işin açık olduğunu bulamaz.

## Adım 5: Kaz ve anlat

**İş bir öneridir, karar değil.** Gövdede yazan çözüm yönü bu çalışmada kullanıcıyla birlikte değişebilir, reddedilebilir ya da olduğu gibi uygulanabilir.

Kodu ve ilgili alanın `git log`'unu oku, kök `CLAUDE.md`'ye (varsa alt klasörün kendi `CLAUDE.md`'sine) ve `docs/knowledge/`'taki ilgili sayfaya bak. Sonra, **herhangi bir şey sormadan önce**, kısa bir özet ver (`/is-ac` > Soru sormak): durum, bulduğun, ne yapmayı düşündüğün, açık sorular. Açık soru yoksa bunu söyle ve sorma.

- **Tasarım yorumu varsa** (`**Tasarım — <tarih>**`, `/is-ac` > Adım 5) o, kullanıcının cevaplarıyla birlikte üzerinde anlaşılmış tasarımdır; aynı soruları tekrar sorma. Ama o günün koduna göre yazılmıştır: kod hâlâ uyuyorsa geçerlidir, uymayan noktayı söyle ve yalnız onu yeniden aç. Tek eskimiş paragraf yüzünden bütün tasarımı atma, sessizce de izleme.
- **Kabul yoksa ya da gözlenebilir değilse** işe başlamadan önce kullanıcıyla yaz; `/is-kapat` kanıtı ona göre ister.

Çalışma araç yüzünden yürümezse (build kırık, DB'ye erişim yok) bir kez dene; yine olmazsa üstlendiğin işi bulduğun hale geri al (`status: todo`), nedeni söyle ve dur. Ölü bir çalışmanın arkasında kalan `in-progress` iki tarafa da görünmez.

## Kurallar

- İş açmak ve kapatmak bu skill'in işi değil: açma `/is-ac`, kapatma `/is-kapat`.
