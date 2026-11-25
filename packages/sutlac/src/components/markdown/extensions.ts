import { Extension, mergeAttributes, type AnyExtension } from "@tiptap/core";
import Code from "@tiptap/extension-code";
import HardBreak from "@tiptap/extension-hard-break";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import Text from "@tiptap/extension-text";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { IMAGE_DIR, IMAGE_NAME, imageLink, imageUrl } from "../../images";

// Editörün markdown'ı dosyaya geri yazarken elle yazılmış dosyayı olabildiğince olduğu gibi
// bırakması için tiptap-markdown (inci-doc'taki paket) üstüne dört düzeltme. Hepsi
// `markdown.test.ts`'teki "docs/ altındaki her belge editörden aynı çıkar" testiyle korunur.
//
// 0. Asıl güvence `preserve.ts`: kayıtta değişmeyen bloklar dosyadaki metinleriyle yazılır.
//    Aşağıdakiler yalnız düzenlenen bloğun nasıl yazılacağını belirler.
// 1. Satır sonları: kaynakta satırla bölünmüş paragraf (`breaks: true`) satır kırılımı olarak
//    okunur ve düz `\n` olarak geri yazılır; aksi halde satırlar tek satırda birleşirdi.
// 2. Kaçış: yalnız markdown'ı gerçekten değiştirecek karakterlerin önüne `\` konur
//    (`[openapi]`, `SABIT_DEGER`, `a * b` olduğu gibi kalır; `~` her zaman kaçışlanır).
// 3. Kod biçimi kalın/italikle birleşebilir: `**`kod`**` kalınlığını kaybetmez.
// 4. Yapılacak listesi de sıkı/aralı bilgisini taşır; sıkı liste aralı olarak yazılmaz.

type State = { text(s: string, escape?: boolean): void; write(s?: string): void; atBlockStart: boolean; inTable?: boolean; out: string };
type PMNode = { text?: string | null; type: unknown; childCount: number; child(i: number): PMNode };

const PUNCT = /[!-/:-@[-`{-~]/;
const WORD = /[\p{L}\p{N}]/u;
const SPACE = /\s/;

/** Metindeki markdown karakterlerinin yalnız anlam değiştirecek olanlarını kaçışlar. */
export function escapeText(str: string, atBlockStart: boolean): string {
  let out = str.replace(/[\\`*_~[]/g, (m, i: number) => {
    const prev = str[i - 1] ?? "";
    const next = str[i + 1] ?? "";
    switch (m) {
      case "\\":
        return PUNCT.test(next) ? "\\\\" : m;
      case "`":
        return "\\`";
      case "~":
        // GitHub tek `~` ile de üstü çizer; her zaman kaçışlanır.
        return "\\~";
      case "*":
        return SPACE.test(prev) && SPACE.test(next) ? m : "\\*";
      case "_":
        return (WORD.test(prev) && WORD.test(next)) || (SPACE.test(prev) && SPACE.test(next)) ? m : "\\_";
      case "[":
        // Yalnız link ya da (satır başında) yapılacak kutusu oluşturacaksa.
        return /^\[[^\]]*\][([:]/.test(str.slice(i)) || (i === 0 && atBlockStart && /^\[[ xX]\](\s|$)/.test(str)) ? "\\[" : m;
      default:
        return m;
    }
  });
  if (atBlockStart) {
    out = out
      .replace(/^([-+*])(\s)/, "\\$1$2")
      .replace(/^>/, "\\>")
      .replace(/^(#{1,6})(\s|$)/, "\\$1$2")
      .replace(/^(\d+)([.)])(\s)/, "$1\\$2$3");
  }
  return out;
}

const MarkdownText = Text.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: State, node: PMNode) {
          state.text(escapeText(node.text ?? "", state.atBlockStart), false);
        },
      },
    };
  },
});

