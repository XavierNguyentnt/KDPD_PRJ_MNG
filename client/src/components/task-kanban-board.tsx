import { memo, useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  pointerWithin,
  rectIntersection,
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
  "In Progress": 15,
  Pending: 10,
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
      activationConstraint: { distance: 6 },
    }),
  );

  const collisionDetectionStrategy = useMemo(
    () =>
      function customCollisionDetection(args: any) {
        const pointer = pointerWithin(args);
        if (pointer) return pointer;
        return rectIntersection(args);
      },
    [],
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
          const capacityPercent = Math.round(
            (willCount / (limit as number)) * 100,
          );
          toast({
            title:
              language === "vi"
                ? "Gợi ý phân bổ công việc"
                : "Capacity gentle reminder",
            description:
              language === "vi"
                ? `Cột "${getStatusLabel(targetStatus)}" đang ở mức ${willCount}/${limit} (~${capacityPercent}% WIP). Đã cho phép di chuyển bình thường — hãy cân nhắc chuyển/hoàn thành bớt việc sau để đảm bảo hiệu suất nhé.`
                : `Column "${targetStatus}" now at ${willCount}/${limit} (~${capacityPercent}% WIP). Move completed normally — consider rebalancing later to stay focused.`,
            duration: 6500,
          });
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
      collisionDetection={collisionDetectionStrategy}
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

function KanbanColumnBase({
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

  /**
   * 3-TIER WIP VISUAL (bannerless, space-efficient, friendly):
   *  Tier 1 — Under (< 80% capacity)        = neutral
   *  Tier 2 — Approaching (80% ~ 100%) = amber/awareness
   *  Tier 3 — Over  (> 100%)           = rose/gentle reminder
   *  Tier 0 — No limit (Infinity)          = neutral (no progress)
   */
  const wipRatio = hasWip ? count / (wipLimit as number) : 0;
  const wipTier: 0 | 1 | 2 | 3 = !hasWip
    ? 0
    : wipRatio > 1
      ? 3
      : wipRatio >= 0.8
        ? 2
        : 1;
  const wipPercent = !hasWip
    ? 0
    : Math.min(100, Math.round(wipRatio * 100));

  /** Shared color keys for Progress / Badge / Borders:
   *  Tier 2 uses status-warning (amber) family, Tier 3 status-danger (rose/red)
   */
  const tierProgressIndicatorClass =
    wipTier === 3
      ? "bg-status-danger"
      : wipTier === 2
        ? "bg-status-warning"
        : "bg-muted-foreground/35";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[300px] rounded-lg border-2 transition-colors overflow-hidden",
        // ── Border / outer tint (drag over states + static tiers)
        isOver && wipTier === 3 && "border-destructive bg-destructive/5",
        isOver && wipTier === 2 && "border-status-warning/80 bg-status-warning/5",
        isOver && (wipTier === 1 || wipTier === 0) && "border-primary bg-primary/5",
        !isOver && wipTier === 3 && "border-status-danger/55 bg-status-danger/[0.05]",
        !isOver && wipTier === 2 && "border-status-warning/55 bg-status-warning/[0.045]",
        !isOver && (wipTier === 1 || wipTier === 0) && "border-border bg-muted/25",
      )}>
      {/* COLUMN HEADER (title + icon + count badge) */}
      <div
        className={cn(
          "p-3 border-b flex flex-col gap-2.5",
          // Subtle header gradient tint by tier
          wipTier === 3 && "border-status-danger/25 bg-gradient-to-b from-status-danger/15 to-status-danger/[0.07]",
          wipTier === 2 && "border-status-warning/25 bg-gradient-to-b from-status-warning/14 to-status-warning/[0.06]",
          (wipTier === 1 || wipTier === 0) && "border-border bg-muted/30",
        )}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Tier 2/3 only: gentle visual icon (NO TEXT BANNER!) */}
            {wipTier === 3 ? (
              <AlertTriangle
                className="w-4 h-4 text-status-danger shrink-0"
                strokeWidth={2.2}
              />
            ) : wipTier === 2 ? (
              <AlertTriangle
                className="w-4 h-4 text-status-warning shrink-0 opacity-90"
                strokeWidth={2.0}
              />
            ) : null}
            <span className="font-semibold text-sm truncate">{title}</span>
          </div>
          {/* Badge count: 3-tier chromatic tiered */}
          <Badge
            className={cn(
              "text-xs shrink-0 tabular-nums border font-semibold",
              wipTier === 3 &&
                "bg-status-danger/90 text-white border-status-danger/40 shadow-sm",
              wipTier === 2 &&
                "bg-status-warning/22 text-foreground border-status-warning/55",
              (wipTier === 1 || wipTier === 0) &&
                "bg-secondary/70 text-secondary-foreground border-transparent",
            )}>
            {wipText}
          </Badge>
        </div>

        {/* ── Capacity progress bar (tiered color, NO LABEL) */}
        {hasWip && (
          <div
          aria-hidden="true" className="w-full">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/70 border border-border/70">
              <div
                className={cn(
                  "absolute left-0 top-0 h-full rounded-full transition-all duration-300",
                  tierProgressIndicatorClass,
                )}
                style={{ width: `${wipPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* BODY: tasks stack (NO TEXT BANNERS — removed old warning copy! Icon was at L340-L351, save 40px/cột vertical space reclaimed) */}
      <div
        className={cn(
          "p-2 min-h-[320px] flex flex-col gap-2",
          wipTier === 3 && "bg-status-danger/[0.035]",
          wipTier === 2 && "bg-status-warning/[0.025]",
        )}>
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
const KanbanColumn = memo(KanbanColumnBase, (prev, next) =>
  prev.id === next.id &&
  prev.title === next.title &&
  prev.count === next.count &&
  prev.wipLimit === next.wipLimit &&
  prev.overWip === next.overWip &&
  prev.atWip === next.atWip &&
  prev.isUpdating === next.isUpdating &&
  prev.tasks === next.tasks &&
  prev.onTaskClick === next.onTaskClick &&
  prev.getPriorityColor === next.getPriorityColor &&
  prev.getStatusColor === next.getStatusColor,
);

const STATUS_LABEL_KEYS: Record<string, keyof any> = {
  "Not Started": "notStarted",
  "In Progress": "inProgress",
  Completed: "completed",
  Pending: "pending",
  Cancelled: "cancelled",
};

function KanbanCardBase({
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

  const cardStyle = useMemo(
    () =>
      transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined,
    [transform?.x, transform?.y],
  );

  const handleClick = useMemo(
    () => (onTaskClick ? () => onTaskClick(task) : undefined),
    [onTaskClick, task],
  );

  const statusLabelKey = STATUS_LABEL_KEYS[task.status];
  const statusText = statusLabelKey
    ? (t.status as any)[statusLabelKey] ?? task.status
    : task.status;

  return (
    <Card
      ref={setNodeRef}
      style={cardStyle}
      className={`touch-none select-none cursor-grab active:cursor-grabbing rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow ${
        isDragging ? "relative z-50 shadow-lg ring-2 ring-primary/20" : ""
      }`}
      {...listeners}
      {...attributes}
      onClick={handleClick}>
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
              <Badge
                variant="ghost"
                className={`text-xs ${getStatusColor(task.status)}`}>
                {statusText}
              </Badge>
              <Badge
                variant="ghost"
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
const KanbanCard = memo(KanbanCardBase, (prev, next) =>
  prev.task === next.task &&
  prev.onTaskClick === next.onTaskClick &&
  prev.getPriorityColor === next.getPriorityColor &&
  prev.getStatusColor === next.getStatusColor,
);
