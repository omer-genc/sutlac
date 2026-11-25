import {
  CalendarBlank,
  CalendarX,
  CircleDashed,
  ClockCounterClockwise,
  Code,
  Copy,
  FileCode,
  Flag,
  FlagBanner,
  Folder,
  Link as LinkIcon,
  ListChecks,
  Tag,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, type Config, type DocMeta, type FullDoc } from "@/api/client";
import { usePatchDoc, useWriteRaw } from "@/api/queries";
import { MarkdownSection } from "@/components/markdown/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LABEL_STYLES, StatusIcon, docLabel, priorityOf, sprintLabel } from "@/lib/display";
import { cn } from "@/lib/utils";
import { GHOST_TRIGGER, PropertyRow } from "./PropertyRow";
import { TagPicker } from "./TagPicker";

// İş diyaloğu ve doküman sayfasının ortak parçaları. Her değişiklik doğrudan md dosyasına
// yazılır; dosya dışarıda değişirse SSE ile yenilenir.

const NONE = "__none"; // Radix Select boş değer kabul etmiyor
const KNOWN = new Set(["id", "title", "status", "tags", "priority", "sprint", "created", "closed", "source"]);
const norm = (s: string) => s.replace(/[ \t]+$/gm, "").trim();
export const fmtTime = (ms: number) => new Date(ms).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

type Patch = Parameters<ReturnType<typeof usePatchDoc>["mutate"]>[0][1];

/** Çerçevesiz, içeriğe göre büyüyen başlık (inci-doc TaskDialog/DocPage). */
export function TitleField({ doc }: { doc: FullDoc }) {
  const patchDoc = usePatchDoc();
  const [title, setTitle] = useState(doc.title);
  useEffect(() => setTitle(doc.title), [doc.title]);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "0";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title]);
  const save = () => {
    if (title.trim() && title.trim() !== doc.title) patchDoc.mutate([doc.path, { title: title.trim() }]);
  };
  return (
    <textarea
      ref={ref}
      rows={1}
      value={title}
      readOnly={doc.titleSource === "none"}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder="Untitled"
      className="w-full shrink-0 resize-none overflow-hidden bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground/50"
    />
  );
}

/**
 * Gövde editörü. Editörün değeri yalnız dışarıdan gelen değişimde (başka yerde düzenleme)
 * yenilenir; kendi kaydımızın sunucudan dönen yankısı editörü sıfırlamaz. `baseBody` sunucuya
 * "ben bu metinden başladım" diye gider; disktekiyle uyuşmazsa 409 ve kullanıcıya sorulur.
 */
export function BodyEditor({ doc, onOpenDoc }: { doc: FullDoc; onOpenDoc: (path: string) => void }) {
  const patchDoc = usePatchDoc();
  const [value, setValue] = useState(doc.body);
  // Çakışmada "diskteki hali yükle": editör baştan kurulur, yazılan taslak atılır.
  const [resetKey, setResetKey] = useState(0);
  const base = useRef(doc.body);
  const sent = useRef<string | null>(null);
  const latest = useRef(doc.body);
  latest.current = doc.body;
  useEffect(() => {
    if (sent.current != null && norm(doc.body) === norm(sent.current)) return;
    if (norm(doc.body) === norm(base.current)) return;
    base.current = doc.body;
    setValue(doc.body);
  }, [doc.body]);

  const save = (md: string) => {
    const baseBody = base.current;
    sent.current = md;
    base.current = md;
    patchDoc.mutate([doc.path, { body: md, baseBody }], {
      onError: (e) => {
        if (!(e instanceof ApiError && e.status === 409)) return;
        base.current = baseBody;
        toast.error("The text changed elsewhere; your change was not saved.", {
          duration: Infinity,
          action: {
            label: "Load version on disk",
            onClick: () => {
              sent.current = null;
              base.current = latest.current;
              setValue(latest.current);
              setResetKey((k) => k + 1);
            },
          },
        });
      },
    });
  };
  return <MarkdownSection key={resetKey} value={value} onSave={save} onOpenDoc={onOpenDoc} basePath={doc.path} />;
}

