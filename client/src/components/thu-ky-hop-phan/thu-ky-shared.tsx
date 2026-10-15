import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { api, buildUrl } from "@shared/routes";
import type {
  Work,
  TranslationContract,
  ProofreadingContract,
  Component,
  Payment,
} from "@shared/schema";
import { formatDateDDMMYYYY } from "@/lib/utils";

export const PAGE_SIZE = 10;
export const CHARS_PER_PAGE = 350;
export const ROLE_THU_KY_NAME = "Thư ký hợp phần";
export const ROLE_THU_KY_CODE = "prj_secretary";

// Sort types for each table
export type WorkSortColumn =
  | "component"
  | "titleVi"
  | "titleHannom"
  | "stage"
  | "documentCode"
  | "baseWordCount"
  | "basePageCount"
  | "estimateFactor"
  | "estimateWordCount"
  | "estimatePageCount";

export type TranslationContractSortColumn =
  | "contractNumber"
  | "component"
  | "unitPrice"
  | "overviewValue"
  | "translationValue"
  | "contractValue"
  | "startDate"
  | "endDate"
  | "extensionStartDate"
  | "extensionEndDate"
  | "actualCompletionDate"
  | "actualWordCount"
  | "actualPageCount"
  | "completionRate"
  | "settlementValue";

export type ProofreadingContractSortColumn =
  | "contractNumber"
  | "component"
  | "contractValue"
  | "startDate"
  | "endDate"
  | "actualCompletionDate"
  | "pageCount"
  | "rateRatio";

export type WorksProgressFilter =
  | "all"
  | "signed_contract"
  | "progress_check"
  | "expert_review"
  | "project_acceptance"
  | "settlement"
  | "proofreading_completed"
  | "editing_completed"
  | "design_completed";

export type ContractPill = {
  label: string;
  tone: "muted" | "info" | "success" | "warning" | "danger";
};

export const contractPillClass: Record<ContractPill["tone"], string> = {
  muted: "bg-slate-100 text-slate-700 border-slate-300",
  info: "bg-blue-100 text-blue-700 border-blue-300",
  success: "bg-green-100 text-green-700 border-green-300",
  warning: "bg-amber-100 text-amber-700 border-amber-300",
  danger: "bg-red-100 text-red-700 border-red-300",
};

/** Quy ước: 350 chữ = 1 trang cơ sở. Số trang = số chữ / 350 (làm tròn). */
export function charsToPages(chars: number): number {
  return Math.round(chars / CHARS_PER_PAGE);
}

/** Hiển thị giai đoạn: lưu 1,2,3... → hiển thị "GĐ 1", "GĐ 2", "GĐ 3". */
export function formatStageDisplay(stage: string | null | undefined): string {
  if (stage == null || stage === "") return "—";
  const num = String(stage).replace(/\D/g, "");
  return num ? "GĐ " + num : "GĐ " + stage;
}

/** Lấy phần số từ giá trị giai đoạn (để hiển thị trong ô nhập). */
export function parseStageNumber(stage: string | null | undefined): string {
  if (stage == null || stage === "") return "";
  const num = String(stage).replace(/\D/g, "");
  return num || String(stage);
}

