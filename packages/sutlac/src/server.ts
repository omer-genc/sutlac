/**
 * docs/ klasörünü (işler, sprintler, kararlar, bilgi) tarayıcıda gösteren ve düzenleyen yerel sunucu.
 * Arayüz React (src/frontend.tsx). İki biçimde sunulur:
 *   - geliştirme (src/dev.ts): Bun'ın HTML import'u, çalışma anında paketlenir, HMR açık
 *   - yayın (src/cli.ts): `bun run build` ile önceden paketlenmiş `dist/` klasörü, bağımlılıksız
 * Klasör: `--dir` (ya da DOCS_DIR); verilmezse çalışılan klasörden yukarı doğru ilk `docs/config.json`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, watch } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import type { HTMLBundle } from "bun";
import { joinDoc, nowStamp, safeCommentBody, splitDoc, withTitle } from "./body";
import { type Config, DEFAULT_CONFIG, normalizeConfig, serializeConfig } from "./config";
import { DocStore } from "./docs";
import { type FieldValue, newDocSource, newSprintSource, newTaskSource, setFields, slugify, withClosed } from "./edit";
import { IMAGE_DIR, IMAGE_MIME, IMAGE_NAME, IMAGE_TYPES, MAX_IMAGE_BYTES, imageId } from "./images";

/** `given` (--dir / DOCS_DIR) ya da `from`'dan yukarı doğru ilk `docs/config.json`'ın klasörü. */
export function findRoot(given?: string, from = process.cwd()): string {
  if (given) {
    const dir = resolve(given);
    if (!existsSync(dir)) throw new Error(`${dir} does not exist`);
    return dir;
  }
  for (let dir = from; ; dir = dirname(dir)) {
    if (existsSync(resolve(dir, "docs", "config.json"))) return resolve(dir, "docs");
    if (dirname(dir) === dir) throw new Error("docs/config.json not found; create it with `sutlac init` or pass the folder with --dir");
  }
}

export function loadConfig(file: string): Config {
  if (!existsSync(file)) return DEFAULT_CONFIG;
  return normalizeConfig(JSON.parse(readFileSync(file, "utf8")));
}

export type StartOptions = {
  /** docs/ klasörünün mutlak yolu */
  root: string;
  port?: number;
  open?: boolean;
  /** Geliştirmede HTML import'u (HMR'li); yoksa `assets` klasöründeki paketlenmiş arayüz sunulur */
  index?: HTMLBundle;
  /** Önceden paketlenmiş arayüz klasörü (`dist/`) */
  assets?: string;
};

type DocPatch = {
  fields?: Record<string, FieldValue>;
  title?: string;
  /** Yeni gövde; `baseBody` editörün başladığı gövdedir, diskteki farklıysa 409 */
  body?: string;
  baseBody?: string;
};

type CommentRef = { index: number; at: string };

