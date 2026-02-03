import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
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
import { formatDateDDMMYYYY } from "@/lib/utils";
import { GripVertical, Loader2 } from "lucide-react";

const COLUMN_PREFIX = "group-column-";
const TASK_PREFIX = "task-";

export interface TaskKanbanBoardProps {
  tasks: TaskWithAssignmentDetails[];
  onTaskClick: (task: TaskWithAssignmentDetails) => void;
  getPriorityColor?: (priority: string) => string;
  getStatusColor?: (status: string) => string;
  /** Nhóm hiển thị dưới dạng "Không nhóm" khi task.group rỗng */
  noGroupLabel?: string;
}

export function TaskKanbanBoard({
  tasks,
  onTaskClick,
  getPriorityColor = () => "bg-slate-100 text-slate-700",
  getStatusColor = () => "bg-slate-100 text-slate-700",
  noGroupLabel = "(Không nhóm)",
}: TaskKanbanBoardProps) {
  const { t, language } = useI18n();
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns = useMemo(() => {
    const groups = new Map<string, TaskWithAssignmentDetails[]>();
    const displayNoGroup = noGroupLabel;
    for (const task of tasks) {
      const key = (task.group ?? "").trim() ? (task.group ?? "").trim() : displayNoGroup;
      groups.set(key, [...(groups.get(key) ?? []), task]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === displayNoGroup) return 1;
      if (b === displayNoGroup) return -1;
      return a.localeCompare(b);
    });
  }, [tasks, noGroupLabel]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;
      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);
      if (activeIdStr.startsWith(TASK_PREFIX) && overIdStr.startsWith(COLUMN_PREFIX)) {
        const taskId = activeIdStr.slice(TASK_PREFIX.length);
        const targetGroup = overIdStr.slice(COLUMN_PREFIX.length);
        const decodedGroup = targetGroup === noGroupLabel ? "" : decodeURIComponent(targetGroup);
        const task = tasks.find((x) => x.id === taskId);
        if (!task || (task.group ?? "").trim() === decodedGroup) return;
        updateTask(
          { id: taskId, group: decodedGroup || undefined },
          {
            onSuccess: () => {
              toast({
                title: t.common.success,
                description:
                  language === "vi"
                    ? "Đã chuyển công việc sang nhóm mới."
                    : "Task moved to new group.",
              });
            },
            onError: (err) => {
              toast({
                title: t.common.error,
                description: err.message || t.errors.failedToUpdate,
                variant: "destructive",
              });
            },
          }
        );
      }
    },
    [tasks, updateTask, toast, t, language, noGroupLabel]
  );

  const activeTask = useMemo(
    () => (activeId && activeId.startsWith(TASK_PREFIX) ? tasks.find((t) => TASK_PREFIX + t.id === activeId) : null),
    [activeId, tasks]
  );

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-muted/20 min-h-[320px] p-8">
        <p className="text-sm text-muted-foreground">{t.dashboard.noTasksFound}</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border border-border">
        <div className="flex gap-4 p-4 min-h-[420px]">
          {columns.map(([groupName, columnTasks]) => {
            const columnId = COLUMN_PREFIX + (groupName === noGroupLabel ? noGroupLabel : encodeURIComponent(groupName));
            return (
              <KanbanColumn
                key={columnId}
                id={columnId}
                title={groupName}
                tasks={columnTasks}
                onTaskClick={onTaskClick}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
                isUpdating={isUpdating}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <KanbanCard
            task={activeTask}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
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
}: {
  id: string;
  title: string;
  tasks: TaskWithAssignmentDetails[];
  onTaskClick: (task: TaskWithAssignmentDetails) => void;
  getPriorityColor: (p: string) => string;
  getStatusColor: (s: string) => string;
  isUpdating: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[300px] rounded-lg border-2 bg-muted/30 transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm">{title}</span>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div className="p-2 min-h-[320px] flex flex-col gap-2">
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
  isDragOverlay,
}: {
  task: TaskWithAssignmentDetails;
  onTaskClick?: (task: TaskWithAssignmentDetails) => void;
  getPriorityColor: (p: string) => string;
  getStatusColor: (s: string) => string;
  isDragOverlay?: boolean;
}) {
  const { language } = useI18n();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: TASK_PREFIX + task.id,
    data: { task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow ${
        isDragging && !isDragOverlay ? "opacity-50 shadow-md" : ""
      } ${isDragOverlay ? "cursor-grabbing shadow-lg ring-2 ring-primary/20 rotate-1" : ""}`}
      onClick={!isDragOverlay && onTaskClick ? () => onTaskClick(task) : undefined}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {!isDragOverlay && (
            <button
              type="button"
              className="touch-none p-0.5 rounded hover:bg-muted text-muted-foreground cursor-grab active:cursor-grabbing"
              {...listeners}
              {...attributes}
              onClick={(e) => e.stopPropagation()}
              aria-label="Drag"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2">{task.title ?? ""}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge className={`text-xs ${getStatusColor(task.status)}`}>{task.status}</Badge>
              <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority ?? "")}`}>
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
              <p className="text-xs text-muted-foreground mt-1 truncate">{task.assignee}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
