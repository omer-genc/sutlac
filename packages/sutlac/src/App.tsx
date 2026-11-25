import "./index.css";
import { Plus } from "@phosphor-icons/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useConfig, useDoc, useDocs, useLiveReload } from "@/api/queries";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { NewTaskDialog } from "@/components/task/NewTaskDialog";
import { TaskDialog } from "@/components/task/TaskDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { BacklogPage } from "@/components/views/BacklogPage";
import { BoardView, boardOrder } from "@/components/views/BoardView";
import { DocsPage } from "@/components/views/DocsPage";
import { Filters } from "@/components/views/Filters";
import { ListView, groupTasks } from "@/components/views/ListView";
import { SprintHeader, StartSprintForm } from "@/components/views/SprintControls";
import { SprintsPage } from "@/components/views/SprintsPage";
import { isOpen, sprintLabel } from "@/lib/display";
import { activeSprint, matchesTask, placeOf, sortTasks } from "@/lib/filter";
import { useViewState, type Page, type ViewState } from "@/lib/url";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

const TITLES: Record<Page, string> = {
  board: "Board",
  backlog: "Backlog",
  tasks: "Tüm işler",
  sprints: "Sprintler",
  archive: "Arşiv",
  docs: "Dokümanlar",
  settings: "Ayarlar",
};