// Kaynaktaki iki tür satır sonu ayrı tutulur: düz satır sonu (`breaks: true` ile kırılım
// olarak okunur) `\n` olarak, sert kırılım (satır sonunda `\` ya da iki boşluk) `\\\n` olarak
// geri yazılır.
const MarkdownHardBreak = HardBreak.extend({
  addAttributes() {
    return {
      hard: { default: false, parseHTML: (el: HTMLElement) => el.getAttribute("data-hard") === "true", renderHTML: () => ({}) },
    };
  },
  addStorage() {
    return {
      markdown: {
        serialize(state: State, node: PMNode & { attrs: { hard?: boolean } }, parent: PMNode, index: number) {
          // Satır sonundaki kırılım yazılmaz (tiptap-markdown ile aynı); tabloda <br>.
          for (let i = index + 1; i < parent.childCount; i++) {
            if (parent.child(i).type !== node.type) {
              state.write(state.inTable ? "<br>" : node.attrs.hard ? "\\\n" : "\n");
              return;
            }
          }
        },
        parse: {
          setup(md: { renderer: { rules: Record<string, () => string> } }) {
            md.renderer.rules.hardbreak = () => '<br data-hard="true">\n';
          },
        },
      },
    };
  },
});

// `excludes: ""` kod işaretinin diğer işaretlerle birlikte durmasına izin verir. Şemada
// kalın/italikten sonra tanımlandığı için en içte kalır, serileştirici onu kaçışsız yazar.
const MixableCode = Code.extend({ excludes: "" });

const TightTaskLists = Extension.create({
  name: "tightTaskLists",
  addGlobalAttributes() {
    return [
      {
        types: ["taskList"],
        attributes: {
          tight: {
            default: true,
            parseHTML: (el: HTMLElement) => el.getAttribute("data-tight") === "true" || !el.querySelector("p"),
            renderHTML: (attrs: Record<string, unknown>) => (attrs.tight ? { "data-tight": "true" } : {}),
          },
        },
      },
    ];
  },
});

// Resim: markdown'da belgeye göreli yol (`../images/<id>.png`) durur, `src` niteliği onu
// aynen taşır ve aynen yazılır. Yalnız ekranda sunucunun `/images/` adresine çevrilir;
// editörün kendi HTML'inden yapıştırılan `/images/<id>` de geri göreli yola döner.
const DocImage = Image.extend<{ docPath: () => string } & Record<string, unknown>>({
  addOptions() {
    return { ...this.parent?.(), docPath: () => "" };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const src = el.getAttribute("src") ?? "";
          const served = src.match(new RegExp(`^/${IMAGE_DIR}/([^/?#]+)$`))?.[1];
          return served && IMAGE_NAME.test(served) ? imageLink(this.options.docPath(), served) : src;
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src ? imageUrl(String(HTMLAttributes.src), this.options.docPath()) : HTMLAttributes.src;
    return ["img", mergeAttributes(this.options.HTMLAttributes as Record<string, unknown>, HTMLAttributes, { src })];
  },
});

/** Editör ve test için ortak eklenti listesi (iş çipleri, placeholder ve menü hariç). */
export function markdownExtensions(docPath: () => string = () => ""): AnyExtension[] {
  return [
    // inline: `![](...)` paragrafın içinde durur; blok resim satırı paragraftan koparırdı.
    DocImage.configure({ inline: true, allowBase64: false, docPath }),
    StarterKit.configure({ underline: false, text: false, hardBreak: false, code: false, link: { openOnClick: false } }),
    MarkdownText,
    MarkdownHardBreak,
    MixableCode,
    TaskList,
    TaskItem.configure({ nested: true }),
    TightTaskLists,
    // resizable kapalı: kolon genişlikleri markdown'a yazılamaz, kalıcı olmazdı.
    TableKit.configure({ table: { resizable: false } }),
    Markdown.configure({ html: false, breaks: true, transformPastedText: true }),
  ];
}
