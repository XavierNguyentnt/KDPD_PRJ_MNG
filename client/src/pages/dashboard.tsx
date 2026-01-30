import { useMemo, useState, useRef, useCallback } from "react";
import { useTasks, useRefreshTasks, useCreateTask, UserRole } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import {
  TaskDashboard,
  applyDashboardBadgeFilter,
  type DashboardBadgeFilter,
} from "@/components/task-dashboard";
import { TaskDialog } from "@/components/task-dialog";
import { TaskTable, sortTasks, type TaskSortColumn } from "@/components/task-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Search, Filter, AlertTriangle, Plus } from "lucide-react";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { format } from "date-fns";

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
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignmentDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const taskListRef = useRef<HTMLDivElement>(null);

  // Get unique groups from tasks
  const availableGroups = useMemo(() => {
    if (!tasks) return [];
    const groups = new Set(tasks.map(t => t.group).filter(Boolean));
    return Array.from(groups).sort();
  }, [tasks]);

  // Base filtered list (role, search, group, status) — dùng cho thống kê dashboard
  const baseFilteredTasks = useMemo(() => {
    if (!tasks) return [];
    let filtered: TaskWithAssignmentDetails[] = tasks;
    if (role === UserRole.EMPLOYEE) {
      filtered = filtered.filter((t) =>
        t.assignee?.includes((user?.displayName ?? "").split(" ")[0])
      );
    }
    if (groupFilter !== "all") {
      filtered = filtered.filter((t) => t.group === groupFilter);
    }
    if (search.trim()) {
      const lower = search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(lower) ||
          t.description?.toLowerCase().includes(lower) ||
          t.assignee?.toLowerCase().includes(lower) ||
          t.group?.toLowerCase().includes(lower)
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

  const handleBadgeFilter = useCallback(
    (filter: DashboardBadgeFilter) => {
      setBadgeFilter(filter);
      setTimeout(() => taskListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    },
    []
  );

  const handleSort = useCallback((column: TaskSortColumn) => {
    setSortBy((prev) => {
      if (prev === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else setSortDir("asc");
      return column;
    });
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-orange-100 text-orange-700 hover:bg-orange-100/80";
      case "Critical": return "bg-red-100 text-red-700 hover:bg-red-100/80";
      case "Medium": return "bg-blue-100 text-blue-700 hover:bg-blue-100/80";
      default: return "bg-slate-100 text-slate-700 hover:bg-slate-100/80";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-700 hover:bg-green-100/80";
      case "In Progress": return "bg-blue-50 text-blue-700 hover:bg-blue-50/80 border-blue-200";
      case "Blocked": return "bg-red-50 text-red-700 hover:bg-red-50/80 border-red-200";
      default: return "bg-gray-100 text-gray-700 hover:bg-gray-100/80";
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
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t.errors.retryConnection}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard thống kê: badges + biểu đồ xu hướng */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight">{t.dashboard.overview}</h2>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {t.dashboard.lastSynced}: {format(new Date(), "h:mm a")}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => refresh()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <TaskDashboard
          tasks={baseFilteredTasks}
          onBadgeFilter={handleBadgeFilter}
          activeBadgeFilter={badgeFilter}
        />
      </section>

      {/* Task List (chi tiết theo bộ lọc / badge đã chọn) */}
      <section
        ref={taskListRef}
        className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
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
                className="ml-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t.dashboard.createNew}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.common.search + " " + t.dashboard.tasks.toLowerCase() + "..."}
                className="pl-9 bg-background"
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
                {availableGroups.filter((g): g is string => !!g).map((group) => (
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
                <SelectItem value="Not Started">{t.status.notStarted}</SelectItem>
                <SelectItem value="In Progress">{t.status.inProgress}</SelectItem>
                <SelectItem value="Completed">{t.status.completed}</SelectItem>
                <SelectItem value="Blocked">{t.status.blocked}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TaskTable
          tasks={filteredTasks}
          onTaskClick={setSelectedTask}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          getPriorityColor={getPriorityColor}
          getStatusColor={getStatusColor}
        />
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
                description: t.task.createNew + " " + (language === 'vi' ? 'thành công' : 'successfully'),
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
