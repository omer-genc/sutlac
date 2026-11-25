import { useState } from "react";
import type { Config, DocMeta } from "@/api/client";
import { useFinishSprint, useStartSprint } from "@/api/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { isOpen, sprintLabel } from "@/lib/display";

// inci-doc SprintHeader / StartSprintForm / FinishSprintButton karşılıkları. Sprint bir
// dosyadır (`sprints/sprint-N.md`); başlatmak onu açar, bitirmek `closed` tarihini yazar.

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toLocaleDateString("sv-SE");

function remaining(end: string | null): string | null {
  if (!end) return null;
  const d = Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(isoDay(Date.now()) + "T00:00:00").getTime()) / DAY);
  if (d > 0) return `${d} gün kaldı`;
  if (d === 0) return "bugün bitiyor";
  return `${-d} gün geçti`;
}

/** "Sprint 3 — ad · 4 gün kaldı · 5/12 iş" + Sprinti bitir. */
export function SprintHeader({ sprint, tasks, cfg, onOpen }: { sprint: DocMeta; tasks: DocMeta[]; cfg: Config; onOpen: () => void }) {
  const done = tasks.filter((t) => !isOpen(cfg, t)).length;
  const parts = [remaining(sprint.end), `${done}/${tasks.length} iş`].filter(Boolean);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        <button className="hover:text-foreground hover:underline" onClick={onOpen}>
          {sprintLabel(sprint)}
        </button>
        {parts.length > 0 && ` · ${parts.join(" · ")}`}
      </span>
      <FinishSprintButton sprint={sprint} openCount={tasks.length - done} doneCount={done} />
    </div>
  );
}

function FinishSprintButton({ sprint, openCount, doneCount }: { sprint: DocMeta; openCount: number; doneCount: number }) {
  const finish = useFinishSprint();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button size="sm" />}
      >
        Sprinti bitir
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{sprintLabel(sprint)} bitirilsin mi?</AlertDialogTitle>
          <AlertDialogDescription>
            {doneCount} biten iş sprintte kalır ve arşive geçer. {openCount} bitmemiş iş backlog'a döner ve sprint dosyasına "Devredilenler" olarak yazılır.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
          <AlertDialogAction onClick={() => finish.mutate()}>Sprinti bitir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Aktif sprint yokken board'un boş durumu. */
export function StartSprintForm({ next }: { next: number }) {
  const [name, setName] = useState("");
  const [end, setEnd] = useState<Date | undefined>(new Date(Date.now() + 14 * DAY));
  const start = useStartSprint();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <div>
        <h2 className="text-xl font-semibold">Aktif sprint yok</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Board yalnızca aktif sprintteki işleri gösterir. Yeni sprinti (Sprint {next}) başlatıp backlog'dan iş çekin.
        </p>
      </div>
      <form
        className="flex w-full flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start.mutate({ name: name.trim(), end: end ? isoDay(end.getTime()) : "" });
        }}
      >
        <Input placeholder="Sprint adı (opsiyonel)" value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
        <DatePicker value={end} onChange={setEnd} placeholder="Hedef bitiş (opsiyonel)" />
        <Button type="submit" disabled={start.isPending}>
          Sprint başlat
        </Button>
      </form>
    </div>
  );
}
