import type { Color, Config, Option, Status } from "../config";
import type { DocMeta } from "../docs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Renkler config'ten gelir ama Tailwind sınıf adlarını kaynakta görmeli; her renk açıkça yazılı.
// Tek token hem metni hem (alfa ile) yüzeyi verir (inci-doc TYPE_STYLES ile aynı yaklaşım).
export const LABEL_STYLES: Record<Color, string> = {
  red: "bg-label-red/15 text-label-red",
  orange: "bg-label-orange/15 text-label-orange",
  amber: "bg-label-amber/15 text-label-amber",
  green: "bg-label-green/15 text-label-green",
  teal: "bg-label-teal/15 text-label-teal",
  blue: "bg-label-blue/15 text-label-blue",
  purple: "bg-label-purple/15 text-label-purple",
  pink: "bg-label-pink/15 text-label-pink",
  gray: "bg-label-gray/15 text-label-gray",
};
export const DOT_STYLES: Record<Color, string> = {
  red: "bg-label-red",
  orange: "bg-label-orange",
  amber: "bg-label-amber",
  green: "bg-label-green",
  teal: "bg-label-teal",
  blue: "bg-label-blue",
  purple: "bg-label-purple",
  pink: "bg-label-pink",
  gray: "bg-label-gray",
};
export const COLOR_LABELS: Record<Color, string> = {
  red: "Red",
  orange: "Orange",
  amber: "Yellow",
  green: "Green",
  teal: "Teal",
  blue: "Blue",
  purple: "Purple",
  pink: "Pink",
  gray: "Gray",
};
const COLOR_VAR = (c: Color) => `var(--label-${c})`;

// Config'te olmayan bir değer gri ve ham haliyle görünür.
export const statusOf = (cfg: Config, id: string | null): Status =>
  cfg.statuses.find((s) => s.id === id) ?? { id: id ?? "", label: id || "—", color: "gray", closed: false, board: false };
export const tagOf = (cfg: Config, id: string): Option => cfg.tags.find((p) => p.id === id) ?? { id, label: id, color: "gray" };
export const priorityOf = (cfg: Config, id: string | null) => cfg.priorities.find((p) => p.id === id);
export const priorityRank = (cfg: Config, id: string | null) => {
  const i = cfg.priorities.findIndex((p) => p.id === id);
  return i < 0 ? cfg.priorities.length / 2 : i;
};
export const isOpen = (cfg: Config, d: DocMeta) => !statusOf(cfg, d.status).closed;
export const docLabel = (d: Pick<DocMeta, "kind" | "num" | "path" | "ref">) =>
  d.kind === "task"
    ? (d.ref ?? "")
    : d.kind === "sprint"
      ? `Sprint ${d.num}`
      : d.num != null && d.path.startsWith("decisions/")
        ? String(d.num).padStart(4, "0")
        : "";

/** "Sprint 3 — Hasar akışı" (ad yoksa yalnız numara). */
export const sprintLabel = (s: Pick<DocMeta, "num" | "title">) =>
  s.title && s.title !== `Sprint ${s.num}` ? `Sprint ${s.num} — ${s.title}` : `Sprint ${s.num}`;

export function Dot({ color, className }: { color: Color; className?: string }) {
  return <span className={cn("size-2 shrink-0 rounded-full", DOT_STYLES[color], className)} />;
}

/**
 * Durum ikonu (Linear tarzı): ilk açık durum kesikli halka, diğer açıklar yarım dolu,
 * ilk kapalı tik, diğer kapalılar çarpı. Anlam config'teki sıradan gelir.
 */
export function StatusIcon({ cfg, status, className }: { cfg: Config; status: string | null; className?: string }) {
  const s = statusOf(cfg, status);
  const c = COLOR_VAR(s.color);
  const first = cfg.statuses.find((x) => x.closed === s.closed)?.id === s.id;
  const cls = cn("size-3.5 shrink-0", className);
  if (s.closed && first)
    return (
      <svg className={cls} viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="6" fill={c} />
        <path d="M4.2 7.2l1.9 1.9 3.8-3.9" stroke="var(--background)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (s.closed)
    return (
      <svg className={cls} viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="6" fill={c} />
        <path d="M5 5l4 4M9 5l-4 4" stroke="var(--background)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  if (first)
    return (
      <svg className={cls} viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="5.5" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="2.4 1.6" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5.5" fill="none" stroke={c} strokeWidth="1.5" />
      <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill={c} />
    </svg>
  );
}

export function OptionBadge({ option, className }: { option: Option; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", LABEL_STYLES[option.color], className)}>
      {option.label}
    </Badge>
  );
}

export function PriorityBadge({ cfg, priority }: { cfg: Config; priority: string | null }) {
  const p = priorityOf(cfg, priority);
  return p ? <OptionBadge option={p} /> : null;
}

export function TagBadges({ cfg, tags }: { cfg: Config; tags: string[] }) {
  return tags.map((id) => <OptionBadge key={id} option={tagOf(cfg, id)} />);
}
