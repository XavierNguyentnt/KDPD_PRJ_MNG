import { useMemo, useState } from "react";
import { useTasks, useRefreshTasks, useCreateTask, UserRole } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { TaskStats } from "@/components/task-stats";
import { TaskDialog } from "@/components/task-dialog";
import { TaskTable } from "@/components/task-table";
import { WorkflowView } from "@/components/workflow-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Search, Filter, AlertTriangle, Plus } from "lucide-react";
import { Task } from "@shared/schema";
import { Workflow } from "@shared/workflow";
import { format } from "date-fns";

export default function BienTapPage() {
  const { data: tasks, isLoading, isError } = useTasks();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();
  const { mutate: createTask, isPending: isCreating } = useCreateTask();
  const { role, user } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Filter tasks for "Biên tập" group only
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    let filtered = tasks.filter(t => t.group === 'Biên tập');

    // Role-based filtering
    if (role === UserRole.EMPLOYEE) {
      filtered = filtered.filter(t => t.assignee?.includes((user?.displayName ?? "").split(" ")[0]));
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(t =>
        t.title?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.assignee?.toLowerCase().includes(searchLower) ||
        t.id?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    return filtered;
  }, [tasks, role, user?.displayName, search, statusFilter]);

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
            <h2 className="text-xl font-bold tracking-tight">Biên tập</h2>
            <p className="text-sm text-muted-foreground mt-1">Quản lý công việc biên tập với các nhân sự: BTV 1, BTV 2, Người Đọc duyệt...</p>
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
          columns={{
            // Biên tập page: hiển thị đầy đủ các cột, có thể thêm custom columns sau
            id: true,
            title: true,
            assignee: true,
            priority: true,
            status: true,
            dueDate: true,
            progress: true,
            group: false, // Không cần hiển thị group vì đã filter theo group rồi
            // Workflow column removed - workflow info is now in assignee and progress columns
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
        onCreate={(taskData) => {
          createTask({ ...taskData, group: 'Biên tập' }, {
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
