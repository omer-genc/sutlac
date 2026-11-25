---
name: is-ac
description: Yeni bir iş açarken kullan - kullanıcı bir hata/istek anlattığında, bir çalışmada kapsam dışı bir bulgu çıktığında ya da başka bir alana haber düşmek gerektiğinde. Önce mevcut işlerde arar, eşleşme varsa yeni iş açmaz; yoksa docs/tasks/ altındaki iş dosyasını kalıcı metin ve gözlenebilir kabul kriteriyle yazar. İstenirse tasarımı tarihli yorum olarak ekler.
argument-hint: "[kısa anlatım, kendi sözlerinle]"
---

# İş aç

> **Önek ve proje bilgisi.** Aşağıda `ÖNEK-N` bir iş numarasıdır; önek `docs/config.json` > `prefix` alanındadır (ör. `KES` → `KES-12`, dosyası `docs/tasks/KES-12.md`). Komutlarda `ÖNEK` yerine gerçek öneki yaz. Projeye özgü her şey (kontrol komutu, alanlar/uygulamalar, deneme hesapları, paralel çalışmanın tuzakları) kök `CLAUDE.md`'de ve `docs/knowledge/`'tadır; bu skill onları oradan okur, ezbere varsaymaz.

Bir iş, bulunduğu anda orada olmayan biri tarafından, etrafındaki kod değiştikten aylar sonra okunur. O okur için yaz.

Biçim, şablon ve sorgular: `docs/tasks/README.md`. Geçerli değerler `docs/config.json`'dadır; oradan oku, ezbere yazma.

## Adım 1: Aramadan açma

**Arama yapılmadan iş açılmaz.** Bariz hata için de, az önce kendin bulduğun için de, bir işi bölerken çıkan parça için de. En çok "kesin yenidir" denilen yerde atlanır; atlandığında aynı konu iki ayrı kayda bölünür.

En az iki arama, iki farklı kelime dağarcığıyla; kapalı işler de dahil:

```bash
grep -li '<belirti, ürün diliyle: "sipariş iptali", "fatura eki">' docs/tasks/ÖNEK-*.md
grep -li '<mekanizma: uç parçası, hata kodu, alan adı>' docs/tasks/ÖNEK-*.md
```

Bulunanların başlığını ve durumunu tek seferde göster: `grep -H -e '^title:' -e '^status:' <dosyalar>`.

- **Açık eşleşme** → yeni iş açma. Kanıtı o işe ekle: başka bir alana haberse `## Notlar`'a tarihli satır, değilse `## Yorumlar`'a yorum. Kapsamı değiştiriyorsa bunu o yorumda söyle.
- **Kısmi eşleşme** → önce oraya yaz, yalnız kapsanmayan kalanı yeni iş yap ve Bağlam'ın ilk satırında hangi işten ayrıldığını belirt.
- **Kapalı eşleşme** → bu bir gerilemedir (regresyon), aynı iş değil. Yeni iş aç, ilk satırda `Gerileme: ÖNEK-N` yaz.

Hangi aramayı yaptığını ve ne çıktığını kullanıcıya tek cümleyle söyle. Söylenmeyen arama yapılmamış sayılır.

## Adım 2: Bir iş mi, birkaç iş mi

Ayrı ayrı düzeltilebilen ve birbirinden bağımsız doğrulanabilen sorunlar ayrı iştir. Tek bir kök davranıştan çıkan belirtiler tek iştir. Kararsızsan ince işi seç: üç kriterinden ikisi geçen kalın iş ne kapanır ne geri döner.

- Aynı değişikliği birden fazla alan (uygulama, paket) taşıyorsa tek iş, etiketlerin hepsiyle: `tags: [api, web]`. Alan başına ayrı iş yalnız işler gerçekten ayrı zamanlarda yapılacaksa.
- Bölerken önce engelleyeni aç, sonrakinin Bağlam'ına `Önce: ÖNEK-N` yaz. Bu satırı yalnız gerçek sıra için kullan (B, A bitmeden denenemiyorsa); "ilgili" demek için `İlgili: ÖNEK-N`.
- Her parça ayrı bir iştir ve Adım 1'deki aramayı ayrı ister.

**Büyük işte önce ikinci göz.** İş yeni bir ekran, tablo, uygulama ya da eşitleme getiriyorsa, birden fazla alanı değiştiriyorsa ya da birkaç günden uzun sürecekse, yazmadan önce öneriyi ve Adım 1'in bulduklarını bir alt agent'a eleştirt (projede `.claude/agents/` altında eleştiri ya da mimari için bir agent varsa o; yoksa genel bir alt agent: "bu iş gerekli mi, küçültülebilir mi, kim kullanacak?"). Hükmünü ("Küçült", "Vazgeç" dahil) kullanıcıya göster; kullanıcı karar verir. Hata düzeltmesinde ve küçük işte çağrılmaz. Çözüm yolunda birden fazla ciddi seçenek varsa karşılaştırma Adım 5'teki tasarım yorumuna girer.

## Adım 3: Yaz

Ölçüt: bir refactor işin dokunduğu her dosyanın adını değiştirdikten sonra iş hâlâ doğru bir şey söylüyor mu?

