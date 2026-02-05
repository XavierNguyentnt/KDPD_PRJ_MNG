import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useTasks,
  useCreateTask,
  useDeleteTask,
  UserRole,
} from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { useUsers } from "@/hooks/use-works-and-components";
import { TranslatorPicker } from "@/components/translator-picker";
import {
  TaskTable,
  sortTasks,
  type TaskSortColumn,
} from "@/components/task-table";
import { TaskKanbanBoard } from "@/components/task-kanban-board";
import { TaskStatsBadgesOnly } from "@/components/task-stats";
import { TaskDialog } from "@/components/task-dialog";
import {
  TaskFilters,
  getDefaultTaskFilters,
  applyTaskFilters,
  type TaskFilterState,
} from "@/components/task-filters";
import { api, buildUrl } from "@shared/routes";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import type {
  Work,
  TranslationContract,
  ProofreadingContract,
  Component,
  ContractStage,
} from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Pencil,
  FileText,
  Search,
  Trash2,
  Upload,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
  Eye,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WorksImport } from "@/components/works-import";
import { DateInput } from "@/components/ui/date-input";
import { NumberInput } from "@/components/ui/number-input";
import { WorkPicker } from "@/components/work-picker";
import {
  formatDateDDMMYYYY,
  formatNumberAccounting,
  formatPercent,
  numberToVietnameseWords,
  normalizeSearch,
} from "@/lib/utils";

const PAGE_SIZE = 10;

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

// Sort functions with multi-column support
function sortWorks(
  works: Work[],
  sortColumns: Array<{ column: WorkSortColumn; dir: "asc" | "desc" }>,
  getComponentName: (id: string | null) => string
): Work[] {
  if (sortColumns.length === 0) return works.slice();

  const sorted = works.slice().sort((a, b) => {
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
        continue; // Equal values, try next sort column
      } else if (sortBy === "stage") {
        av = a.stage ?? "";
        bv = b.stage ?? "";
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue; // Equal values, try next sort column
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
        const cmp = Number(av) - Number(bv);
        if (cmp !== 0) return cmp * dir;
        continue; // Equal values, try next sort column
      } else if (sortBy === "estimateFactor") {
        av = a.estimateFactor ?? null;
        bv = b.estimateFactor ?? null;
        if (av === null && bv === null) continue;
        if (av === null) return 1 * dir;
        if (bv === null) return -1 * dir;
        const cmp = Number(av) - Number(bv);
        if (cmp !== 0) return cmp * dir;
        continue; // Equal values, try next sort column
      } else {
        av = a[sortBy as keyof Work] ?? "";
        bv = b[sortBy as keyof Work] ?? "";
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue; // Equal values, try next sort column
      }
    }
    return 0;
  });
  return sorted;
}

function sortTranslationContracts(
  contracts: TranslationContract[],
  sortColumns: Array<{
    column: TranslationContractSortColumn;
    dir: "asc" | "desc";
  }>,
  getComponentName: (id: string | null) => string
): TranslationContract[] {
  if (sortColumns.length === 0) return contracts.slice();

  const sorted = contracts.slice().sort((a, b) => {
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
        continue; // Equal values, try next sort column
      } else if (
        sortBy === "startDate" ||
        sortBy === "endDate" ||
        sortBy === "extensionStartDate" ||
        sortBy === "extensionEndDate" ||
        sortBy === "actualCompletionDate"
      ) {
        av = a[sortBy]
          ? typeof a[sortBy] === "string"
            ? a[sortBy].slice(0, 10)
            : (a[sortBy] as Date).toISOString().slice(0, 10)
          : "";
        bv = b[sortBy]
          ? typeof b[sortBy] === "string"
            ? b[sortBy].slice(0, 10)
            : (b[sortBy] as Date).toISOString().slice(0, 10)
          : "";
        if (av === bv) continue;
        const cmp = av < bv ? -1 : 1;
        if (cmp !== 0) return cmp * dir;
        continue; // Equal values, try next sort column
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
        const avNum = typeof av === "string" ? parseFloat(av) : Number(av);
        const bvNum = typeof bv === "string" ? parseFloat(bv) : Number(bv);
        const cmp = avNum - bvNum;
        if (cmp !== 0) return cmp * dir;
        continue; // Equal values, try next sort column
      } else {
        av = a[sortBy as keyof TranslationContract] ?? "";
        bv = b[sortBy as keyof TranslationContract] ?? "";
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue; // Equal values, try next sort column
      }
    }
    return 0;
  });
  return sorted;
}

function sortProofreadingContracts(
  contracts: ProofreadingContract[],
  sortColumns: Array<{
    column: ProofreadingContractSortColumn;
    dir: "asc" | "desc";
  }>,
  getComponentName: (id: string | null) => string
): ProofreadingContract[] {
  if (sortColumns.length === 0) return contracts.slice();

  const sorted = contracts.slice().sort((a, b) => {
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
        continue; // Equal values, try next sort column
      } else if (
        sortBy === "startDate" ||
        sortBy === "endDate" ||
        sortBy === "actualCompletionDate"
      ) {
        av = a[sortBy]
          ? typeof a[sortBy] === "string"
            ? a[sortBy].slice(0, 10)
            : (a[sortBy] as Date).toISOString().slice(0, 10)
          : "";
        bv = b[sortBy]
          ? typeof b[sortBy] === "string"
            ? b[sortBy].slice(0, 10)
            : (b[sortBy] as Date).toISOString().slice(0, 10)
          : "";
        if (av === bv) continue;
        const cmp = av < bv ? -1 : 1;
        if (cmp !== 0) return cmp * dir;
        continue; // Equal values, try next sort column
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
        if (sortBy === "rateRatio") {
          av = typeof av === "string" ? parseFloat(av) : Number(av);
          bv = typeof bv === "string" ? parseFloat(bv) : Number(bv);
        }
        const cmp = Number(av) - Number(bv);
        if (cmp !== 0) return cmp * dir;
        continue; // Equal values, try next sort column
      } else {
        av = a[sortBy as keyof ProofreadingContract] ?? "";
        bv = b[sortBy as keyof ProofreadingContract] ?? "";
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        const cmp = as.localeCompare(bs, undefined, { numeric: true });
        if (cmp !== 0) return cmp * dir;
        continue; // Equal values, try next sort column
      }
    }
    return 0;
  });
  return sorted;
}

