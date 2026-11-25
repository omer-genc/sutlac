/**
 * `docs/config.json`: arayüz başlığı, iş numarası öneki, iş takibinin listeleri (etiketler, durumlar, öncelikler) ve
 * işlere eklenebilen özel alanlar. Görüntüleyicinin board kolonları, filtreleri ve
 * düzenleme seçenekleri buradan gelir. Dosya yoksa DEFAULT_CONFIG kullanılır.
 * Tarayıcı da bu modülü (tipler, renkler) kullanır; dosya okuma sunucudadır.
 */
export const COLORS = ["red", "orange", "amber", "green", "teal", "blue", "purple", "pink", "gray"] as const;
export type Color = (typeof COLORS)[number];

export type Option = { id: string; label: string; color: Color };
export type Status = Option & {
  /** Kapanmış sayılır: "Açık" filtresine girmez, geçişte `closed` tarihi yazılır */
  closed: boolean;
  /** Board'da kolon olarak görünür */
  board: boolean;
};
export type Field = { key: string; label: string; type: "select" | "text"; options: string[] };

export type Config = {
  /** Sekme ve konsoldaki ad */
  title: string;
  /** İş dosyası ve atıf öneki: `KES` → `tasks/KES-12.md`, metinde `KES-12` */
  prefix: string;
  tags: Option[];
  statuses: Status[];
  priorities: Option[];
  fields: Field[];
};

/** Görüntüleyicinin kendisinin yönettiği frontmatter alanları; özel alan adı olamaz. */
export const RESERVED = ["id", "title", "status", "tags", "priority", "created", "closed", "source"];

export const DEFAULT_CONFIG: Config = {
  title: "Docs",
  prefix: "TASK",
  tags: [],
  statuses: [
    { id: "todo", label: "Todo", color: "blue", closed: false, board: true },
    { id: "in-progress", label: "In Progress", color: "amber", closed: false, board: true },
    { id: "review", label: "Review / Test", color: "purple", closed: false, board: true },
    { id: "blocked", label: "Blocked", color: "red", closed: false, board: true },
    { id: "done", label: "Done", color: "green", closed: true, board: true },
    { id: "cancelled", label: "İptal", color: "gray", closed: true, board: false },
  ],
  priorities: [
    { id: "high", label: "High", color: "orange" },
    { id: "normal", label: "Normal", color: "blue" },
    { id: "low", label: "Low", color: "gray" },
  ],
  fields: [],
};

const ID = /^[a-z0-9][a-z0-9_-]*$/i;
/** Dosya adına ve düzenli ifadeye kaçışsız girer. */
const PREFIX = /^[A-Za-z][A-Za-z0-9]*$/;

function check(ok: unknown, msg: string): asserts ok {
  if (!ok) throw new Error(msg);
}

function unique(ids: string[], what: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    check(!seen.has(id), `${what}: "${id}" iki kez var`);
    seen.add(id);
  }
}

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v.trim() : fallback);

/** Gelen JSON'u doğrular ve eksik alanları tamamlayarak düzgün bir Config döner; hatada fırlatır. */
export function normalizeConfig(raw: unknown): Config {
  check(raw && typeof raw === "object", "config bir nesne olmalı");
  const r = raw as Record<string, unknown>;
  const arr = (k: string) => {
    const v = r[k] ?? (DEFAULT_CONFIG as Record<string, unknown>)[k];
    check(Array.isArray(v), `${k} bir liste olmalı`);
    return v as Record<string, unknown>[];
  };
  const option = (o: Record<string, unknown>, what: string): Option => {
    const id = str(o.id);
    check(ID.test(id), `${what}: geçersiz kimlik "${id}" (harf, rakam, - ve _)`);
    const color = str(o.color, "gray") as Color;
    check(COLORS.includes(color), `${what} "${id}": geçersiz renk "${color}"`);
    return { id, label: str(o.label) || id, color };
  };

  const title = str(r.title) || DEFAULT_CONFIG.title;
  const prefix = r.prefix == null ? DEFAULT_CONFIG.prefix : str(r.prefix);
  check(PREFIX.test(prefix), `Önek: geçersiz "${prefix}" (harfle başlar, yalnız harf ve rakam)`);
  const tags = arr("tags").map((o) => option(o, "Etiket"));
  const statuses = arr("statuses").map((o) => ({
    ...option(o, "Durum"),
    closed: o.closed === true,
    board: o.board !== false,
  }));
  const priorities = arr("priorities").map((o) => option(o, "Öncelik"));
  const fields = arr("fields").map((o) => {
    const key = str(o.key);
    check(ID.test(key), `Alan: geçersiz anahtar "${key}"`);
    check(!RESERVED.includes(key), `Alan: "${key}" ayrılmış bir ad`);
    const type = o.type === "select" ? "select" : "text";
    const options = Array.isArray(o.options) ? [...new Set(o.options.map((x) => str(x)).filter(Boolean))] : [];
    return { key, label: str(o.label) || key, type, options } satisfies Field;
  });

  check(statuses.length > 0, "En az bir durum olmalı");
  check(statuses.some((s) => !s.closed), "En az bir açık durum olmalı");
  unique(tags.map((p) => p.id), "Etiket");
  unique(statuses.map((s) => s.id), "Durum");
  unique(priorities.map((p) => p.id), "Öncelik");
  unique(fields.map((f) => f.key), "Alan");
  return { title, prefix, tags, statuses, priorities, fields };
}

export const serializeConfig = (c: Config) => JSON.stringify(c, null, 2) + "\n";
