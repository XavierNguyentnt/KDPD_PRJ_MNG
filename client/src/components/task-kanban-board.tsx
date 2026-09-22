import { useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragCancelEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useI18n } from "@/hooks/use-i18n";
import { useUpdateTask } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";
import { formatDateDDMMYYYY, cn } from "@/lib/utils";
import { AlertTriangle, GripVertical, Loader2 } from "lucide-react";
import { EmptyStateCTA } from "@/components/ui/empty-state-cta";

const COLUMN_PREFIX = "status-column-";
const TASK_PREFIX = "task-";

const DEFAULT_WIP_LIMITS: Readonly<Record<string, number>> = {
  "Not Started": Infinity,
  "In Progress": 8,
  Pending: 5,
  Completed: Infinity,
  Cancelled: Infinity,
};

export type WipLimitMap = Record<string, number>;

export interface TaskKanbanBoardProps {
  tasks: TaskWithAssignmentDetails[];
  onTaskClick: (task: TaskWithAssignmentDetails) => void;
  getPriorityColor?: (priority: string) => string;
  getStatusColor?: (status: string) => string;
  /** Nhóm hiển thị dưới dạng "Không nhóm" khi task.group rỗng */
  noGroupLabel?: string;
  /** Override WIP limit cho từng status. Status không khai báo dùng DEFAULT_WIP_LIMITS hoặc Infinity. */
  wipLimits?: Partial<WipLimitMap>;
  /** Optional: khi 0 task, hiển thị CTA tạo công việc mới */
  onCreateNew?: () => void;
  /** Optional: khi 0 task do bộ lọc, hiển thị nút xóa bộ lọc */
  onResetFilters?: () => void;
}

