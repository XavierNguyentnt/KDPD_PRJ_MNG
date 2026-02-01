import { useMemo, useState } from "react";
import { useTasks, useRefreshTasks, useCreateTask, UserRole } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { useWorks, useComponents, useUsers } from "@/hooks/use-works-and-components";
import { TaskStats } from "@/components/task-stats";
import { TaskDialog } from "@/components/task-dialog";
import { TaskTable, sortTasks, type TaskSortColumn } from "@/components/task-table";
import { TaskFilters, getDefaultTaskFilters, applyTaskFilters, type TaskFilterState } from "@/components/task-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Search, AlertTriangle, Plus } from "lucide-react";
import { Task } from "@shared/schema";
import { format } from "date-fns";

export default function CVChungPage() {
  const { data: tasks, isLoading, isError } = useTasks();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { role, user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TaskFilterState>(getDefaultTaskFilters);
  const [sortBy, setSortBy] = useState<TaskSortColumn | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: works = [] } = useWorks();
  const { data: components = [] } = useComponents();
  const { data: users = [] } = useUsers();

  const worksForFilter = useMemo(() => works, [works]);
  const stages = useMemo(() => Array.from(new Set(works.map((w) => w.stage).filter(Boolean))) as string[], [works]);
  const componentOptions = useMemo(() => components.map((c) => ({ id: c.id, name: c.name })), [components]);

  // Filter tasks for "Công việc chung" group only
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let list = tasks.filter((t) => t.group === "Công việc chung");

    if (role === UserRole.EMPLOYEE) {
      list = list.filter((t) => t.assignee?.includes((user?.displayName ?? "").split(" ")[0]));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assignee?.toLowerCase().includes(q) ||
          t.id?.toLowerCase().includes(q)
      );
    }

    list = applyTaskFilters(list, filters, worksForFilter);
    return sortTasks(list, sortBy, sortDir);
  }, [tasks, role, user?.displayName, search, filters, worksForFilter, sortBy, sortDir]);

  const handleSort = (column: TaskSortColumn) => {
    setSortBy((prev) => {
      if (prev === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else setSortDir("asc");
      return column;
    });
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
      {/* Overview Stats */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Quản lý các công việc chung của dự án</p>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {t.dashboard.lastSynced}: {format(new Date(), 'h:mm a')}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => refresh()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <TaskStats tasks={filteredTasks} />
      </section>

      {/* Task List */}
      <section className="bg-card rounded-xl border border-border/50 shadow-sm">
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.common.search + " " + t.dashboard.tasks.toLowerCase() + "..."}
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border/50 bg-muted/10">
          <TaskFilters
            users={users}
            components={componentOptions}
            filters={filters}
            onFiltersChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
            stages={stages}
            showVoteFilter={true}
          />
        </div>

        <TaskTable
          tasks={filteredTasks}
          onTaskClick={setSelectedTask}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          columns={{
            id: true,
            title: true,
            assignee: true,
            priority: true,
            status: true,
            dueDate: true,
            progress: true,
            receivedDate: true,
            actualCompletedAt: true,
            vote: true,
            group: false,
          }}
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
        defaultGroup="Công việc chung"
        onCreate={(taskData) => {
          createTask({ ...taskData, group: taskData.group || 'Công việc chung' }, {
            onSuccess: () => {
              setIsCreateDialogOpen(false);
            },
          });
        }}
        isCreating={isCreating}
      />
    </div>
  );
}
