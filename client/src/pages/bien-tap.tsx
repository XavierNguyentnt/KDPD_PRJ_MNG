import { useMemo, useState } from "react";
import {
  useTasks,
  useRefreshTasks,
  useCreateTask,
  useDeleteTask,
  UserRole,
} from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import {
  useWorks,
  useComponents,
  useUsers,
} from "@/hooks/use-works-and-components";
import { TaskStatsBadgesOnly } from "@/components/task-stats";
import { TaskDialog } from "@/components/task-dialog";
import {
  TaskTable,
  sortTasks,
  type TaskSortColumn,
} from "@/components/task-table";
import { TaskKanbanBoard } from "@/components/task-kanban-board";
import {
  TaskFilters,
  getDefaultTaskFilters,
  applyTaskFilters,
  type TaskFilterState,
} from "@/components/task-filters";
import { BienTapWorkProgress } from "@/components/bien-tap-work-progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import {
  Loader2,
  RefreshCw,
  Search,
  AlertTriangle,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { format } from "date-fns";
import {
  normalizeSearch,
  buildExportPrefix,
  formatDateDDMMYYYY,
} from "@/lib/utils";
import * as XLSX from "xlsx";
import type { TaskWithAssignmentDetails as TTask } from "@shared/schema";

function handleExportTasks(
  filteredTasks: TTask[],
  language: string,
  toast: (opts: any) => any,
  works: Array<{
    id: string;
    titleVi?: string | null;
    titleHannom?: string | null;
    documentCode?: string | null;
    componentId?: string | null;
    stage?: string | null;
  }>,
  components: Array<{ id: string; name?: string | null }>,
) {
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

  const viStatus = (s: string | null | undefined): string => {
    switch (s) {
      case "Not Started":
        return "Chưa bắt đầu";
      case "In Progress":
        return "Đang thực hiện";
      case "Completed":
        return "Hoàn thành";
      case "Pending":
        return "Tạm dừng";
      case "Cancelled":
        return "Đã hủy";
      default:
        return s ?? "";
    }
  };
  const viPriority = (p: string | null | undefined): string => {
    switch (p) {
      case "Critical":
        return "Khẩn cấp";
      case "High":
        return "Cao";
      case "Medium":
        return "Trung bình";
      case "Low":
        return "Thấp";
      default:
        return p ?? "";
    }
  };
  const viVote = (v: string | null | undefined): string => {
    if (!v) return "";
    const s = v.toLowerCase();
    if (s === "tot") return "Hoàn thành tốt";
    if (s === "kha") return "Hoàn thành khá";
    if (s === "khong_tot") return "Không tốt";
    if (s === "khong_hoan_thanh") return "Không hoàn thành";
    return v;
  };
  const workById = new Map((works || []).map((w) => [w.id, w]));
  const compById = new Map((components || []).map((c) => [c.id, c]));

  const headers = [
    "ID",
    "Tiêu đề",
    "Loại bông",
    "Nhóm",
    "Trạng thái",
    "Mức độ ưu tiên",
    "Tiến độ (%)",
    "Mô tả",
    "Loại công việc",
    "Đánh giá",
    "Tác phẩm liên quan",
    "Hợp phần",
    "GĐ",
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
    const assignments = Array.isArray(task.assignments) ? task.assignments : [];
    const persons: Array<{
      roleLabel: string;
      name: string;
      received: string;
      due: string;
      completed: string;
    }> = [];
    const getName = (a: any) => a?.displayName ?? a?.userId ?? "";
    const btv1 = assignments.find((a) => a.stageType === "btv1");
    const btv2 = assignments.find((a) => a.stageType === "btv2");
    const doc = assignments.find((a) => a.stageType === "doc_duyet");
    if (btv1)
      persons.push({
        roleLabel: "BTV 1",
        name: getName(btv1),
        received: formatDateDDMMYYYY(btv1.receivedAt as any),
        due: formatDateDDMMYYYY(btv1.dueDate as any),
        completed: formatDateDDMMYYYY(btv1.completedAt as any),
      });
    if (btv2)
      persons.push({
        roleLabel: "BTV 2",
        name: getName(btv2),
        received: formatDateDDMMYYYY(btv2.receivedAt as any),
        due: formatDateDDMMYYYY(btv2.dueDate as any),
        completed: formatDateDDMMYYYY(btv2.completedAt as any),
      });
    if (doc)
      persons.push({
        roleLabel: "Người đọc duyệt",
        name: getName(doc),
        received: formatDateDDMMYYYY(doc.receivedAt as any),
        due: formatDateDDMMYYYY(doc.dueDate as any),
        completed: formatDateDDMMYYYY(doc.completedAt as any),
      });
    if (persons.length === 0) {
      persons.push({
        roleLabel: "",
        name: "",
        received: "",
        due: "",
        completed: "",
      });
    }

    let loaiBong = "";
    try {
      const wf = (
        task.workflow && typeof task.workflow === "string"
          ? JSON.parse(task.workflow)
          : task.workflow
      ) as any;
      if (wf?.rounds && Array.isArray(wf.rounds)) {
        const current =
          wf.rounds.find((r: any) => r?.roundNumber === wf.currentRound) ||
          wf.rounds[0];
        loaiBong = current?.roundType ?? "";
      }
    } catch {}
    const w = task.relatedWorkId ? workById.get(task.relatedWorkId) : null;
    const tacPham = w?.titleVi ?? w?.documentCode ?? w?.titleHannom ?? "";
    const hopPhan = w?.componentId
      ? (compById.get(w.componentId)?.name ?? "")
      : "";
    const giaiDoan = w?.stage ?? "";

    const startRow = sheetData.length + 1; // header is row 1
    rowBlocks.push({ startRow, height: persons.length });

    persons.forEach((p) => {
      sheetData.push([
        task.id,
        task.title ?? "",
        loaiBong,
        task.group ?? "",
        viStatus(task.status),
        viPriority(task.priority),
        typeof task.progress === "number" ? task.progress : "",
        task.description ?? "",
        (task as any).taskType ?? "",
        viVote((task as any).vote),
        tacPham,
        hopPhan,
        giaiDoan,
        (p.roleLabel ? `${p.roleLabel}: ` : "") + (p.name || ""),
        p.received,
        p.due,
        p.completed,
        (task as any).notes ?? "",
        formatDateDDMMYYYY(task.createdAt as any),
        formatDateDDMMYYYY(task.updatedAt as any),
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
      worksheet["!merges"].push({ s: { r: startR0, c }, e: { r: endR0, c } });
    });
  });

  // Style header: bold + centered; borders for all cells; center dates
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    const cell = worksheet[addr];
    if (cell) {
      cell.s = {
        font: { bold: true },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        },
      };
    }
  }
  const dateCols = [14, 15, 16];
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
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

  const prefix = buildExportPrefix();
  XLSX.writeFile(workbook, `${prefix}_Bien_Tap_Tasks.xlsx`);
}

