import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TaskWithAssignmentDetails } from "@shared/schema";

let XLSX_LAZY: any = null;
let XLSX_LOADING: Promise<any> | null = null;
export async function loadXLSX(): Promise<any> {
  if (XLSX_LAZY) return XLSX_LAZY;
  if (!XLSX_LOADING) {
    XLSX_LOADING = import("xlsx").then((m) => { XLSX_LAZY = m; return m; });
  }
  return XLSX_LOADING;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Normalize string for diacritics-insensitive search. */
export function normalizeSearch(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
}

export function getLastNameKey(input: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  const single = raw.split(",")[0]?.trim() ?? "";
  const parts = single.split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1] ?? single).trim();
}

export function compareNamesByLastNameAZ(a: string, b: string): number {
  const aa = String(a ?? "").trim();
  const bb = String(b ?? "").trim();
  if (!aa && !bb) return 0;
  if (!aa) return 1;
  if (!bb) return -1;

  const al = getLastNameKey(aa);
  const bl = getLastNameKey(bb);
  const primary = al.localeCompare(bl, "vi", {
    sensitivity: "base",
    ignorePunctuation: true,
    numeric: true,
  });
  if (primary !== 0) return primary;
  return aa.localeCompare(bb, "vi", {
    sensitivity: "base",
    ignorePunctuation: true,
    numeric: true,
  });
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
  // ddmmyyyy (8 chữ số liền nhau, ví dụ: 31012026)
  const ddmmyyyyMatch = s.match(/^(\d{8})$/);
  if (ddmmyyyyMatch) {
    const full = ddmmyyyyMatch[1];
    const d = parseInt(full.slice(0, 2), 10);
    const m = parseInt(full.slice(2, 4), 10) - 1;
    const y = parseInt(full.slice(4, 8), 10);
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

/** Format number theo chuẩn kế toán Việt Nam: dấu chấm (.) phân tách mỗi 1000, dấu phẩy (,) phân tách phần thập phân. Số tiền/số nguyên: decimals=0 (không thập phân). */
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

/** Format tỷ lệ % theo chuẩn kế toán Việt Nam: dấu chấm (.) phân tách mỗi 1000, dấu phẩy (,) phân tách phần thập phân. 
 * Nhận giá trị 0–1 (thập phân) hoặc 0–100 (đã là %).
 * Lưu ý: Database có thể lưu completionRate dưới dạng thập phân (0.010147) hoặc % (1.0147).
 * Nếu giá trị > 1 và < 100, có thể là % nhưng thiếu số 0 ở đầu (ví dụ: 1.0147 = 101.47%), nên nhân 100.
 */
export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (Number.isNaN(n)) return "—";
  let pct: number;
  if (Math.abs(n) <= 1) {
    // Giá trị 0-1: thập phân, nhân 100 để thành %
    pct = n * 100;
  } else if (Math.abs(n) > 1 && Math.abs(n) < 100) {
    // Giá trị 1-100: có thể là % nhưng thiếu số 0 ở đầu (ví dụ: 1.0147 thực ra là 101.47%)
    // Hoặc có thể là % đã đúng (ví dụ: 50 = 50%)
    // Kiểm tra: nếu có phần thập phân > 0.01, có thể là thiếu số 0, nhân 100
    // Nếu không có phần thập phân hoặc phần thập phân nhỏ, giữ nguyên
    const hasSignificantDecimals = Math.abs(n) - Math.floor(Math.abs(n)) > 0.01;
    pct = hasSignificantDecimals ? n * 100 : n;
  } else {
    // Giá trị >= 100: đã là % đầy đủ
    pct = n;
  }
  // Format theo chuẩn kế toán: dấu chấm phân tách hàng nghìn, dấu phẩy phân tách phần thập phân
  const fixed = pct.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots},${decPart}%`;
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

export function buildExportPrefix(): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  return `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(
    now.getDate(),
  )}.[${pad(now.getHours())}.${pad(now.getMinutes())}]`;
}

/* =========================================================================
 * [G5-P0] Color helpers — 1 nguồn sự thật thay cho 6 bản copy trong các file page
 * Sử dụng HSL CSS variables (theo Design System mới) thay vì hardcode tailwind.
 * Trả về tuple [badgeClasses, textClasses] để dùng className.
 * ========================================================================= */

export type TaskStatus =
  | "Not Started"
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | string;

export type TaskPriority = "Critical" | "High" | "Medium" | "Low" | string;

export interface TaskColorClasses {
  badge: string; // wrapper className (background + border radius + px/py)
  text: string;  // text color
}

/**
 * Trả về className Badge màu theo Trạng thái công việc.
 * Sử dụng HSL CSS variables --status-* đã định nghĩa trong index.css.
 * Đảm bảo WCAG AA contrast 4.5+: dùng text-slate-900/white (universal dark)
 * trên bg tinted 32-40% + border 80-85% family để distinct rõ.
 * Variant="ghost" ở Badge sẽ bỏ variant default (nó inject text-primary-foreground
 * gây FAIL contrast trên tinted bg).
 * Lưu: text class và class màu được MERGE vào .badge LUÔN (không chỉ .text)
 * để các helper cũ `getStatusBadgeClass = (s) => .badge` vẫn nhận đúng chữ.
 */
export function getTaskStatusColor(status: TaskStatus | null | undefined): TaskColorClasses {
  const s = String(status ?? "").trim();
  const universalDarkText = "!text-slate-900 dark:!text-white font-semibold";
  switch (s) {
    case "Not Started":
      return {
        badge:
          `bg-status-muted/35 border-status-muted/80 border ${universalDarkText}`,
        text:  universalDarkText,
      };
    case "Pending":
      return {
        badge:
          `bg-status-warning/38 border-status-warning/85 border ${universalDarkText}`,
        text:  universalDarkText,
      };
    case "In Progress":
      return {
        badge:
          `bg-status-info/36 border-status-info/85 border ${universalDarkText}`,
        text:  universalDarkText,
      };
    case "Completed":
      return {
        badge:
          `bg-status-success/40 border-status-success/85 border ${universalDarkText}`,
        text:  universalDarkText,
      };
    case "Cancelled":
      return {
        badge:
          `bg-status-danger/34 border-status-danger/85 border ${universalDarkText}`,
        text:  universalDarkText,
      };
    default:
      return {
        badge:
          `bg-muted/40 border-border/80 border ${universalDarkText}`,
        text:  universalDarkText,
      };
  }
}

/**
 * Trả về className Badge màu theo Mức độ Ưu tiên.
 * Cùng nguyên tắc WCAG: universal dark text + tinted bg + dark border.
 */
export function getTaskPriorityColor(priority: TaskPriority | null | undefined): TaskColorClasses {
  const p = String(priority ?? "").trim();
  const boldText = "!text-slate-900 dark:!text-white font-semibold";
  switch (p) {
    case "Critical":
      return {
        badge:
          `bg-destructive/35 border-destructive/85 border ${boldText}`,
        text:  boldText,
      };
    case "High":
      return {
        badge:
          `bg-group-admin/36 border-group-admin/80 border ${boldText}`,
        text:  boldText,
      };
    case "Medium":
      return {
        badge:
          `bg-group-thuky/40 border-group-thuky/80 border ${boldText}`,
        text:  boldText,
      };
    case "Low":
      return {
        badge:
          `bg-status-muted/35 border-status-muted/80 border !text-slate-900 dark:!text-white font-medium`,
        text:  "!text-slate-900 dark:!text-white font-medium",
      };
    default:
      return {
        badge:
          `bg-muted/40 border-border/80 border !text-slate-900 dark:!text-white font-medium`,
        text:  "!text-slate-900 dark:!text-white font-medium",
      };
  }
}

/* =========================================================================
 * [G5-P0] Vote color (Đánh giá 4 mức — tiếng Việt keys)
 * ========================================================================= */

export type VoteKey = "tot" | "kha" | "khong_tot" | "khong_hoan_thanh" | string;

export function getVoteColor(vote: VoteKey | null | undefined): TaskColorClasses & { label: string } {
  const v = String(vote ?? "").toLowerCase().trim();
  switch (v) {
    case "tot":
      return { ...getTaskStatusColor("Completed"), label: "Hoàn thành tốt" };
    case "kha":
      return {
        badge: "bg-status-info/15 border-status-info/30 border",
        text:  "text-[hsl(var(--status-info))]",
        label: "Hoàn thành khá",
      };
    case "khong_tot":
      return {
        badge: "bg-status-warning/15 border-status-warning/30 border",
        text:  "text-[hsl(var(--status-warning))]",
        label: "Không tốt",
      };
    case "khong_hoan_thanh":
      return {
        ...getTaskStatusColor("Cancelled"),
        label: "Không hoàn thành",
      };
    default:
      return { badge: "bg-muted", text: "text-muted-foreground", label: v || "—" };
  }
}

/* =========================================================================
 * [G4-P0] Universal Excel export helper.
 * Gộp 6 bản handleExportTasks từ cv-chung, bien-tap, thiet-ke, cntt,
 * thu-ky-hop-phan, dashboard thành 1 hàm duy nhất.
 *
 * Tham số `opts.extraHeaderFields` & `opts.extraRowFields` dùng để:
 * - Biên tập thêm: "Loại bông", "Tác phẩm liên quan", "Hợp phần", "GĐ"
 * - Các nhóm khác nếu cần thêm cột đặc thù.
 * Tham số `opts.assignmentLabelFn` override mapping stageType → label (Thiết kế/CNTT dùng khác CV-chung).
 * ========================================================================= */

export interface ExportTasksLocalize {
  noDataTitle: string;
  noDataDesc: string;
  statusMap?: Partial<Record<string, string>>;
  priorityMap?: Partial<Record<string, string>>;
}

export interface ExportTasksOptions<
  T extends TaskWithAssignmentDetails = TaskWithAssignmentDetails,
> {
  fileNameSuffix: string;   // VD: "CV_Chung_Tasks", "Bien_Tap_Tasks"
  localize: ExportTasksLocalize;
  /** Mặc định 15 headers chuẩn. Thêm cột đặc thù (mảng header strings) */
  extraHeaderFields?: string[];
  /** Hàm trả về mảng giá trị extra cho mỗi task (cùng thứ tự với extraHeaderFields) */
  extraRowFields?: (task: T) => (string | number)[];
  /** Override label stageType (ví dụ thiết kế: ktv_chinh → "KTV chính", tro_ly_1 → "Trợ lý 1") */
  assignmentLabelFn?: (stageType: string) => string;
  /** Inject cột đánh giá (vote). Default = true (đọc task.vote). */
  includeVoteColumn?: boolean;
  /** Mảng indices cột ngày (default: các cột 9,10,11,13,14 theo chuẩn base 15 headers) */
  dateColumnIndices?: number[];
  /** Indices cột merge khi 1 task có nhiều assignment rows. Default = [0,1,2,3,4,5,6,7,12,13,14] */
  mergeSharedColumns?: number[];
}

const DEFAULT_STATUS_VI: Record<string, string> = {
  "Not Started": "Chưa bắt đầu",
  "In Progress": "Đang thực hiện",
  "Completed":   "Hoàn thành",
  "Pending":     "Tạm dừng",
  "Cancelled":   "Đã hủy",
};
const DEFAULT_PRIORITY_VI: Record<string, string> = {
  Critical: "Khẩn cấp",
  High:     "Cao",
  Medium:   "Trung bình",
  Low:      "Thấp",
};

/** Default assignment stageType → label tiếng Việt theo CV-chung */
export function defaultAssignmentLabel(stageType: string): string {
  if (stageType === "kiem_soat") return "Người kiểm soát";
  if (stageType.startsWith("nhan_su_")) return "Nhân sự " + stageType.replace("nhan_su_", "");
  if (stageType === "primary") return "Người thực hiện";
  if (stageType === "ktv_chinh") return "KTV chính";
  if (stageType.startsWith("tro_ly_")) return "Trợ lý " + stageType.replace("tro_ly_", "");
  if (stageType === "btv1") return "Biên tập viên 1";
  if (stageType === "btv2") return "Biên tập viên 2";
  if (stageType === "doc_duyet" || stageType === "duyet") return "Người đọc duyệt";
  if (stageType === "btv") return "BTV phê duyệt";
  return stageType;
}

export async function exportTasksToExcel<T extends TaskWithAssignmentDetails>(
  filteredTasks: T[],
  opts: ExportTasksOptions<T>,
): Promise<{ ok: boolean; rows: number; fileName: string }> {
  const {
    fileNameSuffix,
    localize,
    extraHeaderFields = [],
    extraRowFields,
    assignmentLabelFn = defaultAssignmentLabel,
    includeVoteColumn = true,
  } = opts;

  if (!filteredTasks || filteredTasks.length === 0) {
    return { ok: false, rows: 0, fileName: "" };
  }

  const XLSX = await loadXLSX();

  const statusMap  = { ...DEFAULT_STATUS_VI, ...(localize.statusMap ?? {}) };
  const priorityMap = { ...DEFAULT_PRIORITY_VI, ...(localize.priorityMap ?? {}) };

  const baseHeaders = [
    "ID",
    "Tiêu đề",
    "Nhóm",
    "Trạng thái",
    "Mức độ ưu tiên",
    "Tiến độ (%)",
    "Mô tả",
  ];
  if (includeVoteColumn) baseHeaders.push("Đánh giá");
  baseHeaders.push(
    "Nhân sự",
    "Ngày nhận công việc",
    "Hạn hoàn thành",
    "Ngày hoàn thành thực tế",
    "Ghi chú",
    "Ngày tạo",
    "Ngày cập nhật",
  );
  const headers = [...baseHeaders, ...extraHeaderFields];

  const sheetData: (string | number)[][] = [headers];
  const rowBlocks: Array<{ startRow: number; height: number }> = [];
  const extraLen = extraHeaderFields.length;

  filteredTasks.forEach((task) => {
    const assignments = Array.isArray(task.assignments) ? (task.assignments as any[]) : [];
    const persons: Array<{
      label: string; name: string; received: string; due: string; completed: string;
    }> = assignments.length
      ? assignments.map((a: any) => ({
          label: assignmentLabelFn(a.stageType || ""),
          name:  a.displayName ?? a.userId ?? "",
          received: formatDateDDMMYYYY(a.receivedAt),
          due:      formatDateDDMMYYYY(a.dueDate),
          completed:formatDateDDMMYYYY(a.completedAt),
        }))
      : [{ label: "", name: "", received: "", due: "", completed: "" }];

    const startRow = sheetData.length + 1;
    rowBlocks.push({ startRow, height: persons.length });

    const voteExtra: string[] = includeVoteColumn ? [getVoteColor((task as any).vote).label] : [];
    const extraVals: (string | number)[] = extraRowFields ? extraRowFields(task) : Array(extraLen).fill("");

    persons.forEach((p) => {
      sheetData.push([
        task.id ?? "",
        task.title ?? "",
        task.group ?? "",
        statusMap[String(task.status ?? "")] ?? String(task.status ?? ""),
        priorityMap[String(task.priority ?? "")] ?? String(task.priority ?? ""),
        typeof task.progress === "number" ? task.progress : "",
        task.description ?? "",
        ...voteExtra,
        (p.label ? `${p.label}: ` : "") + (p.name || ""),
        p.received,
        p.due,
        p.completed,
        (task as any).notes ?? "",
        formatDateDDMMYYYY(task.createdAt as any),
        formatDateDDMMYYYY(task.updatedAt as any),
        ...extraVals,
      ]);
    });
  });

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

  // Mặc định merge cols 0..14 không phải nhân sự (ID -> Ngày cập nhật) trừ cột 8 Nhân sự
  const voteOffset = includeVoteColumn ? 1 : 0;
  const defaultMerge = [0,1,2,3,4,5,6];
  if (includeVoteColumn) defaultMerge.push(7);
  defaultMerge.push(10 + voteOffset, 11 + voteOffset, 12 + voteOffset, 13 + voteOffset);
  const mergeCols = opts.mergeSharedColumns ?? defaultMerge;

  rowBlocks.forEach((blk) => {
    if (blk.height <= 1) return;
    const startR0 = blk.startRow - 1;
    const endR0 = startR0 + blk.height - 1;
    mergeCols.forEach((c) => {
      worksheet["!merges"] = worksheet["!merges"] || [];
      worksheet["!merges"].push({ s: { r: startR0, c }, e: { r: endR0, c } });
    });
  });

  // Header bold + center + border
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    const cell = worksheet[addr];
    if (cell) {
      cell.s = {
        font: { bold: true },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        },
      };
    }
  }

  const dateCols = opts.dateColumnIndices ?? [
    9 + voteOffset, 10 + voteOffset, 11 + voteOffset, 13 + voteOffset, 14 + voteOffset,
  ];
  // Data cells: wrap text + border + date center
  for (let R = 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[addr];
      if (!cell) continue;
      const isDate = dateCols.includes(C);
      cell.s = {
        alignment: {
          horizontal: isDate ? "center" : "left",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        },
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
  const fileName = `${buildExportPrefix()}_${fileNameSuffix}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return { ok: true, rows: filteredTasks.length, fileName };
}