/** Kimlik kopyala · yol · Kaynak · Editörde aç · Yolu kopyala (inci-doc diyalog başlığı). */
export function DocActions({ doc, source, onSource }: { doc: FullDoc; source: boolean; onSource: () => void }) {
  return (
    <>
      {docLabel(doc) && (
        <button
          className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted hover:text-foreground"
          onClick={() => {
            navigator.clipboard.writeText(docLabel(doc));
            toast.success(`${docLabel(doc)} copied`);
          }}
        >
          {docLabel(doc)}
          <Copy className="size-3.5" />
        </button>
      )}
      <span className="truncate px-1">{doc.path}.md</span>
      <div className="ml-auto flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn("text-muted-foreground", source && "bg-muted text-foreground")}
          onClick={onSource}
          title="Edit the raw file"
        >
          <FileCode /> Source
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground"
          nativeButton={false}
          render={
            <a href={`vscode://file${encodeURI(doc.file)}`} title="Open in VS Code" />
          }
        >
          <Code /> Open in editor
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            navigator.clipboard.writeText(doc.file);
            toast.success("File path copied");
          }}
        >
          <Copy /> Copy path
        </Button>
      </div>
    </>
  );
}

export function OptionSelect({
  value,
  options,
  empty,
  onChange,
  render,
}: {
  value: string | null;
  options: { id: string; label: string }[];
  empty?: string;
  onChange: (v: string | null) => void;
  render?: (id: string) => React.ReactNode;
}) {
  const all = value && !options.some((o) => o.id === value) ? [...options, { id: value, label: value }] : options;
  return (
    <Select
      items={{
        ...(empty != null ? { [NONE]: empty } : {}),
        ...Object.fromEntries(all.map((o) => [o.id, render ? render(o.id) : o.label])),
      }}
      value={value || (empty != null ? NONE : null)}
      onValueChange={(x) => onChange(x === NONE ? null : x)}
    >
      <SelectTrigger className={GHOST_TRIGGER}>
        <SelectValue placeholder={empty ?? "—"} />
      </SelectTrigger>
      <SelectContent>
        {empty != null && <SelectItem value={NONE}>{empty}</SelectItem>}
        {all.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {render ? render(o.id) : o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TextField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <Input
      value={v}
      placeholder="—"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() !== value && onSave(v.trim())}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="border-transparent bg-transparent shadow-none hover:bg-muted dark:bg-transparent"
    />
  );
}

/** İşin özellik paneli (inci-doc TaskDialog sağ paneli). */
export function TaskProps({
  doc,
  cfg,
  sprints,
  onOpenSprint,
}: {
  doc: FullDoc;
  cfg: Config;
  sprints: DocMeta[];
  onOpenSprint: (num: number) => void;
}) {
  const patchDoc = usePatchDoc();
  const patch = (p: Patch) => patchDoc.mutate([doc.path, p]);
  const set = (key: string, value: string | string[] | null) => patch({ fields: { [key]: value } });
  const custom = new Set(cfg.fields.map((f) => f.key));
  const active = sprints.find((s) => !s.closed);
  const own = sprints.find((s) => s.num === doc.sprint);

  return (
    <>
      <PropertyRow icon={<CircleDashed className="size-4" />} label="Status">
        <OptionSelect
          value={doc.status}
          options={cfg.statuses}
          onChange={(v) => v && set("status", v)}
          render={(id) => (
            <>
              <StatusIcon cfg={cfg} status={id} />
              {cfg.statuses.find((s) => s.id === id)?.label ?? id}
            </>
          )}
        />
      </PropertyRow>
      <PropertyRow icon={<FlagBanner className="size-4" />} label="Sprint">
        {own?.closed ? (
          // Kapanmış sprint: sayfasına git.
          <button className="rounded px-2 py-0.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onOpenSprint(own.num!)}>
            {sprintLabel(own)} (closed)
          </button>
        ) : (
          <OptionSelect
            value={doc.sprint != null ? String(doc.sprint) : null}
            options={active ? [{ id: String(active.num), label: sprintLabel(active) }] : []}
            empty="Backlog"
            onChange={(v) => set("sprint", v)}
          />
        )}
      </PropertyRow>
      <PropertyRow icon={<Folder className="size-4" />} label="Tags">
        <TagPicker cfg={cfg} value={doc.tags} onChange={(next) => set("tags", next)} />
      </PropertyRow>
      <PropertyRow icon={<Flag className="size-4" />} label="Priority">
        <OptionSelect
          value={doc.priority}
          options={cfg.priorities}
          empty="—"
          onChange={(v) => set("priority", v)}
          render={(id) => {
            const p = priorityOf(cfg, id);
            return p ? <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", LABEL_STYLES[p.color])}>{p.label}</span> : id;
          }}
        />
      </PropertyRow>
      {cfg.fields.map((f) => (
        <PropertyRow key={f.key} icon={<Tag className="size-4" />} label={f.label}>
          {f.type === "select" ? (
            <OptionSelect value={doc.fields[f.key] || null} options={f.options.map((o) => ({ id: o, label: o }))} empty="—" onChange={(v) => set(f.key, v)} />
          ) : (
            <TextField value={doc.fields[f.key] || ""} onSave={(v) => set(f.key, v || null)} />
          )}
        </PropertyRow>
      ))}
      {doc.todos.total > 0 && (
        <PropertyRow icon={<ListChecks className="size-4" />} label="To-dos">
          <div className="w-full px-2">
            <span className="text-sm">
              {doc.todos.done} / {doc.todos.total}
            </span>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-label-green" style={{ width: `${(doc.todos.done / doc.todos.total) * 100}%` }} />
            </div>
          </div>
        </PropertyRow>
      )}
      <PropertyRow icon={<CalendarBlank className="size-4" />} label="Created">
        <span className="px-2 text-sm text-muted-foreground">{doc.created ?? "—"}</span>
      </PropertyRow>
      {doc.closed && (
        <PropertyRow icon={<CalendarX className="size-4" />} label="Closed">
          <span className="px-2 text-sm text-muted-foreground">{doc.closed}</span>
        </PropertyRow>
      )}
      {doc.fields.source && (
        <PropertyRow icon={<LinkIcon className="size-4" />} label="Source">
          <span className="px-2 text-sm">{doc.fields.source}</span>
        </PropertyRow>
      )}
      {Object.entries(doc.fields)
        .filter(([k, v]) => !KNOWN.has(k) && !custom.has(k) && v)
        .map(([k, v]) => (
          <PropertyRow key={k} icon={<Tag className="size-4" />} label={k}>
            <span className="px-2 text-sm break-all">{v}</span>
          </PropertyRow>
        ))}
      <PropertyRow icon={<ClockCounterClockwise className="size-4" />} label="Updated">
        <span className="px-2 text-sm text-muted-foreground">{fmtTime(doc.updated)}</span>
      </PropertyRow>
    </>
  );
}

/** Doküman başındaki `- **Alan:** değer` satırları (dosyada düzenlenir). */
export function PageProps({ doc }: { doc: FullDoc }) {
  const ICON: Record<string, React.ReactNode> = {
    Durum: <CircleDashed className="size-4" />,
    Tarih: <CalendarBlank className="size-4" />,
    Kaynak: <LinkIcon className="size-4" />,
    İlgili: <LinkIcon className="size-4" />,
  };
  return doc.props.map((p) => (
    <PropertyRow key={p.key} icon={ICON[p.key] ?? <Tag className="size-4" />} label={p.key}>
      <span className="prose px-2 text-sm [&_a]:text-primary" dangerouslySetInnerHTML={{ __html: p.html }} />
    </PropertyRow>
  ));
}

/** Dosyanın tamamı (frontmatter dahil) düz metin; ⌘S kaydeder. */
export function SourceEditor({ doc, onDone }: { doc: FullDoc; onDone: () => void }) {
  const write = useWriteRaw();
  const [text, setText] = useState(doc.raw);
  const [mtime, setMtime] = useState(doc.updated);
  const [error, setError] = useState<string | null>(null);
  const changedOnDisk = doc.updated !== mtime;
  const dirty = text !== doc.raw || changedOnDisk;
  const save = () =>
    write.mutate([doc.path, text, mtime], {
      onSuccess: () => onDone(),
      onError: (e) => setError(e.message),
    });
  const reload = () => {
    setText(doc.raw);
    setMtime(doc.updated);
    setError(null);
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col border-t">
      <div className="flex shrink-0 items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
        {error || changedOnDisk ? (
          <span className="text-destructive">{error ?? "The file changed on disk."}</span>
        ) : (
          <span>
            <kbd>⌘S</kbd> to save
          </span>
        )}
        {(error || changedOnDisk) && (
          <Button size="sm" variant="outline" onClick={reload}>
            Load version on disk
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty || write.isPending}>
            Save
          </Button>
        </div>
      </div>
      <textarea
        autoFocus
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            save();
          }
        }}
        className="min-h-0 flex-1 resize-none bg-transparent px-10 py-5 font-mono text-[13px] leading-relaxed outline-none"
      />
    </div>
  );
}
