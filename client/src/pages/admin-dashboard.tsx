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
  useTaskFilterStaffUsers,
  useUsers,
} from "@/hooks/use-works-and-components";
import { useTaskListControls } from "@/hooks/use-task-list-controls";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { TaskStatsBadgesOnly } from "@/components/task-stats";
import { TaskDialog } from "@/components/task-dialog";
import { TaskTable, type TaskSortColumn } from "@/components/task-table";
import { TaskKanbanBoard } from "@/components/task-kanban-board";
import { TaskFilters } from "@/components/task-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDateDDMMYYYY } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminUsersPage from "@/pages/admin-users";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { format } from "date-fns";
import {
  Filter,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { role, user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const [includeArchivedForList, setIncludeArchivedForList] = useState(false);
  const {
    data: tasks,
    isLoading,
    isError,
  } = useTasks({
    includeArchived: includeArchivedForList,
  });
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { data: works = [] } = useWorks();
  const { data: components = [] } = useComponents();
  const { data: users = [] } = useTaskFilterStaffUsers();
  const { data: allUsers = [] } = useUsers();

  const creatorNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allUsers) {
      if (u?.id) map.set(u.id, u.displayName || u.email || u.id);
    }
    return map;
  }, [allUsers]);

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
    availableYears,
  } = useTaskListControls({
    tasks,
    role,
    userId: user?.id,
    userDisplayName: user?.displayName,
    works,
    includedGroups: null,
  });

  const [selectedTask, setSelectedTask] =
    useState<TaskWithAssignmentDetails | null>(null);
  const [taskDialogMode, setTaskDialogMode] = useState<"view" | "edit">("view");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const deleteConfirm = useConfirmDialog<TaskWithAssignmentDetails>();

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
  const adminGroupOptions = useMemo(
    () => [
      "Công việc chung",
      "Biên tập",
      "Thiết kế",
      "CNTT",
      "Thư ký hợp phần",
    ],
    [],
  );

  const DEFAULT_GROUP = useMemo(() => {
    if (availableGroups.includes("Công việc chung")) return "Công việc chung";
    return availableGroups[0] || "Công việc chung";
  }, [availableGroups]);

  if (role !== UserRole.ADMIN) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {language === "vi"
            ? "Bạn không có quyền truy cập trang này."
            : "You do not have permission to access this page."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">
              {language === "vi"
                ? "Quản trị: Công việc & Người dùng"
                : "Admin: Tasks & Users"}
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

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">
            {language === "vi" ? "Công việc" : "Tasks"}
          </TabsTrigger>
          <TabsTrigger value="users">
            {language === "vi" ? "Người dùng" : "Users"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
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
                <Button
                  size="sm"
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={isCreating}
                  className="ml-2">
                  <Plus className="w-4 h-4 mr-2" />
                  {t.dashboard.createNew}
                </Button>
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
                  <SelectTrigger className="w-full sm:w-[220px] bg-background">
                    <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <SelectValue
                      placeholder={
                        language === "vi" ? "Nhóm công việc" : "Group"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === "vi" ? "Tất cả nhóm" : "All groups"}
                    </SelectItem>
                    {adminGroupOptions.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
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
                yearOptions={availableYears}
                showVoteFilter={true}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {language === "vi" ? "Đang tải..." : "Loading..."}
                  </span>
                </div>
              </div>
            ) : isError ? (
              <div className="p-8 text-center text-muted-foreground">
                {language === "vi"
                  ? "Không tải được danh sách công việc."
                  : "Failed to load tasks."}
              </div>
            ) : viewMode === "table" ? (
              <TaskTable
                tasks={filteredTasks}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setTaskDialogMode("view");
                }}
                sortBy={sortBy as TaskSortColumn | null}
                sortDir={sortDir}
                onSort={handleSort}
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
                  customColumns: [
                    {
                      key: "createdBy",
                      label: language === "vi" ? "Người tạo" : "Created by",
                      render: (task) => {
                        const id = String((task as any).createdBy ?? "").trim();
                        return (
                          <span className="text-sm text-muted-foreground">
                            {id ? creatorNameById.get(id) || id : "—"}
                          </span>
                        );
                      },
                    },
                    {
                      key: "createdAt",
                      label: language === "vi" ? "Ngày tạo" : "Created at",
                      render: (task) => (
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateDDMMYYYY((task as any).createdAt) || "—"}
                        </span>
                      ),
                    },
                    {
                      key: "updatedAt",
                      label: language === "vi" ? "Ngày cập nhật" : "Updated at",
                      render: (task) => (
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateDDMMYYYY((task as any).updatedAt) || "—"}
                        </span>
                      ),
                    },
                  ],
                }}
              />
            ) : (
              <TaskKanbanBoard
                tasks={filteredTasks}
                onTaskClick={(task) => {
                  setSelectedTask(task);
                  setTaskDialogMode("view");
                }}
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
                <AlertDialogTitle>
                  {language === "vi"
                    ? "Xác nhận xóa công việc"
                    : "Confirm delete"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {language === "vi"
                    ? `Bạn có chắc chắn muốn xóa công việc "${deleteConfirm.target?.title ?? deleteConfirm.target?.id}"? Hành động này không thể hoàn tác.`
                    : `Are you sure you want to delete "${deleteConfirm.target?.title ?? deleteConfirm.target?.id}"? This action cannot be undone.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {language === "vi" ? "Hủy" : "Cancel"}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (!deleteConfirm.target?.id) return;
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
                  {language === "vi" ? "Xóa" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="users">
          <AdminUsersPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
