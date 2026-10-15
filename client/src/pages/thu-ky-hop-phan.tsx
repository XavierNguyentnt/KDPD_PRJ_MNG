import { useCallback, useMemo, useState, useEffect, Fragment, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
} from "@tanstack/react-query";
import {
  useTasks,
  useCreateTask,
  useDeleteTask,
  useRefreshTasks,
  UserRole,
} from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { useTaskListControls } from "@/hooks/use-task-list-controls";
import { useThuKyTasksTab } from "@/hooks/use-thu-ky-tasks-tab";
import { useThuKyWorksTab } from "@/hooks/use-thu-ky-works-tab";
import { useThuKyContractsTab } from "@/hooks/use-thu-ky-contracts-tab";
import {
  useUsers,
  useTaskFilterStaffUsers,
} from "@/hooks/use-works-and-components";
import { TranslatorPicker } from "@/components/translator-picker";
import { GroupPageHero } from "@/components/group-page-hero";
import { TaskTable } from "@/components/task-table";
import { TaskKanbanBoard } from "@/components/task-kanban-board";
import {
  getTaskStatsBadgeKeyFromFilters,
  TaskStatsBadgesOnly,
  toggleTaskStatsBadgeInFilters,
} from "@/components/task-stats";
import { TaskDialog } from "@/components/task-dialog";
import { TaskFilters } from "@/components/task-filters";
import { api, buildUrl } from "@shared/routes";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import type {
  Work,
  TranslationContract,
  ProofreadingContract,
  Component,
  ContractStage,
  Payment,
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
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
  Rows3,
  Table2,
  MoreHorizontal,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart3,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { TaskTableSkeleton, CardGridSkeleton, FullPageSkeleton } from "@/components/ui/skeletons";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WorksImport } from "@/components/works-import";
import { Pipeline8Stepper, getPipelineStepperPropsForWork } from "@/components/pipeline-8-stepper";
const Pipeline8StepperLazy = Pipeline8Stepper;
import { DateInput } from "@/components/ui/date-input";
import { NumberInput } from "@/components/ui/number-input";
import { WorkPicker } from "@/components/work-picker";
import { TranslationContractPicker } from "@/components/translation-contract-picker";
import {
  formatDateDDMMYYYY,
  formatNumberAccounting,
  formatPercent,
  numberToVietnameseWords,
  normalizeSearch,
  buildExportPrefix,
  buildExportPeriodSuffix,
  getTaskStatusColor,
  getTaskPriorityColor,
  loadXLSX,
} from "@/lib/utils";

import {
  PAGE_SIZE,
  CHARS_PER_PAGE,
  ROLE_THU_KY_NAME,
  ROLE_THU_KY_CODE,
  type WorkSortColumn,
  type TranslationContractSortColumn,
  type ProofreadingContractSortColumn,
  type WorksProgressFilter,
  type ContractPill,
  contractPillClass,
  charsToPages,
  formatStageDisplay,
  parseDateOnly,
  getTcDueDate,
  getPcDueDate,
  daysUntil,
  formatDurationMonths,
  buildTranslationContractPills,
  parseStageNumber,
  generatePaginationItems,
  SortableHead,
  sortWorks,
  sortTranslationContracts,
  sortProofreadingContracts,
  fetchWorks,
  fetchTranslationContracts,
  fetchProofreadingContracts,
  fetchComponents,
  fetchFinanceSummary,
  fetchFinanceSummaryPc,
  fetchContractPayments,
  fetchPaymentsByTcId,
  fetchPaymentsByPcId,
  ContractStagesSection,
  PaymentsSection,
  WorkForm,
  TranslationContractForm,
  ProofreadingContractForm,
} from "@/components/thu-ky-hop-phan";

