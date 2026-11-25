import { CircleDashed, Flag, FlagBanner, Folder, Tag } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { Config } from "@/api/client";
import { useCreateTask } from "@/api/queries";
import { MarkdownSection } from "@/components/markdown/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LABEL_STYLES, StatusIcon, priorityOf } from "@/lib/display";
import { cn } from "@/lib/utils";
import { OptionSelect } from "./DocParts";
import { PropertyRow } from "./PropertyRow";
import { TagPicker } from "./TagPicker";

// inci-doc NewTaskDialog: çerçevesiz başlık, özellik satırları, açıklama editörü. Sıradaki
// Sıradaki numarayla `docs/tasks/<önek>-N.md` açılır; açıklama boşsa şablon gövdesi yazılır.

export function NewTaskDialog({
  cfg,
  defaultTag,
  sprint,
  defaultInSprint,
  onClose,
  onCreated,
}: {
  cfg: Config;
  defaultTag: string;
  /** Aktif sprint (yoksa null); iş ya ona ya backlog'a açılır */
  sprint: { num: number; label: string } | null;
  /** Board'dan açılınca sprint, başka yerden açılınca backlog seçili gelir */
  defaultInSprint: boolean;
  onClose: () => void;
  onCreated: (path: string) => void;
}) {
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState(cfg.statuses.find((s) => !s.closed)?.id ?? "");
  const [inSprint, setInSprint] = useState(defaultInSprint && !!sprint);
  const [tags, setTags] = useState<string[]>(defaultTag ? [defaultTag] : []);
  const [priority, setPriority] = useState(cfg.priorities[Math.floor(cfg.priorities.length / 2)]?.id ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  // İçerik "Oluştur"a kadar yalnız burada tutulur; editör her tuşta onChange ile bildirir.
  const content = useRef("");
  const bodyRef = useRef<HTMLDivElement>(null);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  // Çerçevesiz başlık alanı içeriğe göre büyür (TaskDialog ile aynı desen).
  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "0";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title]);

  const canSubmit = title.trim() !== "" && !create.isPending;
  const submit = () => {
    if (!canSubmit) return;
    create.mutate(
      {
        title: title.trim(),
        status,
        tags,
        priority,
        sprint: inSprint && sprint ? sprint.num : null,
        body: content.current,
        fields,
      },
      { onSuccess: (doc) => onCreated(doc.path) },
    );
  };


  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 flex-row items-center gap-1 px-4 py-2 pr-14">
          <DialogTitle className="text-xs font-normal text-muted-foreground">New task</DialogTitle>
        </DialogHeader>
        <div
          ref={bodyRef}
          className="flex flex-col overflow-y-auto px-10 pt-2 pb-4"
          // Cmd/Ctrl+Enter diyaloğun her yerinden oluşturur. Capture fazında: editörün kendi
          // Mod-Enter kısayolu araya girmesin.
          onKeyDownCapture={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              e.stopPropagation();
              submit();
            }
          }}
        >
          <textarea
            ref={titleRef}
            rows={1}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              // Enter başlıktan açıklamaya geçirir; oluşturma Cmd+Enter ya da düğmeyle.
              if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                bodyRef.current?.querySelector<HTMLElement>(".tiptap")?.focus();
              }
            }}
            placeholder="Untitled"
            autoFocus
            className="w-full shrink-0 resize-none overflow-hidden bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground/50"
          />
          <div className="mt-3 flex flex-col">
            <PropertyRow icon={<CircleDashed className="size-4" />} label="Status">
              <OptionSelect
                value={status}
                options={cfg.statuses}
                onChange={(v) => v && setStatus(v)}
                render={(id) => (
                  <>
                    <StatusIcon cfg={cfg} status={id} />
                    {cfg.statuses.find((s) => s.id === id)?.label ?? id}
                  </>
                )}
              />
            </PropertyRow>
            <PropertyRow icon={<FlagBanner className="size-4" />} label="Sprint">
              <OptionSelect
                value={inSprint && sprint ? String(sprint.num) : null}
                options={sprint ? [{ id: String(sprint.num), label: sprint.label }] : []}
                empty="Backlog"
                onChange={(v) => setInSprint(v != null)}
              />
            </PropertyRow>
            <PropertyRow icon={<Flag className="size-4" />} label="Priority">
              <OptionSelect
                value={priority}
                options={cfg.priorities}
                onChange={(v) => v && setPriority(v)}
                render={(id) => {
                  const p = priorityOf(cfg, id);
                  return p ? <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", LABEL_STYLES[p.color])}>{p.label}</span> : id;
                }}
              />
            </PropertyRow>
            <PropertyRow icon={<Folder className="size-4" />} label="Tags">
              <TagPicker cfg={cfg} value={tags} onChange={setTags} />
            </PropertyRow>
            {cfg.fields.map((f) => (
              <PropertyRow key={f.key} icon={<Tag className="size-4" />} label={f.label}>
                {f.type === "select" ? (
                  <OptionSelect
                    value={fields[f.key] || null}
                    options={f.options.map((o) => ({ id: o, label: o }))}
                    empty="—"
                    onChange={(v) => setFields((x) => ({ ...x, [f.key]: v ?? "" }))}
                  />
                ) : (
                  <Input
                    value={fields[f.key] ?? ""}
                    placeholder="—"
                    onChange={(e) => setFields((x) => ({ ...x, [f.key]: e.target.value }))}
                    className="border-transparent bg-transparent shadow-none hover:bg-muted dark:bg-transparent"
                  />
                )}
              </PropertyRow>
            ))}
          </div>
          <div className="mt-3 border-t pt-3">
            <MarkdownSection
              value=""
              placeholder="Write a description… Leave it empty to start from the default template."
              onSave={(md) => (content.current = md)}
              onChange={(md) => (content.current = md)}
              onOpenDoc={() => {}}
              basePath="tasks/yeni"
            />
          </div>
        </div>
        <DialogFooter className="items-center px-10 pb-6">
          <span className="mr-auto text-xs text-muted-foreground">
            <kbd>⌘</kbd>+<kbd>Enter</kbd> to create
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
