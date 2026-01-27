import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTasks } from "@/hooks/use-tasks";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";

export default function Team() {
  const { data: tasks, isLoading } = useTasks();

  const teamStats = useMemo(() => {
    if (!tasks) return [];
    
    // Group tasks by assignee
    const stats: Record<string, { total: number, completed: number, active: number }> = {};
    
    tasks.forEach(task => {
      const assignee = task.assignee || "Unassigned";
      if (!stats[assignee]) {
        stats[assignee] = { total: 0, completed: 0, active: 0 };
      }
      
      stats[assignee].total++;
      if (task.status === "Completed") {
        stats[assignee].completed++;
      } else {
        stats[assignee].active++;
      }
    });

    return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Team Performance</h2>
        <p className="text-muted-foreground">Overview of task distribution and completion rates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamStats.map((member) => (
          <Card key={member.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <CardTitle className="text-base font-semibold">{member.name}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {member.name === "Unassigned" ? "Task Pool" : "Development Team"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col p-2 bg-muted/30 rounded-lg">
                  <span className="text-xl font-bold font-display">{member.total}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">Total</span>
                </div>
                <div className="flex flex-col p-2 bg-green-50 rounded-lg text-green-700">
                  <span className="text-xl font-bold font-display">{member.completed}</span>
                  <span className="text-[10px] uppercase font-medium opacity-80">Done</span>
                </div>
                <div className="flex flex-col p-2 bg-blue-50 rounded-lg text-blue-700">
                  <span className="text-xl font-bold font-display">{member.active}</span>
                  <span className="text-[10px] uppercase font-medium opacity-80">Active</span>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Efficiency</span>
                  <span className="font-medium">
                    {member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${member.total > 0 ? (member.completed / member.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
