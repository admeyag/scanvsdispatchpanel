import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  fromIso: string;
  toIso: string;
  minIso: string;
  maxIso: string;
  onChange: (from: string, to: string) => void;
};

export function DateRangePicker({ fromIso, toIso, minIso, maxIso, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const range = useMemo<DateRange | undefined>(
    () =>
      fromIso && toIso ? { from: parseISO(fromIso), to: parseISO(toIso) } : undefined,
    [fromIso, toIso],
  );
  const min = minIso ? parseISO(minIso) : undefined;
  const max = maxIso ? parseISO(maxIso) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 justify-start gap-2 text-left font-normal",
            !range && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {range?.from ? (
            range.to ? (
              <span className="text-xs">
                {format(range.from, "MMM d")} – {format(range.to, "MMM d, yyyy")}
              </span>
            ) : (
              <span className="text-xs">{format(range.from, "MMM d, yyyy")}</span>
            )
          ) : (
            <span className="text-xs">Pick date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          defaultMonth={range?.from ?? max}
          selected={range}
          onSelect={(r) => {
            if (r?.from && r?.to) {
              onChange(format(r.from, "yyyy-MM-dd"), format(r.to, "yyyy-MM-dd"));
              setOpen(false);
            } else if (r?.from) {
              onChange(format(r.from, "yyyy-MM-dd"), format(r.from, "yyyy-MM-dd"));
            }
          }}
          numberOfMonths={1}
          disabled={(d) => (min && d < min) || (max && d > max) || false}
        />
      </PopoverContent>
    </Popover>
  );
}
