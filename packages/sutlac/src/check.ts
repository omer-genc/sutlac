/**
 * `sutlac check`: agent'ın okuduğu belgelerde (CLAUDE.md, skill, agent, docs/knowledge) backtick
 * içinde geçen yolların repoda var olduğunu ve docs/ altındaki `![...](yol)` resim bağlantılarının
 * gösterdiği dosyaların yerinde olduğunu denetler. Eskimiş bir yol typecheck'e de lint'e de
 * görünmez; bir sonraki oturum ona güvenir.
 *
 * Bir yol, ilk parçası repo kökünde ya da bir alt projede (kendi CLAUDE.md'si olan klasör, ör. `apps/api`)
 * var olan bir klasörse denetlenir (`apps/…`, `docs/…`, `src/…`). Alt projeye göreli yol (`src/x.ts`) alt projenin
 * kendi belgesinde o klasöre, başka belgede bağlamdan anlaşılan alt projeye göre aranır (bkz. checkPaths).
 * Git'in yok saydığı klasörlere (`data/`, `dist/`) giden yollar denetlenmez.
 * Bilerek repoda olmayan yollar `docs/.checkignore` dosyasına satır satır yazılır (`#` yorum).
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { Glob } from "bun";

export type Finding = { file: string; line: number; path: string };

const SCOPE = ["CLAUDE.md", "**/CLAUDE.md", ".claude/skills/*/SKILL.md", ".claude/agents/*.md"];
// Yer tutucu ya da desen: gerçek bir dosyayı adlandırmıyor.
const PLACEHOLDER = /[*?<>{}$]|-N\b|NNNN|\.\.\./;
const SKIP_DIR = /(^|\/)(node_modules|\.git|dist|\.worktree|\.claude\/worktrees)(\/|$)/;

const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory();

/** Git'in yok saydığı klasör mü (`data/`, `dist/`): içindeki dosyalar repoda olmaz, yol denetlenmez. Git yoksa false. */
const ignoredCache = new Map<string, boolean>();
function gitIgnored(repo: string, rel: string): boolean {
  const key = `${repo}\0${rel}`;
  let v = ignoredCache.get(key);
  if (v == null) {
    try {
      v = Bun.spawnSync(["git", "-C", repo, "check-ignore", "-q", rel], { stdout: "ignore", stderr: "ignore" }).exitCode === 0;
    } catch {
      v = false;
    }
    ignoredCache.set(key, v);
  }
  return v;
}

function eachLine(text: string, fn: (line: string, idx: number) => void) {
  let inFence = false;
  text.split("\n").forEach((line, idx) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    else if (!inFence) fn(line, idx);
  });
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Metinde yol olarak anılan alt projeler (`apps/api`, `apps/api/src/x.ts`), geçtikleri sırayla. */
function mentions(text: string, subs: readonly string[]): string[] {
  if (!subs.length) return [];
  const re = new RegExp(`(?<![\\w./-])(${subs.map(escapeRe).join("|")})(?![\\w-])`, "g");
  return [...text.matchAll(re)].map((m) => m[1]!);
}

/**
 * Kökte olmayan göreli bir yolun (`src/…`, `scripts/…`) hangi alt projeye ait olduğu: belge tek alt
 * projeden söz ediyorsa o; birden fazlaysa aynı `##` bölümünde yukarı doğru en son anılan. Bulunamazsa undefined.
 */
