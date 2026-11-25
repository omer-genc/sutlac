---
name: is-kapat
description: Bir iş bittiğinde kullan - kontrolleri çalıştırır, diğer alanlara etkisini denetler, iş dosyasını done'a (kabulün gerçek ortamda denenmesi kaldıysa review'a) alıp kapanış notunu yorum olarak yazar, karar ve bilgi dokümanlarını günceller. Argüman olarak iş numarası verilebilir.
argument-hint: "[ÖNEK-N]"
---

# İşi kapat

> **Önek ve proje bilgisi.** Aşağıda `ÖNEK-N` bir iş numarasıdır; önek `docs/config.json` > `prefix` alanındadır (ör. `KES` → `KES-12`, dosyası `docs/tasks/KES-12.md`). Komutlarda `ÖNEK` yerine gerçek öneki yaz. Projeye özgü her şey (kontrol komutu, alanlar/uygulamalar, deneme hesapları, paralel çalışmanın tuzakları) kök `CLAUDE.md`'de ve `docs/knowledge/`'tadır; bu skill onları oradan okur, ezbere varsaymaz.

Bir işi kapatır ve öğrenileni kalıcı hale getirir. Biçim ve kurallar: `docs/tasks/README.md`.

## Adım 0: İşi belirle

`$ARGUMENTS`'ta `ÖNEK-N` varsa onu kullan. Yoksa `grep -l '^status: \(in-progress\|review\)' docs/tasks/ÖNEK-*.md` ile devam edenleri ve review'dakileri bul: tam bir tane varsa onu varsay ve **söyleyerek** devam et, birden fazlaysa sor, hiç yoksa numara iste.

Dosyayı baştan sona oku: Bağlam, Kabul, Yapılacaklar, Notlar ve varsa `## Yorumlar`. Gövdeyle çelişen sonraki bir yorum (kapsamı daraltan, kriteri değiştiren) gövdenin yerini alır.

## Adım 1: Yapılanı doğrula

**Kanıt olmadan kapatma.**

```bash
git status --short
git log --oneline -5
```

Çalışma ağacı kirliyse sor: commit edilecek mi, yoksa iş gerçekten bitmedi mi?

Projenin kontrol komutunu çalıştır ve **çıktıyı gör**. Komut kök `CLAUDE.md`'de yazar (tipik olarak typecheck + lint + test'i birlikte koşan tek komut, ör. `bun run check`); yazmıyorsa `package.json` betiklerinden bul ve kullanıcıya hangisini çalıştırdığını söyle. Üretilen dosyası olan projede (şema, tip, sözleşme) üretim komutunun çalıştırılmış olması da bu adımın parçasıdır.

Kontroller geçmiyorsa işi kapatma; durumu söyle ve dur.

## Adım 2: Kapanışı engelleyen bir şey var mı

- **Kabul:** Her madde için kanıt göster: onu doğrulayan test, komut çıktısı, istek/yanıt ya da tarayıcıda görülen. "Kod bunu yapıyor" kanıt değildir. Kanıtlanamayan madde ya kanıtlanır, ya kullanıcıyla birlikte değiştirilir, ya neden kanıtlanamadığı kapanış notuna yazılır (kullanıcı onayıyla) ya da iş `review`'a alınır (Adım 4). Kanıtsız işaretleme yok. Kanıtı olmayan, yerelde denenebilecek maddeleri şimdi dene (uygulamayı çalıştır, isteği at, ekrana bak; projede bunun için bir skill varsa onu kullan) ve gördüğünü kanıt olarak yaz.
- **Kapsam:** İş birden fazla alanı değiştirdiyse ya da yeni bir ekran, tablo veya akış getirdiyse bir alt agent'a (projede eleştiri için bir agent varsa ona) iş dosyasını ve diff'i ver: Kabul gerçekten karşılandı mı, kimsenin kullanmayacağı parça kaldı mı? Hükmü kullanıcıya göster; "engel" bulgusu varsa kullanıcı karar vermeden kapatma. Kullanıcı bulguyu kabul edip kapatırsa bunu kapanış notuna yaz.
- **Yapılacaklar:** İşaretlenmemiş kutucuk varsa ya karşıla ya da kullanıcıyla birlikte çıkar. Karşılanmamış maddeyle kapatma.
- **Yorumlar:** `## Yorumlar`'da cevapsız kalmış bir soru varsa (soru sorulmuş, altında cevap yok) kapatma. Cevabı biliyorsan yorum olarak yaz; bilmiyorsan kullanıcıya sor. Kendi kafandan cevaplayıp geçme.