/* =========================================================================
 * [G5-P0] Default Columns cho 6 nhóm nghiệp vụ.
 * Sử dụng trong TaskTable component khi page gọi Column Picker.
 * Object keys: `groupCode` (6 nhóm) -> Partial<ColumnVisibilityMap>
 * ========================================================================= */

export interface TaskColumnVisibilityMap {
  id: boolean;
  title: boolean;
  group: boolean;
  status: boolean;
  priority: boolean;
  progress: boolean;
  assignee: boolean;
  description: boolean;
  vote: boolean;
  roundType: boolean;
  receivedDate: boolean;
  dueDate: boolean;
  actualCompletedAt: boolean;
  notes: boolean;
  createdAt: boolean;
  updatedAt: boolean;
  workLink: boolean;
  contractLink: boolean;
  ktvChinh: boolean;
  troLyCount: boolean;
  btv1: boolean;
  btv2: boolean;
  docDuyet: boolean;
  kiemSoat: boolean;
  nhanSuCount: boolean;
  kyThuatVien: boolean;
  groupTypePill: boolean;
}

export const DEFAULT_GROUP_COLUMNS: Record<string, Partial<TaskColumnVisibilityMap>> = {
  // Công việc chung: 6 cột mặc định, ẩn group vì luôn CV-chung
  cv_chung: {
    id: true, title: true, group: false, status: true,
    priority: false, progress: true, assignee: true, description: false,
    vote: false, dueDate: true, actualCompletedAt: false, notes: false,
    receivedDate: false, createdAt: false, updatedAt: false,
  },
  // Biên tập: 6 cột mặc định gồm BTV1, Loại bông, Work link
  bien_tap: {
    id: true, title: true, group: false, status: false, priority: false,
    progress: true, dueDate: true, roundType: true, workLink: true, btv1: true,
    description: false, vote: false, receivedDate: false, createdAt: false, updatedAt: false,
  },
  // Thiết kế: 6 cột mặc định gồm KTV chính, Số trợ lý
  thiet_ke: {
    id: true, title: true, group: false, status: true, priority: false,
    progress: true, dueDate: true, ktvChinh: true, troLyCount: true,
    description: false, vote: false, createdAt: false, updatedAt: false,
  },
  // CNTT: 6 cột mặc định gồm Kỹ thuật viên, Loại group (CNTT / Quét trùng lặp)
  cntt: {
    id: true, title: true, group: false, groupTypePill: true, status: true, priority: false,
    progress: true, dueDate: true, kyThuatVien: true,
    description: false, vote: false, createdAt: false, updatedAt: false,
  },
  // Thư ký hợp phần - Tab Tasks: thêm Liên kết HĐ (contractLink)
  thu_ky_hp: {
    id: true, title: true, group: true, status: true, priority: false,
    progress: true, dueDate: true, assignee: true, contractLink: true,
    description: false, vote: false, createdAt: false, updatedAt: false,
  },
  // Quản trị / Audit toàn hệ thống: hiện Group cột + đầy đủ tracking
  admin_audit: {
    id: true, title: true, group: true, status: true, priority: true,
    progress: true, assignee: true, dueDate: true, createdAt: true, updatedAt: true,
  },
};

