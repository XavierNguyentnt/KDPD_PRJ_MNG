import React from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssigneePicker } from "@/components/assignee-picker";
import { BienTapWorkflowHelpers, StageStatus } from "@shared/workflow";

interface TaskOverviewTabProps {
  form: UseFormReturn<any>;
  t: any;
  language: string;
  canEditMeta: boolean;
  shouldFocusTitle?: boolean;
  setIsTaskStatusAutoCompleted: (val: boolean) => void;
  setLastManualTaskStatus: (val: string) => void;
  shouldFocusAssignee?: boolean;
  availableGroups: string[];
  isNewTask: boolean;
  isEditing?: boolean;
  canEditMetaRaw?: boolean;
  canEditNotesRaw?: boolean;
  thietKeKtvChinh: any;
  thietKeTroLyList: any[];
  multiAssigneesList: any[];
}

export function TaskOverviewTab({
  form,
  t,
  language,
  canEditMeta,
  shouldFocusTitle,
  setIsTaskStatusAutoCompleted,
  setLastManualTaskStatus,
  shouldFocusAssignee,
  availableGroups,
  isNewTask,
  isEditing,
  canEditMetaRaw,
  canEditNotesRaw,
  thietKeKtvChinh,
  thietKeTroLyList,
  multiAssigneesList,
}: TaskOverviewTabProps) {
  const group = form.watch("group");

  let progressValue = 0;
  if (group === "Biên tập") {
    const w = BienTapWorkflowHelpers.createWorkflow(1);
    const r = w.rounds[0];
    r.stages[0].status = form.watch("btv2CompleteDate")
      ? StageStatus.COMPLETED
      : ((form.watch("btv2Status") as StageStatus) ?? StageStatus.NOT_STARTED);
    r.stages[1].status = form.watch("btv1CompleteDate")
      ? StageStatus.COMPLETED
      : ((form.watch("btv1Status") as StageStatus) ?? StageStatus.NOT_STARTED);
    r.stages[2].status = form.watch("docDuyetCompleteDate")
      ? StageStatus.COMPLETED
      : ((form.watch("docDuyetStatus") as StageStatus) ?? StageStatus.NOT_STARTED);
    progressValue = BienTapWorkflowHelpers.calculateProgress(w);
  } else if (group === "Thiết kế") {
    const slots = [
      thietKeKtvChinh.userId ? thietKeKtvChinh : null,
      ...thietKeTroLyList.filter((s) => s.userId),
    ].filter(Boolean) as Array<{ completeDate?: string | null }>;
    const n = slots.length;
    const m = slots.filter(
      (s) => s.completeDate != null && String(s.completeDate).trim() !== "",
    ).length;
    progressValue = n === 0 ? 0 : Math.round((100 / n) * m);
  } else if (
    group === "Công việc chung" ||
    group === "CNTT" ||
    group === "Quét trùng lặp" ||
    group === "Thư ký hợp phần"
  ) {
    const staff = multiAssigneesList.filter(
      (s) => s.label !== "Người kiểm soát" && s.userId,
    );
    const n = staff.length;
    const m = staff.filter(
      (s) => !!s.completedAt || s.status === "completed",
    ).length;
    progressValue = n === 0 ? 0 : Math.round((100 / n) * m);
  } else {
    progressValue =
      form.watch("actualCompletedAt") != null &&
      String(form.watch("actualCompletedAt")).trim() !== ""
        ? 100
        : 0;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{t.task.title} *</Label>
        <Input
          {...form.register("title")}
          placeholder={t.task.title + "..."}
          className="bg-background"
          disabled={!canEditMeta}
          autoFocus={shouldFocusTitle}
        />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message as string}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label>{t.task.status}</Label>
          <Select
            disabled={!canEditMeta}
            value={form.watch("status")}
            onValueChange={(val) => {
              form.setValue("status", val);
              setIsTaskStatusAutoCompleted(false);
              if (val !== "Completed") setLastManualTaskStatus(val);
            }}>
            <SelectTrigger>
              <SelectValue placeholder={t.task.selectStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Not Started">{t.status.notStarted}</SelectItem>
              <SelectItem value="In Progress">{t.status.inProgress}</SelectItem>
              <SelectItem value="Pending">{t.status.pending}</SelectItem>
              <SelectItem value="Cancelled">{t.status.cancelled}</SelectItem>
              <SelectItem value="Completed">{t.status.completed}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t.task.priority}</Label>
          <Select
            disabled={!canEditMeta}
            value={form.watch("priority")}
            onValueChange={(val) => form.setValue("priority", val)}>
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

        {/* Ẩn ô Người thực hiện đơn khi nhóm dùng workflow / Thiết kế / nhiều nhân sự */}
        {group !== "Biên tập" &&
          group !== "Thiết kế" &&
          group !== "Công việc chung" &&
          group !== "CNTT" &&
          group !== "Quét trùng lặp" &&
          group !== "Thư ký hợp phần" && (
            <div className="sm:col-span-2">
              <AssigneePicker
                label={t.task.assignee as string}
                value={form.watch("assignee") ?? ""}
                assigneeId={form.watch("assigneeId") ?? null}
                onChange={(assignee, assigneeId) => {
                  form.setValue("assignee", assignee);
                  form.setValue("assigneeId", assigneeId);
                }}
                disabled={!canEditMeta}
                placeholder={
                  language === "vi"
                    ? "Tìm theo tên hoặc email nhân sự..."
                    : "Search by name or email..."
                }
                autoFocus={shouldFocusAssignee}
              />
            </div>
          )}

        <div className="space-y-2 sm:col-span-2">
          <Label>{t.task.group}</Label>
          <Select
            disabled={!canEditMeta || !isNewTask}
            value={form.watch("group") || ""}
            onValueChange={(val) => form.setValue("group", val)}>
            <SelectTrigger className="bg-muted/30">
              <SelectValue placeholder={t.task.selectGroup} />
            </SelectTrigger>
            <SelectContent>
              {availableGroups.map((grp) => (
                <SelectItem key={String(grp)} value={String(grp)}>
                  {grp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ===== MERGED FROM TAB "Tổng kết" (Summary) ===== */}
      <div className="space-y-4 pt-4 mt-2 border-t border-border/60">
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-2">
            <Label>{t.task.progress}</Label>
            <span className="text-sm font-medium text-muted-foreground shrink-0">
              {progressValue}%
            </span>
          </div>
          <Progress value={progressValue} className="h-2 w-full" />
        </div>

        <div className="space-y-2">
          <Label>{t.task.notes}</Label>
          <Textarea
            {...form.register("notes")}
            placeholder={t.task.notes + "..."}
            className="min-h-[100px] resize-none"
            disabled={
              !isNewTask &&
              (!isEditing || !(canEditMetaRaw || canEditNotesRaw))
            }
          />
        </div>
      </div>
    </div>
  );
}
