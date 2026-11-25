import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, expect, test } from "bun:test";

// Gerçek bir hata için: editör kurulurken Tiptap `setEditable`'da update yayıyordu ve
// MarkdownSection bunu kayıt sanıp dosyayı yeniden biçimlendiriyordu (bir belgeyi sadece
// açmak onu değiştiriyordu). Bu test bileşeni React ile kurar, dokunmadan bekler.

beforeAll(() => GlobalRegistrator.register());
afterAll(() => GlobalRegistrator.unregister());

// Düz serileştirmede değişen içerik: bitişik liste (araya boş satır girer), hücrede `\|`
// (tablo bozulur), elle kaçışlanmış `\[` ve `\~`. Disktekini kullanmak yanıltır: bir kez
// bozulmuş dosya artık değişmez görünür.
const body = "Elle yazılmış \\[etiket] ve \\~13 sn.\nSatırla bölünmüş paragraf.\n- bitişik liste\n- ikinci\n\n| a | b |\n| --- | --- |\n| `x \\| y` | 1 |";

async function mount(onSave: (md: string) => void, onEdit?: (el: HTMLElement) => void) {
  const { createElement } = await import("react");
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { MarkdownSection } = await import("./MarkdownEditor");
  const { DEFAULT_CONFIG } = await import("../../config");
  // Editör iş önekini config sorgusundan okur; ağa gitmesin diye önceden doldurulur.
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  client.setQueryData(["config"], DEFAULT_CONFIG);
  const el = document.createElement("div");
  document.body.appendChild(el);
  const r = createRoot(el);
  await act(async () => {
    const editor = createElement(MarkdownSection, { value: body, onSave, onOpenDoc: () => {}, basePath: "knowledge/x" });
    r.render(createElement(QueryClientProvider, { client }, editor));
  });
  await act(async () => {
    onEdit?.(el);
    await new Promise((res) => setTimeout(res, 1200)); // autosave debounce 800 ms
  });
  await act(async () => r.unmount()); // unmount flush da kaydetmemeli
  el.remove();
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("açıp dokunmamak dosyayı kaydetmez", async () => {
  const saves: string[] = [];
  await mount((md) => saves.push(md));
  expect(saves).toEqual([]);
});

test("düzenleme yalnız değişen bloğu yazar", async () => {
  const saves: string[] = [];
  await mount(
    (md) => saves.push(md),
    (el) => {
      const editor = (el.querySelector(".ProseMirror") as unknown as { editor: import("@tiptap/core").Editor }).editor;
      editor.commands.insertContentAt(editor.state.doc.content.size, { type: "paragraph", content: [{ type: "text", text: "Ek." }] });
    },
  );
  expect(saves.length).toBeGreaterThan(0);
  expect(saves.at(-1)).toBe(`${body}\n\nEk.`);
});

test("örnek gerçekten düz serileştirmede değişiyor (test anlamlı mı)", async () => {
  const { Editor } = await import("@tiptap/core");
  const { markdownExtensions } = await import("./extensions");
  const ed = new Editor({ extensions: markdownExtensions(), content: body });
  expect((ed.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown()).not.toBe(body);
  ed.destroy();
});
