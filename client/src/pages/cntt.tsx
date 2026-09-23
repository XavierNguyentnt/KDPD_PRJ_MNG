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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent } from "@/components/ui/card";
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
  Filter,
  AlertTriangle,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";
import { TaskTableSkeleton } from "@/components/ui/skeletons";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { format } from "date-fns";
import {
  normalizeSearch,
  exportTasksToExcel,
  defaultAssignmentLabel,
  getTaskStatusColor,
  getTaskPriorityColor,
} from "@/lib/utils";
import { useTaskListControls } from "@/hooks/use-task-list-controls";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { GroupPageHero } from "@/components/group-page-hero";

const INCLUDED_GROUPS = ["CNTT", "Quét trùng lặp"];
const DEFAULT_GROUP = "CNTT";

import type { TaskWithAssignmentDetails as TTask } from "@shared/schema";

const getTaskStatusBadgeClass = (s: string) => getTaskStatusColor(s).badge;
const getTaskPriorityBadgeClass = (p: string) => getTaskPriorityColor(p).badge;

async function handleExportTasks(
  filteredTasks: TTask[],
  language: string,
  toast: (opts: any) => any,
) {
  const noData = language === "vi" ? "Không có dữ liệu" : "No data";
  const noDesc = language === "vi"
    ? "Không có công việc để xuất Excel."
    : "No tasks to export.";
  const result = await exportTasksToExcel(filteredTasks, {
    fileNameSuffix: "CNTT_Tasks",
    localize: { noDataTitle: noData, noDataDesc: noDesc },
  });
  if (!result.ok) {
    toast({ title: noData, description: noDesc });
  }
}

export default function CNTTPage() {
  const { data: tasks, isLoading, isError } = useTasks();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { role, user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const { data: works = [] } = useWorks();

  const {
    search,
    setSearch,
    filters,
    setFilters,
    groupFilter,
    setGroupFilter,
    sortBy,
    sortDir,
    handleSort,
    viewMode,
    setViewMode,
    filteredTasks,
    tasksForStats,
    availableGroups,
    availableYears,
  } = useTaskListControls({
    tasks,
    role,
    userId: user?.id,
    userDisplayName: user?.displayName,
    works,
    includedGroups: INCLUDED_GROUPS,
  });
  const [selectedTask, setSelectedTask] =
    useState<TaskWithAssignmentDetails | null>(null);
  const [taskDialogMode, setTaskDialogMode] = useState<"view" | "edit">("view");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const deleteConfirm = useConfirmDialog<TaskWithAssignmentDetails>();

  const { data: components = [] } = useComponents();
  const usersQuery = useTaskFilterStaffUsers();
  const users = usersQuery.data ?? [];
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

  const getPriorityColor = getTaskPriorityBadgeClass;
  const getStatusColor = getTaskStatusBadgeClass;

  const handleCreateNew = useCallback(() => setIsCreateDialogOpen(true), []);
  const handleResetFilters = useCallback(() => {
    setSearch("");
    setFilters({ status: "all", vote: "all" } as any);
  }, [setSearch, setFilters]);

  useEffect(() => {
    function onCmdExportExcel() {
      handleExportTasks(filteredTasks, language, toast);
    }
    window.addEventListener("cmd:export:excel", onCmdExportExcel);
    return () => window.removeEventListener("cmd:export:excel", onCmdExportExcel);
  }, [filteredTasks, language, toast]);

  const activeStatsKey = useMemo(
    () => getTaskStatsBadgeKeyFromFilters(filters),
    [filters.status, filters.vote],
  );

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

  const isAdminOrManager = role === UserRole.ADMIN || role === UserRole.MANAGER;
  const hasCnttPermission =
    isAdminOrManager ||
    (user?.roles ?? []).some(
      (r) =>
        (r.code ?? "").toLowerCase() === "technical" ||
        (r.name ?? "").toLowerCase() === "kỹ thuật viên",
    ) ||
    (user?.groups ?? []).some((g) => {
      const code = (g.code ?? "").toLowerCase().replace(/\s+/g, "");
      const name = (g.name ?? "").toLowerCase().replace(/\s+/g, "");
      return code === "it" || name.includes("kỹthuật") || name === "cntt";
    });
  if (!hasCnttPermission) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Bạn cần quyền Admin, Manager hoặc vai trò “Kỹ thuật viên”/nhóm “Kỹ
              thuật” để truy cập trang này.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <GroupPageHero
        groupCode="cntt"
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
          onSelectKey={(key) => {
            setFilters((prev) => toggleTaskStatsBadgeInFilters(prev, key));
            window.setTimeout(
              () =>
                document
                  .getElementById("cntt-task-list")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              60,
            );
          }}
        />
      </section>

      <section id="cntt-task-list" className="section-card">
        <div className="section-header">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <h3 className="font-semibold mr-2">{t.dashboard.tasks}</h3>
            <Badge variant="secondary" className="font-normal">
              {filteredTasks.length} {t.dashboard.tasks.toLowerCase()}
            </Badge>
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
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-background">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder={t.task.group} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.dashboard.allGroups}</SelectItem>
                {availableGroups
                  .filter((g): g is string => !!g)
                  .map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) =>
                v && (v === "table" || v === "board") && setViewMode(v)
              }
              className="toggle-group-box w-full sm:w-auto">
              <ToggleGroupItem value="table" aria-label={t.dashboard.viewTable}>
                <List className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">
                  {t.dashboard.viewTable}
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem value="board" aria-label={t.dashboard.viewBoard}>
                <LayoutGrid className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">
                  {t.dashboard.viewBoard}
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              onClick={() => handleExportTasks(filteredTasks, language, toast)}
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
            onFiltersChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
            stages={stages}
            yearOptions={availableYears}
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
              onDelete: (task) => {
                deleteConfirm.ask(task);
              },
            }}
            columnStorageKey="cntt"
            columns={{
              id: true,
              title: true,
              group: true,
              assignee: true,
              priority: true,
              status: true,
              dueDate: true,
              progress: true,
              receivedDate: true,
              actualCompletedAt: true,
              vote: true,
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

      <TaskDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        mode={taskDialogMode}
      />

      <TaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        task={null}
        defaultGroup={DEFAULT_GROUP}
        onCreate={(taskData) => {
          createTask(
            { ...taskData, group: taskData.group || DEFAULT_GROUP },
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
        open={deleteConfirm.open}
        onOpenChange={deleteConfirm.setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa công việc</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa công việc "
              {deleteConfirm.target?.title ?? deleteConfirm.target?.id}"? Hành
              động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteConfirm.target?.id) return;
                if (
                  role !== UserRole.ADMIN &&
                  (deleteConfirm.target as any).createdBy !== user?.id
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
                deleteTask(deleteConfirm.target.id, {
                  onSuccess: () => {
                    deleteConfirm.cancel();
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
