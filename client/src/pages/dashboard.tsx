import { useMemo, useState } from "react";
import { useTasks, useRefreshTasks, UserRole } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { TaskStats } from "@/components/task-stats";
import { TaskDialog } from "@/components/task-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, Search, Filter, AlertTriangle } from "lucide-react";
import { Task } from "@shared/schema";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: tasks, isLoading, isError } = useTasks();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshTasks();
  const { role, user } = useAuth();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filter tasks based on role and search criteria
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    let filtered = tasks;

    // Role-based filtering
    if (role === UserRole.EMPLOYEE) {
      // Simple name matching simulation
      filtered = filtered.filter(t => t.assignee?.includes(user.name.split(" ")[0]));
    } else if (role === UserRole.MANAGER) {
      // Simulate team view (e.g., specific assignees or roles)
      // For demo: Show everything but highlight ability to see broader view
      filtered = filtered; 
    }

    // Search
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(lower) || 
        t.description?.toLowerCase().includes(lower) ||
        t.assignee?.toLowerCase().includes(lower)
      );
    }

    // Status Filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    return filtered;
  }, [tasks, role, search, statusFilter, user.name]);

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
        <p className="text-muted-foreground font-medium">Loading Dashboard Data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-2">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">Failed to load tasks</h2>
        <p className="text-muted-foreground max-w-md">
          There was an error connecting to the Google Sheet backend. Please try refreshing.
        </p>
        <Button onClick={() => refresh()} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight">Overview</h2>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            Last synced: {format(new Date(), 'h:mm a')}
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
      <section className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <h3 className="font-semibold mr-2">Tasks</h3>
            <Badge variant="secondary" className="font-normal">
              {filteredTasks.length} items
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Not Started">Not Started</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead className="w-[30%]">Task Info</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[15%]">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No tasks found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow 
                    key={task.id} 
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setSelectedTask(task)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {task.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">{task.title}</span>
                        {task.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {task.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {task.assignee.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm">{task.assignee}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-normal border-0 ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-normal border ${getStatusColor(task.status)}`}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {task.dueDate || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={task.progress || 0} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground w-8 text-right">{task.progress}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <TaskDialog 
        open={!!selectedTask} 
        onOpenChange={(open) => !open && setSelectedTask(null)} 
        task={selectedTask} 
      />
    </div>
  );
}
