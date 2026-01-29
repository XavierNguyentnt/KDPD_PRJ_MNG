import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { WorkflowView } from "@/components/workflow-view";
import { Workflow, BienTapWorkflowHelpers, StageStatus } from "@shared/workflow";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateTask, useCreateTask, useDeleteTask, useTasks, useTask, UserRole } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { AssigneePicker } from "@/components/assignee-picker";
import { DateInput } from "@/components/ui/date-input";
import { formatDateDDMMYYYY, maxDateString } from "@/lib/utils";
import React, { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithAssignmentDetails | null;
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
  // Biên tập specific fields (per-stage: receive date, due date, completed date, status, cancel reason; id = userId cho task_assignments)
  roundType: z.string().optional(),
  btv2: z.string().optional(),
  btv2Id: z.string().uuid().nullable().optional(),
  btv2ReceiveDate: z.string().optional(),
  btv2DueDate: z.string().nullable().optional(),
  btv2CompleteDate: z.string().optional(),
  btv2Status: z.string().optional(),
  btv2CancelReason: z.string().optional(),
  btv1: z.string().optional(),
  btv1Id: z.string().uuid().nullable().optional(),
  btv1ReceiveDate: z.string().optional(),
  btv1DueDate: z.string().nullable().optional(),
  btv1CompleteDate: z.string().optional(),
  btv1Status: z.string().optional(),
  btv1CancelReason: z.string().optional(),
  docDuyet: z.string().optional(),
  docDuyetId: z.string().uuid().nullable().optional(),
  docDuyetReceiveDate: z.string().optional(),
  docDuyetDueDate: z.string().nullable().optional(),
  docDuyetCompleteDate: z.string().optional(),
  docDuyetStatus: z.string().optional(),
  docDuyetCancelReason: z.string().optional(),
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
  /** Khi Biên tập: hiển thị read-only theo ngày lớn nhất của các stage (dd/mm/yyyy). */
  isBienTap?: boolean;
  computedDueDisplay?: string;
  computedActualDisplay?: string;
}

