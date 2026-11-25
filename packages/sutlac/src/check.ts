/**
 * `sutlac check`: agent'ın okuduğu belgelerde (CLAUDE.md, skill, agent, docs/knowledge) backtick
 * içinde geçen yolların repoda var olduğunu ve docs/ altındaki `![...](yol)` resim bağlantılarının
 * gösterdiği dosyaların yerinde olduğunu denetler. Eskimiş bir yol typecheck'e de lint'e de
 * görünmez; bir sonraki oturum ona güvenir.
 *
 * Bir yol, ilk parçası repo kökünde var olan bir klasörse denetlenir (`apps/…`, `docs/…`, `src/…`).
 * Kök dışındaki bir CLAUDE.md'de (ör. `apps/api/CLAUDE.md`) yol önce o klasöre göre aranır.
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

function eachLine(text: string, fn: (line: string, idx: number) => void) {
  let inFence = false;
  text.split("\n").forEach((line, idx) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    else if (!inFence) fn(line, idx);
  });
}

export function checkPaths(repo: string, file: string, text: string, ignore: ReadonlySet<string>): Finding[] {
  const findings: Finding[] = [];
  const own = dirname(file);
  eachLine(text, (line, idx) => {
    for (const m of line.matchAll(/`([^`\s]+)`/g)) {
      const path = m[1]!.replace(/[:#].*$/, "").replace(/[.,;)]+$/, "").replace(/^\.\//, "");
      const first = path.split("/")[0]!;
      if (!path.includes("/") || path.startsWith("/") || PLACEHOLDER.test(path) || ignore.has(path) || ignore.has(m[1]!)) continue;
      const fromOwn = own !== "." && isDir(join(repo, own, first));
      if (!fromOwn && !isDir(join(repo, first))) continue; // yol değil (ör. `a/b` oranı, paket adı)
      if (existsSync(join(repo, path)) || (fromOwn && existsSync(join(repo, own, path)))) continue;
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
  for (const f of [...files].sort()) findings.push(...checkPaths(repo, f, readFileSync(join(repo, f), "utf8"), ignore));
  for (const f of [...docFiles].sort()) findings.push(...checkImages(repo, f, readFileSync(join(repo, f), "utf8"), ignore));
  return { findings, files: files.size, docs: docFiles.size };
}