function contextSub(lines: string[], idx: number, fileSubs: ReadonlySet<string>, subs: readonly string[]): string | undefined {
  if (fileSubs.size === 1) return [...fileSubs][0];
  for (let i = idx; i >= 0; i--) {
    const found = mentions(lines[i]!, subs);
    if (found.length) return found.at(-1);
    if (/^#{1,2}\s/.test(lines[i]!)) break;
  }
  return undefined;
}

/**
 * `subs`: kendi CLAUDE.md'si olan alt klasörler (alt projeler; `apps/api`). Bir yol şuralarda aranır:
 * repo kökü, belgenin kendi alt projesi ya da klasörü, yoksa bağlamdan anlaşılan alt proje.
 * Yalnız bir alt projede anlamlı olan (`src/…`) ama hangisi olduğu anlaşılamayan yol atlanır.
 */
export function checkPaths(repo: string, file: string, text: string, ignore: ReadonlySet<string>, subs: readonly string[] = []): Finding[] {
  const findings: Finding[] = [];
  const dir = dirname(file);
  const ownSub = subs.filter((s) => file.startsWith(`${s}/`)).sort((a, b) => b.length - a.length)[0];
  const own = ownSub ?? (dir === "." ? undefined : dir);
  const lines = text.split("\n");
  const fileSubs = new Set(mentions(text, subs));
  eachLine(text, (line, idx) => {
    for (const m of line.matchAll(/`([^`\s]+)`/g)) {
      const path = m[1]!.replace(/[:#].*$/, "").replace(/[.,;)]+$/, "").replace(/^\.\//, "");
      const first = path.split("/")[0]!;
      if (!path.includes("/") || path.startsWith("/") || PLACEHOLDER.test(path) || ignore.has(path) || ignore.has(m[1]!)) continue;
      const tracked = (base: string) => isDir(join(repo, base, first)) && !gitIgnored(repo, join(base, first));
      const inRoot = tracked(".");
      const inOwn = own != null && tracked(own);
      const inSubs = subs.some(tracked);
      if (!inRoot && !inOwn && !inSubs) continue; // yol değil (ör. `a/b` oranı, paket adı)
      if (existsSync(join(repo, path)) || (own != null && existsSync(join(repo, own, path)))) continue;
      const ctx = ownSub ?? contextSub(lines, idx, fileSubs, subs);
      if (ctx ? existsSync(join(repo, ctx, path)) : !inRoot && inSubs) continue; // yalnız alt projede anlamlı ve hangisi belli değil: bilinemez
      findings.push({ file, line: idx + 1, path: m[1]! });
    }
  });
  return findings;
}

/** Resim bağlantısı: `![alt](yol)` ya da `![alt](yol "başlık")`; dış adresler denetlenmez. */
export function checkImages(repo: string, file: string, text: string, ignore: ReadonlySet<string>): Finding[] {
  const findings: Finding[] = [];
  eachLine(text, (line, idx) => {
    for (const m of line.replace(/`[^`]*`/g, "").matchAll(/!\[[^\]]*\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g)) {
      const src = m[1]!;
      if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("#") || ignore.has(src)) continue;
      const target = src.startsWith("/") ? src.slice(1) : join(dirname(file), decodeURIComponent(src.replace(/[?#].*$/, "")));
      if (!existsSync(join(repo, target))) findings.push({ file, line: idx + 1, path: src });
    }
  });
  return findings;
}

/** `docsRel`: docs klasörünün repo köküne göre yolu (`docs`). */
export function runCheck(repo: string, docsRel: string): { findings: Finding[]; files: number; docs: number } {
  const ignoreFile = join(repo, docsRel, ".checkignore");
  const ignore = new Set(
    existsSync(ignoreFile)
      ? readFileSync(ignoreFile, "utf8").split("\n").map((l) => l.replace(/\s+#.*$/, "").trim()).filter((l) => l && !l.startsWith("#"))
      : [],
  );
  const scan = (pattern: string) => [...new Glob(pattern).scanSync({ cwd: repo, dot: true })].filter((f) => !SKIP_DIR.test(f));
  const files = new Set([...SCOPE, `${docsRel}/knowledge/**/*.md`].flatMap(scan));
  const docFiles = new Set([...files, ...scan(`${docsRel}/**/*.md`)]);
  const findings: Finding[] = [];
  const subs = scan("**/CLAUDE.md").map((f) => dirname(f)).filter((d) => d !== ".");
  for (const f of [...files].sort()) findings.push(...checkPaths(repo, f, readFileSync(join(repo, f), "utf8"), ignore, subs));
  for (const f of [...docFiles].sort()) findings.push(...checkImages(repo, f, readFileSync(join(repo, f), "utf8"), ignore));
  return { findings, files: files.size, docs: docFiles.size };
}
