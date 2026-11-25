# Tasks

Her iş bu klasörde tek bir md dosyasıdır: `{{PREFIX}}-1.md`, `{{PREFIX}}-2.md`... Klasör küçük bir veritabanı gibi kullanılır; işin hangi alanı ilgilendirdiği `tags` alanına etiket olarak yazılır (etiketsiz kalabilir: `tags: []`), durum `status` alanındadır, sprinti `sprint` alanındadır. Alt klasör yoktur; biten ya da arşivlenen iş de yerinde kalır, böylece `{{PREFIX}}-N` linkleri kırılmaz. Bu klasörde iş dışında dosya durmaz (dokümanlar `knowledge/`, `decisions/`).

## Yeni iş

Numara tek sıradır, etikete göre ayrılmaz. Sıradaki numara:

```bash
bunx sutlac next
```

Kod, commit ve PR'da iş `{{PREFIX}}-12` diye anılır.

## Şablon

```md
---
id: {{PREFIX}}-12
title: Davranışı anlatan bir cümle
status: todo          # {{DOCS}}/config.json > statuses
tags: []              # {{DOCS}}/config.json > tags
priority: normal      # {{DOCS}}/config.json > priorities
sprint: 3             # boş: backlog (bkz. {{DOCS}}/sprints/README.md)
created: 2026-01-15
closed:
---

## Bağlam
Neden gerekli, kim istedi. Hatada yeniden üretme adımları.

## Kabul
1. Kodu okumadan doğru/yanlış denebilecek bir davranış iddiası.

## Yapılacaklar
- [ ] ...

## Notlar
- 2026-01-15: Ne değişti / neden ilgilendirir / ne yapmalı.
```

Geçerli değerler (etiketler, durumlar, öncelikler) ve işlere eklenebilen özel alanlar `{{DOCS}}/config.json`'dadır; arayüzde Ayarlar'dan da düzenlenir. Kapalı sayılan durumlar (`closed: true`) kapanış tarihi ister. Özel alan frontmatter'a `anahtar: değer` olarak eklenir.

## Yorumlar

Yorumlar dosyanın en sonundaki `## Yorumlar` bölümündedir; her yorum `### tarih saat` başlığıyla başlar (yazan tutulmaz). Arayüz bu bölümü editörden ayrı gösterir, elle de eklenebilir:

```md
## Yorumlar

### 2026-01-15 21:30

Yorum metni (markdown). İçinde `## ` başlığı ve `### <tarih saat>` biçiminde satır kullanılmaz.
```

`## Notlar` başka alanlara haber içindir (aşağıdaki kural); yorum serbest konuşmadır.

## Sorgular

```bash
bunx sutlac list                                                  # açık işler: task|status|priority|tags|sprint|title|comments|last comment
bunx sutlac list --tag api                                        # bir etiketin açık işleri
grep -l '^status: review' {{DOCS}}/tasks/{{PREFIX}}-*.md          # denenmeyi bekleyenler
grep -H '^title:' {{DOCS}}/tasks/{{PREFIX}}-*.md                  # başlık listesi
grep -l '^sprint: 3$' {{DOCS}}/tasks/{{PREFIX}}-*.md              # Sprint 3'teki işler
```

## Kurallar

- İş açmadan önce mevcut işlerde aranır; eşleşme varsa yeni iş açılmaz, kanıt oraya eklenir. Bağlam ve Kabul davranışı ürün diliyle anlatır; dosya yolu ve sembol adı eskir, `## Notlar`'da ya da yorumda durur. Ayrıntı: `/is-ac`.
- `## Kabul` numaralı listedir (kutucuk değil); kapanışta her madde kanıtla işaretlenir (`/is-kapat`).
- Başka bir alanı (uygulamayı, paketi) etkileyen bir not üç soruyu cevaplar: **ne değişti**, **neden ilgilendirir**, **ne yapmak gerekiyor**. "İlgilendirmiyor" geçerli bir cevaptır; nota yazılıp geçilir.
- Durum akışı: `todo` → `in-progress` → `review` → `done`. `review`: kod bitti, commit'lendi, kontroller yeşil; Kabul'ün gerçek ortamda denenmesi ya da kullanıcı onayı bekleniyor. Kullanıcı deneyince board'da `done`'a sürükler; sorun çıkarsa iş `in-progress`'e döner. Kuralı `/is-kapat` uygular.
- İş bitince `status: done` ve `closed` tarihi yazılır (arayüz kapanış tarihini kendisi yazar). Kalıcı bilgi `{{DOCS}}/knowledge/`'a, alınan karar `{{DOCS}}/decisions/`'a gider.
