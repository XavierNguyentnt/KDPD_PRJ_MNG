import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  useTasks,
  useRefreshTasks,
  useCreateTask,
  UserRole,
} from "@/hooks/use-tasks";
import { useWorks, useComponents, useUsers } from "@/hooks/use-works-and-components";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import {
  TaskDashboard,
  applyDashboardBadgeFilter,
  type DashboardBadgeFilter,
} from "@/components/task-dashboard";
import { TaskDialog } from "@/components/task-dialog";
import { TaskTable } from "@/components/task-table";
import { TaskKanbanBoard } from "@/components/task-kanban-board";
import { TaskCalendarView } from "@/components/task-calendar-view";
import { TaskFilters, getDefaultTaskFilters } from "@/components/task-filters";
import { useTaskListControls } from "@/hooks/use-task-list-controls";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { compareNamesByLastNameAZ, getTaskStatusColor, getTaskPriorityColor, exportTasksToExcel } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Plus,
  X,
  Calendar,
  LayoutGrid,
  List,
  BarChart3,
  Layers,
  Flag,
  Download,
  Sparkles,
  ListChecks,
  Trophy,
} from "lucide-react";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock } from "lucide-react";
import { FullPageSkeleton } from "@/components/ui/skeletons";

export default function Dashboard() {
  const [includeArchivedForList, setIncludeArchivedForList] = useState(false);
  const { data: tasks, isLoading, isError } = useTasks();
  const { data: tasksAll } = useTasks({ includeArchived: true });
  const { data: works } = useWorks();
  const { data: components } = useComponents();
  const { data: users } = useUsers();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { role, user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "tasks">(
    "overview",
  );
  const [groupFilter, setGroupFilter] = useState("all");
  const [receivedYearFilter, setReceivedYearFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState<DashboardBadgeFilter>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] =
    useState<TaskWithAssignmentDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewModeExtra, setViewModeExtra] = useState<"calendar" | null>(null);
  const [isExportingTasks, setIsExportingTasks] = useState(false);
  const taskListRef = useRef<HTMLDivElement>(null);
  const dialogMode = useMemo<"view" | "edit">(() => {
    if (!selectedTask) return "view";
    const isAdminManager = role === UserRole.ADMIN || role === UserRole.MANAGER;
    if (isAdminManager) return "edit";
    const groups = user?.groups ?? [];
    const gname = (selectedTask.group ?? "").toLowerCase().replace(/\s+/g, "");
    const inSameGroup = groups.some((g) => {
      const name = (g.name ?? "").toLowerCase().replace(/\s+/g, "");
      const code = (g.code ?? "").toLowerCase().replace(/\s+/g, "");
      if (gname === "thiếtkế" || gname === "thietke") {
        return (
          name.includes("thiếtkế") ||
          code.includes("thietke") ||
          code.includes("thiet-ke")
        );
      }
      if (gname === "cntt") {
        return name.includes("cntt") || code.includes("cntt");
      }
      if (gname === "biêntập" || gname === "bientap") {
        return (
          name.includes("biêntập") ||
          name.includes("bientap") ||
          code.includes("bientap") ||
          code.includes("bien-tap")
        );
      }
      return name.includes(gname) || code.includes(gname);
    });
    return inSameGroup ? "edit" : "view";
  }, [selectedTask, role, user]);

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

  const datasetForList = includeArchivedForList ? tasksAll : tasks;
  const noGroupLabel = language === "vi" ? "(Không nhóm)" : "(No group)";
  const componentOptions = useMemo(
    () =>
      (components ?? []).map((c) => ({ id: c.id, name: c.name })),
    [components],
  );

  const availableGroups = useMemo(() => {
    if (!datasetForList) return [];
    const groups = new Set<string>();
    let hasNoGroup = false;
    for (const t of datasetForList) {
      const g = (t.group ?? "").trim();
      if (!g) {
        hasNoGroup = true;
        continue;
      }
      groups.add(g);
    }
    const ordered = Array.from(groups).sort();
    if (hasNoGroup) ordered.push(noGroupLabel);
    return ordered;
  }, [datasetForList, noGroupLabel]);

  const stages = useMemo(() => {
    const set = new Set<string>();
    for (const w of works ?? []) {
      const s = (w.stage ?? "").trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort();
  }, [works]);

  const tasksGroupYearScoped = useMemo(() => {
    if (!datasetForList) return [];
    let list = datasetForList;
    if (groupFilter !== "all") {
      if (groupFilter === noGroupLabel) {
        list = list.filter((t) => !(t.group ?? "").trim());
      } else {
        list = list.filter(
          (t) => (t.group ?? "").trim() === groupFilter,
        );
      }
    }
    if (receivedYearFilter !== "all") {
      const y = String(receivedYearFilter).trim();
      list = list.filter((t) => {
        const r = (t as any).receivedAt ?? null;
        const s =
          typeof r === "string"
            ? r.slice(0, 10)
            : r instanceof Date
              ? r.toISOString().slice(0, 10)
              : "";
        return s ? s.slice(0, 4) === y : false;
      });
    }
    return list;
  }, [datasetForList, groupFilter, receivedYearFilter, noGroupLabel]);

  const tasksForDashboardStats = tasksGroupYearScoped;

  const {
    search,
    setSearch,
    filters,
    setFilters,
    sortBy,
    sortDir,
    handleSort,
    viewMode: hookViewMode,
    setViewMode: setHookViewMode,
    filteredTasks: hookFilteredTasks,
    tasksForStats,
    availableYears,
  } = useTaskListControls({
    tasks: tasksGroupYearScoped,
    role,
    userId: user?.id,
    userDisplayName: user?.displayName,
    works: works ?? [],
    includedGroups: null,
  });

  const viewMode =
    (viewModeExtra === "calendar" ? "calendar" : hookViewMode) as
      | "table"
      | "board"
      | "calendar";
  const setViewMode = useCallback(
    (next: "table" | "board" | "calendar") => {
      if (next === "calendar") {
        setViewModeExtra("calendar");
        return;
      }
      setViewModeExtra(null);
      setHookViewMode(next);
    },
    [setHookViewMode],
  );

  const baseFilteredTasks = useMemo(() => {
    let list = tasksGroupYearScoped;
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
    if (badgeFilter) list = applyDashboardBadgeFilter(list, badgeFilter);
    return list;
  }, [
    tasksGroupYearScoped,
    role,
    user?.id,
    user?.displayName,
    badgeFilter,
  ]);

  const filteredTasks = useMemo(() => {
    let list = applyDashboardBadgeFilter(hookFilteredTasks, badgeFilter);
    if (selectedAssignees.length > 0) {
      const set = new Set(selectedAssignees.map((s) => (s ?? "").trim()));
      list = list.filter((t) => set.has((t.assignee ?? "").trim()));
    }
    return list;
  }, [hookFilteredTasks, badgeFilter, selectedAssignees]);

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

  const inProgressTasks = useMemo(
    () =>
      baseFilteredTasks
        .filter((t) => t.status === "In Progress")
        .slice(0, 5),
    [baseFilteredTasks],
  );

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
      .sort((a, b) => {
        const aName = a.name?.trim() ?? "";
        const bName = b.name?.trim() ?? "";
        if (!aName && !bName) return 0;
        if (!aName) return 1;
        if (!bName) return -1;
        return compareNamesByLastNameAZ(a.display, b.display);
      })
      .slice(0, 20);
  }, [baseFilteredTasks, t]);

  const top5Assignees = useMemo(
    () => [...byAssignee].sort((a, b) => b.count - a.count).slice(0, 5),
    [byAssignee],
  );
  const byGroupStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasksForDashboardStats) {
      const g = (t.group ?? "").trim() || noGroupLabel;
      counts[g] = (counts[g] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [tasksForDashboardStats, noGroupLabel]);
  const byPriorityStats = useMemo(() => {
    const order = ["High", "Medium", "Low"];
    const counts: Record<string, number> = {
      High: 0,
      Medium: 0,
      Low: 0,
      Unknown: 0,
    };
    for (const t of tasksForDashboardStats) {
      const p = (t.priority ?? "").trim() || "Unknown";
      counts[p] = (counts[p] || 0) + 1;
    }
    return order
      .filter((k) => (counts[k] ?? 0) > 0)
      .map((k) => ({ priority: k, count: counts[k] }))
      .concat(
        (counts.Unknown ?? 0) > 0
          ? [{ priority: "Unknown", count: counts.Unknown }]
          : [],
      );
  }, [tasksForDashboardStats]);

  const handleBadgeFilter = useCallback(
    (filter: DashboardBadgeFilter) => {
      setBadgeFilter(filter);
      if (filter) {
        setActiveTab("tasks");
        setTimeout(
          () =>
            taskListRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          80,
        );
      }
    },
    [],
  );

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setFilters(getDefaultTaskFilters());
    setGroupFilter("all");
    setReceivedYearFilter("all");
    setSelectedAssignees([]);
    setBadgeFilter(null);
    setIncludeArchivedForList(false);
  }, [setSearch, setFilters]);

  const handleCreateNew = useCallback(() => setIsCreateDialogOpen(true), []);

  const handleExportTasks = useCallback(() => {
    setIsExportingTasks(true);
    try {
      const noData = language === "vi" ? "Không có dữ liệu" : "No data";
      const noDesc = language === "vi"
        ? "Không có công việc để xuất Excel."
        : "No tasks to export.";
      const result = exportTasksToExcel(filteredTasks as any, {
        fileNameSuffix: "Dashboard_Tasks",
        localize: { noDataTitle: noData, noDataDesc: noDesc },
      });
      if (!result.ok) {
        toast({ title: noData, description: noDesc });
      } else {
        toast({
          title: t.common.success,
          description:
            language === "vi"
              ? "Xuất Excel thành công."
              : "Excel export completed.",
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: e?.message || t.errors.failedToLoad,
      });
    } finally {
      setIsExportingTasks(false);
    }
  }, [filteredTasks, language, toast, t]);

  const getPriorityColor = (p: string) => getTaskPriorityColor(p).badge;
  const getStatusColor = (s: string) => getTaskStatusColor(s).badge;

  if (isLoading) {
    return <FullPageSkeleton withTabs tabs={3} withWelcome />;
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
  const totalAssigneeCount =
    top5Assignees.reduce((s, x) => s + (x.count || 0), 0) || 1;
  const totalGroupCount =
    byGroupStats.reduce((s, x) => s + (x.count || 0), 0) || 1;

  return (
    <div className="space-y-6 dashboard-page">
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

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v as "overview" | "analytics" | "tasks")
        }
        className="w-full">
        <TabsList className="w-full sm:w-auto inline-flex mb-2 h-11 p-1">
          <TabsTrigger value="overview" className="h-9 gap-1.5 px-4">
            <Sparkles className="w-4 h-4 text-primary" />
            {language === "vi" ? "Tổng quan" : "Overview"}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="h-9 gap-1.5 px-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            {language === "vi" ? "Thống kê chi tiết" : "Analytics"}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="h-9 gap-1.5 px-4">
            <ListChecks className="w-4 h-4 text-primary" />
            {language === "vi" ? "Danh sách công việc" : "Tasks"}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">
              {tasksForStats?.length ?? 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <section>
            <TaskDashboard
              tasks={tasksForDashboardStats}
              onBadgeFilter={handleBadgeFilter}
              activeBadgeFilter={badgeFilter}
              hideCharts={true}
            />
          </section>

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
                            baseFilteredTasks.find(
                              (t) => t.id === item.id,
                            ) ?? null,
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
                    onClick={() => {
                      setActiveTab("tasks");
                      setTimeout(
                        () =>
                          taskListRef.current?.scrollIntoView({
                            behavior: "smooth",
                          }),
                        60,
                      );
                    }}>
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
                      setFilters({
                        ...getDefaultTaskFilters(),
                        status: "In Progress",
                      });
                      setActiveTab("tasks");
                      setTimeout(
                        () =>
                          taskListRef.current?.scrollIntoView({
                            behavior: "smooth",
                          }),
                        60,
                      );
                    }}>
                    {t.dashboard.seeAll} →
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="border border-border shadow-sm overflow-hidden">
              <CardHeader className="py-4 px-5 border-b border-border bg-muted/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  {language === "vi"
                    ? "Top 5 nhân sự (công việc)"
                    : "Top 5 assignees"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {top5Assignees.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    {t.dashboard.noTasksFound}
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {top5Assignees.map((x, idx) => {
                      const pct = Math.round(
                        (x.count / totalAssigneeCount) * 100,
                      );
                      return (
                        <li
                          key={x.name || "__unassigned"}
                          className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge
                                variant="secondary"
                                className="h-5 px-1.5 text-[11px] shrink-0">
                                #{idx + 1}
                              </Badge>
                              <span className="text-sm font-medium text-foreground truncate">
                                {x.display}
                              </span>
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                              {x.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm overflow-hidden">
              <CardHeader className="py-4 px-5 border-b border-border bg-muted/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-500" />
                  {language === "vi"
                    ? "Top 5 nhóm công việc"
                    : "Top 5 groups"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {byGroupStats.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    {t.dashboard.noTasksFound}
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {byGroupStats.map((x, idx) => {
                      const pct = Math.round(
                        (x.count / totalGroupCount) * 100,
                      );
                      return (
                        <li key={x.group} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge
                                variant="secondary"
                                className="h-5 px-1.5 text-[11px] shrink-0">
                                #{idx + 1}
                              </Badge>
                              <span className="text-sm font-medium text-foreground truncate">
                                {x.group}
                              </span>
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                              {x.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-group-thiet-ke transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm overflow-hidden">
              <CardHeader className="py-4 px-5 border-b border-border bg-muted/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flag className="w-4 h-4 text-rose-500" />
                  {language === "vi"
                    ? "Phân bổ theo độ ưu tiên"
                    : "Priority breakdown"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {byPriorityStats.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    {t.dashboard.noTasksFound}
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {byPriorityStats.map(({ priority, count }) => {
                      const tot =
                        byPriorityStats.reduce((s, x) => s + x.count, 0) || 1;
                      const pct = Math.round((count / tot) * 100);
                      const label =
                        priority === "High"
                          ? language === "vi"
                            ? "Cao"
                            : "High"
                          : priority === "Medium"
                            ? language === "vi"
                              ? "Trung bình"
                              : "Medium"
                            : priority === "Low"
                              ? language === "vi"
                                ? "Thấp"
                                : "Low"
                              : language === "vi"
                                ? "Chưa đặt"
                                : "Unknown";
                      return (
                        <li key={priority} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-foreground">
                              {label}
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                priority === "High"
                                  ? "bg-status-high"
                                  : priority === "Medium"
                                    ? "bg-status-medium"
                                    : priority === "Low"
                                      ? "bg-status-low"
                                      : "bg-muted-foreground/40"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <section>
            <TaskDashboard
              tasks={tasksForDashboardStats}
              onBadgeFilter={handleBadgeFilter}
              activeBadgeFilter={badgeFilter}
              hideBadges={true}
            />
          </section>
        </TabsContent>

        <TabsContent value="tasks" className="mt-0" ref={taskListRef}>
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
                {(role === UserRole.ADMIN ||
                  role === UserRole.MANAGER) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportTasks}
                    disabled={isExportingTasks || !filteredTasks.length}
                    className="ml-1">
                    <Download
                      className={`w-4 h-4 mr-2 ${
                        isExportingTasks ? "animate-pulse" : ""
                      }`}
                    />
                    {language === "vi" ? "Xuất Excel" : "Export Excel"}
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

                <Select
                  value={groupFilter}
                  onValueChange={setGroupFilter}>
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

                <Select
                  value={receivedYearFilter}
                  onValueChange={setReceivedYearFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] bg-background">
                    <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <SelectValue
                      placeholder={
                        (t.filter as any)?.year ??
                        (language === "vi"
                          ? "Năm nhận việc"
                          : "Received year")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {(t.filter as any)?.allYears ??
                        (language === "vi"
                          ? "Tất cả năm"
                          : "All years")}
                    </SelectItem>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={clearAllFilters}>
                  <X className="h-4 w-4" />
                  {language === "vi" ? "Xoá lọc" : "Clear filters"}
                </Button>

                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(v) =>
                    v &&
                    (v === "table" ||
                      v === "board" ||
                      v === "calendar") &&
                    setViewMode(v)
                  }
                  className="border rounded-md bg-background w-full sm:w-auto">
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
                  <ToggleGroupItem
                    value="calendar"
                    aria-label={t.dashboard.calendar}>
                    <Calendar className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">
                      {t.dashboard.calendar}
                    </span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            <div className="px-4 sm:px-5 py-3 border-b border-border bg-muted/20">
              <TaskFilters
                users={users ?? []}
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

            <div className="px-4 sm:px-5 py-3 border-b border-border bg-muted/10 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground shrink-0">
                {t.dashboard.filterByStaff}:
              </span>
              <Badge
                variant={
                  selectedAssignees.length === 0 ? "default" : "outline"
                }
                className="cursor-pointer hover:opacity-90 transition-opacity font-normal"
                onClick={() => setSelectedAssignees([])}>
                {t.filter.allStaff}
              </Badge>
              {byAssignee.map(({ name, count, display }) => (
                <Badge
                  key={name || "_unassigned"}
                  variant={
                    selectedAssignees.includes(name)
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer hover:opacity-90 transition-opacity font-normal"
                  onClick={() => {
                    setSelectedAssignees((prev) => {
                      const exists = prev.includes(name);
                      if (exists) return prev.filter((n) => n !== name);
                      return [...prev, name];
                    });
                  }}>
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
                onCreateNew={handleCreateNew}
                onResetFilters={clearAllFilters}
                columnStorageKey="dashboard-tasks"
              />
            ) : viewMode === "board" ? (
              <TaskKanbanBoard
                tasks={filteredTasks}
                onTaskClick={setSelectedTask}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
                noGroupLabel={
                  language === "vi" ? "(Không nhóm)" : "(No group)"
                }
                onCreateNew={handleCreateNew}
                onResetFilters={clearAllFilters}
              />
            ) : (
              <div className="p-4 sm:p-5">
                <TaskCalendarView
                  tasks={filteredTasks}
                  onTaskClick={setSelectedTask}
                  getPriorityColor={getPriorityColor}
                  getStatusColor={getStatusColor}
                  onCreateNew={handleCreateNew}
                  onResetFilters={clearAllFilters}
                />
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        onOpenOtherTask={(t) => {
          setSelectedTask(t as any);
        }}
        mode={dialogMode}
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
                variant: "destructive",
                title: t.common.error,
                description: error.message || t.errors.failedToCreate,
              });
            },
          });
        }}
        isCreating={isCreating}
      />
    </div>
  );
}
