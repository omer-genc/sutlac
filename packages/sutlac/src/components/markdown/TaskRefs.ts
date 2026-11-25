import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

// Metindeki `KES-12` (önek config.json `prefix`) atıflarını çip olarak gösterir ve tıklanınca o işi açar. Belgeye
// düğüm eklemez (yalnız dekorasyon), bu yüzden markdown'a geri yazılan metin aynı kalır.
// inci-doc'taki RefNode'un dosya tabanlı karşılığı.

function build(doc: PMNode, prefix: string): DecorationSet {
  const decos: Decoration[] = [];
  if (!prefix) return DecorationSet.create(doc, decos);
  const re = new RegExp(`\\b${prefix}-(\\d+)\\b`, "g");
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    // Kod içindeki atıf çip olmaz (inci-doc kuralı).
    if (node.marks.some((m) => m.type.name === "code")) return;
    for (const m of node.text.matchAll(re)) {
      const from = pos + m.index!;
      decos.push(Decoration.inline(from, from + m[0].length, { class: "ref", "data-ref": `tasks/${prefix}-${m[1]}` }));
    }
  });
  return DecorationSet.create(doc, decos);
}

export const TaskRefs = Extension.create<{ prefix: string; onOpen: (path: string) => void }>({
  name: "taskRefs",
  addOptions() {
    return { prefix: "", onOpen: () => {} };
  },
  addProseMirrorPlugins() {
    const onOpen = () => this.options.onOpen;
    const { prefix } = this.options;
    return [
      new Plugin({
        key: new PluginKey("taskRefs"),
        state: {
          init: (_, { doc }) => build(doc, prefix),
          apply: (tr, old) => (tr.docChanged ? build(tr.doc, prefix) : old),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick(_view, _pos, event) {
            const el = (event.target as HTMLElement).closest<HTMLElement>("[data-ref]");
            if (!el) return false;
            onOpen()(el.dataset.ref!);
            return true;
          },
        },
      }),
    ];
  },
});