function Shell() {
  useLiveReload();
  const { data: cfg } = useConfig();
  const { data: docs = [] } = useDocs();
  const { state: st, task, set, go, openTask } = useViewState();
  const { data: taskDoc } = useDoc(task);
  const [newTask, setNewTask] = useState(false);

  const tasks = useMemo(() => docs.filter((d) => d.kind === "task"), [docs]);
  const sprints = useMemo(() => docs.filter((d) => d.kind === "sprint"), [docs]);
  const active = useMemo(() => activeSprint(docs), [docs]);

  /** Bir belgeyi türüne göre açar: iş diyalogda, sprint ve doküman kendi sayfasında. */
  const openDoc = (path: string) => {
    const d = docs.find((x) => x.path === path);
    if (!d || d.kind === "task") return openTask(path);
    if (d.kind === "sprint") return go("sprints", { sprint: d.num });
    go("docs", { doc: path });
  };

  // Eski linkler (`#/knowledge/x`, `#/sprints/sprint-2`) ilgili sayfaya yönlenir.
  useEffect(() => {
    const h = location.hash.slice(2);
    if (!h || task || !docs.length) return;
    if (docs.some((d) => d.path === h)) openDoc(h);
  }, [docs.length]);

  const place = (d: (typeof tasks)[number]) => (cfg ? placeOf(cfg, d, active) : "backlog");
  const filtered = useMemo(() => (cfg ? tasks.filter((d) => matchesTask(cfg, st, d)) : []), [cfg, st, tasks]);
  const board = useMemo(() => filtered.filter((d) => place(d) === "board"), [filtered, active]);
  const backlog = useMemo(() => filtered.filter((d) => place(d) === "backlog"), [filtered, active]);
  const archive = useMemo(
    () => (cfg ? sortTasks(cfg, "num-desc", filtered.filter((d) => place(d) === "archive")).sort((a, b) => (b.closed ?? "").localeCompare(a.closed ?? "")) : []),
    [filtered, active],
  );
  const all = useMemo(() => (cfg ? sortTasks(cfg, st.sort, filtered) : []), [cfg, filtered, st.sort]);

  // j/k gezinmesi ekranda görünen sırayı izler.
  const visible = useMemo(() => {
    if (!cfg) return [];
    if (st.page === "board") {
      const cols = boardOrder(cfg, board);
      return cfg.statuses.filter((s) => s.board).flatMap((s) => (cols.get(s.id) ?? []).map((d) => d.path));
    }
    if (st.page === "backlog") return sortTasks(cfg, "priority", backlog).map((d) => d.path);
    if (st.page === "archive") return groupTasks(cfg, "closed", archive).flatMap((g) => g.items.map((d) => d.path));
    if (st.page === "tasks") return groupTasks(cfg, st.group, all).flatMap((g) => g.items.map((d) => d.path));
    return [];
  }, [cfg, st, board, backlog, archive, all]);

  const step = (dir: 1 | -1) => {
    if (!visible.length) return;
    const i = task ? visible.indexOf(task) : -1;
    openTask(visible[i < 0 ? 0 : Math.min(Math.max(i + dir, 0), visible.length - 1)]!);
  };

  // Kısayollar: / ara, j/k sonraki/önceki iş, c yeni iş (Dialog kendi Esc'ini yönetir).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true], [role=listbox], [role=menu], [role=dialog] [cmdk-root]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey || newTask) return;
      if (e.key === "/") {
        e.preventDefault();
        openTask(null);
        document.querySelector<HTMLInputElement>("[data-search]")?.focus();
      } else if ((e.key === "j" || e.key === "k") && visible.length) {
        e.preventDefault();
        step(e.key === "j" ? 1 : -1);
      } else if (e.key === "c" && !task && ["board", "backlog", "tasks"].includes(st.page)) {
        e.preventDefault();
        setNewTask(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (cfg) document.title = cfg.title;
  }, [cfg?.title]);

  if (!cfg) return null;

  const counts: Partial<Record<Page, number>> = {
    board: active ? tasks.filter((d) => d.sprint === active.num).length : undefined,
    backlog: tasks.filter((d) => placeOf(cfg, d, active) === "backlog").length,
    tasks: tasks.filter((d) => isOpen(cfg, d)).length,
    sprints: sprints.length || undefined,
    archive: tasks.filter((d) => placeOf(cfg, d, active) === "archive").length,
    docs: docs.filter((d) => d.kind === "doc").length,
  };
  const taskPage = ["board", "backlog", "tasks", "archive"].includes(st.page);
  const shownCount = { board: board.length, backlog: backlog.length, tasks: all.length, archive: archive.length }[st.page as "board"];

  return (
    <div className="flex h-svh bg-sidebar">
      <Sidebar page={st.page} counts={counts} sprints={sprints} openSprint={st.sprint} onGo={(p) => go(p, { sprint: null })} onOpenSprint={(n) => go("sprints", { sprint: n })} />
      <main className="m-0 flex min-w-0 flex-1 flex-col overflow-hidden bg-background md:my-2 md:mr-2 md:rounded-xl md:shadow-sm">
        {taskPage && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b p-3">
            <h2 className="mr-1 ml-1 text-sm font-semibold">{TITLES[st.page]}</h2>
            <Filters cfg={cfg} st={st} set={set} />
            {st.page === "tasks" && (
              <>
                <Select
                  items={{ open: "Açık", all: "Tümü", ...Object.fromEntries(cfg.statuses.map((s) => [s.id, s.label])) }}
                  value={st.status}
                  onValueChange={(v) => {
                    if (v) set({ status: v })
                  }}
                >
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Açık</SelectItem>
                    <SelectItem value="all">Tümü</SelectItem>
                    {cfg.statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  items={{ "num-desc": "En yeni", "num-asc": "En eski", priority: "Önceliğe göre", updated: "Son değişen" }}
                  value={st.sort} onValueChange={(v) => set({ sort: v as ViewState["sort"] })}>
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="num-desc">En yeni</SelectItem>
                    <SelectItem value="num-asc">En eski</SelectItem>
                    <SelectItem value="priority">Önceliğe göre</SelectItem>
                    <SelectItem value="updated">Son değişen</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  items={{ status: "Duruma göre grupla", tags: "Etikete göre grupla", none: "Gruplama yok" }}
                  value={st.group} onValueChange={(v) => set({ group: v as ViewState["group"] })}>
                  <SelectTrigger className="h-8 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Duruma göre grupla</SelectItem>
                    <SelectItem value="tags">Etikete göre grupla</SelectItem>
                    <SelectItem value="none">Gruplama yok</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            <div className="ml-auto flex items-center gap-3">
              {st.page === "board" && active && (
                <SprintHeader sprint={active} tasks={tasks.filter((d) => d.sprint === active.num)} cfg={cfg} onOpen={() => go("sprints", { sprint: active.num })} />
              )}
              {st.page !== "board" && <span className="text-xs text-muted-foreground">{shownCount} iş</span>}
              {st.page === "tasks" && (
                <Button size="sm" onClick={() => setNewTask(true)} title="Yeni iş (c)">
                  <Plus /> Yeni iş
                </Button>
              )}
            </div>
          </div>
        )}
        <div className={cn("min-h-0 flex-1", st.page === "board" || st.page === "docs" || st.page === "backlog" ? "overflow-hidden" : "overflow-y-auto")}>
          {st.page === "board" &&
            (active ? (
              <BoardView cfg={cfg} list={board} selected={task} onOpen={openTask} onNew={() => setNewTask(true)} />
            ) : (
              <StartSprintForm next={Math.max(0, ...sprints.map((s) => s.num ?? 0)) + 1} />
            ))}
          {st.page === "backlog" && <BacklogPage cfg={cfg} list={backlog} active={active} onOpen={openTask} onNew={() => setNewTask(true)} />}
          {st.page === "tasks" && <ListView cfg={cfg} groups={groupTasks(cfg, st.group, all)} selected={task} onOpen={openTask} />}
          {st.page === "archive" && (
            <ListView cfg={cfg} groups={groupTasks(cfg, "closed", archive)} selected={task} onOpen={openTask} empty="Arşivde iş yok. Kapanan işler sprintleri bitince buraya geçer." />
          )}
          {st.page === "sprints" && <SprintsPage cfg={cfg} docs={docs} selected={st.sprint} onSelect={(n) => set({ sprint: n })} onOpenTask={openTask} onOpenDoc={openDoc} />}
          {st.page === "docs" && <DocsPage cfg={cfg} docs={docs} selected={st.doc} onSelect={(p) => set({ doc: p })} onOpenDoc={openDoc} />}
          {st.page === "settings" && <SettingsPage cfg={cfg} docs={docs} />}
        </div>
      </main>
      <TaskDialog
        doc={task ? taskDoc : undefined}
        cfg={cfg}
        sprints={sprints}
        onClose={() => openTask(null)}
        onOpenDoc={openDoc}
        onOpenSprint={(n) => {
          openTask(null);
          go("sprints", { sprint: n });
        }}
        onStep={step}
      />
      {newTask && (
        <NewTaskDialog
          cfg={cfg}
          defaultTag={st.tags[0] ?? ""}
          sprint={active ? { num: active.num!, label: sprintLabel(active) } : null}
          defaultInSprint={st.page === "board"}
          onClose={() => setNewTask(false)}
          onCreated={(path) => {
            setNewTask(false);
            openTask(path);
          }}
        />
      )}
      <Toaster richColors />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  );
}