## Adım 3: Diğer alanlar

Tek parçalı projede bu adım atlanır. Birden fazla uygulama ya da paket varsa: yapılan iş bir başkasının kullandığı bir şeyi değiştirdi mi (bir uç, bir yanıt alanı, dışa açılan bir fonksiyon, bir davranış)? Bu kontrol atlanırsa diğer taraf sessizce geride kalır.

Önce kanıt topla, tahmin etme:

- Tipler paylaşılıyorsa kökten typecheck kırılan yerleri gösterir (Adım 1'de zaten çalıştı). Tip değişmeyen davranış değişikliklerini typecheck görmez; çağrı yerlerini ara:

  ```bash
  grep -rn "<ucun ya da fonksiyonun ayırt edici parçası>" <diğer alanların kaynak klasörleri>
  ```

  Çıktı boşsa o alan bunu kullanmıyor demektir. Adlarda tekil/çoğul ve sondaki eğik çizgi değişir; tam yolla değil ayırt edici parçayla ara.

Etkilenen alan varsa **varsayılan, uyarlamayı aynı işte yapmaktır.** Kullanıcıya bulguyu göster ve sor:

```
Bu değişiklik mobili etkiliyor: src/hooks/use-order.ts:42 bu ucu çağırıyor.
Uyarlamayı şimdi mi yapalım, yoksa ayrı iş mi açayım?
```

Ayrı iş istenirse `/is-ac`'ın kurallarıyla aç (önce arama; eşleşme varsa yeni iş değil, o işin `## Notlar`'ına tarihli satır). Haber işine özgü olanlar:

- `tags` hedef alan; ilk satırda kaynak iş: `Kaynak: ÖNEK-N`.
- `## Bağlam` üç soruyu cevaplar: **ne değişti** (önce ne vardı, şimdi ne var; gerçek uç ve alan adlarıyla), **neden ilgilendirir**, **ne yapılmalı**. Grep'in bulduğu `dosya:satır` Bağlam'a değil `## Notlar`'a tarihli satır olarak girer; eskiyebilir.
- `## Kabul` hedef alanda gözlenecek davranıştır: "Sipariş detayı yeni `items[]` şekliyle kalemleri listeler".

Değişiklik başka alanı ilgilendirmiyorsa bunu kapanış notunda tek cümleyle söyle.

## Adım 4: İşi kapat ya da review'a al

**`review` ne demek:** kod bitti ve commit'lendi, kontroller yeşil (Adım 1); eksik olan, Kabul'ün bir ya da birkaç maddesinin gerçek ortamda (uygulamada, canlı veride) denenmesi ya da kullanıcının onayı. Kontroller kırmızıysa, Yapılacaklar'da karşılanmamış kutucuk ya da cevapsız soru varsa iş `review`'a da alınmaz; `in-progress`'te kalır.

- Kabul'ün her maddesi kanıtlıysa (ya da kanıtlanamayışı kullanıcı onayıyla nota yazıldıysa): `done`.
- Bir madde yalnız gerçek ortamda denenerek kanıtlanabiliyorsa ve henüz denenmediyse: `review`. Kullanıcıya hangi maddenin neden kaldığını söyle.

1. Yapılacaklar'daki tamamlanan kutucukları `- [x]` yap.
2. Frontmatter: `done` için `status: done`, `closed: <date +%F>` (tarihi komutla al, uydurma); `review` için `status: review`, `closed` boş kalır.
3. Kapanış notunu **yorum olarak** dosyanın en sonundaki `## Yorumlar` bölümüne ekle; bölüm yoksa aç. Gövde işin tanımıdır, yorum ne olduğunun kaydıdır.

```md
## Yorumlar

### 2026-10-24 21:30

**Yapılan:** iki-üç cümle; ne değişti, neden bu yol seçildi. Diğer alanlara etkisi: yok / ÖNEK-N açıldı / aynı işte uyarlandı.

**Kabul:**
1. ✓ `order.service.test.ts` "şube kapsamı" testi
2. ✓ `GET /api/v1/orders/123` → 403 (yerel, şube hesabı)
3. ✗ Push bildirimi: canlı cihaz olmadan denenemedi; kullanıcı onayıyla kapatıldı.

Commit: `abc1234` feat(...): ...
```