/* =========================================================================
 * [G5-P0] hasGroupPermission predicate — 1 nguồn sự thật thay cho 5 bản
 * copy ở (cv-chung, bien-tap, thiet-ke, cntt, thu-ky-hop-phan).
 *
 * Lưu ý: Trả về true BẤT KỲ khi role là ADMIN hoặc MANAGER (giống pattern
 * hiện tại trong thiet-ke.tsx & cntt.tsx).
 * ========================================================================= */

export interface GroupPermissionInput {
  role: string;                // VD: "admin" | "manager" | "employee" (hoặc UserRole enum string)
  userId?: string | number;
  displayName?: string;
  /** Mã group code được phép (không dấu, không space). VD: ["thietke", "cntt"] */
  allowedGroupCodes?: string[];
  /** Tên group tiếng Việt cho phép (có dấu). VD: ["Thiết kế", "CNTT", "Quét trùng lặp"] */
  allowedGroupNames?: string[];
  /** Roles cộng tác viên được phép. VD: ["thiet_ke_lead", "secretary"] */
  allowedRoleCodes?: string[];
  /** Danh sách groups user đang có (từ auth useAuth user.groups[]) */
  userGroups?: Array<{ name?: string | null; code?: string | null }>;
  /** Danh sách roles user đang có (từ auth useAuth user.roles[]) */
  userRoles?: Array<{ name?: string | null; code?: string | null }>;
}

