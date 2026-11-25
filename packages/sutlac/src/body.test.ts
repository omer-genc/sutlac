import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { joinDoc, safeCommentBody, splitDoc, withTitle } from "./body";

const root = resolve(import.meta.dir, "../../../docs");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
  });

// Dokunulmayan parça olduğu gibi geri yazılmalı: görüntüleyici bir dosyayı yalnız
// açıp kaydettiğinde (ya da sadece yorum eklediğinde) içerik kaymasın.
test("docs/ altındaki her dosya ayrılıp birleşince aynı kalır", () => {
  const broken: string[] = [];
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const leadBlock = !file.includes("/tasks/");
    const norm = (s: string) => s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trimEnd();
    if (norm(joinDoc(splitDoc(src, { leadBlock }))) !== norm(src)) broken.push(file);
  }
  expect(broken).toEqual([]);
});

const task = `---
id: KES-1
title: Başlık
status: todo
---

## Bağlam
Metin.

## Yorumlar

### 2026-10-24 21:30

İlk yorum
- madde

### 2026-10-25 09:00

İkinci
`;

describe("splitDoc", () => {
  test("task: frontmatter, gövde ve yorumlar", () => {
    const p = splitDoc(task, { leadBlock: false });
    expect(p.h1).toBeNull();
    expect(p.body).toBe("## Bağlam\nMetin.");
    expect(p.comments).toEqual([
      { at: "2026-10-24 21:30", body: "İlk yorum\n- madde" },
      { at: "2026-10-25 09:00", body: "İkinci" },
    ]);
  });

  test("karar: numaralı H1 ve alan bloğu head'de kalır", () => {
    const src = "# 0001 · Karar adı\n\n- **Tarih:** 2026-10-24\n- **Durum:** kabul\n\n## Bağlam\n\nX\n";
    const p = splitDoc(src, { leadBlock: true });
    expect(p.h1).toEqual({ prefix: "0001 · ", text: "Karar adı" });
    expect(p.lead).toBe("- **Tarih:** 2026-10-24\n- **Durum:** kabul");
    expect(p.body).toBe("## Bağlam\n\nX");
    expect(joinDoc(withTitle(p, "Yeni ad"))).toBe(src.replace("Karar adı", "Yeni ad"));
  });

  test("yorum eklemek gövdeye dokunmaz", () => {
    const p = splitDoc(task, { leadBlock: false });
    const out = joinDoc({ ...p, comments: [...p.comments, { at: "2026-10-26 10:00", body: "Üç" }] });
    expect(out.startsWith(task.trimEnd())).toBe(true);
    expect(splitDoc(out, { leadBlock: false }).comments).toHaveLength(3);
  });
});

test("kod bloğundaki ya da son bölüm olmayan `## Yorumlar` yorum sayılmaz", () => {
  const inFence = "## Biçim\n\n```md\n## Yorumlar\n\n### 2026-01-01 10:00\n\nörnek\n```\n";
  expect(splitDoc(inFence, { leadBlock: false }).comments).toEqual([]);
  expect(splitDoc(inFence, { leadBlock: false }).body).toBe(inFence.trim());
  const notLast = "## Yorumlar\n\nmetin\n\n## Sonra\n\nbaşka";
  expect(splitDoc(notLast, { leadBlock: false }).body).toBe(notLast);
});

test("safeCommentBody bölüm başlıklarını küçültür", () => {
  expect(safeCommentBody("## Başlık\n### 2026-01-01 10:00\n### Alt başlık\nmetin")).toBe("### Başlık\n#### 2026-01-01 10:00\n### Alt başlık\nmetin");
});
