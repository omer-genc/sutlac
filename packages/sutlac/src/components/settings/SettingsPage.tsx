import { ArrowDown, ArrowUp, Plus, Trash } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { COLORS, type Color } from "../../config";
import type { Config, DocMeta } from "@/api/client";
import { useSaveConfig } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COLOR_LABELS, Dot } from "@/lib/display";
import { cn } from "@/lib/utils";

// docs/config.json düzenleyicisi. Taslak yerelde tutulur, "Kaydet" ile sunucuda doğrulanıp
// yazılır (hatalı config — aynı kimlik iki kez, açık durum kalmaması — reddedilir).

type Section = Exclude<keyof Config, "title" | "prefix">;
const BLANK: { [K in Section]: () => Config[K][number] } = {
  tags: () => ({ id: "", label: "", color: "gray" }),
  statuses: () => ({ id: "", label: "", color: "gray", closed: false, board: true }),
  priorities: () => ({ id: "", label: "", color: "gray" }),
  fields: () => ({ key: "", label: "", type: "select", options: [] }),
};

function ColorSelect({ value, onChange }: { value: Color; onChange: (c: Color) => void }) {
  return (
    <Select
      items={Object.fromEntries(
        COLORS.map((c) => [
          c,
          <>
            <Dot color={c} />
            {COLOR_LABELS[c]}
          </>,
        ]),
      )}
      value={value}
      onValueChange={(v) => onChange(v as Color)}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COLORS.map((c) => (
          <SelectItem key={c} value={c}>
            <Dot color={c} />
            {COLOR_LABELS[c]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Block({
  title,
  hint,
  head,
  grid,
  rows,
  onAdd,
  addLabel,
}: {
  title: string;
  hint: ReactNode;
  head: string[];
  grid: string;
  rows: ReactNode[];
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 mb-3 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      <div className="overflow-x-auto rounded-lg border">
        <div className="min-w-[680px] divide-y">
          <div className={cn("grid items-center gap-2 bg-muted px-3 py-2 text-[11px] font-medium text-muted-foreground", grid)}>
            {head.map((h, i) => (
              <span key={i}>{h}</span>
            ))}
          </div>
          {rows.length ? rows : <p className="px-3 py-3 text-xs text-muted-foreground">Nothing yet.</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" className="mt-2" onClick={onAdd}>
        <Plus /> {addLabel}
      </Button>
    </section>
  );
}

const code = (s: string) => <code className="rounded bg-muted px-1 font-mono text-[11px]">{s}</code>;

export function SettingsPage({ cfg, docs }: { cfg: Config; docs: DocMeta[] }) {
  const save = useSaveConfig();
  const [draft, setDraft] = useState<Config>(() => structuredClone(cfg));
  useEffect(() => setDraft(structuredClone(cfg)), [cfg]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(cfg);

  const tasks = docs.filter((d) => d.kind === "task");
  const uses = {
    tags: (id: string) => tasks.filter((d) => d.tags.includes(id)).length,
    statuses: (id: string) => tasks.filter((d) => d.status === id).length,
    priorities: (id: string) => tasks.filter((d) => d.priority === id).length,
    fields: (key: string) => tasks.filter((d) => d.fields[key]).length,
  };

  function update<S extends Section>(s: S, i: number, patch: Partial<Config[S][number]>) {
    setDraft((d) => ({ ...d, [s]: d[s].map((row, j) => (j === i ? { ...row, ...patch } : row)) }));
  }
  const add = (s: Section) => setDraft((d) => ({ ...d, [s]: [...d[s], BLANK[s]()] }));
  const remove = (s: Section, i: number) => setDraft((d) => ({ ...d, [s]: d[s].filter((_, j) => j !== i) }));
  const move = (s: Section, i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const list = [...d[s]];
      [list[i], list[i + dir]] = [list[i + dir]!, list[i]!];
      return { ...d, [s]: list };
    });
  const submit = () => {
    // Boş eklenmiş satırlar sessizce atılır.
    const keep = <T extends { id?: string; key?: string }>(l: T[]) => l.filter((x) => (x.id ?? x.key ?? "").trim());
    save.mutate({
      ...draft,
      tags: keep(draft.tags),
      statuses: keep(draft.statuses),
      priorities: keep(draft.priorities),
      fields: keep(draft.fields),
    });
  };

  const actions = (s: Section, i: number, n: number, movable: boolean) => (
    <span className="flex justify-end">
      {movable && (
        <>
          <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(s, i, -1)} title="Move up">
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled={i === n - 1} onClick={() => move(s, i, 1)} title="Move down">
            <ArrowDown />
          </Button>
        </>
      )}
      <Button variant="ghost" size="icon-sm" onClick={() => remove(s, i)} title="Delete">
        <Trash />
      </Button>
    </span>
  );
  const use = (n: number) => <span className="text-right text-xs text-muted-foreground tabular-nums">{n}</span>;
  const row = (grid: string, key: number, children: ReactNode) => (
    <div key={key} className={cn("grid items-center gap-2 px-3 py-1.5", grid)}>
      {children}
    </div>
  );

  const G_OPT = "grid-cols-[150px_1fr_150px_48px_96px]";
  const G_STAT = "grid-cols-[150px_1fr_150px_56px_56px_48px_96px]";
  const G_FLD = "grid-cols-[140px_1fr_120px_1.4fr_48px_40px]";

  return (
    <div className="flex max-w-5xl flex-col gap-8 p-6">
      <p className="text-xs leading-relaxed text-muted-foreground">
        This page edits {code("docs/config.json")}; the file lives in the repo and is committed. The ID is the value written in the files ({code("tags: [api]")}).
        Changing or deleting an ID does not change existing task files; those show the raw value in gray.
      </p>

      <Block
        title="Tags"
        hint={<>The task's {code("tags")} field. Filters, badges and the new task dialog use this list.</>}
        head={["ID", "Name", "Color", "Tasks", ""]}
        grid={G_OPT}
        addLabel="Add tag"
        onAdd={() => add("tags")}
        rows={draft.tags.map((p, i) =>
          row(G_OPT, i, <>
            <Input value={p.id} placeholder="api" onChange={(e) => update("tags", i, { id: e.target.value })} />
            <Input value={p.label} onChange={(e) => update("tags", i, { label: e.target.value })} />
            <ColorSelect value={p.color} onChange={(color) => update("tags", i, { color })} />
            {use(uses.tags(p.id))}
            {actions("tags", i, draft.tags.length, true)}
          </>),
        )}
      />

      <Block
        title="Statuses"
        hint={
          <>
            The order sets the order of list groups and board columns. <b>Closed</b> statuses are excluded from the "Open" filter, and the {code("closed")} date is
            written when a task moves into one. A new task starts in the first open status.
          </>
        }
        head={["ID", "Name", "Color", "Closed", "Board", "Tasks", ""]}
        grid={G_STAT}
        addLabel="Add status"
        onAdd={() => add("statuses")}
        rows={draft.statuses.map((s, i) =>
          row(G_STAT, i, <>
            <Input value={s.id} onChange={(e) => update("statuses", i, { id: e.target.value })} />
            <Input value={s.label} onChange={(e) => update("statuses", i, { label: e.target.value })} />
            <ColorSelect value={s.color} onChange={(color) => update("statuses", i, { color })} />
            <Checkbox checked={s.closed} onCheckedChange={(v) => update("statuses", i, { closed: v === true })} />
            <Checkbox checked={s.board} onCheckedChange={(v) => update("statuses", i, { board: v === true })} />
            {use(uses.statuses(s.id))}
            {actions("statuses", i, draft.statuses.length, true)}
          </>),
        )}
      />

      <Block
        title="Priorities"
        hint='Ordered from highest to lowest; "By priority" sorting and board card order follow it.'
        head={["ID", "Name", "Color", "Tasks", ""]}
        grid={G_OPT}
        addLabel="Add priority"
        onAdd={() => add("priorities")}
        rows={draft.priorities.map((p, i) =>
          row(G_OPT, i, <>
            <Input value={p.id} onChange={(e) => update("priorities", i, { id: e.target.value })} />
            <Input value={p.label} onChange={(e) => update("priorities", i, { label: e.target.value })} />
            <ColorSelect value={p.color} onChange={(color) => update("priorities", i, { color })} />
            {use(uses.priorities(p.id))}
            {actions("priorities", i, draft.priorities.length, true)}
          </>),
        )}
      />

      <Block
        title="Custom fields"
        hint={
          <>
            Your own fields added to tasks (e.g. {code("sprint")}, {code("type")}). Written to frontmatter as {code("key: value")} and edited in the task panel;
            select fields become filters in the sidebar.
          </>
        }
        head={["Key", "Name", "Type", "Options (comma-separated)", "Tasks", ""]}
        grid={G_FLD}
        addLabel="Add field"
        onAdd={() => add("fields")}
        rows={draft.fields.map((f, i) =>
          row(G_FLD, i, <>
            <Input value={f.key} placeholder="sprint" onChange={(e) => update("fields", i, { key: e.target.value })} />
            <Input value={f.label} onChange={(e) => update("fields", i, { label: e.target.value })} />
            <Select items={{ select: "Select", text: "Text" }} value={f.type} onValueChange={(v) => update("fields", i, { type: v as "select" | "text" })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
            {f.type === "select" ? (
              <OptionsInput value={f.options} onChange={(options) => update("fields", i, { options })} />
            ) : (
              <span className="text-xs text-muted-foreground">free text</span>
            )}
            {use(uses.fields(f.key))}
            {actions("fields", i, draft.fields.length, false)}
          </>),
        )}
      />

      <div className="sticky bottom-0 flex items-center gap-2 border-t bg-background py-3">
        <Button onClick={submit} disabled={!dirty || save.isPending}>
          Save
        </Button>
        <Button variant="ghost" onClick={() => setDraft(structuredClone(cfg))} disabled={!dirty}>
          Discard changes
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      </div>
    </div>
  );
}

/** Virgüllü metni yazarken bozmadan tutar; listeye çevirme odak çıkınca. */
function OptionsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  useEffect(() => setText(value.join(", ")), [value.join(",")]);
  return (
    <Input
      value={text}
      placeholder="1, 2, 3"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange([...new Set(text.split(",").map((x) => x.trim()).filter(Boolean))])}
    />
  );
}
