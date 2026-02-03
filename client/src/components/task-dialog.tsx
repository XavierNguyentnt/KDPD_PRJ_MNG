import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { WorkflowView } from "@/components/workflow-view";
import {
  Workflow,
  BienTapWorkflowHelpers,
  StageStatus,
} from "@shared/workflow";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useUpdateTask,
  useCreateTask,
  useDeleteTask,
  useTasks,
  useTask,
  UserRole,
} from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { AssigneePicker } from "@/components/assignee-picker";
import { WorkPicker } from "@/components/work-picker";
import { DateInput } from "@/components/ui/date-input";
import { formatDateDDMMYYYY, formatNumberAccounting, maxDateString } from "@/lib/utils";
import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type {
  Work,
  Component as ComponentType,
  ProofreadingContract,
} from "@shared/schema";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithAssignmentDetails | null;
  onCreate?: (task: any) => void;
  isCreating?: boolean;
  /** Nhóm mặc định khi tạo mới (theo trang đang mở: Công việc chung, Biên tập, Thiết kế, CNTT) */
  defaultGroup?: string;
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
  // Biên tập – tài liệu dịch thuật của Dự án: đối tượng = tác phẩm
  relatedWorkId: z.string().uuid().nullable().optional(),
  relatedContractId: z.string().uuid().nullable().optional(),
  taskType: z.string().optional(),
  // Đánh giá của Người kiểm soát (Công việc chung / CNTT / Quét): tot | kha | khong_tot | khong_hoan_thanh
  vote: z.string().nullable().optional(),
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

/** Hiển thị giai đoạn: 1,2,3 → "GĐ 1", "GĐ 2". */
function formatStageDisplay(stage: string | null | undefined): string {
  if (stage == null || stage === "") return "—";
  const num = String(stage).replace(/\D/g, "");
  return num ? "GĐ " + num : "GĐ " + stage;
}

