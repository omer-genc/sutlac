import { Archive, ArrowLeft, Flag } from "@phosphor-icons/react";
import type { Config, DocMeta } from "@/api/client";
import { useDoc } from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BodyEditor } from "@/components/task/DocParts";
import { PriorityBadge, TagBadges, StatusIcon, isOpen, sprintLabel } from "@/lib/display";
import { plural } from "@/lib/utils";

// inci-doc SprintsPage / SprintDetailPage: aktif sprint Board'da yürür; kapanan sprintler
// burada işleri ve devredilenleriyle kalır. Sprint hedefi/retrosu sprint dosyasının gövdesidir.

const period = (s: DocMeta) => [s.start, s.closed ?? s.end].filter(Boolean).join(" → ");

export function SprintsPage({
  cfg,
  docs,
  selected,
  onSelect,
  onOpenTask,
  onOpenDoc,
}: {
  cfg: Config;
  docs: DocMeta[];
  selected: number | null;
  onSelect: (num: number | null) => void;
  onOpenTask: (path: string) => void;
  onOpenDoc: (path: string) => void;
}) {
  const sprints = docs.filter((d) => d.kind === "sprint").sort((a, b) => (b.num ?? 0) - (a.num ?? 0));
  const tasks = docs.filter((d) => d.kind === "task");
  const sprint = sprints.find((s) => s.num === selected);
  if (sprint) return <SprintDetail cfg={cfg} sprint={sprint} tasks={tasks} onBack={() => onSelect(null)} onOpenTask={onOpenTask} onOpenDoc={onOpenDoc} />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-6 pt-3 pb-10 sm:px-10">
      <h1 className="mt-2 text-3xl font-bold">Sprints</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The active sprint runs on the Board; finished sprints stay here with their tasks and carried-over tasks. Each sprint is a file under <code className="rounded bg-muted px-1 font-mono text-xs">docs/sprints/</code>.
      </p>
      <div className="mt-6">
        {sprints.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No sprints yet. Start one from the Board.</p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {sprints.map((s) => {
              const own = tasks.filter((t) => t.sprint === s.num);
              const done = own.filter((t) => !isOpen(cfg, t)).length;
              const pct = own.length ? Math.round((done / own.length) * 100) : 0;
              const stats = [`${done}/${own.length} ${plural(own.length, "task")}`, s.carried.length ? `${s.carried.length} carried over` : null].filter(Boolean);
              return (
                <button key={s.path} onClick={() => onSelect(s.num)} className="flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted">
                  {!s.closed ? <Flag className="size-4 shrink-0 text-label-blue" weight="fill" /> : <Archive className="size-4 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{sprintLabel(s)}</span>
                      {!s.closed && <Badge variant="secondary">Active</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{period(s)}</div>
                  </div>
                  <div className="hidden w-24 sm:block">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted-foreground/15">
                      <div className="h-full rounded-full bg-label-green" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{stats.join(" · ")}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRows({ cfg, rows, onOpen }: { cfg: Config; rows: DocMeta[]; onOpen: (path: string) => void }) {
  if (!rows.length) return <p className="px-3 py-3 text-sm text-muted-foreground">None.</p>;
  return (
    <div className="flex flex-col divide-y rounded-lg border">
      {rows.map((d) => (
        <button key={d.path} onClick={() => onOpen(d.path)} className="group flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60">
          <StatusIcon cfg={cfg} status={d.status} />
          <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">{d.ref}</span>
          <span className="min-w-0 flex-1 truncate group-hover:underline">{d.title}</span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <PriorityBadge cfg={cfg} priority={d.priority} />
            <TagBadges cfg={cfg} tags={d.tags} />
          </span>
        </button>
      ))}
    </div>
  );
}

function SprintDetail({
  cfg,
  sprint,
  tasks,
  onBack,
  onOpenTask,
  onOpenDoc,
}: {
  cfg: Config;
  sprint: DocMeta;
  tasks: DocMeta[];
  onBack: () => void;
  onOpenTask: (path: string) => void;
  onOpenDoc: (path: string) => void;
}) {
  const { data: doc } = useDoc(sprint.path);
  const own = tasks.filter((t) => t.sprint === sprint.num).sort((a, b) => (b.num ?? 0) - (a.num ?? 0));
  const carried = sprint.carried.map((n) => tasks.find((t) => t.num === n)).filter((t): t is DocMeta => !!t);
  const done = own.filter((t) => !isOpen(cfg, t));
  return (
    <div className="mx-auto flex max-w-3xl flex-col px-6 pt-3 pb-10 sm:px-10">
      <Button variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground" onClick={onBack}>
        <ArrowLeft /> Sprints
      </Button>
      <div className="mt-2 flex items-center gap-2">
        <h1 className="text-3xl font-bold">{sprintLabel(sprint)}</h1>
        {!sprint.closed && <Badge variant="secondary">Active</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {period(sprint)} · {done.length}/{own.length} {plural(own.length, "task")} done · <span className="font-mono text-xs">{sprint.path}.md</span>
      </p>
      <Separator className="my-4" />
      {doc ? <BodyEditor key={doc.path} doc={doc} onOpenDoc={onOpenDoc} /> : <div className="min-h-40" />}
      <Separator className="my-6" />
      <h3 className="mb-2 text-sm font-semibold">
        Tasks <span className="text-xs font-normal text-muted-foreground">{own.length}</span>
      </h3>
      <TaskRows cfg={cfg} rows={own} onOpen={onOpenTask} />
      {sprint.closed && (
        <>
          <h3 className="mt-6 mb-2 text-sm font-semibold">
            Carried over <span className="text-xs font-normal text-muted-foreground">{carried.length}</span>
          </h3>
          <TaskRows cfg={cfg} rows={carried} onOpen={onOpenTask} />
        </>
      )}
    </div>
  );
}
