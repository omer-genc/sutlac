/**
 * Görüntüleyiciden dosya düzenleme: frontmatter alanı güncelleme ve yeni iş şablonu.
 * Dosyanın geri kalanına (sıra, yorumlar, gövde) dokunulmaz.
 */

export type FieldValue = string | string[] | null;

function format(v: FieldValue): string {
  if (v == null) return "";
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  return v;
}

/** Frontmatter'da `key:` satırlarının değerini değiştirir; satır sonu `# yorum` korunur, olmayan alan (boş değilse) sona eklenir. */
export function setFields(src: string, updates: Record<string, FieldValue>): string {
  const m = src.match(/^---(\r?\n)([\s\S]*?)\r?\n---/);
  if (!m) throw new Error("frontmatter yok");
  const nl = m[1]!;
  const lines = m[2]!.split(/\r?\n/);
  for (const [key, value] of Object.entries(updates)) {
    if (!/^[\w-]+$/.test(key)) throw new Error(`geçersiz alan: ${key}`);
    const text = format(value).replace(/[\r\n]+/g, " ").trim();
    const i = lines.findIndex((l) => l.startsWith(`${key}:`));
    if (i < 0) {
      // Olmayan alanı boşaltmak dosyaya boş satır eklemez.
      if (text) lines.push(`${key}: ${text}`);
      continue;
    }
    const comment = lines[i]!.match(/^[\w-]+:\s*[^"'#\n]*?(\s+#\s.*)$/)?.[1] ?? "";
    lines[i] = (text ? `${key}: ${text}` : `${key}:`) + comment;
  }
  return `---${nl}${lines.join(nl)}${nl}---${src.slice(m[0].length)}`;
}

const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, yerel saat

/** Durum değişince `closed`: kapanırken boşsa bugünle dolar, yeniden açılınca temizlenir. */
export function withClosed(
  updates: Record<string, FieldValue>,
  currentClosed: string | null,
  closedStatuses: ReadonlySet<string>,
): Record<string, FieldValue> {
  const status = updates.status;
  if (typeof status !== "string" || "closed" in updates) return updates;
  if (closedStatuses.has(status)) return currentClosed ? updates : { ...updates, closed: today() };
  return { ...updates, closed: null };
}

/** İş şablonundaki gövde (docs/tasks/README.md > Şablon); açıklama yazılmadıysa kullanılır. */
export const TASK_TEMPLATE_BODY = "## Bağlam\n\n\n## Kabul\n1.\n\n## Yapılacaklar\n- [ ]\n\n## Notlar\n";

export function newTaskSource(
  prefix: string,
  num: number,
  t: {
    title: string;
    status: string;
    tags: string[];
    priority: string;
    sprint?: number | null;
    /** Açıklama (markdown); boşsa şablon gövdesi */
    body?: string;
  },
): string {
  let title = t.title.replace(/[\r\n]+/g, " ").trim();
  // Tırnak ya da `[...]` ile başlayan başlık okunurken dizi/tırnaklı değer sanılmasın.
  if (/^["'[]/.test(title)) title = JSON.stringify(title);
  const body = t.body?.trim() ? `${t.body.trim()}\n` : TASK_TEMPLATE_BODY;
  return `---
id: ${prefix}-${num}
title: ${title}
status: ${t.status}
tags: [${t.tags.join(", ")}]
priority: ${t.priority}
sprint: ${t.sprint ?? ""}
created: ${today()}
closed:
---

${body}`;
}

/** Yeni sprint kaydı: bugün başlar, hedef bitiş verilmezse iki hafta sonra. */
export function newSprintSource(s: { name: string; end?: string }): string {
  const end = s.end || new Date(Date.now() + 14 * 86_400_000).toLocaleDateString("sv-SE");
  return `---
name: ${s.name.replace(/[\r\n]+/g, " ").trim()}
start: ${today()}
end: ${end}
closed:
---

## Hedef

`;
}

/** Yeni doküman: H1 başlık; kararlarda numara öneki ve alan bloğu. */
export function newDocSource(title: string, decisionNum: number | null): string {
  const t = title.replace(/[\r\n]+/g, " ").trim();
  if (decisionNum == null) return `# ${t}\n\n`;
  return `# ${String(decisionNum).padStart(4, "0")} · ${t}

- **Tarih:** ${today()}
- **Durum:** öneri

## Bağlam

## Karar

## Sonuçlar
`;
}

/** Dosya adı: Türkçe harfler sadeleşir, küçük harf, tire. */
export function slugify(title: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
  return (
    title
      .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => map[c]!)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "dokuman"
  );
}