export default function BienTapPage() {
  const { data: tasks, isLoading, isError } = useTasks();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { role, user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TaskFilterState>(
    getDefaultTaskFilters,
  );
  const [sortBy, setSortBy] = useState<TaskSortColumn | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedTask, setSelectedTask] =
    useState<TaskWithAssignmentDetails | null>(null);
  const [taskDialogMode, setTaskDialogMode] = useState<"view" | "edit">("view");
  const [deleteTaskConfirmOpen, setDeleteTaskConfirmOpen] = useState(false);
  const [deleteTaskTarget, setDeleteTaskTarget] =
    useState<TaskWithAssignmentDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  const { data: works = [] } = useWorks();
  const { data: components = [] } = useComponents();
  const { data: users = [] } = useUsers();
  const stages = useMemo(
    () =>
      Array.from(
        new Set(works.map((w) => w.stage).filter(Boolean)),
      ) as string[],
    [works],
  );
  const componentOptions = useMemo(
    () => components.map((c) => ({ id: c.id, name: c.name })),
    [components],
  );

  const bienTapTasksScoped = useMemo(() => {
    if (!tasks) return [];
    let list = tasks.filter((t) => t.group === "Biên tập");
    if (role === UserRole.EMPLOYEE) {
      const uid = user?.id ?? null;
      if (uid) {
        list = list.filter(
          (t) =>
            t.assigneeId === uid ||
            (Array.isArray(t.assignments)
              ? t.assignments.some((a: any) => a?.userId === uid)
              : false),
        );
      } else {
        const exact = (user?.displayName ?? "").trim();
        list = list.filter((t) => (t.assignee ?? "").trim() === exact);
      }
    }
    return list;
  }, [tasks, role, user?.displayName]);

  const filteredTasks = useMemo(() => {
    let list = bienTapTasksScoped;
    if (search.trim()) {
      const q = normalizeSearch(search.trim());
      list = list.filter(
        (t) =>
          normalizeSearch(t.title ?? "").includes(q) ||
          normalizeSearch(t.description ?? "").includes(q) ||
          normalizeSearch(t.assignee ?? "").includes(q) ||
          normalizeSearch(t.id ?? "").includes(q),
      );
    }
    list = applyTaskFilters(list, filters, works);
    return sortTasks(list, sortBy, sortDir);
    return sortTasks(list, sortBy, sortDir);
  }, [bienTapTasksScoped, search, filters, works, sortBy, sortDir]);

  const handleSort = (column: TaskSortColumn) => {
    setSortBy((prev) => {
      if (prev === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else setSortDir("asc");
      return column;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-orange-100 text-orange-700 hover:bg-orange-100/80";
      case "Critical":
        return "bg-red-100 text-red-700 hover:bg-red-100/80";
      case "Medium":
        return "bg-blue-100 text-blue-700 hover:bg-blue-100/80";
      default:
        return "bg-slate-100 text-slate-700 hover:bg-slate-100/80";
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700 hover:bg-green-100/80";
      case "In Progress":
        return "bg-blue-50 text-blue-700 hover:bg-blue-50/80 border-blue-200";
      case "Pending":
        return "bg-amber-100 text-amber-700 hover:bg-amber-100/80";
      case "Cancelled":
        return "bg-red-100 text-red-700 hover:bg-red-100/80";
      default:
        return "bg-slate-100 text-slate-700 hover:bg-slate-100/80";
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">{t.common.loading}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-2">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">{t.errors.failedToLoad}</h2>
        <p className="text-muted-foreground max-w-md">
          {t.errors.failedToLoad}
        </p>
        <Button onClick={() => refresh()} disabled={isRefreshing}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {t.errors.retryConnection}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="tasks">Công việc biên tập</TabsTrigger>
          <TabsTrigger value="progress">
            Theo dõi tiến độ theo tác phẩm
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-8">
          {/* Overview Stats */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  Quản lý công việc biên tập với các nhân sự: BTV 1, BTV 2,
                  Người Đọc duyệt...
                </p>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {t.dashboard.lastSynced}: {format(new Date(), "h:mm a")}
                <Button
                  variant="outline"
                  size="sm"
                  className="btn-icon"
                  onClick={() => refresh()}
                  disabled={isRefreshing}>
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                </Button>
              </div>
            </div>
            <TaskStatsBadgesOnly tasks={filteredTasks} />
          </section>

          {/* Task List */}
          <section className="section-card">
            <div className="section-header">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <h3 className="font-semibold mr-2">{t.dashboard.tasks}</h3>
                <Badge variant="secondary" className="font-normal">
                  {filteredTasks.length} {t.dashboard.tasks.toLowerCase()}
                </Badge>
                {(role === UserRole.ADMIN || role === UserRole.MANAGER) && (
                  <Button
                    size="sm"
                    onClick={() => setIsCreateDialogOpen(true)}
                    disabled={isCreating}
                    className="ml-2">
                    <Plus className="w-4 h-4 mr-2" />
                    {t.dashboard.createNew}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={
                      t.common.search +
                      " " +
                      t.dashboard.tasks.toLowerCase() +
                      "..."
                    }
                    className="search-input pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(v) =>
                    v && (v === "table" || v === "board") && setViewMode(v)
                  }
                  className="toggle-group-box">
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
                <Button
                  onClick={() =>
                    handleExportTasks(
                      filteredTasks,
                      language,
                      toast,
                      works,
                      components,
                    )
                  }
                  disabled={filteredTasks.length === 0}>
                  Xuất Excel
                </Button>
              </div>
            </div>

            <div className="filter-bar">
              <TaskFilters
                users={users}
                components={componentOptions}
                filters={filters}
                onFiltersChange={(f) =>
                  setFilters((prev) => ({ ...prev, ...f }))
                }
                stages={stages}
                showVoteFilter={true}
              />
            </div>

            {viewMode === "table" ? (
              <TaskTable
                tasks={filteredTasks}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setTaskDialogMode("view");
                }}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
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
                columns={{
                  id: true,
                  title: true,
                  assignee: true,
                  priority: true,
                  status: true,
                  dueDate: true,
                  progress: true,
                  receivedDate: true,
                  actualCompletedAt: true,
                  vote: true,
                  group: false,
                }}
              />
            ) : (
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
            )}
          </section>
        </TabsContent>

        <TabsContent value="progress">
          <section>
            <BienTapWorkProgress
              tasks={bienTapTasksScoped}
              works={works}
              components={components.map((c) => ({ id: c.id, name: c.name }))}
            />
          </section>
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        mode={taskDialogMode}
      />

      <TaskDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => setIsCreateDialogOpen(open)}
        task={null}
        defaultGroup="Biên tập"
        onCreate={(taskData) => {
          createTask(
            { ...taskData, group: taskData.group || "Biên tập" },
            {
              onSuccess: () => {
                toast({
                  title: t.common.success,
                  description:
                    t.task.createNew +
                    " " +
                    (language === "vi" ? "thành công" : "successfully"),
                });
                setIsCreateDialogOpen(false);
              },
              onError: (error) => {
                toast({
                  title: t.common.error,
                  description: error.message || t.errors.failedToCreate,
                  variant: "destructive",
                });
              },
            },
          );
        }}
        isCreating={isCreating}
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
              disabled={isDeleting}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
