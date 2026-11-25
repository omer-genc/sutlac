import { ChatCircle, ListChecks } from "@phosphor-icons/react";
import type { Config, DocMeta } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Dot, PriorityBadge, TagBadges, StatusIcon, isOpen, tagOf } from "@/lib/display";
import type { ViewState } from "@/lib/url";
import { cn } from "@/lib/utils";

// inci-doc Backlog listesi düzeni: gruplar başlık + sayı, satırlar çerçeveli kartta.

export function Meta({ d }: { d: DocMeta }) {
  return (
    <>
      {d.todos.total > 0 && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums" title="To-dos">
          <ListChecks className="size-3.5" />
          {d.todos.done}/{d.todos.total}
        </span>
      )}
      {d.comments > 0 && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums" title="Comments">
          <ChatCircle className="size-3.5" />
          {d.comments}
        </span>
      )}
    </>
  );
}

export function TaskRow({ d, cfg, selected, onOpen, extra }: { d: DocMeta; cfg: Config; selected?: boolean; onOpen: () => void; extra?: React.ReactNode }) {
  return (
    <button onClick={onOpen} className={cn("group flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60", selected && "bg-muted")}>
      <StatusIcon cfg={cfg} status={d.status} />
      <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">{d.ref}</span>
      <span className={cn("min-w-0 flex-1 truncate group-hover:underline", !isOpen(cfg, d) && "text-muted-foreground")}>{d.title}</span>
      <span className="hidden items-center gap-1.5 sm:flex">
        <Meta d={d} />
        {d.sprint != null && <Badge variant="outline">S{d.sprint}</Badge>}
        <PriorityBadge cfg={cfg} priority={d.priority} />
        <TagBadges cfg={cfg} tags={d.tags} />
        {extra}
      </span>
    </button>
  );
}

type Group = { key: string; title: React.ReactNode; items: DocMeta[] };

export function groupTasks(cfg: Config, group: ViewState["group"] | "closed", list: DocMeta[]): Group[] {
  if (group === "none") return [{ key: "all", title: null, items: list }];
  if (group === "closed") {
    // Arşiv: kapanış ayına göre, en yeni üstte.
    const month = (d: DocMeta) => (d.closed ?? "").slice(0, 7) || "No date";
    const keys = [...new Set(list.map(month))].sort().reverse();
    return keys.map((k) => ({ key: k, title: k, items: list.filter((d) => month(d) === k) }));
  }
  if (group === "tags") {
    const keys = [...new Set(list.flatMap((d) => (d.tags.length ? d.tags : ["—"])))].sort();
    return keys.map((k) => ({
      key: k,
      title: (
        <>
          <Dot color={tagOf(cfg, k).color} />
          {k === "—" ? "Untagged" : tagOf(cfg, k).label}
        </>
      ),
      items: list.filter((d) => (d.tags.length ? d.tags.includes(k) : k === "—")),
    }));
  }
  const groups: Group[] = cfg.statuses.map((s) => ({
    key: s.id,
    title: (
      <>
        <StatusIcon cfg={cfg} status={s.id} />
        {s.label}
      </>
    ),
    items: list.filter((d) => d.status === s.id),
  }));
  const other = list.filter((d) => !cfg.statuses.some((s) => s.id === d.status));
  if (other.length) groups.push({ key: "_other", title: "Other", items: other });
  return groups;
}

export function ListView({
  cfg,
  groups,
  selected,
  onOpen,
  empty = "No tasks match these filters.",
}: {
  cfg: Config;
  groups: Group[];
  selected: string | null;
  onOpen: (path: string) => void;
  empty?: string;
}) {
  const shown = groups.filter((g) => g.items.length);
  if (!shown.length) return <p className="py-16 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="p-4">
      {shown.map((g) => (
        <section key={g.key} className="mb-6">
          {g.title && (
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              {g.title}
              <span className="text-xs font-normal text-muted-foreground">{g.items.length}</span>
            </h3>
          )}
          <div className="flex flex-col divide-y overflow-hidden rounded-lg border">
            {g.items.map((d) => (
              <TaskRow key={d.path} d={d} cfg={cfg} selected={selected === d.path} onOpen={() => onOpen(d.path)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
