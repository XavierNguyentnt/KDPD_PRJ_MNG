import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  useTasks,
  useRefreshTasks,
  useCreateTask,
  UserRole,
} from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import {
  TaskDashboard,
  applyDashboardBadgeFilter,
  type DashboardBadgeFilter,
} from "@/components/task-dashboard";
import { TaskDialog } from "@/components/task-dialog";
import {
  TaskTable,
  sortTasks,
  type TaskSortColumn,
} from "@/components/task-table";
import { TaskKanbanBoard } from "@/components/task-kanban-board";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { normalizeSearch } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Plus,
  Bell,
  MessageSquare,
  Calendar,
  LayoutGrid,
  List,
} from "lucide-react";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Circle, Clock } from "lucide-react";

export default function Dashboard() {
  const { data: tasks, isLoading, isError } = useTasks();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { role, user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState<DashboardBadgeFilter>(null);
  const [sortBy, setSortBy] = useState<TaskSortColumn | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedTask, setSelectedTask] =
    useState<TaskWithAssignmentDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "board">("table");
  const taskListRef = useRef<HTMLDivElement>(null);

  // Open create dialog when navigating from header CTA (#create)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.hash === "#create" ||
        window.location.search.includes("create=1"))
    ) {
      setIsCreateDialogOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Get unique groups from tasks
  const availableGroups = useMemo(() => {
    if (!tasks) return [];
    const groups = new Set(tasks.map((t) => t.group).filter(Boolean));
    return Array.from(groups).sort();
  }, [tasks]);

  // Base filtered list (role, search, group, status) — dùng cho thống kê dashboard
  const baseFilteredTasks = useMemo(() => {
    if (!tasks) return [];
    let filtered: TaskWithAssignmentDetails[] = tasks;
    if (role === UserRole.EMPLOYEE) {
      const uid = user?.id ?? null;
      if (uid) {
        filtered = filtered.filter(
          (t) =>
            t.assigneeId === uid ||
            (Array.isArray(t.assignments)
              ? t.assignments.some((a: any) => a?.userId === uid)
              : false),
        );
      } else {
        const exact = (user?.displayName ?? "").trim();
        filtered = filtered.filter((t) => (t.assignee ?? "").trim() === exact);
      }
    }
    if (groupFilter !== "all") {
      filtered = filtered.filter((t) => t.group === groupFilter);
    }
    if (search.trim()) {
      const lower = normalizeSearch(search.trim());
      filtered = filtered.filter(
        (t) =>
          normalizeSearch(t.title ?? "").includes(lower) ||
          normalizeSearch(t.description ?? "").includes(lower) ||
          normalizeSearch(t.assignee ?? "").includes(lower) ||
          normalizeSearch(t.group ?? "").includes(lower),
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }
    return filtered;
  }, [tasks, role, search, statusFilter, groupFilter, user?.displayName]);

  // Danh sách task sau khi áp dụng badge filter + sắp xếp (hiển thị trong bảng)
  const filteredTasks = useMemo(() => {
    const withBadge = applyDashboardBadgeFilter(baseFilteredTasks, badgeFilter);
    return sortTasks(withBadge, sortBy, sortDir);
  }, [baseFilteredTasks, badgeFilter, sortBy, sortDir]);

  // Falr-style: Recent Activity timeline (last 5 tasks by updatedAt/createdAt)
  const recentActivityItems = useMemo(() => {
    if (!baseFilteredTasks.length) return [];
    const sorted = [...baseFilteredTasks].sort((a, b) => {
      const da =
        a.updatedAt || a.createdAt
          ? new Date(a.updatedAt || a.createdAt!).getTime()
          : 0;
      const db =
        b.updatedAt || b.createdAt
          ? new Date(b.updatedAt || b.createdAt!).getTime()
          : 0;
      return db - da;
    });
    return sorted.slice(0, 5).map((task) => {
      const date = task.updatedAt || task.createdAt;
      const label =
        task.status === "Completed"
          ? t.dashboard.taskCompleted
          : task.status === "In Progress"
            ? t.dashboard.reviewCompleted
            : t.dashboard.addNewTask;
      return {
        id: task.id,
        title: task.title ?? "",
        assignee: task.assignee ?? "",
        label,
        date: date
          ? formatDistanceToNow(new Date(date), { addSuffix: true })
          : "",
        status: task.status,
      };
    });
  }, [baseFilteredTasks, t]);

  // Falr-style: In Progress tasks (top 5)
  const inProgressTasks = useMemo(
    () =>
      baseFilteredTasks.filter((t) => t.status === "In Progress").slice(0, 5),
    [baseFilteredTasks],
  );

  // Danh sách nhân sự để lọc bảng (từ baseFilteredTasks)
  const byAssignee = useMemo(() => {
    const counts: Record<string, number> = {};
    baseFilteredTasks.forEach((task) => {
      const name = task.assignee?.trim() ?? "";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        display: name || t.task.unassigned,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [baseFilteredTasks, t]);

  const handleBadgeFilter = useCallback((filter: DashboardBadgeFilter) => {
    setBadgeFilter(filter);
    setTimeout(
      () =>
        taskListRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100,
    );
  }, []);

  const handleSort = useCallback((column: TaskSortColumn) => {
    setSortBy((prev) => {
      if (prev === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else setSortDir("asc");
      return column;
    });
  }, []);

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
        return "bg-yellow-50 text-yellow-700 hover:bg-yellow-50/80 border-yellow-200";
      case "Cancelled":
        return "bg-gray-50 text-gray-700 hover:bg-gray-50/80 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-100/80";
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

  const welcomeName = user?.displayName?.split(" ")[0] ?? "User";

  return (
    <div className="space-y-6 dashboard-page">
      {/* Protend-style: Page title + breadcrumb / welcome strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>{t.dashboard.title}</span>
            <span aria-hidden>/</span>
            <span className="text-foreground font-medium">
              {t.dashboard.overview}
            </span>
          </nav>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
            {language === "vi"
              ? `Xin chào, ${welcomeName}`
              : `Welcome back, ${welcomeName}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.dashboard.overview}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {t.dashboard.lastSynced}: {format(new Date(), "HH:mm")}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="btn-icon shrink-0"
            onClick={() => refresh()}
            disabled={isRefreshing}>
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Falr-style: Recent Activity + In Progress Project (Bootstrap 4 admin layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-border bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              {t.dashboard.recentActivity}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivityItems.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                {t.dashboard.noTasksFound}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentActivityItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex gap-3 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() =>
                      setSelectedTask(
                        baseFilteredTasks.find((t) => t.id === item.id) ?? null,
                      )
                    }>
                    <span
                      className="flex h-2 w-2 shrink-0 mt-1.5 rounded-full bg-primary"
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.assignee && `${item.assignee} · `}
                        {item.date}
                      </p>
                      <span className="inline-block mt-1 text-xs font-medium text-primary">
                        {item.label}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="p-3 border-t border-border bg-muted/20">
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() =>
                  taskListRef.current?.scrollIntoView({ behavior: "smooth" })
                }>
                {t.dashboard.seeAll} →
              </button>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-border bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t.dashboard.inProgressProject}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {inProgressTasks.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                {t.dashboard.noTasksFound}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {inProgressTasks.map((task) => (
                  <li
                    key={task.id}
                    className="px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedTask(task)}>
                    <p className="text-sm font-medium text-foreground truncate">
                      {task.title ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.dueDate
                        ? (language === "vi" ? "Hạn: " : "Due: ") +
                          format(new Date(task.dueDate), "dd/MM/yyyy")
                        : t.task.noDateSet}
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${task.progress ?? 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="p-3 border-t border-border bg-muted/20">
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => {
                  setStatusFilter("In Progress");
                  setTimeout(
                    () =>
                      taskListRef.current?.scrollIntoView({
                        behavior: "smooth",
                      }),
                    100,
                  );
                }}>
                {t.dashboard.seeAll} →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard thống kê: badges + biểu đồ xu hướng */}
      <section>
        <TaskDashboard
          tasks={baseFilteredTasks}
          onBadgeFilter={handleBadgeFilter}
          activeBadgeFilter={badgeFilter}
        />
      </section>

      {/* Task List — Protend-style table card */}
      <section ref={taskListRef} className="section-card">
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder={t.task.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.dashboard.allStatus}</SelectItem>
                <SelectItem value="Not Started">
                  {t.status.notStarted}
                </SelectItem>
                <SelectItem value="In Progress">
                  {t.status.inProgress}
                </SelectItem>
                <SelectItem value="Completed">{t.status.completed}</SelectItem>
                <SelectItem value="Pending">{t.status.pending}</SelectItem>
                <SelectItem value="Cancelled">{t.status.cancelled}</SelectItem>
              </SelectContent>
            </Select>

            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) =>
                v && (v === "table" || v === "board") && setViewMode(v)
              }
              className="border rounded-md bg-background">
              <ToggleGroupItem value="table" aria-label={t.dashboard.viewTable}>
                <List className="h-4 w-4 mr-1.5" />
                {t.dashboard.viewTable}
              </ToggleGroupItem>
              <ToggleGroupItem value="board" aria-label={t.dashboard.viewBoard}>
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                {t.dashboard.viewBoard}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Lựa chọn lọc theo nhân sự cho bảng thống kê bên dưới */}
        <div className="px-4 sm:px-5 py-3 border-b border-border bg-muted/20 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground shrink-0">
            {t.dashboard.filterByStaff}:
          </span>
          <Badge
            variant={badgeFilter?.type !== "assignee" ? "default" : "outline"}
            className="cursor-pointer hover:opacity-90 transition-opacity font-normal"
            onClick={() => handleBadgeFilter(null)}>
            {t.filter.allStaff}
          </Badge>
          {byAssignee.map(({ name, count, display }) => (
            <Badge
              key={name || "_unassigned"}
              variant={
                badgeFilter?.type === "assignee" && badgeFilter?.value === name
                  ? "default"
                  : "outline"
              }
              className="cursor-pointer hover:opacity-90 transition-opacity font-normal"
              onClick={() =>
                handleBadgeFilter(
                  badgeFilter?.type === "assignee" &&
                    badgeFilter?.value === name
                    ? null
                    : { type: "assignee", value: name },
                )
              }>
              {display} ({count})
            </Badge>
          ))}
        </div>

        {viewMode === "table" ? (
          <TaskTable
            tasks={filteredTasks}
            onTaskClick={setSelectedTask}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
          />
        ) : (
          <TaskKanbanBoard
            tasks={filteredTasks}
            onTaskClick={setSelectedTask}
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
      />

      <TaskDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => setIsCreateDialogOpen(open)}
        task={null}
        onCreate={(taskData) => {
          createTask(taskData, {
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
          });
        }}
        isCreating={isCreating}
      />
    </div>
  );
}
