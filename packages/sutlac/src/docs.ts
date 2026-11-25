import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, posix, relative } from "node:path";
import { type Comment, splitDoc } from "./body";

/**
 * docs/ üç tür dosya taşır:
 *   task    `tasks/<önek>-N.md`     yapılacak iş; yeri hiç değişmez (önek: config.json `prefix`)
 *   sprint  `sprints/sprint-N.md`   sprint kaydı (tarihler, hedef, devredilenler)
 *   doc     geri kalan her .md       bilgi, karar, rehber; klasörler doküman ağacıdır
 * `tasks/` ve `sprints/` altındaki README'ler biçim belgesidir, listelenmez.
 */
export type Kind = "task" | "sprint" | "doc";

export const kindOf = (rel: string, prefix: string): Kind =>
  new RegExp(`^tasks/${prefix}-\\d+$`).test(rel) ? "task" : /^sprints\/sprint-\d+$/.test(rel) ? "sprint" : "doc";

const HIDDEN = new Set(["tasks/README", "sprints/README"]);

export type DocMeta = {
  /** docs/ altındaki yol, uzantısız: `tasks/KES-1` */
  path: string;
  kind: Kind;
  title: string;
  /** İş numarası, sprint numarası ya da karar numarası (`0007-…`) */
  num: number | null;
  /** İşin metindeki adı: `KES-12`; iş değilse null */
  ref: string | null;
  status: string | null;
  tags: string[];
  priority: string | null;
  /** İşin sprint numarası (`sprint: 3`) */
  sprint: number | null;
  created: string | null;
  closed: string | null;
  source: string | null;
  /** Sprint kaydında: başlangıç ve hedef bitiş */
  start: string | null;
  end: string | null;
  /** Sprint kaydında: kapanışta backlog'a dönen işler (`## Devredilenler` listesi) */
  carried: number[];
  /** Gövdedeki `- [ ]` / `- [x]` sayıları (yorumlar hariç) */
  todos: { done: number; total: number };
  comments: number;
  updated: number;
  /** Frontmatter alanları, düz metin */
  fields: Record<string, string>;
};

export type Doc = DocMeta & {
  /** Başlık nereden düzenlenir: frontmatter `title`, H1 satırı ya da hiçbiri (dosya adı) */
  titleSource: "frontmatter" | "h1" | "none";
  /** Doküman başındaki `- **Alan:** değer` satırları, değer HTML'e çevrilmiş */
  props: { key: string; html: string }[];
  /** Editörde düzenlenen markdown: başlık, alan bloğu ve yorumlar hariç */
  body: string;
  commentList: Comment[];
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

function unquote(v: string): string {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).replace(/\\"/g, '"');
  }
  return v;
}

/** Düz frontmatter: `key: value`, `key: [a, b]`, satır sonu `# yorum`. */
export function parseFrontmatter(src: string): { fields: Record<string, string | string[]>; body: string } {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fields: {}, body: src };
  const fields: Record<string, string | string[]> = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2]!.trim();
    if (!v.startsWith('"') && !v.startsWith("'")) v = v.replace(/\s+#\s.*$/, "").trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      fields[kv[1]!] = v
        .slice(1, -1)
        .split(",")
        .map((s) => unquote(s.trim()))
        .filter(Boolean);
    } else {
      fields[kv[1]!] = unquote(v);
    }
  }
  return { fields, body: src.slice(m[0].length) };
}

function str(v: string | string[] | undefined): string | null {
  if (v == null) return null;
  const s = Array.isArray(v) ? v.join(", ") : v;
  return s === "" ? null : s;
}
const int = (v: string | null) => (v != null && /^\d+$/.test(v) ? Number(v) : null);

