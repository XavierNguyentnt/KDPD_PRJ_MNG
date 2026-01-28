import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Task } from "@shared/schema";
import { WorkflowView } from "@/components/workflow-view";
import { Workflow, BienTapWorkflowHelpers, StageStatus } from "@shared/workflow";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateTask, useCreateTask, useDeleteTask, useTasks, UserRole } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { AssigneePicker } from "@/components/assignee-picker";
import React, { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onCreate?: (task: any) => void;
  isCreating?: boolean;
}

// Partial schema since we only update specific fields
const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  group: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  actualCompletedAt: z.string().nullable().optional(),
  // Biên tập specific fields
  roundType: z.string().optional(),
  btv2: z.string().optional(),
  btv2ReceiveDate: z.string().optional(),
  btv2CompleteDate: z.string().optional(),
  btv1: z.string().optional(),
  btv1ReceiveDate: z.string().optional(),
  btv1CompleteDate: z.string().optional(),
  docDuyet: z.string().optional(),
  docDuyetReceiveDate: z.string().optional(),
  docDuyetCompleteDate: z.string().optional(),
});

type FormData = z.infer<typeof updateSchema>;

interface DueDateBlockProps {
  isNewTask: boolean;
  dueDateLabel: string;
  actualCompletedAtLabel: string;
  closeLabel: string;
  dueDateValue: string;
  actualCompletedAtValue: string;
  onDueDateChange: (value: string) => void;
  onActualCompletedAtChange: (value: string) => void;
  onActualCompletedAtSetProgress: () => void;
  canEditMeta: boolean;
}

/** Ngày hoàn thành dự kiến (due_date) + Ngày hoàn thành thực tế (actual_completed_at). Áp dụng cho cả tạo mới và xem/sửa. */
const DueDateBlock: React.FC<DueDateBlockProps> = ({
  isNewTask,
  dueDateLabel,
  actualCompletedAtLabel,
  closeLabel: _closeLabel,
  dueDateValue,
  actualCompletedAtValue,
  onDueDateChange,
  onActualCompletedAtChange,
  onActualCompletedAtSetProgress,
  canEditMeta,
}) => {
  const canEdit = isNewTask || canEditMeta;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label>{dueDateLabel}</Label>
        <Input
          type="date"
          value={dueDateValue}
          onChange={(e) => onDueDateChange(e.target.value || "")}
          disabled={!canEdit}
          placeholder={_closeLabel}
          className="bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label>{actualCompletedAtLabel}</Label>
        <Input
          type="date"
          value={actualCompletedAtValue}
          onChange={(e) => {
            const v = e.target.value || "";
            onActualCompletedAtChange(v);
            if (v) onActualCompletedAtSetProgress();
          }}
          disabled={!canEdit}
          className="bg-background"
        />
      </div>
    </div>
  );
};

