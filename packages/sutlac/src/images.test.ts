import { describe, expect, test } from "bun:test";
import { imageId, imageLink, imageUrl, resolveRelative } from "./images";

describe("images", () => {
  test("id içerikten: aynı bayt aynı id, 16 hex", async () => {
    const a = await imageId(new TextEncoder().encode("x").buffer as ArrayBuffer);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(await imageId(new TextEncoder().encode("x").buffer as ArrayBuffer)).toBe(a);
    expect(await imageId(new TextEncoder().encode("y").buffer as ArrayBuffer)).not.toBe(a);
  });

  test("belgeden göreli bağlantı", () => {
    expect(imageLink("tasks/KES-1", "a.png")).toBe("../images/a.png");
    expect(imageLink("knowledge/alt/x", "a.png")).toBe("../../images/a.png");
    expect(imageLink("README", "a.png")).toBe("./images/a.png");
  });

  test("göreli yol çözümü", () => {
    expect(resolveRelative("../images/a.png", "tasks/KES-1")).toBe("images/a.png");
    expect(resolveRelative("../../x.png", "tasks/KES-1")).toBeNull();
    expect(resolveRelative("https://x/y.png", "tasks/KES-1")).toBeNull();
  });

  test("ekran adresi yalnız images/ altındaki id adları için", () => {
    expect(imageUrl("../images/0123456789abcdef.png", "tasks/KES-1")).toBe("/images/0123456789abcdef.png");
    expect(imageUrl("../images/foto.png", "tasks/KES-1")).toBe("../images/foto.png");
    expect(imageUrl("https://x/y.png", "tasks/KES-1")).toBe("https://x/y.png");
  });
});
