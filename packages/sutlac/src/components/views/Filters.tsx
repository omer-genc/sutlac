import { Check, Funnel, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { Config } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LABEL_STYLES, priorityOf, tagOf } from "@/lib/display";
import type { ViewState } from "@/lib/url";
import { cn } from "@/lib/utils";

// inci-doc BoardFilters: arama + "Filtre" açılır menüsü + kaldırılabilir çipler. Board,
// Backlog, Tüm işler ve Arşiv aynı süzgeçleri paylaşır (URL'de durur).

function FilterChip({ label, className, onRemove }: { label: string; className?: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", className)}>
      {label}
      <button type="button" data-icon="inline-end" onClick={onRemove} className="opacity-60 transition-opacity hover:opacity-100">
        <X className="size-2.5" weight="bold" />
        <span className="sr-only">Remove {label} filter</span>
      </button>
    </Badge>
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function Filters({ cfg, st, set }: { cfg: Config; st: ViewState; set: (p: Partial<ViewState>) => void }) {
  const check = (on: boolean) => on && <Check className="ml-auto size-3.5" />;
  const selectFields = cfg.fields.filter((f) => f.type === "select");
  const active = st.tags.length + st.priorities.length > 0 || Object.values(st.fx).some((v) => v.length);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <MagnifyingGlass className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={st.q}
          onChange={(e) => set({ q: e.target.value })}
          onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
          placeholder={`Search or ${cfg.prefix}-12  ( / )`}
          data-search
          className="h-8 w-56 pl-8"
        />
      </div>
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="ghost" size="sm" className="text-muted-foreground" />
          }
        >
          <Funnel /> Filter
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Filter..." />
            <CommandList>
              <CommandEmpty>No results</CommandEmpty>
              <CommandGroup heading="Priority">
                {cfg.priorities.map((p) => (
                  <CommandItem key={p.id} value={`priority ${p.label}`} onSelect={() => set({ priorities: toggle(st.priorities, p.id) })}>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", LABEL_STYLES[p.color])}>{p.label}</span>
                    {check(st.priorities.includes(p.id))}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Tag">
                {cfg.tags.map((p) => (
                  <CommandItem key={p.id} value={`tag ${p.label} ${p.id}`} onSelect={() => set({ tags: toggle(st.tags, p.id) })}>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", LABEL_STYLES[p.color])}>{p.label}</span>
                    {check(st.tags.includes(p.id))}
                  </CommandItem>
                ))}
              </CommandGroup>
              {selectFields.map((f) => (
                <CommandGroup key={f.key} heading={f.label}>
                  {[...f.options, "-"].map((o) => (
                    <CommandItem
                      key={o}
                      value={`${f.label} ${o}`}
                      onSelect={() => set({ fx: { ...st.fx, [f.key]: toggle(st.fx[f.key] ?? [], o) } })}
                    >
                      {o === "-" ? "Empty" : o}
                      {check((st.fx[f.key] ?? []).includes(o))}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {st.priorities.map((id) => {
        const p = priorityOf(cfg, id);
        return <FilterChip key={id} label={p?.label ?? id} className={p && LABEL_STYLES[p.color]} onRemove={() => set({ priorities: toggle(st.priorities, id) })} />;
      })}
      {st.tags.map((id) => (
        <FilterChip key={id} label={tagOf(cfg, id).label} className={LABEL_STYLES[tagOf(cfg, id).color]} onRemove={() => set({ tags: toggle(st.tags, id) })} />
      ))}
      {selectFields.flatMap((f) =>
        (st.fx[f.key] ?? []).map((o) => (
          <FilterChip
            key={`${f.key}:${o}`}
            label={`${f.label}: ${o === "-" ? "Empty" : o}`}
            onRemove={() => set({ fx: { ...st.fx, [f.key]: toggle(st.fx[f.key] ?? [], o) } })}
          />
        )),
      )}
      {active && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => set({ tags: [], priorities: [], fx: {} })}>
          Clear
        </Button>
      )}
    </div>
  );
}
