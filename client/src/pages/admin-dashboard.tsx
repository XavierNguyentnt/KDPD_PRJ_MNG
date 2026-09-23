import { useMemo, useState, lazy, Suspense } from "react";
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
import {
  getTaskStatsBadgeKeyFromFilters,
  TaskStatsBadgesOnly,
  toggleTaskStatsBadgeInFilters,
} from "@/components/task-stats";
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
import { GroupPageHero } from "@/components/group-page-hero";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import type {
  Work,
  TranslationContract,
  ProofreadingContract,
} from "@shared/schema";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LazyChart } from "@/components/ui/lazy-chart";
import {
  BookText,
  FileSignature,
  PenTool,
  Users,
  List,
  Filter,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  History,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
} from "lucide-react";

async function fetchTranslationContractsForAdmin(): Promise<
  TranslationContract[]
> {
  const res = await fetch(api.translationContracts.list.path, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Không tải được hợp đồng dịch thuật");
  return res.json();
}

async function fetchProofreadingContractsForAdmin(): Promise<
  ProofreadingContract[]
> {
  const res = await fetch(api.proofreadingContracts.list.path, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Không tải được hợp đồng hiệu đính");
  return res.json();
}

function deriveUserRoleLabel(
  user: any,
  language: "vi" | "en",
): { label: string; key: "Admin" | "Manager" | "Employee" } {
  const roles: { id: string; code: string; name: string }[] =
    Array.isArray(user?.roles) ? user.roles : [];
  if (
    roles.some(
      (r) =>
        r.name === UserRole.ADMIN ||
        r.code === "admin" ||
        r.name === "Quản trị" ||
        r.name === "Quản trị viên",
    )
  )
    return {
      label: language === "vi" ? "Quản trị viên" : "Admin",
      key: UserRole.ADMIN,
    };
  if (
    roles.some((r) =>
      r.name === UserRole.MANAGER ||
      r.code === "manager" ||
      r.name === "Quản lý" ||
      (r.name &&
        (r.name.includes("Trưởng ban") || r.name.includes("Phó trưởng ban"))),
    )
  )
    return {
      label: language === "vi" ? "Quản lý" : "Manager",
      key: UserRole.MANAGER,
    };
  return {
    label: language === "vi" ? "Nhân sự" : "Employee",
    key: UserRole.EMPLOYEE,
  };
}

function getActivityLabelAndColor(
  status: string | null | undefined,
  progress: number | null | undefined,
): { label: string; color: string } {
  if (status === "Completed" || progress === 100)
    return { label: "Hoàn thành", color: "text-emerald-600" };
  if (status === "In Progress")
    return { label: "Đang thực hiện", color: "text-blue-600" };
  if (status === "Pending") return { label: "Chờ xử lý", color: "text-amber-600" };
  if (status === "Cancelled") return { label: "Đã hủy", color: "text-red-500" };
  return { label: "Mới cập nhật", color: "text-slate-600" };
}

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
  const {
    data: translationContracts = [],
    isLoading: tcLoading,
  } = useQuery({
    queryKey: [api.translationContracts.list.path, "admin-overview"],
    queryFn: fetchTranslationContractsForAdmin,
    staleTime: 60_000,
  });
  const {
    data: proofreadingContracts = [],
    isLoading: pcLoading,
  } = useQuery({
    queryKey: [api.proofreadingContracts.list.path, "admin-overview"],
    queryFn: fetchProofreadingContractsForAdmin,
    staleTime: 60_000,
  });

  const creatorNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allUsers) {
      if (u?.id) map.set(u.id, u.displayName || u.email || u.id);
    }
    return map;
  }, [allUsers]);

  const totalWorks = works.length;
  const totalTc = translationContracts.length;
  const totalPc = proofreadingContracts.length;
  const totalStaff = allUsers.filter((u: any) => Boolean(u?.id && u.email)).length;
  const overviewLoading =
    isLoading || tcLoading || pcLoading;

  const tasksByGroup = useMemo(() => {
    const base = new Map<string, number>();
    const orderedGroups = [
      "Công việc chung",
      "Biên tập",
      "Thiết kế",
      "CNTT",
      "Thư ký hợp phần",
    ];
    orderedGroups.forEach((g) => base.set(g, 0));
    (tasks ?? []).forEach((task) => {
      const g = task.group?.trim();
      if (!g) return;
      base.set(g, (base.get(g) ?? 0) + 1);
    });
    const rows = orderedGroups.map((name) => ({
      name,
      total: base.get(name) ?? 0,
    }));
    const overflow = Array.from(base.entries()).filter(
      ([name]) => !orderedGroups.includes(name),
    );
    overflow.forEach(([name, total]) => rows.push({ name, total }));
    return rows.filter((r) => r.total > 0);
  }, [tasks]);

  const roleDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set(
      language === "vi" ? "Quản trị viên" : "Admin",
      0,
    );
    counts.set(
      language === "vi" ? "Quản lý" : "Manager",
      0,
    );
    counts.set(
      language === "vi" ? "Nhân sự" : "Employee",
      0,
    );
    allUsers.forEach((u: any) => {
      if (!u?.id) return;
      const { label } = deriveUserRoleLabel(u, language);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((e) => e.value > 0);
  }, [allUsers, language]);

  const roleColors = ["#2563eb", "#f97316", "#10b981"];

  const recentActivity = useMemo(() => {
    const list = [...(tasks ?? [])];
    list.sort((a, b) => {
      const ta =
        (a as any).updatedAt && !Number.isNaN(new Date((a as any).updatedAt).getTime())
          ? new Date((a as any).updatedAt).getTime()
          : 0;
      const tb =
        (b as any).updatedAt && !Number.isNaN(new Date((b as any).updatedAt).getTime())
          ? new Date((b as any).updatedAt).getTime()
          : 0;
      return tb - ta || ta;
    });
    return list.slice(0, 10).map((task) => ({
      id: task.id,
      title: task.title ?? "—",
      group: task.group ?? "—",
      updatedAt: (task as any).updatedAt ?? (task as any).createdAt,
      status: task.status,
      progress: typeof task.progress === "number" ? task.progress : null,
      creatorName:
        creatorNameById.get(String((task as any).createdBy ?? "")) ||
        "Hệ thống",
    }));
  }, [tasks, creatorNameById]);

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
    includedGroups: null,
  });
  const activeStatsKey = useMemo(
    () => getTaskStatsBadgeKeyFromFilters(filters),
    [filters.status, filters.vote],
  );

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
      <GroupPageHero
        groupCode="admin"
        syncedAt={new Date()}
        showRefresh
        isRefreshing={isRefreshing}
        onRefresh={() => refresh()}
        countBadge={{
          label:
            language === "vi"
              ? `${allUsers.length ?? 0} người dùng`
              : `${allUsers.length ?? 0} users`,
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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Sparkles className="h-4 w-4 mr-1.5" />
            {language === "vi" ? "Tổng quan" : "Overview"}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            {language === "vi" ? "Công việc" : "Tasks"}
          </TabsTrigger>
          <TabsTrigger value="users">
            {language === "vi" ? "Người dùng" : "Users"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <section className="section-card space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                    <BookText className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {language === "vi" ? "Tổng số tác phẩm" : "Total works"}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">
                      {overviewLoading
                        ? "—"
                        : new Intl.NumberFormat("vi-VN").format(totalWorks)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                    <FileSignature className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {language === "vi"
                        ? "Hợp đồng dịch thuật"
                        : "Translation contracts"}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">
                      {overviewLoading
                        ? "—"
                        : new Intl.NumberFormat("vi-VN").format(totalTc)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <PenTool className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {language === "vi"
                        ? "Hợp đồng hiệu đính"
                        : "Proofreading contracts"}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">
                      {overviewLoading
                        ? "—"
                        : new Intl.NumberFormat("vi-VN").format(totalPc)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {language === "vi" ? "Nhân sự" : "Staff"}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">
                      {overviewLoading
                        ? "—"
                        : new Intl.NumberFormat("vi-VN").format(totalStaff)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <Card className="border-border/50 shadow-sm xl:col-span-2 overflow-hidden">
                <CardHeader className="py-4 px-5 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <BarChart3 className="w-4 h-4" />
                    </span>
                    {language === "vi"
                      ? "Công việc theo nhóm nghiệp vụ"
                      : "Tasks by business group"}
                  </CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    {tasksByGroup.reduce((s, r) => s + r.total, 0)}{" "}
                    {t.dashboard.tasks.toLowerCase()}
                  </Badge>
                </CardHeader>
                <CardContent className="p-5">
                  <LazyChart height={Math.max(300, tasksByGroup.length * 56 + 60)} variant="bar">
                    {tasksByGroup.length > 0 ? (
                      <div
                        className="w-full h-full"
                        style={{
                          height: `${Math.max(300, tasksByGroup.length * 56 + 60)}px`,
                        }}
                      >
                        <Suspense fallback={<AdminOverviewChartSuspenseFallback />}>
                          <AdminTasksByGroupChartLazy data={tasksByGroup} />
                        </Suspense>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border/50">
                        {language === "vi"
                          ? "Chưa có công việc nào."
                          : "No tasks yet."}
                      </div>
                    )}
                  </LazyChart>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="py-4 px-5 border-b border-border/50 bg-muted/20">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                      <PieIcon className="w-4 h-4" />
                    </span>
                    {language === "vi"
                      ? "Phân bổ vai trò"
                      : "Role distribution"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <LazyChart height={300} variant="pie">
                    {roleDistribution.length > 0 ? (
                      <Suspense fallback={<AdminOverviewChartSuspenseFallback />}>
                        <AdminRoleDistributionChartLazy
                          data={roleDistribution}
                          colors={roleColors}
                        />
                      </Suspense>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border/50">
                        {language === "vi"
                          ? "Chưa có dữ liệu nhân sự."
                          : "No staff data yet."}
                      </div>
                    )}
                  </LazyChart>
                  <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    {roleDistribution.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              roleColors[index % roleColors.length],
                          }}
                        />
                        <span className="font-medium">{entry.name}</span>
                        <span className="tabular-nums">
                          ({entry.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="py-4 px-5 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <History className="w-4 h-4" />
                  </span>
                  {language === "vi"
                    ? "Hoạt động gần đây"
                    : "Recent activity"}
                </CardTitle>
                <Badge variant="outline" className="font-normal">
                  {recentActivity.length} / 10
                </Badge>
              </CardHeader>
              <CardContent className="p-2 sm:p-3">
                {recentActivity.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    {language === "vi"
                      ? "Chưa có hoạt động nào gần đây."
                      : "No recent activity yet."}
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {recentActivity.map((item) => {
                      const { label, color } = getActivityLabelAndColor(
                        item.status,
                        item.progress,
                      );
                      return (
                        <li
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-3 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-sm font-medium leading-5 line-clamp-1">
                              {item.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Badge
                                  variant="secondary"
                                  className="font-normal px-1.5 py-0 h-4"
                                >
                                  {item.group}
                                </Badge>
                              </span>
                              <span>
                                {language === "vi" ? "Cập nhật" : "Updated"}{" "}
                                <span className="tabular-nums">
                                  {item.updatedAt
                                    ? formatDateDDMMYYYY(item.updatedAt) ||
                                      "—"
                                    : "—"}
                                </span>
                              </span>
                              <span aria-hidden>·</span>
                              <span>
                                {language === "vi" ? "Cập nhật bởi" : "By"}{" "}
                                <span className="font-medium text-slate-600">
                                  {item.creatorName}
                                </span>
                              </span>
                            </div>
                          </div>
                          <div className="sm:text-right shrink-0 sm:w-40">
                            <span
                              className={`text-xs font-semibold ${color}`}
                            >
                              {label}
                            </span>
                            {typeof item.progress === "number" && (
                              <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                                {item.progress}%{" "}
                                {language === "vi" ? "tiến độ" : "progress"}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

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
                      sortable: true,
                      render: (task) => (
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateDDMMYYYY((task as any).createdAt) || "—"}
                        </span>
                      ),
                    },
                    {
                      key: "updatedAt",
                      label: language === "vi" ? "Ngày cập nhật" : "Updated at",
                      sortable: true,
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

const AdminTasksByGroupChartLazy = lazy(async () => {
  const {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
  } = await import("recharts");
  return {
    default: ({
      data,
    }: {
      data: Array<{ name: string; total: number }>;
    }) => (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 18, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border/50"
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}`}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={130}
          />
          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            formatter={(value: number, name: string) => [
              value,
              name === "total" ? "Công việc" : name,
            ]}
            labelFormatter={(label: string) => label}
          />
          <Bar
            dataKey="total"
            name="Công việc"
            fill="hsl(var(--primary))"
            radius={[0, 6, 6, 0]}
            barSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    ),
  };
});

const AdminRoleDistributionChartLazy = lazy(async () => {
  const {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
  } = await import("recharts");
  return {
    default: ({
      data,
      colors,
    }: {
      data: Array<{ name: string; value: number }>;
      colors: string[];
    }) => (
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell
                  key={`role-cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    ),
  };
});

const AdminOverviewChartSuspenseFallback = () => (
  <div className="absolute inset-0 p-3 sm:p-4 select-none pointer-events-none">
    <div className="flex items-center gap-2 mb-3 opacity-70">
      <div className="h-3 w-24 rounded shimmer bg-muted/60" />
      <div className="h-3 w-20 rounded shimmer bg-muted/45" />
      <div className="h-3 w-28 rounded shimmer bg-muted/35 ml-auto hidden sm:block" />
    </div>
    <div className="relative w-full h-full pb-6 pt-2">
      <div className="absolute inset-0 flex flex-col justify-between opacity-40 py-6 px-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px w-full bg-border/50" />
        ))}
      </div>
      <div className="flex items-end gap-2 sm:gap-3 h-full px-2 relative">
        {[
          [38, 46],
          [72, 78],
          [54, 66],
          [22, 34],
          [86, 92],
          [48, 58],
          [62, 72],
        ].map(([hShort, hTall], i) => (
          <div key={i} className="flex-1 flex items-end justify-center gap-1">
            <div
              className="w-[38%] shimmer bg-muted/60 rounded-sm"
              style={{ height: `${hShort}%` }}
            />
            <div
              className="w-[38%] shimmer bg-muted/50 rounded-sm"
              style={{ height: `${hTall}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  </div>
);
