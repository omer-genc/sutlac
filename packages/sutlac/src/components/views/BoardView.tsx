import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import type { Config, DocMeta, Status } from "@/api/client";
import { usePatchDoc } from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriorityBadge, TagBadges, StatusIcon, isOpen, priorityRank } from "@/lib/display";
import { cn } from "@/lib/utils";
import { Meta } from "./ListView";

// inci-doc BoardPage / BoardColumn / TaskCard düzeni. Board aktif sprintin işleridir; kolonlar
// config'te board'da görünen durumlar. Kartı başka kolona bırakmak dosyadaki `status`u yazar (kapalı duruma geçişte
// `closed` tarihi sunucuda dolar). md dosyalarında sıra alanı olmadığı için kolon içi sıra
// önceliğe (kapalılarda kapanış tarihine) göredir, sürükleyerek değişmez.

// Boş kolonların kenarına bırakmada önce imlecin içinde olduğu droppable'a bak (inci-doc).
const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  return pointer.length > 0 ? pointer : rectIntersection(args);
};

function Card({ d, cfg, selected, onOpen, overlay }: { d: DocMeta; cfg: Config; selected?: boolean; onOpen?: () => void; overlay?: boolean }) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        "cursor-pointer rounded-lg border bg-card p-3 text-card-foreground shadow-sm hover:border-ring/50",
        selected && "ring-2 ring-ring/50",
        overlay && "rotate-1 shadow-lg",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{d.ref}</span>
        <span className="ml-auto flex items-center gap-2">
          <Meta d={d} />
        </span>
      </div>
      <div className={cn("mb-2 text-sm leading-snug font-medium", !isOpen(cfg, d) && "text-muted-foreground")}>{d.title}</div>
      <div className="flex flex-wrap items-center gap-1">
        <PriorityBadge cfg={cfg} priority={d.priority} />
        <TagBadges cfg={cfg} tags={d.tags} />
      </div>
    </div>
  );
}

function DraggableCard(props: { d: DocMeta; cfg: Config; selected: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.d.path });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn(isDragging && "opacity-40")}>
      <Card {...props} />
    </div>
  );
}

function Column({ status, cfg, count, onAdd, children }: { status: Status; cfg: Config; count: number; onAdd?: () => void; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  return (
    <div className="flex h-full min-h-0 w-72 shrink-0 flex-col rounded-xl bg-muted/40">
      <div className="flex shrink-0 items-center gap-2 p-3">
        <StatusIcon cfg={cfg} status={status.id} />
        <span className="text-sm font-semibold">{status.label}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
        {onAdd && (
          <Button variant="ghost" size="icon" className="ml-auto size-6" onClick={onAdd} title="Yeni iş">
            <Plus />
          </Button>
        )}
      </div>
      <div ref={setNodeRef} className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0", isOver && "rounded-b-xl bg-muted/70")}>
        {children}
      </div>
    </div>
  );
}

/** Kolonların görünür sırası (j/k gezinmesi bunu izler). */
export function boardOrder(cfg: Config, list: DocMeta[]): Map<string, DocMeta[]> {
  const cols = new Map<string, DocMeta[]>();
  for (const s of cfg.statuses.filter((x) => x.board)) {
    const items = list.filter((d) => d.status === s.id);
    items.sort(
      s.closed
        ? (a, b) => (b.closed ?? "").localeCompare(a.closed ?? "") || (b.num ?? 0) - (a.num ?? 0)
        : (a, b) => priorityRank(cfg, a.priority) - priorityRank(cfg, b.priority) || (b.num ?? 0) - (a.num ?? 0),
    );
    cols.set(s.id, items);
  }
  return cols;
}

export function BoardView({
  cfg,
  list,
  selected,
  onOpen,
  onNew,
}: {
  cfg: Config;
  list: DocMeta[];
  selected: string | null;
  onOpen: (path: string) => void;
  onNew: () => void;
}) {
  const patch = usePatchDoc();
  const [active, setActive] = useState<DocMeta | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const cols = boardOrder(cfg, list);
  const firstOpen = cfg.statuses.find((s) => !s.closed)?.id;

  const onDragStart = (e: DragStartEvent) => setActive(list.find((d) => d.path === e.active.id) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const d = list.find((x) => x.path === e.active.id);
    const to = e.over?.id;
    if (!d || typeof to !== "string" || d.status === to) return;
    patch.mutate([d.path, { fields: { status: to } }]);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto p-3">
        {cfg.statuses
          .filter((s) => s.board)
          .map((s) => {
            const items = cols.get(s.id) ?? [];
            return (
              <Column key={s.id} status={s} cfg={cfg} count={items.length} onAdd={s.id === firstOpen ? onNew : undefined}>
                {items.map((d) => (
                  <DraggableCard key={d.path} d={d} cfg={cfg} selected={selected === d.path} onOpen={() => onOpen(d.path)} />
                ))}
              </Column>
            );
          })}
      </div>
      <DragOverlay>{active && <Card d={active} cfg={cfg} overlay />}</DragOverlay>
    </DndContext>
  );
}