- **Davranışı yaz, kodu değil.** "Şube kullanıcısı sipariş listesinde başka şubenin siparişini görüyor", "`buildOrderFilter` kapsamı atlıyor" değil. İkincisi fonksiyon bölündüğü an yanlış olur ve çözümü tek yere bağlar.
- **Bağlam ve Kabul'de dosya yolu, satır numarası, sembol adı yok.** En çabuk eskiyen şey onlardır. Uç yolu (`GET /api/v1/orders`) ve alan adı bir sözleşmedir, yazılabilir.
- **Ürünün kendi kelimeleri:** kullanıcının ve ekibin o şeye verdiği ad (sipariş, şube, fatura...). Modül adı uydurma.
- **Hatada yeniden üretme adımları zorunludur:** numaralı, somut; hangi rol, hangi hesap, hangi veri. Üretemiyorsan elinde iş değil şüphe vardır; ilgili bir işe yorum olarak yaz.
- **Ham kanıt** (stack trace, sorgu çıktısı, düşen test) Bağlam'da kod bloğu içinde, neyin ürettiği ve hangi commit'te olduğu yazılarak durur. Etrafındaki metin blok eskidiğinde de tek başına anlaşılmalı.
- **Otuz saniyede okunur.** Uzun anlatılması gereken şey genelde bölünmesi gereken şeydir.

### Kabul

`## Kabul`, işi kapatırken neyin kanıtlanacağının listesidir. Her madde, kodu okumadan doğru ya da yanlış denebilecek bir iddiadır; numaralı, satır başına bir tane:

```md
## Kabul
1. Şube kullanıcısı sipariş listesinde yalnız kendi şubesinin siparişlerini görür.
2. Kapsam dışı bir siparişin detayı 403 döner.
```

Gözlenemeyen kriter ("kod daha temiz olur") kapanışta kanıtlanamaz; ya gözlenebilir hale getir ya çıkar. Yapılacaklar (`- [ ] api: ...`) işin nasıl bölündüğüdür, Kabul neyin doğru olacağıdır.

### Alanlar

- `status: todo`. Başkası için açılan işi başlatma, sprinte koyma: `sprint` boş kalır, kullanıcı söylemedikçe.
- `priority`: kullanıcı söylemediyse `normal`. Canlıda veri sızıntısı, yetki açığı ya da müşteriyi durduran hata `high`'dır; öyleyse öner.
- `title` bir cümledir, etiket değil: "Sipariş listesi şube kapsamını uygulamıyor", "Sipariş hatası" değil.
- `created`: `date +%F`.

Numara: `bunx sutlac next` (komut yoksa `docs/tasks/README.md` > Yeni iş). Dosyayı yazmadan hemen önce numaranın boş olduğuna bak (`ls docs/tasks/ÖNEK-<N>.md`).

## Adım 4: Onay ve kayıt

Kullanıcı iş açmayı kendisi istemediyse (bir çalışmada çıkan bulgu, haber işi) dosyayı yazmadan önce başlığı, etiketleri ve Kabul'ü göster, onay al. Onaysız iş açma.

Açtıktan sonra numarayı ve dosya yolunu söyle. İş açmak commit gerektirmez; açık bir çalışmanın parçasıysa onunla aynı commit'e, değilse `docs: ÖNEK-N açıldı` commit'ine girer (mesajı göster, onay al).

## Adım 5: Tasarım (istenirse)

Kullanıcı işi "nasıl"ı konuşarak açmak istiyorsa tasarım **yorum olarak** yazılır, gövdeye değil: gövde kalıcı sorun tanımıdır, tasarım belli bir günün anlık görüntüsüdür ve dosya yolu, sembol adı içerebilir. Plan yazma, dosya dosya görev çıkarma: kod iş başlayana kadar değişir, eski plan okuyanı yanlış yere götürür.

```md
### 2026-10-25 14:10

**Tasarım — 2026-10-25**

Davranış ve sınır: ...
Kararlar: ... (neye dayandığı)
Sorulanlar:
- Soru: ... · Seçim: ... · Sorulmasaydı: ...
Elenen seçenekler: ... (neden)
Testle kanıtlanamayan kriterler: ... (neden)
```

`/is-baslat` bu yorumu okur ve koda karşı hâlâ geçerli mi diye bakar.

## Soru sormak

Bu skill'de de `/is-baslat`'ta da aynı kural:

- **Sormadan önce durumu anlat:** ne oluyor ve kimin için, nerede bulduğun (sonuç, arama dökümü değil), ne yapmayı düşündüğün, hangi soruların açık kaldığı. Birkaç cümle; bir ekranı geçen özet kendi işini yapmıyordur.
- **Yalnız şu üçü birlikte doğruysa sor:** iki okuma belirgin şekilde farklı işe götürüyor, repo (kural, gelenek, mevcut kod) bunu çözmüyor, yanlış seçim pahalı. Yoksa karar ver ve kaydet.
- **Tek soru, önerilen seçenek önce** (`(Recommended)`); seçenek açıklaması mekanizmayı değil ürün üzerindeki sonucu söyler.
- **Cevap kayda geçer:** ne soruldu, ne seçildi, sorulmasaydı ne yapılacaktı. Üçüncüsü olmadan sonradan kullanıcının sonucu değiştirdiği mi onayladığı mı anlaşılmaz.

## Kurallar

- Aramadan iş yok; eşleşme varsa yeni iş yok.
- Bağlam ve Kabul davranış anlatır; dosya yolu Notlar'da ve tasarım yorumunda kalır.
- Kabul maddeleri gözlenebilir iddialardır.
- Başkası için açılan iş `todo` ve sprintsiz.
