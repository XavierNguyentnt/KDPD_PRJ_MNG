import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse to local date (no UTC shift). Returns [year, month0, day] or null. */
function parseToLocalDate(value: string | Date | null | undefined): [number, number, number] | null {
  if (value == null || value === "") return null;
  if (typeof value === "object" && "getFullYear" in value) {
    const d = value as Date;
    if (isNaN(d.getTime())) return null;
    return [d.getFullYear(), d.getMonth(), d.getDate()];
  }
  const s = String(value).trim();
  // yyyy-mm-dd (ISO or date-only)
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    if (y >= 1970 && y <= 2100 && m >= 0 && m <= 11 && d >= 1 && d <= 31) return [y, m, d];
  }
  // dd/mm/yyyy or dd-mm-yyyy
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    if (y >= 1970 && y <= 2100 && m >= 0 && m <= 11 && d >= 1 && d <= 31) return [y, m, d];
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return [d.getFullYear(), d.getMonth(), d.getDate()];
}

/** Format date to dd/mm/yyyy for display (project-wide). Accepts ISO, yyyy-mm-dd, dd/mm/yyyy, or Date. */
export function formatDateDDMMYYYY(value: string | Date | null | undefined): string {
  const parsed = parseToLocalDate(value);
  if (!parsed) return "";
  const [year, month0, day] = parsed;
  const dd = String(day).padStart(2, "0");
  const mm = String(month0 + 1).padStart(2, "0");
  return `${dd}/${mm}/${year}`;
}

/** Parse dd/mm/yyyy or dd-mm-yyyy to yyyy-mm-dd for storage. Returns null if invalid. */
export function parseDDMMYYYYToYYYYMMDD(input: string | null | undefined): string | null {
  const parsed = parseToLocalDate(input);
  if (!parsed) return null;
  const [year, month0, day] = parsed;
  const dd = String(day).padStart(2, "0");
  const mm = String(month0 + 1).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Return the latest date string (yyyy-mm-dd) among the given values, or null if none. */
export function maxDateString(...values: (string | null | undefined)[]): string | null {
  const valid = values.filter((v): v is string => typeof v === "string" && v.length >= 10);
  if (valid.length === 0) return null;
  const sorted = valid.slice().sort((a, b) => {
    const da = new Date(a.slice(0, 10)).getTime();
    const db = new Date(b.slice(0, 10)).getTime();
    return db - da;
  });
  return sorted[0].slice(0, 10);
}
