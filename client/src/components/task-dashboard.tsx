import { useMemo, useState } from "react";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart3,
  TrendingUp,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useI18n } from "@/hooks/use-i18n";
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";
import { vi } from "date-fns/locale";

export type DashboardBadgeFilter =
  | { type: "status"; value: string }
  | { type: "assignee"; value: string }
  | { type: "group"; value: string }
  | {
      type: "schedule";
      value: "in_progress_on_time" | "in_progress_behind" | "completed_on_time" | "completed_behind";
    }
  | { type: "overdue"; value: "overdue" }
  | { type: "not_completed"; value: "not_completed" }
  | null;

type TimeRange = "day" | "week" | "month" | "quarter" | "year";

interface TaskDashboardProps {
  tasks: TaskWithAssignmentDetails[];
  onBadgeFilter?: (filter: DashboardBadgeFilter) => void;
  activeBadgeFilter?: DashboardBadgeFilter | null;
}

const STATUS_ORDER = ["Not Started", "In Progress", "Completed", "Pending", "Cancelled"];
const COLORS = ["#64748b", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

function getStatusLabel(status: string, t: ReturnType<typeof useI18n>["t"]): string {
  const map: Record<string, string> = {
    "Not Started": t.status.notStarted,
    "In Progress": t.status.inProgress,
    Completed: t.status.completed,
    Pending: t.status.pending,
    Cancelled: t.status.cancelled,
  };
  return map[status] ?? status;
}

function isTaskCompleted(t: TaskWithAssignmentDetails): boolean {
  return t.status === "Completed" || t.actualCompletedAt != null;
}

function isOnSchedule(t: TaskWithAssignmentDetails): boolean {
  const due = t.dueDate ? new Date(t.dueDate) : null;
  if (!due) return true;
  if (isTaskCompleted(t)) {
    const completed = t.actualCompletedAt ? new Date(t.actualCompletedAt) : null;
    return completed ? completed <= due : true;
  }
  return new Date() <= due;
}

/** Apply dashboard badge filter to a task list (use after role/search/group/status filters). */
export function applyDashboardBadgeFilter(
  tasks: TaskWithAssignmentDetails[],
  filter: DashboardBadgeFilter
): TaskWithAssignmentDetails[] {
  if (!filter) return tasks;
  switch (filter.type) {
    case "status":
      if (filter.value === "Overdue") {
        return tasks.filter(
          (t) => !isTaskCompleted(t) && t.dueDate != null && new Date(t.dueDate) < new Date()
        );
      }
      return tasks.filter((t) => t.status === filter.value);
    case "assignee":
      return tasks.filter(
        (t) => (t.assignee?.trim() ?? "") === filter.value
      );
    case "group":
      return tasks.filter(
        (t) => (t.group?.trim() ?? "(Không nhóm)") === filter.value
      );
    case "schedule":
      if (filter.value === "in_progress_on_time") {
        return tasks.filter((t) => t.status === "In Progress" && isOnSchedule(t));
      }
      if (filter.value === "in_progress_behind") {
        return tasks.filter((t) => t.status === "In Progress" && !isOnSchedule(t));
      }
      if (filter.value === "completed_on_time") {
        return tasks.filter((t) => isTaskCompleted(t) && isOnSchedule(t));
      }
      if (filter.value === "completed_behind") {
        return tasks.filter((t) => isTaskCompleted(t) && !isOnSchedule(t));
      }
      return tasks;
    case "overdue":
      return tasks.filter(
        (t) =>
          t.status === "In Progress" &&
          !isTaskCompleted(t) &&
          t.dueDate != null &&
          new Date(t.dueDate) < new Date()
      );
    case "not_completed":
      return tasks.filter((t) => t.vote === "khong_hoan_thanh");
    default:
      return tasks;
  }
}

export function TaskDashboard({
  tasks,
  onBadgeFilter,
  activeBadgeFilter,
}: TaskDashboardProps) {
  const { t, language } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  const locale = language === "vi" ? vi : undefined;

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(isTaskCompleted).length;
    const notCompleted = tasks.filter((x) => x.vote === "khong_hoan_thanh").length;
    const inProgress = tasks.filter((x) => x.status === "In Progress").length;
    const overdueInProgress = tasks.filter((x) => {
      if (x.status !== "In Progress") return false;
      if (!x.dueDate || isTaskCompleted(x)) return false;
      return new Date(x.dueDate) < new Date();
    }).length;
    return { total, completed, notCompleted, inProgress, overdueInProgress };
  }, [tasks]);

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((task) => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });
    return STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0).map((status) => ({
      status,
      count: counts[status] ?? 0,
      label: getStatusLabel(status, t),
    }));
  }, [tasks, t]);

  const byGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((task) => {
      const g = task.group?.trim() || "(Không nhóm)";
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  /** Chuẩn hóa tên nhóm cho biểu đồ cột (CV chung + Công việc chung -> CV chung). */
  const normalizeGroupName = (g: string | null | undefined): string => {
    const s = (g ?? "").trim();
    if (s === "Công việc chung" || s === "CV chung") return "CV chung";
    return s || "(Không nhóm)";
  };

  /** Thứ tự nhóm công việc cho biểu đồ cột. */
  const GROUP_ORDER = ["CV chung", "Biên tập", "Thiết kế", "CNTT", "Thư ký hợp phần"];

  /** Dữ liệu biểu đồ cột: số công việc theo trạng thái (Đang tiến hành, Hoàn thành, Không hoàn thành) của từng nhóm. */
  const groupStatusBarData = useMemo(() => {
    const buckets: Record<string, { inProgress: number; completed: number; notCompleted: number }> = {};
    GROUP_ORDER.forEach((g) => {
      buckets[g] = { inProgress: 0, completed: 0, notCompleted: 0 };
    });
    tasks.forEach((task) => {
      const group = normalizeGroupName(task.group);
      if (!(group in buckets)) buckets[group] = { inProgress: 0, completed: 0, notCompleted: 0 };
      if (task.status === "In Progress") buckets[group].inProgress++;
      else if (isTaskCompleted(task)) buckets[group].completed++;
      if (task.vote === "khong_hoan_thanh") buckets[group].notCompleted++;
    });
    return GROUP_ORDER.filter((g) => buckets[g]).map((name) => ({
      name,
      inProgress: buckets[name].inProgress,
      completed: buckets[name].completed,
      notCompleted: buckets[name].notCompleted,
    }));
  }, [tasks]);

  const scheduleStats = useMemo(() => {
    const inProgress = tasks.filter((x) => x.status === "In Progress");
    const completed = tasks.filter(isTaskCompleted);
    const inProgressOnTime = inProgress.filter(isOnSchedule).length;
    const inProgressBehind = inProgress.filter((x) => !isOnSchedule(x)).length;
    const completedOnTime = completed.filter(isOnSchedule).length;
    const completedBehind = completed.filter((x) => !isOnSchedule(x)).length;
    return {
      inProgressOnTime,
      inProgressBehind,
      completedOnTime,
      completedBehind,
    };
  }, [tasks]);

  /** Dữ liệu biểu đồ tròn: theo trạng thái */
  const statusChartData = useMemo(
    () => byStatus.map((s, idx) => ({ name: s.label, value: s.count, fill: COLORS[idx % COLORS.length] })),
    [byStatus]
  );

  /** Dữ liệu biểu đồ: theo nhóm công việc (dùng màu tuần hoàn) */
  const GROUP_CHART_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
    "#f97316",
  ];
  const groupChartData = useMemo(
    () =>
      byGroup.map((g, idx) => ({
        name: g.group,
        value: g.count,
        fill: GROUP_CHART_COLORS[idx % GROUP_CHART_COLORS.length],
      })),
    [byGroup]
  );

  /** Dữ liệu biểu đồ thống kê phụ: Đang tiến hành / Đã hoàn thành (đúng tiến độ vs chậm) */
  const scheduleChartData = useMemo(
    () => ({
      inProgress: [
        { name: t.dashboard.onSchedule, value: scheduleStats.inProgressOnTime, fill: "#10b981" },
        { name: t.dashboard.behindSchedule, value: scheduleStats.inProgressBehind, fill: "#f59e0b" },
      ].filter((d) => d.value > 0),
      completed: [
        { name: t.dashboard.onSchedule, value: scheduleStats.completedOnTime, fill: "#10b981" },
        { name: t.dashboard.behindSchedule, value: scheduleStats.completedBehind, fill: "#f59e0b" },
      ].filter((d) => d.value > 0),
    }),
    [scheduleStats, t]
  );

  /** Dữ liệu biểu đồ cột tỷ lệ Đúng tiến độ/Chậm tiến độ cho 2 nhóm Đang tiến hành và Hoàn thành */
  const scheduleRatioBarData = useMemo(
    () => [
      {
        name: t.dashboard.inProgressGroup,
        onSchedule: scheduleStats.inProgressOnTime,
        behindSchedule: scheduleStats.inProgressBehind,
      },
      {
        name: t.dashboard.completedGroup,
        onSchedule: scheduleStats.completedOnTime,
        behindSchedule: scheduleStats.completedBehind,
      },
    ],
    [scheduleStats, t]
  );

  const trendData = useMemo(() => {
    const now = new Date();
    let bucketStart: (d: Date) => Date;
    let bucketLabel: (d: Date) => string;
    let steps: number;

    switch (timeRange) {
      case "day":
        bucketStart = (d) => startOfDay(d);
        bucketLabel = (d) => format(d, "dd/MM", { locale });
        steps = 30;
        break;
      case "week":
        bucketStart = (d) => startOfWeek(d, { weekStartsOn: 1 });
        bucketLabel = (d) => `W${format(d, "w")} ${format(d, "MMM", { locale })}`;
        steps = 12;
        break;
      case "month":
        bucketStart = (d) => startOfMonth(d);
        bucketLabel = (d) => format(d, "MMM yyyy", { locale });
        steps = 12;
        break;
      case "quarter":
        bucketStart = (d) => startOfQuarter(d);
        bucketLabel = (d) => `Q${Math.floor(d.getMonth() / 3) + 1}/${format(d, "yyyy", { locale })}`;
        steps = 8;
        break;
      case "year":
        bucketStart = (d) => startOfYear(d);
        bucketLabel = (d) => format(d, "yyyy", { locale });
        steps = 5;
        break;
      default:
        bucketStart = (d) => startOfMonth(d);
        bucketLabel = (d) => format(d, "MMM yyyy", { locale });
        steps = 12;
    }

    const periodKeys: string[] = [];
    for (let i = 0; i < steps; i++) {
      let d: Date;
      if (timeRange === "day") d = subDays(now, steps - 1 - i);
      else if (timeRange === "week") d = subWeeks(now, steps - 1 - i);
      else if (timeRange === "month") d = subMonths(now, steps - 1 - i);
      else if (timeRange === "quarter") d = subQuarters(now, steps - 1 - i);
      else d = subYears(now, steps - 1 - i);
      const key = bucketLabel(bucketStart(d));
      periodKeys.push(key);
    }

    const buckets: Record<string, number> = {};
    periodKeys.forEach((k) => (buckets[k] = 0));

    tasks.forEach((task) => {
      const createdAt = task.createdAt ? new Date(task.createdAt) : null;
      if (!createdAt) return;
      const key = bucketLabel(bucketStart(createdAt));
      if (key in buckets) buckets[key]++;
    });

    return periodKeys.map((period) => ({
      period,
      count: buckets[period] ?? 0,
      full: period,
    }));
  }, [tasks, timeRange, locale]);

  const isActive = (filter: DashboardBadgeFilter) => {
    if (!activeBadgeFilter || !filter) return false;
    if (filter.type !== activeBadgeFilter.type) return false;
    return filter.value === activeBadgeFilter.value;
  };

  const timeRangeLabels: { value: TimeRange; label: string }[] = [
    { value: "day", label: t.dashboard.timeRangeDay },
    { value: "week", label: t.dashboard.timeRangeWeek },
    { value: "month", label: t.dashboard.timeRangeMonth },
    { value: "quarter", label: t.dashboard.timeRangeQuarter },
    { value: "year", label: t.dashboard.timeRangeYear },
  ];

  return (
    <div className="grid gap-6">
      {/* Badge thống kê: gradient (Tổng trắng, Hoàn thành xanh lá, Đang tiến hành xanh lam, Quá hạn cam, Không hoàn thành đỏ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card
          className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 text-slate-800 dark:text-slate-100 group hover:-translate-y-0.5"
          onClick={() => onBadgeFilter?.(null)}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-300/40 dark:bg-slate-500/30 group-hover:opacity-90 transition-colors">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider opacity-90">{t.stats.totalTasks}</p>
              <h3 className="text-2xl font-bold font-display tabular-nums mt-0.5">{stats.total} +</h3>
            </div>
          </CardContent>
        </Card>
        <Card
          className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-800 text-emerald-950 dark:text-emerald-50 group hover:-translate-y-0.5"
          onClick={() => onBadgeFilter?.({ type: "status", value: "Completed" })}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 dark:bg-white/15 group-hover:bg-white/25 transition-colors">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider opacity-90">{t.stats.completed}</p>
              <h3 className="text-2xl font-bold font-display tabular-nums mt-0.5">{stats.completed} +</h3>
            </div>
          </CardContent>
        </Card>
        <Card
          className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800 text-blue-950 dark:text-blue-50 group hover:-translate-y-0.5"
          onClick={() => onBadgeFilter?.({ type: "status", value: "In Progress" })}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 dark:bg-white/15 group-hover:bg-white/25 transition-colors">
              <Clock className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider opacity-90">{t.stats.inProgress}</p>
              <h3 className="text-2xl font-bold font-display tabular-nums mt-0.5">{stats.inProgress} +</h3>
            </div>
          </CardContent>
        </Card>
        <Card
          className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-br from-orange-500 to-amber-600 dark:from-orange-600 dark:to-amber-700 text-orange-950 dark:text-orange-50 group hover:-translate-y-0.5"
          onClick={() =>
            onBadgeFilter?.(
              isActive({ type: "overdue", value: "overdue" }) ? null : { type: "overdue", value: "overdue" }
            )
          }
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 dark:bg-white/15 group-hover:bg-white/25 transition-colors">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider opacity-90">{t.stats.notFinished}</p>
              <h3 className="text-2xl font-bold font-display tabular-nums mt-0.5">{stats.overdueInProgress} +</h3>
            </div>
          </CardContent>
        </Card>
        <Card
          className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer bg-gradient-to-br from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-700 text-rose-950 dark:text-rose-50 group hover:-translate-y-0.5"
          onClick={() =>
            onBadgeFilter?.(
              isActive({ type: "not_completed", value: "not_completed" })
                ? null
                : { type: "not_completed", value: "not_completed" }
            )
          }
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 dark:bg-white/15 group-hover:bg-white/25 transition-colors">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider opacity-90">{t.stats.notCompleted}</p>
              <h3 className="text-2xl font-bold font-display tabular-nums mt-0.5">{stats.notCompleted} +</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thống kê theo trạng thái: biểu đồ tròn + badges — Protend-style card */}
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="w-4 h-4" />
            </span>
            {t.dashboard.byStatus}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {statusChartData.length > 0 && (
              <div className="h-[240px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`status-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-2">{t.dashboard.clickBadgeToFilter}</p>
              <div className="flex flex-wrap gap-2">
                {byStatus.map(({ status, count, label }, idx) => (
                  <Badge
                    key={status}
                    variant={isActive({ type: "status", value: status }) ? "default" : "secondary"}
                    className="cursor-pointer hover:opacity-90 transition-opacity font-normal"
                    style={
                      !isActive({ type: "status", value: status })
                        ? { backgroundColor: `${COLORS[idx % COLORS.length]}20`, color: COLORS[idx % COLORS.length] }
                        : undefined
                    }
                    onClick={() =>
                      onBadgeFilter?.(
                        isActive({ type: "status", value: status }) ? null : { type: "status", value: status }
                      )
                    }
                  >
                    {label} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thống kê theo nhóm công việc: biểu đồ tròn + badges */}
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="w-4 h-4" />
            </span>
            {t.dashboard.byGroup}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {groupChartData.length > 0 && (
              <div className="h-[240px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={groupChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {groupChartData.map((entry, index) => (
                        <Cell key={`group-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-2">{t.dashboard.clickBadgeToFilter}</p>
              <div className="flex flex-wrap gap-2">
                {byGroup.map(({ group, count }) => (
                  <Badge
                    key={group}
                    variant={isActive({ type: "group", value: group }) ? "default" : "outline"}
                    className="cursor-pointer hover:opacity-90 transition-opacity font-normal"
                    onClick={() =>
                      onBadgeFilter?.(
                        isActive({ type: "group", value: group }) ? null : { type: "group", value: group }
                      )
                    }
                  >
                    {group} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Biểu đồ cột: số công việc theo trạng thái (Đang tiến hành, Hoàn thành, Không hoàn thành) của từng nhóm */}
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="w-4 h-4" />
            </span>
            {t.dashboard.byGroup} — {t.dashboard.byStatus}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[320px] w-full">
            {groupStatusBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupStatusBarData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                    labelFormatter={(label) => label}
                  />
                  <Legend
                    formatter={(value) => {
                      if (value === "inProgress") return t.stats.inProgress;
                      if (value === "completed") return t.stats.completed;
                      if (value === "notCompleted") return t.stats.notCompleted;
                      return value;
                    }}
                  />
                  <Bar dataKey="inProgress" name={t.stats.inProgress} fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="completed" name={t.stats.completed} fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="notCompleted" name={t.stats.notCompleted} fill="#ef4444" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border/50">
                {t.dashboard.noTasksFound}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Thống kê phụ: Đang tiến hành / Đã hoàn thành — biểu đồ tỷ lệ Đúng/Chậm tiến độ + biểu đồ tròn + badges */}
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="w-4 h-4" />
            </span>
            {t.dashboard.inProgressGroup} / {t.dashboard.completedGroup}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Biểu đồ tỷ lệ Đúng tiến độ / Chậm tiến độ cho 2 nhóm */}
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              {t.dashboard.onSchedule} / {t.dashboard.behindSchedule}
            </p>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scheduleRatioBarData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                    labelFormatter={(label) => label}
                  />
                  <Legend
                    formatter={(value) => {
                      if (value === "onSchedule") return t.dashboard.onSchedule;
                      if (value === "behindSchedule") return t.dashboard.behindSchedule;
                      return value;
                    }}
                  />
                  <Bar dataKey="onSchedule" name={t.dashboard.onSchedule} stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={36} />
                  <Bar dataKey="behindSchedule" name={t.dashboard.behindSchedule} stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Đang tiến hành: đúng tiến độ vs chậm tiến độ */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{t.dashboard.inProgressGroup}</p>
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
                {scheduleChartData.inProgress.length > 0 ? (
                  <div className="h-[180px] w-full max-w-[180px] mx-auto sm:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={scheduleChartData.inProgress}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {scheduleChartData.inProgress.map((entry, index) => (
                            <Cell key={`ip-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [value, name]}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid hsl(var(--border))",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border/50 max-w-[180px]">
                    {t.dashboard.noTasksFound}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      isActive({ type: "schedule", value: "in_progress_on_time" }) ? "default" : "secondary"
                    }
                    className="cursor-pointer font-normal bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 hover:opacity-90"
                    onClick={() =>
                      onBadgeFilter?.(
                        isActive({ type: "schedule", value: "in_progress_on_time" })
                          ? null
                          : { type: "schedule", value: "in_progress_on_time" }
                      )
                    }
                  >
                    {t.dashboard.onSchedule} ({scheduleStats.inProgressOnTime})
                  </Badge>
                  <Badge
                    variant={
                      isActive({ type: "schedule", value: "in_progress_behind" }) ? "default" : "secondary"
                    }
                    className="cursor-pointer font-normal bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 hover:opacity-90"
                    onClick={() =>
                      onBadgeFilter?.(
                        isActive({ type: "schedule", value: "in_progress_behind" })
                          ? null
                          : { type: "schedule", value: "in_progress_behind" }
                      )
                    }
                  >
                    {t.dashboard.behindSchedule} ({scheduleStats.inProgressBehind})
                  </Badge>
                </div>
              </div>
            </div>
            {/* Đã hoàn thành: đúng tiến độ vs chậm tiến độ */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{t.dashboard.completedGroup}</p>
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
                {scheduleChartData.completed.length > 0 ? (
                  <div className="h-[180px] w-full max-w-[180px] mx-auto sm:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={scheduleChartData.completed}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {scheduleChartData.completed.map((entry, index) => (
                            <Cell key={`done-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [value, name]}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid hsl(var(--border))",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed border-border/50 max-w-[180px]">
                    {t.dashboard.noTasksFound}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      isActive({ type: "schedule", value: "completed_on_time" }) ? "default" : "secondary"
                    }
                    className="cursor-pointer font-normal bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 hover:opacity-90"
                    onClick={() =>
                      onBadgeFilter?.(
                        isActive({ type: "schedule", value: "completed_on_time" })
                          ? null
                          : { type: "schedule", value: "completed_on_time" }
                      )
                    }
                  >
                    {t.dashboard.onSchedule} ({scheduleStats.completedOnTime})
                  </Badge>
                  <Badge
                    variant={
                      isActive({ type: "schedule", value: "completed_behind" }) ? "default" : "secondary"
                    }
                    className="cursor-pointer font-normal bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 hover:opacity-90"
                    onClick={() =>
                      onBadgeFilter?.(
                        isActive({ type: "schedule", value: "completed_behind" })
                          ? null
                          : { type: "schedule", value: "completed_behind" }
                      )
                    }
                  >
                    {t.dashboard.behindSchedule} ({scheduleStats.completedBehind})
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend chart — Protend-style */}
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 px-6 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
            </span>
            {t.dashboard.trendChart}
          </CardTitle>
          <div className="flex flex-wrap gap-1">
            {timeRangeLabels.map(({ value, label }) => (
              <Badge
                key={value}
                variant={timeRange === value ? "default" : "outline"}
                className="cursor-pointer font-normal text-xs"
                onClick={() => setTimeRange(value)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="period"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.full ?? ""
                  }
                  formatter={(value: number) => [value, t.dashboard.tasksInPeriod]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
