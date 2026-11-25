/**
 * Belgelerdeki resimler. Hepsi tek klasörde, `docs/images/<id>.<uzantı>`; belge başına klasör
 * yok, orijinal dosya adı tutulmaz. id içeriğin SHA-256 özetinin ilk 16 hex hanesidir: aynı
 * resim iki kez yapıştırılırsa tek dosya olur, ad hiçbir zaman çakışmaz ya da değişmez.
 * Belge resme göreli yolla bağlanır (`tasks/KES-1.md` → `![](../images/<id>.png)`); böylece
 * dosya GitHub'da ve düz metinde de okunur. Sunucu da arayüz de bu modülü kullanır.
 */

export const IMAGE_DIR = "images";

/** Kabul edilen türler → uzantı. SVG yok: içinde betik taşıyabilir. */
export const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Ekran görüntüsüne yeter, repoyu şişirmez. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** `images/` altındaki geçerli dosya adı: `<16 hex>.<uzantı>` */
export const IMAGE_NAME = /^[0-9a-f]{16}\.(png|jpg|webp|gif)$/;

export const IMAGE_MIME: Record<string, string> = Object.fromEntries(Object.entries(IMAGE_TYPES).map(([t, e]) => [e, t]));

export async function imageId(bytes: ArrayBuffer): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...hash.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Belge yolundan (`tasks/KES-1`, `knowledge/a/b`) resme göreli bağlantı. */
export function imageLink(docPath: string, name: string): string {
  const depth = docPath.split("/").length - 1;
  return `${depth ? "../".repeat(depth) : "./"}${IMAGE_DIR}/${name}`;
}

/** Belgedeki göreli resim yolunu docs/ köküne göre çözer; dış adres ya da kök dışıysa null. */
export function resolveRelative(src: string, docPath: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("/") || src.startsWith("#")) return null;
  const parts = docPath.split("/").slice(0, -1);
  for (const seg of src.replace(/[?#].*$/, "").split("/")) {
    if (seg === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else if (seg && seg !== ".") parts.push(decodeURIComponent(seg));
  }
  return parts.join("/");
}

/** Görüntüleyicinin resmi göstereceği adres: `images/` altındaysa sunucunun `/images/` ucu. */
export function imageUrl(src: string, docPath: string): string {
  const rel = resolveRelative(src, docPath);
  if (rel == null) return src;
  const name = rel.startsWith(`${IMAGE_DIR}/`) ? rel.slice(IMAGE_DIR.length + 1) : null;
  return name && IMAGE_NAME.test(name) ? `/${IMAGE_DIR}/${name}` : src;
}