Gövdeyle ayrılan yön varsa (iş başka bir yoldan çözüldüyse ya da kapsam daraldıysa) bunu da notta söyle; gövde değiştirilmez.

`review`'a alınan işte not aynı biçimdedir; denenmeyi bekleyen madde `⏳` ile işaretlenir ve nasıl deneneceği yazılır: `3. ⏳ Sipariş kartı: demo hesapla sipariş detayında kargo satırı görünüyor (cihazda denenmedi)`. Kullanıcı deneyip board'da `done`'a sürüklerse bu onaydır; arayüz `closed`'u kendisi yazar. Denemede sorun çıkarsa iş `in-progress`'e döner ve bulgu yorum olarak eklenir. Kullanıcı istenirse `/is-kapat ÖNEK-N` yeniden çalıştırılır: `⏳` maddeler kanıtlanır, iş `done` olur ve kanıt ikinci bir yorumla eklenir.

- Yorum başlığı yalnız zamandır: `date '+%F %H:%M'`. Yazan tutulmaz.
- Yorum metninde `## ` başlığı ve `### <tarih saat>` biçiminde satır kullanılmaz; arayüz yorumları bu başlıklardan ayırır.
- `## Yorumlar` her zaman son bölümdür. `## Notlar`'a satır eklerken onun önüne ekle.

İş, başka alanı ilgilendirmediği için kapatılan bir haber işiyse (Bağlamında `Kaynak: ÖNEK-N` ya da `### Kaynak` var) kod kontrolü gerekmez; not `**Sonuç:** İlgilendirmiyor. <tek cümle neden>` olur.

Kapatılmayıp vazgeçilen iş `done` değil `cancelled` olur; nedeni `## Notlar`'a yazılır.

## Adım 5: Karar ve bilgi

Sırayla bak; cevabı biliyorsan öner, onaylat.

- **Kalıcı bir karar verildi mi?** "Şunu şu yüzden böyle yaptık" cümlesi kurulabiliyorsa `docs/decisions/NNNN-kisa-baslik.md` aç (sıradaki numara: `ls docs/decisions | tail -1`). Biçim mevcut kararlarla aynı: `# NNNN · Başlık`, `- **Tarih:**`, `- **Durum:** kabul`, `- **İlgili:** ÖNEK-N`, ardından `## Bağlam`, `## Karar`, `## Sonuçlar`. Yalnız tek bir alt klasörü ilgilendiren ve o klasörün kendi `CLAUDE.md`'si olan kural oraya yazılır.
- **Bilgi eskidi mi?** İş, `docs/knowledge/`'taki bir sayfanın ya da `CLAUDE.md`'nin anlattığı akışa dokunduysa o sayfayı güncelle. Baştan yazma; yalnız eskiyen kısmı değiştir. `bunx sutlac check` belgelerdeki eskimiş yolları yakalar.

## Adım 6: Commit ve özet

İş dosyası (ve açılan iş, karar, bilgi değişiklikleri) iş henüz commit edilmediyse aynı commit'e girer; edildiyse ayrı bir `docs:` commit'i olur. Commit'ten önce mesajı göster ve onay al.

Özet üç satır: iş kapandı mı (ya da `review`'da neyin denenmesi bekleniyor), hangi kontroller çalıştı, hangi doküman açıldı ya da güncellendi. Sırada ne olduğunu sorma; `/is-baslat` bunun için var.

## Kurallar

- Kontroller yeşil değilse kapatma yok (ilgilendirmeyen haber işi hariç).
- Karşılanmamış kriter, kanıtsız Kabul maddesi ya da cevapsız soru varsa kapatma yok. Yalnız gerçek ortamda denenmeyi bekleyen madde varsa iş `done` değil `review` olur.
- Onaysız ve aramasız iş açma (`/is-ac`).
- Kapanış notu yorumdur; gövdeye yazılmaz.
- Karar ve bilgi burada güncellenmezse hiç güncellenmez; Adım 5'i atlama.
