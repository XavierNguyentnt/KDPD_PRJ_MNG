import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useTaskListControls } from "@/hooks/use-task-list-controls";
import {
  useWorks,
  useComponents,
  useTaskFilterStaffUsers,
} from "@/hooks/use-works-and-components";
import {
  getTaskStatsBadgeKeyFromFilters,
  TaskStatsBadgesOnly,
  toggleTaskStatsBadgeInFilters,
} from "@/components/task-stats";
import { TaskDialog } from "@/components/task-dialog";
import { TaskTable } from "@/components/task-table";
import { TaskKanbanBoard } from "@/components/task-kanban-board";
import { TaskFilters } from "@/components/task-filters";
import { BienTapWorkProgress } from "@/components/bien-tap-work-progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
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
  RefreshCw,
  Search,
  AlertTriangle,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";
import { TaskTableSkeleton } from "@/components/ui/skeletons";
import { GroupPageHero } from "@/components/group-page-hero";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { format } from "date-fns";
import {
  exportTasksToExcel,
  defaultAssignmentLabel,
  getTaskStatusColor,
  getTaskPriorityColor,
} from "@/lib/utils";
import type { TaskWithAssignmentDetails as TTask } from "@shared/schema";

type WorkExportItem = {
  id: string;
  titleVi?: string | null;
  titleHannom?: string | null;
  documentCode?: string | null;
  componentId?: string | null;
  stage?: string | null;
};

const getBTAssignmentLabel = (stageType: string): string => {
  if (stageType === "btv1") return "BTV 1";
  if (stageType === "btv2") return "BTV 2";
  if (stageType === "doc_duyet") return "Người đọc duyệt";
  return defaultAssignmentLabel(stageType);
};

function getBienTapRoundType(task: TTask): string {
  try {
    const wf = (
      task.workflow && typeof task.workflow === "string"
        ? JSON.parse(task.workflow)
        : task.workflow
    ) as any;
    if (wf?.rounds && Array.isArray(wf.rounds)) {
      const cur =
        wf.rounds.find((r: any) => r?.roundNumber === wf.currentRound)
        || wf.rounds[0];
      return cur?.roundType ?? "";
    }
  } catch {}
  return "";
}

const getTaskStatusBadgeClass = (s: string) => getTaskStatusColor(s).badge;
const getTaskPriorityBadgeClass = (p: string) => getTaskPriorityColor(p).badge;

async function handleExportTasks(
  filteredTasks: TTask[],
  language: string,
  toast: (opts: any) => any,
  works: WorkExportItem[],
  components: Array<{ id: string; name?: string | null }>,
) {
  const noData = language === "vi" ? "Không có dữ liệu" : "No data";
  const noDesc = language === "vi"
    ? "Không có công việc để xuất Excel."
    : "No tasks to export.";
  const workById = new Map((works || []).map((w) => [w.id, w]));
  const compById = new Map((components || []).map((c) => [c.id, c.name]));
  const result = await exportTasksToExcel(filteredTasks, {
    fileNameSuffix: "Bien_Tap_Tasks",
    localize: { noDataTitle: noData, noDataDesc: noDesc },
    extraHeaderFields: [
      "Loại bông", "Loại công việc", "Tác phẩm liên quan", "Hợp phần", "GĐ",
    ],
    extraRowFields: (task: TTask) => {
      const loaiBong = getBienTapRoundType(task);
      const w = task.relatedWorkId ? workById.get(task.relatedWorkId) : null;
      const tacPham = w?.titleVi ?? w?.documentCode ?? w?.titleHannom ?? "";
      const hopPhan = w?.componentId ? (compById.get(w.componentId) ?? "") : "";
      const giaiDoan = w?.stage ?? "";
      const taskType = String((task as any).taskType ?? "");
      return [loaiBong, taskType, tacPham, String(hopPhan), giaiDoan];
    },
    assignmentLabelFn: getBTAssignmentLabel,
  });
  if (!result.ok) {
    toast({ title: noData, description: noDesc });
  }
}