export function start(opts: StartOptions) {
const { root } = opts;
const configFile = resolve(root, "config.json");
const wantedPort = opts.port ?? 4400;
const assets = opts.assets ? resolve(opts.assets) : null;
const page = (): Response =>
  assets && existsSync(resolve(assets, "index.html"))
    ? new Response(Bun.file(resolve(assets, "index.html")), { headers: { "cache-control": "no-store" } })
    : new Response("The UI is not built: run `bun run build` in the package folder.", { status: 500 });

const store = new DocStore(root, loadConfig(configFile).prefix);

// Dosya değişince açık sekmeler listeyi ve açık belgeyi yeniler.
const clients = new Set<ReadableStreamDefaultController<string>>();
let pending: ReturnType<typeof setTimeout> | undefined;
watch(root, { recursive: true }, (_, name) => {
  if (name === "config.json") {
    try {
      store.setPrefix(loadConfig(configFile).prefix);
    } catch {} // bozuk config /api/config'te hata olarak görünür
  }
  clearTimeout(pending);
  pending = setTimeout(() => {
    for (const c of clients) c.enqueue("data: change\n\n");
  }, 150);
});

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
const conflict = (what = "The file") => json({ error: `${what} changed elsewhere in the meantime; reload and try again.` }, 409);
const pathOf = (req: Request, prefix: string) => decodeURIComponent(new URL(req.url).pathname.slice(prefix.length));

/** docs/ dışına çıkmayan, var olan bir .md dosyasının mutlak yolu. */
function fileOf(path: string): string | null {
  const file = resolve(root, `${path}.md`);
  return file.startsWith(root + sep) && existsSync(file) ? file : null;
}

/**
 * Yazma uçları yalnız uygulamanın kendi sayfasından çağrılır: özel başlık başka bir sitenin
 * tarayıcıdan istek atmasını CORS ön kontrolüne takar, Origin de kontrol edilir.
 */
async function writeGuard(req: Request, fn: () => Promise<Response>): Promise<Response> {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (req.headers.get("x-sutlac") !== "1" || (origin && new URL(origin).host !== host)) {
    return json({ error: "not allowed" }, 403);
  }
  try {
    return await fn();
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
}

/** Dosyayı okuyup `edit` ile dönüştürür ve yazar; güncel belgeyi döner. */
async function rewrite(path: string, edit: (src: string) => string | Response): Promise<Response> {
  const file = fileOf(path);
  if (!file) return json({ error: "not found" }, 404);
  const out = edit(await Bun.file(file).text());
  if (out instanceof Response) return out;
  await Bun.write(file, out);
  return json(store.get(path));
}

function serve(port: number) {
  return Bun.serve({
    port,
    hostname: "127.0.0.1",
    idleTimeout: 0,
    development: opts.index != null && process.env.NODE_ENV !== "production" && { hmr: true, console: true },
    routes: {
      "/": opts.index ?? page,
      "/api/docs": () => json(store.list()),
      "/api/config": {
        GET: () => {
          try {
            return json(loadConfig(configFile));
          } catch (e) {
            return json({ error: `could not read config.json: ${e instanceof Error ? e.message : e}` }, 500);
          }
        },
        PUT: (req) =>
          writeGuard(req, async () => {
            const config = normalizeConfig(await req.json());
            await Bun.write(configFile, serializeConfig(config));
            store.setPrefix(config.prefix);
            return json(config);
          }),
      },
      "/api/doc/*": {
        GET: async (req) => {
          const doc = store.get(pathOf(req, "/api/doc/"));
          if (!doc) return json({ error: "not found" }, 404);
          const file = resolve(root, `${doc.path}.md`);
          return json({ ...doc, file, raw: await Bun.file(file).text() });
        },
        // Alanlar, başlık ve gövde; yalnız gönderilen parça değişir.
        PATCH: (req) =>
          writeGuard(req, async () => {
            const p = (await req.json()) as DocPatch;
            const path = pathOf(req, "/api/doc/");
            const doc = store.get(path);
            if (!doc) return json({ error: "not found" }, 404);
            const closed = new Set(loadConfig(configFile).statuses.filter((s) => s.closed).map((s) => s.id));
            const h1Title = p.title != null && doc.titleSource === "h1";
            return rewrite(path, (src) => {
              let fields = p.fields ?? {};
              if (doc.kind === "task") fields = withClosed(fields, doc.closed, closed);
              if (p.title != null && !h1Title) fields = { ...fields, title: p.title.replace(/[\r\n]+/g, " ").trim() };
              let out = Object.keys(fields).length ? setFields(src, fields) : src;
              if (p.body != null || h1Title) {
                let parts = splitDoc(out, { leadBlock: doc.kind === "doc" });
                if (p.body != null) {
                  if (p.baseBody != null && parts.body !== p.baseBody.trim()) return conflict("The text");
                  parts = { ...parts, body: p.body };
                }
                if (h1Title) parts = withTitle(parts, p.title!);
                out = joinDoc(parts);
              }
              return out;
            });
          }),
        // Dosyanın tamamını yazar: { content, mtime }
        PUT: (req) =>
          writeGuard(req, async () => {
            const { content, mtime } = (await req.json()) as { content: string; mtime: number };
            const path = pathOf(req, "/api/doc/");
            const file = fileOf(path);
            if (!file) return json({ error: "not found" }, 404);
            if (statSync(file).mtimeMs !== mtime) return conflict();
            await Bun.write(file, content);
            return json(store.get(path));
          }),
      },
      // Yorumlar dosyanın sonundaki `## Yorumlar` bölümünde. Düzenleme/silme yorumu
      // sırası + zamanıyla tanır; arada liste değiştiyse 409.
      "/api/comments/*": {
        POST: (req) =>
          writeGuard(req, async () => {
            const { body } = (await req.json()) as { body: string };
            const text = safeCommentBody(body ?? "");
            if (!text) return json({ error: "Comment is empty" }, 422);
            const path = pathOf(req, "/api/comments/");
            return rewrite(path, (src) => {
              const parts = splitDoc(src, { leadBlock: store.kindOf(path) === "doc" });
              return joinDoc({ ...parts, comments: [...parts.comments, { at: nowStamp(), body: text }] });
            });
          }),
        PUT: (req) =>
          writeGuard(req, async () => {
            const { index: i, at, body } = (await req.json()) as CommentRef & { body: string };
            const text = safeCommentBody(body ?? "");
            if (!text) return json({ error: "Comment is empty" }, 422);
            const path = pathOf(req, "/api/comments/");
            return rewrite(path, (src) => {
              const parts = splitDoc(src, { leadBlock: store.kindOf(path) === "doc" });
              const c = parts.comments[i];
              if (!c || c.at !== at) return conflict("The comments");
              return joinDoc({ ...parts, comments: parts.comments.with(i, { ...c, body: text }) });
            });
          }),
        DELETE: (req) =>
          writeGuard(req, async () => {
            const { index: i, at } = (await req.json()) as CommentRef;
            const path = pathOf(req, "/api/comments/");
            return rewrite(path, (src) => {
              const parts = splitDoc(src, { leadBlock: store.kindOf(path) === "doc" });
              const c = parts.comments[i];
              if (!c || c.at !== at) return conflict("The comments");
              return joinDoc({ ...parts, comments: parts.comments.filter((_, j) => j !== i) });
            });
          }),
      },
      // Sprint başlatır: { name?, end? }. Aynı anda tek aktif sprint olur.
      "/api/sprints": {
        POST: (req) =>
          writeGuard(req, async () => {
            const b = (await req.json()) as { name?: string; end?: string };
            const sprints = store.list().filter((d) => d.kind === "sprint");
            const active = sprints.find((s) => !s.closed);
            if (active) return json({ error: `${active.title} is still open; finish it first.` }, 422);
            const num = Math.max(0, ...sprints.map((s) => s.num ?? 0)) + 1;
            mkdirSync(resolve(root, "sprints"), { recursive: true });
            await Bun.write(resolve(root, "sprints", `sprint-${num}.md`), newSprintSource({ name: b.name ?? "", end: b.end }));
            return json(store.get(`sprints/sprint-${num}`), 201);
          }),
      },
      // Aktif sprinti kapatır: bitmemiş işleri backlog'a (sprint alanı boş) alır ve sprint
      // dosyasına `## Devredilenler` olarak yazar. Bitmiş işler sprintte kalır (arşiv).
      "/api/sprints/finish": {
        POST: (req) =>
          writeGuard(req, async () => {
            const all = store.list();
            const sprint = all.find((d) => d.kind === "sprint" && !d.closed);
            if (!sprint) return json({ error: "No active sprint" }, 422);
            const cfg = loadConfig(configFile);
            const closedIds = new Set(cfg.statuses.filter((s) => s.closed).map((s) => s.id));
            const open = all.filter((d) => d.kind === "task" && d.sprint === sprint.num && !closedIds.has(d.status ?? ""));
            for (const t of open) {
              const file = fileOf(t.path)!;
              await Bun.write(file, setFields(await Bun.file(file).text(), { sprint: null }));
            }
            return rewrite(sprint.path, (src) => {
              const parts = splitDoc(setFields(src, { closed: nowStamp().slice(0, 10) }), { leadBlock: false });
              const list = open.map((t) => `- ${cfg.prefix}-${t.num} ${t.title}`).join("\n");
              const body = open.length ? `${parts.body.trim()}\n\n## Devredilenler\n\n${list}`.trim() : parts.body;
              return joinDoc({ ...parts, body });
            });
          }),
      },
      // Yeni doküman: { folder, title }. `decisions/` altında sıradaki karar numarasıyla.
      "/api/pages": {
        POST: (req) =>
          writeGuard(req, async () => {
            const { folder = "", title = "" } = (await req.json()) as { folder?: string; title?: string };
            if (!title.trim()) return json({ error: "Title is required" }, 422);
            const dir = resolve(root, folder);
            if (!(dir === root || dir.startsWith(root + sep)) || !existsSync(dir) || ["tasks", "sprints"].includes(folder.split("/")[0]!)) {
              return json({ error: "Invalid folder" }, 422);
            }
            let num: number | null = null;
            if (folder === "decisions") {
              const nums = readdirSync(dir).map((f) => Number(f.match(/^(\d{4})-/)?.[1] ?? 0));
              num = Math.max(0, ...nums) + 1;
            }
            const base = (num != null ? `${String(num).padStart(4, "0")}-` : "") + slugify(title);
            let name = base;
            for (let i = 2; existsSync(resolve(dir, `${name}.md`)); i++) name = `${base}-${i}`;
            await Bun.write(resolve(dir, `${name}.md`), newDocSource(title, num));
            const path = folder ? `${folder}/${name}` : name;
            return json(store.get(path), 201);
          }),
      },
      // Sıradaki numarayla yeni iş: { title, status?, tags, priority, sprint?, body?, fields? }
      "/api/tasks": {
        POST: (req) =>
          writeGuard(req, async () => {
            const t = (await req.json()) as {
              title?: string;
              status?: string;
              tags?: string[];
              priority?: string;
              sprint?: number | null;
              body?: string;
              fields?: Record<string, string>;
            };
            if (!t.title?.trim()) return json({ error: "Title is required" }, 422);
            const cfg = loadConfig(configFile);
            mkdirSync(resolve(root, "tasks"), { recursive: true });
            const taskFile = new RegExp(`^${cfg.prefix}-(\\d+)\\.md$`);
            const nums = readdirSync(resolve(root, "tasks")).map((f) => Number(f.match(taskFile)?.[1] ?? 0));
            const num = Math.max(0, ...nums) + 1;
            const status = cfg.statuses.find((s) => s.id === t.status) ?? cfg.statuses.find((s) => !s.closed)!;
            let src = newTaskSource(cfg.prefix, num, {
              title: t.title,
              status: status.id,
              tags: t.tags ?? [],
              priority: t.priority || "normal",
              sprint: t.sprint ?? null,
              body: t.body,
            });
            // Özel alanlar (yalnız config'te tanımlı olanlar) ve kapalı durumla açılırsa kapanış tarihi.
            const extra: Record<string, FieldValue> = {};
            for (const f of cfg.fields) if (t.fields?.[f.key]?.trim()) extra[f.key] = t.fields[f.key]!.trim();
            Object.assign(extra, withClosed({ status: status.id }, null, new Set(cfg.statuses.filter((s) => s.closed).map((s) => s.id))));
            delete extra.status;
            if (Object.keys(extra).length) src = setFields(src, extra);
            await Bun.write(resolve(root, "tasks", `${cfg.prefix}-${num}.md`), src);
            return json(store.get(`tasks/${cfg.prefix}-${num}`), 201);
          }),
      },
      // Resim yükleme: gövde dosyanın kendisi, tür content-type'tan. Ad içerikten gelen id
      // (bkz. src/images.ts); aynı resim ikinci kez yazılmaz. Döner: { name }
      "/api/images": {
        POST: (req) =>
          writeGuard(req, async () => {
            const type = (req.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
            const ext = IMAGE_TYPES[type];
            if (!ext) return json({ error: "Only PNG, JPEG, WebP and GIF images can be added" }, 415);
            const limit = `Images can be at most ${MAX_IMAGE_BYTES / 1024 / 1024} MB`;
            if (Number(req.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) return json({ error: limit }, 413);
            const bytes = await req.arrayBuffer();
            if (bytes.byteLength > MAX_IMAGE_BYTES) return json({ error: limit }, 413);
            if (!bytes.byteLength) return json({ error: "File is empty" }, 422);
            const name = `${await imageId(bytes)}.${ext}`;
            const file = resolve(root, IMAGE_DIR, name);
            if (!existsSync(file)) {
              mkdirSync(resolve(root, IMAGE_DIR), { recursive: true });
              await Bun.write(file, bytes);
            }
            return json({ name }, 201);
          }),
      },
      // Yol IMAGE_DIR ile aynı; anahtar literal kalsın ki params tipli olsun.
      "/images/:name": (req) => {
        const { name } = req.params;
        const file = resolve(root, IMAGE_DIR, name);
        if (!IMAGE_NAME.test(name) || !existsSync(file)) return new Response("Not found", { status: 404 });
        return new Response(Bun.file(file), {
          headers: {
            "content-type": IMAGE_MIME[name.split(".").pop()!]!,
            // Ad içeriğin özeti; aynı adın içeriği değişmez.
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
          },
        });
      },
      "/api/events": (req) => {
        let ctrl: ReadableStreamDefaultController<string>;
        const stream = new ReadableStream<string>({
          start(c) {
            ctrl = c;
            clients.add(c);
            c.enqueue(": ok\n\n");
          },
          cancel() {
            clients.delete(ctrl);
          },
        });
        req.signal.addEventListener("abort", () => clients.delete(ctrl));
        return new Response(stream, {
          headers: { "content-type": "text/event-stream", "cache-control": "no-store" },
        });
      },
    },
    // Paketlenmiş arayüzün parçaları (adları içerik özetli js/css).
    fetch: (req) => {
      if (assets && req.method === "GET") {
        const file = resolve(assets, `.${decodeURIComponent(new URL(req.url).pathname)}`);
        if (file.startsWith(assets + sep) && existsSync(file) && statSync(file).isFile()) {
          return new Response(Bun.file(file), { headers: { "cache-control": "public, max-age=31536000, immutable" } });
        }
      }
      return new Response("Not found", { status: 404 });
    },
  });
}

let server: ReturnType<typeof serve> | undefined;
for (let p = wantedPort; p < wantedPort + 20 && !server; p++) {
  try {
    server = serve(p);
  } catch (e) {
    if ((e as { code?: string }).code !== "EADDRINUSE") throw e;
  }
}
if (!server) throw new Error(`no free port between ${wantedPort} and ${wantedPort + 19}`);

const url = `http://localhost:${server.port}`;
const count = store.list().filter((d) => d.kind === "task").length;
console.log(`\n  ${loadConfig(configFile).title}  →  ${url}\n  ${count} tasks · ${root}\n`);

if (opts.open !== false) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  try {
    Bun.spawn([cmd, url], { stdout: "ignore", stderr: "ignore" });
  } catch {}
}

return { server, url };
}
