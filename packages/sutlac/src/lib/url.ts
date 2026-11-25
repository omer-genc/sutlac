import { useSyncExternalStore } from "react";

// Görünüm durumu URL'de; linkler paylaşılabilir, yenileyince aynı ekran gelir.
//   ?page=backlog&tags=api,web&f_sprint=2   sayfa ve süzgeçler
//   &doc=knowledge/acente-db                     Dokümanlar sayfasında açık doküman
//   &sprint=3                                    Sprintler sayfasında açık sprint
//   #/tasks/KES-1                                açık iş (her sayfanın üstünde diyalog)

export type Page = "board" | "backlog" | "tasks" | "sprints" | "archive" | "docs" | "settings";
export const PAGES: Page[] = ["board", "backlog", "tasks", "sprints", "archive", "docs", "settings"];

export type ViewState = {
  page: Page;
  /** Tüm işler sayfasında durum süzgeci: open | all | <durum> */
  status: string;
  tags: string[];
  priorities: string[];
  q: string;
  sort: "num-desc" | "num-asc" | "priority" | "updated";
  group: "status" | "tags" | "none";
  /** Özel seçenekli alan süzgeçleri: `f_<anahtar>=a,b` ("-" boş demek) */
  fx: Record<string, string[]>;
  doc: string | null;
  sprint: number | null;
};

const DEFAULTS = { page: "board", status: "open", sort: "num-desc", group: "status" } as const;
const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

function read(): ViewState {
  const p = new URLSearchParams(location.search);
  const fx: Record<string, string[]> = {};
  for (const [k, v] of p) if (k.startsWith("f_")) fx[k.slice(2)] = list(v);
  const page = p.get("page") as Page;
  return {
    page: PAGES.includes(page) ? page : DEFAULTS.page,
    status: p.get("status") || DEFAULTS.status,
    tags: list(p.get("tags")),
    priorities: list(p.get("priority")),
    q: p.get("q") || "",
    sort: (p.get("sort") as ViewState["sort"]) || DEFAULTS.sort,
    group: (p.get("group") as ViewState["group"]) || DEFAULTS.group,
    fx,
    doc: p.get("doc"),
    sprint: p.get("sprint") ? Number(p.get("sprint")) : null,
  };
}

const listeners = new Set<() => void>();
let cache: { search: string; hash: string; state: ViewState; task: string | null } | null = null;
function snapshot() {
  if (!cache || cache.search !== location.search || cache.hash !== location.hash) {
    const h = location.hash.slice(2);
    cache = { search: location.search, hash: location.hash, state: read(), task: /^tasks\/[A-Za-z][A-Za-z0-9]*-\d+$/.test(h) ? h : null };
  }
  return cache;
}
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
  };
};

function write(state: ViewState, task: string | null, push = false) {
  const p = new URLSearchParams();
  if (state.page !== DEFAULTS.page) p.set("page", state.page);
  if (state.status !== DEFAULTS.status) p.set("status", state.status);
  if (state.tags.length) p.set("tags", state.tags.join(","));
  if (state.priorities.length) p.set("priority", state.priorities.join(","));
  if (state.q) p.set("q", state.q);
  if (state.sort !== DEFAULTS.sort) p.set("sort", state.sort);
  if (state.group !== DEFAULTS.group) p.set("group", state.group);
  for (const [k, v] of Object.entries(state.fx)) if (v.length) p.set(`f_${k}`, v.join(","));
  if (state.doc) p.set("doc", state.doc);
  if (state.sprint != null) p.set("sprint", String(state.sprint));
  const qs = p.toString();
  const url = (qs ? `?${qs}` : location.pathname) + (task ? `#/${task}` : "");
  if (push) history.pushState(null, "", url);
  else history.replaceState(null, "", url);
  cache = null;
  for (const l of listeners) l();
}

export function useViewState() {
  const snap = useSyncExternalStore(subscribe, snapshot);
  return {
    state: snap.state,
    /** Açık iş (`tasks/KES-1`) */
    task: snap.task,
    set: (patch: Partial<ViewState>) => write({ ...snapshot().state, ...patch }, snapshot().task),
    /** Sayfa değişimi geçmişe yazılır (geri tuşu çalışsın); süzgeçler sıfırlanmaz. */
    go: (page: Page, patch: Partial<ViewState> = {}) => write({ ...snapshot().state, page, ...patch }, snapshot().task, true),
    openTask: (path: string | null) => write(snapshot().state, path),
  };
}
