"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateDDMMYYYY, parseDDMMYYYYToYYYYMMDD, cn } from "@/lib/utils";

export interface DateInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  /** Value in yyyy-mm-dd (for form state). */
  value: string | null | undefined;
  /** Called with yyyy-mm-dd or null. */
  onChange: (value: string | null) => void;
}

/** yyyy-mm-dd -> Date (local). */
function yyyyMmDdToDate(s: string | null | undefined): Date | undefined {
  if (!s || s.length < 10) return undefined;
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

/** Date -> yyyy-mm-dd (local). */
function dateToYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Input that displays and edits dates in dd/mm/yyyy, with calendar picker. Value/onChange use yyyy-mm-dd. */
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, className, placeholder = "dd/mm/yyyy", disabled, ...props }, ref) => {
    const [display, setDisplay] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const lastValueRef = React.useRef<string | null>(null);

    const selectedDate = yyyyMmDdToDate(value);

    // Sync display from value (yyyy-mm-dd)
    React.useEffect(() => {
      const str = value ?? "";
      if (str === lastValueRef.current) return;
      lastValueRef.current = str || null;
      setDisplay(str ? formatDateDDMMYYYY(str) : "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplay(e.target.value);
    };

    const handleBlur = () => {
      const trimmed = display.trim();
      if (!trimmed) {
        onChange(null);
        setDisplay("");
        lastValueRef.current = null;
        return;
      }
      const yyyyMmDd = parseDDMMYYYYToYYYYMMDD(trimmed);
      if (yyyyMmDd) {
        onChange(yyyyMmDd);
        setDisplay(formatDateDDMMYYYY(yyyyMmDd));
        lastValueRef.current = yyyyMmDd;
      } else {
        setDisplay(lastValueRef.current ? formatDateDDMMYYYY(lastValueRef.current) : "");
      }
    };

    const handleSelect = (date: Date | undefined) => {
      if (!date) return;
      const yyyyMmDd = dateToYyyyMmDd(date);
      onChange(yyyyMmDd);
      setDisplay(formatDateDDMMYYYY(yyyyMmDd));
      lastValueRef.current = yyyyMmDd;
      setOpen(false);
    };

    return (
      <div className={cn("relative flex w-full", className)}>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className="rounded-r-none border-r-0 pr-2"
          {...props}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-l-none border-l h-9 px-3"
              disabled={disabled}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