export function TaskDialog({ open, onOpenChange, task, onCreate, isCreating = false }: TaskDialogProps) {
  const { role } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const { data: allTasks } = useTasks();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();
  const isNewTask = !task;
  
  // Get available groups from all tasks
  const availableGroups = useMemo(() => {
    if (!allTasks) return ["CV chung", "Biên tập", "Thiết kế + CNTT", "Quét trùng lặp"];
    const groups = new Set(allTasks.map(t => t.group).filter(Boolean));
    return Array.from(groups).length > 0 
      ? Array.from(groups) 
      : ["CV chung", "Biên tập", "Thiết kế + CNTT", "Quét trùng lặp"];
  }, [allTasks]);
  
  const formatDateForInput = (v: string | Date | null | undefined): string => {
    if (!v) return "";
    const d = typeof v === "string" ? new Date(v) : v;
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  const form = useForm<FormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      title: task?.title || "",
      status: task?.status || "Not Started",
      priority: task?.priority || "Medium",
      assignee: task?.assignee ?? "",
      assigneeId: task?.assigneeId ?? null,
      group: task?.group || "CV chung",
      progress: task?.progress || 0,
      notes: task?.notes || "",
      dueDate: task?.dueDate ? (task.dueDate.length === 10 ? task.dueDate : formatDateForInput(task.dueDate)) : null,
      actualCompletedAt: task?.actualCompletedAt ? formatDateForInput(task.actualCompletedAt) : null,
    },
  });

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee ?? "",
        assigneeId: task.assigneeId ?? null,
        group: task.group || "CV chung",
        progress: task.progress || 0,
        notes: task.notes || "",
        dueDate: task.dueDate ? (task.dueDate.length === 10 ? task.dueDate : formatDateForInput(task.dueDate)) : null,
        actualCompletedAt: task.actualCompletedAt ? formatDateForInput(task.actualCompletedAt) : null,
      });
    } else {
      form.reset({
        title: "",
        status: "Not Started",
        priority: "Medium",
        assignee: "",
        assigneeId: null,
        group: "CV chung",
        progress: 0,
        notes: "",
        dueDate: null,
        actualCompletedAt: null,
      });
    }
  }, [task, form]);

  const canEditMeta = role === UserRole.ADMIN || role === UserRole.MANAGER;

  const onSubmit = (data: FormData) => {
    if (isNewTask && onCreate) {
      // Create new task
      if (!data.title || data.title.trim() === "") {
        form.setError("title", { message: t.task.titleRequired });
        return;
      }
      const selectedGroup = data.group || "CV chung";
      const hasActualCompletedAtCreate = data.actualCompletedAt != null && String(data.actualCompletedAt).trim() !== "";
      const payload: any = {
        title: data.title,
        description: data.description || null,
        status: hasActualCompletedAtCreate ? "Completed" : (data.status || "Not Started"),
        priority: data.priority || "Medium",
        assignee: data.assignee || null,
        assigneeId: data.assigneeId ?? null,
        group: selectedGroup,
        progress: hasActualCompletedAtCreate ? 100 : (data.progress || 0),
        notes: data.notes || null,
        dueDate: data.dueDate || null,
        actualCompletedAt: hasActualCompletedAtCreate ? new Date(data.actualCompletedAt!) : null,
      };
      
      // For Biên tập group, create workflow data
      if (selectedGroup === 'Biên tập') {
        const workflow = BienTapWorkflowHelpers.createWorkflow(1);
        if (data.roundType) workflow.rounds[0].roundType = data.roundType;
        const round = workflow.rounds[0];
        if (data.btv2) {
          round.stages[0].assignee = data.btv2;
          round.stages[0].startDate = data.btv2ReceiveDate || null;
          round.stages[0].completedDate = data.btv2CompleteDate || null;
          round.stages[0].status = data.btv2CompleteDate ? StageStatus.COMPLETED : (data.btv2ReceiveDate ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED);
        }
        if (data.btv1) {
          round.stages[1].assignee = data.btv1;
          round.stages[1].startDate = data.btv1ReceiveDate || null;
          round.stages[1].completedDate = data.btv1CompleteDate || null;
          round.stages[1].status = data.btv1CompleteDate ? StageStatus.COMPLETED : (data.btv1ReceiveDate ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED);
        }
        if (data.docDuyet) {
          round.stages[2].assignee = data.docDuyet;
          round.stages[2].startDate = data.docDuyetReceiveDate || null;
          round.stages[2].completedDate = data.docDuyetCompleteDate || null;
          round.stages[2].status = data.docDuyetCompleteDate ? StageStatus.COMPLETED : (data.docDuyetReceiveDate ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED);
        }
        
        payload.workflow = JSON.stringify(workflow);
      }
      
      onCreate(payload);
      onOpenChange(false);
      return;
    }
    
    if (!task) return;
    
    // Filter data based on role permissions. Tiến độ chỉ cập nhật theo Ngày hoàn thành thực tế.
    const hasActualCompletedAt = data.actualCompletedAt != null && String(data.actualCompletedAt).trim() !== "";
    const payload = canEditMeta 
      ? { 
          ...data, 
          assigneeId: data.assigneeId ?? undefined,
          dueDate: data.dueDate || null,
          actualCompletedAt: hasActualCompletedAt ? new Date(data.actualCompletedAt!) : null,
          progress: hasActualCompletedAt ? 100 : data.progress,
          status: hasActualCompletedAt ? "Completed" : data.status,
        } 
      : { progress: data.progress, notes: data.notes };

    updateMutation.mutate(
      { id: task.id, ...payload },
      {
        onSuccess: () => {
          toast({
            title: t.common.success,
            description: t.task.saveChanges + " " + (language === 'vi' ? 'thành công' : 'successfully'),
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: t.common.error,
            description: error.message || t.errors.failedToUpdate,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[52rem] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          {!isNewTask && task && (
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {task.id}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.task.createdAt} {new Date().toLocaleDateString()}
              </span>
            </div>
          )}
          <DialogTitle className="text-xl font-display">
            {isNewTask ? t.task.createNew : task?.title}
          </DialogTitle>
          {!isNewTask && task && task.description ? (
            <DialogDescription>{task.description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {isNewTask ? t.task.createNew : t.task.title}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-4 space-y-6">
          {isNewTask && (
            <div className="space-y-2">
              <Label>{t.task.title} *</Label>
              <Input
                {...form.register("title")}
                placeholder={t.task.title + "..."}
                className="bg-background"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>{t.task.status}</Label>
              <Select
                disabled={!canEditMeta}
                value={form.watch("status")}
                onValueChange={(val) => form.setValue("status", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.task.selectStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">{t.status.notStarted}</SelectItem>
                  <SelectItem value="In Progress">{t.status.inProgress}</SelectItem>
                  <SelectItem value="Blocked">{t.status.blocked}</SelectItem>
                  <SelectItem value="Completed">{t.status.completed}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.task.priority}</Label>
              <Select
                disabled={!canEditMeta}
                value={form.watch("priority")}
                onValueChange={(val) => form.setValue("priority", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.task.selectPriority} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">{t.priority.low}</SelectItem>
                  <SelectItem value="Medium">{t.priority.medium}</SelectItem>
                  <SelectItem value="High">{t.priority.high}</SelectItem>
                  <SelectItem value="Critical">{t.priority.critical}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {!(isNewTask && form.watch("group") === "Biên tập") && (
              <AssigneePicker
                label={t.task.assignee as string}
                value={form.watch("assignee") ?? ""}
                assigneeId={form.watch("assigneeId") ?? null}
                onChange={(assignee, assigneeId) => {
                  form.setValue("assignee", assignee);
                  form.setValue("assigneeId", assigneeId);
                }}
                disabled={!canEditMeta}
                placeholder={language === "vi" ? "Tìm theo tên hoặc email nhân sự..." : "Search by name or email..."}
              />
            )}

            <div className="space-y-2">
              <Label>{t.task.group}</Label>
              <Select
                disabled={!canEditMeta || !isNewTask}
                value={form.watch("group") || ""}
                onValueChange={(val) => form.setValue("group", val)}
              >
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder={t.task.selectGroup} />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => (
                    <SelectItem key={String(group)} value={String(group)}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Biên tập specific fields for new tasks */}
          {isNewTask && form.watch("group") === "Biên tập" && (
            <div className="space-y-4 pt-4 border-t border-border/50">
              <h3 className="text-base font-semibold">{t.task.workflow}</h3>
              
              {/* Round Type (Bông) */}
              <div className="space-y-2">
                <Label>{t.task.roundTypeLabel}</Label>
                <Select
                  value={form.watch("roundType") || ""}
                  onValueChange={(val) => form.setValue("roundType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.task.selectRoundType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tiền biên tập">Tiền biên tập</SelectItem>
                    <SelectItem value="Bông thô">Bông thô</SelectItem>
                    <SelectItem value="Bông 1 (thô)">Bông 1 (thô)</SelectItem>
                    <SelectItem value="Bông 1 (tinh)">Bông 1 (tinh)</SelectItem>
                    <SelectItem value="Bông 2 (thô)">Bông 2 (thô)</SelectItem>
                    <SelectItem value="Bông 2 (tinh)">Bông 2 (tinh)</SelectItem>
                    <SelectItem value="Bông 3 (thô)">Bông 3 (thô)</SelectItem>
                    <SelectItem value="Bông 3 (tinh)">Bông 3 (tinh)</SelectItem>
                    <SelectItem value="Bông chuyển in">Bông chuyển in</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* BTV2 Section */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">{t.task.btv2}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <AssigneePicker
                      label={t.task.btv2 + " " + (language === "vi" ? "(Tên)" : "(Name)")}
                      value={form.watch("btv2") ?? ""}
                      onChange={(assignee) => form.setValue("btv2", assignee)}
                      placeholder={language === "vi" ? "Tìm theo tên hoặc email..." : "Search by name or email..."}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.startDate}</Label>
                    <Input
                      type="date"
                      {...form.register("btv2ReceiveDate")}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.actualCompletedAt}</Label>
                    <Input
                      type="date"
                      {...form.register("btv2CompleteDate")}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* BTV1 Section */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">{t.task.btv1}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <AssigneePicker
                      label={t.task.btv1 + " " + (language === "vi" ? "(Tên)" : "(Name)")}
                      value={form.watch("btv1") ?? ""}
                      onChange={(assignee) => form.setValue("btv1", assignee)}
                      placeholder={language === "vi" ? "Tìm theo tên hoặc email..." : "Search by name or email..."}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.startDate}</Label>
                    <Input
                      type="date"
                      {...form.register("btv1ReceiveDate")}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.actualCompletedAt}</Label>
                    <Input
                      type="date"
                      {...form.register("btv1CompleteDate")}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Người đọc duyệt Section */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">{t.task.docDuyet}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <AssigneePicker
                      label={t.task.docDuyet + " " + (language === "vi" ? "(Tên)" : "(Name)")}
                      value={form.watch("docDuyet") ?? ""}
                      onChange={(assignee) => form.setValue("docDuyet", assignee)}
                      placeholder={language === "vi" ? "Tìm theo tên hoặc email..." : "Search by name or email..."}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.startDate}</Label>
                    <Input
                      type="date"
                      {...form.register("docDuyetReceiveDate")}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.actualCompletedAt}</Label>
                    <Input
                      type="date"
                      {...form.register("docDuyetCompleteDate")}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DueDateBlock
            isNewTask={isNewTask}
            dueDateLabel={t.task.dueDate}
            actualCompletedAtLabel={t.task.actualCompletedAt}
            closeLabel={t.common.close}
            dueDateValue={form.watch("dueDate") ?? ""}
            actualCompletedAtValue={form.watch("actualCompletedAt") ?? ""}
            onDueDateChange={(v) => form.setValue("dueDate", v || null)}
            onActualCompletedAtChange={(v) => form.setValue("actualCompletedAt", v || null)}
            onActualCompletedAtSetProgress={() => form.setValue("progress", 100)}
            canEditMeta={canEditMeta}
          />

          {/* Workflow View for Biên tập tasks */}
          {(!isNewTask && task && task.group === 'Biên tập' && task.workflow ? (
            <div className="space-y-2 pt-4 border-t border-border/50">
              <Label className="text-base font-semibold">
                {task.group === 'Biên tập' ? 'Quy trình Biên tập' : 'Workflow'}
              </Label>
              <div className="bg-muted/30 rounded-lg p-4">
                {(() => {
                  let workflow: Workflow | null = null;
                  try {
                    if (task.workflow) {
                      workflow = (typeof task.workflow === "string" ? JSON.parse(task.workflow) : task.workflow) as Workflow;
                    }
                  } catch (e) {
                    // Invalid workflow data
                  }
                  return <WorkflowView workflow={workflow} compact={false} />;
                })()}
              </div>
            </div>
          ) : null) as React.ReactNode}

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{t.task.progress}</Label>
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
              <Label>{t.task.notes}</Label>
              <Textarea 
                {...form.register("notes")} 
                placeholder={t.task.notes + "..."}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
          </div>

          <DialogFooter className="flex justify-between shrink-0 px-6 py-4 border-t bg-muted/30">
            <div>
              {!isNewTask && (role === UserRole.ADMIN || role === UserRole.MANAGER) && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => {
                    if (task && confirm(t.common.confirmDelete)) {
                      deleteMutation.mutate(task.id, {
                        onSuccess: () => {
                          toast({
                            title: t.common.success,
                            description: t.common.delete + " " + (language === 'vi' ? 'thành công' : 'successfully'),
                          });
                          onOpenChange(false);
                        },
                        onError: (error) => {
                          toast({
                            title: t.common.error,
                            description: error.message || t.errors.failedToDelete,
                            variant: "destructive",
                          });
                        },
                      });
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t.common.delete}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || isCreating || deleteMutation.isPending}>
                {(updateMutation.isPending || isCreating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isNewTask ? t.common.create : t.task.saveChanges}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
