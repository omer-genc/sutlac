import { Check, Plus } from "@phosphor-icons/react";
import type { Config } from "@/api/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LABEL_STYLES, tagOf } from "@/lib/display";
import { cn } from "@/lib/utils";
import { GHOST_TRIGGER } from "./PropertyRow";

// Çoklu etiket seçici: seçili etiketler rozet olarak durur, tıklayınca aranabilir liste açılır.
// Liste docs/config.json > tags sırasındadır; işte olup listede olmayan etiket de gösterilir.
export function TagPicker({ cfg, value, onChange }: { cfg: Config; value: string[]; onChange: (next: string[]) => void }) {
  const order = cfg.tags.map((t) => t.id);
  const ids = [...new Set([...order, ...value])];
  const rank = (id: string) => order.indexOf(id) + 1 || ids.length + 1;
  const toggle = (id: string) => {
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(next.sort((a, b) => rank(a) - rank(b)));
  };

  return (
    // modal: Dialog içinde açıldığında liste kaydırılabilsin ve odak popover'da kalsın.
    <Popover modal>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex min-h-7 max-w-full min-w-0 flex-wrap items-center gap-1 rounded-md border px-2 py-1 text-xs/relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              GHOST_TRIGGER,
            )}
          />
        }
      >
        {value.length ? (
          value.map((id) => {
            const t = tagOf(cfg, id);
            return (
              <span key={id} className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", LABEL_STYLES[t.color])}>
                {t.label}
              </span>
            );
          })
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Plus className="size-3" /> Add tag
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags…" />
          <CommandList>
            <CommandEmpty>No tags</CommandEmpty>
            <CommandGroup>
              {ids.map((id) => {
                const t = tagOf(cfg, id);
                return (
                  <CommandItem key={id} value={`${t.label} ${id}`} onSelect={() => toggle(id)}>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", LABEL_STYLES[t.color])}>{t.label}</span>
                    {value.includes(id) && <Check className="ml-auto size-3.5" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