/** Görüntüleyici içi link: göreli `.md` linkleri ve düz `<önek>-N` metinleri `#/yol`a döner. */
export function renderInline(md: string, rel: string, prefix: string): string {
  let html = Bun.markdown.html(md, {});
  const dir = posix.dirname(rel);
  html = html.replace(/href="([^"#:]+?)\.md(#[^"]*)?"/g, (_, target: string) => `href="#/${posix.normalize(posix.join(dir, target))}"`);
  const refs = new RegExp(`(<a\\b[\\s\\S]*?<\\/a>|<pre\\b[\\s\\S]*?<\\/pre>|<[^>]+>)|\\b${prefix}-(\\d+)\\b`, "g");
  html = html.replace(refs, (m, skip, n) => (skip ? m : `<a class="ref" href="#/tasks/${prefix}-${n}">${prefix}-${n}</a>`));
  return html.replace(/^<p>|<\/p>\s*$/g, "");
}

export class DocStore {
  private cache = new Map<string, { mtime: number; doc: Doc }>();

  constructor(
    readonly root: string,
    private prefix: string,
  ) {}

  /** Önek değişince (config.json) iş türü ve numaraları yeniden çıkarılır. */
  setPrefix(prefix: string) {
    if (prefix === this.prefix) return;
    this.prefix = prefix;
    this.cache.clear();
  }

  kindOf(rel: string): Kind {
    return kindOf(rel, this.prefix);
  }

  private load(file: string): Doc {
    const mtime = statSync(file).mtimeMs;
    const hit = this.cache.get(file);
    if (hit && hit.mtime === mtime) return hit.doc;

    const rel = relative(this.root, file).split("\\").join("/").replace(/\.md$/, "");
    const kind = kindOf(rel, this.prefix);
    const src = readFileSync(file, "utf8");
    const { fields } = parseFrontmatter(src);
    const parts = splitDoc(src, { leadBlock: kind === "doc" });

    // Doküman başındaki alan bloğu özellik panelinde gösterilir.
    const bold: Record<string, string> = {};
    const props: Doc["props"] = [];
    for (const m of parts.lead.matchAll(/^\s*[-*] \*\*([^*]+):\*\*\s*(.*)$/gm)) {
      const key = m[1]!.trim();
      bold[key] = m[2]!.trim();
      props.push({ key, html: renderInline(m[2]!.trim(), rel, this.prefix) });
    }

    const name = basename(rel);
    const numMatch = name.match(new RegExp(`^${this.prefix}-(\\d+)$`)) ?? name.match(/^sprint-(\d+)$/) ?? name.match(/^(\d{4})-/);
    const num = numMatch ? Number(numMatch[1]) : null;
    const title = str(fields.title) ?? str(fields.name) ?? parts.h1?.text ?? (kind === "sprint" ? `Sprint ${num}` : name);
    const done = (parts.body.match(/^\s*[-*] \[[xX]\]/gm) ?? []).length;
    const total = done + (parts.body.match(/^\s*[-*] \[ \]/gm) ?? []).length;
    const carriedSection = parts.body.match(/^## (?:Carried over|Devredilenler)\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? "";

    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) flat[k] = Array.isArray(v) ? v.join(", ") : v;

    const tags = fields.tags;
    const doc: Doc = {
      path: rel,
      kind,
      title,
      titleSource: fields.title != null ? "frontmatter" : parts.h1 ? "h1" : "none",
      num,
      ref: kind === "task" ? `${this.prefix}-${num}` : null,
      status: str(fields.status) ?? bold["Status"] ?? bold["Durum"] ?? null,
      tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
      priority: str(fields.priority),
      sprint: kind === "task" ? int(str(fields.sprint)) : null,
      created: str(fields.created) ?? bold["Date"] ?? bold["Tarih"] ?? null,
      closed: str(fields.closed),
      source: str(fields.source) ?? bold["Source"] ?? bold["Kaynak"] ?? null,
      start: str(fields.start),
      end: str(fields.end),
      carried: [...carriedSection.matchAll(new RegExp(`\\b${this.prefix}-(\\d+)\\b`, "g"))].map((m) => Number(m[1])),
      todos: { done, total },
      comments: parts.comments.length,
      updated: mtime,
      fields: flat,
      props,
      body: parts.body,
      commentList: parts.comments,
    };
    this.cache.set(file, { mtime, doc });
    return doc;
  }

  list(): DocMeta[] {
    const metas: DocMeta[] = [];
    for (const f of walk(this.root)) {
      const rel = relative(this.root, f).split("\\").join("/").replace(/\.md$/, "");
      if (HIDDEN.has(rel)) continue;
      const { titleSource: _t, props: _p, body: _b, commentList: _c, ...meta } = this.load(f);
      metas.push(meta);
    }
    return metas;
  }

  get(path: string): Doc | null {
    const file = join(this.root, `${path}.md`);
    if (!file.startsWith(this.root) || !Bun.file(file).size) return null;
    try {
      return this.load(file);
    } catch {
      return null;
    }
  }
}