export function TaskKanbanBoard({
  tasks,
  onTaskClick,
  getPriorityColor = () => "bg-slate-100 text-slate-700",
  getStatusColor = () => "bg-slate-100 text-slate-700",
  noGroupLabel = "(Không nhóm)",
  wipLimits,
  onCreateNew,
  onResetFilters,
}: TaskKanbanBoardProps) {
  const { t, language } = useI18n();
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask();
  const { toast } = useToast();
  const lastDragEndAtRef = useRef(0);

  const STATUS_ORDER = useMemo(
    () => ["Not Started", "In Progress", "Completed", "Pending", "Cancelled"],
    [],
  );

  const effectiveWipLimits = useMemo<WipLimitMap>(() => {
    const merged: WipLimitMap = { ...DEFAULT_WIP_LIMITS };
    const overrides = wipLimits ?? {};
    for (const key of Object.keys(overrides)) {
      const v = overrides[key];
      if (typeof v === "number") merged[key] = v;
    }
    return merged;
  }, [wipLimits]);

  const getStatusLabel = useCallback(
    (status: string) => {
      const map: Record<string, string> = {
        "Not Started": t.status.notStarted,
        "In Progress": t.status.inProgress,
        Completed: t.status.completed,
        Pending: t.status.pending,
        Cancelled: t.status.cancelled,
      };
      return map[status] ?? status;
    },
    [t],
  );

  const getWipLimit = useCallback(
    (status: string): number => {
      if (status in effectiveWipLimits) return effectiveWipLimits[status]!;
      return Infinity;
    },
    [effectiveWipLimits],
  );

  const columns = useMemo(() => {
    const byStatus = new Map<string, TaskWithAssignmentDetails[]>();
    STATUS_ORDER.forEach((s) => byStatus.set(s, []));
    for (const task of tasks) {
      const key =
        task.status && STATUS_ORDER.includes(task.status)
          ? task.status
          : task.status || "Not Started";
      byStatus.set(key, [...(byStatus.get(key) ?? []), task]);
    }
    const unknownStatuses = Array.from(byStatus.keys()).filter(
      (s) => !STATUS_ORDER.includes(s),
    );
    const ordered = [
      ...STATUS_ORDER.map(
        (s) =>
          [s, byStatus.get(s) ?? []] as [string, TaskWithAssignmentDetails[]],
      ),
      ...unknownStatuses.map(
        (s) =>
          [s, byStatus.get(s) ?? []] as [string, TaskWithAssignmentDetails[]],
      ),
    ];
    return ordered;
  }, [tasks, STATUS_ORDER]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    lastDragEndAtRef.current = 0;
  }, []);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    lastDragEndAtRef.current = Date.now();
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      lastDragEndAtRef.current = Date.now();
      const { active, over } = event;
      if (!over) return;
      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);
      if (
        activeIdStr.startsWith(TASK_PREFIX) &&
        overIdStr.startsWith(COLUMN_PREFIX)
      ) {
        const taskId = activeIdStr.slice(TASK_PREFIX.length);
        const targetStatus = decodeURIComponent(
          overIdStr.slice(COLUMN_PREFIX.length),
        );
        const task = tasks.find((x) => x.id === taskId);
        if (!task || task.status === targetStatus) return;
        const targetTasks =
          columns.find(([s]) => s === targetStatus)?.[1] ?? [];
        const willCount =
          targetTasks.filter((x) => x.id !== taskId).length + 1;
        const limit = getWipLimit(targetStatus);
        if (Number.isFinite(limit) && willCount > limit) {
          toast({
            variant: "destructive",
            title:
              t.common.error ??
              (language === "vi" ? "Cảnh báo" : "Warning"),
            description:
              language === "vi"
                ? `Cột "${getStatusLabel(targetStatus)}" đã đạt WIP limit ${limit}. Không thể thêm công việc mới.`
                : `Column "${targetStatus}" would exceed WIP limit of ${limit}. Move rejected.`,
            duration: 6000,
          });
          return;
        }
        updateTask(
          { id: taskId, status: targetStatus },
          {
            onSuccess: () => {
              toast({
                title: t.common.success,
                description:
                  language === "vi"
                    ? "Đã chuyển trạng thái công việc."
                    : "Task moved to new status.",
              });
            },
            onError: (err) => {
              toast({
                title: t.common.error,
                description: err.message || t.errors.failedToUpdate,
                variant: "destructive",
              });
            },
          },
        );
      }
    },
    [tasks, columns, updateTask, toast, t, language, getWipLimit, getStatusLabel],
  );

  const handleTaskClick = useCallback(
    (task: TaskWithAssignmentDetails) => {
      if (Date.now() - lastDragEndAtRef.current < 250) return;
      onTaskClick(task);
    },
    [onTaskClick],
  );

  const hasAnyTask = tasks.length > 0;
  if (!hasAnyTask) {
    return (
      <EmptyStateCTA
        variant="default"
        illustration="kanban"
        onCreateNew={onCreateNew}
        onResetFilters={onResetFilters}
        title={t.dashboard.noTasksFound}
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border border-border">
        <div className="flex gap-4 p-4 min-h-[420px]">
          {columns.map(([statusName, columnTasks]) => {
            const columnId = COLUMN_PREFIX + encodeURIComponent(statusName);
            const wipLimit = getWipLimit(statusName);
            const count = columnTasks.length;
            const overWip = Number.isFinite(wipLimit) && count > wipLimit;
            const atWip =
              !overWip && Number.isFinite(wipLimit) && count === wipLimit;
            return (
              <KanbanColumn
                key={columnId}
                id={columnId}
                title={getStatusLabel(statusName)}
                tasks={columnTasks}
                onTaskClick={handleTaskClick}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
                isUpdating={isUpdating}
                count={count}
                wipLimit={wipLimit}
                overWip={overWip}
                atWip={atWip}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </DndContext>
  );
}

function KanbanColumn({
  id,
  title,
  tasks,
  onTaskClick,
  getPriorityColor,
  getStatusColor,
  isUpdating,
  count,
  wipLimit,
  overWip,
  atWip,
}: {
  id: string;
  title: string;
  tasks: TaskWithAssignmentDetails[];
  onTaskClick: (task: TaskWithAssignmentDetails) => void;
  getPriorityColor: (p: string) => string;
  getStatusColor: (s: string) => string;
  isUpdating: boolean;
  count: number;
  wipLimit: number;
  overWip: boolean;
  atWip: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const hasWip = Number.isFinite(wipLimit);
  const wipText = hasWip ? `${count} / ${wipLimit}` : String(count);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[300px] rounded-lg border-2 transition-colors",
        isOver && !overWip && "border-primary bg-primary/5",
        isOver && overWip && "border-destructive bg-destructive/5",
        !isOver && overWip && "border-destructive/60 bg-destructive/[0.04]",
        !isOver && atWip && "border-accent/60 bg-accent/5",
        !isOver && !overWip && !atWip && "border-border bg-muted/30",
      )}>
      <div
        className={cn(
          "p-3 border-b flex items-center justify-between gap-2",
          overWip
            ? "border-destructive/30 bg-destructive/[0.05]"
            : atWip
            ? "border-accent/30 bg-accent/[0.05]"
            : "border-border",
        )}>
        <div className="flex items-center gap-2 min-w-0">
          {overWip ? (
            <AlertTriangle
              className="w-4 h-4 text-destructive shrink-0"
              strokeWidth={2.2}
            />
          ) : atWip ? (
            <AlertTriangle
              className="w-4 h-4 text-accent shrink-0 opacity-85"
              strokeWidth={2.0}
            />
          ) : null}
          <span className="font-semibold text-sm truncate">{title}</span>
        </div>
        <Badge
          className={cn(
            "text-xs shrink-0 tabular-nums border",
            overWip
              ? "bg-destructive text-destructive-foreground border-destructive/40 shadow-sm"
              : atWip
              ? "bg-accent/15 text-accent-foreground border-accent/40"
              : "bg-secondary text-secondary-foreground border-transparent",
          )}>
          {wipText}
        </Badge>
      </div>
      <div className="p-2 min-h-[320px] flex flex-col gap-2">
        {hasWip && overWip && (
          <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-[11px] font-medium text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span>Vượt WIP limit. Không thể thêm công việc.</span>
          </div>
        )}
        {hasWip && !overWip && atWip && (
          <div className="flex items-center gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-2.5 py-1.5 text-[11px] font-medium text-accent-foreground">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span>Đạt WIP limit. Cân nhắc hoàn thành trước.</span>
          </div>
        )}
        {isUpdating && (
          <div className="flex items-center justify-center py-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-xs">Updating...</span>
          </div>
        )}
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onTaskClick={onTaskClick}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  onTaskClick,
  getPriorityColor,
  getStatusColor,
}: {
  task: TaskWithAssignmentDetails;
  onTaskClick?: (task: TaskWithAssignmentDetails) => void;
  getPriorityColor: (p: string) => string;
  getStatusColor: (s: string) => string;
}) {
  const { language, t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: TASK_PREFIX + task.id,
      data: { task },
    });

  const style =
    transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`touch-none select-none cursor-grab active:cursor-grabbing rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow ${
        isDragging ? "relative z-50 shadow-lg ring-2 ring-primary/20" : ""
      }`}
      {...listeners}
      {...attributes}
      onClick={onTaskClick ? () => onTaskClick(task) : undefined}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="p-0.5 rounded text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2">
              {task.title ?? ""}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                {task.status === "Not Started"
                  ? t.status.notStarted
                  : task.status === "In Progress"
                    ? t.status.inProgress
                    : task.status === "Completed"
                      ? t.status.completed
                      : task.status === "Pending"
                        ? t.status.pending
                        : task.status === "Cancelled"
                          ? t.status.cancelled
                          : task.status}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${getPriorityColor(task.priority ?? "")}`}>
                {task.priority ?? "—"}
              </Badge>
            </div>
            {task.dueDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {language === "vi" ? "Hạn: " : "Due: "}
                {formatDateDDMMYYYY(task.dueDate)}
              </p>
            )}
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <Progress value={task.progress ?? 0} className="h-1.5" />
            </div>
            {task.assignee && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {task.assignee}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
