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
  [{ tags: [{ id: "api" }, { id: "api" }] }, /appears twice/],
  [{ tags: [{ id: "a b" }] }, /invalid id/],
  [{ tags: [{ id: "api", color: "black" }] }, /invalid color/],
  [{ statuses: [{ id: "done", closed: true }] }, /open status/],
  [{ fields: [{ key: "status" }] }, /reserved/],
  [{ prefix: "K-S" }, /Prefix/],
  [{ prefix: "" }, /Prefix/],
])("geçersiz config reddedilir %#", (raw, msg) => {
  expect(() => normalizeConfig(raw)).toThrow(msg);
});
