import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Task } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateTask, UserRole } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

// Partial schema since we only update specific fields
const updateSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof updateSchema>;

export function TaskDialog({ open, onOpenChange, task }: TaskDialogProps) {
  const { role } = useAuth();
  const updateMutation = useUpdateTask();
  
  const form = useForm<FormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      status: task?.status || "Not Started",
      priority: task?.priority || "Medium",
      assignee: task?.assignee || "",
      progress: task?.progress || 0,
      notes: task?.notes || "",
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      form.reset({
        status: task.status,
        priority: task.priority,
        assignee: task.assignee || "",
        progress: task.progress || 0,
        notes: task.notes || "",
      });
    }
  }, [task, form]);

  const canEditMeta = role === UserRole.ADMIN || role === UserRole.MANAGER;

  const onSubmit = (data: FormData) => {
    if (!task) return;
    
    // Filter data based on role permissions
    const payload = canEditMeta 
      ? data 
      : { progress: data.progress, notes: data.notes };

    updateMutation.mutate(
      { id: task.id, ...payload },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] gap-6">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {task.id}
            </span>
            <span className="text-xs text-muted-foreground">
              Created {new Date().toLocaleDateString()}
            </span>
          </div>
          <DialogTitle className="text-xl font-display">{task.title}</DialogTitle>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                disabled={!canEditMeta}
                value={form.watch("status")}
                onValueChange={(val) => form.setValue("status", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                disabled={!canEditMeta}
                value={form.watch("priority")}
                onValueChange={(val) => form.setValue("priority", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Input 
                {...form.register("assignee")} 
                disabled={!canEditMeta} 
                className="bg-muted/30"
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date (Read Only)</Label>
              <div className="flex items-center px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm">
                {task.dueDate || "No date set"}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Progress</Label>
                <span className="text-sm font-medium text-muted-foreground">
                  {form.watch("progress")}%
                </span>
              </div>
              <Slider
                value={[form.watch("progress") || 0]}
                onValueChange={([val]) => form.setValue("progress", val)}
                max={100}
                step={5}
                className="py-4"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                {...form.register("notes")} 
                placeholder="Add update notes..."
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
