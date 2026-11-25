import { Archive, FileText, Flag, Gear, Kanban, ListBullets, ListChecks, Moon, Sun, Tray } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { DocMeta } from "@/api/client";
import { sprintLabel } from "@/lib/display";
import { useTheme } from "@/lib/theme";
import type { Page } from "@/lib/url";
import { cn } from "@/lib/utils";

// inci-doc AppSidebar (shadcn sidebar "inset" varyantı) görünümü: üstte sayfalar, altında
// geçmiş sprintler, en altta ayarlar ve tema.

function Item({ active, icon, label, count, onClick }: { active?: boolean; icon: ReactNode; label: ReactNode; count?: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-xs outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {count != null && <span className="ml-auto text-[11px] font-normal text-muted-foreground tabular-nums">{count}</span>}
    </button>
  );
}

export function Sidebar({
  page,
  counts,
  sprints,
  openSprint,
  onGo,
  onOpenSprint,
}: {
  page: Page;
  counts: Partial<Record<Page, number>>;
  sprints: DocMeta[];
  openSprint: number | null;
  onGo: (page: Page) => void;
  onOpenSprint: (num: number) => void;
}) {
  const { theme, toggle } = useTheme();
  const nav: { page: Page; label: string; icon: ReactNode }[] = [
    { page: "board", label: "Board", icon: <Kanban /> },
    { page: "backlog", label: "Backlog", icon: <Tray /> },
    { page: "tasks", label: "Tüm işler", icon: <ListBullets /> },
    { page: "sprints", label: "Sprintler", icon: <Flag /> },
    { page: "archive", label: "Arşiv", icon: <Archive /> },
    { page: "docs", label: "Dokümanlar", icon: <FileText /> },
  ];
  // Kapanmış sprintler: sprint sayfasına linkli sade liste (en yeni üstte).
  const closed = sprints.filter((s) => s.closed).sort((a, b) => (b.num ?? 0) - (a.num ?? 0));

  return (
    <aside className="hidden w-64 shrink-0 flex-col text-sidebar-foreground md:flex">
      <div className="px-4 pt-3.5 pb-2.5 text-[13px] font-semibold">Docs</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="flex flex-col gap-0.5 pt-2">
          {nav.map((n) => (
            <Item key={n.page} active={page === n.page && !(n.page === "sprints" && openSprint != null && closed.some((s) => s.num === openSprint))} icon={n.icon} label={n.label} count={counts[n.page]} onClick={() => onGo(n.page)} />
          ))}
        </div>
        {closed.length > 0 && (
          <div className="flex flex-col gap-0.5 pt-2">
            <div className="flex h-8 items-center px-2 text-xs font-medium text-sidebar-foreground/70">Geçmiş sprintler</div>
            {closed.map((s) => (
              <Item key={s.path} active={page === "sprints" && openSprint === s.num} icon={<ListChecks />} label={sprintLabel(s)} onClick={() => onOpenSprint(s.num!)} />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-2">
        <Item active={page === "settings"} icon={<Gear />} label="Ayarlar" onClick={() => onGo("settings")} />
        <Item icon={theme === "dark" ? <Sun /> : <Moon />} label={theme === "dark" ? "Açık tema" : "Koyu tema"} onClick={toggle} />
      </div>
    </aside>
  );
}
