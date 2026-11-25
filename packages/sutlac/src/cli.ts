#!/usr/bin/env bun
/**
 * sutlac: repodaki `docs/` klasörünü iş takibi olarak kullanan komut satırı.
 *
 *   sutlac [serve]   arayüzü açar            --port 4400 · --no-open · --dir <docs>
 *   sutlac init      docs/ iskeletini kurar  --prefix KES · --title "Ad" · --dir docs
 *   sutlac list      açık işler (satır başına bir iş)  --all · --tag <etiket> · --json
 *   sutlac next      sıradaki iş numarası (`KES-13`)
 *   sutlac check     belgelerdeki yollar ve resim bağlantıları repoda mı
 *   sutlac skills    Claude Code skill ve hook'larını `.claude/`e kopyalar
 *
 * Klasör: `--dir` (ya da DOCS_DIR); verilmezse çalışılan klasörden yukarı doğru ilk `docs/config.json`.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { runCheck } from "./check";
import { DEFAULT_CONFIG, normalizeConfig, serializeConfig } from "./config";
import { DocStore } from "./docs";
import { findRoot, loadConfig, start } from "./server";

const PKG = resolve(import.meta.dir, "..");
const argv = process.argv.slice(2);
const cmd = argv[0] && !argv[0].startsWith("-") ? argv[0] : "serve";
const args = cmd === argv[0] ? argv.slice(1) : argv;
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name: string) => args.includes(name);
const root = () => findRoot(flag("--dir") ?? process.env.DOCS_DIR);

function fail(msg: string): never {
  console.error(`sutlac: ${msg}`);
  process.exit(1);
}

/** Yoksa yazar; varsa dokunmaz. Yazdıysa true. */
function writeNew(file: string, content: string): boolean {
  if (existsSync(file)) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return true;
}

function templateFiles(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? templateFiles(join(dir, e.name), base) : [relative(base, join(dir, e.name))],
  );
}

