import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";

// Dosyalar elle ve Claude'la da yazılıyor; editörün markdown'ı kendi biçiminde yeniden
// üretmesi (kaçışlar, boş satırlar, tablo biçimi) dokunulmayan yerlerde de fark yaratırdı.
// Bu yüzden kayıt blok bazlıdır: gövde, editöre yüklendiği anda üst düzey bloklarına
// (paragraf, liste, tablo, başlık...) ayrılır ve her bloğun dosyadaki asıl metni saklanır.
// Kaydederken editörün blokları bu listeyle eşlenir (LCS); değişmeyen blok dosyadaki
// metniyle, aradaki boşluklar da asıl haliyle yazılır. Yalnız düzenlenen blok yeniden
// serileştirilir.

type Storage = {
  markdown: {
    getMarkdown(): string;
    serializer: { serialize(node: PMNode): string };
    parser: { md: { parse(src: string, env: object): { level: number; map: [number, number] | null; nesting: number }[] } };
  };
};

export type Snapshot = {
  /** Dosyadaki gövde metni */
  source: string;
  /** Her üst düzey bloğun [başlangıç, bitiş) karakter aralığı */
  ranges: [number, number][];
  /** Aynı blokların editörden çıkan hali (eşleme anahtarı) */
  keys: string[];
};

const storage = (editor: Editor) => editor.storage as unknown as Storage;

function serializeNode(editor: Editor, node: PMNode): string {
  const doc = editor.schema.topNodeType.create(null, [node]);
  return storage(editor).markdown.serializer.serialize(doc).trim();
}

/** Editörün o anki üst düzey bloklarının markdown'ı. */
function blockKeys(editor: Editor): string[] {
  const out: string[] = [];
  editor.state.doc.forEach((node) => out.push(serializeNode(editor, node)));
  return out;
}

/** markdown-it ile üst düzey blokların kaynak aralıkları (editörün kullandığı ayrıştırıcı). */
function sourceRanges(editor: Editor, source: string): [number, number][] {
  const tokens = storage(editor).markdown.parser.md.parse(source, {});
  const lineStart = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === "\n") lineStart.push(i + 1);
  const ranges: [number, number][] = [];
  for (const t of tokens) {
    if (t.level !== 0 || !t.map || t.nesting === -1) continue;
    const start = lineStart[t.map[0]]!;
    let end = t.map[1] < lineStart.length ? lineStart[t.map[1]]! : source.length;
    while (end > start && /\s/.test(source[end - 1]!)) end--;
    ranges.push([start, end]);
  }
  return ranges;
}

/** Editöre gövde yüklendikten hemen sonra çağrılır. */
export function snapshot(editor: Editor, source: string): Snapshot | null {
  const keys = blockKeys(editor);
  const ranges = sourceRanges(editor, source);
  // Blok sayısı tutmazsa (beklenmeyen bir yapı) eşleme güvenilmez; düz serileştirmeye düşülür.
  return keys.length === ranges.length ? { source, ranges, keys } : null;
}

/** Editörün içeriğini, değişmeyen blokları dosyadaki metinleriyle koruyarak markdown'a çevirir. */
export function preservingMarkdown(editor: Editor, snap: Snapshot | null): string {
  if (!snap) return storage(editor).markdown.getMarkdown();
  const now = blockKeys(editor);
  const old = snap.keys;

  // LCS: hangi yeni blok hangi eski bloğun aynısı.
  const n = now.length;
  const m = old.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i]![j] = now[i] === old[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const match = new Array<number>(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (now[i] === old[j]) {
      match[i] = j;
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }

  let out = "";
  for (let i = 0; i < n; i++) {
    const j = match[i]!;
    if (i > 0) {
      const pj = match[i - 1]!;
      // Ardışık iki eski blok yan yana kaldıysa aralarındaki asıl boşluk korunur.
      out += pj >= 0 && j === pj + 1 ? snap.source.slice(snap.ranges[pj]![1], snap.ranges[j]![0]) : "\n\n";
    }
    out += j >= 0 ? snap.source.slice(snap.ranges[j]![0], snap.ranges[j]![1]) : now[i];
  }
  return out;
}
