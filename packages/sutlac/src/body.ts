/**
 * Bir md belgesini görüntüleyicinin düzenlediği parçalara ayırır ve geri birleştirir:
 *
 *   head      frontmatter; frontmatter'da başlık yoksa ilk `# Başlık` satırı ve
 *             (karar/bilgi sayfalarında) hemen altındaki `- **Alan:** değer` bloğu
 *   body      editörde düzenlenen markdown
 *   comments  dosyanın sonundaki `## Yorumlar` bölümü:
 *
 *               ## Yorumlar
 *
 *               ### 2026-10-24 21:30
 *
 *               Yorum metni (markdown)
 *
 * Birleştirme head'e ve yorumlara dokunmaz; yalnız değişen parça yeniden yazılır.
 */

export type Comment = { at: string; body: string };
export type Parts = {
  /** Gövdeden önceki metnin birebir kopyası (frontmatter, H1, alan bloğu, boşluklar) */
  top: string;
  /** Başlık frontmatter'da değil H1 satırındaysa; numara öneki (`0001 · `) ayrı tutulur */
  h1: { prefix: string; text: string } | null;
  /** Karar/bilgi sayfasının başındaki `- **Alan:** değer` bloğu */
  lead: string;
  body: string;
  comments: Comment[];
};

export const COMMENTS_HEADING = "## Yorumlar";
/** Yorum başlığı: `### 2026-10-24 21:30`; saat eski kayıtlarda olmayabilir. */
const COMMENT_RE = /^### (\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?)$/gm;
const H1_RE = /^(\s*)# (\d{4}\s*·\s*)?(.*)$/m;

export function splitDoc(src: string, opts: { leadBlock: boolean }): Parts {
  const text = src.replace(/\r\n/g, "\n");
  let i = 0;
  const fm = text.match(/^---\n[\s\S]*?\n---\n?/);
  if (fm) i = fm[0].length;
  let h1: Parts["h1"] = null;
  if (!(fm && /^title:/m.test(fm[0]))) {
    const m = text.slice(i).match(/^\s*# .*(?:\n|$)/);
    if (m) {
      const p = m[0].match(H1_RE)!;
      h1 = { prefix: p[2] ?? "", text: p[3]!.trim() };
      i += m[0].length;
    }
  }
  let lead = "";
  if (opts.leadBlock) {
    const m = text.slice(i).match(/^\s*(?:[-*] \*\*[^*]+:\*\*.*(?:\n|$))+/);
    if (m) {
      lead = m[0].trim();
      i += m[0].length;
    }
  }
  i += text.slice(i).match(/^\s*/)![0].length;
  const top = text.slice(0, i);
  let rest = text.slice(i);
  let comments: Comment[] = [];
  const at = commentsStart(rest);
  if (at >= 0) {
    comments = parseComments(rest.slice(at + COMMENTS_HEADING.length));
    rest = rest.slice(0, at);
  }
  return { top, h1, lead, body: rest.trim(), comments };
}

/**
 * Yorum bölümünün başladığı karakter: kod bloğu dışında kalan ve dosyanın son `## ` bölümü
 * olan `## Yorumlar` satırı. Metinde (ör. kod örneğinde) geçen başlık yorum sayılmaz.
 */
function commentsStart(text: string): number {
  let fence: string | null = null;
  let offset = 0;
  let found = -1;
  for (const line of text.split("\n")) {
    const f = line.match(/^\s*(```+|~~~+)/)?.[1];
    if (f && (!fence || f.startsWith(fence))) fence = fence ? null : f;
    else if (!fence && /^## /.test(line)) found = new RegExp(`^${COMMENTS_HEADING}\\s*$`).test(line) ? offset : -1;
    offset += line.length + 1;
  }
  return found;
}

/** H1 satırındaki başlığı değiştirir; numara öneki ve çevresi aynen kalır. */
export function withTitle(p: Parts, title: string): Parts {
  if (!p.h1) throw new Error("the title is not on an H1 line");
  const text = title.replace(/[\r\n]+/g, " ").trim();
  return { ...p, h1: { ...p.h1, text }, top: p.top.replace(H1_RE, (_, ws, prefix = "") => `${ws}# ${prefix}${text}`) };
}

function parseComments(section: string): Comment[] {
  const marks = [...section.matchAll(COMMENT_RE)];
  return marks.map((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1]!.index! : section.length;
    return { at: m[1]!, body: section.slice(start, end).trim() };
  });
}

export function joinDoc(p: Parts): string {
  const top = p.top && !p.top.endsWith("\n") ? p.top + "\n" : p.top;
  let out = top + (p.body.trim() ? p.body.trim() + "\n" : "");
  if (p.comments.length) {
    out +=
      (out ? "\n" : "") +
      `${COMMENTS_HEADING}\n\n` +
      p.comments.map((c) => `### ${c.at}\n\n${c.body.trim()}\n`).join("\n");
  }
  return out;
}

/**
 * Yorum metni bölüm yapısını bozmasın: `## ` başlığı yorum bölümünü, `### <tarih saat>` satırı
 * yeni bir yorumu başlatırdı; ikisi de bir seviye küçültülür.
 */
export function safeCommentBody(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/^(#{1,2}) /gm, "### ")
    .replace(/^### (?=\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?$)/gm, "#### ")
    .trim();
}

export const nowStamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.toLocaleDateString("sv-SE")} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