export default function ThuKyHopPhanPage() {
  const [location, setLocation] = useLocation();
  const { role, user, loading: authLoading } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const thuKyRole = useMemo(
    () =>
      user?.roles?.find(
        (r) => r.name === ROLE_THU_KY_NAME || r.code === ROLE_THU_KY_CODE,
      ),
    [user?.roles],
  );
  const allowedComponentIds = useMemo(
    () =>
      thuKyRole && user?.roleAssignments
        ? user.roleAssignments
            .filter((a) => a.roleId === thuKyRole.id && a.componentId)
            .map((a) => a.componentId as string)
        : [],
    [thuKyRole, user?.roleAssignments],
  );
  // Admin, Quản lý có thể xem tất cả trang quản lý công việc (kể cả Thư ký hợp phần).
  const canAccessPage =
    !!thuKyRole || role === UserRole.ADMIN || role === UserRole.MANAGER;
  const canCreateComponent = canAccessPage;

  const [componentCreateOpen, setComponentCreateOpen] = useState(false);
  const [componentName, setComponentName] = useState("");
  const [componentCode, setComponentCode] = useState("");
  const [componentDescription, setComponentDescription] = useState("");
  const [componentDisplayOrder, setComponentDisplayOrder] =
    useState<string>("0");
  const [componentCodeEdited, setComponentCodeEdited] = useState(false);

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
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();
  const { data: users = [] } = useUsers();
  const { data: taskFilterUsers = [] } = useTaskFilterStaffUsers();
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
        ],
      ),
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
    const membersByContractId = new Map<string, string[]>();
    translationContractMembers.forEach(
      (m: { translationContractId: string; userId: string }) => {
        const list = membersByContractId.get(m.translationContractId) ?? [];
        if (!list.includes(m.userId)) list.push(m.userId);
        membersByContractId.set(m.translationContractId, list);
      },
    );
    return (contractId: string | null | undefined): string => {
      if (!contractId) return "—";
      const userIds = membersByContractId.get(contractId) ?? [];
      if (userIds.length === 0) return "—";
      const names = userIds
        .map((id) => users.find((u) => u.id === id)?.displayName ?? id)
        .filter(Boolean);
      return names.length ? names.join(", ") : "—";
    };
  }, [translationContractMembers, users]);
  const { data: componentsList = [] } = useQuery({
    queryKey: ["components"],
    queryFn: fetchComponents,
  });

  useEffect(() => {
    if (!componentCreateOpen) return;
    const max = componentsList.reduce(
      (m, c) => Math.max(m, c.displayOrder ?? 0),
      0,
    );
    setComponentDisplayOrder(String(max + 1));
  }, [componentCreateOpen, componentsList]);

  useEffect(() => {
    if (!componentCreateOpen) return;
    if (componentCodeEdited) return;
    const next = normalizeSearch(componentName)
      .replace(/[^a-z0-9\s_]/g, " ")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_");
    setComponentCode(next);
  }, [componentCreateOpen, componentName, componentCodeEdited]);

  const createComponentMutation = useMutation({
    mutationFn: async (payload: {
      code: string;
      name: string;
      description?: string | null;
      displayOrder?: number;
    }) => {
      const res = await fetch(api.components.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Không thể tạo hợp phần");
      }
      return res.json() as Promise<Component>;
    },
    onSuccess: async () => {
      toast({
        title: "Thành công",
        description: "Đã tạo hợp phần.",
      });
      setComponentCreateOpen(false);
      setComponentName("");
      setComponentCode("");
      setComponentDescription("");
      setComponentCodeEdited(false);
      await queryClient.invalidateQueries({ queryKey: ["components"] });
    },
    onError: (e: any) => {
      toast({
        title: "Lỗi",
        description: e?.message || "Không thể tạo hợp phần",
        variant: "destructive",
      });
    },
  });

  // Chỉ Thư ký hợp phần: lọc works/tc/pc theo hợp phần được gán.
  const worksScoped = useMemo(
    () =>
      allowedComponentIds.length > 0
        ? works.filter(
            (w) => w.componentId && allowedComponentIds.includes(w.componentId),
          )
        : works,
    [works, allowedComponentIds],
  );
  const tcScoped = useMemo(
    () =>
      allowedComponentIds.length > 0
        ? translationContracts.filter(
            (c) => c.componentId && allowedComponentIds.includes(c.componentId),
          )
        : translationContracts,
    [translationContracts, allowedComponentIds],
  );
  const pcScoped = useMemo(
    () =>
      allowedComponentIds.length > 0
        ? proofreadingContracts.filter(
            (c) => c.componentId && allowedComponentIds.includes(c.componentId),
          )
        : proofreadingContracts,
    [proofreadingContracts, allowedComponentIds],
  );

  const componentNameById = useMemo(
    () => new Map(componentsList.map((c) => [c.id, c.name])),
    [componentsList],
  );
  const getComponentName = (id: string | null) =>
    id ? (componentNameById.get(id) ?? "—") : "—";
  const workTitleById = useMemo(
    () =>
      new Map(
        worksScoped.map((w) => [
          w.id,
          w.titleVi ?? w.documentCode ?? w.titleHannom ?? w.id.slice(0, 8),
        ]),
      ),
    [worksScoped],
  );
  const getWorkTitle = (id: string | null) =>
    id ? (workTitleById.get(id) ?? "—") : "—";

  const tcById = useMemo(
    () => new Map(tcScoped.map((c) => [c.id, c])),
    [tcScoped],
  );
  const pcById = useMemo(
    () => new Map(pcScoped.map((c) => [c.id, c])),
    [pcScoped],
  );

  const contractsHook = useThuKyContractsTab({
    tcScoped,
    pcScoped,
    worksScoped,
    proofreadingContracts,
    componentsList,
    getComponentName,
    getWorkTitle,
    getTranslatorName,
    getProofreaderName,
    PAGE_SIZE,
    fetchFinanceSummary,
    fetchFinanceSummaryPc,
    fetchContractPayments,
    fetchPaymentsByPcId,
  });
  const {
    tcViewMode,
    setTcViewMode,
    pcViewMode,
    setPcViewMode,
    tcPage,
    setTcPage,
    pcPage,
    setPcPage,
    tcQuickFilter,
    setTcQuickFilter,
    pcQuickFilter,
    setPcQuickFilter,
    tcSearch,
    setTcSearch,
    tcTranslatorSearch,
    setTcTranslatorSearch,
    tcComponentFilter,
    setTcComponentFilter,
    tcStageFilter,
    setTcStageFilter,
    tcSortColumns,
    setTcSortColumns,
    pcSearch,
    setPcSearch,
    pcProofreaderSearch,
    setPcProofreaderSearch,
    pcComponentFilter,
    setPcComponentFilter,
    pcStageFilter,
    setPcStageFilter,
    pcSortColumns,
    setPcSortColumns,
    tcColumnVis,
    setTcColumnVis,
    filteredTc,
    tcStats,
    tcDisplayList,
    proofreadingCompletionByTcId,
    paginatedTc,
    totalTcPages,
    outstandingById,
    paymentInfoById,
    filteredPc,
    pcStats,
    pcDisplayList,
    paginatedPc,
    totalPcPages,
    pcOutstandingById,
    pcPaymentInfoById,
    handleTcSort,
    handlePcSort,
  } = contractsHook;

  const worksHook = useThuKyWorksTab({
    worksScoped,
    componentsList,
    tcScoped,
    pcScoped,
    tasks,
    proofreadingContracts,
    getComponentName,
    getTranslatorName,
    tcColumnVis,
    PAGE_SIZE,
    formatStageDisplay,
    fetchFinanceSummary,
  });
  const {
    state: worksState,
    derived: worksDerived,
    handlers: worksHandlers,
  } = worksHook;
  const {
    worksPage,
    setWorksPage,
    worksViewMode,
    setWorksViewMode,
    worksSearch,
    setWorksSearch,
    worksComponentFilter,
    setWorksComponentFilter,
    worksStageFilter,
    setWorksStageFilter,
    worksProgressFilter,
    setWorksProgressFilter,
    worksSortColumns,
    setWorksSortColumns,
    selectedWorkIds,
    setSelectedWorkIds,
    bulkDeleteWorksOpen,
    setBulkDeleteWorksOpen,
  } = worksState;
  const {
    worksStages,
    workById,
    proofreadingCompletionByWorkId,
    editingCompletionByWorkId,
    tcByWorkId,
    pcByWorkId,
    bienTapTasksByWorkId,
    thietKeTasksByWorkId,
    filteredWorks,
    paginatedWorks,
    totalWorksPages,
    paginatedWorkIds,
    selectedWorkSet,
    allSelectedOnPage,
    someSelectedOnPage,
    workTcIdsForOutstanding,
    outstandingByTcIdForWorks,
    getWorkContractNumbers,
    getWorkTranslators,
    sumTcMoneyForWork,
    getOutstandingForWork,
    worksTableColSpan,
    workPipelineCtx,
  } = worksDerived;
  const { handleWorksSort } = worksHandlers;

  const [mobileWorksFilterOpen, setMobileWorksFilterOpen] = useState(false);

  const activeWorksFilterCount = useMemo(() => {
    let count = 0;
    if (worksComponentFilter !== "all") count++;
    if (worksStageFilter !== "all") count++;
    if (worksProgressFilter !== "all") count++;
    return count;
  }, [worksComponentFilter, worksStageFilter, worksProgressFilter]);

  const handleResetWorksFilters = useCallback(() => {
    setWorksComponentFilter("all");
    setWorksStageFilter("all");
    setWorksProgressFilter("all");
  }, [setWorksComponentFilter, setWorksStageFilter, setWorksProgressFilter]);

  const tasksHook = useThuKyTasksTab({
    tasks,
    worksScoped,
    allowedComponentIds,
    role,
    userId: user?.id,
    userDisplayName: user?.displayName,
    tcScoped,
    pcScoped,
    componentsList,
    PAGE_SIZE,
  });
  const {
    tasksPage,
    setTasksPage,
    isExportingTasks,
    setIsExportingTasks,
    tasksScoped,
    taskStages,
    taskComponentOptions,
    tasksSearch,
    setTasksSearch,
    taskFilters,
    setTaskFilters,
    taskSortBy,
    taskSortDir,
    handleTaskSort,
    taskViewMode,
    setTaskViewMode,
    filteredTasks,
    tasksForStats,
    taskYearOptions,
    taskPeriodOptions,
    activeStatsKey,
    paginatedTasks,
    totalTasksPages,
  } = tasksHook;


  type ProgressBadge = {
    label: string;
    tone: "muted" | "info" | "success" | "warning" | "danger";
    tooltip?: string;
  };

  const progressBadgeClass: Record<ProgressBadge["tone"], string> = {
    muted: "bg-slate-100 text-slate-700 border-slate-300",
    info: "bg-blue-100 text-blue-700 border-blue-300",
    success: "bg-green-100 text-green-700 border-green-300",
    warning: "bg-amber-100 text-amber-700 border-amber-300",
    danger: "bg-red-100 text-red-700 border-red-300",
  };

  const getEditingInfo = (
    workId: string,
  ): {
    inProgress: boolean;
    roundType?: string;
    dueDate?: string;
    completedDate?: string;
  } => {
    const completedDate = editingCompletionByWorkId.get(workId);
    if (completedDate) return { inProgress: false, completedDate };
    const list = bienTapTasksByWorkId.get(workId) ?? [];
    if (list.length === 0) return { inProgress: false };
    const ongoing = list.find((t) => t.status !== "Completed") ?? list[0];
    let roundType = "";
    try {
      const wf = (
        ongoing.workflow && typeof ongoing.workflow === "string"
          ? JSON.parse(ongoing.workflow)
          : ongoing.workflow
      ) as {
        rounds?: Array<{ roundType?: string | null }>;
      } | null;
      roundType = (wf?.rounds?.[0]?.roundType ?? "").toString();
    } catch {
      roundType = "";
    }
    const dueDate = (ongoing.dueDate as string | null) ?? undefined;
    return { inProgress: true, roundType, dueDate };
  };

  const buildWorkProgressBadges = (work: Work): ProgressBadge[] => {
    const badges: ProgressBadge[] = [];
    const tcList = tcByWorkId.get(work.id) ?? [];
    const pcList = pcByWorkId.get(work.id) ?? [];

    if (tcList.length > 0) {
      const anyStart = tcList.find((c) => !!(c.startDate || c.contractNumber));
      badges.push({
        label: "Ký hợp đồng",
        tone: "success",
        tooltip: anyStart?.startDate
          ? `Ngày bắt đầu: ${formatDateDDMMYYYY(anyStart.startDate)}`
          : undefined,
      });
      if (tcList.some((c) => !!c.progressCheckDate)) {
        const d = tcList.find((c) => !!c.progressCheckDate)?.progressCheckDate;
        badges.push({
          label: "Kiểm tra tiến độ",
          tone: "info",
          tooltip: d ? `Ngày: ${formatDateDDMMYYYY(d)}` : undefined,
        });
      }
      if (tcList.some((c) => !!c.expertReviewDate)) {
        const d = tcList.find((c) => !!c.expertReviewDate)?.expertReviewDate;
        badges.push({
          label: "Thẩm định cấp chuyên gia",
          tone: "info",
          tooltip: d ? `Ngày: ${formatDateDDMMYYYY(d)}` : undefined,
        });
      }
      if (tcList.some((c) => !!c.projectAcceptanceDate)) {
        const d = tcList.find(
          (c) => !!c.projectAcceptanceDate,
        )?.projectAcceptanceDate;
        badges.push({
          label: "Nghiệm thu cấp Dự án",
          tone: "success",
          tooltip: d ? `Ngày: ${formatDateDDMMYYYY(d)}` : undefined,
        });
      }
      if (tcList.some((c) => c.settlementValue != null)) {
        badges.push({
          label: "Quyết toán",
          tone: "success",
        });
      }
    }

    if (pcList.length > 0) {
      const total = pcList.length;
      const completed = pcList.filter((p) => !!p.actualCompletionDate).length;
      // Lấy ngày hoàn thành gần nhất trong các HĐ hiệu đính của tác phẩm (nếu có)
      let latestPcCompleted: string | null = null;
      pcList.forEach((p) => {
        if (!p.actualCompletionDate) return;
        const d =
          typeof p.actualCompletionDate === "string"
            ? p.actualCompletionDate.slice(0, 10)
            : new Date(p.actualCompletionDate as any)
                .toISOString()
                .slice(0, 10);
        if (!latestPcCompleted || d > latestPcCompleted) latestPcCompleted = d;
      });
      badges.push({
        label: "Hiệu đính",
        tone: completed === total && total > 0 ? "success" : "info",
        tooltip:
          completed > 0
            ? `Hoàn thành ${completed}/${total} | Ngày hoàn thành gần nhất: ${formatDateDDMMYYYY(latestPcCompleted)}`
            : `Hoàn thành ${completed}/${total}`,
      });
    }

    const editing = getEditingInfo(work.id);
    if (editing.completedDate) {
      badges.push({
        label: "Biên tập",
        tone: "success",
        tooltip: `Hoàn thành Bông chuyển in: ${formatDateDDMMYYYY(editing.completedDate)}`,
      });
    } else if (editing.inProgress) {
      const tipParts: string[] = [];
      if (editing.roundType) tipParts.push(`Loại bông: ${editing.roundType}`);
      if (editing.dueDate)
        tipParts.push(`Hạn: ${formatDateDDMMYYYY(editing.dueDate)}`);
      badges.push({
        label: "Đang biên tập",
        tone: "info",
        tooltip: tipParts.join(" | ") || undefined,
      });
    }

    const tkList = thietKeTasksByWorkId.get(work.id) ?? [];
    if (tkList.length > 0) {
      const allCompleted =
        tkList.length > 0 && tkList.every((t) => t.status === "Completed");
      // Nếu hoàn thành, hiển thị ngày hoàn thành gần nhất trong các task thiết kế
      let latestTkCompleted: string | null = null;
      if (allCompleted) {
        tkList.forEach((t) => {
          const v = t.actualCompletedAt;
          if (!v) return;
          let d: string | null = null;
          if (v instanceof Date) {
            d = v.toISOString().slice(0, 10);
          } else {
            const dt = new Date(v as any);
            if (!Number.isNaN(dt.getTime())) d = dt.toISOString().slice(0, 10);
          }
          if (!d) return;
          if (!latestTkCompleted || d > latestTkCompleted)
            latestTkCompleted = d;
        });
      }
      badges.push({
        label: "Thiết kế",
        tone: allCompleted ? "success" : "info",
        tooltip:
          allCompleted && latestTkCompleted
            ? `Ngày hoàn thành: ${formatDateDDMMYYYY(latestTkCompleted)}`
            : undefined,
      });
    }

    return badges;
  };

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

  const handleCreateNewTask = useCallback(
    () => setIsCreateTaskOpen(true),
    [],
  );
  const handleResetTaskFilters = useCallback(() => {
    setTasksSearch("");
    setTaskFilters({ status: "all", vote: "all" } as any);
  }, [setTasksSearch, setTaskFilters]);

  const getTaskStatusLabel = (status: string | null | undefined) => {
    if (!status) return "";
    if (status === "Not Started") return t.status.notStarted;
    if (status === "In Progress") return t.status.inProgress;
    if (status === "Completed") return t.status.completed;
    if (status === "Pending") return t.status.pending;
    if (status === "Cancelled") return t.status.cancelled;
    return status;
  };

  const getPriorityLabel = (priority: string | null | undefined) => {
    if (!priority) return "";
    if (priority === "Low") return t.priority.low;
    if (priority === "Medium") return t.priority.medium;
    if (priority === "High") return t.priority.high;
    if (priority === "Critical") return t.priority.critical;
    return priority;
  };

  const getVoteLabel = (vote: string | null | undefined): string => {
    if (!vote) return "—";
    const v = vote.toLowerCase();
    if (language === "vi") {
      if (v === "tot") return "Hoàn thành tốt";
      if (v === "kha") return "Hoàn thành khá";
      if (v === "khong_tot") return "Không tốt";
      if (v === "khong_hoan_thanh") return "Không hoàn thành";
    } else {
      if (v === "tot") return "Good";
      if (v === "kha") return "Fair";
      if (v === "khong_tot") return "Poor";
      if (v === "khong_hoan_thanh") return "Not completed";
    }
    return vote;
  };

  const getAssignmentStatusLabel = (status: string | null | undefined) => {
    const s = (status ?? "not_started").toLowerCase();
    if (language === "vi") {
      if (s === "completed") return "Hoàn thành";
      if (s === "in_progress") return "Đang thực hiện";
      return "Chưa bắt đầu";
    }
    if (s === "completed") return "Completed";
    if (s === "in_progress") return "In progress";
    return "Not started";
  };

  const getAssignmentLabel = (stageType: string) => {
    if (stageType === "kiem_soat")
      return language === "vi" ? "Người kiểm soát" : "Controller";
    if (stageType.startsWith("nhan_su_"))
      return (
        (language === "vi" ? "Nhân sự " : "Staff ") +
        stageType.replace("nhan_su_", "")
      );
    if (stageType === "primary")
      return language === "vi" ? "Người thực hiện" : "Assignee";
    if (stageType === "ktv_chinh")
      return language === "vi" ? "KTV chính" : "Lead";
    if (stageType.startsWith("tro_ly_"))
      return (
        (language === "vi" ? "Trợ lý " : "Assistant ") +
        stageType.replace("tro_ly_", "")
      );
    return stageType;
  };

  const sortAssignments = (
    assignments: NonNullable<TaskWithAssignmentDetails["assignments"]>,
  ) => {
    const orderFor = (stageType: string) => {
      if (stageType === "kiem_soat") return 1000;
      if (stageType.startsWith("nhan_su_")) {
        const n = parseInt(stageType.replace("nhan_su_", ""), 10);
        return Number.isFinite(n) ? n : 200;
      }
      if (stageType.startsWith("tro_ly_")) {
        const n = parseInt(stageType.replace("tro_ly_", ""), 10);
        return Number.isFinite(n) ? 300 + n : 400;
      }
      return 900;
    };
    return assignments.slice().sort((a, b) => {
      const aOrder = orderFor(a.stageType);
      const bOrder = orderFor(b.stageType);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a.stageType).localeCompare(String(b.stageType));
    });
  };

  const getSupervisorName = (task: TaskWithAssignmentDetails) => {
    const supervisor = (task.assignments ?? []).find(
      (a) => a.stageType === "kiem_soat",
    );
    return supervisor?.displayName ?? supervisor?.userId ?? "";
  };

  const buildStaffAssignmentDetails = (task: TaskWithAssignmentDetails) => {
    const assignments = sortAssignments(task.assignments ?? []).filter(
      (a) => a.stageType !== "kiem_soat",
    );
    if (assignments.length === 0) return "";
    return assignments
      .map((assignment) => {
        let label = getAssignmentLabel(assignment.stageType);
        if (assignment.stageType.startsWith("nhan_su_")) {
          const n = assignment.stageType.replace("nhan_su_", "");
          label = `Nhân sự ${n || ""}`.trim();
        }
        const name = assignment.displayName ?? assignment.userId ?? "";
        const parts: string[] = [];
        const prefix = label ? `${label}${name ? `: ${name}` : ""}` : name;
        if (prefix) parts.push(prefix);

        const received = formatDateDDMMYYYY(assignment.receivedAt);
        if (received) parts.push(`Ngày nhận: ${received}`);
        const due = formatDateDDMMYYYY(assignment.dueDate);
        if (due) parts.push(`Ngày hoàn thành dự kiến: ${due}`);
        const completed = formatDateDDMMYYYY(assignment.completedAt);
        if (completed) parts.push(`Ngày hoàn thành thực tế: ${completed}`);
        if (typeof assignment.progress === "number") {
          parts.push(`Tiến độ: ${assignment.progress}%`);
        }
        return `- ${parts.join(" | ")}`;
      })
      .join("\r\n");
  };

  const getWorkForTask = (task: TaskWithAssignmentDetails) => {
    let workId = task.relatedWorkId ?? null;
    if (!workId && task.relatedContractId) {
      const tc = tcById.get(task.relatedContractId);
      if (tc?.workId) workId = tc.workId;
      const pc = !workId ? pcById.get(task.relatedContractId) : null;
      if (pc?.workId) workId = pc.workId;
    }
    return workId ? workById.get(workId) : undefined;
  };

  const handleExportTasks = async () => {
    if (filteredTasks.length === 0) {
      toast({
        title: language === "vi" ? "Không có dữ liệu" : "No data",
        description:
          language === "vi"
            ? "Không có công việc để xuất Excel."
            : "No tasks to export.",
      });
      return;
    }

    setIsExportingTasks(true);
    try {
      const XLSX = await loadXLSX();
      const headers = [
        "ID",
        "Tiêu đề",
        "Nhóm",
        "Trạng thái",
        "Mức độ ưu tiên",
        "Tiến độ (%)",
        "Mô tả",
        "Đánh giá",
        "Tác phẩm",
        "Mã tài liệu",
        "Tiêu đề Hán Nôm",
        "Hợp phần",
        "Giai đoạn",
        "Nhân sự",
        "Ngày nhận công việc",
        "Hạn hoàn thành",
        "Ngày hoàn thành thực tế",
        "Ghi chú",
        "Ngày tạo",
        "Ngày cập nhật",
      ];
      const sheetData: any[][] = [headers];
      const rowBlocks: Array<{ startRow: number; height: number }> = [];

      filteredTasks.forEach((task) => {
        const work = getWorkForTask(task);
        const workTitle =
          work?.titleVi ?? work?.documentCode ?? work?.titleHannom ?? "—";
        const componentName = work?.componentId
          ? getComponentName(work.componentId)
          : "—";
        const stageDisplay = work?.stage ? formatStageDisplay(work.stage) : "—";
        const assignments = sortAssignments(task.assignments ?? []).filter(
          (a) => a.stageType !== "kiem_soat",
        );
        const persons =
          assignments.length > 0
            ? assignments.map((a) => ({
                label: getAssignmentLabel(a.stageType),
                name: a.displayName ?? a.userId ?? "",
                received: formatDateDDMMYYYY(a.receivedAt),
                due: formatDateDDMMYYYY(a.dueDate),
                completed: formatDateDDMMYYYY(a.completedAt),
              }))
            : [
                {
                  label: "",
                  name: "",
                  received: "",
                  due: "",
                  completed: "",
                },
              ];

        const noteValue =
          (task as TaskWithAssignmentDetails & { note?: string | null }).note ??
          task.notes ??
          "";

        const startRow = sheetData.length + 1;
        rowBlocks.push({ startRow, height: persons.length });

        persons.forEach((p) => {
          sheetData.push([
            task.id,
            task.title ?? "",
            task.group ?? "",
            getTaskStatusLabel(task.status),
            getPriorityLabel(task.priority),
            typeof task.progress === "number" ? task.progress : "",
            "", // Mô tả hiện không có trường riêng
            getVoteLabel(task.vote),
            workTitle,
            work?.documentCode ?? "",
            work?.titleHannom ?? "",
            componentName,
            stageDisplay,
            (p.label ? `${p.label}: ` : "") + (p.name || ""),
            p.received,
            p.due,
            p.completed,
            noteValue ?? "",
            formatDateDDMMYYYY(task.createdAt),
            formatDateDDMMYYYY(task.updatedAt),
          ]);
        });
      });

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
      const mergeColsShared = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 18, 19,
      ];
      rowBlocks.forEach((blk) => {
        if (blk.height <= 1) return;
        const startR0 = blk.startRow - 1;
        const endR0 = startR0 + blk.height - 1;
        mergeColsShared.forEach((c) => {
          worksheet["!merges"] = worksheet["!merges"] || [];
          worksheet["!merges"].push({
            s: { r: startR0, c },
            e: { r: endR0, c },
          });
        });
      });
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C });
        const cell = worksheet[addr];
        if (cell) {
          cell.s = {
            font: { bold: true },
            alignment: {
              horizontal: "center",
              vertical: "center",
              wrapText: true,
            },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            },
          };
        }
      }
      const dateCols = [14, 15, 16, 18, 19];
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
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            },
          };
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Cong_viec");

      const prefix = buildExportPrefix();
      const periodSuffix = buildExportPeriodSuffix(taskFilters.periodType, taskFilters.periodValue);
      const fileName = `${prefix}_thu-ky-hop-phan-cong-viec${periodSuffix}.xlsx`;
      XLSX.writeFile(workbook, fileName, { bookType: "xlsx" });

      toast({
        title: language === "vi" ? "Xuất Excel thành công" : "Exported",
        description:
          language === "vi"
            ? `Đã xuất ${filteredTasks.length} công việc.`
            : `Exported ${filteredTasks.length} tasks.`,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : language === "vi"
            ? "Xuất Excel thất bại."
            : "Failed to export.";
      toast({
        title: language === "vi" ? "Lỗi" : "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsExportingTasks(false);
    }
  };

  useEffect(() => {
    function onCmdExportExcel() {
      void handleExportTasks();
    }
    window.addEventListener("cmd:export:excel", onCmdExportExcel);
    return () => window.removeEventListener("cmd:export:excel", onCmdExportExcel);
  }, [handleExportTasks]);

  const handleExportWorks = async (
    filteredWorks: Work[],
    toast: (opts: any) => any,
  ) => {
    if (filteredWorks.length === 0) {
      toast({
        title: "Không có dữ liệu",
        description: "Không có tác phẩm để xuất Excel.",
      });
      return;
    }

    try {
      const XLSX = await loadXLSX();
      const includeOutstanding = !!tcColumnVis.outstanding;
      const tcIdsForOutstanding = includeOutstanding
        ? Array.from(
            new Set(
              filteredWorks
                .flatMap((w) => (tcByWorkId.get(w.id) ?? []).map((c) => c.id))
                .filter(Boolean),
            ),
          )
        : [];

      const outstandingByTcId = new Map<string, number>();
      if (includeOutstanding && tcIdsForOutstanding.length > 0) {
        const summaries = await Promise.all(
          tcIdsForOutstanding.map((id) =>
            fetchFinanceSummary(id)
              .then((s) => ({
                id,
                outstanding: Math.max(s.outstanding ?? 0, 0),
              }))
              .catch(() => ({ id, outstanding: NaN })),
          ),
        );
        summaries.forEach((s) => {
          if (!s.id) return;
          if (!Number.isNaN(s.outstanding))
            outstandingByTcId.set(s.id, s.outstanding);
        });
      }

      const columns: Array<{ header: string; get: (w: Work) => string }> = [
        { header: "ID", get: (w) => w.id },
        { header: "Tiêu đề (VI)", get: (w) => w.titleVi ?? "—" },
        { header: "Tiêu đề Hán Nôm", get: (w) => w.titleHannom ?? "—" },
        {
          header: "Hợp phần",
          get: (w) => getComponentName(w.componentId),
        },
        { header: "Giai đoạn", get: (w) => formatStageDisplay(w.stage) },
      ];

      if (tcColumnVis.contractNumber) {
        columns.push({
          header: "Số hợp đồng",
          get: (w) => getWorkContractNumbers(w.id),
        });
      }
      if (tcColumnVis.translators) {
        columns.push({
          header: "Dịch giả",
          get: (w) => getWorkTranslators(w.id),
        });
      }

      columns.push({
        header: "Tiến độ",
        get: (w) => {
          const badges = buildWorkProgressBadges(w);
          const latest = badges.length ? badges[badges.length - 1] : null;
          return latest?.label ?? "—";
        },
      });

      columns.push(
        { header: "Mã tài liệu", get: (w) => w.documentCode ?? "—" },
        {
          header: "Số chữ gốc",
          get: (w) => formatNumberAccounting(w.baseWordCount),
        },
        {
          header: "Số trang gốc",
          get: (w) => formatNumberAccounting(w.basePageCount),
        },
        {
          header: "Hệ số ước tính",
          get: (w) =>
            w.estimateFactor != null
              ? formatNumberAccounting(w.estimateFactor, 1)
              : "—",
        },
        {
          header: "Số chữ ước tính",
          get: (w) => formatNumberAccounting(w.estimateWordCount),
        },
        {
          header: "Số trang ước tính",
          get: (w) => formatNumberAccounting(w.estimatePageCount),
        },
      );

      if (tcColumnVis.overviewValue) {
        columns.push({
          header: "Kinh phí tổng quan",
          get: (w) =>
            formatNumberAccounting(sumTcMoneyForWork(w.id, "overviewValue")),
        });
      }
      if (tcColumnVis.translationValue) {
        columns.push({
          header: "Kinh phí dịch thuật",
          get: (w) =>
            formatNumberAccounting(sumTcMoneyForWork(w.id, "translationValue")),
        });
      }
      if (tcColumnVis.contractValue) {
        columns.push({
          header: "Giá trị HĐ",
          get: (w) =>
            formatNumberAccounting(sumTcMoneyForWork(w.id, "contractValue")),
        });
      }
      if (tcColumnVis.settlementValue) {
        columns.push({
          header: "Giá trị quyết toán",
          get: (w) =>
            formatNumberAccounting(sumTcMoneyForWork(w.id, "settlementValue")),
        });
      }
      if (tcColumnVis.outstanding) {
        columns.push({
          header: "Công nợ",
          get: (w) => {
            const tcList = tcByWorkId.get(w.id) ?? [];
            let sum = 0;
            let has = false;
            tcList.forEach((c) => {
              const v = outstandingByTcId.get(c.id);
              if (typeof v !== "number") return;
              sum += v;
              has = true;
            });
            return formatNumberAccounting(has ? sum : null);
          },
        });
      }

      columns.push({ header: "Ghi chú", get: (w) => w.note ?? "—" });

      const workHeaders = columns.map((c) => c.header);
      const workData = filteredWorks.map((w) => columns.map((c) => c.get(w)));

      const worksheet = XLSX.utils.aoa_to_sheet([workHeaders, ...workData]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_Muc_Tac_Pham");
      const prefix = buildExportPrefix();
      XLSX.writeFile(workbook, `${prefix}_Danh_Muc_Tac_Pham.xlsx`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Xuất Excel thất bại.";
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleExportTranslationContracts = async (
    filteredTc: TranslationContract[],
    toast: (opts: any) => any,
  ) => {
    if (filteredTc.length === 0) {
      toast({
        title: "Không có dữ liệu",
        description: "Không có hợp đồng dịch thuật để xuất Excel.",
      });
      return;
    }

    try {
      const XLSX = await loadXLSX();
      const paymentsList = await Promise.all(
        filteredTc.map((c) => fetchPaymentsByTcId(c.id)),
      );
      const summaries = await Promise.all(
        filteredTc.map((c) =>
          fetchFinanceSummary(c.id).catch(() => ({
            totalPaid: 0,
            totalAdvance: 0,
            outstanding: 0,
          })),
        ),
      );
      const baseHeaders = [
        "ID",
        "Số HĐ",
        "Hợp phần",
        "Tác phẩm",
        "Dịch giả",
        "Đơn giá",
        "Kinh phí tổng quan",
        "Kinh phí dịch thuật",
        "Giá trị HĐ",
        "Ngày bắt đầu",
        "Ngày kết thúc",
        "Gia hạn từ",
        "Gia hạn đến",
        "Hoàn thành thực tế",
        "Số chữ Thực tế",
        "Số trang Thực tế",
        "Tỷ lệ hoàn thành",
        "Giá trị quyết toán",
        "Chênh lệch",
        "Tạm ứng lần 1",
        "Ngày tạm ứng lần 1",
        "Tạm ứng lần 2",
        "Ngày tạm ứng lần 2",
        "Quyết toán",
        "Ngày quyết toán",
        "Công nợ",
        "Trạng thái",
        "Ghi chú",
      ];
      const headers = baseHeaders;
      const data = filteredTc.map((c, idx) => {
        const payments = paymentsList[idx] ?? [];
        const s = summaries[idx];
        const advances = payments
          .filter(
            (p) => String(p.paymentType || "").toLowerCase() === "advance",
          )
          .sort((a, b) => {
            const ad = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
            const bd = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
            return ad - bd;
          });
        const settlements = payments
          .filter(
            (p) => String(p.paymentType || "").toLowerCase() === "settlement",
          )
          .sort((a, b) => {
            const ad = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
            const bd = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
            return bd - ad;
          });
        const adv1 = advances[0];
        const adv2 = advances[1];
        const stl = settlements[0];
        const valueDiff =
          c.settlementValue != null && c.contractValue != null
            ? Number(c.settlementValue) - Number(c.contractValue)
            : null;
        const baseRow = [
          c.id,
          c.contractNumber ?? "—",
          getComponentName(c.componentId),
          getWorkTitle(c.workId),
          getTranslatorName(c.id),
          formatNumberAccounting(c.unitPrice),
          formatNumberAccounting(c.overviewValue),
          formatNumberAccounting(c.translationValue),
          formatNumberAccounting(c.contractValue),
          formatDateDDMMYYYY(c.startDate),
          formatDateDDMMYYYY(c.endDate),
          formatDateDDMMYYYY(c.extensionStartDate),
          formatDateDDMMYYYY(c.extensionEndDate),
          formatDateDDMMYYYY(c.actualCompletionDate),
          formatNumberAccounting(c.actualWordCount),
          formatNumberAccounting(c.actualPageCount),
          c.completionRate != null ? formatPercent(c.completionRate) : "—",
          formatNumberAccounting(c.settlementValue),
          valueDiff != null ? formatNumberAccounting(valueDiff) : "—",
          adv1 ? formatNumberAccounting(adv1.amount) : "—",
          adv1 ? formatDateDDMMYYYY(adv1.paymentDate) : "—",
          adv2 ? formatNumberAccounting(adv2.amount) : "—",
          adv2 ? formatDateDDMMYYYY(adv2.paymentDate) : "—",
          stl ? formatNumberAccounting(stl.amount) : "—",
          stl ? formatDateDDMMYYYY(stl.paymentDate) : "—",
          formatNumberAccounting(Math.max(s.outstanding ?? 0, 0)),
          c.status ?? "—",
          c.note ?? "—",
        ];
        return baseRow;
      });
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Hop_Dong_Dich_Thuat");
      const prefix = buildExportPrefix();
      XLSX.writeFile(workbook, `${prefix}_Hop_Dong_Dich_Thuat.xlsx`);
      toast({
        title: "Xuất Excel thành công",
        description: `Đã xuất ${filteredTc.length} hợp đồng dịch thuật.`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Xuất Excel thất bại.";
      toast({ title: "Lỗi", description: message, variant: "destructive" });
    }
  };

  const handleExportProofreadingContracts = async (
    filteredPc: ProofreadingContract[],
    toast: (opts: any) => any,
  ) => {
    if (filteredPc.length === 0) {
      toast({
        title: "Không có dữ liệu",
        description: "Không có hợp đồng hiệu đính để xuất Excel.",
      });
      return;
    }

    try {
      const XLSX = await loadXLSX();
      const paymentsList = await Promise.all(
        filteredPc.map((c) => fetchPaymentsByPcId(c.id)),
      );
      const summaries = await Promise.all(
        filteredPc.map((c) =>
          fetchFinanceSummaryPc(c.id).catch(() => ({
            totalPaid: 0,
            totalAdvance: 0,
            outstanding: 0,
          })),
        ),
      );
      const baseHeaders = [
        "ID",
        "Số HĐ",
        "Hợp phần",
        "Tác phẩm",
        "HĐ Dịch thuật (liên kết)",
        "Người hiệu đính",
        "Số trang",
        "Tỷ lệ (%)",
        "Giá trị HĐ",
        "Ngày bắt đầu",
        "Ngày kết thúc",
        "Hoàn thành thực tế",
        "Tạm ứng lần 1",
        "Ngày tạm ứng lần 1",
        "Tạm ứng lần 2",
        "Ngày tạm ứng lần 2",
        "Quyết toán",
        "Ngày quyết toán",
        "Công nợ",
        "Ghi chú",
      ];
      const headers = baseHeaders;
      const data = filteredPc.map((c, idx) => {
        const tc = c.translationContractId
          ? tcById.get(c.translationContractId)
          : null;
        const payments = paymentsList[idx] ?? [];
        const s = summaries[idx];
        const advances = payments
          .filter(
            (p) => String(p.paymentType || "").toLowerCase() === "advance",
          )
          .sort((a, b) => {
            const ad = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
            const bd = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
            return ad - bd;
          });
        const settlements = payments
          .filter(
            (p) => String(p.paymentType || "").toLowerCase() === "settlement",
          )
          .sort((a, b) => {
            const ad = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
            const bd = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
            return bd - ad;
          });
        const adv1 = advances[0];
        const adv2 = advances[1];
        const stl = settlements[0];
        const baseRow = [
          c.id,
          c.contractNumber ?? "—",
          getComponentName(c.componentId),
          getWorkTitle(c.workId),
          tc?.contractNumber ?? "—",
          getProofreaderName(c.id),
          formatNumberAccounting(c.pageCount),
          c.rateRatio != null ? formatPercent(c.rateRatio) : "—",
          formatNumberAccounting(c.contractValue),
          formatDateDDMMYYYY(c.startDate),
          formatDateDDMMYYYY(c.endDate),
          formatDateDDMMYYYY(c.actualCompletionDate),
          adv1 ? formatNumberAccounting(adv1.amount) : "—",
          adv1 ? formatDateDDMMYYYY(adv1.paymentDate) : "—",
          adv2 ? formatNumberAccounting(adv2.amount) : "—",
          adv2 ? formatDateDDMMYYYY(adv2.paymentDate) : "—",
          stl ? formatNumberAccounting(stl.amount) : "—",
          stl ? formatDateDDMMYYYY(stl.paymentDate) : "—",
          formatNumberAccounting(Math.max(s.outstanding ?? 0, 0)),
          c.note ?? "—",
        ];
        return baseRow;
      });
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Hop_Dong_Hieu_Dinh");
      const prefix = buildExportPrefix();
      XLSX.writeFile(workbook, `${prefix}_Hop_Dong_Hieu_Dinh.xlsx`);
      toast({
        title: "Xuất Excel thành công",
        description: `Đã xuất ${filteredPc.length} hợp đồng hiệu đính.`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Xuất Excel thất bại.";
      toast({ title: "Lỗi", description: message, variant: "destructive" });
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
        }),
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
      const { _translatorUserIds, ...payload } = data as {
        _translatorUserIds?: string[];
      };
      const res = await fetch(api.translationContracts.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Tạo thất bại");
      }
      return res.json();
    },
    onSuccess: async (contract, variables) => {
      await queryClient.refetchQueries({
        queryKey: ["translation-contracts"],
      });
      // Lưu translation contract members nếu có translator
      const translatorUserIds = (variables as { _translatorUserIds?: string[] })
        ?._translatorUserIds;
      const uniqueTranslatorUserIds = Array.from(
        new Set((translatorUserIds ?? []).filter(Boolean)),
      );
      if (uniqueTranslatorUserIds.length > 0 && contract?.id) {
        try {
          let partnerRoleId: string | null = null;
          const rolesRes = await fetch(api.roles.list.path, {
            credentials: "include",
          });
          if (rolesRes.ok) {
            const rolesList = await rolesRes.json();
            const partnerRole = rolesList.find(
              (r: { code: string }) => r.code === "partner",
            );
            partnerRoleId = partnerRole?.id ?? null;
          }

          for (const userId of uniqueTranslatorUserIds) {
            if (partnerRoleId) {
              const userRes = await fetch(
                buildUrl(api.users.get.path, { id: userId }),
                { credentials: "include" },
              );
              if (userRes.ok) {
                const user = await userRes.json();
                const hasPartnerRole = user.roles?.some(
                  (r: { id: string }) => r.id === partnerRoleId,
                );
                if (!hasPartnerRole) {
                  await fetch(buildUrl(api.users.update.path, { id: userId }), {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      roleIds: [
                        ...(user.roles?.map((r: { id: string }) => r.id) || []),
                        partnerRoleId,
                      ],
                    }),
                  });
                }
              }
            }

            await fetch(api.translationContractMembers.create.path, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                translationContractId: contract.id,
                userId,
              }),
            });
          }

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
      const { _translatorUserIds, ...payload } = data as {
        _translatorUserIds?: string[];
      };
      const res = await fetch(
        buildUrl(api.translationContracts.update.path, { id }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Cập nhật thất bại");
      }
      return res.json();
    },
    onSuccess: async (contract, variables) => {
      await queryClient.refetchQueries({
        queryKey: ["translation-contracts"],
      });
      // Cập nhật translation contract members nếu có translator
      const translatorUserIds = (
        variables.data as { _translatorUserIds?: string[] }
      )?._translatorUserIds;
      const uniqueTranslatorUserIds = Array.from(
        new Set((translatorUserIds ?? []).filter(Boolean)),
      );
      if (contract?.id) {
        try {
          // Xóa các members cũ
          const membersRes = await fetch(
            buildUrl(api.translationContractMembers.listByContract.path, {
              contractId: contract.id,
            }),
            { credentials: "include" },
          );
          if (membersRes.ok) {
            const members = await membersRes.json();
            for (const member of members) {
              await fetch(
                buildUrl(api.translationContractMembers.delete.path, {
                  id: member.id,
                }),
                { method: "DELETE", credentials: "include" },
              );
            }
          }

          if (uniqueTranslatorUserIds.length > 0) {
            let partnerRoleId: string | null = null;
            const rolesRes = await fetch(api.roles.list.path, {
              credentials: "include",
            });
            if (rolesRes.ok) {
              const rolesList = await rolesRes.json();
              const partnerRole = rolesList.find(
                (r: { code: string }) => r.code === "partner",
              );
              partnerRoleId = partnerRole?.id ?? null;
            }

            for (const userId of uniqueTranslatorUserIds) {
              if (partnerRoleId) {
                const userRes = await fetch(
                  buildUrl(api.users.get.path, { id: userId }),
                  { credentials: "include" },
                );
                if (userRes.ok) {
                  const user = await userRes.json();
                  const hasPartnerRole = user.roles?.some(
                    (r: { id: string }) => r.id === partnerRoleId,
                  );
                  if (!hasPartnerRole) {
                    await fetch(
                      buildUrl(api.users.update.path, { id: userId }),
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          roleIds: [
                            ...(user.roles?.map((r: { id: string }) => r.id) ||
                              []),
                            partnerRoleId,
                          ],
                        }),
                      },
                    );
                  }
                }
              }

              await fetch(api.translationContractMembers.create.path, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  translationContractId: contract.id,
                  userId,
                }),
              });
            }
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
      await queryClient.refetchQueries({
        queryKey: ["proofreading-contracts"],
      });

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
              (r: { code: string }) => r.code === "partner",
            );
            if (partnerRole) {
              // Kiểm tra xem user đã có role "partner" chưa
              const userRes = await fetch(
                buildUrl(api.users.get.path, { id: proofreaderUserId }),
                { credentials: "include" },
              );
              if (userRes.ok) {
                const user = await userRes.json();
                const hasPartnerRole = user.roles?.some(
                  (r: { id: string }) => r.id === partnerRole.id,
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
                    },
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
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.message as string) || "Cập nhật thất bại");
      }
      return res.json();
    },
    onSuccess: async (contract, variables) => {
      await queryClient.refetchQueries({
        queryKey: ["proofreading-contracts"],
      });

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
            { credentials: "include" },
          );
          if (membersRes.ok) {
            const members = await membersRes.json();
            for (const member of members) {
              await fetch(
                buildUrl(api.proofreadingContractMembers.delete.path, {
                  id: member.id,
                }),
                { method: "DELETE", credentials: "include" },
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
                (r: { code: string }) => r.code === "partner",
              );
              if (partnerRole) {
                // Kiểm tra xem user đã có role "partner" chưa
                const userRes = await fetch(
                  buildUrl(api.users.get.path, { id: proofreaderUserId }),
                  { credentials: "include" },
                );
                if (userRes.ok) {
                  const user = await userRes.json();
                  const hasPartnerRole = user.roles?.some(
                    (r: { id: string }) => r.id === partnerRole.id,
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
                      },
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
        },
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
        },
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
    return <FullPageSkeleton withTabs tabs={3} withWelcome={false} />;
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

  const pathToTab = (path: string) => {
    const p = path.toLowerCase();
    if (p.startsWith("/thu-ky-hop-phan/hop-dong-dich-thuat"))
      return "translation";
    if (p.startsWith("/thu-ky-hop-phan/hop-dong-hieu-dinh"))
      return "proofreading";
    if (p.startsWith("/thu-ky-hop-phan/danh-muc-tac-pham")) return "works";
    return "tasks";
  };
  const tabToPath = (tab: string) => {
    if (tab === "translation") return "/thu-ky-hop-phan/hop-dong-dich-thuat";
    if (tab === "proofreading") return "/thu-ky-hop-phan/hop-dong-hieu-dinh";
    if (tab === "works") return "/thu-ky-hop-phan/danh-muc-tac-pham";
    return "/thu-ky-hop-phan";
  };
  const [activeTab, setActiveTab] = useState<string>(pathToTab(location));
  useEffect(() => {
    setActiveTab(pathToTab(location));
  }, [location]);
  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          setLocation(tabToPath(v));
        }}
        className="w-full">
        <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
          <TabsList className="w-full flex-nowrap overflow-x-auto lg:w-auto lg:overflow-visible">
            <TabsTrigger value="tasks" className="shrink-0 whitespace-nowrap">
              Công việc
            </TabsTrigger>
            <TabsTrigger value="works" className="shrink-0 whitespace-nowrap">
              Danh mục tác phẩm
            </TabsTrigger>
            <TabsTrigger
              value="translation"
              className="shrink-0 whitespace-nowrap">
              Hợp đồng dịch thuật
            </TabsTrigger>
            <TabsTrigger
              value="proofreading"
              className="shrink-0 whitespace-nowrap">
              Hợp đồng hiệu đính
            </TabsTrigger>
          </TabsList>

          {canCreateComponent && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setComponentCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm hợp phần
            </Button>
          )}
        </div>

        {/* Tab: Tasks */}
        <TabsContent value="tasks" className="mt-6">
          <GroupPageHero
            groupCode="thuky"
            syncedAt={new Date()}
            showRefresh
            isRefreshing={isRefreshing}
            onRefresh={() => refresh()}
            countBadge={{
              label:
                language === "vi"
                  ? `${tasksForStats.length} công việc`
                  : `${tasksForStats.length} tasks`,
              tone: "default",
            }}
          />

          <div className="grid gap-6 mt-6">
            <TaskStatsBadgesOnly
              tasks={tasksForStats}
              activeKey={activeStatsKey}
              onSelectKey={(key) => {
                setTaskFilters((prev) =>
                  toggleTaskStatsBadgeInFilters(prev, key),
                );
                window.setTimeout(
                  () =>
                    document
                      .getElementById("thuky-task-list")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  60,
                );
              }}
            />
          </div>
          <div
            id="thuky-task-list"
            className="rounded-xl border border-border bg-card overflow-hidden mt-6">
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportTasks}
                  disabled={
                    isExportingTasks ||
                    tasksLoading ||
                    filteredTasks.length === 0
                  }>
                  {isExportingTasks ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  {language === "vi" ? "Xuất Excel" : "Export Excel"}
                </Button>
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
                {(role === UserRole.ADMIN ||
                  role === UserRole.MANAGER ||
                  role === UserRole.EMPLOYEE) && (
                  <Button size="sm" onClick={() => setIsCreateTaskOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {language === "vi" ? "Tạo mới" : "Create new"}
                  </Button>
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <TaskFilters
                users={taskFilterUsers}
                components={taskComponentOptions}
                filters={taskFilters}
                onFiltersChange={(f) =>
                  setTaskFilters((prev) => ({ ...prev, ...f }))
                }
                stages={taskStages}
                yearOptions={taskYearOptions}
                showVoteFilter={true}
                periodOptions={taskPeriodOptions}
              />
            </div>
            {tasksLoading ? (
              <TaskTableSkeleton rows={8} columns={8} />
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
                onCreateNew={handleCreateNewTask}
                onResetFilters={handleResetTaskFilters}
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
                  onCreateNew={handleCreateNewTask}
                  onResetFilters={handleResetTaskFilters}
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
                  columnStorageKey="thu-ky-hop-phan-pc"
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
                          (_, i) => i + 1,
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
                                Math.min(totalTasksPages, p + 1),
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
            <div className="p-3 sm:p-4 border-b flex flex-col gap-3 bg-muted/20">
              {/* MOBILE-ONLY ACTION & FILTER BAR (Monday.com / ClickUp Mobile UX) */}
              <div className="flex flex-col gap-2.5 sm:hidden">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm tác phẩm..."
                      className="pl-8 h-9 text-xs bg-background"
                      value={worksSearch}
                      onChange={(e) => setWorksSearch(e.target.value)}
                    />
                    {worksSearch && (
                      <button
                        onClick={() => setWorksSearch("")}
                        className="absolute right-2.5 top-2.5 text-muted-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Trigger Button with badge */}
                  <Button
                    size="sm"
                    variant={activeWorksFilterCount > 0 ? "default" : "outline"}
                    className="h-9 px-2.5 shrink-0 text-xs gap-1"
                    onClick={() => setMobileWorksFilterOpen(true)}>
                    <Filter className="w-3.5 h-3.5" />
                    <span>Lọc</span>
                    {activeWorksFilterCount > 0 && (
                      <span className="ml-0.5 bg-primary-foreground text-primary text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">
                        {activeWorksFilterCount}
                      </span>
                    )}
                  </Button>

                  {/* View Mode Toggle: Compact (Monday) | Card | Table */}
                  <ToggleGroup
                    type="single"
                    value={worksViewMode}
                    onValueChange={(v) => v && setWorksViewMode(v as any)}
                    className="border rounded-md bg-background h-9 shrink-0">
                    <ToggleGroupItem value="compact" aria-label="Gọn" className="h-8 w-8 p-0" title="Chế độ gọn (Monday)">
                      <Rows3 className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="card" aria-label="Thẻ" className="h-8 w-8 p-0" title="Chế độ thẻ">
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="table" aria-label="Bảng" className="h-8 w-8 p-0" title="Chế độ bảng">
                      <Table2 className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Secondary Row: Count + Actions + Add */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    {filteredWorks.length} tác phẩm
                  </span>
                  <div className="flex items-center gap-1.5">
                    {selectedWorkIds.length > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs px-2"
                        onClick={() => setBulkDeleteWorksOpen(true)}>
                        Xóa ({selectedWorkIds.length})
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setWorksImportOpen(true)}>
                          <Upload className="w-4 h-4 mr-2" /> Import Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleExportWorks(filteredWorks, toast)}>
                          <FileText className="w-4 h-4 mr-2" /> Xuất Excel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      size="sm"
                      className="h-8 text-xs px-2.5 font-medium"
                      onClick={() => setWorkDialog({ open: true, work: null })}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Thêm
                    </Button>
                  </div>
                </div>

                {/* Active Filter Chips */}
                {activeWorksFilterCount > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                    {worksComponentFilter !== "all" && (
                      <Badge variant="secondary" className="text-[11px] gap-1 shrink-0 font-normal">
                        Hợp phần: {getComponentName(worksComponentFilter)}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setWorksComponentFilter("all")} />
                      </Badge>
                    )}
                    {worksStageFilter !== "all" && (
                      <Badge variant="secondary" className="text-[11px] gap-1 shrink-0 font-normal">
                        {formatStageDisplay(worksStageFilter)}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setWorksStageFilter("all")} />
                      </Badge>
                    )}
                    {worksProgressFilter !== "all" && (
                      <Badge variant="secondary" className="text-[11px] gap-1 shrink-0 font-normal">
                        Tiến độ
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setWorksProgressFilter("all")} />
                      </Badge>
                    )}
                    <button
                      onClick={handleResetWorksFilters}
                      className="text-[11px] text-primary underline shrink-0 font-medium ml-1">
                      Xóa bộ lọc
                    </button>
                  </div>
                )}
              </div>

              {/* MOBILE BOTTOM SHEET FILTER MODAL (ClickUp / Monday Drawer) */}
              <Sheet open={mobileWorksFilterOpen} onOpenChange={setMobileWorksFilterOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-5">
                  <SheetHeader className="text-left pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-base font-bold">Bộ lọc tác phẩm</SheetTitle>
                      {activeWorksFilterCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResetWorksFilters}
                          className="text-xs h-7 text-destructive px-2">
                          Đặt lại
                        </Button>
                      )}
                    </div>
                    <SheetDescription className="text-xs text-muted-foreground">
                      Lọc danh sách theo hợp phần, giai đoạn và tiến độ thực tế
                    </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-4 py-4">
                    {/* Hợp phần */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Hợp phần</Label>
                      <Select
                        value={worksComponentFilter}
                        onValueChange={setWorksComponentFilter}>
                        <SelectTrigger className="w-full h-10 bg-background">
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

                    {/* Giai đoạn */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Giai đoạn</Label>
                      <Select
                        value={worksStageFilter}
                        onValueChange={setWorksStageFilter}>
                        <SelectTrigger className="w-full h-10 bg-background">
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

                    {/* Tiến độ */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Tiến độ tác phẩm</Label>
                      <Select
                        value={worksProgressFilter}
                        onValueChange={(v) =>
                          setWorksProgressFilter(v as WorksProgressFilter)
                        }>
                        <SelectTrigger className="w-full h-10 bg-background">
                          <SelectValue placeholder="Tất cả tiến độ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả tiến độ</SelectItem>
                          <SelectItem value="signed_contract">Ký hợp đồng</SelectItem>
                          <SelectItem value="progress_check">Kiểm tra tiến độ</SelectItem>
                          <SelectItem value="expert_review">Thẩm định cấp chuyên gia</SelectItem>
                          <SelectItem value="project_acceptance">Nghiệm thu cấp Dự án</SelectItem>
                          <SelectItem value="settlement">Quyết toán</SelectItem>
                          <SelectItem value="proofreading_completed">Hiệu đính (hoàn thành)</SelectItem>
                          <SelectItem value="editing_completed">Biên tập (hoàn thành)</SelectItem>
                          <SelectItem value="design_completed">Thiết kế (hoàn thành)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bộ cột */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Bộ cột hiển thị</Label>
                      <ToggleGroup
                        type="single"
                        value={(() => {
                          const allFalse =
                            !tcColumnVis.contractNumber &&
                            !tcColumnVis.translators &&
                            !tcColumnVis.overviewValue &&
                            !tcColumnVis.translationValue &&
                            !tcColumnVis.contractValue &&
                            !tcColumnVis.settlementValue &&
                            !tcColumnVis.outstanding;
                          const allTrue =
                            tcColumnVis.contractNumber &&
                            tcColumnVis.translators &&
                            tcColumnVis.overviewValue &&
                            tcColumnVis.translationValue &&
                            tcColumnVis.contractValue &&
                            tcColumnVis.settlementValue &&
                            tcColumnVis.outstanding;
                          if (allFalse) return "basic";
                          if (allTrue) return "finance";
                          return "estimate";
                        })()}
                        onValueChange={(v) => {
                          if (!v) return;
                          if (v === "basic") {
                            setTcColumnVis({
                              contractNumber: false,
                              translators: false,
                              overviewValue: false,
                              translationValue: false,
                              contractValue: false,
                              settlementValue: false,
                              outstanding: false,
                            });
                          } else if (v === "finance") {
                            setTcColumnVis({
                              contractNumber: true,
                              translators: true,
                              overviewValue: true,
                              translationValue: true,
                              contractValue: true,
                              settlementValue: true,
                              outstanding: true,
                            });
                          } else if (v === "estimate") {
                            setTcColumnVis({
                              contractNumber: false,
                              translators: false,
                              overviewValue: false,
                              translationValue: false,
                              contractValue: false,
                              settlementValue: false,
                              outstanding: false,
                            });
                          }
                        }}
                        className="border rounded-md bg-background w-full justify-start p-0.5">
                        <ToggleGroupItem value="basic" className="flex-1 text-xs h-8">Cơ bản</ToggleGroupItem>
                        <ToggleGroupItem value="finance" className="flex-1 text-xs h-8">Tài chính</ToggleGroupItem>
                        <ToggleGroupItem value="estimate" className="flex-1 text-xs h-8">Ước tính</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <Button className="w-full h-10 font-semibold" onClick={() => setMobileWorksFilterOpen(false)}>
                      Xem kết quả ({filteredWorks.length} tác phẩm)
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* DESKTOP ACTION & FILTER BAR */}
              <div className="hidden sm:flex flex-col gap-4">
                <div className="flex flex-row gap-4 justify-between items-center">
                  <div className="flex items-center gap-2 w-auto">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm tác phẩm..."
                        className="pl-9 bg-background"
                        value={worksSearch}
                        onChange={(e) => setWorksSearch(e.target.value)}
                      />
                    </div>
                    <Badge variant="secondary">
                      {filteredWorks.length} tác phẩm
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <ToggleGroup
                      type="single"
                      value={worksViewMode}
                      onValueChange={(v) =>
                        v && setWorksViewMode(v as any)
                      }
                      className="border rounded-md bg-background">
                      <ToggleGroupItem value="compact" aria-label="Gọn" title="Chế độ gọn (Monday)">
                        <Rows3 className="h-4 w-4 mr-1.5" />
                        Gọn
                      </ToggleGroupItem>
                      <ToggleGroupItem value="card" aria-label="Thẻ" title="Chế độ thẻ">
                        <LayoutGrid className="h-4 w-4 mr-1.5" />
                        Thẻ
                      </ToggleGroupItem>
                      <ToggleGroupItem value="table" aria-label="Bảng" title="Chế độ bảng">
                        <Table2 className="h-4 w-4 mr-1.5" />
                        Bảng
                      </ToggleGroupItem>
                    </ToggleGroup>
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
                      variant="outline"
                      onClick={() =>
                        void handleExportWorks(filteredWorks, toast)
                      }>
                      <FileText className="w-4 h-4 mr-2" />
                      Xuất Excel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setWorkDialog({ open: true, work: null })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm tác phẩm
                    </Button>
                  </div>
                </div>

                {/* Filters Row */}
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
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      Tiến độ tác phẩm
                    </Label>
                    <Select
                      value={worksProgressFilter}
                      onValueChange={(v) =>
                        setWorksProgressFilter(v as WorksProgressFilter)
                      }>
                      <SelectTrigger className="w-[220px] h-9 bg-background">
                        <SelectValue placeholder="Tất cả tiến độ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="signed_contract">
                          Ký hợp đồng
                        </SelectItem>
                        <SelectItem value="progress_check">
                          Kiểm tra tiến độ
                        </SelectItem>
                        <SelectItem value="expert_review">
                          Thẩm định cấp chuyên gia
                        </SelectItem>
                        <SelectItem value="project_acceptance">
                          Nghiệm thu cấp Dự án
                        </SelectItem>
                        <SelectItem value="settlement">Quyết toán</SelectItem>
                        <SelectItem value="proofreading_completed">
                          Hiệu đính (hoàn thành)
                        </SelectItem>
                        <SelectItem value="editing_completed">
                          Biên tập (hoàn thành)
                        </SelectItem>
                        <SelectItem value="design_completed">
                          Thiết kế (hoàn thành)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      Bộ cột
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={(() => {
                        const allFalse =
                          !tcColumnVis.contractNumber &&
                          !tcColumnVis.translators &&
                          !tcColumnVis.overviewValue &&
                          !tcColumnVis.translationValue &&
                          !tcColumnVis.contractValue &&
                          !tcColumnVis.settlementValue &&
                          !tcColumnVis.outstanding;
                        const allTrue =
                          tcColumnVis.contractNumber &&
                          tcColumnVis.translators &&
                          tcColumnVis.overviewValue &&
                          tcColumnVis.translationValue &&
                          tcColumnVis.contractValue &&
                          tcColumnVis.settlementValue &&
                          tcColumnVis.outstanding;
                        if (allFalse) return "basic";
                        if (allTrue) return "finance";
                        return "estimate";
                      })()}
                      onValueChange={(v) => {
                        if (!v) return;
                        if (v === "basic") {
                          setTcColumnVis({
                            contractNumber: false,
                            translators: false,
                            overviewValue: false,
                            translationValue: false,
                            contractValue: false,
                            settlementValue: false,
                            outstanding: false,
                          });
                        } else if (v === "finance") {
                          setTcColumnVis({
                            contractNumber: true,
                            translators: true,
                            overviewValue: true,
                            translationValue: true,
                            contractValue: true,
                            settlementValue: true,
                            outstanding: true,
                          });
                        } else if (v === "estimate") {
                          setTcColumnVis({
                            contractNumber: false,
                            translators: false,
                            overviewValue: false,
                            translationValue: false,
                            contractValue: false,
                            settlementValue: false,
                            outstanding: false,
                          });
                        }
                      }}
                      className="border rounded-md bg-background h-9">
                      <ToggleGroupItem
                        value="basic"
                        aria-label="Cơ bản"
                        className="text-xs h-8 px-3">
                        Cơ bản
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="finance"
                        aria-label="Tài chính"
                        className="text-xs h-8 px-3">
                        Tài chính
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="estimate"
                        aria-label="Ước tính"
                        className="text-xs h-8 px-3">
                        Ước tính
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <div className="flex-1" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="shrink-0">
                        Hiển thị cột
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Cột hợp đồng</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={tcColumnVis.contractNumber}
                        onCheckedChange={(v) =>
                          setTcColumnVis((s) => ({ ...s, contractNumber: !!v }))
                        }>
                        Số hợp đồng
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={tcColumnVis.translators}
                        onCheckedChange={(v) =>
                          setTcColumnVis((s) => ({ ...s, translators: !!v }))
                        }>
                        Dịch giả
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuLabel>Cột tài chính</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={tcColumnVis.overviewValue}
                        onCheckedChange={(v) =>
                          setTcColumnVis((s) => ({ ...s, overviewValue: !!v }))
                        }>
                        Kinh phí tổng quan
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={tcColumnVis.translationValue}
                        onCheckedChange={(v) =>
                          setTcColumnVis((s) => ({ ...s, translationValue: !!v }))
                        }>
                        Kinh phí dịch thuật
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={tcColumnVis.contractValue}
                        onCheckedChange={(v) =>
                          setTcColumnVis((s) => ({ ...s, contractValue: !!v }))
                        }>
                        Giá trị HĐ
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={tcColumnVis.settlementValue}
                        onCheckedChange={(v) =>
                          setTcColumnVis((s) => ({ ...s, settlementValue: !!v }))
                        }>
                        Giá trị quyết toán
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={tcColumnVis.outstanding}
                        onCheckedChange={(v) =>
                          setTcColumnVis((s) => ({ ...s, outstanding: !!v }))
                        }>
                        Công nợ
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            {worksLoading ? (
              <TaskTableSkeleton rows={10} columns={7} />
            ) : (
              <>
                {worksViewMode === "table" ? (
                  <div className="w-full overflow-x-auto scrollbar-thin">
                    <div className="sm:hidden px-4 py-2 bg-muted/40 border-b text-xs text-muted-foreground flex items-center gap-1.5">
                      <span>👉</span> <span>Vuốt ngang bảng để xem tất cả {worksTableColSpan} cột chi tiết</span>
                    </div>
                    <Table
                      className="border-collapse min-w-[1250px]"
                      containerClassName="relative w-full overflow-auto max-h-[calc(100vh-300px)]">
                    <TableHeader className="sticky top-0 z-20">
                      <TableRow className="border-b transition-colors hover:bg-muted/50 bg-muted/95 backdrop-blur-sm">
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[80px] min-w-[80px] sticky left-0 z-30 bg-muted/95 backdrop-blur-sm border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
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
                                  paginatedWorks.forEach((w) => next.add(w.id));
                                  return Array.from(next);
                                });
                              } else {
                                setSelectedWorkIds((prev) =>
                                  prev.filter(
                                    (id) => !paginatedWorkIds.has(id),
                                  ),
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
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[140px] min-w-[140px]"
                        />
                        <SortableHead
                          label="Tiêu đề (VI)"
                          column="titleVi"
                          sortColumns={worksSortColumns}
                          onSort={handleWorksSort}
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[25%] min-w-[200px] sticky z-30 bg-muted/95 backdrop-blur-sm border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                          style={{ left: 80 }}
                        />
                        <SortableHead
                          label="Tiêu đề Hán Nôm"
                          column="titleHannom"
                          sortColumns={worksSortColumns}
                          onSort={handleWorksSort}
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[180px] min-w-[140px]"
                        />
                        <SortableHead
                          label="Giai đoạn"
                          column="stage"
                          sortColumns={worksSortColumns}
                          onSort={handleWorksSort}
                          className="w-[100px] min-w-[90px]"
                        />
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[260px] min-w-[240px]">
                          Pipeline
                        </TableHead>
                        {tcColumnVis.contractNumber && (
                          <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[160px] min-w-[140px]">
                            Số HĐ
                          </TableHead>
                        )}
                        {tcColumnVis.translators && (
                          <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[220px] min-w-[180px]">
                            Dịch giả
                          </TableHead>
                        )}
                        <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Tiến độ
                        </TableHead>
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
                        {tcColumnVis.overviewValue && (
                          <TableHead className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[160px] min-w-[140px]">
                            Kinh phí tổng quan
                          </TableHead>
                        )}
                        {tcColumnVis.translationValue && (
                          <TableHead className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[160px] min-w-[140px]">
                            Kinh phí dịch thuật
                          </TableHead>
                        )}
                        {tcColumnVis.contractValue && (
                          <TableHead className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[160px] min-w-[140px]">
                            Giá trị HĐ
                          </TableHead>
                        )}
                        {tcColumnVis.settlementValue && (
                          <TableHead className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[160px] min-w-[140px]">
                            Giá trị quyết toán
                          </TableHead>
                        )}
                        {tcColumnVis.outstanding && (
                          <TableHead className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[140px] min-w-[120px]">
                            Công nợ
                          </TableHead>
                        )}
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
                            colSpan={worksTableColSpan}
                            className="text-center text-muted-foreground py-8">
                            Chưa có tác phẩm nào.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedWorks.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell className="p-4 align-middle sticky left-0 z-10 bg-card border-r border-border/50 min-w-[80px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
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
                            <TableCell className="p-4 align-middle">
                              {getComponentName(w.componentId)}
                            </TableCell>
                            <TableCell
                              className="p-4 align-middle sticky z-10 bg-card border-r border-border/50 min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                              style={{ left: 80 }}>
                              {w.titleVi ?? "—"}
                            </TableCell>
                            <TableCell className="p-4 align-middle">
                              {w.titleHannom ?? "—"}
                            </TableCell>
                            <TableCell>{formatStageDisplay(w.stage)}</TableCell>
                            <TableCell className="p-4 align-middle">
                              <Suspense fallback={<div className="flex gap-0.5"><div className="h-5 w-5 rounded-full bg-slate-100 animate-pulse"/><div className="h-1 flex-1 my-2 bg-slate-100 animate-pulse w-5 rounded-full"/></div>}>
                                <Pipeline8StepperLazy
                                  orientation="compact"
                                  size="sm"
                                  {...getPipelineStepperPropsForWork(
                                    w,
                                    workPipelineCtx,
                                  )}
                                />
                              </Suspense>
                            </TableCell>
                            {tcColumnVis.contractNumber && (
                              <TableCell
                                className="p-4 align-middle max-w-[220px] truncate"
                                title={getWorkContractNumbers(w.id)}>
                                {getWorkContractNumbers(w.id)}
                              </TableCell>
                            )}
                            {tcColumnVis.translators && (
                              <TableCell
                                className="p-4 align-middle max-w-[260px] truncate"
                                title={getWorkTranslators(w.id)}>
                                {getWorkTranslators(w.id)}
                              </TableCell>
                            )}
                            <TableCell className="p-4 align-middle">
                              <div className="flex flex-wrap gap-1.5">
                                <TooltipProvider
                                  delayDuration={100}
                                  skipDelayDuration={100}>
                                  {buildWorkProgressBadges(w).map((b, idx) => {
                                    const badge = (
                                      <Badge
                                        key={`${w.id}-progress-${idx}`}
                                        variant="outline"
                                        className={progressBadgeClass[b.tone]}
                                        title={b.tooltip || undefined}>
                                        {b.label}
                                      </Badge>
                                    );
                                    return b.tooltip ? (
                                      <Tooltip key={`${w.id}-tip-${idx}`}>
                                        <TooltipTrigger asChild>
                                          {badge}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {b.tooltip}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Fragment key={`${w.id}-tip-${idx}`}>
                                        {badge}
                                      </Fragment>
                                    );
                                  })}
                                </TooltipProvider>
                              </div>
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
                            {tcColumnVis.overviewValue && (
                              <TableCell className="text-right">
                                {formatNumberAccounting(
                                  sumTcMoneyForWork(w.id, "overviewValue"),
                                )}
                              </TableCell>
                            )}
                            {tcColumnVis.translationValue && (
                              <TableCell className="text-right">
                                {formatNumberAccounting(
                                  sumTcMoneyForWork(w.id, "translationValue"),
                                )}
                              </TableCell>
                            )}
                            {tcColumnVis.contractValue && (
                              <TableCell className="text-right">
                                {formatNumberAccounting(
                                  sumTcMoneyForWork(w.id, "contractValue"),
                                )}
                              </TableCell>
                            )}
                            {tcColumnVis.settlementValue && (
                              <TableCell className="text-right">
                                {formatNumberAccounting(
                                  sumTcMoneyForWork(w.id, "settlementValue"),
                                )}
                              </TableCell>
                            )}
                            {tcColumnVis.outstanding && (
                              <TableCell className="text-right">
                                {formatNumberAccounting(
                                  getOutstandingForWork(w.id),
                                )}
                              </TableCell>
                            )}
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
                ) : worksViewMode === "compact" ? (
                  <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {paginatedWorks.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 col-span-full">
                        Chưa có tác phẩm nào.
                      </div>
                    ) : (
                      paginatedWorks.map((w) => {
                        const stepProps = getPipelineStepperPropsForWork(w, workPipelineCtx);
                        const completedCount = [
                          stepProps.tcSigned,
                          stepProps.hasProgressCheck,
                          stepProps.hasExpertReview,
                          stepProps.hasProjectAcceptance,
                          stepProps.hasSettlement,
                          stepProps.proofreadingCompleted,
                          stepProps.editingCompleted,
                          stepProps.designCompleted,
                        ].filter(Boolean).length;
                        const progressPercent = Math.round((completedCount / 8) * 100);

                        const stepLabels = [
                          "Ký hợp đồng",
                          "Kiểm tra tiến độ",
                          "Thẩm định chuyên gia",
                          "Nghiệm thu dự án",
                          "Quyết toán",
                          "Hiệu đính xong",
                          "Biên tập xong",
                          "Thiết kế xong",
                        ];
                        const currentStepName = completedCount === 8
                          ? "Hoàn thành 8/8"
                          : `B${completedCount + 1}: ${stepLabels[completedCount] || "Chưa bắt đầu"}`;

                        return (
                          <div
                            key={w.id}
                            className="group relative border border-border/70 rounded-xl p-3 sm:p-3.5 bg-card hover:bg-muted/40 hover:border-primary/40 transition-all flex flex-col gap-2.5 cursor-pointer shadow-xs active:scale-[0.99]"
                            onClick={() => setWorkDialog({ open: true, work: w })}
                            role="button"
                            tabIndex={0}>
                            {/* Row 1: Stage Badge + Component + Document Code */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] sm:text-xs font-semibold bg-primary/10 text-primary border-primary/25 px-2 py-0.5">
                                  {formatStageDisplay(w.stage)}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                                  {getComponentName(w.componentId)}
                                </span>
                              </div>
                              {w.documentCode && (
                                <span className="font-mono text-[10px] sm:text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                                  {w.documentCode}
                                </span>
                              )}
                            </div>

                            {/* Row 2: Title (VI & Hannom) */}
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                {w.titleVi ?? "—"}
                              </div>
                              {w.titleHannom && (
                                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-serif">
                                  {w.titleHannom}
                                </div>
                              )}
                            </div>

                            {/* Row 3: Pipeline 8 Progress Bar (Monday.com Slim Stepper) */}
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground font-medium flex items-center gap-1.5 truncate">
                                  <span className={`inline-block w-2 h-2 rounded-full ${completedCount === 8 ? "bg-status-success" : completedCount > 0 ? "bg-status-info" : "bg-muted-foreground/40"}`} />
                                  <span className="truncate">{currentStepName}</span>
                                </span>
                                <span className="font-bold text-primary shrink-0 ml-2">{completedCount}/8 ({progressPercent}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${completedCount === 8 ? "bg-status-success" : "bg-primary"}`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Row 4: Key stats (Word/Page count + Translator) */}
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 text-muted-foreground gap-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium shrink-0">
                                <span>{formatNumberAccounting(w.baseWordCount)} chữ</span>
                                <span>•</span>
                                <span>{formatNumberAccounting(w.basePageCount)} trang</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-foreground font-medium truncate max-w-[140px]">
                                <span className="truncate">{getWorkTranslators(w.id) || "Chưa phân công"}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedWorks.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 col-span-full">
                        Chưa có tác phẩm nào.
                      </div>
                    ) : (
                      paginatedWorks.map((w) => (
                        <div
                          key={w.id}
                          className="border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3"
                          onClick={() => setWorkDialog({ open: true, work: w })}
                          role="button"
                          tabIndex={0}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className="bg-status-info/20 border-status-info/40 text-slate-900">
                                  {formatStageDisplay(w.stage)}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {getComponentName(w.componentId)}
                                </span>
                              </div>
                              <div className="font-semibold text-base truncate">
                                {w.titleVi ?? "—"}
                              </div>
                              {w.titleHannom && (
                                <div className="text-xs text-muted-foreground truncate mt-0.5">
                                  {w.titleHannom}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWorkDialog({ open: true, work: w });
                                }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWorkDialog({ open: true, work: w });
                                }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <Suspense
                            fallback={
                              <div className="flex gap-0.5">
                                <div className="h-5 w-5 rounded-full bg-slate-100 animate-pulse" />
                                <div className="h-1 flex-1 my-2 bg-slate-100 animate-pulse rounded-full min-w-[140px]" />
                              </div>
                            }>
                            <Pipeline8StepperLazy
                              size="sm"
                              orientation="horizontal"
                              showLabels={false}
                              {...getPipelineStepperPropsForWork(
                                w,
                                workPipelineCtx,
                              )}
                            />
                          </Suspense>
                          <div className="flex flex-wrap gap-1.5">
                            {buildWorkProgressBadges(w).map((b, idx) => (
                              <Badge
                                key={`${w.id}-wcard-${idx}`}
                                variant="outline"
                                className={progressBadgeClass[b.tone]}>
                                {b.label}
                              </Badge>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs pt-2 border-t border-border/60">
                            {w.documentCode && (
                              <div className="col-span-2 flex justify-between">
                                <span className="text-muted-foreground">
                                  Mã tài liệu
                                </span>
                                <span className="font-medium tabular-nums">
                                  {w.documentCode}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Số chữ gốc
                              </span>
                              <span className="font-medium tabular-nums">
                                {formatNumberAccounting(w.baseWordCount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Số trang gốc
                              </span>
                              <span className="font-medium tabular-nums">
                                {formatNumberAccounting(w.basePageCount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Hệ số
                              </span>
                              <span className="font-medium tabular-nums">
                                {w.estimateFactor != null
                                  ? formatNumberAccounting(
                                      w.estimateFactor,
                                      1,
                                    )
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Trang ước tính
                              </span>
                              <span className="font-medium tabular-nums">
                                {formatNumberAccounting(w.estimatePageCount)}
                              </span>
                            </div>
                            {tcColumnVis.overviewValue && (
                              <div className="flex justify-between col-span-2">
                                <span className="text-muted-foreground">
                                  Kinh phí tổng quan
                                </span>
                                <span className="font-medium tabular-nums">
                                  {formatNumberAccounting(
                                    sumTcMoneyForWork(w.id, "overviewValue"),
                                  )}
                                </span>
                              </div>
                            )}
                            {tcColumnVis.translationValue && (
                              <div className="flex justify-between col-span-2">
                                <span className="text-muted-foreground">
                                  Kinh phí dịch thuật
                                </span>
                                <span className="font-medium tabular-nums">
                                  {formatNumberAccounting(
                                    sumTcMoneyForWork(
                                      w.id,
                                      "translationValue",
                                    ),
                                  )}
                                </span>
                              </div>
                            )}
                            {tcColumnVis.contractValue && (
                              <div className="flex justify-between col-span-2">
                                <span className="text-muted-foreground">
                                  Giá trị HĐ
                                </span>
                                <span className="font-medium tabular-nums">
                                  {formatNumberAccounting(
                                    sumTcMoneyForWork(w.id, "contractValue"),
                                  )}
                                </span>
                              </div>
                            )}
                            {tcColumnVis.settlementValue && (
                              <div className="flex justify-between col-span-2">
                                <span className="text-muted-foreground">
                                  Giá trị quyết toán
                                </span>
                                <span className="font-medium tabular-nums">
                                  {formatNumberAccounting(
                                    sumTcMoneyForWork(
                                      w.id,
                                      "settlementValue",
                                    ),
                                  )}
                                </span>
                              </div>
                            )}
                            {tcColumnVis.outstanding && (
                              <div className="flex justify-between col-span-2">
                                <span className="text-muted-foreground">
                                  Công nợ
                                </span>
                                <span className="font-medium tabular-nums">
                                  {formatNumberAccounting(
                                    getOutstandingForWork(w.id),
                                  )}
                                </span>
                              </div>
                            )}
                            {tcColumnVis.contractNumber &&
                              getWorkContractNumbers(w.id) && (
                                <div className="col-span-2 text-xs pt-0.5">
                                  <span className="text-muted-foreground">
                                    Số HĐ:{" "}
                                  </span>
                                  <span className="font-medium truncate">
                                    {getWorkContractNumbers(w.id)}
                                  </span>
                                </div>
                              )}
                            {tcColumnVis.translators &&
                              getWorkTranslators(w.id) && (
                                <div className="col-span-2 text-xs pt-0.5">
                                  <span className="text-muted-foreground">
                                    Dịch giả:{" "}
                                  </span>
                                  <span className="font-medium truncate">
                                    {getWorkTranslators(w.id)}
                                  </span>
                                </div>
                              )}
                          </div>
                          {w.note && (
                            <div
                              className="text-xs text-muted-foreground truncate pt-1 border-t border-border/60"
                              title={w.note}>
                              📝 {w.note}
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
                          totalWorksPages,
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
                                Math.min(totalWorksPages, p + 1),
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
          <div className="mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Card
                onClick={() =>
                  setTcQuickFilter((k) => (k === "all" ? "all" : "all"))
                }
                className={`overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${tcQuickFilter === "all" ? "ring-2 ring-primary" : ""} bg-white dark:bg-slate-900/30 text-slate-700 dark:text-slate-100`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200/60 dark:bg-slate-700/40">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                      Tổng số HĐ
                    </p>
                    <h3 className="text-xl font-bold font-display tabular-nums mt-0.5">
                      {tcStats.total}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card
                onClick={() =>
                  setTcQuickFilter((k) => (k === "valid" ? "all" : "valid"))
                }
                className={`overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${tcQuickFilter === "valid" ? "ring-2 ring-primary" : ""} bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-200/60 dark:bg-blue-700/40">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                      Còn hạn
                    </p>
                    <h3 className="text-xl font-bold font-display tabular-nums mt-0.5">
                      {tcStats.valid}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card
                onClick={() =>
                  setTcQuickFilter((k) =>
                    k === "completed" ? "all" : "completed",
                  )
                }
                className={`overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${tcQuickFilter === "completed" ? "ring-2 ring-primary" : ""} bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-200/60 dark:bg-emerald-700/40">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                      Đã hoàn thành
                    </p>
                    <h3 className="text-xl font-bold font-display tabular-nums mt-0.5">
                      {tcStats.completed}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card
                onClick={() =>
                  setTcQuickFilter((k) => (k === "expired" ? "all" : "expired"))
                }
                className={`overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${tcQuickFilter === "expired" ? "ring-2 ring-primary" : ""} bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-200/60 dark:bg-orange-700/40">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                      Hết hạn/ quá hạn
                    </p>
                    <h3 className="text-xl font-bold font-display tabular-nums mt-0.5">
                      {tcStats.expired}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card
                onClick={() =>
                  setTcQuickFilter((k) =>
                    k === "expiring" ? "all" : "expiring",
                  )
                }
                className={`overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${tcQuickFilter === "expiring" ? "ring-2 ring-primary" : ""} bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-200/60 dark:bg-amber-700/40">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                      Sắp hết hạn (1–90 ngày)
                    </p>
                    <h3 className="text-xl font-bold font-display tabular-nums mt-0.5">
                      {tcStats.expiring}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
                    {tcDisplayList.length} hợp đồng
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
                    variant="outline"
                    onClick={() =>
                      handleExportTranslationContracts(tcDisplayList, toast)
                    }
                    disabled={tcDisplayList.length === 0}>
                    <FileText className="w-4 h-4 mr-2" />
                    Xuất Excel
                  </Button>
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
              {/* moved stats outside container */}
            </div>
            {tcLoading ? (
              <TaskTableSkeleton rows={10} columns={7} />
            ) : (
              <>
                {tcViewMode === "table" ? (
                  <Table
                    className="border-collapse"
                    containerClassName="relative w-full overflow-auto max-h-[calc(100vh-300px)]">
                    <TableHeader className="sticky top-0 z-20">
                      <TableRow className="border-b transition-colors hover:bg-muted/50 bg-muted/95 backdrop-blur-sm">
                        <SortableHead
                          label="Số HĐ"
                          column="contractNumber"
                          sortColumns={tcSortColumns}
                          onSort={handleTcSort}
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[120px] min-w-[120px] sticky left-0 z-30 bg-muted/95 backdrop-blur-sm border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                        />
                        <SortableHead
                          label="Hợp phần"
                          column="component"
                          sortColumns={tcSortColumns}
                          onSort={handleTcSort}
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[140px] min-w-[140px]"
                        />
                        <TableHead
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[180px] min-w-[180px] sticky z-30 bg-muted/95 backdrop-blur-sm border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                          style={{ left: 120 }}>
                          Tác phẩm
                        </TableHead>
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
                          className={
                            tcColumnVis.overviewValue ? "text-right" : "hidden"
                          }
                        />
                        <SortableHead
                          label="Kinh phí dịch thuật"
                          column="translationValue"
                          sortColumns={tcSortColumns}
                          onSort={handleTcSort}
                          className={
                            tcColumnVis.translationValue
                              ? "text-right"
                              : "hidden"
                          }
                        />
                        <SortableHead
                          label="Giá trị HĐ"
                          column="contractValue"
                          sortColumns={tcSortColumns}
                          onSort={handleTcSort}
                          className={
                            tcColumnVis.contractValue ? "text-right" : "hidden"
                          }
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
                          label="Hoàn thành Thực tế"
                          column="actualCompletionDate"
                          sortColumns={tcSortColumns}
                          onSort={handleTcSort}
                        />
                        <SortableHead
                          label="Số chữ Thực tế"
                          column="actualWordCount"
                          sortColumns={tcSortColumns}
                          onSort={handleTcSort}
                          className="text-right"
                        />
                        <SortableHead
                          label="Số trang Thực tế"
                          column="actualPageCount"
                          sortColumns={tcSortColumns}
                          onSort={handleTcSort}
                          className="text-right"
                        />
                        <SortableHead
                          label="Tỷ lệ hoàn thành"
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
                          className={
                            tcColumnVis.settlementValue
                              ? "text-right"
                              : "hidden"
                          }
                        />
                        <TableHead className="text-right">
                          Chênh lệch so với GTHĐ
                        </TableHead>
                        <TableHead>Đã Tạm ứng đợt 1</TableHead>
                        <TableHead>Đã Tạm ứng đợt 2</TableHead>
                        <TableHead>Đã Quyết toán</TableHead>
                        <TableHead
                          className={
                            tcColumnVis.outstanding ? undefined : "hidden"
                          }>
                          Công nợ
                        </TableHead>
                        <TableHead>Tiến độ</TableHead>
                        <TableHead className="w-[260px] min-w-[240px]">
                          Ghi chú
                        </TableHead>
                        <TableHead className="w-[120px]"></TableHead>
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
                            <TableCell className="p-4 align-middle sticky left-0 z-10 bg-card border-r border-border/50 font-medium min-w-[120px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                              {c.contractNumber ?? "—"}
                            </TableCell>
                            <TableCell className="p-4 align-middle">
                              {getComponentName(c.componentId)}
                            </TableCell>
                            <TableCell
                              className="p-4 align-middle sticky z-10 bg-card border-r border-border/50 min-w-[180px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                              style={{ left: 120 }}>
                              <div
                                className="font-medium whitespace-normal break-words"
                                title={getWorkTitle(c.workId)}>
                                {getWorkTitle(c.workId)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <span>{formatNumberAccounting(c.unitPrice)}</span>
                              {c.unitPrice != null && c.unitPrice !== "" && (
                                <span className="text-xs text-muted-foreground block mt-0.5">
                                  {numberToVietnameseWords(c.unitPrice)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell
                              className={
                                tcColumnVis.overviewValue
                                  ? "text-right align-top"
                                  : "hidden"
                              }>
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
                            <TableCell
                              className={
                                tcColumnVis.translationValue
                                  ? "text-right align-top"
                                  : "hidden"
                              }>
                              <span>
                                {formatNumberAccounting(c.translationValue)}
                              </span>
                              {c.translationValue != null &&
                                c.translationValue !== "" && (
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(
                                      c.translationValue,
                                    )}
                                  </span>
                                )}
                            </TableCell>
                            <TableCell
                              className={
                                tcColumnVis.contractValue
                                  ? "text-right align-top"
                                  : "hidden"
                              }>
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
                              {formatDateDDMMYYYY(c.extensionStartDate) || "—"}
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
                            <TableCell
                              className={
                                tcColumnVis.settlementValue
                                  ? "text-right align-top"
                                  : "hidden"
                              }>
                              <span>
                                {formatNumberAccounting(c.settlementValue)}
                              </span>
                              {c.settlementValue != null &&
                                c.settlementValue !== "" && (
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(c.settlementValue)}
                                  </span>
                                )}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <span>
                                {c.settlementValue != null &&
                                c.contractValue != null
                                  ? formatNumberAccounting(
                                      Number(c.settlementValue) -
                                        Number(c.contractValue),
                                    )
                                  : "—"}
                              </span>
                              {c.settlementValue != null &&
                                c.contractValue != null && (
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(
                                      Number(c.settlementValue) -
                                        Number(c.contractValue),
                                    )}
                                  </span>
                                )}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <span>
                                {formatNumberAccounting(
                                  paymentInfoById.get(c.id)?.advance1?.amount,
                                )}
                              </span>
                              {paymentInfoById.get(c.id)?.advance1?.amount !=
                                null &&
                                paymentInfoById.get(c.id)?.advance1?.amount !==
                                  "" && (
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(
                                      paymentInfoById.get(c.id)?.advance1
                                        ?.amount,
                                    )}
                                  </span>
                                )}
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatDateDDMMYYYY(
                                  paymentInfoById.get(c.id)?.advance1
                                    ?.paymentDate,
                                ) || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <span>
                                {formatNumberAccounting(
                                  paymentInfoById.get(c.id)?.advance2?.amount,
                                )}
                              </span>
                              {paymentInfoById.get(c.id)?.advance2?.amount !=
                                null &&
                                paymentInfoById.get(c.id)?.advance2?.amount !==
                                  "" && (
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(
                                      paymentInfoById.get(c.id)?.advance2
                                        ?.amount,
                                    )}
                                  </span>
                                )}
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatDateDDMMYYYY(
                                  paymentInfoById.get(c.id)?.advance2
                                    ?.paymentDate,
                                ) || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <span>
                                {formatNumberAccounting(
                                  paymentInfoById.get(c.id)?.settlement?.amount,
                                )}
                              </span>
                              {paymentInfoById.get(c.id)?.settlement?.amount !=
                                null &&
                                paymentInfoById.get(c.id)?.settlement
                                  ?.amount !== "" && (
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(
                                      paymentInfoById.get(c.id)?.settlement
                                        ?.amount,
                                    )}
                                  </span>
                                )}
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatDateDDMMYYYY(
                                  paymentInfoById.get(c.id)?.settlement
                                    ?.paymentDate,
                                ) || "—"}
                              </div>
                            </TableCell>
                            <TableCell
                              className={
                                tcColumnVis.outstanding
                                  ? "text-right align-top"
                                  : "hidden"
                              }>
                              <span>
                                {formatNumberAccounting(
                                  outstandingById.get(c.id),
                                )}
                              </span>
                              {typeof outstandingById.get(c.id) === "number" &&
                                !Number.isNaN(
                                  outstandingById.get(c.id) as number,
                                ) && (
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(
                                      outstandingById.get(c.id) as number,
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
                                          c.workId,
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
                              className="w-[260px] min-w-[240px] whitespace-pre-wrap break-words"
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
                                Hoàn thành Thực tế
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
                          },
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
          <div className="mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Card
                onClick={() =>
                  setPcQuickFilter((k) => (k === "all" ? "all" : "all"))
                }
                className={`overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${pcQuickFilter === "all" ? "ring-2 ring-primary" : ""} bg-white dark:bg-slate-900/30 text-slate-700 dark:text-slate-100`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200/60 dark:bg-slate-700/40">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                      Tổng số HĐ
                    </p>
                    <h3 className="text-xl font-bold font-display tabular-nums mt-0.5">
                      {pcStats.total}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card
                onClick={() =>
                  setPcQuickFilter((k) => (k === "valid" ? "all" : "valid"))
                }
                className={`overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${pcQuickFilter === "valid" ? "ring-2 ring-primary" : ""} bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-200/60 dark:bg-blue-700/40">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                      Còn hạn
                    </p>
                    <h3 className="text-xl font-bold font-display tabular-nums mt-0.5">
                      {pcStats.valid}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card
                onClick={() =>
                  setPcQuickFilter((k) =>
                    k === "completed" ? "all" : "completed",
                  )
                }
                className={`overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${pcQuickFilter === "completed" ? "ring-2 ring-primary" : ""} bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-200/60 dark:bg-emerald-700/40">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                      Đã hoàn thành
                    </p>
                    <h3 className="text-xl font-bold font-display tabular-nums mt-0.5">
                      {pcStats.completed}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card
                onClick={() =>
                  setPcQuickFilter((k) => (k === "expired" ? "all" : "expired"))
                }
                className={`overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${pcQuickFilter === "expired" ? "ring-2 ring-primary" : ""} bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-200/60 dark:bg-orange-700/40">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                      Hết hạn/ quá hạn
                    </p>
                    <h3 className="text-xl font-bold font-display tabular-nums mt-0.5">
                      {pcStats.expired}
                    </h3>
                  </div>
                </CardContent>
              </Card>
              <Card
                onClick={() =>
                  setPcQuickFilter((k) =>
                    k === "expiring" ? "all" : "expiring",
                  )
                }
                className={`overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${pcQuickFilter === "expiring" ? "ring-2 ring-primary" : ""} bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300`}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-200/60 dark:bg-amber-700/40">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider opacity-90">
                      Sắp hết hạn (1–90 ngày)
                    </p>
                    <h3 className="text-xl font-bold font-display tabular-nums mt-0.5">
                      {pcStats.expiring}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
                    {pcDisplayList.length} hợp đồng
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleExportProofreadingContracts(pcDisplayList, toast)
                    }
                    disabled={pcDisplayList.length === 0}>
                    <FileText className="w-4 h-4 mr-2" />
                    Xuất Excel
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
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Người hiệu đính
                  </Label>
                  <TranslatorPicker
                    value={pcProofreaderSearch}
                    userId={null}
                    onChange={(name) => setPcProofreaderSearch(name)}
                    placeholder="Tìm tên người hiệu đính..."
                    className="w-[220px]"
                    allowCreate={false}
                  />
                </div>
              </div>
              {/* moved stats outside container */}
            </div>
            {pcLoading ? (
              <TaskTableSkeleton rows={10} columns={7} />
            ) : (
              <>
                {pcViewMode === "table" ? (
                  <Table
                    className="border-collapse"
                    containerClassName="relative w-full overflow-auto max-h-[calc(100vh-300px)]">
                    <TableHeader className="sticky top-0 z-20">
                      <TableRow className="border-b transition-colors hover:bg-muted/50 bg-muted/95 backdrop-blur-sm">
                        <SortableHead
                          label="Số HĐ"
                          column="contractNumber"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[120px] min-w-[120px] sticky left-0 z-30 bg-muted/95 backdrop-blur-sm border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                        />
                        <SortableHead
                          label="Hợp phần"
                          column="component"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[140px] min-w-[140px]"
                        />
                        <TableHead
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[180px] min-w-[180px] sticky z-30 bg-muted/95 backdrop-blur-sm border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                          style={{ left: 120 }}>
                          Tác phẩm
                        </TableHead>
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
                        <TableHead className="text-right">
                          Đã Tạm ứng đợt 1
                        </TableHead>
                        <TableHead className="text-right">
                          Đã Tạm ứng đợt 2
                        </TableHead>
                        <TableHead className="text-right">
                          Đã Quyết toán
                        </TableHead>
                        <TableHead className="text-right">Công nợ</TableHead>
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
                          label="Hoàn thành Thực tế"
                          column="actualCompletionDate"
                          sortColumns={pcSortColumns}
                          onSort={handlePcSort}
                        />
                        <TableHead className="w-[260px] min-w-[240px]">
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
                            <TableCell className="p-4 align-middle sticky left-0 z-10 bg-card border-r border-border/50 font-medium min-w-[120px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                              {c.contractNumber ?? "—"}
                            </TableCell>
                            <TableCell className="p-4 align-middle">
                              {getComponentName(c.componentId)}
                            </TableCell>
                            <TableCell
                              className="p-4 align-middle sticky z-10 bg-card border-r border-border/50 min-w-[180px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                              style={{ left: 120 }}>
                              <div
                                className="font-medium whitespace-normal break-words"
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
                            <TableCell className="text-right align-top">
                              {pcPaymentInfoById.get(c.id)?.advance1 ? (
                                <>
                                  <span>
                                    {formatNumberAccounting(
                                      pcPaymentInfoById.get(c.id)?.advance1
                                        ?.amount,
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(
                                      String(
                                        pcPaymentInfoById.get(c.id)?.advance1
                                          ?.amount,
                                      ),
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground block">
                                    {formatDateDDMMYYYY(
                                      pcPaymentInfoById.get(c.id)?.advance1
                                        ?.paymentDate,
                                    )}
                                  </span>
                                </>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              {pcPaymentInfoById.get(c.id)?.advance2 ? (
                                <>
                                  <span>
                                    {formatNumberAccounting(
                                      pcPaymentInfoById.get(c.id)?.advance2
                                        ?.amount,
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(
                                      String(
                                        pcPaymentInfoById.get(c.id)?.advance2
                                          ?.amount,
                                      ),
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground block">
                                    {formatDateDDMMYYYY(
                                      pcPaymentInfoById.get(c.id)?.advance2
                                        ?.paymentDate,
                                    )}
                                  </span>
                                </>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              {pcPaymentInfoById.get(c.id)?.settlement ? (
                                <>
                                  <span>
                                    {formatNumberAccounting(
                                      pcPaymentInfoById.get(c.id)?.settlement
                                        ?.amount,
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground block mt-0.5">
                                    {numberToVietnameseWords(
                                      String(
                                        pcPaymentInfoById.get(c.id)?.settlement
                                          ?.amount,
                                      ),
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground block">
                                    {formatDateDDMMYYYY(
                                      pcPaymentInfoById.get(c.id)?.settlement
                                        ?.paymentDate,
                                    )}
                                  </span>
                                </>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <span>
                                {formatNumberAccounting(
                                  pcOutstandingById.get(c.id) ?? 0,
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                {numberToVietnameseWords(
                                  String(pcOutstandingById.get(c.id) ?? 0),
                                )}
                              </span>
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
                              className="w-[260px] min-w-[240px] whitespace-pre-wrap break-words"
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
                                Hoàn thành Thực tế
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
                          },
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
            },
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
                if (
                  role !== UserRole.ADMIN &&
                  (deleteTaskTarget as any).createdBy !== user?.id
                ) {
                  toast({
                    title: "Lỗi",
                    description:
                      "Chỉ người tạo công việc mới có quyền xóa công việc này.",
                    variant: "destructive",
                  });
                  return;
                }
                deleteTask(deleteTaskTarget.id, {
                  onSuccess: () => {
                    setDeleteTaskConfirmOpen(false);
                    setDeleteTaskTarget(null);
                  },
                  onError: (e) => {
                    toast({
                      title: "Lỗi",
                      description: e.message,
                      variant: "destructive",
                    });
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

      <Dialog open={componentCreateOpen} onOpenChange={setComponentCreateOpen}>
        <DialogContent className="sm:max-w-[42rem]">
          <DialogHeader>
            <DialogTitle>Thêm hợp phần</DialogTitle>
            <DialogDescription>
              Tạo hợp phần dịch thuật mới (lưu vào bảng components).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Tên hợp phần *</Label>
              <Input
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                placeholder="Ví dụ: Phật tạng toàn dịch"
              />
            </div>
            <div className="grid gap-2">
              <Label>Mã hợp phần (code) *</Label>
              <Input
                value={componentCode}
                onChange={(e) => {
                  setComponentCodeEdited(true);
                  setComponentCode(e.target.value);
                }}
                placeholder="Ví dụ: phat_tang_toan_dich"
              />
            </div>
            <div className="grid gap-2">
              <Label>Mô tả</Label>
              <Input
                value={componentDescription}
                onChange={(e) => setComponentDescription(e.target.value)}
                placeholder="(Tuỳ chọn)"
              />
            </div>
            <div className="grid gap-2">
              <Label>Thứ tự hiển thị</Label>
              <NumberInput
                value={componentDisplayOrder}
                onChange={(v) => setComponentDisplayOrder(v)}
                placeholder="0"
                decimals={0}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setComponentCreateOpen(false)}
              disabled={createComponentMutation.isPending}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                const code = componentCode.trim();
                const name = componentName.trim();
                if (!name || !code) {
                  toast({
                    title: "Lỗi",
                    description: "Vui lòng nhập Tên và Mã hợp phần.",
                    variant: "destructive",
                  });
                  return;
                }
                createComponentMutation.mutate({
                  code,
                  name,
                  description: componentDescription.trim() || null,
                  displayOrder:
                    Number.parseInt(componentDisplayOrder || "0", 10) || 0,
                });
              }}
              disabled={createComponentMutation.isPending}>
              {createComponentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                "Tạo hợp phần"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Work create/edit dialog - simple form */}
      <Dialog
        open={workDialog.open}
        onOpenChange={(open) => setWorkDialog({ open, work: workDialog.work })}>
        <DialogContent className="sm:max-w-[56rem] lg:max-w-[64rem]">
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
        <DialogContent className="w-[95vw] sm:max-w-[72rem] lg:max-w-[80rem] max-h-[90vh] overflow-hidden flex flex-col">
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
        <DialogContent className="w-[95vw] sm:max-w-[72rem] lg:max-w-[80rem] max-h-[90vh] overflow-hidden flex flex-col">
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
            translationContractMembers={translationContractMembers}
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
