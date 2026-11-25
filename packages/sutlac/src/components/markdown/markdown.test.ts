import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { splitDoc } from "../../body";
import { escapeText } from "./extensions";

// Editör (tiptap) tarayıcı DOM'u ister; testte happy-dom sağlar. Global kayıt diğer test
// dosyalarını etkilemesin diye yalnız bu dosyanın süresince açık.
beforeAll(() => GlobalRegistrator.register());
afterAll(() => GlobalRegistrator.unregister());

const root = resolve(import.meta.dir, "../../../../../docs");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : n.endsWith(".md") ? [p] : [];
  });

async function load(md: string) {
  const { Editor } = await import("@tiptap/core");
  const { markdownExtensions } = await import("./extensions");
  const { snapshot } = await import("./preserve");
  const editor = new Editor({ extensions: markdownExtensions(), content: md });
  return { editor, snap: snapshot(editor, md) };
}

async function roundTrip(md: string): Promise<string> {
  const { preservingMarkdown } = await import("./preserve");
  const { editor, snap } = await load(md);
  const out = preservingMarkdown(editor, snap);
  editor.destroy();
  return out;
}

describe("escapeText", () => {
  test.each([
    ["[openapi] başlık", "[openapi] başlık"],
    ["SABIT_DEGER ve snake_case", "SABIT_DEGER ve snake_case"],
    ["a * b", "a * b"],
    ["*vurgu*", "\\*vurgu\\*"],
    ["[metin](url)", "\\[metin](url)"],
    ["C:\\yol ve \\*", "C:\\yol ve \\\\\\*"],
    ["~13 sn", "\\~13 sn"],
  ])("%p", (input, want) => {
    expect(escapeText(input, false)).toBe(want);
  });
  test("satır başı liste/başlık işaretleri", () => {
    expect(escapeText("- değil", true)).toBe("\\- değil");
    expect(escapeText("# değil", true)).toBe("\\# değil");
    expect(escapeText("[x] kutu değil", true)).toBe("\\[x] kutu değil");
    expect(escapeText("-değil", true)).toBe("-değil");
  });
});

// Asıl güvence: elle (ya da Claude'la) yazılmış bir dosya editörde açılıp kaydedildiğinde
// gövdesi değişmemeli. Bilinen istisnalar aşağıda, gerekçesiyle.
const KNOWN_LOSSY: Record<string, string> = {};

test("docs/ altındaki her belgenin gövdesi editörden aynı çıkar", async () => {
  const changed: string[] = [];
  for (const file of walk(root)) {
    const rel = file.slice(root.length + 1);
    if (KNOWN_LOSSY[rel]) continue;
    const body = splitDoc(readFileSync(file, "utf8"), { leadBlock: !rel.startsWith("tasks/") }).body;
    const out = await roundTrip(body);
    if (out === body) continue;
    // Ortak önek/sonek dışındaki ilk farklı bölge, bir satır bağlamla.
    const a = body.split("\n");
    const b = out.split("\n");
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    let j = 0;
    while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
    const cut = (l: string[], end: number) => l.slice(Math.max(0, i - 1), Math.min(end, i + 3)).join("\n");
    changed.push(`${rel}\n--- dosya\n${cut(a, a.length - j)}\n--- editör\n${cut(b, b.length - j)}`);
  }
  if (changed.length) console.log(changed.join("\n\n"));
  expect(changed.length).toBe(0);
}, 60_000);

describe("blok koruma", () => {
  const src = "Elle yazılmış \\[etiket] ve\nsatırla bölünmüş paragraf.\n- bitişik liste\n- ikinci\n\n| a | b |\n| --- | --- |\n| `x \\| y` | 1 |\n\nSon paragraf.";

  test("yalnız düzenlenen blok yeniden yazılır, gerisi ve aradaki boşluklar aynı kalır", async () => {
    const { preservingMarkdown } = await import("./preserve");
    const { editor, snap } = await load(src);
    expect(snap).not.toBeNull();
    // Son paragrafın sonuna yazı ekle.
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.commands.insertContent(" Eklendi.");
    const out = preservingMarkdown(editor, snap);
    editor.destroy();
    expect(out).toBe(src.replace("Son paragraf.", "Son paragraf. Eklendi."));
  });

  test("yeni blok eklemek komşu blokları bozmaz", async () => {
    const { preservingMarkdown } = await import("./preserve");
    const { editor, snap } = await load(src);
    editor.commands.setTextSelection(editor.state.doc.content.size);
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: "paragraph", content: [{ type: "text", text: "Yeni" }] });
    const out = preservingMarkdown(editor, snap);
    editor.destroy();
    expect(out).toBe(src + "\n\nYeni");
  });
});

describe("resim", () => {
  const md = "Önce ![](../images/0123456789abcdef.png) sonra.\n\n![ekran](../images/fedcba9876543210.webp)";

  test("göreli yol editörden aynen çıkar", async () => {
    const { editor } = await load(md);
    const out = (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
    editor.destroy();
    expect(out).toBe(md);
  });

  test("ekranda sunucu adresine, kayıtta göreli yola", async () => {
    const { Editor } = await import("@tiptap/core");
    const { markdownExtensions } = await import("./extensions");
    const editor = new Editor({ extensions: markdownExtensions(() => "tasks/KES-1"), content: md });
    const imgs = [...editor.view.dom.querySelectorAll("img[src]")].map((i) => i.getAttribute("src"));
    // Editörün kendi HTML'i yeniden okunursa (kopyala/yapıştır) göreli yol geri gelir.
    const html = editor.getHTML();
    editor.commands.clearContent();
    editor.view.pasteHTML(html);
    const out = (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
    editor.destroy();
    expect(imgs).toEqual(["/images/0123456789abcdef.png", "/images/fedcba9876543210.webp"]);
    expect(out).toBe(md);
  });
});
