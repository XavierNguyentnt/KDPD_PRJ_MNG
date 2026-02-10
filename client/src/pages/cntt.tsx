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
  Filter,
  AlertTriangle,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { format } from "date-fns";
import { normalizeSearch } from "@/lib/utils";
import * as XLSX from "xlsx";
import { useTaskListControls } from "@/hooks/use-task-list-controls";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

const INCLUDED_GROUPS = ["CNTT", "Quét trùng lặp"];
const DEFAULT_GROUP = "CNTT";

import type { TaskWithAssignmentDetails as TTask } from "@shared/schema";
function handleExportTasks(
  filteredTasks: TTask[],
  language: string,
  toast: (opts: any) => any,
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

  const taskHeaders = [
    "ID",
    "Tiêu đề",
    "Nhóm",
    "Trạng thái",
    "Người thực hiện",
  ];
  const taskData = filteredTasks.map((task) => [
    task.id,
    task.title,
    task.group,
    task.status,
    task.assignee,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([taskHeaders, ...taskData]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

  XLSX.writeFile(workbook, "CNTT_Tasks.xlsx");
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
    availableGroups,
  } = useTaskListControls({
    tasks,
    role,
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
  const usersQuery = useUsers();
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
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Quản lý công việc CNTT và quét trùng lặp với nhiều nhân sự thực
              hiện
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
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
        <TaskStatsBadgesOnly tasks={filteredTasks} />
      </section>

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
                className="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[160px] bg-background">
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
              className="toggle-group-box">
              <ToggleGroupItem value="table" aria-label={t.dashboard.viewTable}>
                <List className="h-4 w-4 mr-1.5" />
                {t.dashboard.viewTable}
              </ToggleGroupItem>
              <ToggleGroupItem value="board" aria-label={t.dashboard.viewBoard}>
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                {t.dashboard.viewBoard}
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              onClick={() => handleExportTasks(filteredTasks, language, toast)}
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
            onFiltersChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
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
                deleteConfirm.ask(task);
              },
            }}
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
                deleteTask(deleteConfirm.target.id, {
                  onSuccess: () => {
                    deleteConfirm.cancel();
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