export function parseDateOnly(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const s = String(value);
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = Number.parseInt(isoMatch[1], 10);
    const m = Number.parseInt(isoMatch[2], 10) - 1;
    const d = Number.parseInt(isoMatch[3], 10);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function getTcDueDate(c: TranslationContract): Date | null {
  return parseDateOnly(c.extensionEndDate ?? c.endDate);
}

export function getPcDueDate(c: ProofreadingContract): Date | null {
  return parseDateOnly(c.endDate);
}

export function daysUntil(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
}

export function formatDurationMonths(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
): string {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return "—";
  if (end.getTime() < start.getTime()) return "—";
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    (end.getDate() - start.getDate()) / 30;
  const rounded = Math.max(0, months);
  const str = rounded.toFixed(1);
  return str.endsWith(".0") ? str.slice(0, -2) : str;
}

export function buildTranslationContractPills(
  contract: TranslationContract,
  opts: { proofreadingCompletedDate?: string; editingCompletedDate?: string },
): ContractPill[] {
  const pills: ContractPill[] = [];
  const proofreadingCompleted =
    contract.proofreadingCompleted || !!opts.proofreadingCompletedDate;
  const editingCompleted =
    contract.editingCompleted || !!opts.editingCompletedDate;
  if (!contract.progressCheckDate) {
    pills.push({ label: "Chưa kiểm tra tiến độ", tone: "muted" });
  } else {
    pills.push({
      label: `Đã kiểm tra tiến độ (${formatDateDDMMYYYY(
        contract.progressCheckDate,
      )})`,
      tone: "info",
    });
  }
  if (contract.expertReviewDate) {
    pills.push({
      label: `Đã thẩm định cấp chuyên gia (${formatDateDDMMYYYY(
        contract.expertReviewDate,
      )})`,
      tone: "info",
    });
  }
  if (contract.projectAcceptanceDate) {
    pills.push({
      label: `Đã nghiệm thu cấp Dự án (${formatDateDDMMYYYY(
        contract.projectAcceptanceDate,
      )})`,
      tone: "success",
    });
  }
  if (contract.proofreadingInProgress) {
    pills.push({ label: "Đang hiệu đính", tone: "info" });
  }
  if (proofreadingCompleted) {
    pills.push({
      label: `Hoàn thành hiệu đính (${
        opts.proofreadingCompletedDate
          ? formatDateDDMMYYYY(opts.proofreadingCompletedDate)
          : "—"
      })`,
      tone: "success",
    });
  }
  if (contract.editingInProgress) {
    pills.push({ label: "Đang biên tập", tone: "info" });
  }
  if (editingCompleted) {
    pills.push({
      label: `Hoàn thành biên tập (${
        opts.editingCompletedDate
          ? formatDateDDMMYYYY(opts.editingCompletedDate)
          : "—"
      })`,
      tone: "success",
    });
  }
  if (contract.printTransferDate) {
    pills.push({
      label: `Chuyển in (${formatDateDDMMYYYY(contract.printTransferDate)})`,
      tone: "warning",
    });
  }
  if (contract.publishedDate) {
    pills.push({
      label: `Đã xuất bản (${formatDateDDMMYYYY(contract.publishedDate)})`,
      tone: "success",
    });
  }
  if (contract.status === "Cancel" && contract.cancelledAt) {
    pills.push({
      label: `Đã hủy (${formatDateDDMMYYYY(contract.cancelledAt)})`,
      tone: "danger",
    });
  }
  return pills;
}

export function generatePaginationItems(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | "ellipsis")[] = [];

  if (currentPage <= 3) {
    for (let i = 1; i <= 5; i++) {
      items.push(i);
    }
    items.push("ellipsis");
    items.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    items.push(1);
    items.push("ellipsis");
    for (let i = totalPages - 4; i <= totalPages; i++) {
      items.push(i);
    }
  } else {
    items.push(1);
    items.push("ellipsis");
    items.push(currentPage - 1);
    items.push(currentPage);
    items.push(currentPage + 1);
    items.push("ellipsis");
    items.push(totalPages);
  }

  return items;
}

