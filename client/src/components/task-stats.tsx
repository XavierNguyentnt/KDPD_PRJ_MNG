import { useMemo } from "react";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Clock, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useI18n } from "@/hooks/use-i18n";

interface TaskStatsProps {
  tasks: TaskWithAssignmentDetails[];
}

/** 5 thẻ thống kê (badges) với gradient: Tổng (trắng), Hoàn thành (xanh lá), Đang tiến hành (xanh lam), Quá hạn (cam), Không hoàn thành (đỏ) */
export function TaskStatsBadgesOnly({ tasks }: TaskStatsProps) {
  const { t } = useI18n();
  const stats = useMemo(() => {
    const total = tasks.length;
    const isCompleted = (x: TaskWithAssignmentDetails) => x.status === "Completed" || x.actualCompletedAt != null;
    const completed = tasks.filter((x) => isCompleted(x)).length;
    const inProgress = tasks.filter((x) => x.status === "In Progress").length;
    const overdueInProgress = tasks.filter((x) => {
      if (x.status !== "In Progress") return false;
      if (!x.dueDate || isCompleted(x)) return false;
      return new Date(x.dueDate) < new Date();
    }).length;
    const notCompleted = tasks.filter((x) => x.vote === "khong_hoan_thanh").length;
    return { total, completed, inProgress, overdueInProgress, notCompleted };
  }, [tasks]);

  const badges = [
    { label: t.stats.totalTasks, value: stats.total, icon: BarChart3, gradient: "from-slate-100 via-white to-slate-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800", textClass: "text-slate-800 dark:text-slate-100", iconBg: "bg-slate-300/40 dark:bg-slate-500/30" },
    { label: t.stats.completed, value: stats.completed, icon: CheckCircle2, gradient: "from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-800", textClass: "text-emerald-950 dark:text-emerald-50", iconBg: "bg-white/20 dark:bg-white/15" },
    { label: t.stats.inProgress, value: stats.inProgress, icon: Clock, gradient: "from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800", textClass: "text-blue-950 dark:text-blue-50", iconBg: "bg-white/20 dark:bg-white/15" },
    { label: t.stats.notFinished, value: stats.overdueInProgress, icon: AlertCircle, gradient: "from-orange-500 to-amber-600 dark:from-orange-600 dark:to-amber-700", textClass: "text-orange-950 dark:text-orange-50", iconBg: "bg-white/20 dark:bg-white/15" },
    { label: t.stats.notCompleted, value: stats.notCompleted, icon: AlertCircle, gradient: "from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-700", textClass: "text-rose-950 dark:text-rose-50", iconBg: "bg-white/20 dark:bg-white/15" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {badges.map(({ label, value, icon: Icon, gradient, textClass, iconBg }) => (
        <Card key={label} className={`overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-br ${gradient} ${textClass} group hover:-translate-y-0.5`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} group-hover:opacity-90 transition-colors`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider opacity-90">{label}</p>
              <h3 className="text-2xl font-bold font-display tabular-nums mt-0.5">{value}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TaskStats({ tasks }: TaskStatsProps) {
  const { t } = useI18n();
  
  const stats = useMemo(() => {
    const total = tasks.length;
    const isCompleted = (t: TaskWithAssignmentDetails) => t.status === "Completed" || t.actualCompletedAt != null;
    const completed = tasks.filter(t => isCompleted(t)).length;
    const inProgress = tasks.filter(t => t.status === "In Progress").length;
    const overdueInProgress = tasks.filter(t => {
      if (t.status !== "In Progress") return false;
      if (!t.dueDate || isCompleted(t)) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, overdueInProgress, completionRate };
  }, [tasks]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    const statusLabels: Record<string, string> = {
      'Not Started': t.status.notStarted,
      'In Progress': t.status.inProgress,
      'Completed': t.status.completed,
      'Pending': t.status.pending,
      'Cancelled': t.status.cancelled,
    };
    tasks.forEach(task => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ 
      name: statusLabels[name] || name, 
      value 
    }));
  }, [tasks, t]);

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    const priorityLabels: Record<string, string> = {
      'Low': t.priority.low,
      'Medium': t.priority.medium,
      'High': t.priority.high,
      'Critical': t.priority.critical,
    };
    tasks.forEach(task => {
      counts[task.priority] = (counts[task.priority] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ 
      name: priorityLabels[name] || name, 
      value 
    }));
  }, [tasks, t]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="grid gap-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.stats.totalTasks}</p>
              <h3 className="text-2xl font-bold font-display">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.stats.completed}</p>
              <h3 className="text-2xl font-bold font-display">{stats.completed}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.stats.inProgress}</p>
              <h3 className="text-2xl font-bold font-display">{stats.inProgress}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t.stats.notFinished}</p>
              <h3 className="text-2xl font-bold font-display">{stats.overdueInProgress}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t.stats.statusDistribution}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              {statusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {entry.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t.stats.tasksByPriority}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
