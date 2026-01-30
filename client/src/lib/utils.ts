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

/** Format number theo chuẩn kế toán: dấu chấm phân tách mỗi 1000. Số tiền/số nguyên: decimals=0 (không thập phân). Chỉ tỷ lệ % dùng 2 chữ số thập phân (formatPercent). */
export function formatNumberAccounting(value: number | string | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "—";
  if (decimals === 0) {
    const intStr = Math.round(n).toString();
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  const fixed = n.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart != null ? `${withDots},${decPart}` : withDots;
}

/** Format tỷ lệ %: làm tròn đến hàng thập phân thứ hai. Nhận giá trị 0–1 (thập phân) hoặc 0–100 (đã là %). */
export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (Number.isNaN(n)) return "—";
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
}

const ONES = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const TEENS = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
function readBlock(n: number, hasHundred: boolean): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  let s = "";
  if (h > 0) s += ONES[h] + " trăm ";
  if (t === 0) {
    if (h > 0 && o > 0) s += "lẻ " + (o === 1 ? "một" : ONES[o]);
    else if (o > 0) s += ONES[o];
  } else if (t === 1) s += TEENS[o] || "mười";
  else s += ONES[t] + " mươi " + (o === 1 ? "một" : o === 5 ? "lăm" : ONES[o]);
  return s.trim();
}

/** Chuyển số tiền sang chữ (Việt Nam). Số nguyên + phần thập phân (nếu có), kết thúc bằng "đồng". */
export function numberToVietnameseWords(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n) || n < 0) return "";
  const intPart = Math.floor(n);
  const decPart = Math.round((n - intPart) * 100);
  if (intPart === 0 && decPart === 0) return "Không đồng";
  const blocks: string[] = [];
  let rest = intPart;
  const billion = Math.floor(rest / 1e9);
  rest %= 1e9;
  const million = Math.floor(rest / 1e6);
  rest %= 1e6;
  const thousand = Math.floor(rest / 1e3);
  rest %= 1e3;
  if (billion > 0) blocks.push(readBlock(billion, true) + " tỷ");
  if (million > 0) blocks.push(readBlock(million, true) + " triệu");
  if (thousand > 0) blocks.push(readBlock(thousand, true) + " nghìn");
  if (rest > 0) blocks.push(readBlock(rest, true));
  let result = blocks.join(" ").trim() || "không";
  if (decPart > 0) result += " phẩy " + readBlock(decPart, true);
  return (result.charAt(0).toUpperCase() + result.slice(1)).trim() + " đồng.";
}