export default function BienTapPage() {
  const { data: tasks, isLoading, isError } = useTasks();
  const { data: tasksAll } = useTasks({ includeArchived: true });
  const [includeArchivedForList, setIncludeArchivedForList] = useState(false);
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { role, user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();

  const [selectedTask, setSelectedTask] =
    useState<TaskWithAssignmentDetails | null>(null);
  const [taskDialogMode, setTaskDialogMode] = useState<"view" | "edit">("view");
  const [deleteTaskConfirmOpen, setDeleteTaskConfirmOpen] = useState(false);
  const [deleteTaskTarget, setDeleteTaskTarget] =
    useState<TaskWithAssignmentDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createInitialValues, setCreateInitialValues] = useState<any | null>(
    null,
  );
  const [createDuplicateMode, setCreateDuplicateMode] = useState(false);

  const { data: works = [] } = useWorks();
  const { data: components = [] } = useComponents();
  const { data: users = [] } = useTaskFilterStaffUsers();
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

  const datasetForList = includeArchivedForList ? tasksAll : tasks;

  const bienTapTasksScoped = useMemo(() => {
    if (!datasetForList) return [];
    let list = datasetForList.filter((t) => t.group === "Biên tập");
    if (role === UserRole.EMPLOYEE) {
      const uid = user?.id ?? null;
      if (uid) {
        list = list.filter(
          (t) =>
            (t as any).createdBy === uid ||
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
  }, [datasetForList, role, user?.displayName, user?.id]);

  const {
    search,
    setSearch,
    filters,
    setFilters,
    sortBy,
    sortDir,
    handleSort,
    viewMode,
    setViewMode,
    filteredTasks,
    tasksForStats,
    availableYears,
  } = useTaskListControls({
    tasks: bienTapTasksScoped,
    role,
    userId: user?.id,
    userDisplayName: user?.displayName,
    works,
    includedGroups: null,
  });
  const yearOptions = availableYears;

  const roundTypeOptions = useMemo(() => {
    const set = new Set<string>();
    const source = datasetForList || [];
    source
      .filter((t) => t.group === "Biên tập")
      .forEach((t) => {
        try {
          const wf =
            t.workflow && typeof t.workflow === "string"
              ? JSON.parse(t.workflow)
              : (t as any).workflow;
          if (!wf || !Array.isArray(wf.rounds) || wf.rounds.length === 0)
            return;
          const current =
            wf.rounds.find((r: any) => r?.roundNumber === wf.currentRound) ||
            wf.rounds[0];
          const rt = (current?.roundType ?? "").trim();
          if (rt) set.add(rt);
        } catch {
          // ignore invalid workflow
        }
      });
    return Array.from(set);
  }, [datasetForList]);

  const activeStatsKey = useMemo(
    () => getTaskStatsBadgeKeyFromFilters(filters),
    [filters.status, filters.vote],
  );

  const getPriorityColor = getTaskPriorityBadgeClass;
  const getStatusColor = getTaskStatusBadgeClass;

  const handleCreateNew = useCallback(() => setIsCreateDialogOpen(true), []);
  const handleResetFilters = useCallback(() => {
    setSearch("");
    setFilters({ status: "all", vote: "all" } as any);
  }, [setSearch, setFilters]);

  useEffect(() => {
    function onCmdExportExcel() {
      handleExportTasks(filteredTasks, language, toast, works, components);
    }
    window.addEventListener("cmd:export:excel", onCmdExportExcel);
    return () => window.removeEventListener("cmd:export:excel", onCmdExportExcel);
  }, [filteredTasks, language, toast, works, components]);

  if (isLoading) {
    return <TaskTableSkeleton />;
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
          <GroupPageHero
            groupCode="bientap"
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

          <section>
            <TaskStatsBadgesOnly
              tasks={tasksForStats}
              activeKey={activeStatsKey}
              onSelectKey={(key) =>
                setFilters((prev) => toggleTaskStatsBadgeInFilters(prev, key))
              }
            />
          </section>

          {/* Task List */}
          <section className="section-card">
            <div className="section-header">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <h3 className="font-semibold mr-2">{t.dashboard.tasks}</h3>
                <Badge variant="secondary" className="font-normal">
                  {filteredTasks.length} {t.dashboard.tasks.toLowerCase()}
                </Badge>
                <div className="flex items-center gap-2 ml-3">
                  <span className="text-xs text-muted-foreground">
                    {language === "vi" ? "Bao gồm lưu trữ" : "Include archived"}
                  </span>
                  <Switch
                    checked={includeArchivedForList}
                    onCheckedChange={(val) =>
                      setIncludeArchivedForList(Boolean(val))
                    }
                  />
                </div>
                {(role === UserRole.ADMIN ||
                  role === UserRole.MANAGER ||
                  role === UserRole.EMPLOYEE) && (
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

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:flex-wrap">
                <div className="relative w-full sm:w-64">
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
                  className="toggle-group-box w-full sm:w-auto">
                  <ToggleGroupItem
                    value="table"
                    aria-label={t.dashboard.viewTable}>
                    <List className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">
                      {t.dashboard.viewTable}
                    </span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="board"
                    aria-label={t.dashboard.viewBoard}>
                    <LayoutGrid className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">
                      {t.dashboard.viewBoard}
                    </span>
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
                  disabled={filteredTasks.length === 0}
                  className="w-full sm:w-auto">
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
                yearOptions={yearOptions}
                showVoteFilter={true}
                showRoundTypeFilter={true}
                roundTypeOptions={roundTypeOptions}
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
                onCreateNew={handleCreateNew}
                onResetFilters={handleResetFilters}
                actions={{
                  onView: (task) => {
                    setSelectedTask(task);
                    setTaskDialogMode("view");
                  },
                  onEdit: (task) => {
                    setSelectedTask(task);
                    setTaskDialogMode("edit");
                  },
                  onDuplicate: (task) => {
                    if (task.group !== "Biên tập") return;
                    const initial: any = {
                      title: task.title || task.id,
                      group: "Biên tập",
                      relatedWorkId: (task as any).relatedWorkId ?? null,
                    };
                    try {
                      const wf =
                        task.workflow && typeof task.workflow === "string"
                          ? JSON.parse(task.workflow as any)
                          : (task as any).workflow;
                      if (
                        wf &&
                        Array.isArray(wf.rounds) &&
                        wf.rounds.length > 0
                      ) {
                        const current =
                          wf.rounds.find(
                            (r: any) => r?.roundNumber === wf.currentRound,
                          ) || wf.rounds[0];
                        const stages = Array.isArray(current?.stages)
                          ? current.stages
                          : [];
                        const btv2 = stages.find(
                          (s: any) => s?.type === "btv2",
                        );
                        const btv1 = stages.find(
                          (s: any) => s?.type === "btv1",
                        );
                        const doc = stages.find(
                          (s: any) => s?.type === "doc_duyet",
                        );
                        if (btv2) {
                          initial.btv2 = btv2.assignee || "";
                          initial.btv2ReceiveDate = "";
                          initial.btv2DueDate = null;
                          initial.btv2CompleteDate = "";
                        }
                        if (btv1) {
                          initial.btv1 = btv1.assignee || "";
                          initial.btv1ReceiveDate = "";
                          initial.btv1DueDate = null;
                          initial.btv1CompleteDate = "";
                        }
                        if (doc) {
                          initial.docDuyet = doc.assignee || "";
                          initial.docDuyetReceiveDate = "";
                          initial.docDuyetDueDate = null;
                          initial.docDuyetCompleteDate = "";
                        }
                      }
                    } catch {}
                    setCreateInitialValues(initial);
                    setCreateDuplicateMode(true);
                    setIsCreateDialogOpen(true);
                  },
                  onDelete: (task) => {
                    setDeleteTaskTarget(task);
                    setDeleteTaskConfirmOpen(true);
                  },
                }}
                columnStorageKey="bien-tap"
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
                onCreateNew={handleCreateNew}
                onResetFilters={handleResetFilters}
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
        initialValues={createInitialValues || undefined}
        duplicateMode={createDuplicateMode}
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
                setCreateInitialValues(null);
                setCreateDuplicateMode(false);
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
                if (
                  role !== UserRole.ADMIN &&
                  (deleteTaskTarget as any).createdBy !== user?.id
                ) {
                  toast({
                    title: t.common.error,
                    description:
                      language === "vi"
                        ? "Chỉ người tạo công việc mới có quyền xóa công việc này."
                        : "Only the task creator can delete this task.",
                    variant: "destructive",
                  });
                  return;
                }
                deleteTask(deleteTaskTarget.id, {
                  onSuccess: () => {
                    setDeleteTaskConfirmOpen(false);
                    setDeleteTaskTarget(null);
                  },
                  onError: (error) => {
                    toast({
                      title: t.common.error,
                      description: error.message || t.errors.failedToDelete,
                      variant: "destructive",
                    });
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
