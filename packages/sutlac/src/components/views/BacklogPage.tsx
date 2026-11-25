import { Play, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Config, DocMeta } from "@/api/client";
import { usePatchDoc } from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dot, PriorityBadge, TagBadges, StatusIcon, tagOf, sprintLabel } from "@/lib/display";
import { sortTasks } from "@/lib/filter";
import { Meta } from "./ListView";

// inci-doc BacklogPage: aktif sprintte olmayan açık işler, etikete göre gruplu. Seçilenler
// tek tek `sprint: N` yazılarak aktif sprinte çekilir (toplu uç yok; sayı küçük).

export function BacklogPage({
  cfg,
  list,
  active,
  onOpen,
  onNew,
}: {
  cfg: Config;
  list: DocMeta[];
  active: DocMeta | null;
  onOpen: (path: string) => void;
  onNew: () => void;
}) {
  const patch = usePatchDoc();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const sorted = sortTasks(cfg, "priority", list);

  // Birden çok etiketi olan iş her etiketinin grubunda görünür; seçim yola bağlı olduğu
  // için gruplardan birinde işaretlemek hepsinde işaretler, sprinte bir kez alınır.
  const tagsOf = (d: DocMeta) => (d.tags.length ? d.tags : ["—"]);
  const keys = [...new Set([...cfg.tags.map((p) => p.id), ...sorted.flatMap(tagsOf)])];
  const groups = keys.map((k) => ({ key: k, rows: sorted.filter((d) => tagsOf(d).includes(k)) })).filter((g) => g.rows.length);
  const chosen = list.filter((d) => selected.has(d.path));

  async function pull(paths: string[]) {
    if (!active) return;
    setBusy(true);
    try {
      for (const p of paths) await patch.mutateAsync([p, { fields: { sprint: String(active.num) } }]);
      toast.success(`${paths.length} iş sprinte alındı`, { description: sprintLabel(active) });
      setSelected(new Set());
    } catch {
      // Hata toast'ı usePatchDoc'ta; kısmi başarıda seçim durur.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <Button size="sm" variant="outline" onClick={onNew}>
          <Plus /> Yeni iş
        </Button>
        <div className="ml-auto flex items-center gap-3">
          {active ? (
            <>
            <span className="text-sm text-muted-foreground">{sprintLabel(active)}</span>
            <Button size="sm" disabled={!chosen.length || busy} onClick={() => pull(chosen.map((d) => d.path))}>
              <Play /> Seçilenleri sprinte al ({chosen.length})
            </Button>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Önce Board'dan sprint başlat</span>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {groups.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">Backlog boş.</p>}
        {groups.map(({ key, rows }) => (
          <section key={key} className="mb-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Dot color={tagOf(cfg, key).color} />
              {key === "—" ? "Etiketsiz" : tagOf(cfg, key).label}
              <span className="text-xs font-normal text-muted-foreground">{rows.length} iş</span>
            </h3>
            <div className="flex flex-col divide-y rounded-lg border">
              {rows.map((d) => (
                <div key={`${key}:${d.path}`} className="group flex items-center gap-3 px-3 py-2 text-sm">
                  <Checkbox
                    checked={selected.has(d.path)}
                    onCheckedChange={(v) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        v === true ? next.add(d.path) : next.delete(d.path);
                        return next;
                      })
                    }
                  />
                  <StatusIcon cfg={cfg} status={d.status} />
                  <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">{d.ref}</span>
                  <button type="button" onClick={() => onOpen(d.path)} className="min-w-0 flex-1 truncate text-left hover:underline">
                    {d.title}
                  </button>
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <Meta d={d} />
                    <PriorityBadge cfg={cfg} priority={d.priority} />
                    <TagBadges cfg={cfg} tags={d.tags.filter((p) => p !== key)} />
                  </span>
                  {active && (
                    <Button variant="ghost" size="sm" className="opacity-0 transition-opacity group-hover:opacity-100" disabled={busy} onClick={() => pull([d.path])}>
                      Sprinte al
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