// Sortable header component with multi-sort support
function SortableHead<T extends string>({
  label,
  column,
  sortColumns,
  onSort,
  className,
}: {
  label: React.ReactNode;
  column: T;
  sortColumns?: Array<{ column: T; dir: "asc" | "desc" }>;
  onSort?: (column: T, e?: React.MouseEvent) => void;
  className?: string;
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

/** Quy ước: 350 chữ = 1 trang cơ sở. Số trang = số chữ / 350 (làm tròn). */
const CHARS_PER_PAGE = 350;
function charsToPages(chars: number): number {
  return Math.round(chars / CHARS_PER_PAGE);
}

/** Hiển thị giai đoạn: lưu 1,2,3... → hiển thị "GĐ 1", "GĐ 2", "GĐ 3". */
function formatStageDisplay(stage: string | null | undefined): string {
  if (stage == null || stage === "") return "—";
  const num = String(stage).replace(/\D/g, "");
  return num ? "GĐ " + num : "GĐ " + stage;
}

function parseDateOnly(value: string | Date | null | undefined): Date | null {
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

function formatDurationMonths(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
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

type ContractPill = {
  label: string;
  tone: "muted" | "info" | "success" | "warning" | "danger";
};

const contractPillClass: Record<ContractPill["tone"], string> = {
  muted: "bg-slate-100 text-slate-700 border-slate-300",
  info: "bg-blue-100 text-blue-700 border-blue-300",
  success: "bg-green-100 text-green-700 border-green-300",
  warning: "bg-amber-100 text-amber-700 border-amber-300",
  danger: "bg-red-100 text-red-700 border-red-300",
};

function buildTranslationContractPills(
  contract: TranslationContract,
  opts: { proofreadingCompletedDate?: string; editingCompletedDate?: string }
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
        contract.progressCheckDate
      )})`,
      tone: "info",
    });
  }
  if (contract.expertReviewDate) {
    pills.push({
      label: `Đã thẩm định cấp chuyên gia (${formatDateDDMMYYYY(
        contract.expertReviewDate
      )})`,
      tone: "info",
    });
  }
  if (contract.projectAcceptanceDate) {
    pills.push({
      label: `Đã nghiệm thu cấp Dự án (${formatDateDDMMYYYY(
        contract.projectAcceptanceDate
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

/** Lấy phần số từ giá trị giai đoạn (để hiển thị trong ô nhập). */
function parseStageNumber(stage: string | null | undefined): string {
  if (stage == null || stage === "") return "";
  const num = String(stage).replace(/\D/g, "");
  return num || String(stage);
}

// Helper function to generate pagination items with ellipsis
function generatePaginationItems(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: (number | "ellipsis")[] = [];

  if (currentPage <= 3) {
    // Show first 5 pages, ellipsis, last page
    for (let i = 1; i <= 5; i++) {
      items.push(i);
    }
    items.push("ellipsis");
    items.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    // Show first page, ellipsis, last 5 pages
    items.push(1);
    items.push("ellipsis");
    for (let i = totalPages - 4; i <= totalPages; i++) {
      items.push(i);
    }
  } else {
    // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
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

// --- API fetchers ---
async function fetchWorks(): Promise<Work[]> {
  const res = await fetch(api.works.list.path, { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được danh mục tác phẩm");
  return res.json();
}

async function fetchTranslationContracts(): Promise<TranslationContract[]> {
  const res = await fetch(api.translationContracts.list.path, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Không tải được hợp đồng dịch thuật");
  return res.json();
}

async function fetchProofreadingContracts(): Promise<ProofreadingContract[]> {
  const res = await fetch(api.proofreadingContracts.list.path, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Không tải được hợp đồng hiệu đính");
  return res.json();
}

async function fetchComponents(): Promise<Component[]> {
  const res = await fetch(api.components.list.path, { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được danh sách hợp phần");
  return res.json();
}

const ROLE_THU_KY_NAME = "Thư ký hợp phần";
const ROLE_THU_KY_CODE = "prj_secretary";

export default function ThuKyHopPhanPage() {
  const [, setLocation] = useLocation();
  const { role, user, loading: authLoading } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const thuKyRole = useMemo(
    () =>
      user?.roles?.find(
        (r) => r.name === ROLE_THU_KY_NAME || r.code === ROLE_THU_KY_CODE
      ),
    [user?.roles]
  );
  const allowedComponentIds = useMemo(
    () =>
      thuKyRole && user?.roleAssignments
        ? user.roleAssignments
            .filter((a) => a.roleId === thuKyRole.id && a.componentId)
            .map((a) => a.componentId as string)
        : [],
    [thuKyRole, user?.roleAssignments]
  );
  // Admin, Quản lý có thể xem tất cả trang quản lý công việc (kể cả Thư ký hợp phần).
  const canAccessPage =
    !!thuKyRole || role === UserRole.ADMIN || role === UserRole.MANAGER;

  const [tasksPage, setTasksPage] = useState(1);
  const [taskViewMode, setTaskViewMode] = useState<"table" | "board">("table");
  const [tcViewMode, setTcViewMode] = useState<"table" | "card">("table");
  const [pcViewMode, setPcViewMode] = useState<"table" | "card">("table");
  const [worksPage, setWorksPage] = useState(1);
  const [tcPage, setTcPage] = useState(1);
  const [pcPage, setPcPage] = useState(1);
  const [tasksSearch, setTasksSearch] = useState("");
  const [taskFilters, setTaskFilters] = useState<TaskFilterState>(
    getDefaultTaskFilters
  );
  const [taskSortBy, setTaskSortBy] = useState<TaskSortColumn | null>(null);
  const [taskSortDir, setTaskSortDir] = useState<"asc" | "desc">("asc");
  const [worksSearch, setWorksSearch] = useState("");
  const [worksComponentFilter, setWorksComponentFilter] =
    useState<string>("all");
  const [worksStageFilter, setWorksStageFilter] = useState<string>("all");
  const [worksSortColumns, setWorksSortColumns] = useState<
    Array<{ column: WorkSortColumn; dir: "asc" | "desc" }>
  >([]);
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([]);
  const [bulkDeleteWorksOpen, setBulkDeleteWorksOpen] = useState(false);
  const [tcSearch, setTcSearch] = useState("");
  const [tcTranslatorSearch, setTcTranslatorSearch] = useState("");
  const [tcComponentFilter, setTcComponentFilter] = useState<string>("all");
  const [tcStageFilter, setTcStageFilter] = useState<string>("all");
  const [tcSortColumns, setTcSortColumns] = useState<
    Array<{ column: TranslationContractSortColumn; dir: "asc" | "desc" }>
  >([]);
  const [pcSearch, setPcSearch] = useState("");
  const [pcComponentFilter, setPcComponentFilter] = useState<string>("all");
  const [pcStageFilter, setPcStageFilter] = useState<string>("all");
  const [pcSortColumns, setPcSortColumns] = useState<
    Array<{ column: ProofreadingContractSortColumn; dir: "asc" | "desc" }>
  >([]);

  const [selectedTask, setSelectedTask] =
    useState<TaskWithAssignmentDetails | null>(null);
  const [taskDialogMode, setTaskDialogMode] = useState<"view" | "edit">("view");
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [workDialog, setWorkDialog] = useState<{
    open: boolean;
    work: Work | null;
  }>({ open: false, work: null });
  const [deleteWorkConfirmOpen, setDeleteWorkConfirmOpen] = useState(false);
  const [worksImportOpen, setWorksImportOpen] = useState(false);
  const [tcDialog, setTcDialog] = useState<{
    open: boolean;
    contract: TranslationContract | null;
    mode: "view" | "edit";
  }>({ open: false, contract: null, mode: "edit" });
  const [pcDialog, setPcDialog] = useState<{
    open: boolean;
    contract: ProofreadingContract | null;
    mode: "view" | "edit";
  }>({ open: false, contract: null, mode: "edit" });
  const [deleteTcConfirmOpen, setDeleteTcConfirmOpen] = useState(false);
  const [deletePcConfirmOpen, setDeletePcConfirmOpen] = useState(false);
  const [tcDeleteTarget, setTcDeleteTarget] =
    useState<TranslationContract | null>(null);
  const [pcDeleteTarget, setPcDeleteTarget] =
    useState<ProofreadingContract | null>(null);
  const [deleteTaskConfirmOpen, setDeleteTaskConfirmOpen] = useState(false);
  const [deleteTaskTarget, setDeleteTaskTarget] =
    useState<TaskWithAssignmentDetails | null>(null);

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    isError: tasksError,
  } = useTasks();
  const { data: users = [] } = useUsers();
  const { data: works = [], isLoading: worksLoading } = useQuery({
    queryKey: ["works"],
    queryFn: fetchWorks,
  });
  const { data: translationContracts = [], isLoading: tcLoading } = useQuery({
    queryKey: ["translation-contracts"],
    queryFn: fetchTranslationContracts,
  });
  const { data: translationContractMembers = [] } = useQuery({
    queryKey: ["translation-contract-members"],
    queryFn: async () => {
      const res = await fetch(api.translationContractMembers.list.path, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const { data: proofreadingContracts = [], isLoading: pcLoading } = useQuery({
    queryKey: ["proofreading-contracts"],
    queryFn: fetchProofreadingContracts,
  });

  // Load all proofreading contract members to map with contracts
  const { data: allProofreadingContractMembers = [] } = useQuery({
    queryKey: ["proofreading-contract-members"],
    queryFn: async () => {
      const res = await fetch(api.proofreadingContractMembers.list.path, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Helper function to get proofreader name from contract members
  const getProofreaderName = useMemo(() => {
    const membersByContractId = new Map(
      allProofreadingContractMembers.map(
        (m: { proofreadingContractId: string; userId: string }) => [
          m.proofreadingContractId,
          m.userId,
        ]
      )
    );
    return (contractId: string | null | undefined): string => {
      if (!contractId) return "—";
      const userId = membersByContractId.get(contractId);
      if (!userId) return "—";
      const user = users.find((u) => u.id === userId);
      return user?.displayName ?? "—";
    };
  }, [allProofreadingContractMembers, users]);
  const getTranslatorName = useMemo(() => {
    const membersByContractId = new Map(
      translationContractMembers.map(
        (m: { translationContractId: string; userId: string }) => [
          m.translationContractId,
          m.userId,
        ]
      )
    );
    return (contractId: string | null | undefined): string => {
      if (!contractId) return "—";
      const userId = membersByContractId.get(contractId);
      if (!userId) return "—";
      const user = users.find((u) => u.id === userId);
      return user?.displayName ?? "—";
    };
  }, [translationContractMembers, users]);
  const { data: componentsList = [] } = useQuery({
    queryKey: ["components"],
    queryFn: fetchComponents,
  });

  // Chỉ Thư ký hợp phần: lọc works/tc/pc theo hợp phần được gán.
  const worksScoped = useMemo(
    () =>
      allowedComponentIds.length > 0
        ? works.filter(
            (w) => w.componentId && allowedComponentIds.includes(w.componentId)
          )
        : works,
    [works, allowedComponentIds]
  );
  const tcScoped = useMemo(
    () =>
      allowedComponentIds.length > 0
        ? translationContracts.filter(
            (c) => c.componentId && allowedComponentIds.includes(c.componentId)
          )
        : translationContracts,
    [translationContracts, allowedComponentIds]
  );
  const pcScoped = useMemo(
    () =>
      allowedComponentIds.length > 0
        ? proofreadingContracts.filter(
            (c) => c.componentId && allowedComponentIds.includes(c.componentId)
          )
        : proofreadingContracts,
    [proofreadingContracts, allowedComponentIds]
  );

  const taskStages = useMemo(
    () =>
      Array.from(
        new Set(worksScoped.map((w) => w.stage).filter(Boolean))
      ) as string[],
    [worksScoped]
  );
  const taskComponentOptions = useMemo(
    () => componentsList.map((c) => ({ id: c.id, name: c.name })),
    [componentsList]
  );

  // Get unique stages from works for filtering
  const worksStages = useMemo(
    () =>
      Array.from(
        new Set(worksScoped.map((w) => w.stage).filter(Boolean))
      ).sort() as string[],
    [worksScoped]
  );

  // Reset page to 1 when filters change
  useEffect(() => {
    setWorksPage(1);
  }, [worksComponentFilter, worksStageFilter, worksSearch]);

  useEffect(() => {
    setTcPage(1);
  }, [tcComponentFilter, tcStageFilter, tcSearch]);

  useEffect(() => {
    setPcPage(1);
  }, [pcComponentFilter, pcStageFilter, pcSearch]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    // Filter tasks for "Thư ký hợp phần" group only (similar to Biên tập, CNTT, etc.)
    let list = tasks.filter((t) => t.group === "Thư ký hợp phần");
    // Thư ký hợp phần: chỉ hiển thị task thuộc work/contract của hợp phần được gán.
    if (allowedComponentIds.length > 0) {
      const allowedWorkIds = new Set(worksScoped.map((w) => w.id));
      const allowedTcIds = new Set(tcScoped.map((c) => c.id));
      const allowedPcIds = new Set(pcScoped.map((c) => c.id));
      list = list.filter(
        (t) =>
          (t.relatedWorkId && allowedWorkIds.has(t.relatedWorkId)) ||
          (t.relatedContractId &&
            (allowedTcIds.has(t.relatedContractId) ||
              allowedPcIds.has(t.relatedContractId)))
      );
    }
    if (role === UserRole.EMPLOYEE) {
      list = list.filter((t) =>
        t.assignee?.includes((user?.displayName ?? "").split(" ")[0])
      );
    }
    if (tasksSearch.trim()) {
      const q = normalizeSearch(tasksSearch.trim());
      list = list.filter(
        (t) =>
          normalizeSearch(t.title ?? "").includes(q) ||
          normalizeSearch(t.description ?? "").includes(q) ||
          normalizeSearch(t.assignee ?? "").includes(q) ||
          normalizeSearch(t.group ?? "").includes(q)
      );
    }
    list = applyTaskFilters(list, taskFilters, worksScoped);
    return sortTasks(list, taskSortBy, taskSortDir);
  }, [
    tasks,
    role,
    user?.displayName,
    tasksSearch,
    taskFilters,
    worksScoped,
    tcScoped,
    pcScoped,
    allowedComponentIds,
    taskSortBy,
    taskSortDir,
  ]);

  const handleTaskSort = (column: TaskSortColumn) => {
    setTaskSortBy((prev) => {
      if (prev === column)
        setTaskSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else setTaskSortDir("asc");
      return column;
    });
  };

  const handleWorksSort = (column: WorkSortColumn, e?: React.MouseEvent) => {
    setWorksSortColumns((prev) => {
      const existingIndex = prev.findIndex((s) => s.column === column);
      if (existingIndex >= 0) {
        // Column exists: toggle direction or remove
        if (prev[existingIndex].dir === "asc") {
          // Change to desc
          const newCols = [...prev];
          newCols[existingIndex] = { column, dir: "desc" };
          return newCols;
        } else {
          // Remove from list
          return prev.filter((s) => s.column !== column);
        }
      } else {
        // Add new column to the list (always add, not replace)
        return [...prev, { column, dir: "asc" }];
      }
    });
  };

  const handleTcSort = (
    column: TranslationContractSortColumn,
    e?: React.MouseEvent
  ) => {
    setTcSortColumns((prev) => {
      const existingIndex = prev.findIndex((s) => s.column === column);
      if (existingIndex >= 0) {
        if (prev[existingIndex].dir === "asc") {
          const newCols = [...prev];
          newCols[existingIndex] = { column, dir: "desc" };
          return newCols;
        } else {
          return prev.filter((s) => s.column !== column);
        }
      } else {
        // Add new column to the list (always add, not replace)
        return [...prev, { column, dir: "asc" }];
      }
    });
  };

  const handlePcSort = (
    column: ProofreadingContractSortColumn,
    e?: React.MouseEvent
  ) => {
    setPcSortColumns((prev) => {
      const existingIndex = prev.findIndex((s) => s.column === column);
      if (existingIndex >= 0) {
        if (prev[existingIndex].dir === "asc") {
          const newCols = [...prev];
          newCols[existingIndex] = { column, dir: "desc" };
          return newCols;
        } else {
          return prev.filter((s) => s.column !== column);
        }
      } else {
        // Add new column to the list (always add, not replace)
        return [...prev, { column, dir: "asc" }];
      }
    });
  };

  const getComponentName = (id: string | null) =>
    id ? componentsList.find((c) => c.id === id)?.name ?? "—" : "—";
  const workTitleById = useMemo(
    () =>
      new Map(
        worksScoped.map((w) => [
          w.id,
          w.titleVi ?? w.documentCode ?? w.titleHannom ?? w.id.slice(0, 8),
        ])
      ),
    [worksScoped]
  );
  const getWorkTitle = (id: string | null) =>
    id ? workTitleById.get(id) ?? "—" : "—";

  // Filter and sort ALL data from DB (before pagination)
  // Order: Filter -> Sort -> Paginate (in paginatedWorks)
  const filteredWorks = useMemo(() => {
    let list = worksScoped;

    // Step 1: Filter by component
    if (worksComponentFilter && worksComponentFilter !== "all") {
      list = list.filter((w) => w.componentId === worksComponentFilter);
    }

    // Step 2: Filter by stage
    if (worksStageFilter && worksStageFilter !== "all") {
      list = list.filter((w) => w.stage === worksStageFilter);
    }

    // Step 3: Filter by search
    if (worksSearch.trim()) {
      const q = normalizeSearch(worksSearch.trim());
      list = list.filter(
        (w) =>
          (w.titleVi && normalizeSearch(w.titleVi).includes(q)) ||
          (w.stage &&
            (normalizeSearch(formatStageDisplay(w.stage)).includes(q) ||
              normalizeSearch(w.stage).includes(q))) ||
          (w.documentCode && normalizeSearch(w.documentCode).includes(q)) ||
          normalizeSearch(getComponentName(w.componentId)).includes(q)
      );
    }

    // Step 4: Apply sorting to ALL filtered data (not just current page)
    return sortWorks(list, worksSortColumns, getComponentName);
  }, [
    worksScoped,
    worksSearch,
    worksComponentFilter,
    worksStageFilter,
    worksSortColumns,
    componentsList,
  ]);

  // Filter and sort ALL data from DB (before pagination)
  // Order: Filter -> Sort -> Paginate (in paginatedTc)
  const filteredTc = useMemo(() => {
    let list = tcScoped;

    // Step 1: Filter by component
    if (tcComponentFilter && tcComponentFilter !== "all") {
      list = list.filter((c) => c.componentId === tcComponentFilter);
    }

    // Step 2: Filter by stage (via work)
    if (tcStageFilter && tcStageFilter !== "all") {
      const workIdsWithStage = new Set(
        worksScoped.filter((w) => w.stage === tcStageFilter).map((w) => w.id)
      );
      list = list.filter((c) => c.workId && workIdsWithStage.has(c.workId));
    }

    // Step 3: Filter by search
    if (tcSearch.trim()) {
      const q = normalizeSearch(tcSearch.trim());
      list = list.filter(
        (c) =>
          (c.contractNumber && normalizeSearch(c.contractNumber).includes(q)) ||
          normalizeSearch(getComponentName(c.componentId)).includes(q) ||
          normalizeSearch(getWorkTitle(c.workId)).includes(q)
      );
    }
    if (tcTranslatorSearch.trim()) {
      const q = normalizeSearch(tcTranslatorSearch.trim());
      list = list.filter((c) => {
        const name = getTranslatorName(c.id);
        if (!name || name === "—") return false;
        return normalizeSearch(name).includes(q);
      });
    }

    // Step 4: Apply sorting to ALL filtered data (not just current page)
    return sortTranslationContracts(list, tcSortColumns, getComponentName);
  }, [
    tcScoped,
    tcSearch,
    tcTranslatorSearch,
    tcComponentFilter,
    tcStageFilter,
    tcSortColumns,
    worksScoped,
    componentsList,
    getTranslatorName,
  ]);

  // Filter and sort ALL data from DB (before pagination)
  // Order: Filter -> Sort -> Paginate (in paginatedPc)
  const filteredPc = useMemo(() => {
    let list = pcScoped;

    // Step 1: Filter by component
    if (pcComponentFilter && pcComponentFilter !== "all") {
      list = list.filter((c) => c.componentId === pcComponentFilter);
    }

    // Step 2: Filter by stage (via work)
    if (pcStageFilter && pcStageFilter !== "all") {
      const workIdsWithStage = new Set(
        worksScoped.filter((w) => w.stage === pcStageFilter).map((w) => w.id)
      );
      list = list.filter((c) => c.workId && workIdsWithStage.has(c.workId));
    }

    // Step 3: Filter by search
    if (pcSearch.trim()) {
      const q = normalizeSearch(pcSearch.trim());
      list = list.filter(
        (c) =>
          (c.contractNumber && normalizeSearch(c.contractNumber).includes(q)) ||
          normalizeSearch(getProofreaderName(c.id)).includes(q) ||
          normalizeSearch(getComponentName(c.componentId)).includes(q) ||
          normalizeSearch(getWorkTitle(c.workId)).includes(q)
      );
    }

    // Step 4: Apply sorting to ALL filtered data (not just current page)
    return sortProofreadingContracts(list, pcSortColumns, getComponentName);
  }, [
    pcScoped,
    pcSearch,
    pcComponentFilter,
    pcStageFilter,
    pcSortColumns,
    worksScoped,
    componentsList,
  ]);

  const proofreadingCompletionByTcId = useMemo(() => {
    const map = new Map<string, string>();
    proofreadingContracts.forEach((c) => {
      if (!c.actualCompletionDate) return;
      const date =
        typeof c.actualCompletionDate === "string"
          ? c.actualCompletionDate.slice(0, 10)
          : c.actualCompletionDate.toISOString().slice(0, 10);
      if (c.translationContractId) {
        const prev = map.get(c.translationContractId);
        if (!prev || date > prev) map.set(c.translationContractId, date);
      }
    });
    return map;
  }, [proofreadingContracts]);

  const proofreadingCompletionByWorkId = useMemo(() => {
    const map = new Map<string, string>();
    proofreadingContracts.forEach((c) => {
      if (!c.actualCompletionDate || !c.workId) return;
      const date =
        typeof c.actualCompletionDate === "string"
          ? c.actualCompletionDate.slice(0, 10)
          : c.actualCompletionDate.toISOString().slice(0, 10);
      const prev = map.get(c.workId);
      if (!prev || date > prev) map.set(c.workId, date);
    });
    return map;
  }, [proofreadingContracts]);

  const editingCompletionByWorkId = useMemo(() => {
    const map = new Map<string, string>();
    tasks
      .filter((t) => t.group === "Biên tập" && t.relatedWorkId)
      .forEach((t) => {
        const wf = t.workflow;
        let roundType = "";
        if (typeof wf === "string") {
          try {
            const parsed = JSON.parse(wf) as {
              rounds?: Array<{ roundType?: string | null }>;
            };
            roundType = parsed?.rounds?.[0]?.roundType ?? "";
          } catch {
            roundType = "";
          }
        } else if (typeof wf === "object" && wf) {
          const parsed = wf as {
            rounds?: Array<{ roundType?: string | null }>;
          };
          roundType = parsed?.rounds?.[0]?.roundType ?? "";
        }
        if (!roundType.toLowerCase().includes("bông chuyển in")) return;
        const v = t.actualCompletedAt;
        if (!v) return;
        const date = typeof v === "string" ? new Date(v) : v;
        if (!date || Number.isNaN(date.getTime())) return;
        const dateStr = date.toISOString().slice(0, 10);
        const key = t.relatedWorkId as string;
        const prev = map.get(key);
        if (!prev || dateStr > prev) map.set(key, dateStr);
      });
    return map;
  }, [tasks]);

  const paginatedTasks = useMemo(() => {
    const start = (tasksPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, tasksPage]);
  const totalTasksPages = Math.max(
    1,
    Math.ceil(filteredTasks.length / PAGE_SIZE)
  );

  // Paginate AFTER filtering and sorting (sort is applied to ALL data, not just current page)
  const paginatedWorks = useMemo(() => {
    const start = (worksPage - 1) * PAGE_SIZE;
    // filteredWorks is already sorted, we just slice the correct page
    return filteredWorks.slice(start, start + PAGE_SIZE);
  }, [filteredWorks, worksPage]);
  const totalWorksPages = Math.max(
    1,
    Math.ceil(filteredWorks.length / PAGE_SIZE)
  );
  const paginatedWorkIds = useMemo(
    () => new Set(paginatedWorks.map((w) => w.id)),
    [paginatedWorks]
  );
  const selectedWorkSet = useMemo(
    () => new Set(selectedWorkIds),
    [selectedWorkIds]
  );
  const allSelectedOnPage =
    paginatedWorks.length > 0 &&
    paginatedWorks.every((w) => selectedWorkSet.has(w.id));
  const someSelectedOnPage =
    paginatedWorks.some((w) => selectedWorkSet.has(w.id)) && !allSelectedOnPage;

  const paginatedTc = useMemo(() => {
    const start = (tcPage - 1) * PAGE_SIZE;
    // filteredTc is already sorted, we just slice the correct page
    return filteredTc.slice(start, start + PAGE_SIZE);
  }, [filteredTc, tcPage]);
  const totalTcPages = Math.max(1, Math.ceil(filteredTc.length / PAGE_SIZE));

  const paginatedPc = useMemo(() => {
    const start = (pcPage - 1) * PAGE_SIZE;
    // filteredPc is already sorted, we just slice the correct page
    return filteredPc.slice(start, start + PAGE_SIZE);
  }, [filteredPc, pcPage]);
  const totalPcPages = Math.max(1, Math.ceil(filteredPc.length / PAGE_SIZE));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-orange-100 text-orange-700";
      case "Critical":
        return "bg-red-100 text-red-700";
      case "Medium":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";
      case "In Progress":
        return "bg-blue-50 text-blue-700";
      case "Pending":
        return "bg-yellow-50 text-yellow-700";
      case "Cancelled":
        return "bg-gray-50 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const createWorkMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(api.works.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Tạo thất bại");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["works"] });
      setWorkDialog({ open: false, work: null });
      toast({ title: "Thành công", description: "Đã thêm tác phẩm." });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const updateWorkMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(buildUrl(api.works.update.path, { id }), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Cập nhật thất bại");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["works"] });
      setWorkDialog({ open: false, work: null });
      toast({ title: "Thành công", description: "Đã cập nhật tác phẩm." });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const deleteWorkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(buildUrl(api.works.delete.path, { id }), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Xóa thất bại");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["works"] });
      setWorkDialog({ open: false, work: null });
      setDeleteWorkConfirmOpen(false);
      toast({ title: "Thành công", description: "Đã xóa tác phẩm." });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const bulkDeleteWorksMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(buildUrl(api.works.delete.path, { id }), {
            method: "DELETE",
            credentials: "include",
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err.message as string) || "Xóa thất bại");
          }
          return res.json();
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["works"] });
      setSelectedWorkIds([]);
      setBulkDeleteWorksOpen(false);
      toast({
        title: "Thành công",
        description: "Đã xóa các tác phẩm đã chọn.",
      });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const createTcMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(api.translationContracts.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Tạo thất bại");
      }
      return res.json();
    },
    onSuccess: async (contract, variables) => {
      queryClient.invalidateQueries({ queryKey: ["translation-contracts"] });

      // Lưu translation contract members nếu có translator
      const translatorUserId = (variables as { _translatorUserId?: string })
        ?._translatorUserId;
      if (translatorUserId && contract?.id) {
        try {
          // Đảm bảo user có role "partner"
          const rolesRes = await fetch(api.roles.list.path, {
            credentials: "include",
          });
          if (rolesRes.ok) {
            const rolesList = await rolesRes.json();
            const partnerRole = rolesList.find(
              (r: { code: string }) => r.code === "partner"
            );
            if (partnerRole) {
              // Kiểm tra xem user đã có role "partner" chưa
              const userRes = await fetch(
                buildUrl(api.users.get.path, { id: translatorUserId }),
                { credentials: "include" }
              );
              if (userRes.ok) {
                const user = await userRes.json();
                const hasPartnerRole = user.roles?.some(
                  (r: { id: string }) => r.id === partnerRole.id
                );
                if (!hasPartnerRole) {
                  // Gán role "partner" cho user
                  await fetch(
                    buildUrl(api.users.update.path, { id: translatorUserId }),
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        roleIds: [
                          ...(user.roles?.map((r: { id: string }) => r.id) ||
                            []),
                          partnerRole.id,
                        ],
                      }),
                    }
                  );
                }
              }
            }
          }

          await fetch(api.translationContractMembers.create.path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              translationContractId: contract.id,
              userId: translatorUserId,
            }),
          });
          queryClient.invalidateQueries({
            queryKey: ["translation-contract-members"],
          });
        } catch (error) {
          console.error("Lỗi khi lưu dịch giả:", error);
        }
      }

      setTcDialog({ open: false, contract: null, mode: "edit" });
      toast({
        title: "Thành công",
        description: "Đã thêm hợp đồng dịch thuật.",
      });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const updateTcMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(
        buildUrl(api.translationContracts.update.path, { id }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Cập nhật thất bại");
      }
      return res.json();
    },
    onSuccess: async (contract, variables) => {
      queryClient.invalidateQueries({ queryKey: ["translation-contracts"] });

      // Cập nhật translation contract members nếu có translator
      const translatorUserId = (
        variables.data as { _translatorUserId?: string }
      )?._translatorUserId;
      if (contract?.id) {
        try {
          // Xóa các members cũ
          const membersRes = await fetch(
            buildUrl(api.translationContractMembers.listByContract.path, {
              contractId: contract.id,
            }),
            { credentials: "include" }
          );
          if (membersRes.ok) {
            const members = await membersRes.json();
            for (const member of members) {
              await fetch(
                buildUrl(api.translationContractMembers.delete.path, {
                  id: member.id,
                }),
                { method: "DELETE", credentials: "include" }
              );
            }
          }

          // Thêm member mới nếu có
          if (translatorUserId) {
            // Đảm bảo user có role "partner"
            const rolesRes = await fetch(api.roles.list.path, {
              credentials: "include",
            });
            if (rolesRes.ok) {
              const rolesList = await rolesRes.json();
              const partnerRole = rolesList.find(
                (r: { code: string }) => r.code === "partner"
              );
              if (partnerRole) {
                // Kiểm tra xem user đã có role "partner" chưa
                const userRes = await fetch(
                  buildUrl(api.users.get.path, { id: translatorUserId }),
                  { credentials: "include" }
                );
                if (userRes.ok) {
                  const user = await userRes.json();
                  const hasPartnerRole = user.roles?.some(
                    (r: { id: string }) => r.id === partnerRole.id
                  );
                  if (!hasPartnerRole) {
                    // Gán role "partner" cho user
                    await fetch(
                      buildUrl(api.users.update.path, { id: translatorUserId }),
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          roleIds: [
                            ...(user.roles?.map((r: { id: string }) => r.id) ||
                              []),
                            partnerRole.id,
                          ],
                        }),
                      }
                    );
                  }
                }
              }
            }

            await fetch(api.translationContractMembers.create.path, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                translationContractId: contract.id,
                userId: translatorUserId,
              }),
            });
          }

          queryClient.invalidateQueries({
            queryKey: ["translation-contract-members"],
          });
        } catch (error) {
          console.error("Lỗi khi cập nhật dịch giả:", error);
        }
      }

      setTcDialog({ open: false, contract: null, mode: "edit" });
      toast({
        title: "Thành công",
        description: "Đã cập nhật hợp đồng dịch thuật.",
      });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const createPcMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(api.proofreadingContracts.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Tạo thất bại");
      }
      return res.json();
    },
    onSuccess: async (contract, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proofreading-contracts"] });

      // Lưu proofreading contract members nếu có proofreader
      const proofreaderUserId = (variables as { _proofreaderUserId?: string })
        ?._proofreaderUserId;
      if (proofreaderUserId && contract?.id) {
        try {
          // Đảm bảo user có role "partner"
          const rolesRes = await fetch(api.roles.list.path, {
            credentials: "include",
          });
          if (rolesRes.ok) {
            const rolesList = await rolesRes.json();
            const partnerRole = rolesList.find(
              (r: { code: string }) => r.code === "partner"
            );
            if (partnerRole) {
              // Kiểm tra xem user đã có role "partner" chưa
              const userRes = await fetch(
                buildUrl(api.users.get.path, { id: proofreaderUserId }),
                { credentials: "include" }
              );
              if (userRes.ok) {
                const user = await userRes.json();
                const hasPartnerRole = user.roles?.some(
                  (r: { id: string }) => r.id === partnerRole.id
                );
                if (!hasPartnerRole) {
                  // Gán role "partner" cho user
                  await fetch(
                    buildUrl(api.users.update.path, { id: proofreaderUserId }),
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        roleIds: [
                          ...(user.roles?.map((r: { id: string }) => r.id) ||
                            []),
                          partnerRole.id,
                        ],
                      }),
                    }
                  );
                }
              }
            }
          }

          await fetch(api.proofreadingContractMembers.create.path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              proofreadingContractId: contract.id,
              userId: proofreaderUserId,
            }),
          });
        } catch (error) {
          console.error("Lỗi khi lưu người hiệu đính:", error);
        }
      }

      setPcDialog({ open: false, contract: null, mode: "edit" });
      toast({
        title: "Thành công",
        description: "Đã thêm hợp đồng hiệu đính.",
      });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const updatePcMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(
        buildUrl(api.proofreadingContracts.update.path, { id }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Cập nhật thất bại");
      }
      return res.json();
    },
    onSuccess: async (contract, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proofreading-contracts"] });

      // Cập nhật proofreading contract members nếu có proofreader
      const proofreaderUserId = (
        variables.data as { _proofreaderUserId?: string }
      )?._proofreaderUserId;
      if (contract?.id) {
        try {
          // Xóa các members cũ
          const membersRes = await fetch(
            buildUrl(api.proofreadingContractMembers.listByContract.path, {
              contractId: contract.id,
            }),
            { credentials: "include" }
          );
          if (membersRes.ok) {
            const members = await membersRes.json();
            for (const member of members) {
              await fetch(
                buildUrl(api.proofreadingContractMembers.delete.path, {
                  id: member.id,
                }),
                { method: "DELETE", credentials: "include" }
              );
            }
          }

          // Thêm member mới nếu có
          if (proofreaderUserId) {
            // Đảm bảo user có role "partner"
            const rolesRes = await fetch(api.roles.list.path, {
              credentials: "include",
            });
            if (rolesRes.ok) {
              const rolesList = await rolesRes.json();
              const partnerRole = rolesList.find(
                (r: { code: string }) => r.code === "partner"
              );
              if (partnerRole) {
                // Kiểm tra xem user đã có role "partner" chưa
                const userRes = await fetch(
                  buildUrl(api.users.get.path, { id: proofreaderUserId }),
                  { credentials: "include" }
                );
                if (userRes.ok) {
                  const user = await userRes.json();
                  const hasPartnerRole = user.roles?.some(
                    (r: { id: string }) => r.id === partnerRole.id
                  );
                  if (!hasPartnerRole) {
                    // Gán role "partner" cho user
                    await fetch(
                      buildUrl(api.users.update.path, {
                        id: proofreaderUserId,
                      }),
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          roleIds: [
                            ...(user.roles?.map((r: { id: string }) => r.id) ||
                              []),
                            partnerRole.id,
                          ],
                        }),
                      }
                    );
                  }
                }
              }
            }

            await fetch(api.proofreadingContractMembers.create.path, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                proofreadingContractId: contract.id,
                userId: proofreaderUserId,
              }),
            });
          }

          queryClient.invalidateQueries({
            queryKey: ["proofreading-contract-members"],
          });
        } catch (error) {
          console.error("Lỗi khi cập nhật người hiệu đính:", error);
        }
      }

      setPcDialog({ open: false, contract: null, mode: "edit" });
      toast({
        title: "Thành công",
        description: "Đã cập nhật hợp đồng hiệu đính.",
      });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const deleteTcMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        buildUrl(api.translationContracts.delete.path, { id }),
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Xóa thất bại");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["translation-contracts"] });
      setDeleteTcConfirmOpen(false);
      setTcDeleteTarget(null);
      toast({
        title: "Thành công",
        description: "Đã xóa hợp đồng dịch thuật.",
      });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const deletePcMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        buildUrl(api.proofreadingContracts.delete.path, { id }),
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Xóa thất bại");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proofreading-contracts"] });
      setDeletePcConfirmOpen(false);
      setPcDeleteTarget(null);
      toast({ title: "Thành công", description: "Đã xóa hợp đồng hiệu đính." });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const { mutate: createTask } = useCreateTask();
  const { mutate: deleteTask, isPending: isDeletingTask } = useDeleteTask();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  // Chỉ Thư ký hợp phần mới truy cập được trang Thư ký hợp phần.
  if (!canAccessPage) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Alert variant="destructive">
          <AlertTitle>Không có quyền truy cập</AlertTitle>
          <AlertDescription>
            Chỉ Thư ký hợp phần mới truy cập được trang Thư ký hợp phần. Nếu bạn
            cần quyền này, hãy liên hệ Admin.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  // Thư ký hợp phần (không phải Admin/Quản lý) phải được gán ít nhất một hợp phần.
  if (canAccessPage && thuKyRole && allowedComponentIds.length === 0) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Alert>
          <AlertTitle>Chưa được gán hợp phần</AlertTitle>
          <AlertDescription>
            Bạn chưa được gán Tên Hợp phần. Chỉ có thể làm việc với dữ liệu của
            hợp phần được gán. Liên hệ Admin để được gán hợp phần trong mục Quản
            lý người dùng.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="tasks">Công việc</TabsTrigger>
          <TabsTrigger value="works">Danh mục tác phẩm</TabsTrigger>
          <TabsTrigger value="translation">Hợp đồng dịch thuật</TabsTrigger>
          <TabsTrigger value="proofreading">Hợp đồng hiệu đính</TabsTrigger>
        </TabsList>

        {/* Tab: Tasks */}
        <TabsContent value="tasks" className="mt-6">
          <div className="grid gap-6">
            <TaskStatsBadgesOnly tasks={filteredTasks} />
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden mt-6">
            <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-muted/30">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm công việc..."
                    className="pl-9 bg-background"
                    value={tasksSearch}
                    onChange={(e) => setTasksSearch(e.target.value)}
                  />
                </div>
                <Badge variant="secondary">
                  {filteredTasks.length} công việc
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={taskViewMode}
                  onValueChange={(v) =>
                    v && (v === "table" || v === "board") && setTaskViewMode(v)
                  }
                  className="border rounded-md bg-background">
                  <ToggleGroupItem
                    value="table"
                    aria-label={t.dashboard.viewTable}>
                    <List className="h-4 w-4 mr-1.5" />
                    {t.dashboard.viewTable}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="board"
                    aria-label={t.dashboard.viewBoard}>
                    <LayoutGrid className="h-4 w-4 mr-1.5" />
                    {t.dashboard.viewBoard}
                  </ToggleGroupItem>
                </ToggleGroup>
                {(role === UserRole.ADMIN || role === UserRole.MANAGER) && (
                  <Button size="sm" onClick={() => setIsCreateTaskOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm công việc
                  </Button>
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <TaskFilters
                users={users}
                components={taskComponentOptions}
                filters={taskFilters}
                onFiltersChange={(f) =>
                  setTaskFilters((prev) => ({ ...prev, ...f }))
                }
                stages={taskStages}
                showVoteFilter={true}
              />
            </div>
            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : tasksError ? (
              <div className="p-8 text-center text-muted-foreground">
                Không tải được danh sách công việc.
              </div>
            ) : taskViewMode === "board" ? (
              <TaskKanbanBoard
                tasks={filteredTasks}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setTaskDialogMode("view");
                }}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
                noGroupLabel={language === "vi" ? "(Không nhóm)" : "(No group)"}
              />
            ) : (
              <>
                <TaskTable
                  tasks={paginatedTasks}
                  onTaskClick={(task) => {
                    setSelectedTask(task);
                    setTaskDialogMode("view");
                  }}
                  sortBy={taskSortBy}
                  sortDir={taskSortDir}
                  onSort={handleTaskSort}
                  getPriorityColor={getPriorityColor}
                  getStatusColor={getStatusColor}
                  actions={{
                    onView: (task) => {
                      setSelectedTask(task);
                      setTaskDialogMode("view");
                    },
                    onEdit: (task) => {
                      setSelectedTask(task);
                      setTaskDialogMode("edit");
                    },
                    onDelete: (task) => {
                      setDeleteTaskTarget(task);
                      setDeleteTaskConfirmOpen(true);
                    },
                  }}
                />
                {totalTasksPages > 1 && (
                  <div className="p-4 border-t flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setTasksPage((p) => Math.max(1, p - 1));
                            }}
                            className={
                              tasksPage <= 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                        {Array.from(
                          { length: totalTasksPages },
                          (_, i) => i + 1
                        ).map((p) => (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setTasksPage(p);
                              }}
                              isActive={tasksPage === p}>
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setTasksPage((p) =>
                                Math.min(totalTasksPages, p + 1)
                              );
                            }}
                            className={
                              tasksPage >= totalTasksPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Tab: Danh mục tác phẩm (Works) */}
        <TabsContent value="works" className="mt-6">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b flex flex-col gap-4 bg-muted/20">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm tác phẩm..."
                      className="pl-9"
                      value={worksSearch}
                      onChange={(e) => setWorksSearch(e.target.value)}
                    />
                  </div>
                  <Badge variant="secondary">
                    {filteredWorks.length} tác phẩm
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {selectedWorkIds.length > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setBulkDeleteWorksOpen(true)}>
                      Xóa đã chọn ({selectedWorkIds.length})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setWorksImportOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Excel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setWorkDialog({ open: true, work: null })}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm tác phẩm
                  </Button>
                </div>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <Filter className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Lọc:</span>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Hợp phần
                  </Label>
                  <Select
                    value={worksComponentFilter}
                    onValueChange={setWorksComponentFilter}>
                    <SelectTrigger className="w-[180px] h-9 bg-background">
                      <SelectValue placeholder="Tất cả hợp phần" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả hợp phần</SelectItem>
                      {componentsList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Giai đoạn
                  </Label>
                  <Select
                    value={worksStageFilter}
                    onValueChange={setWorksStageFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-background">
                      <SelectValue placeholder="Tất cả giai đoạn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả giai đoạn</SelectItem>
                      {worksStages.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatStageDisplay(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {worksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {tcViewMode === "table" ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[44px]">
                            <Checkbox
                              checked={
                                allSelectedOnPage
                                  ? true
                                  : someSelectedOnPage
                                  ? "indeterminate"
                                  : false
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedWorkIds((prev) => {
                                    const next = new Set(prev);
                                    paginatedWorks.forEach((w) =>
                                      next.add(w.id)
                                    );
                                    return Array.from(next);
                                  });
                                } else {
                                  setSelectedWorkIds((prev) =>
                                    prev.filter(
                                      (id) => !paginatedWorkIds.has(id)
                                    )
                                  );
                                }
                              }}
                              aria-label="Chọn tất cả"
                            />
                          </TableHead>
                          <SortableHead
                            label="Hợp phần"
                            column="component"
                            sortColumns={worksSortColumns}
                            onSort={handleWorksSort}
                          />
                          <SortableHead
                            label="Tiêu đề (VI)"
                            column="titleVi"
                            sortColumns={worksSortColumns}
                            onSort={handleWorksSort}
                          />
                          <SortableHead
                            label="Tiêu đề Hán Nôm"
                            column="titleHannom"
                            sortColumns={worksSortColumns}
                            onSort={handleWorksSort}
                          />
                          <SortableHead
                            label="Giai đoạn"
                            column="stage"
                            sortColumns={worksSortColumns}
                            onSort={handleWorksSort}
                          />
                          <SortableHead
                            label="Mã tài liệu"
                            column="documentCode"
                            sortColumns={worksSortColumns}
                            onSort={handleWorksSort}
                          />
                          <SortableHead
                            label="Số chữ gốc"
                            column="baseWordCount"
                            sortColumns={worksSortColumns}
                            onSort={handleWorksSort}
                            className="text-right"
                          />
                          <SortableHead
                            label="Số trang gốc"
                            column="basePageCount"
                            sortColumns={worksSortColumns}
                            onSort={handleWorksSort}
                            className="text-right"
                          />
                          <SortableHead
                            label="Hệ số ước tính"
                            column="estimateFactor"
                            sortColumns={worksSortColumns}
                            onSort={handleWorksSort}
                            className="text-right"
                          />
                          <SortableHead
                            label="Số chữ ước tính"
                            column="estimateWordCount"
                            sortColumns={worksSortColumns}
                            onSort={handleWorksSort}
                            className="text-right"
                          />
                          <SortableHead
                            label="Số trang ước tính"
                            column="estimatePageCount"
                            sortColumns={worksSortColumns}
                            onSort={handleWorksSort}
                            className="text-right"
                          />
                          <TableHead className="max-w-[120px] truncate">
                            Ghi chú
                          </TableHead>
                          <TableHead className="w-[120px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedWorks.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={13}
                              className="text-center text-muted-foreground py-8">
                              Chưa có tác phẩm nào.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedWorks.map((w) => (
                            <TableRow key={w.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedWorkSet.has(w.id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedWorkIds((prev) => {
                                      const next = new Set(prev);
                                      if (checked) next.add(w.id);
                                      else next.delete(w.id);
                                      return Array.from(next);
                                    });
                                  }}
                                  aria-label={`Chọn tác phẩm ${
                                    w.titleVi ?? w.id
                                  }`}
                                />
                              </TableCell>
                              <TableCell className="max-w-[140px]">
                                {getComponentName(w.componentId)}
                              </TableCell>
                              <TableCell className="font-medium max-w-[180px]">
                                {w.titleVi ?? "—"}
                              </TableCell>
                              <TableCell className="max-w-[140px]">
                                {w.titleHannom ?? "—"}
                              </TableCell>
                              <TableCell>
                                {formatStageDisplay(w.stage)}
                              </TableCell>
                              <TableCell>{w.documentCode ?? "—"}</TableCell>
                              <TableCell className="text-right">
                                {formatNumberAccounting(w.baseWordCount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumberAccounting(w.basePageCount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {w.estimateFactor != null
                                  ? formatNumberAccounting(w.estimateFactor, 1)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumberAccounting(w.estimateWordCount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumberAccounting(w.estimatePageCount)}
                              </TableCell>
                              <TableCell
                                className="max-w-[120px] truncate"
                                title={w.note ?? undefined}>
                                {w.note ?? "—"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setWorkDialog({ open: true, work: w })
                                  }>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {paginatedTc.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 col-span-full">
                        Chưa có hợp đồng dịch thuật nào.
                      </div>
                    ) : (
                      paginatedTc.map((c) => (
                        <div
                          key={c.id}
                          className="border rounded-lg p-4 bg-background shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">
                                {c.contractNumber ?? "—"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {getComponentName(c.componentId)}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {getWorkTitle(c.workId)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setTcDialog({
                                    open: true,
                                    contract: c,
                                    mode: "view",
                                  })
                                }>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setTcDialog({
                                    open: true,
                                    contract: c,
                                    mode: "edit",
                                  })
                                }>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setTcDeleteTarget(c);
                                  setDeleteTcConfirmOpen(true);
                                }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-muted-foreground">
                                Đơn giá
                              </div>
                              <div>{formatNumberAccounting(c.unitPrice)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Giá trị HĐ
                              </div>
                              <div>
                                {formatNumberAccounting(c.contractValue)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Bắt đầu
                              </div>
                              <div>
                                {formatDateDDMMYYYY(c.startDate) || "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Kết thúc
                              </div>
                              <div>{formatDateDDMMYYYY(c.endDate) || "—"}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Hoàn thành TT
                              </div>
                              <div>
                                {formatDateDDMMYYYY(c.actualCompletionDate) ||
                                  "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Giá trị quyết toán
                              </div>
                              <div>
                                {formatNumberAccounting(c.settlementValue)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {buildTranslationContractPills(c, {
                              proofreadingCompletedDate:
                                proofreadingCompletionByTcId.get(c.id) ??
                                (c.workId
                                  ? proofreadingCompletionByWorkId.get(c.workId)
                                  : undefined),
                              editingCompletedDate: c.workId
                                ? editingCompletionByWorkId.get(c.workId)
                                : undefined,
                            }).map((pill, idx) => (
                              <Badge
                                key={`${c.id}-pill-card-${idx}`}
                                variant="outline"
                                className={contractPillClass[pill.tone]}>
                                {pill.label}
                              </Badge>
                            ))}
                          </div>
                          {c.note && (
                            <div
                              className="mt-2 text-xs text-muted-foreground truncate"
                              title={c.note}>
                              {c.note}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {totalWorksPages > 1 && (
                  <div className="p-4 border-t flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setWorksPage((p) => Math.max(1, p - 1));
                            }}
                            className={
                              worksPage <= 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                        {generatePaginationItems(
                          worksPage,
                          totalWorksPages
                        ).map((item, idx) => {
                          if (item === "ellipsis") {
                            return (
                              <PaginationItem key={`ellipsis-${idx}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return (
                            <PaginationItem key={item}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setWorksPage(item);
                                }}
                                isActive={worksPage === item}>
                                {item}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setWorksPage((p) =>
                                Math.min(totalWorksPages, p + 1)
                              );
                            }}
                            className={
                              worksPage >= totalWorksPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Tab: Hợp đồng dịch thuật */}
        <TabsContent value="translation" className="mt-6">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b flex flex-col gap-4 bg-muted/20">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm số HĐ..."
                      className="pl-9"
                      value={tcSearch}
                      onChange={(e) => setTcSearch(e.target.value)}
                    />
                  </div>
                  <Badge variant="secondary">
                    {filteredTc.length} hợp đồng
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <ToggleGroup
                    type="single"
                    value={tcViewMode}
                    onValueChange={(v) =>
                      v && (v === "table" || v === "card") && setTcViewMode(v)
                    }
                    className="border rounded-md bg-background">
                    <ToggleGroupItem value="table" aria-label="Bảng">
                      <List className="h-4 w-4 mr-1.5" />
                      Bảng
                    </ToggleGroupItem>
                    <ToggleGroupItem value="card" aria-label="Thẻ">
                      <LayoutGrid className="h-4 w-4 mr-1.5" />
                      Thẻ
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Button
                    size="sm"
                    onClick={() =>
                      setTcDialog({ open: true, contract: null, mode: "edit" })
                    }>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm hợp đồng dịch thuật
                  </Button>
                </div>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <Filter className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Lọc:</span>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Hợp phần
                  </Label>
                  <Select
                    value={tcComponentFilter}
                    onValueChange={setTcComponentFilter}>
                    <SelectTrigger className="w-[180px] h-9 bg-background">
                      <SelectValue placeholder="Tất cả hợp phần" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả hợp phần</SelectItem>
                      {componentsList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Dịch giả
                  </Label>
                  <TranslatorPicker
                    value={tcTranslatorSearch}
                    userId={null}
                    onChange={(name) => setTcTranslatorSearch(name)}
                    placeholder="Tìm tên dịch giả..."
                    className="w-[200px]"
                    allowCreate={false}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Giai đoạn
                  </Label>
                  <Select
                    value={tcStageFilter}
                    onValueChange={setTcStageFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-background">
                      <SelectValue placeholder="Tất cả giai đoạn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả giai đoạn</SelectItem>
                      {worksStages.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatStageDisplay(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {tcLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {pcViewMode === "table" ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableHead
                            label="Số HĐ"
                            column="contractNumber"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                          />
                          <SortableHead
                            label="Hợp phần"
                            column="component"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                          />
                          <TableHead>Tác phẩm</TableHead>
                          <SortableHead
                            label="Đơn giá"
                            column="unitPrice"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                            className="text-right"
                          />
                          <SortableHead
                            label="Kinh phí viết bài tổng quan"
                            column="overviewValue"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                            className="text-right"
                          />
                          <SortableHead
                            label="Kinh phí dịch thuật"
                            column="translationValue"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                            className="text-right"
                          />
                          <SortableHead
                            label="Giá trị HĐ"
                            column="contractValue"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                            className="text-right"
                          />
                          <TableHead>Thời gian (tháng)</TableHead>
                          <SortableHead
                            label="Bắt đầu"
                            column="startDate"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                          />
                          <SortableHead
                            label="Kết thúc"
                            column="endDate"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                          />
                          <SortableHead
                            label="Gia hạn từ"
                            column="extensionStartDate"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                          />
                          <SortableHead
                            label="Gia hạn đến"
                            column="extensionEndDate"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                          />
                          <SortableHead
                            label="Hoàn thành TT"
                            column="actualCompletionDate"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                          />
                          <SortableHead
                            label="Số chữ TT"
                            column="actualWordCount"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                            className="text-right"
                          />
                          <SortableHead
                            label="Số trang TT"
                            column="actualPageCount"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                            className="text-right"
                          />
                          <SortableHead
                            label="Tỷ lệ HT"
                            column="completionRate"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                            className="text-right"
                          />
                          <SortableHead
                            label="Giá trị quyết toán"
                            column="settlementValue"
                            sortColumns={tcSortColumns}
                            onSort={handleTcSort}
                            className="text-right"
                          />
                          <TableHead>Tiến độ</TableHead>
                          <TableHead className="max-w-[100px] truncate">
                            Ghi chú
                          </TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTc.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={20}
                              className="text-center text-muted-foreground py-8">
                              Chưa có hợp đồng dịch thuật nào.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedTc.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">
                                {c.contractNumber ?? "—"}
                              </TableCell>
                              <TableCell className="max-w-[140px]">
                                {getComponentName(c.componentId)}
                              </TableCell>
                              <TableCell className="max-w-[220px]">
                                <div
                                  className="font-medium truncate"
                                  title={getWorkTitle(c.workId)}>
                                  {getWorkTitle(c.workId)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right align-top">
                                <span>
                                  {formatNumberAccounting(c.unitPrice)}
                                </span>
                                {c.unitPrice != null && c.unitPrice !== "" && (
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(c.unitPrice)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right align-top">
                                <span>
                                  {formatNumberAccounting(c.overviewValue)}
                                </span>
                                {c.overviewValue != null &&
                                  c.overviewValue !== "" && (
                                    <span className="text-xs text-muted-foreground block mt-0.5">
                                      {numberToVietnameseWords(c.overviewValue)}
                                    </span>
                                  )}
                              </TableCell>
                              <TableCell className="text-right align-top">
                                <span>
                                  {formatNumberAccounting(c.translationValue)}
                                </span>
                                {c.translationValue != null &&
                                  c.translationValue !== "" && (
                                    <span className="text-xs text-muted-foreground block mt-0.5">
                                      {numberToVietnameseWords(
                                        c.translationValue
                                      )}
                                    </span>
                                  )}
                              </TableCell>
                              <TableCell className="text-right align-top">
                                <span>
                                  {formatNumberAccounting(c.contractValue)}
                                </span>
                                {c.contractValue != null &&
                                  c.contractValue !== "" && (
                                    <span className="text-xs text-muted-foreground block mt-0.5">
                                      {numberToVietnameseWords(c.contractValue)}
                                    </span>
                                  )}
                              </TableCell>
                              <TableCell>
                                {formatDurationMonths(c.startDate, c.endDate)}
                              </TableCell>
                              <TableCell>
                                {formatDateDDMMYYYY(c.startDate) || "—"}
                              </TableCell>
                              <TableCell>
                                {formatDateDDMMYYYY(c.endDate) || "—"}
                              </TableCell>
                              <TableCell>
                                {formatDateDDMMYYYY(c.extensionStartDate) ||
                                  "—"}
                              </TableCell>
                              <TableCell>
                                {formatDateDDMMYYYY(c.extensionEndDate) || "—"}
                              </TableCell>
                              <TableCell>
                                {formatDateDDMMYYYY(c.actualCompletionDate) ||
                                  "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumberAccounting(c.actualWordCount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumberAccounting(c.actualPageCount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {c.completionRate != null
                                  ? formatPercent(c.completionRate)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right align-top">
                                <span>
                                  {formatNumberAccounting(c.settlementValue)}
                                </span>
                                {c.settlementValue != null &&
                                  c.settlementValue !== "" && (
                                    <span className="text-xs text-muted-foreground block mt-0.5">
                                      {numberToVietnameseWords(
                                        c.settlementValue
                                      )}
                                    </span>
                                  )}
                              </TableCell>
                              <TableCell className="min-w-[220px]">
                                <div className="flex flex-wrap gap-2">
                                  {buildTranslationContractPills(c, {
                                    proofreadingCompletedDate:
                                      proofreadingCompletionByTcId.get(c.id) ??
                                      (c.workId
                                        ? proofreadingCompletionByWorkId.get(
                                            c.workId
                                          )
                                        : undefined),
                                    editingCompletedDate: c.workId
                                      ? editingCompletionByWorkId.get(c.workId)
                                      : undefined,
                                  }).map((pill, idx) => (
                                    <Badge
                                      key={`${c.id}-pill-${idx}`}
                                      variant="outline"
                                      className={contractPillClass[pill.tone]}>
                                      {pill.label}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell
                                className="max-w-[100px] truncate"
                                title={c.note ?? undefined}>
                                {c.note ?? "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setTcDialog({
                                        open: true,
                                        contract: c,
                                        mode: "view",
                                      })
                                    }>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setTcDialog({
                                        open: true,
                                        contract: c,
                                        mode: "edit",
                                      })
                                    }>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setTcDeleteTarget(c);
                                      setDeleteTcConfirmOpen(true);
                                    }}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {paginatedPc.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 col-span-full">
                        Chưa có hợp đồng hiệu đính nào.
                      </div>
                    ) : (
                      paginatedPc.map((c) => (
                        <div
                          key={c.id}
                          className="border rounded-lg p-4 bg-background shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">
                                {c.contractNumber ?? "—"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {getComponentName(c.componentId)}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {getWorkTitle(c.workId)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setPcDialog({
                                    open: true,
                                    contract: c,
                                    mode: "view",
                                  })
                                }>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setPcDialog({
                                    open: true,
                                    contract: c,
                                    mode: "edit",
                                  })
                                }>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setPcDeleteTarget(c);
                                  setDeletePcConfirmOpen(true);
                                }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-muted-foreground">
                                Biên tập viên
                              </div>
                              <div>{getProofreaderName(c.id)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Giá trị HĐ
                              </div>
                              <div>
                                {formatNumberAccounting(c.contractValue)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Bắt đầu
                              </div>
                              <div>
                                {formatDateDDMMYYYY(c.startDate) || "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Kết thúc
                              </div>
                              <div>{formatDateDDMMYYYY(c.endDate) || "—"}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Hoàn thành TT
                              </div>
                              <div>
                                {formatDateDDMMYYYY(c.actualCompletionDate) ||
                                  "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                Số trang
                              </div>
                              <div>{formatNumberAccounting(c.pageCount)}</div>
                            </div>
                          </div>
                          {c.note && (
                            <div
                              className="mt-2 text-xs text-muted-foreground truncate"
                              title={c.note}>
                              {c.note}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
                {totalTcPages > 1 && (
                  <div className="p-4 border-t flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setTcPage((p) => Math.max(1, p - 1));
                            }}
                            className={
                              tcPage <= 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                        {generatePaginationItems(tcPage, totalTcPages).map(
                          (item, idx) => {
                            if (item === "ellipsis") {
                              return (
                                <PaginationItem key={`ellipsis-${idx}`}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return (
                              <PaginationItem key={item}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setTcPage(item);
                                  }}
                                  isActive={tcPage === item}>
                                  {item}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                        )}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setTcPage((p) => Math.min(totalTcPages, p + 1));
                            }}
                            className={
                              tcPage >= totalTcPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Tab: Hợp đồng hiệu đính */}
        <TabsContent value="proofreading" className="mt-6">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b flex flex-col gap-4 bg-muted/20">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm số HĐ / biên tập viên..."
                      className="pl-9"
                      value={pcSearch}
                      onChange={(e) => setPcSearch(e.target.value)}
                    />
                  </div>
                  <Badge variant="secondary">
                    {filteredPc.length} hợp đồng
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <ToggleGroup
                    type="single"
                    value={pcViewMode}
                    onValueChange={(v) =>
                      v && (v === "table" || v === "card") && setPcViewMode(v)
                    }
                    className="border rounded-md bg-background">
                    <ToggleGroupItem value="table" aria-label="Bảng">
                      <List className="h-4 w-4 mr-1.5" />
                      Bảng
                    </ToggleGroupItem>
                    <ToggleGroupItem value="card" aria-label="Thẻ">
                      <LayoutGrid className="h-4 w-4 mr-1.5" />
                      Thẻ
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Button
                    size="sm"
                    onClick={() =>
                      setPcDialog({ open: true, contract: null, mode: "edit" })
                    }>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm hợp đồng hiệu đính
                  </Button>
                </div>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <Filter className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Lọc:</span>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Hợp phần
                  </Label>
                  <Select
                    value={pcComponentFilter}
                    onValueChange={setPcComponentFilter}>
                    <SelectTrigger className="w-[180px] h-9 bg-background">
                      <SelectValue placeholder="Tất cả hợp phần" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả hợp phần</SelectItem>
                      {componentsList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Giai đoạn
                  </Label>
                  <Select
                    value={pcStageFilter}
                    onValueChange={setPcStageFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-background">
                      <SelectValue placeholder="Tất cả giai đoạn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả giai đoạn</SelectItem>
                      {worksStages.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatStageDisplay(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {pcLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHead
                          label="Số HĐ"
                          column="contractNumber"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                        />
                        <SortableHead
                          label="Hợp phần"
                          column="component"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                        />
                        <TableHead>Tác phẩm</TableHead>
                        <TableHead>Người hiệu đính</TableHead>
                        <SortableHead
                          label="Số trang"
                          column="pageCount"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                          className="text-right"
                        />
                        <SortableHead
                          label="Tỷ lệ"
                          column="rateRatio"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                          className="text-right"
                        />
                        <SortableHead
                          label="Giá trị HĐ"
                          column="contractValue"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                          className="text-right"
                        />
                        <SortableHead
                          label="Bắt đầu"
                          column="startDate"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                        />
                        <SortableHead
                          label="Kết thúc"
                          column="endDate"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                        />
                        <SortableHead
                          label="Hoàn thành TT"
                          column="actualCompletionDate"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                        />
                        <TableHead className="max-w-[100px] truncate">
                          Ghi chú
                        </TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPc.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={12}
                            className="text-center text-muted-foreground py-8">
                            Chưa có hợp đồng hiệu đính nào.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedPc.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              {c.contractNumber ?? "—"}
                            </TableCell>
                            <TableCell className="max-w-[140px]">
                              {getComponentName(c.componentId)}
                            </TableCell>
                            <TableCell className="max-w-[220px]">
                              <div
                                className="font-medium truncate"
                                title={getWorkTitle(c.workId)}>
                                {getWorkTitle(c.workId)}
                              </div>
                            </TableCell>
                            <TableCell>{getProofreaderName(c.id)}</TableCell>
                            <TableCell className="text-right">
                              {formatNumberAccounting(c.pageCount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {c.rateRatio != null
                                ? formatPercent(c.rateRatio)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <span>
                                {formatNumberAccounting(c.contractValue)}
                              </span>
                              {c.contractValue != null &&
                                c.contractValue !== "" && (
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(c.contractValue)}
                                  </span>
                                )}
                            </TableCell>
                            <TableCell>
                              {formatDateDDMMYYYY(c.startDate) || "—"}
                            </TableCell>
                            <TableCell>
                              {formatDateDDMMYYYY(c.endDate) || "—"}
                            </TableCell>
                            <TableCell>
                              {formatDateDDMMYYYY(c.actualCompletionDate) ||
                                "—"}
                            </TableCell>
                            <TableCell
                              className="max-w-[100px] truncate"
                              title={c.note ?? undefined}>
                              {c.note ?? "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setPcDialog({
                                      open: true,
                                      contract: c,
                                      mode: "view",
                                    })
                                  }>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setPcDialog({
                                      open: true,
                                      contract: c,
                                      mode: "edit",
                                    })
                                  }>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setPcDeleteTarget(c);
                                    setDeletePcConfirmOpen(true);
                                  }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalPcPages > 1 && (
                  <div className="p-4 border-t flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPcPage((p) => Math.max(1, p - 1));
                            }}
                            className={
                              pcPage <= 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                        {generatePaginationItems(pcPage, totalPcPages).map(
                          (item, idx) => {
                            if (item === "ellipsis") {
                              return (
                                <PaginationItem key={`ellipsis-${idx}`}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return (
                              <PaginationItem key={item}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setPcPage(item);
                                  }}
                                  isActive={pcPage === item}>
                                  {item}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                        )}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPcPage((p) => Math.min(totalPcPages, p + 1));
                            }}
                            className={
                              pcPage >= totalPcPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task dialogs */}
      <TaskDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        mode={taskDialogMode}
      />
      <TaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        task={null}
        defaultGroup="Thư ký hợp phần"
        onCreate={(taskData) => {
          createTask(
            { ...taskData, group: taskData.group || "Thư ký hợp phần" },
            {
              onSuccess: () => {
                toast({
                  title: "Thành công",
                  description: "Đã thêm công việc.",
                });
                setIsCreateTaskOpen(false);
              },
              onError: (e) =>
                toast({
                  title: "Lỗi",
                  description: e.message,
                  variant: "destructive",
                }),
            }
          );
        }}
      />

      <AlertDialog
        open={deleteTaskConfirmOpen}
        onOpenChange={setDeleteTaskConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa công việc</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa công việc "
              {deleteTaskTarget?.title ?? deleteTaskTarget?.id}"? Hành động này
              không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTaskTarget?.id) return;
                deleteTask(deleteTaskTarget.id, {
                  onSuccess: () => {
                    setDeleteTaskConfirmOpen(false);
                    setDeleteTaskTarget(null);
                  },
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingTask}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Work create/edit dialog - simple form */}
      <Dialog
        open={workDialog.open}
        onOpenChange={(open) => setWorkDialog({ open, work: workDialog.work })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {workDialog.work ? "Chỉnh sửa tác phẩm" : "Thêm tác phẩm"}
            </DialogTitle>
            <DialogDescription>Danh mục tác phẩm dịch thuật.</DialogDescription>
          </DialogHeader>
          <WorkForm
            key={workDialog.work?.id ?? "new"}
            work={workDialog.work}
            componentsList={componentsList}
            onSubmit={(data) => {
              if (workDialog.work)
                updateWorkMutation.mutate({ id: workDialog.work.id, data });
              else createWorkMutation.mutate(data);
            }}
            onDelete={
              workDialog.work ? () => setDeleteWorkConfirmOpen(true) : undefined
            }
            isPending={
              createWorkMutation.isPending || updateWorkMutation.isPending
            }
            isDeleting={deleteWorkMutation.isPending}
          />
          <AlertDialog
            open={deleteWorkConfirmOpen}
            onOpenChange={setDeleteWorkConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa tác phẩm</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc chắn muốn xóa tác phẩm "
                  {workDialog.work?.titleVi || workDialog.work?.id}"? Hành động
                  này không thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (workDialog.work) {
                      deleteWorkMutation.mutate(workDialog.work.id);
                    }
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={bulkDeleteWorksOpen}
        onOpenChange={setBulkDeleteWorksOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa nhiều tác phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa {selectedWorkIds.length} tác phẩm đã
              chọn? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedWorkIds.length === 0) return;
                bulkDeleteWorksMutation.mutate(selectedWorkIds);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteWorksMutation.isPending}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Translation contract dialog */}
      <Dialog
        open={tcDialog.open}
        onOpenChange={(open) =>
          setTcDialog({
            open,
            contract: tcDialog.contract,
            mode: tcDialog.mode,
          })
        }>
        <DialogContent className="max-w-[90rem] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {tcDialog.mode === "view"
                ? "Xem hợp đồng dịch thuật"
                : tcDialog.contract
                ? "Chỉnh sửa hợp đồng dịch thuật"
                : "Thêm hợp đồng dịch thuật"}
            </DialogTitle>
            <DialogDescription>
              Hợp đồng dịch thuật gắn với tác phẩm.
            </DialogDescription>
          </DialogHeader>
          <TranslationContractForm
            key={tcDialog.contract?.id ?? "new"}
            contract={tcDialog.contract}
            works={works}
            tasks={tasks}
            proofreadingContracts={proofreadingContracts}
            translationContracts={translationContracts}
            componentsList={componentsList}
            queryClient={queryClient}
            readOnly={tcDialog.mode === "view"}
            onSubmit={(data) => {
              if (tcDialog.contract)
                updateTcMutation.mutate({ id: tcDialog.contract.id, data });
              else createTcMutation.mutate(data);
            }}
            isPending={createTcMutation.isPending || updateTcMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Proofreading contract dialog */}
      <Dialog
        open={pcDialog.open}
        onOpenChange={(open) =>
          setPcDialog({
            open,
            contract: pcDialog.contract,
            mode: pcDialog.mode,
          })
        }>
        <DialogContent className="max-w-[90rem] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {pcDialog.mode === "view"
                ? "Xem hợp đồng hiệu đính"
                : pcDialog.contract
                ? "Chỉnh sửa hợp đồng hiệu đính"
                : "Thêm hợp đồng hiệu đính"}
            </DialogTitle>
            <DialogDescription>
              Hợp đồng hiệu đính gắn với hợp đồng dịch thuật.
            </DialogDescription>
          </DialogHeader>
          <ProofreadingContractForm
            key={pcDialog.contract?.id ?? "new"}
            contract={pcDialog.contract}
            works={works}
            translationContracts={translationContracts}
            componentsList={componentsList}
            queryClient={queryClient}
            readOnly={pcDialog.mode === "view"}
            onSubmit={(data) => {
              if (pcDialog.contract)
                updatePcMutation.mutate({ id: pcDialog.contract.id, data });
              else createPcMutation.mutate(data);
            }}
            isPending={createPcMutation.isPending || updatePcMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTcConfirmOpen}
        onOpenChange={setDeleteTcConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xác nhận xóa hợp đồng dịch thuật
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa hợp đồng "
              {tcDeleteTarget?.contractNumber ?? tcDeleteTarget?.id}"? Hành động
              này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (tcDeleteTarget?.id)
                  deleteTcMutation.mutate(tcDeleteTarget.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deletePcConfirmOpen}
        onOpenChange={setDeletePcConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa hợp đồng hiệu đính</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa hợp đồng "
              {pcDeleteTarget?.contractNumber ?? pcDeleteTarget?.id}"? Hành động
              này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pcDeleteTarget?.id)
                  deletePcMutation.mutate(pcDeleteTarget.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Works Import Dialog */}
      <WorksImport open={worksImportOpen} onOpenChange={setWorksImportOpen} />
    </div>
  );
}

// --- Contract stages (giai đoạn hợp đồng) subsection ---
async function fetchStages(
  translationContractId: string | null,
  proofreadingContractId: string | null
): Promise<ContractStage[]> {
  if (translationContractId) {
    const res = await fetch(
      buildUrl(api.contractStages.listByTranslationContract.path, {
        contractId: translationContractId,
      }),
      { credentials: "include" }
    );
    if (!res.ok) return [];
    return res.json();
  }
  if (proofreadingContractId) {
    const res = await fetch(
      buildUrl(api.contractStages.listByProofreadingContract.path, {
        contractId: proofreadingContractId,
      }),
      { credentials: "include" }
    );
    if (!res.ok) return [];
    return res.json();
  }
  return [];
}

function ContractStagesSection({
  translationContractId = null,
  proofreadingContractId = null,
  queryClient,
  readOnly = false,
}: {
  translationContractId?: string | null;
  proofreadingContractId?: string | null;
  queryClient: ReturnType<typeof useQueryClient>;
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const contractId = translationContractId ?? proofreadingContractId ?? "";
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["contract-stages", contractId],
    queryFn: () =>
      fetchStages(
        translationContractId ?? null,
        proofreadingContractId ?? null
      ),
    enabled: !!contractId,
  });

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    stageCode: "",
    stageOrder: "1",
    startDate: "",
    endDate: "",
    actualCompletionDate: "",
    note: "",
  });

  const resetForm = () => {
    setForm({
      stageCode: "",
      stageOrder: "1",
      startDate: "",
      endDate: "",
      actualCompletionDate: "",
      note: "",
    });
    setAdding(false);
    setEditingId(null);
  };

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const body = {
        ...data,
        translationContractId: translationContractId || null,
        proofreadingContractId: proofreadingContractId || null,
      };
      const res = await fetch(api.contractStages.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Thêm giai đoạn thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contract-stages", contractId],
      });
      resetForm();
      toast({ title: "Đã thêm giai đoạn" });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(
        buildUrl(api.contractStages.update.path, { id }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error("Cập nhật thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contract-stages", contractId],
      });
      resetForm();
      toast({ title: "Đã cập nhật giai đoạn" });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        buildUrl(api.contractStages.delete.path, { id }),
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Xóa thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contract-stages", contractId],
      });
      toast({ title: "Đã xóa giai đoạn" });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const fillForm = (s: ContractStage) => {
    setForm({
      stageCode: parseStageNumber(s.stageCode),
      stageOrder: String(s.stageOrder ?? 1),
      startDate: s.startDate ? (s.startDate as string).slice(0, 10) : "",
      endDate: s.endDate ? (s.endDate as string).slice(0, 10) : "",
      actualCompletionDate: s.actualCompletionDate
        ? (s.actualCompletionDate as string).slice(0, 10)
        : "",
      note: s.note ?? "",
    });
    setEditingId(s.id);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code =
      (form.stageCode && String(form.stageCode).replace(/\D/g, "")) || null;
    createMutation.mutate({
      stageCode: code ?? "",
      stageOrder: form.stageOrder ? parseInt(form.stageOrder, 10) : 1,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      actualCompletionDate: form.actualCompletionDate || null,
      note: form.note || null,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const code =
      (form.stageCode && String(form.stageCode).replace(/\D/g, "")) || null;
    updateMutation.mutate({
      id: editingId,
      data: {
        stageCode: code ?? "",
        stageOrder: form.stageOrder ? parseInt(form.stageOrder, 10) : 1,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        actualCompletionDate: form.actualCompletionDate || null,
        note: form.note || null,
      },
    });
  };

  return (
    <div className="space-y-2 rounded-md border p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Giai đoạn hợp đồng</Label>
        {!readOnly && !adding && !editingId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Thêm giai đoạn
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
        </div>
      ) : (
        <>
          {stages.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã GĐ</TableHead>
                    <TableHead className="w-16">Thứ tự</TableHead>
                    <TableHead>Bắt đầu</TableHead>
                    <TableHead>Kết thúc</TableHead>
                    <TableHead>HT thực tế</TableHead>
                    <TableHead className="max-w-[100px]">Ghi chú</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stages.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {formatStageDisplay(s.stageCode)}
                      </TableCell>
                      <TableCell>{s.stageOrder ?? "—"}</TableCell>
                      <TableCell>
                        {formatDateDDMMYYYY(s.startDate) || "—"}
                      </TableCell>
                      <TableCell>
                        {formatDateDDMMYYYY(s.endDate) || "—"}
                      </TableCell>
                      <TableCell>
                        {formatDateDDMMYYYY(s.actualCompletionDate) || "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-[100px] truncate"
                        title={s.note ?? undefined}>
                        {s.note ?? "—"}
                      </TableCell>
                      <TableCell>
                        {readOnly || editingId === s.id ? null : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => fillForm(s)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteMutation.mutate(s.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!readOnly && (adding || editingId) && (
            <form
              onSubmit={editingId ? handleEditSubmit : handleAddSubmit}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t">
              <Input
                type="number"
                min={1}
                placeholder="1, 2, 3..."
                value={form.stageCode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    stageCode: e.target.value.replace(/\D/g, ""),
                  }))
                }
              />
              <Input
                type="number"
                placeholder="Thứ tự"
                value={form.stageOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stageOrder: e.target.value }))
                }
              />
              <DateInput
                value={form.startDate || null}
                onChange={(v) => setForm((f) => ({ ...f, startDate: v || "" }))}
                placeholder="Bắt đầu"
              />
              <DateInput
                value={form.endDate || null}
                onChange={(v) => setForm((f) => ({ ...f, endDate: v || "" }))}
                placeholder="Kết thúc"
              />
              <DateInput
                value={form.actualCompletionDate || null}
                onChange={(v) =>
                  setForm((f) => ({ ...f, actualCompletionDate: v || "" }))
                }
                placeholder="HT thực tế"
                className="sm:col-span-2"
              />
              <Input
                placeholder="Ghi chú"
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                className="sm:col-span-2"
              />
              <div className="col-span-2 flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }>
                  {editingId ? "Cập nhật" : "Thêm"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resetForm}>
                  Hủy
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function WorkForm({
  work,
  componentsList,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
}: {
  work: Work | null;
  componentsList: Component[];
  onSubmit: (data: Record<string, unknown>) => void;
  onDelete?: () => void;
  isPending: boolean;
  isDeleting?: boolean;
}) {
  const [componentId, setComponentId] = useState(work?.componentId ?? "");
  const [titleVi, setTitleVi] = useState(work?.titleVi ?? "");
  const [titleHannom, setTitleHannom] = useState(work?.titleHannom ?? "");
  const [stage, setStage] = useState(() => parseStageNumber(work?.stage));
  const [documentCode, setDocumentCode] = useState(work?.documentCode ?? "");
  const [baseWordCount, setBaseWordCount] = useState(
    work?.baseWordCount != null ? String(work.baseWordCount) : ""
  );
  const [basePageCount, setBasePageCount] = useState(
    work?.basePageCount != null ? String(work.basePageCount) : ""
  );
  const [estimateFactor, setEstimateFactor] = useState(
    work?.estimateFactor != null ? String(work.estimateFactor) : ""
  );
  const [estimateWordCount, setEstimateWordCount] = useState(
    work?.estimateWordCount != null ? String(work.estimateWordCount) : ""
  );
  const [estimatePageCount, setEstimatePageCount] = useState(
    work?.estimatePageCount != null ? String(work.estimatePageCount) : ""
  );
  const [note, setNote] = useState(work?.note ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      componentId: componentId || null,
      titleVi: titleVi || null,
      titleHannom: titleHannom || null,
      stage: (stage && String(stage).replace(/\D/g, "")) || null,
      documentCode: documentCode || null,
      baseWordCount: baseWordCount ? parseInt(baseWordCount, 10) : null,
      basePageCount: basePageCount ? parseInt(basePageCount, 10) : null,
      estimateFactor:
        estimateFactor != null && estimateFactor !== ""
          ? String(estimateFactor)
          : null,
      estimateWordCount: estimateWordCount
        ? parseInt(estimateWordCount, 10)
        : null,
      estimatePageCount: estimatePageCount
        ? parseInt(estimatePageCount, 10)
        : null,
      note: note || null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid gap-2">
        <Label>Hợp phần</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={componentId}
          onChange={(e) => setComponentId(e.target.value)}>
          <option value="">— Chọn hợp phần —</option>
          {componentsList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Tiêu đề (tiếng Việt)</Label>
          <Input
            value={titleVi}
            onChange={(e) => setTitleVi(e.target.value)}
            placeholder="VD: Phật tạng toàn dịch"
          />
        </div>
        <div className="grid gap-2">
          <Label>Tiêu đề Hán Nôm</Label>
          <Input
            value={titleHannom}
            onChange={(e) => setTitleHannom(e.target.value)}
            placeholder="Hán Nôm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Giai đoạn</Label>
          <Input
            type="number"
            min={1}
            value={stage}
            onChange={(e) => setStage(e.target.value.replace(/\D/g, ""))}
            placeholder="1, 2, 3..."
          />
        </div>
        <div className="grid gap-2">
          <Label>Mã tài liệu</Label>
          <Input
            value={documentCode}
            onChange={(e) => setDocumentCode(e.target.value)}
            placeholder="Mã tài liệu"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>Số chữ gốc</Label>
          <NumberInput
            value={baseWordCount}
            onChange={(v) => {
              setBaseWordCount(v);
              const n = v ? parseInt(v, 10) : NaN;
              setBasePageCount(!isNaN(n) ? String(charsToPages(n)) : "");
              const f = estimateFactor ? parseFloat(estimateFactor) : NaN;
              if (!isNaN(n) && !isNaN(f)) {
                setEstimateWordCount(String(Math.round(n * f)));
                setEstimatePageCount(String(charsToPages(Math.round(n * f))));
              }
            }}
            decimals={0}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>
            Số trang gốc{" "}
            <span className="text-muted-foreground font-normal">
              (350 chữ/trang)
            </span>
          </Label>
          <NumberInput
            value={basePageCount}
            onChange={setBasePageCount}
            decimals={0}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>Hệ số ước tính</Label>
          <Input
            type="number"
            step="0.0001"
            value={estimateFactor}
            onChange={(e) => {
              const v = e.target.value;
              setEstimateFactor(v);
              const base = baseWordCount ? parseInt(baseWordCount, 10) : NaN;
              const f = v ? parseFloat(v) : NaN;
              if (!isNaN(base) && !isNaN(f)) {
                const est = Math.round(base * f);
                setEstimateWordCount(String(est));
                setEstimatePageCount(String(charsToPages(est)));
              }
            }}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>
            Số chữ ước tính{" "}
            <span className="text-muted-foreground font-normal">
              (số chữ gốc × hệ số)
            </span>
          </Label>
          <NumberInput
            value={estimateWordCount}
            onChange={(v) => {
              setEstimateWordCount(v);
              const n = v ? parseInt(v, 10) : NaN;
              setEstimatePageCount(!isNaN(n) ? String(charsToPages(n)) : "");
            }}
            decimals={0}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>
            Số trang ước tính{" "}
            <span className="text-muted-foreground font-normal">
              (350 chữ/trang)
            </span>
          </Label>
          <NumberInput
            value={estimatePageCount}
            onChange={setEstimatePageCount}
            decimals={0}
            placeholder="0"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Ghi chú</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú"
        />
      </div>
      <DialogFooter className="flex justify-between">
        {work && onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isPending || isDeleting}>
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending || isDeleting}
          className={work && onDelete ? "ml-auto" : ""}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {work ? "Cập nhật" : "Thêm"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function TranslationContractForm({
  contract,
  works,
  tasks,
  proofreadingContracts,
  translationContracts,
  componentsList,
  queryClient,
  onSubmit,
  isPending,
  readOnly = false,
}: {
  contract: TranslationContract | null;
  works: Work[];
  tasks: TaskWithAssignmentDetails[];
  proofreadingContracts: ProofreadingContract[];
  translationContracts: TranslationContract[];
  componentsList: Component[];
  queryClient: ReturnType<typeof useQueryClient>;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
  readOnly?: boolean;
}) {
  const [contractNumber, setContractNumber] = useState(
    contract?.contractNumber ?? ""
  );
  const [componentId, setComponentId] = useState(contract?.componentId ?? "");
  const [workId, setWorkId] = useState(contract?.workId ?? "");
  const [unitPrice, setUnitPrice] = useState(
    contract?.unitPrice != null ? String(contract.unitPrice) : ""
  );
  const [overviewValue, setOverviewValue] = useState(
    contract?.overviewValue != null ? String(contract.overviewValue) : ""
  );
  const [translationValue, setTranslationValue] = useState(
    contract?.translationValue != null ? String(contract.translationValue) : ""
  );
  const [contractValue, setContractValue] = useState(
    contract?.contractValue != null ? String(contract.contractValue) : ""
  );
  const [startDate, setStartDate] = useState(
    contract?.startDate ? (contract.startDate as string).slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState(
    contract?.endDate ? (contract.endDate as string).slice(0, 10) : ""
  );
  const [extensionStartDate, setExtensionStartDate] = useState(
    contract?.extensionStartDate
      ? (contract.extensionStartDate as string).slice(0, 10)
      : ""
  );
  const [extensionEndDate, setExtensionEndDate] = useState(
    contract?.extensionEndDate
      ? (contract.extensionEndDate as string).slice(0, 10)
      : ""
  );
  const [actualCompletionDate, setActualCompletionDate] = useState(
    contract?.actualCompletionDate
      ? (contract.actualCompletionDate as string).slice(0, 10)
      : ""
  );
  const [actualWordCount, setActualWordCount] = useState(
    contract?.actualWordCount != null ? String(contract.actualWordCount) : ""
  );
  const [actualPageCount, setActualPageCount] = useState(
    contract?.actualPageCount != null ? String(contract.actualPageCount) : ""
  );
  const [completionRate, setCompletionRate] = useState(
    contract?.completionRate != null
      ? String(Number(contract.completionRate) * 100)
      : ""
  );
  const [settlementValue, setSettlementValue] = useState(
    contract?.settlementValue != null ? String(contract.settlementValue) : ""
  );
  const [note, setNote] = useState(contract?.note ?? "");
  const [status, setStatus] = useState(contract?.status ?? "Active");
  const [translatorName, setTranslatorName] = useState("");
  const [translatorUserId, setTranslatorUserId] = useState<string | null>(null);

  const { data: users = [] } = useUsers();
  const duplicateTranslationContract = useMemo(() => {
    const normalizedNumber = normalizeSearch(contractNumber.trim());
    if (!componentId || !workId || !normalizedNumber) return null;
    return (
      translationContracts.find((c) => {
        if (contract?.id && c.id === contract.id) return false;
        if (c.componentId !== componentId) return false;
        if (c.workId !== workId) return false;
        const number = normalizeSearch(String(c.contractNumber ?? ""));
        return number === normalizedNumber;
      }) ?? null
    );
  }, [componentId, workId, contractNumber, translationContracts, contract?.id]);

  // Load translation contract members when editing
  const { data: contractMembers = [] } = useQuery({
    queryKey: ["translation-contract-members", contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];
      const res = await fetch(
        buildUrl(api.translationContractMembers.listByContract.path, {
          contractId: contract.id,
        }),
        { credentials: "include" }
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!contract?.id,
  });

  // Set translator when contract members are loaded
  useEffect(() => {
    if (contractMembers.length > 0 && contractMembers[0]?.userId) {
      const member = contractMembers[0];
      setTranslatorUserId(member.userId);
      const user = users.find((u) => u.id === member.userId);
      if (user) {
        setTranslatorName(user.displayName);
      }
    }
  }, [contractMembers, users]);
  const [cancelledAt, setCancelledAt] = useState(
    contract?.cancelledAt ? (contract.cancelledAt as string).slice(0, 10) : ""
  );
  const [progressCheckDate, setProgressCheckDate] = useState(
    contract?.progressCheckDate
      ? (contract.progressCheckDate as string).slice(0, 10)
      : ""
  );
  const [expertReviewDate, setExpertReviewDate] = useState(
    contract?.expertReviewDate
      ? (contract.expertReviewDate as string).slice(0, 10)
      : ""
  );
  const [projectAcceptanceDate, setProjectAcceptanceDate] = useState(
    contract?.projectAcceptanceDate
      ? (contract.projectAcceptanceDate as string).slice(0, 10)
      : ""
  );
  const [proofreadingInProgress, setProofreadingInProgress] = useState(
    !!contract?.proofreadingInProgress
  );
  const [editingInProgress, setEditingInProgress] = useState(
    !!contract?.editingInProgress
  );
  const [printTransferDate, setPrintTransferDate] = useState(
    contract?.printTransferDate
      ? (contract.printTransferDate as string).slice(0, 10)
      : ""
  );
  const [publishedDate, setPublishedDate] = useState(
    contract?.publishedDate
      ? (contract.publishedDate as string).slice(0, 10)
      : ""
  );
  useEffect(() => {
    if (actualCompletionDate.trim() !== "") {
      setStatus("Completed");
    }
  }, [actualCompletionDate]);
  const contractDateError = useMemo(() => {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    const actual = parseDateOnly(actualCompletionDate);
    if (start && end && end.getTime() < start.getTime()) {
      return "Ngày kết thúc hợp đồng không được nhỏ hơn ngày bắt đầu.";
    }
    if (start && actual && actual.getTime() < start.getTime()) {
      return "Ngày hoàn thành thực tế không được nhỏ hơn ngày bắt đầu.";
    }
    return null;
  }, [startDate, endDate, actualCompletionDate]);
  const today = () => new Date().toISOString().slice(0, 10);
  const autoEditingCompletedDate = useMemo(() => {
    if (!workId) return "";
    const bienTapTasks = tasks.filter(
      (t) => t.group === "Biên tập" && t.relatedWorkId === workId
    );
    const completedDates = bienTapTasks
      .filter((t) => {
        const wf = t.workflow;
        let roundType = "";
        if (typeof wf === "string") {
          try {
            const parsed = JSON.parse(wf) as {
              rounds?: Array<{ roundType?: string | null }>;
            };
            roundType = parsed?.rounds?.[0]?.roundType ?? "";
          } catch {
            roundType = "";
          }
        } else if (typeof wf === "object" && wf) {
          const parsed = wf as {
            rounds?: Array<{ roundType?: string | null }>;
          };
          roundType = parsed?.rounds?.[0]?.roundType ?? "";
        }
        return roundType?.toLowerCase().includes("bông chuyển in");
      })
      .map((t) => {
        const v = t.actualCompletedAt;
        if (!v) return "";
        const date = typeof v === "string" ? new Date(v) : v;
        if (!date || Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
      })
      .filter(Boolean);
    if (completedDates.length === 0) return "";
    return completedDates.sort().slice(-1)[0];
  }, [tasks, workId]);

  const autoProofreadingCompletedDate = useMemo(() => {
    if (!contract?.id && !workId) return "";
    const matches = proofreadingContracts.filter((c) =>
      contract?.id
        ? c.translationContractId === contract.id
        : c.workId === workId
    );
    const dates = matches
      .map((c) => c.actualCompletionDate)
      .map((v) => {
        if (!v) return "";
        const date = typeof v === "string" ? new Date(v) : v;
        if (!date || Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
      })
      .filter(Boolean);
    if (dates.length === 0) return "";
    return dates.sort().slice(-1)[0];
  }, [proofreadingContracts, contract?.id, workId]);

  // Kinh phí dịch thuật = đơn giá × số trang dự tính
  useEffect(() => {
    const selectedWork = works.find((w) => w.id === workId);
    const estimatePageCount =
      selectedWork?.estimatePageCount != null
        ? Number(selectedWork.estimatePageCount)
        : 0;
    const price = unitPrice.trim() === "" ? NaN : parseFloat(unitPrice);
    if (Number.isNaN(price) || estimatePageCount === 0) {
      setTranslationValue("");
      return;
    }
    setTranslationValue((estimatePageCount * price).toFixed(2));
  }, [workId, unitPrice, works]);

  // Giá trị hợp đồng = Kinh phí dịch thuật + Kinh phí viết bài tổng quan
  useEffect(() => {
    if (translationValue.trim() === "" && overviewValue.trim() === "") {
      setContractValue("");
      return;
    }
    const trans =
      translationValue.trim() === "" ? 0 : parseFloat(translationValue);
    const over = overviewValue.trim() === "" ? 0 : parseFloat(overviewValue);
    const total =
      (Number.isNaN(trans) ? 0 : trans) + (Number.isNaN(over) ? 0 : over);
    setContractValue(total.toFixed(2));
  }, [translationValue, overviewValue]);

  // Khi bản dịch đã hoàn thành (có ngày hoàn thành thực tế): tự tính Tỷ lệ hoàn thành và Giá trị quyết toán
  // Tỷ lệ hoàn thành = actual_page_count / estimate_page_count (works) * 100%
  // Giá trị quyết toán = (actual_page_count * unit_price) + overview_value
  useEffect(() => {
    if (actualCompletionDate.trim() === "") return;
    const selectedWork = works.find((w) => w.id === workId);
    const estimatePageCount =
      selectedWork?.estimatePageCount != null
        ? Number(selectedWork.estimatePageCount)
        : 0;
    const actualPages =
      actualPageCount.trim() === "" ? NaN : parseInt(actualPageCount, 10);
    const price = unitPrice.trim() === "" ? NaN : parseFloat(unitPrice);
    const over = overviewValue.trim() === "" ? 0 : parseFloat(overviewValue);
    if (Number.isNaN(actualPages)) return;
    if (estimatePageCount > 0) {
      const rate = (actualPages / estimatePageCount) * 100;
      setCompletionRate(rate.toFixed(2));
    }
    if (!Number.isNaN(price)) {
      const settlement = actualPages * price + (Number.isNaN(over) ? 0 : over);
      setSettlementValue(settlement.toFixed(2));
    }
  }, [
    actualCompletionDate,
    actualPageCount,
    workId,
    unitPrice,
    overviewValue,
    works,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const computedStatus =
      actualCompletionDate.trim() !== "" ? "Completed" : status;
    if (duplicateTranslationContract) return;
    if (contractDateError) return;

    // Gửi số dưới dạng chuỗi để API/Zod (drizzle-zod numeric) không báo 400
    const num = (v: string | null) =>
      v != null && v !== "" ? String(Number(v)) : null;

    // Gọi onSubmit với data hợp đồng
    // translatorUserId đã được xử lý trong TranslatorPicker
    onSubmit({
      contractNumber: contractNumber || null,
      componentId: componentId || null,
      workId: workId || null,
      unitPrice: unitPrice ? num(unitPrice) : null,
      overviewValue: overviewValue ? num(overviewValue) : null,
      translationValue: translationValue ? num(translationValue) : null,
      contractValue: contractValue ? num(contractValue) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      extensionStartDate: extensionStartDate || null,
      extensionEndDate: extensionEndDate || null,
      actualCompletionDate: actualCompletionDate || null,
      actualWordCount: actualWordCount ? parseInt(actualWordCount, 10) : null,
      actualPageCount: actualPageCount ? parseInt(actualPageCount, 10) : null,
      completionRate: completionRate
        ? num(String(Number(completionRate) / 100))
        : null,
      settlementValue: settlementValue ? num(settlementValue) : null,
      status: computedStatus || null,
      cancelledAt: computedStatus === "Cancel" ? cancelledAt || null : null,
      progressCheckDate: progressCheckDate || null,
      expertReviewDate: expertReviewDate || null,
      projectAcceptanceDate: projectAcceptanceDate || null,
      proofreadingInProgress,
      proofreadingCompleted: !!autoProofreadingCompletedDate,
      editingInProgress,
      editingCompleted: !!autoEditingCompletedDate,
      printTransferDate: printTransferDate || null,
      publishedDate: publishedDate || null,
      note: note || null,
      _translatorUserId: translatorUserId, // Dùng prefix _ để không gửi vào API translation contract
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 overflow-y-auto pr-2 flex-1 min-h-0 max-h-[80vh]">
      {/* Thông tin cơ bản */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Thông tin cơ bản
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <div className="grid gap-2">
            <Label>Số hợp đồng</Label>
            <Input
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              placeholder="Số HĐ"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Hợp phần</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={componentId}
              onChange={(e) => setComponentId(e.target.value)}
              disabled={readOnly}>
              <option value="">— Chọn hợp phần —</option>
              {componentsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <WorkPicker
            label="Tác phẩm"
            works={works}
            components={componentsList}
            value={workId || null}
            onChange={(id) => setWorkId(id ?? "")}
            disabled={readOnly}
            placeholder="Tìm theo tiêu đề, mã tài liệu, hợp phần, giai đoạn..."
            componentFilterId={componentId || null}
            className="self-start"
          />
          <div className="grid gap-2">
            <TranslatorPicker
              label="Dịch giả"
              value={translatorName}
              userId={translatorUserId}
              onChange={(name, id) => {
                setTranslatorName(name);
                setTranslatorUserId(id);
              }}
              disabled={readOnly}
              placeholder="Tìm theo tên hoặc email..."
              className="self-start"
            />
          </div>
        </div>
        {!readOnly && duplicateTranslationContract && (
          <Alert variant="destructive">
            <AlertTitle>Trùng hợp đồng dịch thuật</AlertTitle>
            <AlertDescription>
              Tác phẩm đã có hợp đồng với số HĐ này trong cùng hợp phần. Vui
              lòng kiểm tra lại số hợp đồng hoặc tác phẩm.
            </AlertDescription>
          </Alert>
        )}
        {!readOnly && contractDateError && (
          <Alert variant="destructive">
            <AlertTitle>Ngày hợp đồng không hợp lệ</AlertTitle>
            <AlertDescription>{contractDateError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Giá trị hợp đồng */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Giá trị hợp đồng
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          <div className="grid gap-2">
            <Label>Đơn giá (VNĐ/trang)</Label>
            <NumberInput
              value={unitPrice}
              onChange={setUnitPrice}
              decimals={2}
              showFormatted={true}
              placeholder="0"
              disabled={readOnly}
            />
            {unitPrice.trim() !== "" &&
              !Number.isNaN(parseFloat(unitPrice)) && (
                <p className="text-xs text-muted-foreground">
                  {numberToVietnameseWords(unitPrice)}
                </p>
              )}
          </div>
          <div className="grid gap-2">
            <Label>Kinh phí viết bài tổng quan (VNĐ)</Label>
            <NumberInput
              value={overviewValue}
              onChange={setOverviewValue}
              decimals={2}
              showFormatted={true}
              placeholder="0"
              disabled={readOnly}
            />
            {overviewValue.trim() !== "" &&
              !Number.isNaN(parseFloat(overviewValue)) && (
                <p className="text-xs text-muted-foreground">
                  {numberToVietnameseWords(overviewValue)}
                </p>
              )}
          </div>
          <div className="grid gap-2">
            <Label>
              Kinh phí dịch thuật (VNĐ){" "}
              <span className="text-muted-foreground font-normal text-xs">
                (đơn giá × số trang dự tính)
              </span>
            </Label>
            <NumberInput
              value={translationValue}
              onChange={setTranslationValue}
              decimals={2}
              showFormatted={true}
              placeholder="0"
              className="bg-muted"
              readOnly
              disabled={readOnly}
            />
            {translationValue.trim() !== "" &&
              !Number.isNaN(parseFloat(translationValue)) && (
                <p className="text-xs text-muted-foreground">
                  {numberToVietnameseWords(translationValue)}
                </p>
              )}
          </div>
          <div className="grid gap-2">
            <Label>
              Giá trị hợp đồng (VNĐ){" "}
              <span className="text-muted-foreground font-normal text-xs">
                (kinh phí dịch thuật + kinh phí tổng quan)
              </span>
            </Label>
            <NumberInput
              value={contractValue}
              onChange={setContractValue}
              decimals={2}
              showFormatted={true}
              placeholder="0"
              className="bg-muted"
              readOnly
              disabled={readOnly}
            />
            {contractValue.trim() !== "" &&
              !Number.isNaN(parseFloat(contractValue)) && (
                <p className="text-xs text-muted-foreground">
                  {numberToVietnameseWords(contractValue)}
                </p>
              )}
          </div>
        </div>
      </div>

      {/* Thời gian */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Thời gian</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <div className="grid gap-2">
            <Label>Ngày bắt đầu</Label>
            <DateInput
              value={startDate || null}
              onChange={(v) => setStartDate(v || "")}
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Ngày kết thúc</Label>
            <DateInput
              value={endDate || null}
              onChange={(v) => setEndDate(v || "")}
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Hoàn thành thực tế</Label>
            <DateInput
              value={actualCompletionDate || null}
              onChange={(v) => setActualCompletionDate(v || "")}
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Gia hạn từ</Label>
            <DateInput
              value={extensionStartDate || null}
              onChange={(v) => setExtensionStartDate(v || "")}
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Gia hạn đến</Label>
            <DateInput
              value={extensionEndDate || null}
              onChange={(v) => setExtensionEndDate(v || "")}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Thực tế và quyết toán */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Thực tế và quyết toán
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          <div className="grid gap-2">
            <Label>Số chữ thực tế</Label>
            <NumberInput
              value={actualWordCount}
              onChange={(v) => {
                setActualWordCount(v);
                const n = v ? parseInt(v, 10) : NaN;
                setActualPageCount(!isNaN(n) ? String(charsToPages(n)) : "");
              }}
              decimals={0}
              placeholder="0"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>
              Số trang thực tế{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (350 chữ/trang)
              </span>
            </Label>
            <NumberInput
              value={actualPageCount}
              onChange={setActualPageCount}
              decimals={0}
              placeholder="0"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Tỷ lệ hoàn thành (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={completionRate}
              onChange={(e) => setCompletionRate(e.target.value)}
              placeholder="0"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Giá trị quyết toán (VNĐ)</Label>
            <NumberInput
              value={settlementValue}
              onChange={setSettlementValue}
              decimals={2}
              showFormatted={true}
              placeholder="0"
              disabled={readOnly}
            />
            {settlementValue.trim() !== "" &&
              !Number.isNaN(parseFloat(settlementValue)) && (
                <p className="text-xs text-muted-foreground">
                  {numberToVietnameseWords(settlementValue)}
                </p>
              )}
          </div>
        </div>
      </div>

      {/* Tiến độ hợp đồng */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Tiến độ hợp đồng
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <div className="grid gap-2">
            <Label>Trạng thái</Label>
            <Select
              value={status}
              onValueChange={setStatus}
              disabled={readOnly || actualCompletionDate.trim() !== ""}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancel">Cancel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === "Cancel" && (
            <div className="grid gap-2">
              <Label>Ngày hủy hợp đồng</Label>
              <DateInput
                value={cancelledAt || null}
                onChange={(v) => setCancelledAt(v || "")}
                disabled={readOnly}
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <Label className="text-sm font-semibold">
              Theo dõi kiểm tra tiến độ
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!progressCheckDate}
                  onCheckedChange={(checked) => {
                    if (checked)
                      setProgressCheckDate((prev) => prev || today());
                    else setProgressCheckDate("");
                  }}
                  disabled={readOnly}
                />
                <span className="text-sm">Đã kiểm tra tiến độ</span>
              </div>
              <DateInput
                value={progressCheckDate || null}
                onChange={(v) => setProgressCheckDate(v || "")}
                disabled={readOnly || !progressCheckDate}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!expertReviewDate}
                  onCheckedChange={(checked) => {
                    if (checked) setExpertReviewDate((prev) => prev || today());
                    else setExpertReviewDate("");
                  }}
                  disabled={readOnly}
                />
                <span className="text-sm">Đã thẩm định cấp chuyên gia</span>
              </div>
              <DateInput
                value={expertReviewDate || null}
                onChange={(v) => setExpertReviewDate(v || "")}
                disabled={readOnly || !expertReviewDate}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!projectAcceptanceDate}
                  onCheckedChange={(checked) => {
                    if (checked)
                      setProjectAcceptanceDate((prev) => prev || today());
                    else setProjectAcceptanceDate("");
                  }}
                  disabled={readOnly}
                />
                <span className="text-sm">Đã nghiệm thu cấp Dự án</span>
              </div>
              <DateInput
                value={projectAcceptanceDate || null}
                onChange={(v) => setProjectAcceptanceDate(v || "")}
                disabled={readOnly || !projectAcceptanceDate}
              />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <Label className="text-sm font-semibold">
              Biên tập & Hiệu đính
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={proofreadingInProgress}
                  onCheckedChange={(checked) =>
                    setProofreadingInProgress(!!checked)
                  }
                  disabled={readOnly}
                />
                <span className="text-sm">Đang hiệu đính</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!autoProofreadingCompletedDate} disabled />
                <span className="text-sm">Hoàn thành hiệu đính</span>
              </div>
              <DateInput
                value={autoProofreadingCompletedDate || null}
                onChange={() => undefined}
                disabled
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editingInProgress}
                  onCheckedChange={(checked) => setEditingInProgress(!!checked)}
                  disabled={readOnly}
                />
                <span className="text-sm">Đang biên tập</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!autoEditingCompletedDate} disabled />
                <span className="text-sm">Hoàn thành biên tập</span>
              </div>
              <DateInput
                value={autoEditingCompletedDate || null}
                onChange={() => undefined}
                disabled
              />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <Label className="text-sm font-semibold">Xuất bản</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!printTransferDate}
                  onCheckedChange={(checked) => {
                    if (checked)
                      setPrintTransferDate((prev) => prev || today());
                    else setPrintTransferDate("");
                  }}
                  disabled={readOnly}
                />
                <span className="text-sm">Chuyển in</span>
              </div>
              <DateInput
                value={printTransferDate || null}
                onChange={(v) => setPrintTransferDate(v || "")}
                disabled={readOnly || !printTransferDate}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!publishedDate}
                  onCheckedChange={(checked) => {
                    if (checked) setPublishedDate((prev) => prev || today());
                    else setPublishedDate("");
                  }}
                  disabled={readOnly}
                />
                <span className="text-sm">Đã xuất bản</span>
              </div>
              <DateInput
                value={publishedDate || null}
                onChange={(v) => setPublishedDate(v || "")}
                disabled={readOnly || !publishedDate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ghi chú */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Ghi chú</h3>
        <div className="grid gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú"
            disabled={readOnly}
          />
        </div>
      </div>
      {contract && (
        <ContractStagesSection
          translationContractId={contract.id}
          queryClient={queryClient}
          readOnly={readOnly}
        />
      )}
      {!readOnly && (
        <DialogFooter>
          <Button
            type="submit"
            disabled={
              isPending || !!duplicateTranslationContract || !!contractDateError
            }>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {contract ? "Cập nhật" : "Thêm"}
          </Button>
        </DialogFooter>
      )}
    </form>
  );
}

function ProofreadingContractForm({
  contract,
  works,
  translationContracts,
  componentsList,
  queryClient,
  onSubmit,
  isPending,
  readOnly = false,
}: {
  contract: ProofreadingContract | null;
  works: Work[];
  translationContracts: TranslationContract[];
  componentsList: Component[];
  queryClient: ReturnType<typeof useQueryClient>;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
  readOnly?: boolean;
}) {
  const [contractNumber, setContractNumber] = useState(
    contract?.contractNumber ?? ""
  );
  const [componentId, setComponentId] = useState(contract?.componentId ?? "");
  const [workId, setWorkId] = useState(contract?.workId ?? "");
  const [translationContractId, setTranslationContractId] = useState(
    contract?.translationContractId ?? ""
  );
  const [proofreaderName, setProofreaderName] = useState("");
  const [proofreaderUserId, setProofreaderUserId] = useState<string | null>(
    null
  );

  const { data: users = [] } = useUsers();

  // Load proofreading contract members when editing
  const { data: contractMembers = [] } = useQuery({
    queryKey: ["proofreading-contract-members", contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];
      const res = await fetch(
        buildUrl(api.proofreadingContractMembers.listByContract.path, {
          contractId: contract.id,
        }),
        { credentials: "include" }
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!contract?.id,
  });

  // Set proofreader when contract members are loaded
  useEffect(() => {
    if (contractMembers.length > 0 && contractMembers[0]?.userId) {
      const member = contractMembers[0];
      setProofreaderUserId(member.userId);
      const user = users.find((u) => u.id === member.userId);
      if (user) {
        setProofreaderName(user.displayName);
      }
    }
  }, [contractMembers, users]);

  const [pageCount, setPageCount] = useState(
    contract?.pageCount != null ? String(contract.pageCount) : ""
  );
  const [rateRatio, setRateRatio] = useState(
    contract?.rateRatio != null ? String(Number(contract.rateRatio) * 100) : ""
  );
  const [contractValue, setContractValue] = useState(
    contract?.contractValue != null ? String(contract.contractValue) : ""
  );
  const [startDate, setStartDate] = useState(
    contract?.startDate ? (contract.startDate as string).slice(0, 10) : ""
  );
  const [endDate, setEndDate] = useState(
    contract?.endDate ? (contract.endDate as string).slice(0, 10) : ""
  );
  const [actualCompletionDate, setActualCompletionDate] = useState(
    contract?.actualCompletionDate
      ? (contract.actualCompletionDate as string).slice(0, 10)
      : ""
  );
  const [note, setNote] = useState(contract?.note ?? "");

  const selectedTranslationContract = useMemo(
    () =>
      translationContracts.find((c) => c.id === translationContractId) ?? null,
    [translationContracts, translationContractId]
  );
  const selectedWork = useMemo(
    () => works.find((w) => w.id === workId) ?? null,
    [works, workId]
  );

  useEffect(() => {
    if (!selectedTranslationContract) return;
    if (selectedTranslationContract.componentId) {
      setComponentId(selectedTranslationContract.componentId);
    }
    if (selectedTranslationContract.workId) {
      setWorkId(selectedTranslationContract.workId);
    }
    if (selectedTranslationContract.actualPageCount != null) {
      setPageCount(String(selectedTranslationContract.actualPageCount));
    } else {
      setPageCount("");
    }
  }, [selectedTranslationContract]);

  useEffect(() => {
    if (!selectedTranslationContract) return;
    const base = selectedTranslationContract.settlementValue;
    const settlement =
      base == null
        ? NaN
        : typeof base === "string"
        ? parseFloat(base)
        : Number(base);
    const ratio = rateRatio.trim() === "" ? NaN : parseFloat(rateRatio) / 100;
    if (Number.isNaN(settlement) || Number.isNaN(ratio)) {
      setContractValue("");
      return;
    }
    setContractValue((settlement * ratio).toFixed(2));
  }, [selectedTranslationContract, rateRatio]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    onSubmit({
      contractNumber: contractNumber || null,
      componentId: componentId || null,
      workId: workId || null,
      translationContractId: translationContractId || null,
      pageCount: pageCount ? parseInt(pageCount, 10) : null,
      rateRatio: rateRatio ? parseFloat(rateRatio) / 100 : null,
      contractValue: contractValue ? parseFloat(contractValue) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      actualCompletionDate: actualCompletionDate || null,
      note: note || null,
      _proofreaderUserId: proofreaderUserId, // Dùng prefix _ để không gửi vào API proofreading contract
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 overflow-y-auto pr-2 flex-1 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-4">
        <div className="grid gap-2">
          <Label>Số hợp đồng</Label>
          <Input
            value={contractNumber}
            onChange={(e) => setContractNumber(e.target.value)}
            placeholder="Số HĐ"
            disabled={readOnly}
          />
        </div>
        <div className="grid gap-2">
          <Label>Hợp phần</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={componentId}
            onChange={(e) => setComponentId(e.target.value)}
            disabled={readOnly}>
            <option value="">— Chọn hợp phần —</option>
            {componentsList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <TranslatorPicker
            label="Biên tập viên / Người hiệu đính"
            value={proofreaderName}
            userId={proofreaderUserId}
            onChange={(name, id) => {
              setProofreaderName(name);
              setProofreaderUserId(id);
            }}
            disabled={readOnly}
            placeholder="Tìm theo tên hoặc email..."
          />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>Số trang</Label>
          <NumberInput
            value={pageCount}
            onChange={setPageCount}
            decimals={0}
            placeholder="0"
            disabled={readOnly || !!selectedTranslationContract}
          />
          {selectedTranslationContract && (
            <p className="text-xs text-muted-foreground">
              Lấy từ số trang hoàn thành thực tế của HĐ dịch thuật.
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label>Tỷ lệ (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={rateRatio}
            onChange={(e) => setRateRatio(e.target.value)}
            placeholder="0"
            disabled={readOnly}
          />
        </div>
        <div className="grid gap-2">
          <Label>Giá trị hợp đồng (VNĐ)</Label>
          <NumberInput
            value={contractValue}
            onChange={setContractValue}
            decimals={2}
            showFormatted={true}
            placeholder="0"
            disabled={readOnly || !!selectedTranslationContract}
          />
          {contractValue.trim() !== "" &&
            !Number.isNaN(parseFloat(contractValue)) && (
              <p className="text-xs text-muted-foreground">
                {numberToVietnameseWords(contractValue)}
              </p>
            )}
          {selectedTranslationContract && (
            <p className="text-xs text-muted-foreground">
              Tự tính theo tỷ lệ (%) × giá trị quyết toán HĐ dịch thuật.
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Tác phẩm</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
            disabled={readOnly}>
            <option value="">— Chọn tác phẩm —</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.titleVi ?? w.documentCode ?? w.id.slice(0, 8)}
              </option>
            ))}
          </select>
          {selectedWork?.stage && (
            <p className="text-xs text-muted-foreground">
              Giai đoạn: {formatStageDisplay(selectedWork.stage)}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label>Hợp đồng dịch thuật (liên kết)</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={translationContractId}
            onChange={(e) => setTranslationContractId(e.target.value)}
            disabled={readOnly}>
            <option value="">— Chọn HĐ dịch thuật —</option>
            {translationContracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.contractNumber ?? c.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>Ngày bắt đầu</Label>
          <DateInput
            value={startDate || null}
            onChange={(v) => setStartDate(v || "")}
            disabled={readOnly}
          />
        </div>
        <div className="grid gap-2">
          <Label>Ngày kết thúc</Label>
          <DateInput
            value={endDate || null}
            onChange={(v) => setEndDate(v || "")}
            disabled={readOnly}
          />
        </div>
        <div className="grid gap-2">
          <Label>Hoàn thành thực tế</Label>
          <DateInput
            value={actualCompletionDate || null}
            onChange={(v) => setActualCompletionDate(v || "")}
            disabled={readOnly}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-4">
        <div className="grid gap-2 sm:col-span-2">
          <Label>Ghi chú</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú"
            disabled={readOnly}
          />
        </div>
      </div>
      {contract && (
        <ContractStagesSection
          proofreadingContractId={contract.id}
          queryClient={queryClient}
          readOnly={readOnly}
        />
      )}
      {!readOnly && (
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {contract ? "Cập nhật" : "Thêm"}
          </Button>
        </DialogFooter>
      )}
    </form>
  );
}
