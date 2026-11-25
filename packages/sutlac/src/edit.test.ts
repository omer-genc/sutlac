import { describe, expect, test } from "bun:test";
import { parseFrontmatter } from "./docs";
import { newTaskSource, setFields, withClosed } from "./edit";

const src = `---
id: KES-9
title: Örnek iş
status: todo          # todo | in-progress | blocked | done | cancelled
tags: [api]
priority: normal
musteri:
created: 2026-10-01
closed:
---

## Bağlam
- **Durum:** gövdedeki bu satır alan değil
`;

describe("setFields", () => {
  test("yalnız istenen satırı değiştirir, yorumu ve gövdeyi korur", () => {
    const out = setFields(src, { status: "in-progress", tags: ["api", "web"], musteri: "keskin" });
    expect(out).toContain("status: in-progress          # todo | in-progress");
    expect(out).toContain("tags: [api, web]");
    expect(out).toContain("musteri: keskin");
    expect(out.split("\n---\n")[1]).toBe(src.split("\n---\n")[1]);
    const { fields } = parseFrontmatter(out);
    expect(fields.status).toBe("in-progress");
    expect(fields.tags).toEqual(["api", "web"]);
  });

  test("null alanı boşaltır, olmayan alanı ekler; olmayanı boşaltmak satır eklemez", () => {
    const out = setFields(src, { created: null, source: "inci-doc #api-1", sprint: null });
    expect(out).toContain("\ncreated:\n");
    expect(parseFrontmatter(out).fields.source).toBe("inci-doc #api-1");
    expect(out).not.toContain("sprint:");
  });

  test("değere satır sonu sızamaz", () => {
    const out = setFields(src, { musteri: "a\nstatus: done" });
    expect(parseFrontmatter(out).fields.status).toBe("todo");
  });

  test("frontmatter yoksa hata", () => {
    expect(() => setFields("# Başlık\n", { status: "done" })).toThrow();
  });
});

const CLOSED = new Set(["done", "cancelled"]);

describe("withClosed", () => {
  test("kapanınca bugünü yazar, kapalıysa tarihi korur, açılınca temizler", () => {
    expect(withClosed({ status: "done" }, null, CLOSED).closed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(withClosed({ status: "done" }, "2026-01-01", CLOSED)).toEqual({ status: "done" });
    expect(withClosed({ status: "todo" }, "2026-01-01", CLOSED)).toEqual({ status: "todo", closed: null });
    expect(withClosed({ priority: "high" }, null, CLOSED)).toEqual({ priority: "high" });
  });
});

test("newTaskSource okunabilir frontmatter üretir", () => {
  const out = newTaskSource("KES", 151, { title: "[api] Yeni [iş]", status: "todo", tags: ["api"], priority: "high" });
  const { fields } = parseFrontmatter(out);
  expect(fields.id).toBe("KES-151");
  expect(fields.title).toBe("[api] Yeni [iş]");
  expect(fields.status).toBe("todo");
  expect(fields.tags).toEqual(["api"]);
});
