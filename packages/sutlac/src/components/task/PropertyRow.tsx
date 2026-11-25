import type { ReactNode } from "react";

// Notion tarzı özellik satırı: solda soluk ikon + etiket, sağda değer.
// TaskDialog ve NewTaskDialog ortak kullanır.
export const GHOST_TRIGGER =
  "max-w-full min-w-0 border-transparent bg-transparent shadow-none hover:bg-muted dark:bg-transparent dark:hover:bg-muted *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:overflow-hidden";

export function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-center gap-4">
      <div className="flex w-32 shrink-0 items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  );
}
