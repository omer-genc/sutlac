import { CalendarBlank } from "@phosphor-icons/react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// shadcn Date Picker deseni: Popover içinde tek seçimli Calendar; tetikleyici
// düğme seçili tarihi (yoksa placeholder) gösterir, seçim popover'ı kapatır.
export function DatePicker({
  value,
  onChange,
  placeholder = "Tarih seç",
  className,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground", className)}
          />
        }
      >
        <CalendarBlank />
        {value ? format(value, "d MMMM yyyy", { locale: tr }) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
          locale={tr}
          defaultMonth={value}
        />
      </PopoverContent>
    </Popover>
  );
}
