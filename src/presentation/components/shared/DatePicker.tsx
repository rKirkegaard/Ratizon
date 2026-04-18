import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { da } from "react-day-picker/locale";
import { format, parse, isValid } from "date-fns";
import "react-day-picker/style.css";

/**
 * Danish DatePicker — mirrors the ironcoach20260128 implementation.
 * Popover with month/year dropdown selectors, Danish locale, Monday week start.
 * Stores dates as yyyy-MM-dd, displays as Danish long format.
 */

export interface DatePickerProps {
  value: string;                    // yyyy-MM-dd or ""
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  yearStart?: number;
  yearEnd?: number;
  required?: boolean;
}

const MONTHS = [
  "Januar", "Februar", "Marts", "April", "Maj", "Juni",
  "Juli", "August", "September", "Oktober", "November", "December",
];

function toDate(value: string): Date | null {
  if (!value) return null;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : null;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Vaelg dato",
  disabled = false,
  className = "",
  yearStart = 1920,
  yearEnd = new Date().getFullYear() + 10,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const parsed = useMemo(() => toDate(value), [value]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(parsed ?? new Date());

  useEffect(() => {
    if (parsed) setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [parsed]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const displayValue = parsed ? format(parsed, "d. MMMM yyyy", { locale: da }) : "";

  const years = useMemo(() => {
    const s = Math.min(yearStart, yearEnd);
    const e = Math.max(yearStart, yearEnd);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }, [yearStart, yearEnd]);

  function handleSelect(date: Date | undefined) {
    if (date && isValid(date)) {
      onChange(format(date, "yyyy-MM-dd"));
    } else {
      onChange("");
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded border border-input bg-background px-3 py-2 text-sm transition-colors hover:bg-accent/30 disabled:opacity-50 ${
          displayValue ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span>{displayValue || placeholder}</span>
        <CalendarDays size={14} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 rounded-lg border border-border bg-card p-0 shadow-lg">
          {/* Month/Year selectors */}
          <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
            <select
              value={calendarMonth.getMonth()}
              onChange={(e) => setCalendarMonth(new Date(calendarMonth.getFullYear(), Number(e.target.value), 1))}
              className="h-8 rounded border border-input bg-background px-2 text-xs text-foreground"
            >
              {MONTHS.map((label, i) => (
                <option key={label} value={i}>{label}</option>
              ))}
            </select>
            <select
              value={calendarMonth.getFullYear()}
              onChange={(e) => setCalendarMonth(new Date(Number(e.target.value), calendarMonth.getMonth(), 1))}
              className="h-8 rounded border border-input bg-background px-2 text-xs text-foreground"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Calendar grid */}
          <div className="p-2">
            <DayPicker
              mode="single"
              locale={da}
              weekStartsOn={1}
              selected={parsed ?? undefined}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelect={handleSelect}
              hideNavigation
              classNames={{
                root: "text-foreground text-sm",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "text-muted-foreground w-9 text-center text-[0.75rem] font-normal",
                week: "flex mt-1",
                day: "h-9 w-9 text-center text-sm p-0",
                day_button: "h-9 w-9 rounded font-normal hover:bg-accent cursor-pointer aria-selected:opacity-100",
                selected: "bg-primary text-primary-foreground hover:bg-primary",
                today: "bg-accent text-accent-foreground",
                outside: "text-muted-foreground opacity-50",
                disabled: "text-muted-foreground opacity-50",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
