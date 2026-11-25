---
name: is-topla
description: Ana oturumda, bir alt oturum işini bitirdiğinde (ya da kullanıcı "ÖNEK-N'i al / topla" dediğinde) kullan. Alt oturumun raporunu ve dalını denetler, kullanıcı onayıyla main'e alır, kontrolleri çalıştırır, işi /is-kapat ile kapatır, rapordaki hataları /is-ac ile iş olarak açar, worktree'yi temizler.
argument-hint: "ÖNEK-N"
---

# Alt oturumun işini topla

> **Önek ve proje bilgisi.** Aşağıda `ÖNEK-N` bir iş numarasıdır; önek `docs/config.json` > `prefix` alanındadır (ör. `KES` → `KES-12`, dosyası `docs/tasks/KES-12.md`). Komutlarda `ÖNEK` yerine gerçek öneki yaz. Projeye özgü her şey (kontrol komutu, alanlar/uygulamalar, deneme hesapları, paralel çalışmanın tuzakları) kök `CLAUDE.md`'de ve `docs/knowledge/`'tadır; bu skill onları oradan okur, ezbere varsaymaz.

Bu skill **ana kopyada** çalışır.

## Adım 1: Worktree'yi ve raporu bul

```bash
git worktree list --porcelain | awk '/^worktree /{w=$2} /^branch /{print w, $2}'
grep -l "^# ÖNEK-N rapor" <her worktree>/.worktree/rapor.md
```

Rapor yoksa alt oturum bitmemiştir ya da raporu yazmamıştır: oturumun durumuna `mcp__ccd_session_mgmt__list_sessions` (`linked: true`) ile bak; çalışıyorsa bekle, bittiyse ona `SendMessage` ile raporu iste.

Raporu baştan sona oku. `Durum: takıldı` ise nedenini kullanıcıya göster; birlikte karar verin (alt oturuma talimat, kapsam değişikliği, iptal). Toplamaya geçme.

## Adım 2: Raporu doğrula

Rapor alt oturumun beyanıdır, kanıt değil:

```bash
git -C <wt> status --short            # temiz olmalı
git log --oneline main..<dal>         # rapordaki commit'ler
git diff --stat main...<dal>
```

- Çalışma ağacı kirliyse ya da commit raporla uyuşmuyorsa alt oturuma sor.
- Diff'te kapsam dışı dosya, `docs/` değişikliği ya da brief'teki "Dokunma" alanı varsa kullanıcıya göster.
- Projede diff'e bakan gözden geçirme agent'ları varsa (`.claude/agents/`) büyük işte onlara verilebilir (isteğe bağlı).

## Adım 3: Main'e al (onayla)

Aşağıda `main` projenin ana dalıdır (adı farklıysa onu kullan). Kullanıcıya commit listesini göster ve sor: "ÖNEK-N'in n commit'ini main'e alayım mı?" Onaysız merge yok.

Ana kopyada commit'lenmemiş kod değişikliği varsa önce onu konuş. Sonra doğrusal geçmiş için önce dalı main'in üstüne taşı, sonra ileri sar:

```bash
git -C <wt> rebase main
git merge --ff-only <dal>
```

Rebase çakışırsa:

- Üretilen dosyalar (şema, tip, sözleşme çıktıları): elle çözme; herhangi bir tarafı al, rebase bitince üretim komutunu çalıştır, değişiklik varsa ayrı commit.
- Kilit dosyası: main'inkini al, rebase bitince bağımlılıkları yeniden kur, değişiklik varsa ayrı commit.
- Metin dosyaları ve kod: iki tarafı da koruyarak çöz; emin değilsen kullanıcıya göster.

Rebase sırasında worktree'deki `.worktree/` etkilenmez (git dışı).

## Adım 4: Kontroller

Ana kopyada, projenin kontrol komutu (kök `CLAUDE.md`; `/is-kapat` Adım 1).

Kırmızıysa kapatma: neyin kırıldığını söyle; düzeltme küçükse burada, değilse alt oturuma geri gönder (`SendMessage`).

## Adım 5: İşi kapat

`/is-kapat ÖNEK-N`'in adımlarını uygula; Kabul kanıtı olarak rapordaki maddeleri kullan, ama ✓'leri gerekirse yeniden doğrula (test adı var mı, komut gerçekten geçiyor mu). Rapordaki ⏳ maddeler:

- Yalnız ana oturumda denenebilenler (cihaz, simülatör, tek kopya kaynak) şimdi denenebilir (kullanıcıya sor) ya da iş `review`'a alınır.
- "Sorulanlar" kapanış yorumuna girer.

## Adım 6: Bulgular ve doküman önerileri

- Rapordaki her bulgu için `/is-ac`'ı uygula: önce ara (eşleşme varsa o işe yaz), sonra başlık, etiketler ve Kabul'ü kullanıcıya gösterip onayla aç. Bulgular tek mesajda listelenip tek onayla açılabilir.
- Doküman önerileri: `/is-kapat` Adım 5 gibi; öner, onaylat, yaz.
- "Diğer alanlara etki" doluysa `/is-kapat` Adım 3.

Bunların hepsi iş dosyasıyla birlikte tek `docs:` commit'ine girebilir; mesajı göster, onay al.

## Adım 7: Temizlik

Kullanıcıya sor, onaylarsa:

- Alt oturumu arşivle (`mcp__ccd_session_mgmt__archive_session`); uygulama worktree'sini kendisi temizler.
- Uygulama temizlemediyse: `git worktree remove <wt>` ve `git branch -d <dal>` (dal main'e alındıysa `-d` yeter; `-D` kullanma).

## Kurallar

- Rapor beyandır; diff ve kontrol çıktısı kanıttır.
- Main'e alma ve commit kullanıcı onayıyla; push yok.
- Bulgu iş olarak açılmadan worktree silinmez: rapor worktree ile birlikte gider.
