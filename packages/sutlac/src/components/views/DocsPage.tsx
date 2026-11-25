import { CaretRight, FileText, Plus } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { Config, DocMeta } from "@/api/client";
import { useCreatePage, useDoc } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CommentList } from "@/components/task/CommentList";
import { BodyEditor, DocActions, PageProps, SourceEditor, TitleField } from "@/components/task/DocParts";
import { docLabel } from "@/lib/display";
import { matchesQuery } from "@/lib/filter";
import { cn } from "@/lib/utils";

// inci-doc DocsPage: solda doküman ağacı, sağda sayfa. Ağaç docs/ klasör yapısıdır
// (tasks/ ve sprints/ hariç); yeni doküman bir klasöre dosya olarak eklenir.

const FOLDER_LABELS: Record<string, string> = { decisions: "Decisions", knowledge: "Knowledge" };
const folderLabel = (f: string) => FOLDER_LABELS[f] ?? f.split("/").pop()!;

type Folder = { path: string; docs: DocMeta[]; children: Folder[] };

function buildTree(docs: DocMeta[]): Folder {
  const root: Folder = { path: "", docs: [], children: [] };
  const get = (path: string): Folder => {
    if (!path) return root;
    const parent = get(path.split("/").slice(0, -1).join("/"));
    let f = parent.children.find((c) => c.path === path);
    if (!f) parent.children.push((f = { path, docs: [], children: [] }));
    return f;
  };
  for (const d of docs) get(d.path.split("/").slice(0, -1).join("/")).docs.push(d);
  const sort = (f: Folder) => {
    f.docs.sort((a, b) => (a.num ?? 1e9) - (b.num ?? 1e9) || a.title.localeCompare(b.title, "en"));
    f.children.sort((a, b) => folderLabel(a.path).localeCompare(folderLabel(b.path), "en"));
    f.children.forEach(sort);
  };
  sort(root);
  return root;
}