// Sortable header component with multi-sort support
export function SortableHead<T extends string>({
  label,
  column,
  sortColumns,
  onSort,
  className,
  style,
}: {
  label: React.ReactNode;
  column: T;
  sortColumns?: Array<{ column: T; dir: "asc" | "desc" }>;
  onSort?: (column: T, e?: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const sortInfo = sortColumns?.find((s) => s.column === column);
  const sortIndex = sortInfo
    ? sortColumns!.findIndex((s) => s.column === column)
    : -1;
  const Icon = sortInfo
    ? sortInfo.dir === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead
      className={className}
      style={style}
      onClick={onSort ? (e) => onSort(column, e) : undefined}
      role={onSort ? "button" : undefined}
      tabIndex={onSort ? 0 : undefined}
      onKeyDown={
        onSort ? (e) => e.key === "Enter" && onSort(column) : undefined
      }
      title={
        onSort
          ? "Click để thêm sắp xếp. Click lại để đổi hướng (↑→↓). Click lần 3 để xóa."
          : undefined
      }>
      <div
        className={`flex items-center gap-1 ${
          onSort ? "cursor-pointer select-none hover:opacity-80" : ""
        }`}>
        {label}
        {onSort && (
          <div className="flex items-center gap-0.5">
            {sortIndex >= 0 && (
              <span
                className="text-xs font-medium text-primary"
                title={`Ưu tiên ${sortIndex + 1}`}>
                {sortIndex + 1}
              </span>
            )}
            <Icon className="w-3.5 h-3.5 opacity-70" />
          </div>
        )}
      </div>
    </TableHead>
  );
}

export function sortWorks(
  works: Work[],
  sortColumns: Array<{ column: WorkSortColumn; dir: "asc" | "desc" }>,
  getComponentName: (id: string | null) => string,
): Work[] {
  if (sortColumns.length === 0) return works.slice();

  return works.slice().sort((a, b) => {
    for (const { column: sortBy, dir: sortDir } of sortColumns) {
      const dir = sortDir === "asc" ? 1 : -1;
      let av: any, bv: any;

      if (sortBy === "component") {
        av = getComponentName(a.componentId);
        bv = getComponentName(b.componentId);
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue;
      } else if (sortBy === "stage") {
        av = a.stage ?? "";
        bv = b.stage ?? "";
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue;
      } else if (
        sortBy === "baseWordCount" ||
        sortBy === "basePageCount" ||
        sortBy === "estimateWordCount" ||
        sortBy === "estimatePageCount"
      ) {
        av = a[sortBy] ?? null;
        bv = b[sortBy] ?? null;
        if (av === null && bv === null) continue;
        if (av === null) return 1 * dir;
        if (bv === null) return -1 * dir;
        const diff = Number(av) - Number(bv);
        if (diff !== 0) return diff * dir;
        continue;
      } else if (sortBy === "estimateFactor") {
        av = a.estimateFactor != null ? Number(a.estimateFactor) : null;
        bv = b.estimateFactor != null ? Number(b.estimateFactor) : null;
        if (av === null && bv === null) continue;
        if (av === null) return 1 * dir;
        if (bv === null) return -1 * dir;
        const diff = av - bv;
        if (diff !== 0) return diff * dir;
        continue;
      } else {
        av = a[sortBy] ?? "";
        bv = b[sortBy] ?? "";
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue;
      }
    }
    return 0;
  });
}

export function sortTranslationContracts(
  contracts: TranslationContract[],
  sortColumns: Array<{
    column: TranslationContractSortColumn;
    dir: "asc" | "desc";
  }>,
  getComponentName: (id: string | null) => string,
): TranslationContract[] {
  if (sortColumns.length === 0) return contracts.slice();

  return contracts.slice().sort((a, b) => {
    for (const { column: sortBy, dir: sortDir } of sortColumns) {
      const dir = sortDir === "asc" ? 1 : -1;
      let av: any, bv: any;

      if (sortBy === "component") {
        av = getComponentName(a.componentId);
        bv = getComponentName(b.componentId);
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue;
      } else if (
        sortBy === "unitPrice" ||
        sortBy === "overviewValue" ||
        sortBy === "translationValue" ||
        sortBy === "contractValue" ||
        sortBy === "actualWordCount" ||
        sortBy === "actualPageCount" ||
        sortBy === "completionRate" ||
        sortBy === "settlementValue"
      ) {
        av = a[sortBy] ?? null;
        bv = b[sortBy] ?? null;
        if (av === null && bv === null) continue;
        if (av === null) return 1 * dir;
        if (bv === null) return -1 * dir;
        const diff = Number(av) - Number(bv);
        if (diff !== 0) return diff * dir;
        continue;
      } else if (
        sortBy === "startDate" ||
        sortBy === "endDate" ||
        sortBy === "extensionStartDate" ||
        sortBy === "extensionEndDate" ||
        sortBy === "actualCompletionDate"
      ) {
        const ad = parseDateOnly(a[sortBy]);
        const bd = parseDateOnly(b[sortBy]);
        if (!ad && !bd) continue;
        if (!ad) return 1 * dir;
        if (!bd) return -1 * dir;
        const diff = ad.getTime() - bd.getTime();
        if (diff !== 0) return diff * dir;
        continue;
      } else {
        av = a[sortBy] ?? "";
        bv = b[sortBy] ?? "";
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue;
      }
    }
    return 0;
  });
}

export function sortProofreadingContracts(
  contracts: ProofreadingContract[],
  sortColumns: Array<{
    column: ProofreadingContractSortColumn;
    dir: "asc" | "desc";
  }>,
  getComponentName: (id: string | null) => string,
): ProofreadingContract[] {
  if (sortColumns.length === 0) return contracts.slice();

  return contracts.slice().sort((a, b) => {
    for (const { column: sortBy, dir: sortDir } of sortColumns) {
      const dir = sortDir === "asc" ? 1 : -1;
      let av: any, bv: any;

      if (sortBy === "component") {
        av = getComponentName(a.componentId);
        bv = getComponentName(b.componentId);
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue;
      } else if (
        sortBy === "contractValue" ||
        sortBy === "pageCount" ||
        sortBy === "rateRatio"
      ) {
        av = a[sortBy] ?? null;
        bv = b[sortBy] ?? null;
        if (av === null && bv === null) continue;
        if (av === null) return 1 * dir;
        if (bv === null) return -1 * dir;
        const diff = Number(av) - Number(bv);
        if (diff !== 0) return diff * dir;
        continue;
      } else if (
        sortBy === "startDate" ||
        sortBy === "endDate" ||
        sortBy === "actualCompletionDate"
      ) {
        const ad = parseDateOnly(a[sortBy]);
        const bd = parseDateOnly(b[sortBy]);
        if (!ad && !bd) continue;
        if (!ad) return 1 * dir;
        if (!bd) return -1 * dir;
        const diff = ad.getTime() - bd.getTime();
        if (diff !== 0) return diff * dir;
        continue;
      } else {
        av = a[sortBy] ?? "";
        bv = b[sortBy] ?? "";
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue;
      }
    }
    return 0;
  });
}

// --- API fetchers ---
export async function fetchWorks(): Promise<Work[]> {
  const res = await fetch(api.works.list.path, { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được danh mục tác phẩm");
  return res.json();
}

export async function fetchTranslationContracts(): Promise<TranslationContract[]> {
  const res = await fetch(api.translationContracts.list.path, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Không tải được hợp đồng dịch thuật");
  return res.json();
}

export async function fetchProofreadingContracts(): Promise<ProofreadingContract[]> {
  const res = await fetch(api.proofreadingContracts.list.path, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Không tải được hợp đồng hiệu đính");
  return res.json();
}

export async function fetchComponents(): Promise<Component[]> {
  const res = await fetch(api.components.list.path, { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được danh sách hợp phần");
  return res.json();
}

export async function fetchFinanceSummary(
  contractId: string,
): Promise<{ totalPaid: number; totalAdvance: number; outstanding: number }> {
  const res = await fetch(
    buildUrl(api.finance.translationContractSummary.path, { id: contractId }),
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Không tải được tóm tắt tài chính");
  return res.json();
}

export async function fetchFinanceSummaryPc(
  contractId: string,
): Promise<{ totalPaid: number; totalAdvance: number; outstanding: number }> {
  const res = await fetch(
    buildUrl(api.finance.proofreadingContractSummary.path, { id: contractId }),
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Không tải được tóm tắt tài chính");
  return res.json();
}

export async function fetchContractPayments(contractId: string): Promise<Payment[]> {
  const res = await fetch(
    buildUrl(api.payments.listByTranslationContract.path, { id: contractId }),
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Không tải được danh sách chi trả");
  return res.json();
}
