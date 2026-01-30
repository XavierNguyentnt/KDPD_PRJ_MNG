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
  | null;

type TimeRange = "day" | "week" | "month" | "quarter" | "year";

interface TaskDashboardProps {
  tasks: TaskWithAssignmentDetails[];
  onBadgeFilter?: (filter: DashboardBadgeFilter) => void;
  activeBadgeFilter?: DashboardBadgeFilter | null;
}

const STATUS_ORDER = ["Not Started", "In Progress", "Completed", "Blocked", "Cancelled"];
const COLORS = ["#64748b", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

function getStatusLabel(status: string, t: ReturnType<typeof useI18n>["t"]): string {
  const map: Record<string, string> = {
    "Not Started": t.status.notStarted,
    "In Progress": t.status.inProgress,
    Completed: t.status.completed,
    Blocked: t.status.blocked,
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
        (t) => !isTaskCompleted(t) && t.dueDate != null && new Date(t.dueDate) < new Date()
      );
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
    const inProgress = tasks.filter((x) => x.status === "In Progress").length;
    const overdue = tasks.filter((x) => {
      if (!x.dueDate || isTaskCompleted(x)) return false;
      return new Date(x.dueDate) < new Date();
    }).length;
    return { total, completed, inProgress, overdue };
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

  const byAssignee = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((task) => {
      const name = task.assignee?.trim() ?? "";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, display: name || t.task.unassigned }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
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
    <div className="grid gap-8">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onBadgeFilter?.(null)}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.stats.totalTasks}</p>
              <h3 className="text-2xl font-bold font-display">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>
        <Card
          className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onBadgeFilter?.({ type: "status", value: "Completed" })}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.stats.completed}</p>
              <h3 className="text-2xl font-bold font-display">{stats.completed}</h3>
            </div>
          </CardContent>
        </Card>
        <Card
          className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onBadgeFilter?.({ type: "status", value: "In Progress" })}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.stats.inProgress}</p>
              <h3 className="text-2xl font-bold font-display">{stats.inProgress}</h3>
            </div>
          </CardContent>
        </Card>
        <Card
          className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() =>
            onBadgeFilter?.(
              isActive({ type: "overdue", value: "overdue" }) ? null : { type: "overdue", value: "overdue" }
            )
          }
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.stats.overdue}</p>
              <h3 className="text-2xl font-bold font-display">{stats.overdue}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges: By status */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {t.dashboard.byStatus}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Badges: By staff */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {t.dashboard.byStaff}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {byAssignee.map(({ name, count, display }) => (
              <Badge
                key={name || "_unassigned"}
                variant={isActive({ type: "assignee", value: name }) ? "default" : "outline"}
                className="cursor-pointer hover:opacity-90 transition-opacity font-normal"
                onClick={() =>
                  onBadgeFilter?.(
                    isActive({ type: "assignee", value: name }) ? null : { type: "assignee", value: name }
                  )
                }
              >
                {display} ({count})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Badges: By group */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {t.dashboard.byGroup}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Schedule: In progress / Completed — On time vs Behind */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t.dashboard.inProgressGroup} / {t.dashboard.completedGroup}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{t.dashboard.inProgressGroup}</p>
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
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{t.dashboard.completedGroup}</p>
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
        </CardContent>
      </Card>

      {/* Trend chart */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
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
        <CardContent>
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