const commands: Record<string, () => void | Promise<void>> = {
  serve() {
    const assets = join(PKG, "dist");
    if (!existsSync(join(assets, "index.html"))) {
      fail(`arayüz paketlenmemiş (${assets} yok). Paket klasöründe \`bun run build\`, geliştirirken \`bun run dev\`.`);
    }
    start({ root: root(), port: Number(flag("--port") ?? process.env.DOCS_PORT ?? 4400), open: !has("--no-open"), assets });
  },

  init() {
    const dir = resolve(flag("--dir") ?? "docs");
    const prefix = flag("--prefix") ?? DEFAULT_CONFIG.prefix;
    const title = flag("--title") ?? DEFAULT_CONFIG.title;
    const config = normalizeConfig({ ...DEFAULT_CONFIG, prefix, title });
    const rel = relative(process.cwd(), dir) || ".";
    const written: string[] = [];
    if (writeNew(join(dir, "config.json"), serializeConfig(config))) written.push("config.json");
    const tpl = join(PKG, "templates", "docs");
    for (const f of templateFiles(tpl)) {
      const text = readFileSync(join(tpl, f), "utf8").replaceAll("{{PREFIX}}", config.prefix).replaceAll("{{DOCS}}", rel);
      if (writeNew(join(dir, f), text)) written.push(f);
    }
    for (const d of ["tasks", "sprints", "knowledge", "decisions", "images"]) mkdirSync(join(dir, d), { recursive: true });
    console.log(written.length ? `${rel}/ kuruldu: ${written.join(", ")}` : `${rel}/ zaten kurulu; hiçbir dosya değişmedi.`);
    console.log(`\n  Arayüz:   bunx sutlac\n  Skill'ler: bunx sutlac skills   (ya da Claude Code eklentisi; bkz. README)\n`);
  },

  list() {
    const dir = root();
    const cfg = loadConfig(join(dir, "config.json"));
    const store = new DocStore(dir, cfg.prefix);
    const closed = new Set(cfg.statuses.filter((s) => s.closed).map((s) => s.id));
    const order = new Map(cfg.statuses.map((s, i) => [s.id, i]));
    const tag = flag("--tag");
    const tasks = store
      .list()
      .filter((d) => d.kind === "task" && (has("--all") || !closed.has(d.status ?? "")) && (!tag || d.tags.includes(tag)))
      .sort((a, b) => (order.get(a.status ?? "") ?? 99) - (order.get(b.status ?? "") ?? 99) || (a.num ?? 0) - (b.num ?? 0))
      .map((d) => {
        const last = store.get(d.path)?.commentList.at(-1)?.at ?? "";
        return { ref: d.ref, status: d.status, priority: d.priority, tags: d.tags, sprint: d.sprint, title: d.title, comments: d.comments, lastComment: last };
      });
    const sprint = store.list().find((d) => d.kind === "sprint" && !d.closed);
    if (has("--json")) {
      console.log(JSON.stringify({ sprint: sprint ? { num: sprint.num, title: sprint.title, end: sprint.end } : null, tasks }, null, 2));
      return;
    }
    console.log(`# aktif sprint: ${sprint ? `${sprint.num} ${sprint.title}` : "yok"}`);
    console.log("# iş|durum|öncelik|etiketler|sprint|başlık|yorum sayısı|son yorum");
    for (const t of tasks) {
      console.log([t.ref, t.status, t.priority, t.tags.join(","), t.sprint ?? "", t.title, t.comments, t.lastComment].join("|"));
    }
  },

  next() {
    const dir = root();
    const { prefix } = loadConfig(join(dir, "config.json"));
    const re = new RegExp(`^${prefix}-(\\d+)\\.md$`);
    const tasks = join(dir, "tasks");
    const nums = existsSync(tasks) ? readdirSync(tasks).map((f) => Number(f.match(re)?.[1] ?? 0)) : [];
    console.log(`${prefix}-${Math.max(0, ...nums) + 1}`);
  },

  check() {
    const dir = root();
    const repo = dirname(dir);
    const { findings, files, docs } = runCheck(repo, relative(repo, dir));
    if (findings.length) {
      console.error(`Belgelerde repoda olmayan ${findings.length} yol:\n`);
      for (const f of findings) console.error(`  ${f.file}:${f.line}  \`${f.path}\``);
      console.error(`\nYolu düzelt; bilerek repoda olmayan bir yolsa ${relative(repo, dir)}/.checkignore dosyasına ekle.`);
      process.exit(1);
    }
    console.log(`sutlac check: ${files} belgede yollar, ${docs} belgede resim bağlantıları repoda.`);
  },

  /** Eklenti kullanmayanlar için: skill'ler `.claude/skills/`e, hook'lar `.claude/hooks/sutlac/`e ve settings.json'a. */
  skills() {
    const claude = resolve(flag("--to") ?? ".claude");
    for (const name of readdirSync(join(PKG, "skills"))) {
      cpSync(join(PKG, "skills", name), join(claude, "skills", name), { recursive: true });
      console.log(`skill: ${relative(process.cwd(), join(claude, "skills", name))}`);
    }
    if (has("--no-hooks")) return;
    const hookDir = join(claude, "hooks", "sutlac");
    mkdirSync(hookDir, { recursive: true });
    for (const f of readdirSync(join(PKG, "hooks")).filter((f) => f.endsWith(".sh"))) cpSync(join(PKG, "hooks", f), join(hookDir, f));
    // Eklentinin hooks.json'u, yollar proje klasörüne çevrilerek settings.json'a eklenir (bir kez).
    const settingsFile = join(claude, "settings.json");
    const settings = existsSync(settingsFile) ? JSON.parse(readFileSync(settingsFile, "utf8")) : {};
    const raw = readFileSync(join(PKG, "hooks", "hooks.json"), "utf8").replaceAll("${CLAUDE_PLUGIN_ROOT}/hooks/", "$CLAUDE_PROJECT_DIR/.claude/hooks/sutlac/");
    const ours = JSON.parse(raw).hooks as Record<string, { hooks: { command: string }[] }[]>;
    settings.hooks ??= {};
    let added = 0;
    for (const [event, entries] of Object.entries(ours)) {
      const list: { hooks?: { command?: string }[] }[] = (settings.hooks[event] ??= []);
      for (const entry of entries) {
        const command = entry.hooks[0]!.command;
        if (list.some((e) => e.hooks?.some((h) => h.command === command))) continue;
        list.push(entry);
        added++;
      }
    }
    writeFileSync(settingsFile, `${JSON.stringify(settings, null, 2)}\n`);
    console.log(`hook: ${relative(process.cwd(), hookDir)}/ · settings.json'a ${added} kayıt eklendi`);
  },

  help() {
    console.log(readFileSync(import.meta.path, "utf8").match(/\/\*\*\n([\s\S]*?)\n \*\//)![1]!.replace(/^ \* ?/gm, ""));
  },
};

const run = commands[cmd === "--help" || has("--help") || has("-h") ? "help" : cmd];
if (!run) fail(`bilinmeyen komut "${cmd}". \`sutlac help\``);
try {
  await run();
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
