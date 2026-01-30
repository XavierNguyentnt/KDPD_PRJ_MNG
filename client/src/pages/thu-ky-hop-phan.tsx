import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTasks, useCreateTask, UserRole } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { useUsers } from "@/hooks/use-works-and-components";
import { TaskTable, sortTasks, type TaskSortColumn } from "@/components/task-table";
import { TaskDialog } from "@/components/task-dialog";
import { TaskFilters, getDefaultTaskFilters, applyTaskFilters, type TaskFilterState } from "@/components/task-filters";
import { api, buildUrl } from "@shared/routes";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import type { Work, TranslationContract, ProofreadingContract, Component, ContractStage } from "@shared/schema";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, FileText, Search, Trash2 } from "lucide-react";
import { formatDateDDMMYYYY, formatNumberAccounting, formatPercent, numberToVietnameseWords } from "@/lib/utils";

const PAGE_SIZE = 10;

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

/** Lấy phần số từ giá trị giai đoạn (để hiển thị trong ô nhập). */
function parseStageNumber(stage: string | null | undefined): string {
  if (stage == null || stage === "") return "";
  const num = String(stage).replace(/\D/g, "");
  return num || String(stage);
}

// --- API fetchers ---
async function fetchWorks(): Promise<Work[]> {
  const res = await fetch(api.works.list.path, { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được danh mục tác phẩm");
  return res.json();
}

async function fetchTranslationContracts(): Promise<TranslationContract[]> {
  const res = await fetch(api.translationContracts.list.path, { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được hợp đồng dịch thuật");
  return res.json();
}

async function fetchProofreadingContracts(): Promise<ProofreadingContract[]> {
  const res = await fetch(api.proofreadingContracts.list.path, { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được hợp đồng hiệu đính");
  return res.json();
}

async function fetchComponents(): Promise<Component[]> {
  const res = await fetch(api.components.list.path, { credentials: "include" });
  if (!res.ok) throw new Error("Không tải được danh sách hợp phần");
  return res.json();
}

export default function ThuKyHopPhanPage() {
  const { role, user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tasksPage, setTasksPage] = useState(1);
  const [worksPage, setWorksPage] = useState(1);
  const [tcPage, setTcPage] = useState(1);
  const [pcPage, setPcPage] = useState(1);
  const [tasksSearch, setTasksSearch] = useState("");
  const [taskFilters, setTaskFilters] = useState<TaskFilterState>(getDefaultTaskFilters);
  const [taskSortBy, setTaskSortBy] = useState<TaskSortColumn | null>(null);
  const [taskSortDir, setTaskSortDir] = useState<"asc" | "desc">("asc");
  const [worksSearch, setWorksSearch] = useState("");
  const [tcSearch, setTcSearch] = useState("");
  const [pcSearch, setPcSearch] = useState("");

  const [selectedTask, setSelectedTask] = useState<TaskWithAssignmentDetails | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [workDialog, setWorkDialog] = useState<{ open: boolean; work: Work | null }>({ open: false, work: null });
  const [tcDialog, setTcDialog] = useState<{ open: boolean; contract: TranslationContract | null }>({ open: false, contract: null });
  const [pcDialog, setPcDialog] = useState<{ open: boolean; contract: ProofreadingContract | null }>({ open: false, contract: null });

  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useTasks();
  const { data: users = [] } = useUsers();
  const { data: works = [], isLoading: worksLoading } = useQuery({ queryKey: ["works"], queryFn: fetchWorks });
  const { data: translationContracts = [], isLoading: tcLoading } = useQuery({
    queryKey: ["translation-contracts"],
    queryFn: fetchTranslationContracts,
  });
  const { data: proofreadingContracts = [], isLoading: pcLoading } = useQuery({
    queryKey: ["proofreading-contracts"],
    queryFn: fetchProofreadingContracts,
  });
  const { data: componentsList = [] } = useQuery({ queryKey: ["components"], queryFn: fetchComponents });

  const taskStages = useMemo(
    () => Array.from(new Set(works.map((w) => w.stage).filter(Boolean))) as string[],
    [works]
  );
  const taskComponentOptions = useMemo(
    () => componentsList.map((c) => ({ id: c.id, name: c.name })),
    [componentsList]
  );

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (role === UserRole.EMPLOYEE) {
      list = list.filter((t) => t.assignee?.includes((user?.displayName ?? "").split(" ")[0]));
    }
    if (tasksSearch.trim()) {
      const q = tasksSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assignee?.toLowerCase().includes(q) ||
          t.group?.toLowerCase().includes(q)
      );
    }
    list = applyTaskFilters(list, taskFilters, works);
    return sortTasks(list, taskSortBy, taskSortDir);
  }, [tasks, role, user?.displayName, tasksSearch, taskFilters, works, taskSortBy, taskSortDir]);

  const handleTaskSort = (column: TaskSortColumn) => {
    setTaskSortBy((prev) => {
      if (prev === column) setTaskSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else setTaskSortDir("asc");
      return column;
    });
  };

  const getComponentName = (id: string | null) =>
    id ? (componentsList.find((c) => c.id === id)?.name ?? "—") : "—";

  const filteredWorks = useMemo(() => {
    if (!worksSearch.trim()) return works;
    const q = worksSearch.toLowerCase();
    return works.filter(
      (w) =>
        (w.titleVi && w.titleVi.toLowerCase().includes(q)) ||
        (w.stage && (formatStageDisplay(w.stage).toLowerCase().includes(q) || w.stage.includes(q))) ||
        (w.documentCode && w.documentCode.toLowerCase().includes(q)) ||
        getComponentName(w.componentId).toLowerCase().includes(q)
    );
  }, [works, worksSearch, componentsList]);

  const filteredTc = useMemo(() => {
    if (!tcSearch.trim()) return translationContracts;
    const q = tcSearch.toLowerCase();
    return translationContracts.filter(
      (c) =>
        (c.contractNumber && c.contractNumber.toLowerCase().includes(q)) ||
        getComponentName(c.componentId).toLowerCase().includes(q)
    );
  }, [translationContracts, tcSearch, componentsList]);

  const filteredPc = useMemo(() => {
    if (!pcSearch.trim()) return proofreadingContracts;
    const q = pcSearch.toLowerCase();
    return proofreadingContracts.filter(
      (c) =>
        (c.contractNumber && c.contractNumber.toLowerCase().includes(q)) ||
        (c.proofreaderName && c.proofreaderName.toLowerCase().includes(q)) ||
        getComponentName(c.componentId).toLowerCase().includes(q)
    );
  }, [proofreadingContracts, pcSearch, componentsList]);

  const paginatedTasks = useMemo(() => {
    const start = (tasksPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, tasksPage]);
  const totalTasksPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));

  const paginatedWorks = useMemo(() => {
    const start = (worksPage - 1) * PAGE_SIZE;
    return filteredWorks.slice(start, start + PAGE_SIZE);
  }, [filteredWorks, worksPage]);
  const totalWorksPages = Math.max(1, Math.ceil(filteredWorks.length / PAGE_SIZE));

  const paginatedTc = useMemo(() => {
    const start = (tcPage - 1) * PAGE_SIZE;
    return filteredTc.slice(start, start + PAGE_SIZE);
  }, [filteredTc, tcPage]);
  const totalTcPages = Math.max(1, Math.ceil(filteredTc.length / PAGE_SIZE));

  const paginatedPc = useMemo(() => {
    const start = (pcPage - 1) * PAGE_SIZE;
    return filteredPc.slice(start, start + PAGE_SIZE);
  }, [filteredPc, pcPage]);
  const totalPcPages = Math.max(1, Math.ceil(filteredPc.length / PAGE_SIZE));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-orange-100 text-orange-700";
      case "Critical": return "bg-red-100 text-red-700";
      case "Medium": return "bg-blue-100 text-blue-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-700";
      case "In Progress": return "bg-blue-50 text-blue-700";
      case "Blocked": return "bg-red-50 text-red-700";
      default: return "bg-gray-100 text-gray-700";
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
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const updateWorkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
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
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["translation-contracts"] });
      setTcDialog({ open: false, contract: null });
      toast({ title: "Thành công", description: "Đã thêm hợp đồng dịch thuật." });
    },
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const updateTcMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(buildUrl(api.translationContracts.update.path, { id }), {
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
      queryClient.invalidateQueries({ queryKey: ["translation-contracts"] });
      setTcDialog({ open: false, contract: null });
      toast({ title: "Thành công", description: "Đã cập nhật hợp đồng dịch thuật." });
    },
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proofreading-contracts"] });
      setPcDialog({ open: false, contract: null });
      toast({ title: "Thành công", description: "Đã thêm hợp đồng hiệu đính." });
    },
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const updatePcMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(buildUrl(api.proofreadingContracts.update.path, { id }), {
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
      queryClient.invalidateQueries({ queryKey: ["proofreading-contracts"] });
      setPcDialog({ open: false, contract: null });
      toast({ title: "Thành công", description: "Đã cập nhật hợp đồng hiệu đính." });
    },
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const { mutate: createTask } = useCreateTask();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Thư ký hợp phần</h2>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="tasks">Công việc</TabsTrigger>
          <TabsTrigger value="works">Danh mục tác phẩm</TabsTrigger>
          <TabsTrigger value="translation">Hợp đồng dịch thuật</TabsTrigger>
          <TabsTrigger value="proofreading">Hợp đồng hiệu đính</TabsTrigger>
        </TabsList>

        {/* Tab: Tasks */}
        <TabsContent value="tasks" className="mt-6">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm công việc..."
                    className="pl-9"
                    value={tasksSearch}
                    onChange={(e) => setTasksSearch(e.target.value)}
                  />
                </div>
                <Badge variant="secondary">{filteredTasks.length} công việc</Badge>
              </div>
              {(role === UserRole.ADMIN || role === UserRole.MANAGER) && (
                <Button size="sm" onClick={() => setIsCreateTaskOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm công việc
                </Button>
              )}
            </div>
            <div className="px-4 py-3 border-b border-border/50 bg-muted/10">
              <TaskFilters
                users={users}
                components={taskComponentOptions}
                filters={taskFilters}
                onFiltersChange={(f) => setTaskFilters((prev) => ({ ...prev, ...f }))}
                stages={taskStages}
                showVoteFilter={true}
              />
            </div>
            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : tasksError ? (
              <div className="p-8 text-center text-muted-foreground">Không tải được danh sách công việc.</div>
            ) : (
              <>
                <TaskTable
                  tasks={paginatedTasks}
                  onTaskClick={setSelectedTask}
                  sortBy={taskSortBy}
                  sortDir={taskSortDir}
                  onSort={handleTaskSort}
                  getPriorityColor={getPriorityColor}
                  getStatusColor={getStatusColor}
                />
                {totalTasksPages > 1 && (
                  <div className="p-4 border-t flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => { e.preventDefault(); setTasksPage((p) => Math.max(1, p - 1)); }}
                            className={tasksPage <= 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalTasksPages }, (_, i) => i + 1).map((p) => (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => { e.preventDefault(); setTasksPage(p); }}
                              isActive={tasksPage === p}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => { e.preventDefault(); setTasksPage((p) => Math.min(totalTasksPages, p + 1)); }}
                            className={tasksPage >= totalTasksPages ? "pointer-events-none opacity-50" : ""}
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
            <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
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
                <Badge variant="secondary">{filteredWorks.length} tác phẩm</Badge>
              </div>
              <Button size="sm" onClick={() => setWorkDialog({ open: true, work: null })}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm tác phẩm
              </Button>
            </div>
            {worksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hợp phần</TableHead>
                        <TableHead>Tiêu đề (VI)</TableHead>
                        <TableHead>Tiêu đề Hán Nôm</TableHead>
                        <TableHead>Giai đoạn</TableHead>
                        <TableHead>Mã tài liệu</TableHead>
                        <TableHead className="text-right">Số chữ gốc</TableHead>
                        <TableHead className="text-right">Số trang gốc</TableHead>
                        <TableHead className="text-right">Hệ số ước tính</TableHead>
                        <TableHead className="text-right">Số chữ ước tính</TableHead>
                        <TableHead className="text-right">Số trang ước tính</TableHead>
                        <TableHead className="max-w-[120px] truncate">Ghi chú</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedWorks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                            Chưa có tác phẩm nào.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedWorks.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell className="max-w-[140px]">{getComponentName(w.componentId)}</TableCell>
                            <TableCell className="font-medium max-w-[180px]">{w.titleVi ?? "—"}</TableCell>
                            <TableCell className="max-w-[140px]">{w.titleHannom ?? "—"}</TableCell>
                            <TableCell>{formatStageDisplay(w.stage)}</TableCell>
                            <TableCell>{w.documentCode ?? "—"}</TableCell>
                            <TableCell className="text-right">{formatNumberAccounting(w.baseWordCount)}</TableCell>
                            <TableCell className="text-right">{formatNumberAccounting(w.basePageCount)}</TableCell>
                            <TableCell className="text-right">{w.estimateFactor != null ? formatNumberAccounting(w.estimateFactor, 1) : "—"}</TableCell>
                            <TableCell className="text-right">{formatNumberAccounting(w.estimateWordCount)}</TableCell>
                            <TableCell className="text-right">{formatNumberAccounting(w.estimatePageCount)}</TableCell>
                            <TableCell className="max-w-[120px] truncate" title={w.note ?? undefined}>{w.note ?? "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setWorkDialog({ open: true, work: w })}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalWorksPages > 1 && (
                  <div className="p-4 border-t flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setWorksPage((p) => Math.max(1, p - 1)); }} className={worksPage <= 1 ? "pointer-events-none opacity-50" : ""} />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalWorksPages) }, (_, i) => {
                          const p = i + 1;
                          return (
                            <PaginationItem key={p}>
                              <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setWorksPage(p); }} isActive={worksPage === p}>{p}</PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setWorksPage((p) => Math.min(totalWorksPages, p + 1)); }} className={worksPage >= totalWorksPages ? "pointer-events-none opacity-50" : ""} />
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
            <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Tìm số HĐ..." className="pl-9" value={tcSearch} onChange={(e) => setTcSearch(e.target.value)} />
                </div>
                <Badge variant="secondary">{filteredTc.length} hợp đồng</Badge>
              </div>
              <Button size="sm" onClick={() => setTcDialog({ open: true, contract: null })}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm hợp đồng dịch thuật
              </Button>
            </div>
            {tcLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Số HĐ</TableHead>
                        <TableHead>Hợp phần</TableHead>
                        <TableHead className="text-right">Đơn giá</TableHead>
                        <TableHead className="text-right">Kinh phí viết bài tổng quan</TableHead>
                        <TableHead className="text-right">Kinh phí dịch thuật</TableHead>
                        <TableHead className="text-right">Giá trị HĐ</TableHead>
                        <TableHead>Bắt đầu</TableHead>
                        <TableHead>Kết thúc</TableHead>
                        <TableHead>Gia hạn từ</TableHead>
                        <TableHead>Gia hạn đến</TableHead>
                        <TableHead>Hoàn thành TT</TableHead>
                        <TableHead className="text-right">Số chữ TT</TableHead>
                        <TableHead className="text-right">Số trang TT</TableHead>
                        <TableHead className="text-right">Tỷ lệ HT</TableHead>
                        <TableHead className="text-right">Giá quyết toán</TableHead>
                        <TableHead className="max-w-[100px] truncate">Ghi chú</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTc.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={17} className="text-center text-muted-foreground py-8">
                            Chưa có hợp đồng dịch thuật nào.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedTc.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.contractNumber ?? "—"}</TableCell>
                            <TableCell className="max-w-[140px]">{getComponentName(c.componentId)}</TableCell>
                            <TableCell className="text-right align-top">
                              <span>{formatNumberAccounting(c.unitPrice)}</span>
                              {c.unitPrice != null && c.unitPrice !== "" && (
                                <span className="text-xs text-muted-foreground block mt-0.5">{numberToVietnameseWords(c.unitPrice)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <span>{formatNumberAccounting(c.overviewValue)}</span>
                              {c.overviewValue != null && c.overviewValue !== "" && (
                                <span className="text-xs text-muted-foreground block mt-0.5">{numberToVietnameseWords(c.overviewValue)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <span>{formatNumberAccounting(c.translationValue)}</span>
                              {c.translationValue != null && c.translationValue !== "" && (
                                <span className="text-xs text-muted-foreground block mt-0.5">{numberToVietnameseWords(c.translationValue)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <span>{formatNumberAccounting(c.contractValue)}</span>
                              {c.contractValue != null && c.contractValue !== "" && (
                                <span className="text-xs text-muted-foreground block mt-0.5">{numberToVietnameseWords(c.contractValue)}</span>
                              )}
                            </TableCell>
                            <TableCell>{formatDateDDMMYYYY(c.startDate) || "—"}</TableCell>
                            <TableCell>{formatDateDDMMYYYY(c.endDate) || "—"}</TableCell>
                            <TableCell>{formatDateDDMMYYYY(c.extensionStartDate) || "—"}</TableCell>
                            <TableCell>{formatDateDDMMYYYY(c.extensionEndDate) || "—"}</TableCell>
                            <TableCell>{formatDateDDMMYYYY(c.actualCompletionDate) || "—"}</TableCell>
                            <TableCell className="text-right">{formatNumberAccounting(c.actualWordCount)}</TableCell>
                            <TableCell className="text-right">{formatNumberAccounting(c.actualPageCount)}</TableCell>
                            <TableCell className="text-right">{c.completionRate != null ? formatPercent(c.completionRate) : "—"}</TableCell>
                            <TableCell className="text-right align-top">
                              <span>{formatNumberAccounting(c.settlementValue)}</span>
                              {c.settlementValue != null && c.settlementValue !== "" && (
                                <span className="text-xs text-muted-foreground block mt-0.5">{numberToVietnameseWords(c.settlementValue)}</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[100px] truncate" title={c.note ?? undefined}>{c.note ?? "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setTcDialog({ open: true, contract: c })}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalTcPages > 1 && (
                  <div className="p-4 border-t flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setTcPage((p) => Math.max(1, p - 1)); }} className={tcPage <= 1 ? "pointer-events-none opacity-50" : ""} />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalTcPages) }, (_, i) => {
                          const p = i + 1;
                          return (
                            <PaginationItem key={p}>
                              <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setTcPage(p); }} isActive={tcPage === p}>{p}</PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setTcPage((p) => Math.min(totalTcPages, p + 1)); }} className={tcPage >= totalTcPages ? "pointer-events-none opacity-50" : ""} />
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
            <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Tìm số HĐ / biên tập viên..." className="pl-9" value={pcSearch} onChange={(e) => setPcSearch(e.target.value)} />
                </div>
                <Badge variant="secondary">{filteredPc.length} hợp đồng</Badge>
              </div>
              <Button size="sm" onClick={() => setPcDialog({ open: true, contract: null })}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm hợp đồng hiệu đính
              </Button>
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
                        <TableHead>Số HĐ</TableHead>
                        <TableHead>Hợp phần</TableHead>
                        <TableHead>Biên tập viên</TableHead>
                        <TableHead className="text-right">Số trang</TableHead>
                        <TableHead className="text-right">Tỷ lệ</TableHead>
                        <TableHead className="text-right">Giá trị HĐ</TableHead>
                        <TableHead>Bắt đầu</TableHead>
                        <TableHead>Kết thúc</TableHead>
                        <TableHead>Hoàn thành TT</TableHead>
                        <TableHead className="max-w-[100px] truncate">Ghi chú</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPc.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                            Chưa có hợp đồng hiệu đính nào.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedPc.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.contractNumber ?? "—"}</TableCell>
                            <TableCell className="max-w-[140px]">{getComponentName(c.componentId)}</TableCell>
                            <TableCell>{c.proofreaderName ?? "—"}</TableCell>
                            <TableCell className="text-right">{formatNumberAccounting(c.pageCount)}</TableCell>
                            <TableCell className="text-right">{c.rateRatio != null ? formatPercent(c.rateRatio) : "—"}</TableCell>
                            <TableCell className="text-right align-top">
                              <span>{formatNumberAccounting(c.contractValue)}</span>
                              {c.contractValue != null && c.contractValue !== "" && (
                                <span className="text-xs text-muted-foreground block mt-0.5">{numberToVietnameseWords(c.contractValue)}</span>
                              )}
                            </TableCell>
                            <TableCell>{formatDateDDMMYYYY(c.startDate) || "—"}</TableCell>
                            <TableCell>{formatDateDDMMYYYY(c.endDate) || "—"}</TableCell>
                            <TableCell>{formatDateDDMMYYYY(c.actualCompletionDate) || "—"}</TableCell>
                            <TableCell className="max-w-[100px] truncate" title={c.note ?? undefined}>{c.note ?? "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setPcDialog({ open: true, contract: c })}>
                                <Pencil className="w-4 h-4" />
                              </Button>
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
                          <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPcPage((p) => Math.max(1, p - 1)); }} className={pcPage <= 1 ? "pointer-events-none opacity-50" : ""} />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPcPages) }, (_, i) => {
                          const p = i + 1;
                          return (
                            <PaginationItem key={p}>
                              <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPcPage(p); }} isActive={pcPage === p}>{p}</PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPcPage((p) => Math.min(totalPcPages, p + 1)); }} className={pcPage >= totalPcPages ? "pointer-events-none opacity-50" : ""} />
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
      <TaskDialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} task={selectedTask} />
      <TaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        task={null}
        onCreate={(taskData) => {
          createTask(taskData, {
            onSuccess: () => {
              toast({ title: "Thành công", description: "Đã thêm công việc." });
              setIsCreateTaskOpen(false);
            },
            onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
          });
        }}
      />

      {/* Work create/edit dialog - simple form */}
      <Dialog open={workDialog.open} onOpenChange={(open) => setWorkDialog({ open, work: workDialog.work })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{workDialog.work ? "Chỉnh sửa tác phẩm" : "Thêm tác phẩm"}</DialogTitle>
            <DialogDescription>Danh mục tác phẩm dịch thuật.</DialogDescription>
          </DialogHeader>
          <WorkForm
            key={workDialog.work?.id ?? "new"}
            work={workDialog.work}
            componentsList={componentsList}
            onSubmit={(data) => {
              if (workDialog.work) updateWorkMutation.mutate({ id: workDialog.work.id, data });
              else createWorkMutation.mutate(data);
            }}
            isPending={createWorkMutation.isPending || updateWorkMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Translation contract dialog */}
      <Dialog open={tcDialog.open} onOpenChange={(open) => setTcDialog({ open, contract: tcDialog.contract })}>
        <DialogContent className="max-w-[90rem] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{tcDialog.contract ? "Chỉnh sửa hợp đồng dịch thuật" : "Thêm hợp đồng dịch thuật"}</DialogTitle>
            <DialogDescription>Hợp đồng dịch thuật gắn với tác phẩm.</DialogDescription>
          </DialogHeader>
          <TranslationContractForm
            key={tcDialog.contract?.id ?? "new"}
            contract={tcDialog.contract}
            works={works}
            componentsList={componentsList}
            queryClient={queryClient}
            onSubmit={(data) => {
              if (tcDialog.contract) updateTcMutation.mutate({ id: tcDialog.contract.id, data });
              else createTcMutation.mutate(data);
            }}
            isPending={createTcMutation.isPending || updateTcMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Proofreading contract dialog */}
      <Dialog open={pcDialog.open} onOpenChange={(open) => setPcDialog({ open, contract: pcDialog.contract })}>
        <DialogContent className="max-w-[90rem] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{pcDialog.contract ? "Chỉnh sửa hợp đồng hiệu đính" : "Thêm hợp đồng hiệu đính"}</DialogTitle>
            <DialogDescription>Hợp đồng hiệu đính gắn với hợp đồng dịch thuật.</DialogDescription>
          </DialogHeader>
          <ProofreadingContractForm
            key={pcDialog.contract?.id ?? "new"}
            contract={pcDialog.contract}
            works={works}
            translationContracts={translationContracts}
            componentsList={componentsList}
            queryClient={queryClient}
            onSubmit={(data) => {
              if (pcDialog.contract) updatePcMutation.mutate({ id: pcDialog.contract.id, data });
              else createPcMutation.mutate(data);
            }}
            isPending={createPcMutation.isPending || updatePcMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Contract stages (giai đoạn hợp đồng) subsection ---
async function fetchStages(
  translationContractId: string | null,
  proofreadingContractId: string | null
): Promise<ContractStage[]> {
  if (translationContractId) {
    const res = await fetch(buildUrl(api.contractStages.listByTranslationContract.path, { contractId: translationContractId }), { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  }
  if (proofreadingContractId) {
    const res = await fetch(buildUrl(api.contractStages.listByProofreadingContract.path, { contractId: proofreadingContractId }), { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  }
  return [];
}

function ContractStagesSection({
  translationContractId = null,
  proofreadingContractId = null,
  queryClient,
}: {
  translationContractId?: string | null;
  proofreadingContractId?: string | null;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { toast } = useToast();
  const contractId = translationContractId ?? proofreadingContractId ?? "";
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["contract-stages", contractId],
    queryFn: () => fetchStages(translationContractId ?? null, proofreadingContractId ?? null),
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
    setForm({ stageCode: "", stageOrder: "1", startDate: "", endDate: "", actualCompletionDate: "", note: "" });
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
      queryClient.invalidateQueries({ queryKey: ["contract-stages", contractId] });
      resetForm();
      toast({ title: "Đã thêm giai đoạn" });
    },
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(buildUrl(api.contractStages.update.path, { id }), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-stages", contractId] });
      resetForm();
      toast({ title: "Đã cập nhật giai đoạn" });
    },
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(buildUrl(api.contractStages.delete.path, { id }), { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Xóa thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-stages", contractId] });
      toast({ title: "Đã xóa giai đoạn" });
    },
    onError: (e) => toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const fillForm = (s: ContractStage) => {
    setForm({
      stageCode: parseStageNumber(s.stageCode),
      stageOrder: String(s.stageOrder ?? 1),
      startDate: s.startDate ? (s.startDate as string).slice(0, 10) : "",
      endDate: s.endDate ? (s.endDate as string).slice(0, 10) : "",
      actualCompletionDate: s.actualCompletionDate ? (s.actualCompletionDate as string).slice(0, 10) : "",
      note: s.note ?? "",
    });
    setEditingId(s.id);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = (form.stageCode && String(form.stageCode).replace(/\D/g, "")) || null;
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
    const code = (form.stageCode && String(form.stageCode).replace(/\D/g, "")) || null;
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
        {!adding && !editingId && (
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
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
                      <TableCell className="font-medium">{formatStageDisplay(s.stageCode)}</TableCell>
                      <TableCell>{s.stageOrder ?? "—"}</TableCell>
                      <TableCell>{formatDateDDMMYYYY(s.startDate) || "—"}</TableCell>
                      <TableCell>{formatDateDDMMYYYY(s.endDate) || "—"}</TableCell>
                      <TableCell>{formatDateDDMMYYYY(s.actualCompletionDate) || "—"}</TableCell>
                      <TableCell className="max-w-[100px] truncate" title={s.note ?? undefined}>{s.note ?? "—"}</TableCell>
                      <TableCell>
                        {editingId === s.id ? null : (
                          <>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => fillForm(s)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
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
          {(adding || editingId) && (
            <form
              onSubmit={editingId ? handleEditSubmit : handleAddSubmit}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t"
            >
              <Input type="number" min={1} placeholder="1, 2, 3..." value={form.stageCode} onChange={(e) => setForm((f) => ({ ...f, stageCode: e.target.value.replace(/\D/g, "") }))} />
              <Input type="number" placeholder="Thứ tự" value={form.stageOrder} onChange={(e) => setForm((f) => ({ ...f, stageOrder: e.target.value }))} />
              <Input type="date" placeholder="Bắt đầu" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              <Input type="date" placeholder="Kết thúc" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              <Input type="date" placeholder="HT thực tế" value={form.actualCompletionDate} onChange={(e) => setForm((f) => ({ ...f, actualCompletionDate: e.target.value }))} className="sm:col-span-2" />
              <Input placeholder="Ghi chú" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className="sm:col-span-2" />
              <div className="col-span-2 flex gap-2">
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Cập nhật" : "Thêm"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={resetForm}>
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
  isPending,
}: {
  work: Work | null;
  componentsList: Component[];
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [componentId, setComponentId] = useState(work?.componentId ?? "");
  const [titleVi, setTitleVi] = useState(work?.titleVi ?? "");
  const [titleHannom, setTitleHannom] = useState(work?.titleHannom ?? "");
  const [stage, setStage] = useState(() => parseStageNumber(work?.stage));
  const [documentCode, setDocumentCode] = useState(work?.documentCode ?? "");
  const [baseWordCount, setBaseWordCount] = useState(work?.baseWordCount != null ? String(work.baseWordCount) : "");
  const [basePageCount, setBasePageCount] = useState(work?.basePageCount != null ? String(work.basePageCount) : "");
  const [estimateFactor, setEstimateFactor] = useState(work?.estimateFactor != null ? String(work.estimateFactor) : "");
  const [estimateWordCount, setEstimateWordCount] = useState(work?.estimateWordCount != null ? String(work.estimateWordCount) : "");
  const [estimatePageCount, setEstimatePageCount] = useState(work?.estimatePageCount != null ? String(work.estimatePageCount) : "");
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
      estimateFactor: estimateFactor != null && estimateFactor !== "" ? String(estimateFactor) : null,
      estimateWordCount: estimateWordCount ? parseInt(estimateWordCount, 10) : null,
      estimatePageCount: estimatePageCount ? parseInt(estimatePageCount, 10) : null,
      note: note || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid gap-2">
        <Label>Hợp phần</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={componentId}
          onChange={(e) => setComponentId(e.target.value)}
        >
          <option value="">— Chọn hợp phần —</option>
          {componentsList.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Tiêu đề (tiếng Việt)</Label>
          <Input value={titleVi} onChange={(e) => setTitleVi(e.target.value)} placeholder="VD: Phật tạng toàn dịch" />
        </div>
        <div className="grid gap-2">
          <Label>Tiêu đề Hán Nôm</Label>
          <Input value={titleHannom} onChange={(e) => setTitleHannom(e.target.value)} placeholder="Hán Nôm" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Giai đoạn</Label>
          <Input type="number" min={1} value={stage} onChange={(e) => setStage(e.target.value.replace(/\D/g, ""))} placeholder="1, 2, 3..." />
        </div>
        <div className="grid gap-2">
          <Label>Mã tài liệu</Label>
          <Input value={documentCode} onChange={(e) => setDocumentCode(e.target.value)} placeholder="Mã tài liệu" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>Số chữ gốc</Label>
          <Input
            type="number"
            value={baseWordCount}
            onChange={(e) => {
              const v = e.target.value;
              setBaseWordCount(v);
              const n = v ? parseInt(v, 10) : NaN;
              setBasePageCount(!isNaN(n) ? String(charsToPages(n)) : "");
              const f = estimateFactor ? parseFloat(estimateFactor) : NaN;
              if (!isNaN(n) && !isNaN(f)) {
                setEstimateWordCount(String(Math.round(n * f)));
                setEstimatePageCount(String(charsToPages(Math.round(n * f))));
              }
            }}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>Số trang gốc <span className="text-muted-foreground font-normal">(350 chữ/trang)</span></Label>
          <Input type="number" value={basePageCount} onChange={(e) => setBasePageCount(e.target.value)} placeholder="0" />
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
          <Label>Số chữ ước tính <span className="text-muted-foreground font-normal">(số chữ gốc × hệ số)</span></Label>
          <Input
            type="number"
            value={estimateWordCount}
            onChange={(e) => {
              const v = e.target.value;
              setEstimateWordCount(v);
              const n = v ? parseInt(v, 10) : NaN;
              setEstimatePageCount(!isNaN(n) ? String(charsToPages(n)) : "");
            }}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>Số trang ước tính <span className="text-muted-foreground font-normal">(350 chữ/trang)</span></Label>
          <Input type="number" value={estimatePageCount} onChange={(e) => setEstimatePageCount(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Ghi chú</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú" />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
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
  componentsList,
  queryClient,
  onSubmit,
  isPending,
}: {
  contract: TranslationContract | null;
  works: Work[];
  componentsList: Component[];
  queryClient: ReturnType<typeof useQueryClient>;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [contractNumber, setContractNumber] = useState(contract?.contractNumber ?? "");
  const [componentId, setComponentId] = useState(contract?.componentId ?? "");
  const [workId, setWorkId] = useState(contract?.workId ?? "");
  const [unitPrice, setUnitPrice] = useState(contract?.unitPrice != null ? String(contract.unitPrice) : "");
  const [overviewValue, setOverviewValue] = useState(contract?.overviewValue != null ? String(contract.overviewValue) : "");
  const [translationValue, setTranslationValue] = useState(contract?.translationValue != null ? String(contract.translationValue) : "");
  const [contractValue, setContractValue] = useState(contract?.contractValue != null ? String(contract.contractValue) : "");
  const [startDate, setStartDate] = useState(contract?.startDate ? (contract.startDate as string).slice(0, 10) : "");
  const [endDate, setEndDate] = useState(contract?.endDate ? (contract.endDate as string).slice(0, 10) : "");
  const [extensionStartDate, setExtensionStartDate] = useState(contract?.extensionStartDate ? (contract.extensionStartDate as string).slice(0, 10) : "");
  const [extensionEndDate, setExtensionEndDate] = useState(contract?.extensionEndDate ? (contract.extensionEndDate as string).slice(0, 10) : "");
  const [actualCompletionDate, setActualCompletionDate] = useState(contract?.actualCompletionDate ? (contract.actualCompletionDate as string).slice(0, 10) : "");
  const [actualWordCount, setActualWordCount] = useState(contract?.actualWordCount != null ? String(contract.actualWordCount) : "");
  const [actualPageCount, setActualPageCount] = useState(contract?.actualPageCount != null ? String(contract.actualPageCount) : "");
  const [completionRate, setCompletionRate] = useState(contract?.completionRate != null ? String(Number(contract.completionRate) * 100) : "");
  const [settlementValue, setSettlementValue] = useState(contract?.settlementValue != null ? String(contract.settlementValue) : "");
  const [note, setNote] = useState(contract?.note ?? "");

  // Kinh phí dịch thuật = đơn giá × số trang dự tính
  useEffect(() => {
    const selectedWork = works.find((w) => w.id === workId);
    const estimatePageCount = selectedWork?.estimatePageCount != null ? Number(selectedWork.estimatePageCount) : 0;
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
    const trans = translationValue.trim() === "" ? 0 : parseFloat(translationValue);
    const over = overviewValue.trim() === "" ? 0 : parseFloat(overviewValue);
    const total = (Number.isNaN(trans) ? 0 : trans) + (Number.isNaN(over) ? 0 : over);
    setContractValue(total.toFixed(2));
  }, [translationValue, overviewValue]);

  // Khi bản dịch đã hoàn thành (có ngày hoàn thành thực tế): tự tính Tỷ lệ hoàn thành và Giá trị quyết toán
  // Tỷ lệ hoàn thành = actual_page_count / estimate_page_count (works) * 100%
  // Giá trị quyết toán = (actual_page_count * unit_price) + overview_value
  useEffect(() => {
    if (actualCompletionDate.trim() === "") return;
    const selectedWork = works.find((w) => w.id === workId);
    const estimatePageCount = selectedWork?.estimatePageCount != null ? Number(selectedWork.estimatePageCount) : 0;
    const actualPages = actualPageCount.trim() === "" ? NaN : parseInt(actualPageCount, 10);
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
  }, [actualCompletionDate, actualPageCount, workId, unitPrice, overviewValue, works]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Gửi số dưới dạng chuỗi để API/Zod (drizzle-zod numeric) không báo 400
    const num = (v: string | null) => (v != null && v !== "" ? String(Number(v)) : null);
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
      completionRate: completionRate ? num(String(Number(completionRate) / 100)) : null,
      settlementValue: settlementValue ? num(settlementValue) : null,
      note: note || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 flex-1 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-4">
        <div className="grid gap-2">
          <Label>Số hợp đồng</Label>
          <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="Số HĐ" />
        </div>
        <div className="grid gap-2">
          <Label>Hợp phần</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={componentId}
            onChange={(e) => setComponentId(e.target.value)}
          >
            <option value="">— Chọn hợp phần —</option>
            {componentsList.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label>Tác phẩm</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
          >
            <option value="">— Chọn tác phẩm —</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>{w.titleVi ?? w.documentCode ?? w.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4">
        <div className="grid gap-2">
          <Label>Đơn giá</Label>
          <Input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0" />
          {unitPrice.trim() !== "" && !Number.isNaN(parseFloat(unitPrice)) && (
            <p className="text-xs text-muted-foreground">{numberToVietnameseWords(unitPrice)}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label>Kinh phí viết bài tổng quan</Label>
          <Input type="number" step="0.01" value={overviewValue} onChange={(e) => setOverviewValue(e.target.value)} placeholder="0" />
          {overviewValue.trim() !== "" && !Number.isNaN(parseFloat(overviewValue)) && (
            <p className="text-xs text-muted-foreground">{numberToVietnameseWords(overviewValue)}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label>Kinh phí dịch thuật <span className="text-muted-foreground font-normal">(đơn giá × số trang dự tính)</span></Label>
          <Input type="number" step="0.01" readOnly value={translationValue} placeholder="0" className="bg-muted" />
          {translationValue.trim() !== "" && !Number.isNaN(parseFloat(translationValue)) && (
            <p className="text-xs text-muted-foreground">{numberToVietnameseWords(translationValue)}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label>Giá trị hợp đồng <span className="text-muted-foreground font-normal">(kinh phí dịch thuật + kinh phí tổng quan)</span></Label>
          <Input type="number" step="0.01" readOnly value={contractValue} placeholder="0" className="bg-muted" />
          {contractValue.trim() !== "" && !Number.isNaN(parseFloat(contractValue)) && (
            <p className="text-xs text-muted-foreground">{numberToVietnameseWords(contractValue)}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4">
        <div className="grid gap-2">
          <Label>Ngày bắt đầu</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Ngày kết thúc</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Hoàn thành thực tế</Label>
          <Input type="date" value={actualCompletionDate} onChange={(e) => setActualCompletionDate(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Gia hạn từ</Label>
          <Input type="date" value={extensionStartDate} onChange={(e) => setExtensionStartDate(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Gia hạn đến</Label>
          <Input type="date" value={extensionEndDate} onChange={(e) => setExtensionEndDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4">
        <div className="grid gap-2">
          <Label>Số chữ thực tế</Label>
          <Input
            type="number"
            value={actualWordCount}
            onChange={(e) => {
              const v = e.target.value;
              setActualWordCount(v);
              const n = v ? parseInt(v, 10) : NaN;
              setActualPageCount(!isNaN(n) ? String(charsToPages(n)) : "");
            }}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>Số trang thực tế <span className="text-muted-foreground font-normal">(350 chữ/trang)</span></Label>
          <Input type="number" value={actualPageCount} onChange={(e) => setActualPageCount(e.target.value)} placeholder="0" />
        </div>
        <div className="grid gap-2">
          <Label>Tỷ lệ hoàn thành (%)</Label>
          <Input type="number" step="0.01" value={completionRate} onChange={(e) => setCompletionRate(e.target.value)} placeholder="0" />
        </div>
        <div className="grid gap-2">
          <Label>Giá quyết toán</Label>
          <Input type="number" step="0.01" value={settlementValue} onChange={(e) => setSettlementValue(e.target.value)} placeholder="0" />
          {settlementValue.trim() !== "" && !Number.isNaN(parseFloat(settlementValue)) && (
            <p className="text-xs text-muted-foreground">{numberToVietnameseWords(settlementValue)}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-4">
        <div className="grid gap-2 sm:col-span-2">
          <Label>Ghi chú</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú" />
        </div>
      </div>
      {contract && (
        <ContractStagesSection
          translationContractId={contract.id}
          queryClient={queryClient}
        />
      )}
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {contract ? "Cập nhật" : "Thêm"}
        </Button>
      </DialogFooter>
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
}: {
  contract: ProofreadingContract | null;
  works: Work[];
  translationContracts: TranslationContract[];
  componentsList: Component[];
  queryClient: ReturnType<typeof useQueryClient>;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [contractNumber, setContractNumber] = useState(contract?.contractNumber ?? "");
  const [componentId, setComponentId] = useState(contract?.componentId ?? "");
  const [workId, setWorkId] = useState(contract?.workId ?? "");
  const [translationContractId, setTranslationContractId] = useState(contract?.translationContractId ?? "");
  const [proofreaderName, setProofreaderName] = useState(contract?.proofreaderName ?? "");
  const [pageCount, setPageCount] = useState(contract?.pageCount != null ? String(contract.pageCount) : "");
  const [rateRatio, setRateRatio] = useState(contract?.rateRatio != null ? String(Number(contract.rateRatio) * 100) : "");
  const [contractValue, setContractValue] = useState(contract?.contractValue != null ? String(contract.contractValue) : "");
  const [startDate, setStartDate] = useState(contract?.startDate ? (contract.startDate as string).slice(0, 10) : "");
  const [endDate, setEndDate] = useState(contract?.endDate ? (contract.endDate as string).slice(0, 10) : "");
  const [actualCompletionDate, setActualCompletionDate] = useState(contract?.actualCompletionDate ? (contract.actualCompletionDate as string).slice(0, 10) : "");
  const [note, setNote] = useState(contract?.note ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      contractNumber: contractNumber || null,
      componentId: componentId || null,
      workId: workId || null,
      translationContractId: translationContractId || null,
      proofreaderName: proofreaderName || null,
      pageCount: pageCount ? parseInt(pageCount, 10) : null,
      rateRatio: rateRatio ? parseFloat(rateRatio) / 100 : null,
      contractValue: contractValue ? parseFloat(contractValue) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      actualCompletionDate: actualCompletionDate || null,
      note: note || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 flex-1 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-4">
        <div className="grid gap-2">
          <Label>Số hợp đồng</Label>
          <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="Số HĐ" />
        </div>
        <div className="grid gap-2">
          <Label>Hợp phần</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={componentId}
            onChange={(e) => setComponentId(e.target.value)}
          >
            <option value="">— Chọn hợp phần —</option>
            {componentsList.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label>Biên tập viên / Người hiệu đính</Label>
          <Input value={proofreaderName} onChange={(e) => setProofreaderName(e.target.value)} placeholder="Họ tên" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4">
        <div className="grid gap-2">
          <Label>Số trang</Label>
          <Input type="number" value={pageCount} onChange={(e) => setPageCount(e.target.value)} placeholder="0" />
        </div>
        <div className="grid gap-2">
          <Label>Tỷ lệ (%)</Label>
          <Input type="number" step="0.01" value={rateRatio} onChange={(e) => setRateRatio(e.target.value)} placeholder="0" />
        </div>
        <div className="grid gap-2">
          <Label>Giá trị hợp đồng</Label>
          <Input type="number" step="0.01" value={contractValue} onChange={(e) => setContractValue(e.target.value)} placeholder="0" />
          {contractValue.trim() !== "" && !Number.isNaN(parseFloat(contractValue)) && (
            <p className="text-xs text-muted-foreground">{numberToVietnameseWords(contractValue)}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-4">
        <div className="grid gap-2">
          <Label>Tác phẩm</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
          >
            <option value="">— Chọn tác phẩm —</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>{w.titleVi ?? w.documentCode ?? w.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Hợp đồng dịch thuật (liên kết)</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={translationContractId}
            onChange={(e) => setTranslationContractId(e.target.value)}
          >
            <option value="">— Chọn HĐ dịch thuật —</option>
            {translationContracts.map((c) => (
              <option key={c.id} value={c.id}>{c.contractNumber ?? c.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4">
        <div className="grid gap-2">
          <Label>Ngày bắt đầu</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Ngày kết thúc</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Hoàn thành thực tế</Label>
          <Input type="date" value={actualCompletionDate} onChange={(e) => setActualCompletionDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-10 gap-4">
        <div className="grid gap-2 sm:col-span-2">
          <Label>Ghi chú</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú" />
        </div>
      </div>
      {contract && (
        <ContractStagesSection
          proofreadingContractId={contract.id}
          queryClient={queryClient}
        />
      )}
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {contract ? "Cập nhật" : "Thêm"}
        </Button>
      </DialogFooter>
    </form>
  );
}