function normalizeLike(str: string): string {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim();
}

export function hasGroupPermission(input: GroupPermissionInput): boolean {
  const r = String(input.role ?? "").trim().toUpperCase();
  // ADMIN / MANAGER luôn pass
  if (r === "ADMIN" || r === "MANAGER") return true;

  // Nếu có allowedRoleCodes & user.roles khớp -> pass
  if (input.allowedRoleCodes && input.allowedRoleCodes.length > 0 && input.userRoles) {
    const normAllowed = input.allowedRoleCodes.map(normalizeLike);
    for (const ur of input.userRoles) {
      const nName = normalizeLike(ur.name ?? "");
      const nCode = normalizeLike(ur.code ?? "");
      if (normAllowed.includes(nName) || normAllowed.includes(nCode)) return true;
    }
  }

  // Match group code hoặc name
  const hasGroupMatch =
    (input.allowedGroupCodes?.length ?? 0) + (input.allowedGroupNames?.length ?? 0) === 0
      ? true
      : (input.userGroups ?? []).some((g) => {
          const nCode = normalizeLike(g.code ?? "");
          const nName = normalizeLike(g.name ?? "");
          const byCode = (input.allowedGroupCodes ?? []).some(
            (c) => normalizeLike(c) === nCode || nCode.includes(normalizeLike(c)),
          );
          const byName = (input.allowedGroupNames ?? []).some(
            (name) => normalizeLike(name) === nName || nName.includes(normalizeLike(name)),
          );
          return byCode || byName;
        });
  return hasGroupMatch;
}

