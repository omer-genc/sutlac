import { expect, test } from "bun:test";
import { DEFAULT_CONFIG, normalizeConfig } from "./config";

test("eksik listeler varsayılandan tamamlanır, bayraklar düzelir", () => {
  const c = normalizeConfig({ statuses: [{ id: "todo" }, { id: "done", closed: true }] });
  expect(c.tags).toEqual(DEFAULT_CONFIG.tags);
  expect(c.prefix).toBe(DEFAULT_CONFIG.prefix);
  expect(c.title).toBe(DEFAULT_CONFIG.title);
  expect(c.statuses).toEqual([
    { id: "todo", label: "todo", color: "gray", closed: false, board: true },
    { id: "done", label: "done", color: "gray", closed: true, board: true },
  ]);
});

test("özel alan seçenekleri tekilleşir, tip bilinmiyorsa metin olur", () => {
  const c = normalizeConfig({ fields: [{ key: "sprint", type: "select", options: ["1", "2", "1", ""] }, { key: "not", type: "?" }] });
  expect(c.fields).toEqual([
    { key: "sprint", label: "sprint", type: "select", options: ["1", "2"] },
    { key: "not", label: "not", type: "text", options: [] },
  ]);
});

test.each([
  [{ tags: [{ id: "api" }, { id: "api" }] }, /iki kez/],
  [{ tags: [{ id: "a b" }] }, /geçersiz kimlik/],
  [{ tags: [{ id: "api", color: "black" }] }, /geçersiz renk/],
  [{ statuses: [{ id: "done", closed: true }] }, /açık durum/],
  [{ fields: [{ key: "status" }] }, /ayrılmış/],
  [{ prefix: "K-S" }, /Önek/],
  [{ prefix: "" }, /Önek/],
])("geçersiz config reddedilir %#", (raw, msg) => {
  expect(() => normalizeConfig(raw)).toThrow(msg);
});
