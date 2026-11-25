import type { Config } from "../config";
import type { DocMeta } from "../docs";
import { docLabel, isOpen, priorityRank } from "./display";
import type { ViewState } from "./url";

/** Aktif sprint: `closed` alanı boş olan sprint kaydı (aynı anda en fazla bir). */
export const activeSprint = (docs: DocMeta[]) =>
  docs.filter((d) => d.kind === "sprint" && !d.closed).sort((a, b) => (b.num ?? 0) - (a.num ?? 0))[0] ?? null;

/**
 * İşin yeri (inci-doc kuralının dosya karşılığı):
 *   board    aktif sprintte (her durumda)
 *   backlog  açık ve aktif sprintte değil
 *   archive  kapalı ve sprinti yok ya da sprinti kapanmış
 */
export function placeOf(cfg: Config, d: DocMeta, active: DocMeta | null): "board" | "backlog" | "archive" {
  if (active && d.sprint === active.num) return "board";
  return isOpen(cfg, d) ? "backlog" : "archive";
}

/**
 * İş süzgeçlere uyuyor mu (etiket, öncelik, özel alanlar, arama; Tüm işler'de durum).
 * `skip`, bir süzgecin kendi seçeneklerindeki sayıları hesaplarken o süzgeci yok saymak için.
 */
export function matchesTask(cfg: Config, st: ViewState, d: DocMeta, skip?: string): boolean {
  if (d.kind !== "task") return false;
  if (st.page === "tasks" && skip !== "status") {
    if (st.status === "open" && !isOpen(cfg, d)) return false;
    if (st.status !== "open" && st.status !== "all" && d.status !== st.status) return false;
  }
  if (skip !== "tags" && st.tags.length && !st.tags.some((p) => d.tags.includes(p))) return false;
  if (skip !== "priority" && st.priorities.length && !st.priorities.includes(d.priority ?? "")) return false;
  for (const f of cfg.fields) {
    const want = st.fx[f.key];
    if (f.type !== "select" || !want?.length || skip === `f:${f.key}`) continue;
    const have = d.fields[f.key] || "-";
    if (!want.includes(have)) return false;
  }
  return matchesQuery(st.q, d);
}

export function matchesQuery(q: string, d: DocMeta): boolean {
  if (!q) return true;
  const hay = `${docLabel(d)} ${d.title} ${d.source ?? ""} ${d.path}`.toLocaleLowerCase("tr-TR");
  return q
    .toLocaleLowerCase("tr-TR")
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

export function sortTasks(cfg: Config, sort: ViewState["sort"], list: DocMeta[]): DocMeta[] {
  const by = {
    "num-desc": (a: DocMeta, b: DocMeta) => (b.num ?? -1) - (a.num ?? -1),
    "num-asc": (a: DocMeta, b: DocMeta) => (a.num ?? 1e9) - (b.num ?? 1e9),
    priority: (a: DocMeta, b: DocMeta) => priorityRank(cfg, a.priority) - priorityRank(cfg, b.priority) || (b.num ?? 0) - (a.num ?? 0),
    updated: (a: DocMeta, b: DocMeta) => b.updated - a.updated,
  }[sort];
  return [...list].sort(by);
}