/** Lấy round_number (1, 2, 3...) từ Loại bông (roundType). Ví dụ: "Bông 3 (thô)" → 3. */
function roundNumberFromRoundType(
  roundType: string | null | undefined,
): number {
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
  const showAsTotal =
    isBienTap ||
    (computedDueDisplay !== undefined && computedActualDisplay !== undefined);
  const canEdit = !showAsTotal && (isNewTask || canEditMeta);
  if (showAsTotal) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>{dueDateLabel}{!isBienTap ? " (Tổng)" : ""}</Label>
          <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
            {computedDueDisplay || "—"}
          </div>
        </div>
        <div className="space-y-2">
          <Label>{actualCompletedAtLabel}{!isBienTap ? " (Tổng)" : ""}</Label>
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

export function TaskDialog({
  open,
  onOpenChange,
  task,
  onCreate,
  isCreating = false,
  defaultGroup,
}: TaskDialogProps) {
  const { role } = useAuth();
  const { t, language } = useI18n();
  const { toast } = useToast();
  const { data: allTasks } = useTasks();
  const { data: taskWithAssignments } = useTask(task?.id ?? "", {
    includeAssignments:
      !!task &&
      (task.group === "Biên tập" ||
        task.group === "Thiết kế" ||
        task.group === "Công việc chung" ||
        task.group === "CNTT" ||
        task.group === "Quét trùng lặp" ||
        task.group === "Thư ký hợp phần"),
  });
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();
  const isNewTask = !task;
  const [isEditing, setIsEditing] = useState(false);
  const effectiveTask = (
    task?.group === "Biên tập" ||
    task?.group === "Thiết kế" ||
    task?.group === "Công việc chung" ||
    task?.group === "CNTT" ||
    task?.group === "Quét trùng lặp" ||
    task?.group === "Thư ký hợp phần"
      ? taskWithAssignments ?? task
      : task
  ) as TaskWithAssignmentDetails | null;

  // Get available groups from all tasks
  const availableGroups = useMemo(() => {
    if (!allTasks)
      return ["Công việc chung", "Biên tập", "Thiết kế", "CNTT", "Quét trùng lặp", "Thư ký hợp phần"];
    const groups = new Set(allTasks.map((t) => t.group).filter(Boolean));
    return Array.from(groups).length > 0
      ? Array.from(groups)
      : ["Công việc chung", "Biên tập", "Thiết kế", "CNTT", "Quét trùng lặp", "Thư ký hợp phần"];
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
      group: task?.group || "Công việc chung",
      progress: task?.progress || 0,
      notes: task?.notes || "",
      dueDate: task?.dueDate
        ? task.dueDate.length === 10
          ? task.dueDate
          : formatDateForInput(task.dueDate)
        : null,
      actualCompletedAt: task?.actualCompletedAt
        ? formatDateForInput(task.actualCompletedAt)
        : null,
      relatedWorkId:
        (task as TaskWithAssignmentDetails & { relatedWorkId?: string | null })
          ?.relatedWorkId ?? null,
      relatedContractId:
        (
          task as TaskWithAssignmentDetails & {
            relatedContractId?: string | null;
          }
        )?.relatedContractId ?? null,
      taskType:
        (task as TaskWithAssignmentDetails & { taskType?: string | null })
          ?.taskType ?? undefined,
    },
  });

  const isBienTapGroup =
    form.watch("group") === "Biên tập" || effectiveTask?.group === "Biên tập";
  /** Nhóm có thể liên kết tài liệu dịch thuật: Biên tập, Công việc chung, Thiết kế, CNTT, Thư ký hợp phần */
  const isWorkLinkGroup =
    form.watch("group") === "Biên tập" ||
    form.watch("group") === "Công việc chung" ||
    form.watch("group") === "Thiết kế" ||
    form.watch("group") === "CNTT" ||
    form.watch("group") === "Thư ký hợp phần" ||
    effectiveTask?.group === "Biên tập" ||
    effectiveTask?.group === "Công việc chung" ||
    effectiveTask?.group === "Thiết kế" ||
    effectiveTask?.group === "CNTT" ||
    effectiveTask?.group === "Thư ký hợp phần";
  const { data: worksList = [] } = useQuery({
    queryKey: ["works"],
    queryFn: async () => {
      const res = await fetch(api.works.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được danh sách tác phẩm");
      return res.json() as Promise<Work[]>;
    },
    enabled: open && isWorkLinkGroup,
  });
  const { data: componentsList = [] } = useQuery({
    queryKey: ["components"],
    queryFn: async () => {
      const res = await fetch(api.components.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Không tải được danh sách hợp phần");
      return res.json() as Promise<ComponentType[]>;
    },
    enabled: open && isWorkLinkGroup,
  });
  const { data: proofreadingList = [] } = useQuery({
    queryKey: ["proofreading-contracts"],
    queryFn: async () => {
      const res = await fetch(api.proofreadingContracts.list.path, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Không tải được hợp đồng hiệu đính");
      return res.json() as Promise<ProofreadingContract[]>;
    },
    enabled: open && isBienTapGroup,
  });

  // Assignments theo task (Công việc chung / CNTT / Quét / Thư ký hợp phần) để hiển thị nhân sự khi mở chi tiết
  const needTaskAssignments =
    open &&
    !!task?.id &&
    (task.group === "Công việc chung" ||
      task.group === "CNTT" ||
      task.group === "Quét trùng lặp" ||
      task.group === "Thiết kế" ||
      task.group === "Thư ký hợp phần");
  const { data: taskAssignmentsList = [] } = useQuery({
    queryKey: ["task-assignments-by-task", task?.id],
    queryFn: async () => {
      if (!task?.id) return [];
      const url = buildUrl(api.taskAssignments.listByTask.path, {
        taskId: task.id,
      });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được phân công");
      const json = await res.json();
      return api.taskAssignments.listByTask.responses[200].parse(json);
    },
    enabled: needTaskAssignments,
  });

  // Users để map userId -> displayName khi hiển thị assignments
  const { data: usersListForAssignments = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Không tải được danh sách người dùng");
      const list = await res.json();
      return list.map(
        (u: { id: string; displayName: string }) => ({
          id: u.id,
          displayName: u.displayName,
        })
      ) as Array<{ id: string; displayName: string }>;
    },
    enabled: open && !!task && needTaskAssignments,
  });

  const selectedWorkId = form.watch("relatedWorkId");
  const selectedWork = useMemo(
    () => worksList.find((w) => w.id === selectedWorkId),
    [worksList, selectedWorkId],
  );
  const componentName = selectedWork?.componentId
    ? componentsList.find((c) => c.id === selectedWork.componentId)?.name ?? "—"
    : "—";
  const stageDisplay = formatStageDisplay(selectedWork?.stage ?? null);
  const pageCountBienTap = useMemo(() => {
    if (!selectedWorkId) return null;
    const total = proofreadingList
      .filter((pc) => pc.workId === selectedWorkId)
      .reduce((sum, pc) => sum + (pc.pageCount ?? 0), 0);
    return total > 0 ? total : null;
  }, [proofreadingList, selectedWorkId]);

  // Thiết kế: Kỹ thuật viên chính + Trợ lý thiết kế (1 hoặc nhiều)
  type ThietKeSlot = {
    id: string;
    displayName: string;
    userId: string | null;
    receiveDate: string;
    dueDate: string | null;
    completeDate: string;
  };
  const [thietKeKtvChinh, setThietKeKtvChinh] = useState<ThietKeSlot>({
    id: "ktv",
    displayName: "",
    userId: null,
    receiveDate: "",
    dueDate: null,
    completeDate: "",
  });
  const [thietKeTroLyList, setThietKeTroLyList] = useState<ThietKeSlot[]>([]);

  // Công việc chung / CNTT: nhiều nhân sự (Nhân sự 1, 2, ... Người kiểm soát) — mỗi người có ngày nhận, hạn, ngày hoàn thành thực tế, trạng thái, tiến độ
  type MultiAssigneeSlot = {
    id: string;
    label: string;
    displayName: string;
    userId: string | null;
    receivedAt: string | null;
    dueDate: string | null;
    completedAt: string | null;
    status: string;
    progress: number;
  };
  const [multiAssigneesList, setMultiAssigneesList] = useState<MultiAssigneeSlot[]>([
    { id: "1", label: "Nhân sự 1", displayName: "", userId: null, receivedAt: null, dueDate: null, completedAt: null, status: "not_started", progress: 0 },
  ]);

  // Khi mở task Công việc chung / CNTT / Quét / Thư ký hợp phần: điền multiAssigneesList từ assignments + users
  useEffect(() => {
    if (
      !task?.id ||
      !(task.group === "Công việc chung" || task.group === "CNTT" || task.group === "Quét trùng lặp" || task.group === "Thư ký hợp phần")
    )
      return;
    if (!Array.isArray(taskAssignmentsList)) return;
    if (taskAssignmentsList.length === 0) {
      setMultiAssigneesList([
        {
          id: "1",
          label: "Nhân sự 1",
          displayName: "",
          userId: null,
          receivedAt: null,
          dueDate: null,
          completedAt: null,
          status: "not_started",
          progress: 0,
        },
      ]);
      return;
    }
    const users = usersListForAssignments || [];
    const toDateStr = (v: string | Date | null | undefined) => {
      if (v == null) return null;
      if (typeof v === "string" && v.length === 10) return v;
      try {
        return formatDateForInput(typeof v === "string" ? v : new Date(v).toISOString().slice(0, 10));
      } catch {
        return null;
      }
    };
    const list: MultiAssigneeSlot[] = taskAssignmentsList.map(
      (a: { id?: string; userId: string; stageType: string; receivedAt?: string | Date | null; dueDate?: string | Date | null; completedAt?: string | Date | null; status?: string; progress?: number }, i: number) => {
        const label =
          a.stageType === "kiem_soat"
            ? "Người kiểm soát"
            : a.stageType === "primary"
              ? "Nhân sự 1"
              : a.stageType.startsWith("nhan_su_")
                ? "Nhân sự " + a.stageType.replace("nhan_su_", "")
                : "Nhân sự 1";
        const displayName =
          users.find((u: { id: string }) => u.id === a.userId)?.displayName ?? "";
        const hasCompleted = !!toDateStr(a.completedAt);
        return {
          id: (a.id ?? a.userId + "-" + i).toString(),
          label,
          displayName,
          userId: a.userId,
          receivedAt: toDateStr(a.receivedAt),
          dueDate: toDateStr(a.dueDate),
          completedAt: toDateStr(a.completedAt),
          status: a.status ?? (hasCompleted ? "completed" : "not_started"),
          progress: typeof a.progress === "number" ? a.progress : (hasCompleted ? 100 : 0),
        };
      }
    );
    setMultiAssigneesList(list);
  }, [task?.id, task?.group, taskAssignmentsList, usersListForAssignments]);

  // Khi mở task Thiết kế: điền thietKeKtvChinh và thietKeTroLyList từ assignments
  useEffect(() => {
    if (!task?.id || task.group !== "Thiết kế") return;
    if (!Array.isArray(taskAssignmentsList)) return;
    const users = usersListForAssignments || [];
    if (taskAssignmentsList.length === 0) {
      setThietKeKtvChinh({
        id: "ktv",
        displayName: "",
        userId: null,
        receiveDate: "",
        dueDate: null,
        completeDate: "",
      });
      setThietKeTroLyList([]);
      return;
    }
    const toDateStr = (v: string | Date | null | undefined) => {
      if (v == null) return "";
      if (typeof v === "string" && v.length === 10) return v;
      try {
        return formatDateForInput(typeof v === "string" ? v : new Date(v).toISOString().slice(0, 10));
      } catch {
        return "";
      }
    };
    const ktvChinh = taskAssignmentsList.find(
      (a: { stageType: string }) => a.stageType === "ktv_chinh"
    ) as { userId: string; receivedAt?: string | Date | null; dueDate?: string | Date | null; completedAt?: string | Date | null } | undefined;
    if (ktvChinh) {
      setThietKeKtvChinh({
        id: "ktv",
        displayName: users.find((u: { id: string }) => u.id === ktvChinh.userId)?.displayName ?? "",
        userId: ktvChinh.userId,
        receiveDate: toDateStr(ktvChinh.receivedAt) ?? "",
        dueDate: toDateStr(ktvChinh.dueDate) ?? null,
        completeDate: toDateStr(ktvChinh.completedAt) ?? "",
      });
    } else {
      setThietKeKtvChinh({
        id: "ktv",
        displayName: "",
        userId: null,
        receiveDate: "",
        dueDate: null,
        completeDate: "",
      });
    }
    const troLyAssignments = taskAssignmentsList.filter(
      (a: { stageType: string }) => a.stageType?.startsWith("tro_ly_")
    ) as Array<{ userId: string; receivedAt?: string | Date | null; dueDate?: string | Date | null; completedAt?: string | Date | null }>;
    const troLyList = troLyAssignments
      .sort((a, b) => {
        const na = parseInt(String((a as { stageType?: string }).stageType || "0").replace("tro_ly_", ""), 10);
        const nb = parseInt(String((b as { stageType?: string }).stageType || "0").replace("tro_ly_", ""), 10);
        return na - nb;
      })
      .map((a, i) => ({
        id: "tly-" + (a.userId ?? i),
        displayName: users.find((u: { id: string }) => u.id === a.userId)?.displayName ?? "",
        userId: a.userId,
        receiveDate: toDateStr(a.receivedAt) ?? "",
        dueDate: toDateStr(a.dueDate) ?? null,
        completeDate: toDateStr(a.completedAt) ?? "",
      }));
    setThietKeTroLyList(troLyList);
  }, [task?.id, task?.group, taskAssignmentsList, usersListForAssignments]);

  // Thiết kế: khi người dùng nhập "Ngày hoàn thành thực tế" thì tự động chuyển trạng thái sang "Hoàn thành"
  useEffect(() => {
    if (form.watch("group") !== "Thiết kế") return;
    const hasComplete =
      (thietKeKtvChinh.completeDate && thietKeKtvChinh.completeDate.trim() !== "") ||
      thietKeTroLyList.some((s) => s.completeDate && s.completeDate.trim() !== "");
    if (hasComplete) form.setValue("status", "Completed");
  }, [form, thietKeKtvChinh.completeDate, thietKeTroLyList]);

  // Tự động cập nhật status = "Completed" khi tất cả nhân sự đã nhập ngày hoàn thành (Công việc chung / CNTT / Quét trùng lặp / Thư ký hợp phần)
  useEffect(() => {
    const group = form.watch("group");
    if (group !== "Công việc chung" && group !== "CNTT" && group !== "Quét trùng lặp" && group !== "Thư ký hợp phần") return;
    
    const staffMulti = multiAssigneesList.filter((s) => s.label !== "Người kiểm soát" && s.userId);
    if (staffMulti.length === 0) return;
    
    const allCompleted = staffMulti.every((s) => !!s.completedAt);
    if (allCompleted) {
      form.setValue("status", "Completed");
    }
  }, [form, multiAssigneesList]);

  // Reset form when task changes; for Biên tập tasks populate workflow stage fields (use effectiveTask to get assignments when available)
  useEffect(() => {
    if (effectiveTask) {
      const base = {
        title: effectiveTask.title,
        status: effectiveTask.status,
        priority: effectiveTask.priority,
        assignee: effectiveTask.assignee ?? "",
        assigneeId: effectiveTask.assigneeId ?? null,
        group: effectiveTask.group || "Công việc chung",
        progress: effectiveTask.progress || 0,
        notes: effectiveTask.notes || "",
        dueDate: effectiveTask.dueDate
          ? effectiveTask.dueDate.length === 10
            ? effectiveTask.dueDate
            : formatDateForInput(effectiveTask.dueDate)
          : null,
        actualCompletedAt: effectiveTask.actualCompletedAt
          ? formatDateForInput(effectiveTask.actualCompletedAt)
          : null,
        relatedWorkId:
          (
            effectiveTask as TaskWithAssignmentDetails & {
              relatedWorkId?: string | null;
            }
          )?.relatedWorkId ?? null,
        relatedContractId:
          (
            effectiveTask as TaskWithAssignmentDetails & {
              relatedContractId?: string | null;
            }
          )?.relatedContractId ?? null,
        taskType:
          (
            effectiveTask as TaskWithAssignmentDetails & {
              taskType?: string | null;
            }
          )?.taskType ?? undefined,
        vote:
          (effectiveTask as TaskWithAssignmentDetails & { vote?: string | null })?.vote ?? null,
      };
      if (effectiveTask.group === "Biên tập" && effectiveTask.workflow) {
        try {
          const w =
            typeof effectiveTask.workflow === "string"
              ? JSON.parse(effectiveTask.workflow)
              : effectiveTask.workflow;
          const round = w?.rounds?.[0];
          if (round) {
            const assignments = (
              effectiveTask as TaskWithAssignmentDetails & {
                assignments?: Array<{ stageType: string; userId: string }>;
              }
            ).assignments;
            Object.assign(base, {
              roundType: round.roundType ?? "",
              btv2: round.stages?.[0]?.assignee ?? "",
              btv2Id:
                assignments?.find((a) => a.stageType === "btv2")?.userId ??
                null,
              btv2ReceiveDate: round.stages?.[0]?.startDate ?? "",
              btv2DueDate: round.stages?.[0]?.dueDate ?? null,
              btv2CompleteDate: round.stages?.[0]?.completedDate ?? "",
              btv2Status: round.stages?.[0]?.status ?? StageStatus.NOT_STARTED,
              btv2CancelReason: round.stages?.[0]?.cancelReason ?? "",
              btv1: round.stages?.[1]?.assignee ?? "",
              btv1Id:
                assignments?.find((a) => a.stageType === "btv1")?.userId ??
                null,
              btv1ReceiveDate: round.stages?.[1]?.startDate ?? "",
              btv1DueDate: round.stages?.[1]?.dueDate ?? null,
              btv1CompleteDate: round.stages?.[1]?.completedDate ?? "",
              btv1Status: round.stages?.[1]?.status ?? StageStatus.NOT_STARTED,
              btv1CancelReason: round.stages?.[1]?.cancelReason ?? "",
              docDuyet: round.stages?.[2]?.assignee ?? "",
              docDuyetId:
                assignments?.find((a) => a.stageType === "doc_duyet")?.userId ??
                null,
              docDuyetReceiveDate: round.stages?.[2]?.startDate ?? "",
              docDuyetDueDate: round.stages?.[2]?.dueDate ?? null,
              docDuyetCompleteDate: round.stages?.[2]?.completedDate ?? "",
              docDuyetStatus:
                round.stages?.[2]?.status ?? StageStatus.NOT_STARTED,
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
        group: defaultGroup || "Công việc chung",
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
        relatedWorkId: null,
        relatedContractId: null,
        taskType: undefined,
        vote: null,
      });
      setThietKeKtvChinh({
        id: "ktv",
        displayName: "",
        userId: null,
        receiveDate: "",
        dueDate: null,
        completeDate: "",
      });
      setThietKeTroLyList([]);
      setMultiAssigneesList([
        {
          id: "1",
          label: "Nhân sự 1",
          displayName: "",
          userId: null,
          receivedAt: null,
          dueDate: null,
          completedAt: null,
          status: "not_started",
          progress: 0,
        },
      ]);
    }
  }, [effectiveTask, task, form, defaultGroup]);

  const canEditMetaRaw = role === UserRole.ADMIN || role === UserRole.MANAGER;
  const canEditMeta = canEditMetaRaw && (isNewTask || isEditing);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      return;
    }
    setIsEditing(isNewTask);
  }, [open, isNewTask, task?.id]);

  const onSubmit = (data: FormData) => {
    if (isNewTask && onCreate) {
      // Create new task
      if (!data.title || data.title.trim() === "") {
        form.setError("title", { message: t.task.titleRequired });
        return;
      }
      const selectedGroup = data.group || "Công việc chung";
      const hasActualCompletedAtCreate =
        data.actualCompletedAt != null &&
        String(data.actualCompletedAt).trim() !== "";
      const progressVal = hasActualCompletedAtCreate ? 100 : data.progress || 0;
      const statusVal = hasActualCompletedAtCreate
        ? "Completed"
        : data.status || "Not Started";
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description ?? null,
        status: statusVal,
        priority: data.priority || "Medium",
        group: selectedGroup,
        progress: progressVal,
        notes:
          data.notes != null && String(data.notes).trim() !== ""
            ? String(data.notes).trim()
            : null,
      };

      // Thiết kế: gửi assignments từ Kỹ thuật viên chính + Trợ lý thiết kế
      if (selectedGroup === "Thiết kế") {
        const thietKeAssignments: Array<{
          userId: string;
          stageType: string;
          roundNumber: number;
          receivedAt: string | null;
          dueDate: string | null;
          completedAt: string | null;
          status: string;
          progress: number;
        }> = [];
        if (thietKeKtvChinh.userId) {
          thietKeAssignments.push({
            userId: thietKeKtvChinh.userId,
            stageType: "ktv_chinh",
            roundNumber: 1,
            receivedAt: thietKeKtvChinh.receiveDate || null,
            dueDate: thietKeKtvChinh.dueDate || null,
            completedAt: thietKeKtvChinh.completeDate || null,
            status: thietKeKtvChinh.completeDate ? "completed" : "not_started",
            progress: thietKeKtvChinh.completeDate ? 100 : 0,
          });
        }
        thietKeTroLyList.forEach((slot, i) => {
          if (slot.userId) {
            thietKeAssignments.push({
              userId: slot.userId,
              stageType: `tro_ly_${i + 1}`,
              roundNumber: 1,
              receivedAt: slot.receiveDate || null,
              dueDate: slot.dueDate || null,
              completedAt: slot.completeDate || null,
              status: slot.completeDate ? "completed" : "not_started",
              progress: slot.completeDate ? 100 : 0,
            });
          }
        });
        if (thietKeAssignments.length > 0) payload.assignments = thietKeAssignments;
        const anyCompleted = thietKeAssignments.some((a) => !!a.completedAt);
        if (anyCompleted) payload.status = "Completed";
        const maxDueTc = maxDateString(
          thietKeKtvChinh.dueDate,
          ...thietKeTroLyList.map((s) => s.dueDate),
        );
        const maxActualTc = maxDateString(
          thietKeKtvChinh.completeDate,
          ...thietKeTroLyList.map((s) => s.completeDate),
        );
        payload.dueDate = maxDueTc ?? null;
        payload.actualCompletedAt = maxActualTc ?? null;
        const nTc = thietKeAssignments.length;
        const mTc = thietKeAssignments.filter((a) => !!a.completedAt).length;
        payload.progress = nTc === 0 ? 0 : Math.round((100 / nTc) * mTc);
      }
      // Công việc chung / CNTT / Quét trùng lặp / Thư ký hợp phần: gửi assignments từ danh sách nhiều nhân sự
      else if (
        (selectedGroup === "Công việc chung" ||
          selectedGroup === "CNTT" ||
          selectedGroup === "Quét trùng lặp" ||
          selectedGroup === "Thư ký hợp phần") &&
        multiAssigneesList.some((s) => s.userId)
      ) {
        let nhanSuIndex = 0;
        payload.assignments = multiAssigneesList
          .filter((s) => s.userId)
          .map((slot) => {
            const isSupervisor = slot.label === "Người kiểm soát";
            const stageType = isSupervisor ? "kiem_soat" : `nhan_su_${++nhanSuIndex}`;
            return {
              userId: slot.userId!,
              stageType,
              roundNumber: 1,
              receivedAt: isSupervisor ? null : (slot.receivedAt || null),
              dueDate: isSupervisor ? null : (slot.dueDate || null),
              completedAt: isSupervisor ? null : (slot.completedAt || null),
              status: isSupervisor ? "not_started" : (slot.status ?? (slot.completedAt ? "completed" : "not_started")),
              progress: isSupervisor ? 0 : (slot.progress ?? (slot.completedAt ? 100 : 0)),
            };
          });
        payload.vote = data.vote ?? null;
        const staffMulti = multiAssigneesList.filter((s) => s.label !== "Người kiểm soát" && s.userId);
        payload.dueDate = maxDateString(...staffMulti.map((s) => s.dueDate)) ?? null;
        payload.actualCompletedAt = maxDateString(...staffMulti.map((s) => s.completedAt)) ?? null;
        const nMulti = staffMulti.length;
        const mMulti = staffMulti.filter((s) => !!s.completedAt || s.status === "completed").length;
        const calculatedProgress = nMulti === 0 ? 0 : Math.round((100 / nMulti) * mMulti);
        payload.progress = calculatedProgress;
        // Tự động cập nhật status = "Completed" khi progress đạt 100%
        if (calculatedProgress >= 100 && (selectedGroup === "Công việc chung" || selectedGroup === "Thư ký hợp phần")) {
          payload.status = "Completed";
        }
      }
      // Nhóm khác (fallback): một người thực hiện — tiến độ = (100%/1)*M (M = 1 nếu hoàn thành, 0 nếu chưa)
      else if (selectedGroup !== "Biên tập" && data.assigneeId) {
        const singleCompleted = hasActualCompletedAtCreate ? 1 : 0;
        payload.progress = Math.round((100 / 1) * singleCompleted);
        payload.assignments = [
          {
            userId: data.assigneeId,
            stageType: "primary",
            dueDate: data.dueDate || null,
            receivedAt: null,
            status: hasActualCompletedAtCreate
              ? "completed"
              : data.status === "In Progress"
              ? "in_progress"
              : "not_started",
            progress: singleCompleted * 100,
            completedAt:
              hasActualCompletedAtCreate && data.actualCompletedAt
                ? new Date(data.actualCompletedAt).toISOString()
                : null,
          },
        ];
      }

      // Liên kết tài liệu dịch thuật (tác phẩm) theo nhóm
      if (selectedGroup === "Biên tập") {
        payload.taskType = "PROOFREADING";
        payload.relatedWorkId = data.relatedWorkId || null;
        payload.relatedContractId = data.relatedContractId || null;
      } else if (selectedGroup === "Công việc chung") {
        payload.taskType = "GENERAL";
        payload.relatedWorkId = data.relatedWorkId || null;
      } else if (selectedGroup === "Thiết kế") {
        payload.taskType = "DESIGN";
        payload.relatedWorkId = data.relatedWorkId || null;
      } else if (selectedGroup === "CNTT") {
        payload.taskType = "IT";
        payload.relatedWorkId = data.relatedWorkId || null;
      } else if (selectedGroup === "Thư ký hợp phần") {
        payload.taskType = "GENERAL";
        payload.relatedWorkId = data.relatedWorkId || null;
      }
      if (selectedGroup === "Biên tập") {
        const workflow = BienTapWorkflowHelpers.createWorkflow(1);
        if (data.roundType) workflow.rounds[0].roundType = data.roundType;
        const round = workflow.rounds[0];
        round.stages[0].assignee = data.btv2 || null;
        round.stages[0].startDate = data.btv2ReceiveDate || null;
        round.stages[0].dueDate = data.btv2DueDate || null;
        round.stages[0].completedDate = data.btv2CompleteDate || null;
        round.stages[0].cancelReason = data.btv2CancelReason || null;
        round.stages[0].status = data.btv2CompleteDate
          ? StageStatus.COMPLETED
          : (data.btv2Status as StageStatus) ||
            (data.btv2ReceiveDate
              ? StageStatus.IN_PROGRESS
              : StageStatus.NOT_STARTED);
        round.stages[0].progress = data.btv2CompleteDate ? 100 : 0;
        round.stages[1].assignee = data.btv1 || null;
        round.stages[1].startDate = data.btv1ReceiveDate || null;
        round.stages[1].dueDate = data.btv1DueDate || null;
        round.stages[1].completedDate = data.btv1CompleteDate || null;
        round.stages[1].cancelReason = data.btv1CancelReason || null;
        round.stages[1].status = data.btv1CompleteDate
          ? StageStatus.COMPLETED
          : (data.btv1Status as StageStatus) ||
            (data.btv1ReceiveDate
              ? StageStatus.IN_PROGRESS
              : StageStatus.NOT_STARTED);
        round.stages[1].progress = data.btv1CompleteDate ? 100 : 0;
        round.stages[2].assignee = data.docDuyet || null;
        round.stages[2].startDate = data.docDuyetReceiveDate || null;
        round.stages[2].dueDate = data.docDuyetDueDate || null;
        round.stages[2].completedDate = data.docDuyetCompleteDate || null;
        round.stages[2].cancelReason = data.docDuyetCancelReason || null;
        round.stages[2].status = data.docDuyetCompleteDate
          ? StageStatus.COMPLETED
          : (data.docDuyetStatus as StageStatus) ||
            (data.docDuyetReceiveDate
              ? StageStatus.IN_PROGRESS
              : StageStatus.NOT_STARTED);
        round.stages[2].progress = data.docDuyetCompleteDate ? 100 : 0;
        payload.workflow = JSON.stringify(workflow);
        payload.progress = BienTapWorkflowHelpers.calculateProgress(workflow);
        const lastStageActual = data.docDuyetCompleteDate?.trim()
          ? data.docDuyetCompleteDate
          : null;
        payload.status = lastStageActual
          ? "Completed"
          : payload.status ?? "Not Started";
        // Ghi vào task_assignments: mỗi stage có userId thì thêm 1 assignment; round_number lấy từ Loại bông (Bông 1 → 1, Bông 3 → 3)
        const stageStatusToApi = (s: string) =>
          s === StageStatus.COMPLETED
            ? "completed"
            : s === StageStatus.IN_PROGRESS
            ? "in_progress"
            : "not_started";
        const roundNum = roundNumberFromRoundType(data.roundType);
        payload.assignments = [
          data.btv2Id && {
            userId: data.btv2Id,
            stageType: "btv2",
            roundNumber: roundNum,
            receivedAt: data.btv2ReceiveDate || null,
            dueDate: data.btv2DueDate || null,
            completedAt: data.btv2CompleteDate
              ? new Date(data.btv2CompleteDate).toISOString()
              : null,
            status: stageStatusToApi(
              data.btv2Status ?? StageStatus.NOT_STARTED,
            ),
            progress: data.btv2CompleteDate ? 100 : 0,
          },
          data.btv1Id && {
            userId: data.btv1Id,
            stageType: "btv1",
            roundNumber: roundNum,
            receivedAt: data.btv1ReceiveDate || null,
            dueDate: data.btv1DueDate || null,
            completedAt: data.btv1CompleteDate
              ? new Date(data.btv1CompleteDate).toISOString()
              : null,
            status: stageStatusToApi(
              data.btv1Status ?? StageStatus.NOT_STARTED,
            ),
            progress: data.btv1CompleteDate ? 100 : 0,
          },
          data.docDuyetId && {
            userId: data.docDuyetId,
            stageType: "doc_duyet",
            roundNumber: roundNum,
            receivedAt: data.docDuyetReceiveDate || null,
            dueDate: data.docDuyetDueDate || null,
            completedAt: data.docDuyetCompleteDate
              ? new Date(data.docDuyetCompleteDate).toISOString()
              : null,
            status: stageStatusToApi(
              data.docDuyetStatus ?? StageStatus.NOT_STARTED,
            ),
            progress: data.docDuyetCompleteDate ? 100 : 0,
          },
        ].filter(Boolean) as Array<{
          userId: string;
          stageType: string;
          roundNumber: number;
          receivedAt: string | null;
          dueDate: string | null;
          completedAt: string | null;
          status: string;
          progress: number;
        }>;
      }

      onCreate(payload);
      onOpenChange(false);
      return;
    }

    if (!task) return;

    const hasActualCompletedAt =
      data.actualCompletedAt != null &&
      String(data.actualCompletedAt).trim() !== "";
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
          notes:
            data.notes != null && String(data.notes).trim() !== ""
              ? String(data.notes).trim()
              : null,
          ...((task.group === "Công việc chung" ||
            task.group === "CNTT" ||
            task.group === "Quét trùng lặp" ||
            task.group === "Thư ký hợp phần") && { vote: data.vote ?? null }),
        }
      : {
          progress: data.progress,
          notes:
            data.notes != null && String(data.notes).trim() !== ""
              ? String(data.notes).trim()
              : null,
          ...((task.group === "Công việc chung" ||
            task.group === "CNTT" ||
            task.group === "Quét trùng lặp" ||
            task.group === "Thư ký hợp phần") && { vote: data.vote ?? null }),
        };

    // Thiết kế: gửi assignments từ KTV chính + Trợ lý thiết kế
    if (canEditMeta && task.group === "Thiết kế") {
      const thietKeAssignments: Array<{
        userId: string;
        stageType: string;
        roundNumber: number;
        receivedAt: string | null;
        dueDate: string | null;
        completedAt: string | null;
        status: string;
        progress: number;
      }> = [];
      if (thietKeKtvChinh.userId) {
        thietKeAssignments.push({
          userId: thietKeKtvChinh.userId,
          stageType: "ktv_chinh",
          roundNumber: 1,
          receivedAt: thietKeKtvChinh.receiveDate || null,
          dueDate: thietKeKtvChinh.dueDate || null,
          completedAt: thietKeKtvChinh.completeDate || null,
          status: thietKeKtvChinh.completeDate ? "completed" : "not_started",
          progress: thietKeKtvChinh.completeDate ? 100 : 0,
        });
      }
      thietKeTroLyList.forEach((slot, i) => {
        if (slot.userId) {
          thietKeAssignments.push({
            userId: slot.userId,
            stageType: `tro_ly_${i + 1}`,
            roundNumber: 1,
            receivedAt: slot.receiveDate || null,
            dueDate: slot.dueDate || null,
            completedAt: slot.completeDate || null,
            status: slot.completeDate ? "completed" : "not_started",
            progress: slot.completeDate ? 100 : 0,
          });
        }
      });
      (payload as Record<string, unknown>).assignments = thietKeAssignments;
      const anyCompleted = thietKeAssignments.some((a) => !!a.completedAt);
      if (anyCompleted) (payload as Record<string, unknown>).status = "Completed";
      const maxDueTc = maxDateString(
        thietKeKtvChinh.dueDate,
        ...thietKeTroLyList.map((s) => s.dueDate),
      );
      const maxActualTc = maxDateString(
        thietKeKtvChinh.completeDate,
        ...thietKeTroLyList.map((s) => s.completeDate),
      );
      (payload as Record<string, unknown>).dueDate = maxDueTc ?? null;
      (payload as Record<string, unknown>).actualCompletedAt = maxActualTc ?? null;
      const nTc = thietKeAssignments.length;
      const mTc = thietKeAssignments.filter((a) => !!a.completedAt).length;
      (payload as Record<string, unknown>).progress = nTc === 0 ? 0 : Math.round((100 / nTc) * mTc);
    }
    // Công việc chung / CNTT / Quét trùng lặp / Thư ký hợp phần: gửi assignments từ danh sách nhiều nhân sự
    else if (
      canEditMeta &&
      (task.group === "Công việc chung" ||
        task.group === "CNTT" ||
        task.group === "Quét trùng lặp" ||
        task.group === "Thư ký hợp phần")
    ) {
      let nhanSuIndex = 0;
      (payload as Record<string, unknown>).assignments = multiAssigneesList
        .filter((s) => s.userId)
        .map((slot) => {
          const isSupervisor = slot.label === "Người kiểm soát";
          const stageType = isSupervisor ? "kiem_soat" : `nhan_su_${++nhanSuIndex}`;
          return {
            userId: slot.userId!,
            stageType,
            roundNumber: 1,
            receivedAt: isSupervisor ? null : (slot.receivedAt || null),
            dueDate: isSupervisor ? null : (slot.dueDate || null),
            completedAt: isSupervisor ? null : (slot.completedAt || null),
            status: isSupervisor ? "not_started" : (slot.status ?? (slot.completedAt ? "completed" : "not_started")),
            progress: isSupervisor ? 0 : (slot.progress ?? (slot.completedAt ? 100 : 0)),
          };
        });
      (payload as Record<string, unknown>).vote = data.vote ?? null;
      const staffMulti = multiAssigneesList.filter((s) => s.label !== "Người kiểm soát" && s.userId);
      (payload as Record<string, unknown>).dueDate = maxDateString(...staffMulti.map((s) => s.dueDate)) ?? null;
      (payload as Record<string, unknown>).actualCompletedAt = maxDateString(...staffMulti.map((s) => s.completedAt)) ?? null;
      const nMulti = staffMulti.length;
      const mMulti = staffMulti.filter((s) => !!s.completedAt || s.status === "completed").length;
      const calculatedProgress = nMulti === 0 ? 0 : Math.round((100 / nMulti) * mMulti);
      (payload as Record<string, unknown>).progress = calculatedProgress;
      // Tự động cập nhật status = "Completed" khi progress đạt 100%
      if (calculatedProgress >= 100 && (task.group === "Công việc chung" || task.group === "Thư ký hợp phần")) {
        (payload as Record<string, unknown>).status = "Completed";
      }
    }
    // Nhóm khác (fallback): một người thực hiện — tiến độ = (100%/1)*M (M = 1 nếu hoàn thành, 0 nếu chưa)
    else if (canEditMeta && task.group !== "Biên tập") {
      const isOtherGroup =
        task.group !== "Thiết kế" &&
        task.group !== "Công việc chung" &&
        task.group !== "CNTT" &&
        task.group !== "Quét trùng lặp" &&
        task.group !== "Thư ký hợp phần";
      const singleCompleted = hasActualCompletedAt ? 1 : 0;
      if (isOtherGroup) {
        (payload as Record<string, unknown>).progress =
          Math.round((100 / 1) * singleCompleted);
      }
      (payload as Record<string, unknown>).assignments = data.assigneeId
        ? [
            {
              userId: data.assigneeId,
              stageType: "primary",
              dueDate: data.dueDate || null,
              receivedAt: null,
              status: hasActualCompletedAt
                ? "completed"
                : data.status === "In Progress"
                ? "in_progress"
                : "not_started",
              progress: isOtherGroup ? singleCompleted * 100 : progressVal,
              completedAt:
                hasActualCompletedAt && data.actualCompletedAt
                  ? new Date(data.actualCompletedAt).toISOString()
                  : null,
            },
          ]
        : [];
    }

    // Khi chỉnh sửa: gửi taskType + relatedWorkId theo nhóm
    if (canEditMeta && task.group === "Biên tập") {
      (payload as Record<string, unknown>).taskType = "PROOFREADING";
      (payload as Record<string, unknown>).relatedWorkId =
        data.relatedWorkId || null;
      (payload as Record<string, unknown>).relatedContractId =
        data.relatedContractId || null;
      const workflow = BienTapWorkflowHelpers.createWorkflow(1);
      if (data.roundType) workflow.rounds[0].roundType = data.roundType;
      const round = workflow.rounds[0];
      round.stages[0].assignee = data.btv2 || null;
      round.stages[0].startDate = data.btv2ReceiveDate || null;
      round.stages[0].dueDate = data.btv2DueDate || null;
      round.stages[0].completedDate = data.btv2CompleteDate || null;
      round.stages[0].cancelReason = data.btv2CancelReason || null;
      round.stages[0].status = data.btv2CompleteDate
        ? StageStatus.COMPLETED
        : (data.btv2Status as StageStatus) ?? StageStatus.NOT_STARTED;
      round.stages[0].progress = data.btv2CompleteDate ? 100 : 0;
      round.stages[1].assignee = data.btv1 || null;
      round.stages[1].startDate = data.btv1ReceiveDate || null;
      round.stages[1].dueDate = data.btv1DueDate || null;
      round.stages[1].completedDate = data.btv1CompleteDate || null;
      round.stages[1].cancelReason = data.btv1CancelReason || null;
      round.stages[1].status = data.btv1CompleteDate
        ? StageStatus.COMPLETED
        : (data.btv1Status as StageStatus) ?? StageStatus.NOT_STARTED;
      round.stages[1].progress = data.btv1CompleteDate ? 100 : 0;
      round.stages[2].assignee = data.docDuyet || null;
      round.stages[2].startDate = data.docDuyetReceiveDate || null;
      round.stages[2].dueDate = data.docDuyetDueDate || null;
      round.stages[2].completedDate = data.docDuyetCompleteDate || null;
      round.stages[2].cancelReason = data.docDuyetCancelReason || null;
      round.stages[2].status = data.docDuyetCompleteDate
        ? StageStatus.COMPLETED
        : (data.docDuyetStatus as StageStatus) ?? StageStatus.NOT_STARTED;
      round.stages[2].progress = data.docDuyetCompleteDate ? 100 : 0;
      payload.workflow = JSON.stringify(workflow);
      payload.progress = BienTapWorkflowHelpers.calculateProgress(workflow);
      const lastStageActual = data.docDuyetCompleteDate?.trim()
        ? data.docDuyetCompleteDate
        : null;
      payload.status = lastStageActual
        ? "Completed"
        : (payload.status as string);
      if (data.btv2Id || data.btv1Id || data.docDuyetId) {
        const stageStatusToApi = (s: string) =>
          s === StageStatus.COMPLETED
            ? "completed"
            : s === StageStatus.IN_PROGRESS
            ? "in_progress"
            : "not_started";
        const roundNum = roundNumberFromRoundType(data.roundType);
        payload.assignments = [
          data.btv2Id && {
            userId: data.btv2Id,
            stageType: "btv2",
            roundNumber: roundNum,
            receivedAt: data.btv2ReceiveDate || null,
            dueDate: data.btv2DueDate || null,
            completedAt: data.btv2CompleteDate
              ? new Date(data.btv2CompleteDate).toISOString()
              : null,
            status: stageStatusToApi(
              data.btv2Status ?? StageStatus.NOT_STARTED,
            ),
            progress: data.btv2CompleteDate ? 100 : 0,
          },
          data.btv1Id && {
            userId: data.btv1Id,
            stageType: "btv1",
            roundNumber: roundNum,
            receivedAt: data.btv1ReceiveDate || null,
            dueDate: data.btv1DueDate || null,
            completedAt: data.btv1CompleteDate
              ? new Date(data.btv1CompleteDate).toISOString()
              : null,
            status: stageStatusToApi(
              data.btv1Status ?? StageStatus.NOT_STARTED,
            ),
            progress: data.btv1CompleteDate ? 100 : 0,
          },
          data.docDuyetId && {
            userId: data.docDuyetId,
            stageType: "doc_duyet",
            roundNumber: roundNum,
            receivedAt: data.docDuyetReceiveDate || null,
            dueDate: data.docDuyetDueDate || null,
            completedAt: data.docDuyetCompleteDate
              ? new Date(data.docDuyetCompleteDate).toISOString()
              : null,
            status: stageStatusToApi(
              data.docDuyetStatus ?? StageStatus.NOT_STARTED,
            ),
            progress: data.docDuyetCompleteDate ? 100 : 0,
          },
        ].filter(Boolean) as Array<{
          userId: string;
          stageType: string;
          roundNumber: number;
          receivedAt: string | null;
          dueDate: string | null;
          completedAt: string | null;
          status: string;
          progress: number;
        }>;
      }
    } else if (canEditMeta && task.group === "Công việc chung") {
      (payload as Record<string, unknown>).taskType = "GENERAL";
      (payload as Record<string, unknown>).relatedWorkId =
        data.relatedWorkId || null;
    } else if (canEditMeta && task.group === "Thiết kế") {
      (payload as Record<string, unknown>).taskType = "DESIGN";
      (payload as Record<string, unknown>).relatedWorkId =
        data.relatedWorkId || null;
    } else if (canEditMeta && task.group === "CNTT") {
      (payload as Record<string, unknown>).taskType = "IT";
      (payload as Record<string, unknown>).relatedWorkId =
        data.relatedWorkId || null;
    } else if (canEditMeta && task.group === "Thư ký hợp phần") {
      (payload as Record<string, unknown>).taskType = "GENERAL";
      (payload as Record<string, unknown>).relatedWorkId =
        data.relatedWorkId || null;
    }

    updateMutation.mutate(
      { id: task.id, ...payload },
      {
        onSuccess: () => {
          toast({
            title: t.common.success,
            description:
              t.task.saveChanges +
              " " +
              (language === "vi" ? "thành công" : "successfully"),
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
      },
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
                {t.task.createdAt}{" "}
                {task?.createdAt
                  ? formatDateDDMMYYYY(task.createdAt)
                  : formatDateDDMMYYYY(new Date())}
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

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-4 space-y-6">
            <div className="space-y-2">
              <Label>{t.task.title} *</Label>
              <Input
                {...form.register("title")}
                placeholder={t.task.title + "..."}
                className="bg-background"
                disabled={!canEditMeta}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>{t.task.status}</Label>
                <Select
                  disabled={!canEditMeta}
                  value={form.watch("status")}
                  onValueChange={(val) => form.setValue("status", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.task.selectStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">
                      {t.status.notStarted}
                    </SelectItem>
                    <SelectItem value="In Progress">
                      {t.status.inProgress}
                    </SelectItem>
                    <SelectItem value="Pending">{t.status.pending}</SelectItem>
                    <SelectItem value="Cancelled">{t.status.cancelled}</SelectItem>
                    <SelectItem value="Completed">
                      {t.status.completed}
                    </SelectItem>
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
                    <SelectItem value="Critical">
                      {t.priority.critical}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ẩn ô Người thực hiện đơn khi nhóm dùng workflow / Thiết kế / nhiều nhân sự */}
              {form.watch("group") !== "Biên tập" &&
                form.watch("group") !== "Thiết kế" &&
                form.watch("group") !== "Công việc chung" &&
                form.watch("group") !== "CNTT" &&
                form.watch("group") !== "Quét trùng lặp" &&
                form.watch("group") !== "Thư ký hợp phần" && (
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
                  />
                )}

              <div className="space-y-2">
                <Label>{t.task.group}</Label>
                <Select
                  disabled={!canEditMeta || !isNewTask}
                  value={form.watch("group") || ""}
                  onValueChange={(val) => form.setValue("group", val)}>
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

            {/* Liên kết tài liệu dịch thuật: Biên tập, Công việc chung, Thiết kế, CNTT */}
            {isWorkLinkGroup && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h3 className="text-base font-semibold">
                  Thông tin của tài liệu dịch thuật
                </h3>
                <p className="text-sm text-muted-foreground">
                  {form.watch("group") === "Biên tập"
                    ? language === "vi"
                      ? "Chọn tác phẩm (tài liệu) cần biên tập."
                      : "Select work (document) to proofread."
                    : language === "vi"
                      ? "Tùy chọn: liên kết công việc với một tài liệu dịch thuật."
                      : "Optional: link this task to a translation document."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <WorkPicker
                      label="Tên tài liệu dịch thuật"
                      works={worksList}
                      components={componentsList}
                      value={form.watch("relatedWorkId") ?? null}
                      onChange={(id) => form.setValue("relatedWorkId", id)}
                      disabled={!canEditMeta && !isNewTask}
                      placeholder={
                        language === "vi"
                          ? "Tìm theo tiêu đề, mã tài liệu, hợp phần, giai đoạn..."
                          : "Search by title, document code..."
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Hợp phần</Label>
                    <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm">
                      {componentName}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Giai đoạn</Label>
                    <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm">
                      {stageDisplay}
                    </div>
                  </div>
                  {form.watch("group") === "Biên tập" && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-muted-foreground">
                        Số trang tài liệu cần biên tập
                      </Label>
                      <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm">
                        {pageCountBienTap != null
                          ? `${formatNumberAccounting(pageCountBienTap)} trang`
                          : "—"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {language === "vi"
                          ? "Lấy từ tổng số trang của các hợp đồng hiệu đính gắn với tác phẩm đã chọn."
                          : "From proofreading contracts linked to selected work."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Công việc chung / CNTT / Quét trùng lặp / Thư ký hợp phần: nhiều nhân sự (Nhân sự 1, 2, ... Người kiểm soát) */}
            {(form.watch("group") === "Công việc chung" ||
              form.watch("group") === "CNTT" ||
              form.watch("group") === "Quét trùng lặp" ||
              form.watch("group") === "Thư ký hợp phần") && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h3 className="text-base font-semibold">
                  {language === "vi" ? "Phân công nhân sự" : "Assign staff"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "vi"
                    ? "Thêm nhân sự thực hiện (Nhân sự 1, Nhân sự 2, ... Người kiểm soát)."
                    : "Add staff (Person 1, Person 2, ... Controller)."}
                </p>
                <div className="space-y-4">
                  {multiAssigneesList.map((slot) => {
                    const isSupervisor = slot.label === "Người kiểm soát";
                    return (
                      <div key={slot.id} className="flex flex-wrap items-end gap-4 p-3 rounded-lg border bg-muted/20">
                        <div className="flex-1 min-w-[200px]">
                          <AssigneePicker
                            label={slot.label}
                            value={slot.displayName}
                            assigneeId={slot.userId}
                            onChange={(displayName, userId) => {
                              setMultiAssigneesList((prev) =>
                                prev.map((s) =>
                                  s.id === slot.id ? { ...s, displayName, userId } : s
                                )
                              );
                            }}
                            disabled={!canEditMeta && !isNewTask}
                            placeholder={
                              language === "vi"
                                ? "Tìm theo tên hoặc email..."
                                : "Search by name or email..."
                            }
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 items-end">
                          {isSupervisor ? (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                {language === "vi" ? "Đánh giá công việc" : "Evaluation"}
                              </Label>
                              <Select
                                value={form.watch("vote") ?? ""}
                                onValueChange={(v) => form.setValue("vote", v || null)}
                                disabled={!canEditMeta && !isNewTask}
                              >
                                <SelectTrigger className="w-[180px] bg-background">
                                  <SelectValue placeholder={language === "vi" ? "Chọn đánh giá" : "Select"} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="tot">{language === "vi" ? "Hoàn thành tốt" : "Good"}</SelectItem>
                                  <SelectItem value="kha">{language === "vi" ? "Hoàn thành khá" : "Fair"}</SelectItem>
                                  <SelectItem value="khong_tot">{language === "vi" ? "Không tốt" : "Poor"}</SelectItem>
                                  <SelectItem value="khong_hoan_thanh">{language === "vi" ? "Không hoàn thành" : "Not completed"}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  {language === "vi" ? "Ngày nhận công việc" : "Received"}
                                </Label>
                                <DateInput
                                  value={slot.receivedAt || null}
                                  onChange={(v) =>
                                    setMultiAssigneesList((prev) =>
                                      prev.map((s) =>
                                        s.id === slot.id ? { ...s, receivedAt: v || null } : s
                                      )
                                    )
                                  }
                                  placeholder="dd/mm/yyyy"
                                  className="bg-background w-32"
                                  disabled={!canEditMeta && !isNewTask}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  {language === "vi" ? "Ngày hoàn thành dự kiến" : "Due"}
                                </Label>
                                <DateInput
                                  value={slot.dueDate || null}
                                  onChange={(v) =>
                                    setMultiAssigneesList((prev) =>
                                      prev.map((s) =>
                                        s.id === slot.id ? { ...s, dueDate: v || null } : s
                                      )
                                    )
                                  }
                                  placeholder="dd/mm/yyyy"
                                  className="bg-background w-32"
                                  disabled={!canEditMeta && !isNewTask}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  {language === "vi" ? "Ngày hoàn thành thực tế" : "Completed"}
                                </Label>
                                <DateInput
                                  value={slot.completedAt || null}
                                  onChange={(v) => {
                                    setMultiAssigneesList((prev) =>
                                      prev.map((s) =>
                                        s.id === slot.id ? { ...s, completedAt: v || null, status: v ? "completed" : s.status } : s
                                      )
                                    );
                                    // Tự động cập nhật status của task khi tất cả nhân sự đã hoàn thành
                                    const updatedList = multiAssigneesList.map((s) =>
                                      s.id === slot.id ? { ...s, completedAt: v || null, status: v ? "completed" : s.status } : s
                                    );
                                    const staffMulti = updatedList.filter((s) => s.label !== "Người kiểm soát" && s.userId);
                                    const allCompleted = staffMulti.length > 0 && staffMulti.every((s) => !!s.completedAt);
                                    if (allCompleted && (form.watch("group") === "Công việc chung" || form.watch("group") === "CNTT" || form.watch("group") === "Quét trùng lặp" || form.watch("group") === "Thư ký hợp phần")) {
                                      form.setValue("status", "Completed");
                                    }
                                  }}
                                  placeholder="dd/mm/yyyy"
                                  className="bg-background w-32"
                                  disabled={!canEditMeta && !isNewTask}
                                />
                              </div>
                            </>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              setMultiAssigneesList((prev) => prev.filter((s) => s.id !== slot.id))
                            }
                            disabled={multiAssigneesList.length <= 1 || (!canEditMeta && !isNewTask)}
                            aria-label={language === "vi" ? "Xóa dòng" : "Remove row"}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMultiAssigneesList((prev) => {
                        const nhanSuCount = prev.filter((s) =>
                          s.label.startsWith("Nhân sự")
                        ).length;
                        return [
                          ...prev,
                          {
                            id: String(Date.now()),
                            label: `Nhân sự ${nhanSuCount + 1}`,
                            displayName: "",
                            userId: null,
                            receivedAt: null,
                            dueDate: null,
                            completedAt: null,
                            status: "not_started",
                            progress: 0,
                          },
                        ];
                      });
                    }}
                    disabled={!canEditMeta && !isNewTask}
                  >
                    + {language === "vi" ? "Thêm nhân sự" : "Add staff"}
                  </Button>
                  {!multiAssigneesList.some((s) => s.label === "Người kiểm soát") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setMultiAssigneesList((prev) => [
                          ...prev,
                          {
                            id: "ks-" + Date.now(),
                            label: "Người kiểm soát",
                            displayName: "",
                            userId: null,
                            receivedAt: null,
                            dueDate: null,
                            completedAt: null,
                            status: "not_started",
                            progress: 0,
                          },
                        ])
                      }
                      disabled={!canEditMeta && !isNewTask}
                    >
                      + {language === "vi" ? "Thêm Người kiểm soát" : "Add controller"}
                    </Button>
                  )}
                  {(() => {
                    const performing = multiAssigneesList.filter(
                      (s) => s.label !== "Người kiểm soát" && s.userId
                    );
                    const completed = performing.filter((s) => !!s.completedAt);
                    const total = performing.length;
                    const pct = total ? Math.round((completed.length / total) * 100) : 0;
                    return (
                      <div className="pt-2 text-sm text-muted-foreground">
                        {language === "vi" ? "Tiến độ chung: " : "Overall progress: "}
                        <span className="font-medium text-foreground">
                          {completed.length}/{total} ({pct}%)
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Thiết kế: Kỹ thuật viên chính + Trợ lý thiết kế (1 hoặc nhiều) */}
            {form.watch("group") === "Thiết kế" && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h3 className="text-base font-semibold">
                  {language === "vi" ? "Quy trình Thiết kế" : "Design workflow"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "vi"
                    ? "Kỹ thuật viên chính và Trợ lý thiết kế (có thể thêm nhiều trợ lý)."
                    : "Lead technician and design assistant(s)."}
                </p>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end gap-4 p-3 rounded-lg border bg-muted/20">
                    <div className="flex-1 min-w-[200px]">
                      <AssigneePicker
                        label={language === "vi" ? "Kỹ thuật viên chính" : "Lead technician"}
                        value={thietKeKtvChinh.displayName}
                        assigneeId={thietKeKtvChinh.userId}
                        onChange={(displayName, userId) =>
                          setThietKeKtvChinh((prev) => ({ ...prev, displayName, userId }))
                        }
                        disabled={!canEditMeta && !isNewTask}
                        placeholder={
                          language === "vi"
                            ? "Tìm theo tên hoặc email..."
                            : "Search by name or email..."
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {language === "vi" ? "Ngày nhận" : "Received"}
                        </Label>
                        <DateInput
                          value={thietKeKtvChinh.receiveDate || null}
                          onChange={(v) =>
                            setThietKeKtvChinh((prev) => ({ ...prev, receiveDate: v || "" }))
                          }
                          placeholder="dd/mm/yyyy"
                          className="bg-background w-32"
                          disabled={!canEditMeta && !isNewTask}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {language === "vi" ? "Hạn" : "Due"}
                        </Label>
                        <DateInput
                          value={thietKeKtvChinh.dueDate || null}
                          onChange={(v) =>
                            setThietKeKtvChinh((prev) => ({ ...prev, dueDate: v || null }))
                          }
                          placeholder="dd/mm/yyyy"
                          className="bg-background w-32"
                          disabled={!canEditMeta && !isNewTask}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {language === "vi" ? "Ngày hoàn thành thực tế" : "Actual completion"}
                        </Label>
                        <DateInput
                          value={thietKeKtvChinh.completeDate || null}
                          onChange={(v) =>
                            setThietKeKtvChinh((prev) => ({ ...prev, completeDate: v || "" }))
                          }
                          placeholder="dd/mm/yyyy"
                          className="bg-background w-32"
                          disabled={!canEditMeta && !isNewTask}
                        />
                      </div>
                    </div>
                  </div>
                  {thietKeTroLyList.map((slot, index) => (
                    <div key={slot.id} className="flex flex-wrap items-end gap-4 p-3 rounded-lg border bg-muted/20">
                      <div className="flex-1 min-w-[200px]">
                        <AssigneePicker
                          label={
                            language === "vi"
                              ? `Trợ lý thiết kế ${index + 1}`
                              : `Design assistant ${index + 1}`
                          }
                          value={slot.displayName}
                          assigneeId={slot.userId}
                          onChange={(displayName, userId) => {
                            setThietKeTroLyList((prev) =>
                              prev.map((s) =>
                                s.id === slot.id ? { ...s, displayName, userId } : s
                              )
                            );
                          }}
                          disabled={!canEditMeta && !isNewTask}
                          placeholder={
                            language === "vi"
                              ? "Tìm theo tên hoặc email..."
                              : "Search by name or email..."
                          }
                        />
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {language === "vi" ? "Ngày nhận" : "Received"}
                          </Label>
                          <DateInput
                            value={slot.receiveDate || null}
                            onChange={(v) =>
                              setThietKeTroLyList((prev) =>
                                prev.map((s) =>
                                  s.id === slot.id ? { ...s, receiveDate: v || "" } : s
                                )
                              )
                            }
                            placeholder="dd/mm/yyyy"
                            className="bg-background w-32"
                            disabled={!canEditMeta && !isNewTask}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {language === "vi" ? "Hạn" : "Due"}
                          </Label>
                          <DateInput
                            value={slot.dueDate || null}
                            onChange={(v) =>
                              setThietKeTroLyList((prev) =>
                                prev.map((s) =>
                                  s.id === slot.id ? { ...s, dueDate: v || null } : s
                                )
                              )
                            }
                            placeholder="dd/mm/yyyy"
                            className="bg-background w-32"
                            disabled={!canEditMeta && !isNewTask}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {language === "vi" ? "Ngày hoàn thành thực tế" : "Actual completion"}
                          </Label>
                          <DateInput
                            value={slot.completeDate || null}
                            onChange={(v) =>
                              setThietKeTroLyList((prev) =>
                                prev.map((s) =>
                                  s.id === slot.id ? { ...s, completeDate: v || "" } : s
                                )
                              )
                            }
                            placeholder="dd/mm/yyyy"
                            className="bg-background w-32"
                            disabled={!canEditMeta && !isNewTask}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setThietKeTroLyList((prev) => prev.filter((s) => s.id !== slot.id))
                          }
                          disabled={!canEditMeta && !isNewTask}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setThietKeTroLyList((prev) => [
                        ...prev,
                        {
                          id: "tly-" + Date.now(),
                          displayName: "",
                          userId: null,
                          receiveDate: "",
                          dueDate: null,
                          completeDate: "",
                        },
                      ])
                    }
                    disabled={!canEditMeta && !isNewTask}
                  >
                    + {language === "vi" ? "Thêm Trợ lý thiết kế" : "Add design assistant"}
                  </Button>
                </div>
              </div>
            )}

            {/* Biên tập: per-stage receive date, due date, completed date, status, cancel reason (create + edit) */}
            {form.watch("group") === "Biên tập" && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <h3 className="text-base font-semibold">{t.task.workflow}</h3>

                <div className="space-y-2">
                  <Label>{t.task.roundTypeLabel}</Label>
                  <Select
                    value={form.watch("roundType") || ""}
                    onValueChange={(val) => form.setValue("roundType", val)}
                    disabled={!isNewTask && !canEditMeta}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.task.selectRoundType} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tiền biên tập">
                        Tiền biên tập
                      </SelectItem>
                      <SelectItem value="Bông thô">Bông thô</SelectItem>
                      <SelectItem value="Bông 1 (thô)">Bông 1 (thô)</SelectItem>
                      <SelectItem value="Bông 1 (tinh)">
                        Bông 1 (tinh)
                      </SelectItem>
                      <SelectItem value="Bông 2 (thô)">Bông 2 (thô)</SelectItem>
                      <SelectItem value="Bông 2 (tinh)">
                        Bông 2 (tinh)
                      </SelectItem>
                      <SelectItem value="Bông 3 (thô)">Bông 3 (thô)</SelectItem>
                      <SelectItem value="Bông 3 (tinh)">
                        Bông 3 (tinh)
                      </SelectItem>
                      <SelectItem value="Bông chuyển in">
                        Bông chuyển in
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* BTV2 */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-sm font-semibold">{t.task.btv2}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <AssigneePicker
                        label={
                          t.task.btv2 +
                          " " +
                          (language === "vi" ? "(Tên)" : "(Name)")
                        }
                        value={form.watch("btv2") ?? ""}
                        assigneeId={form.watch("btv2Id") ?? null}
                        onChange={(assignee, assigneeId) => {
                          form.setValue("btv2", assignee);
                          form.setValue("btv2Id", assigneeId);
                        }}
                        placeholder={
                          language === "vi"
                            ? "Tìm theo tên hoặc email..."
                            : "Search by name or email..."
                        }
                        disabled={!isNewTask && !canEditMeta}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t.task.startDate}</Label>
                      <DateInput
                        value={form.watch("btv2ReceiveDate") || null}
                        onChange={(v) =>
                          form.setValue("btv2ReceiveDate", v ?? "")
                        }
                        placeholder="dd/mm/yyyy"
                        className="bg-background"
                        disabled={!isNewTask && !canEditMeta}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t.task.dueDate}</Label>
                      <DateInput
                        value={form.watch("btv2DueDate") || null}
                        onChange={(v) =>
                          form.setValue("btv2DueDate", v ?? null)
                        }
                        placeholder="dd/mm/yyyy"
                        className="bg-background"
                        disabled={!isNewTask && !canEditMeta}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">
                        {t.task.actualCompletedAt}
                      </Label>
                      <DateInput
                        value={form.watch("btv2CompleteDate") || null}
                        onChange={(v) => {
                          form.setValue("btv2CompleteDate", v ?? "");
                          if (v)
                            form.setValue("btv2Status", StageStatus.COMPLETED);
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
                        value={
                          form.watch("btv2CompleteDate")
                            ? StageStatus.COMPLETED
                            : form.watch("btv2Status") ??
                              StageStatus.NOT_STARTED
                        }
                        onValueChange={(val) =>
                          form.setValue("btv2Status", val)
                        }
                        disabled={
                          !!form.watch("btv2CompleteDate") ||
                          (!isNewTask && !canEditMeta)
                        }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={StageStatus.NOT_STARTED}>
                            {t.status.notStarted}
                          </SelectItem>
                          <SelectItem value={StageStatus.IN_PROGRESS}>
                            {t.status.inProgress}
                          </SelectItem>
                          <SelectItem value={StageStatus.COMPLETED}>
                            {t.status.completed}
                          </SelectItem>
                          <SelectItem value={StageStatus.CANCELLED}>
                            {t.status.cancelled}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.watch("btv2Status") === StageStatus.CANCELLED && (
                      <div className="space-y-2">
                        <Label className="text-xs">{t.task.cancelReason}</Label>
                        <Input
                          value={form.watch("btv2CancelReason") ?? ""}
                          onChange={(e) =>
                            form.setValue("btv2CancelReason", e.target.value)
                          }
                          placeholder={
                            language === "vi"
                              ? "Nêu lí do hủy..."
                              : "Cancel reason..."
                          }
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
                        label={
                          t.task.btv1 +
                          " " +
                          (language === "vi" ? "(Tên)" : "(Name)")
                        }
                        value={form.watch("btv1") ?? ""}
                        assigneeId={form.watch("btv1Id") ?? null}
                        onChange={(assignee, assigneeId) => {
                          form.setValue("btv1", assignee);
                          form.setValue("btv1Id", assigneeId);
                        }}
                        placeholder={
                          language === "vi"
                            ? "Tìm theo tên hoặc email..."
                            : "Search by name or email..."
                        }
                        disabled={!isNewTask && !canEditMeta}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t.task.startDate}</Label>
                      <DateInput
                        value={form.watch("btv1ReceiveDate") || null}
                        onChange={(v) =>
                          form.setValue("btv1ReceiveDate", v ?? "")
                        }
                        placeholder="dd/mm/yyyy"
                        className="bg-background"
                        disabled={!isNewTask && !canEditMeta}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t.task.dueDate}</Label>
                      <DateInput
                        value={form.watch("btv1DueDate") || null}
                        onChange={(v) =>
                          form.setValue("btv1DueDate", v ?? null)
                        }
                        placeholder="dd/mm/yyyy"
                        className="bg-background"
                        disabled={!isNewTask && !canEditMeta}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">
                        {t.task.actualCompletedAt}
                      </Label>
                      <DateInput
                        value={form.watch("btv1CompleteDate") || null}
                        onChange={(v) => {
                          form.setValue("btv1CompleteDate", v ?? "");
                          if (v)
                            form.setValue("btv1Status", StageStatus.COMPLETED);
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
                        value={
                          form.watch("btv1CompleteDate")
                            ? StageStatus.COMPLETED
                            : form.watch("btv1Status") ??
                              StageStatus.NOT_STARTED
                        }
                        onValueChange={(val) =>
                          form.setValue("btv1Status", val)
                        }
                        disabled={
                          !!form.watch("btv1CompleteDate") ||
                          (!isNewTask && !canEditMeta)
                        }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={StageStatus.NOT_STARTED}>
                            {t.status.notStarted}
                          </SelectItem>
                          <SelectItem value={StageStatus.IN_PROGRESS}>
                            {t.status.inProgress}
                          </SelectItem>
                          <SelectItem value={StageStatus.COMPLETED}>
                            {t.status.completed}
                          </SelectItem>
                          <SelectItem value={StageStatus.CANCELLED}>
                            {t.status.cancelled}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.watch("btv1Status") === StageStatus.CANCELLED && (
                      <div className="space-y-2">
                        <Label className="text-xs">{t.task.cancelReason}</Label>
                        <Input
                          value={form.watch("btv1CancelReason") ?? ""}
                          onChange={(e) =>
                            form.setValue("btv1CancelReason", e.target.value)
                          }
                          placeholder={
                            language === "vi"
                              ? "Nêu lí do hủy..."
                              : "Cancel reason..."
                          }
                          className="bg-background"
                          disabled={!isNewTask && !canEditMeta}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Người đọc duyệt */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-sm font-semibold">
                    {t.task.docDuyet}
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <AssigneePicker
                        label={
                          t.task.docDuyet +
                          " " +
                          (language === "vi" ? "(Tên)" : "(Name)")
                        }
                        value={form.watch("docDuyet") ?? ""}
                        assigneeId={form.watch("docDuyetId") ?? null}
                        onChange={(assignee, assigneeId) => {
                          form.setValue("docDuyet", assignee);
                          form.setValue("docDuyetId", assigneeId);
                        }}
                        placeholder={
                          language === "vi"
                            ? "Tìm theo tên hoặc email..."
                            : "Search by name or email..."
                        }
                        disabled={!isNewTask && !canEditMeta}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t.task.startDate}</Label>
                      <DateInput
                        value={form.watch("docDuyetReceiveDate") || null}
                        onChange={(v) =>
                          form.setValue("docDuyetReceiveDate", v ?? "")
                        }
                        placeholder="dd/mm/yyyy"
                        className="bg-background"
                        disabled={!isNewTask && !canEditMeta}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t.task.dueDate}</Label>
                      <DateInput
                        value={form.watch("docDuyetDueDate") || null}
                        onChange={(v) =>
                          form.setValue("docDuyetDueDate", v ?? null)
                        }
                        placeholder="dd/mm/yyyy"
                        className="bg-background"
                        disabled={!isNewTask && !canEditMeta}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">
                        {t.task.actualCompletedAt}
                      </Label>
                      <DateInput
                        value={form.watch("docDuyetCompleteDate") || null}
                        onChange={(v) => {
                          form.setValue("docDuyetCompleteDate", v ?? "");
                          if (v)
                            form.setValue(
                              "docDuyetStatus",
                              StageStatus.COMPLETED,
                            );
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
                        value={
                          form.watch("docDuyetCompleteDate")
                            ? StageStatus.COMPLETED
                            : form.watch("docDuyetStatus") ??
                              StageStatus.NOT_STARTED
                        }
                        onValueChange={(val) =>
                          form.setValue("docDuyetStatus", val)
                        }
                        disabled={
                          !!form.watch("docDuyetCompleteDate") ||
                          (!isNewTask && !canEditMeta)
                        }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={StageStatus.NOT_STARTED}>
                            {t.status.notStarted}
                          </SelectItem>
                          <SelectItem value={StageStatus.IN_PROGRESS}>
                            {t.status.inProgress}
                          </SelectItem>
                          <SelectItem value={StageStatus.COMPLETED}>
                            {t.status.completed}
                          </SelectItem>
                          <SelectItem value={StageStatus.CANCELLED}>
                            {t.status.cancelled}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.watch("docDuyetStatus") === StageStatus.CANCELLED && (
                      <div className="space-y-2">
                        <Label className="text-xs">{t.task.cancelReason}</Label>
                        <Input
                          value={form.watch("docDuyetCancelReason") ?? ""}
                          onChange={(e) =>
                            form.setValue(
                              "docDuyetCancelReason",
                              e.target.value,
                            )
                          }
                          placeholder={
                            language === "vi"
                              ? "Nêu lí do hủy..."
                              : "Cancel reason..."
                          }
                          className="bg-background"
                          disabled={!isNewTask && !canEditMeta}
                        />
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
              onActualCompletedAtChange={(v) =>
                form.setValue("actualCompletedAt", v || null)
              }
              onActualCompletedAtSetProgress={() =>
                form.setValue("progress", 100)
              }
              canEditMeta={canEditMeta}
              isBienTap={form.watch("group") === "Biên tập"}
              computedDueDisplay={(() => {
                const g = form.watch("group");
                if (g === "Biên tập")
                  return formatDateDDMMYYYY(
                    maxDateString(
                      form.watch("btv2DueDate"),
                      form.watch("btv1DueDate"),
                      form.watch("docDuyetDueDate"),
                    ),
                  );
                if (g === "Thiết kế")
                  return formatDateDDMMYYYY(
                    maxDateString(
                      thietKeKtvChinh.dueDate,
                      ...thietKeTroLyList.map((s) => s.dueDate),
                    ),
                  );
                if (g === "Công việc chung" || g === "CNTT" || g === "Quét trùng lặp" || g === "Thư ký hợp phần") {
                  const staff = multiAssigneesList.filter((s) => s.label !== "Người kiểm soát");
                  return formatDateDDMMYYYY(maxDateString(...staff.map((s) => s.dueDate)));
                }
                return undefined;
              })()}
              computedActualDisplay={(() => {
                const g = form.watch("group");
                if (g === "Biên tập")
                  return formatDateDDMMYYYY(form.watch("docDuyetCompleteDate"));
                if (g === "Thiết kế")
                  return formatDateDDMMYYYY(
                    maxDateString(
                      thietKeKtvChinh.completeDate,
                      ...thietKeTroLyList.map((s) => s.completeDate),
                    ),
                  );
                if (g === "Công việc chung" || g === "CNTT" || g === "Quét trùng lặp" || g === "Thư ký hợp phần") {
                  const staff = multiAssigneesList.filter((s) => s.label !== "Người kiểm soát");
                  return formatDateDDMMYYYY(maxDateString(...staff.map((s) => s.completedAt)));
                }
                return undefined;
              })()}
            />

            {/* Workflow View for Biên tập tasks (chỉ khi không hiển thị form Biên tập để tránh trùng) */}
            {!isNewTask &&
            task &&
            task.group === "Biên tập" &&
            task.workflow &&
            form.watch("group") !== "Biên tập" ? (
              <div className="space-y-2 pt-4 border-t border-border/50">
                <Label className="text-base font-semibold">
                  Quy trình Biên tập
                </Label>
                <div className="bg-muted/30 rounded-lg p-4">
                  {(() => {
                    let workflow: Workflow | null = null;
                    try {
                      if (task.workflow) {
                        workflow = (
                          typeof task.workflow === "string"
                            ? JSON.parse(task.workflow)
                            : task.workflow
                        ) as Workflow;
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
              {(() => {
                const group = form.watch("group");
                let value = 0;
                if (group === "Biên tập") {
                  const w = BienTapWorkflowHelpers.createWorkflow(1);
                  const r = w.rounds[0];
                  r.stages[0].status = form.watch("btv2CompleteDate")
                    ? StageStatus.COMPLETED
                    : (form.watch("btv2Status") as StageStatus) ?? StageStatus.NOT_STARTED;
                  r.stages[1].status = form.watch("btv1CompleteDate")
                    ? StageStatus.COMPLETED
                    : (form.watch("btv1Status") as StageStatus) ?? StageStatus.NOT_STARTED;
                  r.stages[2].status = form.watch("docDuyetCompleteDate")
                    ? StageStatus.COMPLETED
                    : (form.watch("docDuyetStatus") as StageStatus) ?? StageStatus.NOT_STARTED;
                  value = BienTapWorkflowHelpers.calculateProgress(w);
                } else if (group === "Thiết kế") {
                  const slots = [
                    thietKeKtvChinh.userId ? thietKeKtvChinh : null,
                    ...thietKeTroLyList.filter((s) => s.userId),
                  ].filter(Boolean) as Array<{ completeDate?: string | null }>;
                  const n = slots.length;
                  const m = slots.filter(
                    (s) => s.completeDate != null && String(s.completeDate).trim() !== ""
                  ).length;
                  value = n === 0 ? 0 : Math.round((100 / n) * m);
                } else if (group === "Công việc chung" || group === "CNTT" || group === "Quét trùng lặp" || group === "Thư ký hợp phần") {
                  const staff = multiAssigneesList.filter(
                    (s) => s.label !== "Người kiểm soát" && s.userId
                  );
                  const n = staff.length;
                  const m = staff.filter(
                    (s) => !!s.completedAt || s.status === "completed"
                  ).length;
                  value = n === 0 ? 0 : Math.round((100 / n) * m);
                } else {
                  value =
                    form.watch("actualCompletedAt") != null &&
                    String(form.watch("actualCompletedAt")).trim() !== ""
                      ? 100
                      : 0;
                }
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <Label>{t.task.progress}</Label>
                      <span className="text-sm font-medium text-muted-foreground shrink-0">
                        {value}%
                      </span>
                    </div>
                    <Progress value={value} className="h-2 w-full" />
                  </div>
                );
              })()}

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
              {!isNewTask &&
                (role === UserRole.ADMIN || role === UserRole.MANAGER) && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (task && confirm(t.common.confirmDelete)) {
                        deleteMutation.mutate(task.id, {
                          onSuccess: () => {
                            toast({
                              title: t.common.success,
                              description:
                                t.common.delete +
                                " " +
                                (language === "vi"
                                  ? "thành công"
                                  : "successfully"),
                            });
                            onOpenChange(false);
                          },
                          onError: (error) => {
                            toast({
                              title: t.common.error,
                              description:
                                error.message || t.errors.failedToDelete,
                              variant: "destructive",
                            });
                          },
                        });
                      }
                    }}
                    disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {t.common.delete}
                  </Button>
                )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}>
                {t.common.cancel}
              </Button>
              {!isNewTask && canEditMetaRaw && !isEditing && (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  {language === "vi" ? "Cập nhật" : "Update"}
                </Button>
              )}
              {(isNewTask || isEditing) && (
                <Button
                  type="submit"
                  disabled={
                    updateMutation.isPending ||
                    isCreating ||
                    deleteMutation.isPending
                  }>
                  {(updateMutation.isPending || isCreating) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isNewTask ? t.common.create : t.task.saveChanges}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