/** Lấy round_number (1, 2, 3...) từ Loại bông (roundType). Ví dụ: "Bông 3 (thô)" → 3. */
function roundNumberFromRoundType(roundType: string | null | undefined): number {
  if (!roundType || typeof roundType !== "string") return 1;
  const m = roundType.match(/Bông\s*(\d+)/i);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

/** Ngày hoàn thành dự kiến + Ngày hoàn thành thực tế. Với Biên tập: tự động = max(stages), chỉ đọc, dd/mm/yyyy. */
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
  isBienTap,
  computedDueDisplay,
  computedActualDisplay,
}) => {
  const canEdit = !isBienTap && (isNewTask || canEditMeta);
  if (isBienTap) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>{dueDateLabel}</Label>
          <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
            {computedDueDisplay || "—"}
          </div>
        </div>
        <div className="space-y-2">
          <Label>{actualCompletedAtLabel}</Label>
          <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
            {computedActualDisplay || "—"}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label>{dueDateLabel}</Label>
        <DateInput
          value={dueDateValue || null}
          onChange={(v) => onDueDateChange(v || "")}
          disabled={!canEdit}
          placeholder="dd/mm/yyyy"
          className="bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label>{actualCompletedAtLabel}</Label>
        <DateInput
          value={actualCompletedAtValue || null}
          onChange={(v) => {
            onActualCompletedAtChange(v || "");
            if (v) onActualCompletedAtSetProgress();
          }}
          disabled={!canEdit}
          placeholder="dd/mm/yyyy"
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
  const { data: taskWithAssignments } = useTask(task?.id ?? "", { includeAssignments: task?.group === "Biên tập" });
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();
  const isNewTask = !task;
  const effectiveTask = (task?.group === "Biên tập" ? taskWithAssignments ?? task : task) as TaskWithAssignmentDetails | null;
  
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

  // Reset form when task changes; for Biên tập tasks populate workflow stage fields (use effectiveTask to get assignments when available)
  useEffect(() => {
    if (effectiveTask) {
      const base = {
        title: effectiveTask.title,
        status: effectiveTask.status,
        priority: effectiveTask.priority,
        assignee: effectiveTask.assignee ?? "",
        assigneeId: effectiveTask.assigneeId ?? null,
        group: effectiveTask.group || "CV chung",
        progress: effectiveTask.progress || 0,
        notes: effectiveTask.notes || "",
        dueDate: effectiveTask.dueDate ? (effectiveTask.dueDate.length === 10 ? effectiveTask.dueDate : formatDateForInput(effectiveTask.dueDate)) : null,
        actualCompletedAt: effectiveTask.actualCompletedAt ? formatDateForInput(effectiveTask.actualCompletedAt) : null,
      };
      if (effectiveTask.group === "Biên tập" && effectiveTask.workflow) {
        try {
          const w = typeof effectiveTask.workflow === "string" ? JSON.parse(effectiveTask.workflow) : effectiveTask.workflow;
          const round = w?.rounds?.[0];
          if (round) {
            const assignments = (effectiveTask as TaskWithAssignmentDetails & { assignments?: Array<{ stageType: string; userId: string }> }).assignments;
            Object.assign(base, {
              roundType: round.roundType ?? "",
              btv2: round.stages?.[0]?.assignee ?? "",
              btv2Id: assignments?.find((a) => a.stageType === "btv2")?.userId ?? null,
              btv2ReceiveDate: round.stages?.[0]?.startDate ?? "",
              btv2DueDate: round.stages?.[0]?.dueDate ?? null,
              btv2CompleteDate: round.stages?.[0]?.completedDate ?? "",
              btv2Status: round.stages?.[0]?.status ?? StageStatus.NOT_STARTED,
              btv2CancelReason: round.stages?.[0]?.cancelReason ?? "",
              btv1: round.stages?.[1]?.assignee ?? "",
              btv1Id: assignments?.find((a) => a.stageType === "btv1")?.userId ?? null,
              btv1ReceiveDate: round.stages?.[1]?.startDate ?? "",
              btv1DueDate: round.stages?.[1]?.dueDate ?? null,
              btv1CompleteDate: round.stages?.[1]?.completedDate ?? "",
              btv1Status: round.stages?.[1]?.status ?? StageStatus.NOT_STARTED,
              btv1CancelReason: round.stages?.[1]?.cancelReason ?? "",
              docDuyet: round.stages?.[2]?.assignee ?? "",
              docDuyetId: assignments?.find((a) => a.stageType === "doc_duyet")?.userId ?? null,
              docDuyetReceiveDate: round.stages?.[2]?.startDate ?? "",
              docDuyetDueDate: round.stages?.[2]?.dueDate ?? null,
              docDuyetCompleteDate: round.stages?.[2]?.completedDate ?? "",
              docDuyetStatus: round.stages?.[2]?.status ?? StageStatus.NOT_STARTED,
              docDuyetCancelReason: round.stages?.[2]?.cancelReason ?? "",
            });
          }
        } catch (_) {}
      }
      form.reset(base);
    } else if (!task) {
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
        roundType: "",
        btv2: "",
        btv2Id: null,
        btv2ReceiveDate: "",
        btv2DueDate: null,
        btv2CompleteDate: "",
        btv2Status: StageStatus.NOT_STARTED,
        btv2CancelReason: "",
        btv1: "",
        btv1Id: null,
        btv1ReceiveDate: "",
        btv1DueDate: null,
        btv1CompleteDate: "",
        btv1Status: StageStatus.NOT_STARTED,
        btv1CancelReason: "",
        docDuyet: "",
        docDuyetId: null,
        docDuyetReceiveDate: "",
        docDuyetDueDate: null,
        docDuyetCompleteDate: "",
        docDuyetStatus: StageStatus.NOT_STARTED,
        docDuyetCancelReason: "",
      });
    }
  }, [effectiveTask, task, form]);

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
      const progressVal = hasActualCompletedAtCreate ? 100 : (data.progress || 0);
      const statusVal = hasActualCompletedAtCreate ? "Completed" : (data.status || "Not Started");
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description ?? null,
        status: statusVal,
        priority: data.priority || "Medium",
        group: selectedGroup,
        progress: progressVal,
        notes: data.notes != null && String(data.notes).trim() !== "" ? String(data.notes).trim() : null,
      };

      // Non-Biên tập: gửi assignments thay vì assignee/dueDate/actualCompletedAt trên task
      if (selectedGroup !== "Biên tập" && data.assigneeId) {
        payload.assignments = [
          {
            userId: data.assigneeId,
            stageType: "primary",
            dueDate: data.dueDate || null,
            receivedAt: null,
            status: hasActualCompletedAtCreate ? "completed" : (data.status === "In Progress" ? "in_progress" : "not_started"),
            progress: progressVal,
            completedAt: hasActualCompletedAtCreate && data.actualCompletedAt ? new Date(data.actualCompletedAt).toISOString() : null,
          },
        ];
      }

      // For Biên tập group, create workflow data (per-stage: receive, due, completed, status, cancelReason)
      if (selectedGroup === 'Biên tập') {
        const workflow = BienTapWorkflowHelpers.createWorkflow(1);
        if (data.roundType) workflow.rounds[0].roundType = data.roundType;
        const round = workflow.rounds[0];
        round.stages[0].assignee = data.btv2 || null;
        round.stages[0].startDate = data.btv2ReceiveDate || null;
        round.stages[0].dueDate = data.btv2DueDate || null;
        round.stages[0].completedDate = data.btv2CompleteDate || null;
        round.stages[0].cancelReason = data.btv2CancelReason || null;
        round.stages[0].status = data.btv2CompleteDate ? StageStatus.COMPLETED : ((data.btv2Status as StageStatus) || (data.btv2ReceiveDate ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED));
        round.stages[0].progress = data.btv2CompleteDate ? 100 : 0;
        round.stages[1].assignee = data.btv1 || null;
        round.stages[1].startDate = data.btv1ReceiveDate || null;
        round.stages[1].dueDate = data.btv1DueDate || null;
        round.stages[1].completedDate = data.btv1CompleteDate || null;
        round.stages[1].cancelReason = data.btv1CancelReason || null;
        round.stages[1].status = data.btv1CompleteDate ? StageStatus.COMPLETED : ((data.btv1Status as StageStatus) || (data.btv1ReceiveDate ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED));
        round.stages[1].progress = data.btv1CompleteDate ? 100 : 0;
        round.stages[2].assignee = data.docDuyet || null;
        round.stages[2].startDate = data.docDuyetReceiveDate || null;
        round.stages[2].dueDate = data.docDuyetDueDate || null;
        round.stages[2].completedDate = data.docDuyetCompleteDate || null;
        round.stages[2].cancelReason = data.docDuyetCancelReason || null;
        round.stages[2].status = data.docDuyetCompleteDate ? StageStatus.COMPLETED : ((data.docDuyetStatus as StageStatus) || (data.docDuyetReceiveDate ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED));
        round.stages[2].progress = data.docDuyetCompleteDate ? 100 : 0;
        payload.workflow = JSON.stringify(workflow);
        payload.progress = BienTapWorkflowHelpers.calculateProgress(workflow);
        const lastStageActual = data.docDuyetCompleteDate?.trim() ? data.docDuyetCompleteDate : null;
        payload.status = lastStageActual ? "Completed" : (payload.status ?? "Not Started");
        // Ghi vào task_assignments: mỗi stage có userId thì thêm 1 assignment; round_number lấy từ Loại bông (Bông 1 → 1, Bông 3 → 3)
        const stageStatusToApi = (s: string) => (s === StageStatus.COMPLETED ? "completed" : s === StageStatus.IN_PROGRESS ? "in_progress" : "not_started");
        const roundNum = roundNumberFromRoundType(data.roundType);
        payload.assignments = [
          data.btv2Id && { userId: data.btv2Id, stageType: "btv2", roundNumber: roundNum, receivedAt: data.btv2ReceiveDate || null, dueDate: data.btv2DueDate || null, completedAt: data.btv2CompleteDate ? new Date(data.btv2CompleteDate).toISOString() : null, status: stageStatusToApi(data.btv2Status ?? StageStatus.NOT_STARTED), progress: data.btv2CompleteDate ? 100 : 0 },
          data.btv1Id && { userId: data.btv1Id, stageType: "btv1", roundNumber: roundNum, receivedAt: data.btv1ReceiveDate || null, dueDate: data.btv1DueDate || null, completedAt: data.btv1CompleteDate ? new Date(data.btv1CompleteDate).toISOString() : null, status: stageStatusToApi(data.btv1Status ?? StageStatus.NOT_STARTED), progress: data.btv1CompleteDate ? 100 : 0 },
          data.docDuyetId && { userId: data.docDuyetId, stageType: "doc_duyet", roundNumber: roundNum, receivedAt: data.docDuyetReceiveDate || null, dueDate: data.docDuyetDueDate || null, completedAt: data.docDuyetCompleteDate ? new Date(data.docDuyetCompleteDate).toISOString() : null, status: stageStatusToApi(data.docDuyetStatus ?? StageStatus.NOT_STARTED), progress: data.docDuyetCompleteDate ? 100 : 0 },
        ].filter(Boolean) as Array<{ userId: string; stageType: string; roundNumber: number; receivedAt: string | null; dueDate: string | null; completedAt: string | null; status: string; progress: number }>;
      }

      onCreate(payload);
      onOpenChange(false);
      return;
    }
    
    if (!task) return;

    const hasActualCompletedAt = data.actualCompletedAt != null && String(data.actualCompletedAt).trim() !== "";
    const progressVal = hasActualCompletedAt ? 100 : data.progress;
    const statusVal = hasActualCompletedAt ? "Completed" : data.status;
    const payload: Record<string, unknown> = canEditMeta
      ? {
          title: data.title,
          description: data.description ?? null,
          status: statusVal,
          priority: data.priority,
          group: data.group,
          progress: progressVal,
          notes: data.notes != null && String(data.notes).trim() !== "" ? String(data.notes).trim() : null,
        }
      : { progress: data.progress, notes: data.notes != null && String(data.notes).trim() !== "" ? String(data.notes).trim() : null };

    // Non-Biên tập: gửi assignments thay vì assignee/dueDate/actualCompletedAt trên task ([] = xóa hết gán việc)
    if (canEditMeta && task.group !== "Biên tập") {
      payload.assignments = data.assigneeId
        ? [
            {
              userId: data.assigneeId,
              stageType: "primary",
              dueDate: data.dueDate || null,
              receivedAt: null,
              status: hasActualCompletedAt ? "completed" : (data.status === "In Progress" ? "in_progress" : "not_started"),
              progress: progressVal,
              completedAt: hasActualCompletedAt && data.actualCompletedAt ? new Date(data.actualCompletedAt).toISOString() : null,
            },
          ]
        : [];
    }

    // When editing Biên tập task, send workflow built from form stage fields
    if (canEditMeta && task.group === "Biên tập") {
      const workflow = BienTapWorkflowHelpers.createWorkflow(1);
      if (data.roundType) workflow.rounds[0].roundType = data.roundType;
      const round = workflow.rounds[0];
      round.stages[0].assignee = data.btv2 || null;
      round.stages[0].startDate = data.btv2ReceiveDate || null;
      round.stages[0].dueDate = data.btv2DueDate || null;
      round.stages[0].completedDate = data.btv2CompleteDate || null;
      round.stages[0].cancelReason = data.btv2CancelReason || null;
      round.stages[0].status = data.btv2CompleteDate ? StageStatus.COMPLETED : ((data.btv2Status as StageStatus) ?? StageStatus.NOT_STARTED);
      round.stages[0].progress = data.btv2CompleteDate ? 100 : 0;
      round.stages[1].assignee = data.btv1 || null;
      round.stages[1].startDate = data.btv1ReceiveDate || null;
      round.stages[1].dueDate = data.btv1DueDate || null;
      round.stages[1].completedDate = data.btv1CompleteDate || null;
      round.stages[1].cancelReason = data.btv1CancelReason || null;
      round.stages[1].status = data.btv1CompleteDate ? StageStatus.COMPLETED : ((data.btv1Status as StageStatus) ?? StageStatus.NOT_STARTED);
      round.stages[1].progress = data.btv1CompleteDate ? 100 : 0;
      round.stages[2].assignee = data.docDuyet || null;
      round.stages[2].startDate = data.docDuyetReceiveDate || null;
      round.stages[2].dueDate = data.docDuyetDueDate || null;
      round.stages[2].completedDate = data.docDuyetCompleteDate || null;
      round.stages[2].cancelReason = data.docDuyetCancelReason || null;
      round.stages[2].status = data.docDuyetCompleteDate ? StageStatus.COMPLETED : ((data.docDuyetStatus as StageStatus) ?? StageStatus.NOT_STARTED);
      round.stages[2].progress = data.docDuyetCompleteDate ? 100 : 0;
      payload.workflow = JSON.stringify(workflow);
      payload.progress = BienTapWorkflowHelpers.calculateProgress(workflow);
      const lastStageActual = data.docDuyetCompleteDate?.trim() ? data.docDuyetCompleteDate : null;
      payload.status = lastStageActual ? "Completed" : (payload.status as string);
      if (data.btv2Id || data.btv1Id || data.docDuyetId) {
        const stageStatusToApi = (s: string) => (s === StageStatus.COMPLETED ? "completed" : s === StageStatus.IN_PROGRESS ? "in_progress" : "not_started");
        const roundNum = roundNumberFromRoundType(data.roundType);
        payload.assignments = [
          data.btv2Id && { userId: data.btv2Id, stageType: "btv2", roundNumber: roundNum, receivedAt: data.btv2ReceiveDate || null, dueDate: data.btv2DueDate || null, completedAt: data.btv2CompleteDate ? new Date(data.btv2CompleteDate).toISOString() : null, status: stageStatusToApi(data.btv2Status ?? StageStatus.NOT_STARTED), progress: data.btv2CompleteDate ? 100 : 0 },
          data.btv1Id && { userId: data.btv1Id, stageType: "btv1", roundNumber: roundNum, receivedAt: data.btv1ReceiveDate || null, dueDate: data.btv1DueDate || null, completedAt: data.btv1CompleteDate ? new Date(data.btv1CompleteDate).toISOString() : null, status: stageStatusToApi(data.btv1Status ?? StageStatus.NOT_STARTED), progress: data.btv1CompleteDate ? 100 : 0 },
          data.docDuyetId && { userId: data.docDuyetId, stageType: "doc_duyet", roundNumber: roundNum, receivedAt: data.docDuyetReceiveDate || null, dueDate: data.docDuyetDueDate || null, completedAt: data.docDuyetCompleteDate ? new Date(data.docDuyetCompleteDate).toISOString() : null, status: stageStatusToApi(data.docDuyetStatus ?? StageStatus.NOT_STARTED), progress: data.docDuyetCompleteDate ? 100 : 0 },
        ].filter(Boolean) as Array<{ userId: string; stageType: string; roundNumber: number; receivedAt: string | null; dueDate: string | null; completedAt: string | null; status: string; progress: number }>;
      }
    }

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
                {t.task.createdAt} {task?.createdAt ? formatDateDDMMYYYY(task.createdAt) : formatDateDDMMYYYY(new Date())}
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
            
            {/* Biên tập: không hiển thị Người thực hiện ở trên, vì đã có BTV2/BTV1/Người đọc duyệt trong Quy trình Biên tập bên dưới */}
            {form.watch("group") !== "Biên tập" && (
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

          {/* Biên tập: per-stage receive date, due date, completed date, status, cancel reason (create + edit) */}
          {form.watch("group") === "Biên tập" && (
            <div className="space-y-4 pt-4 border-t border-border/50">
              <h3 className="text-base font-semibold">{t.task.workflow}</h3>
              
              <div className="space-y-2">
                <Label>{t.task.roundTypeLabel}</Label>
                <Select
                  value={form.watch("roundType") || ""}
                  onValueChange={(val) => form.setValue("roundType", val)}
                  disabled={!isNewTask && !canEditMeta}
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

              {/* BTV2 */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">{t.task.btv2}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <AssigneePicker
                      label={t.task.btv2 + " " + (language === "vi" ? "(Tên)" : "(Name)")}
                      value={form.watch("btv2") ?? ""}
                      assigneeId={form.watch("btv2Id") ?? null}
                      onChange={(assignee, assigneeId) => {
                        form.setValue("btv2", assignee);
                        form.setValue("btv2Id", assigneeId);
                      }}
                      placeholder={language === "vi" ? "Tìm theo tên hoặc email..." : "Search by name or email..."}
                      disabled={!isNewTask && !canEditMeta}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.startDate}</Label>
                    <DateInput
                      value={form.watch("btv2ReceiveDate") || null}
                      onChange={(v) => form.setValue("btv2ReceiveDate", v ?? "")}
                      placeholder="dd/mm/yyyy"
                      className="bg-background"
                      disabled={!isNewTask && !canEditMeta}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.dueDate}</Label>
                    <DateInput
                      value={form.watch("btv2DueDate") || null}
                      onChange={(v) => form.setValue("btv2DueDate", v ?? null)}
                      placeholder="dd/mm/yyyy"
                      className="bg-background"
                      disabled={!isNewTask && !canEditMeta}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.actualCompletedAt}</Label>
                    <DateInput
                      value={form.watch("btv2CompleteDate") || null}
                      onChange={(v) => {
                        form.setValue("btv2CompleteDate", v ?? "");
                        if (v) form.setValue("btv2Status", StageStatus.COMPLETED);
                      }}
                      placeholder="dd/mm/yyyy"
                      className="bg-background"
                      disabled={!isNewTask && !canEditMeta}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.status}</Label>
                    <Select
                      value={form.watch("btv2CompleteDate") ? StageStatus.COMPLETED : (form.watch("btv2Status") ?? StageStatus.NOT_STARTED)}
                      onValueChange={(val) => form.setValue("btv2Status", val)}
                      disabled={!!form.watch("btv2CompleteDate") || (!isNewTask && !canEditMeta)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={StageStatus.NOT_STARTED}>{t.status.notStarted}</SelectItem>
                        <SelectItem value={StageStatus.IN_PROGRESS}>{t.status.inProgress}</SelectItem>
                        <SelectItem value={StageStatus.COMPLETED}>{t.status.completed}</SelectItem>
                        <SelectItem value={StageStatus.CANCELLED}>{t.status.cancelled}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.watch("btv2Status") === StageStatus.CANCELLED && (
                    <div className="space-y-2">
                      <Label className="text-xs">{t.task.cancelReason}</Label>
                      <Input
                        value={form.watch("btv2CancelReason") ?? ""}
                        onChange={(e) => form.setValue("btv2CancelReason", e.target.value)}
                        placeholder={language === "vi" ? "Nêu lí do hủy..." : "Cancel reason..."}
                        className="bg-background"
                        disabled={!isNewTask && !canEditMeta}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* BTV1 */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">{t.task.btv1}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <AssigneePicker
                      label={t.task.btv1 + " " + (language === "vi" ? "(Tên)" : "(Name)")}
                      value={form.watch("btv1") ?? ""}
                      assigneeId={form.watch("btv1Id") ?? null}
                      onChange={(assignee, assigneeId) => {
                        form.setValue("btv1", assignee);
                        form.setValue("btv1Id", assigneeId);
                      }}
                      placeholder={language === "vi" ? "Tìm theo tên hoặc email..." : "Search by name or email..."}
                      disabled={!isNewTask && !canEditMeta}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.startDate}</Label>
                    <DateInput value={form.watch("btv1ReceiveDate") || null} onChange={(v) => form.setValue("btv1ReceiveDate", v ?? "")} placeholder="dd/mm/yyyy" className="bg-background" disabled={!isNewTask && !canEditMeta} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.dueDate}</Label>
                    <DateInput value={form.watch("btv1DueDate") || null} onChange={(v) => form.setValue("btv1DueDate", v ?? null)} placeholder="dd/mm/yyyy" className="bg-background" disabled={!isNewTask && !canEditMeta} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.actualCompletedAt}</Label>
                    <DateInput
                      value={form.watch("btv1CompleteDate") || null}
                      onChange={(v) => { form.setValue("btv1CompleteDate", v ?? ""); if (v) form.setValue("btv1Status", StageStatus.COMPLETED); }}
                      placeholder="dd/mm/yyyy"
                      className="bg-background"
                      disabled={!isNewTask && !canEditMeta}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.status}</Label>
                    <Select value={form.watch("btv1CompleteDate") ? StageStatus.COMPLETED : (form.watch("btv1Status") ?? StageStatus.NOT_STARTED)} onValueChange={(val) => form.setValue("btv1Status", val)} disabled={!!form.watch("btv1CompleteDate") || (!isNewTask && !canEditMeta)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={StageStatus.NOT_STARTED}>{t.status.notStarted}</SelectItem>
                        <SelectItem value={StageStatus.IN_PROGRESS}>{t.status.inProgress}</SelectItem>
                        <SelectItem value={StageStatus.COMPLETED}>{t.status.completed}</SelectItem>
                        <SelectItem value={StageStatus.CANCELLED}>{t.status.cancelled}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.watch("btv1Status") === StageStatus.CANCELLED && (
                    <div className="space-y-2">
                      <Label className="text-xs">{t.task.cancelReason}</Label>
                      <Input value={form.watch("btv1CancelReason") ?? ""} onChange={(e) => form.setValue("btv1CancelReason", e.target.value)} placeholder={language === "vi" ? "Nêu lí do hủy..." : "Cancel reason..."} className="bg-background" disabled={!isNewTask && !canEditMeta} />
                    </div>
                  )}
                </div>
              </div>

              {/* Người đọc duyệt */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">{t.task.docDuyet}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <AssigneePicker
                      label={t.task.docDuyet + " " + (language === "vi" ? "(Tên)" : "(Name)")}
                      value={form.watch("docDuyet") ?? ""}
                      assigneeId={form.watch("docDuyetId") ?? null}
                      onChange={(assignee, assigneeId) => {
                        form.setValue("docDuyet", assignee);
                        form.setValue("docDuyetId", assigneeId);
                      }}
                      placeholder={language === "vi" ? "Tìm theo tên hoặc email..." : "Search by name or email..."}
                      disabled={!isNewTask && !canEditMeta}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.startDate}</Label>
                    <DateInput value={form.watch("docDuyetReceiveDate") || null} onChange={(v) => form.setValue("docDuyetReceiveDate", v ?? "")} placeholder="dd/mm/yyyy" className="bg-background" disabled={!isNewTask && !canEditMeta} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.dueDate}</Label>
                    <DateInput value={form.watch("docDuyetDueDate") || null} onChange={(v) => form.setValue("docDuyetDueDate", v ?? null)} placeholder="dd/mm/yyyy" className="bg-background" disabled={!isNewTask && !canEditMeta} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.actualCompletedAt}</Label>
                    <DateInput
                      value={form.watch("docDuyetCompleteDate") || null}
                      onChange={(v) => { form.setValue("docDuyetCompleteDate", v ?? ""); if (v) form.setValue("docDuyetStatus", StageStatus.COMPLETED); }}
                      placeholder="dd/mm/yyyy"
                      className="bg-background"
                      disabled={!isNewTask && !canEditMeta}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div className="space-y-2">
                    <Label className="text-xs">{t.task.status}</Label>
                    <Select value={form.watch("docDuyetCompleteDate") ? StageStatus.COMPLETED : (form.watch("docDuyetStatus") ?? StageStatus.NOT_STARTED)} onValueChange={(val) => form.setValue("docDuyetStatus", val)} disabled={!!form.watch("docDuyetCompleteDate") || (!isNewTask && !canEditMeta)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={StageStatus.NOT_STARTED}>{t.status.notStarted}</SelectItem>
                        <SelectItem value={StageStatus.IN_PROGRESS}>{t.status.inProgress}</SelectItem>
                        <SelectItem value={StageStatus.COMPLETED}>{t.status.completed}</SelectItem>
                        <SelectItem value={StageStatus.CANCELLED}>{t.status.cancelled}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.watch("docDuyetStatus") === StageStatus.CANCELLED && (
                    <div className="space-y-2">
                      <Label className="text-xs">{t.task.cancelReason}</Label>
                      <Input value={form.watch("docDuyetCancelReason") ?? ""} onChange={(e) => form.setValue("docDuyetCancelReason", e.target.value)} placeholder={language === "vi" ? "Nêu lí do hủy..." : "Cancel reason..."} className="bg-background" disabled={!isNewTask && !canEditMeta} />
                    </div>
                  )}
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
            isBienTap={form.watch("group") === "Biên tập"}
            computedDueDisplay={form.watch("group") === "Biên tập" ? formatDateDDMMYYYY(maxDateString(form.watch("btv2DueDate"), form.watch("btv1DueDate"), form.watch("docDuyetDueDate"))) : undefined}
            computedActualDisplay={form.watch("group") === "Biên tập" ? formatDateDDMMYYYY(form.watch("docDuyetCompleteDate")) : undefined}
          />

          {/* Workflow View for Biên tập tasks (chỉ khi không hiển thị form Biên tập để tránh trùng) */}
          {!isNewTask && task && task.group === 'Biên tập' && task.workflow && form.watch("group") !== "Biên tập" ? (
            <div className="space-y-2 pt-4 border-t border-border/50">
              <Label className="text-base font-semibold">Quy trình Biên tập</Label>
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
          ) : null}

          <div className="space-y-4 pt-4 border-t border-border/50">
            {form.watch("group") === "Biên tập" ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>{t.task.progress}</Label>
                  <span className="text-sm font-medium text-muted-foreground">
                    {(() => {
                      const w = BienTapWorkflowHelpers.createWorkflow(1);
                      const r = w.rounds[0];
                      r.stages[0].status = form.watch("btv2CompleteDate") ? StageStatus.COMPLETED : (form.watch("btv2Status") as StageStatus) ?? StageStatus.NOT_STARTED;
                      r.stages[1].status = form.watch("btv1CompleteDate") ? StageStatus.COMPLETED : (form.watch("btv1Status") as StageStatus) ?? StageStatus.NOT_STARTED;
                      r.stages[2].status = form.watch("docDuyetCompleteDate") ? StageStatus.COMPLETED : (form.watch("docDuyetStatus") as StageStatus) ?? StageStatus.NOT_STARTED;
                      return BienTapWorkflowHelpers.calculateProgress(w) + "%";
                    })()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "vi" ? "Tiến độ tự động theo các stage: BTV 2 = 33%, BTV 1 = 66%, Người đọc duyệt = 100%." : "Progress is auto-calculated from stages: Editor 2 = 33%, Editor 1 = 66%, Reviewer = 100%."}
                </p>
              </div>
            ) : (
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
            )}

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