function TreeFolder({
  folder,
  depth,
  selected,
  open,
  onToggle,
  onSelect,
  onCreate,
}: {
  folder: Folder;
  depth: number;
  selected: string | null;
  open: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onCreate: (folder: string) => void;
}) {
  const isOpen = !folder.path || open.has(folder.path);
  const pad = { paddingLeft: `${depth * 12 + 4}px` };
  return (
    <div>
      {folder.path && (
        <div className="group flex items-center gap-1 rounded-md px-1 py-1 text-sm hover:bg-muted" style={pad}>
          <button className="flex min-w-0 flex-1 items-center gap-1 text-left font-medium" onClick={() => onToggle(folder.path)}>
            <CaretRight className={cn("size-3 shrink-0 transition-transform", isOpen && "rotate-90")} />
            <span className="truncate">{folderLabel(folder.path)}</span>
            <span className="text-xs font-normal text-muted-foreground">{folder.docs.length}</span>
          </button>
          <button
            className="invisible rounded p-0.5 text-muted-foreground group-hover:visible hover:bg-muted-foreground/20"
            onClick={() => onCreate(folder.path)}
            title="Add a doc to this folder"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      )}
      {isOpen && (
        <>
          {folder.children.map((c) => (
            <TreeFolder key={c.path} folder={c} depth={folder.path ? depth + 1 : depth} selected={selected} open={open} onToggle={onToggle} onSelect={onSelect} onCreate={onCreate} />
          ))}
          {folder.docs.map((d) => (
            <button
              key={d.path}
              onClick={() => onSelect(d.path)}
              style={{ paddingLeft: `${(folder.path ? depth + 1 : depth) * 12 + 8}px` }}
              className={cn("mt-0.5 flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm hover:bg-muted", selected === d.path && "bg-muted font-medium")}
            >
              {docLabel(d) ? (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{docLabel(d)}</span>
              ) : (
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">{d.title}</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

export function DocsPage({
  cfg,
  docs,
  selected,
  onSelect,
  onOpenDoc,
}: {
  cfg: Config;
  docs: DocMeta[];
  selected: string | null;
  onSelect: (path: string) => void;
  onOpenDoc: (path: string) => void;
}) {
  const [q, setQ] = useState("");
  const pages = docs.filter((d) => d.kind === "doc");
  const tree = useMemo(() => buildTree(pages.filter((d) => matchesQuery(q, d))), [pages, q]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(["decisions", "knowledge"]));
  // Açılan dokümanın klasörü ağaçta açık olsun.
  useEffect(() => {
    if (!selected) return;
    const parts = selected.split("/").slice(0, -1);
    setOpen((o) => new Set([...o, ...parts.map((_, i) => parts.slice(0, i + 1).join("/"))]));
  }, [selected]);
  const [creating, setCreating] = useState<string | null>(null);
  const current = selected && pages.some((d) => d.path === selected) ? selected : (pages.find((d) => d.path === "README")?.path ?? null);

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-72 shrink-0 flex-col gap-2 border-r p-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-muted-foreground">Docs</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setCreating("knowledge")} title="New doc">
            <Plus />
          </Button>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search docs" className="h-7" />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TreeFolder
            folder={tree}
            depth={0}
            selected={current}
            open={q ? new Set(pages.map((d) => d.path.split("/")[0]!)) : open}
            onToggle={(p) => setOpen((o) => (o.has(p) ? new Set([...o].filter((x) => x !== p)) : new Set([...o, p])))}
            onSelect={onSelect}
            onCreate={setCreating}
          />
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto">
        {current ? (
          <DocPage key={current} path={current} cfg={cfg} onOpenDoc={onOpenDoc} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a doc on the left.</div>
        )}
      </div>
      {creating != null && (
        <NewDocDialog
          folder={creating}
          folders={[...new Set(pages.map((d) => d.path.split("/").slice(0, -1).join("/")))].sort()}
          onClose={() => setCreating(null)}
          onCreated={(p) => {
            setCreating(null);
            onSelect(p);
          }}
        />
      )}
    </div>
  );
}

function DocPage({ path, cfg, onOpenDoc }: { path: string; cfg: Config; onOpenDoc: (path: string) => void }) {
  const { data: doc } = useDoc(path);
  const [source, setSource] = useState(false);
  if (!doc) return null;
  const folder = path.split("/").slice(0, -1).join("/");
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 px-4 py-2 text-xs text-muted-foreground">
        {folder && <span className="px-1">{folderLabel(folder)} /</span>}
        <DocActions doc={doc} source={source} onSource={() => setSource((s) => !s)} />
      </div>
      {source ? (
        <SourceEditor doc={doc} onDone={() => setSource(false)} />
      ) : (
        <div className="mx-auto flex w-full max-w-4xl flex-col px-10 pt-3 pb-10 sm:px-14">
          <TitleField doc={doc} />
          {doc.props.length > 0 && (
            <div className="mt-3 flex flex-col">
              <PageProps doc={doc} />
            </div>
          )}
          <Separator className="my-4" />
          <BodyEditor doc={doc} onOpenDoc={onOpenDoc} />
          <Separator className="my-6" />
          <CommentList path={doc.path} comments={doc.commentList} onOpenDoc={onOpenDoc} />
        </div>
      )}
    </div>
  );
}

function NewDocDialog({ folder, folders, onClose, onCreated }: { folder: string; folders: string[]; onClose: () => void; onCreated: (path: string) => void }) {
  const create = useCreatePage();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(folder);
  const submit = () => title.trim() && create.mutate([target, title], { onSuccess: (d) => onCreated(d.path) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New doc</DialogTitle>
        </DialogHeader>
        <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Title" className="h-9 text-sm" />
        <div className="flex flex-wrap gap-1">
          {folders.map((f) => (
            <button
              key={f || "/"}
              onClick={() => setTarget(f)}
              className={cn("rounded-md border px-1.5 py-0.5 text-xs", target === f ? "border-transparent bg-primary text-primary-foreground" : "border-dashed text-muted-foreground hover:text-foreground")}
            >
              {f ? folderLabel(f) : "docs/"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {target === "decisions" ? "Decisions are created with the next number and the decision template." : `Created as a .md file under docs/${target ? `${target}/` : ""}`}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim() || create.isPending}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
