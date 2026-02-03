import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { useI18n } from "@/hooks/use-i18n";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { Workflow, BienTapWorkflowHelpers, BienTapStageType, StageStatus } from "@shared/workflow";
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Pencil, Trash2 } from "lucide-react";

export type TaskSortColumn = "id" | "title" | "group" | "assignee" | "priority" | "status" | "dueDate" | "progress" | "receivedDate" | "actualCompletedAt" | "vote";

/** Sort tasks by column. Use with TaskTable sortBy/sortDir/onSort. */
export function sortTasks(
  tasks: TaskWithAssignmentDetails[],
  sortBy: TaskSortColumn | null | undefined,
  sortDir: "asc" | "desc"
): TaskWithAssignmentDetails[] {
  if (!sortBy) return tasks.slice();
  const dir = sortDir === "asc" ? 1 : -1;
  const getVal = (t: TaskWithAssignmentDetails, col: TaskSortColumn) => {
    if (col === "receivedDate") return (t as TaskWithAssignmentDetails & { receivedAt?: string | Date | null }).receivedAt;
    return t[col as keyof TaskWithAssignmentDetails];
  };
  const cmp = (a: TaskWithAssignmentDetails, b: TaskWithAssignmentDetails): number => {
    const av = getVal(a, sortBy);
    const bv = getVal(b, sortBy);
    if (sortBy === "dueDate" || sortBy === "actualCompletedAt" || sortBy === "receivedDate") {
      const ad = av ? (typeof av === "string" ? av.slice(0, 10) : (av as Date).toISOString?.()?.slice(0, 10) ?? "") : "";
      const bd = bv ? (typeof bv === "string" ? bv.slice(0, 10) : (bv as Date).toISOString?.()?.slice(0, 10) ?? "") : "";
      return (ad < bd ? -1 : ad > bd ? 1 : 0) * dir;
    }
    if (sortBy === "progress") {
      const an = Number(av) ?? 0;
      const bn = Number(bv) ?? 0;
      return (an - bn) * dir;
    }
    const as = String(av ?? "");
    const bs = String(bv ?? "");
    return as.localeCompare(bs, undefined, { numeric: true }) * dir;
  };
  return tasks.slice().sort(cmp);
}

interface TaskTableProps {
  tasks: TaskWithAssignmentDetails[];
  onTaskClick: (task: TaskWithAssignmentDetails) => void;
  sortBy?: TaskSortColumn | null;
  sortDir?: "asc" | "desc";
  onSort?: (column: TaskSortColumn) => void;
  columns?: {
    id?: boolean;
    title?: boolean;
    group?: boolean;
    assignee?: boolean;
    priority?: boolean;
    status?: boolean;
    dueDate?: boolean;
    progress?: boolean;
    /** Ngày nhận công việc (sớm nhất từ assignments) */
    receivedDate?: boolean;
    /** Ngày hoàn thành thực tế (muộn nhất từ assignments) */
    actualCompletedAt?: boolean;
    /** Đánh giá (vote) của Người kiểm soát */
    vote?: boolean;
    customColumns?: Array<{
      key: string;
      label: string;
      render: (task: TaskWithAssignmentDetails) => React.ReactNode;
    }>;
  };
  actions?: {
    onView?: (task: TaskWithAssignmentDetails) => void;
    onEdit?: (task: TaskWithAssignmentDetails) => void;
    onDelete?: (task: TaskWithAssignmentDetails) => void;
  };
  getPriorityColor?: (priority: string) => string;
  getStatusColor?: (status: string) => string;
}

function getBienTapRoundType(task: TaskWithAssignmentDetails): string | null {
  if (task.group !== "Biên tập") return null;
  if (!task.workflow) return null;
  try {
    const workflow =
      typeof task.workflow === "string"
        ? JSON.parse(task.workflow)
        : task.workflow;
    const roundType = workflow?.rounds?.[0]?.roundType;
    if (typeof roundType === "string" && roundType.trim() !== "") {
      return roundType.trim();
    }
  } catch (_) {
    return null;
  }
  return null;
}

function SortableHead({
  label,
  column,
  sortBy,
  sortDir,
  onSort,
  className,
  style,
  title,
}: {
  label: React.ReactNode;
  column: TaskSortColumn;
  sortBy?: TaskSortColumn | null;
  sortDir?: "asc" | "desc";
  onSort?: (column: TaskSortColumn) => void;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const active = sortBy === column;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={className}
      style={style}
      title={title}
      onClick={onSort ? () => onSort(column) : undefined}
      role={onSort ? "button" : undefined}
      tabIndex={onSort ? 0 : undefined}
      onKeyDown={onSort ? (e) => e.key === "Enter" && onSort(column) : undefined}
    >
      <div className={`flex items-center gap-1 ${onSort ? "cursor-pointer select-none hover:opacity-80" : ""}`}>
        {label}
        {onSort && <Icon className="w-3.5 h-3.5 opacity-70" />}
      </div>
    </th>
  );
}

export function TaskTable({ 
  tasks, 
  onTaskClick, 
  columns = {},
  sortBy,
  sortDir = "asc",
  onSort,
  actions,
  getPriorityColor,
  getStatusColor 
}: TaskTableProps) {
  const { t, language } = useI18n();
  
  // Helper function to get stage label
  const getStageLabel = (type: BienTapStageType): string => {
    if (language === 'vi') {
      switch (type) {
        case BienTapStageType.BTV1:
          return t.task.btv1 || 'BTV 1';
        case BienTapStageType.BTV2:
          return t.task.btv2 || 'BTV 2';
        case BienTapStageType.DOC_DUYET:
          return t.task.docDuyet || 'Người đọc duyệt';
        default:
          return String(type);
      }
    } else {
      switch (type) {
        case BienTapStageType.BTV1:
          return t.task.btv1 || 'Editor 1';
        case BienTapStageType.BTV2:
          return t.task.btv2 || 'Editor 2';
        case BienTapStageType.DOC_DUYET:
          return t.task.docDuyet || 'Reviewer';
        default:
          return String(type);
      }
    }
  };
  
  // Helper function to get status color for stage (Biên tập workflow)
  const getStageStatusColor = (status: StageStatus): string => {
    switch (status) {
      case StageStatus.COMPLETED:
        return 'text-green-600 bg-green-50 border-green-200'; // Đã hoàn thành: màu xanh lá
      case StageStatus.IN_PROGRESS:
        return 'text-blue-600 bg-blue-50 border-blue-200'; // Đang tiến hành: màu xanh dương
      case StageStatus.PENDING:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'; // Tạm dừng: màu vàng
      case StageStatus.NOT_STARTED:
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'; // Chưa tiến hành: màu xám
    }
  };

  // Màu trạng thái cho assignment (CV chung, Thiết kế, CNTT): completed | in_progress | not_started
  const getAssignmentStatusColor = (status: string | null | undefined): string => {
    const s = (status ?? "not_started").toLowerCase();
    if (s === "completed") return "text-green-600 bg-green-50 border-green-200";
    if (s === "in_progress") return "text-blue-600 bg-blue-50 border-blue-200";
    return "text-gray-600 bg-gray-50 border-gray-200"; // not_started
  };

  const getAssignmentLabel = (stageType: string): string => {
    if (stageType === "kiem_soat") return language === "vi" ? "Người kiểm soát" : "Controller";
    if (stageType.startsWith("nhan_su_")) return (language === "vi" ? "Nhân sự " : "Staff ") + stageType.replace("nhan_su_", "");
    if (stageType === "primary") return language === "vi" ? "Người thực hiện" : "Assignee";
    if (stageType === "ktv_chinh") return language === "vi" ? "KTV chính" : "Lead";
    if (stageType.startsWith("tro_ly_")) return (language === "vi" ? "Trợ lý " : "Assistant ") + stageType.replace("tro_ly_", "");
    return stageType;
  };

  // Helper function to render assignee cell
  const renderAssigneeCell = (task: TaskWithAssignmentDetails) => {
    // For "Biên tập" tasks, show workflow assignees with status colors
    if (task.group === 'Biên tập' && task.workflow) {
      try {
        const workflow = (typeof task.workflow === "string" ? JSON.parse(task.workflow) : task.workflow) as Workflow;
        const currentRound = workflow.rounds.find(r => r.roundNumber === workflow.currentRound) || workflow.rounds[0];
        const assignees = currentRound?.stages
          .map(stage => {
            const stageLabel = getStageLabel(stage.type);
            return { 
              label: stageLabel, 
              name: stage.assignee || (language === 'vi' ? 'Chưa giao' : 'Unassigned'),
              status: stage.status,
              hasAssignee: !!stage.assignee
            };
          }) || [];
        
        if (assignees.length > 0) {
          return (
            <td className="p-4 align-middle min-w-[220px]">
              <div className="flex flex-col gap-1.5">
                {assignees.map((assignee, idx) => {
                  const statusColor = getStageStatusColor(assignee.status);
                  // Ensure label is displayed correctly
                  const displayLabel = assignee.label || 'Unknown';
                  const displayName = assignee.name || (language === 'vi' ? 'Chưa giao' : 'Unassigned');
                  return (
                    <div key={idx} className="flex items-center">
                      <span className={`text-xs px-2 py-0.5 rounded border ${statusColor} font-medium`}>
                        {displayLabel}: {displayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </td>
          );
        }
      } catch (e) {
        console.error('Failed to parse workflow', e);
      }
    }
    
    // CV chung / Thiết kế / CNTT / Quét: hiển thị đầy đủ nhân sự từ assignments với màu trạng thái
    const assignments = (task as TaskWithAssignmentDetails & { assignments?: Array<{ stageType: string; status?: string; displayName?: string | null }> }).assignments;
    if (assignments && assignments.length > 0) {
      return (
        <td className="p-4 align-middle min-w-[220px]">
          <div className="flex flex-col gap-1.5">
            {assignments.map((asn, idx) => {
              const label = getAssignmentLabel(asn.stageType);
              const name = (asn as { displayName?: string | null }).displayName ?? (language === "vi" ? "Chưa giao" : "Unassigned");
              const statusColor = getAssignmentStatusColor(asn.status);
              return (
                <div key={idx} className="flex items-center">
                  <span className={`text-xs px-2 py-0.5 rounded border ${statusColor} font-medium`}>
                    {label}: {name}
                  </span>
                </div>
              );
            })}
          </div>
        </td>
      );
    }

    // Default: show regular assignee
    return (
      <td className="p-4 align-middle min-w-[220px]">
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
              {task.assignee.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm">{task.assignee}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs italic">{t.task.unassigned}</span>
        )}
      </td>
    );
  };
  
  // Helper function to render progress cell
  const renderProgressCell = (task: TaskWithAssignmentDetails) => {
    // For "Biên tập" tasks, calculate progress from workflow
    if (task.group === 'Biên tập' && task.workflow) {
      try {
        const workflow = (typeof task.workflow === "string" ? JSON.parse(task.workflow) : task.workflow) as Workflow;
        const workflowProgress = BienTapWorkflowHelpers.calculateProgress(workflow);
        return (
          <td className="p-4 align-middle">
            <div className="flex items-center gap-2">
              <Progress value={workflowProgress} className="h-2 w-16" />
              <span className="text-xs text-muted-foreground w-8 text-right">{workflowProgress}%</span>
            </div>
          </td>
        );
      } catch (e) {
        console.error('Failed to parse workflow for progress', e);
      }
    }
    
    // Default: show regular progress
    return (
      <td className="p-4 align-middle">
        <div className="flex items-center gap-2">
          <Progress value={task.progress || 0} className="h-2 w-16" />
          <span className="text-xs text-muted-foreground w-8 text-right">{task.progress || 0}%</span>
        </div>
      </td>
    );
  };
  
  const getVoteLabel = (vote: string | null | undefined): string => {
    if (!vote) return "—";
    const v = vote.toLowerCase();
    if (language === "vi") {
      if (v === "tot") return "Hoàn thành tốt";
      if (v === "kha") return "Hoàn thành khá";
      if (v === "khong_tot") return "Không tốt";
      if (v === "khong_hoan_thanh") return "Không hoàn thành";
    } else {
      if (v === "tot") return "Good";
      if (v === "kha") return "Fair";
      if (v === "khong_tot") return "Poor";
      if (v === "khong_hoan_thanh") return "Not completed";
    }
    return vote;
  };

  // Default columns configuration
  const defaultColumns = {
    id: true,
    title: true,
    group: true,
    assignee: true,
    priority: true,
    status: true,
    dueDate: true,
    progress: true,
    receivedDate: false,
    actualCompletedAt: false,
    vote: false,
    ...columns,
  };

  const defaultGetPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const defaultGetStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Cancelled': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'Not Started': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const priorityColorFn = getPriorityColor || defaultGetPriorityColor;
  const statusColorFn = getStatusColor || defaultGetStatusColor;
  const hasActions = !!actions && (actions.onView || actions.onEdit || actions.onDelete);

  // Calculate left position for title column
  const titleColumnLeft = defaultColumns.id ? 80 : 0;
  
  return (
    <div className="relative w-full overflow-auto max-h-[calc(100vh-300px)]">
      <table className="w-full caption-bottom text-sm border-collapse">
        <thead className="[&_tr]:border-b sticky top-0 z-20">
          <tr className="border-b transition-colors hover:bg-muted/50 bg-muted/95 backdrop-blur-sm">
            {defaultColumns.id && (
              <SortableHead
                label="ID"
                column="id"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[80px] min-w-[80px] sticky left-0 z-30 bg-muted/95 backdrop-blur-sm border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
              />
            )}
            {defaultColumns.title && (
              <SortableHead
                label={t.task.title}
                column="title"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[25%] min-w-[200px] sticky z-30 bg-muted/95 backdrop-blur-sm border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                style={{ left: `${titleColumnLeft}px` }}
              />
            )}
            {defaultColumns.group && (
              <SortableHead
                label={t.task.group}
                column="group"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
              />
            )}
            {defaultColumns.assignee && (
              <SortableHead
                label={t.task.assignee}
                column="assignee"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[260px] min-w-[220px]"
              />
            )}
            {defaultColumns.priority && (
              <SortableHead
                label={t.task.priority}
                column="priority"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
              />
            )}
            {defaultColumns.status && (
              <SortableHead
                label={t.task.status}
                column="status"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
              />
            )}
            {defaultColumns.dueDate && (
              <SortableHead
                label={t.task.dueDate}
                column="dueDate"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
              />
            )}
            {defaultColumns.progress && (
              <SortableHead
                label={t.task.progress}
                column="progress"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[15%]"
              />
            )}
            {defaultColumns.receivedDate && (
              <SortableHead
                label={language === "vi" ? "Ngày nhận công việc" : "Received"}
                column="receivedDate"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap"
                title={language === "vi" ? "Ngày đầu tiên nhận công việc trong số các nhân sự" : "Earliest received date among assignees"}
              />
            )}
            {defaultColumns.actualCompletedAt && (
              <SortableHead
                label={language === "vi" ? "Ngày hoàn thành thực tế" : "Completed"}
                column="actualCompletedAt"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap"
              />
            )}
            {defaultColumns.vote && (
              <SortableHead
                label={language === "vi" ? "Đánh giá" : "Evaluation"}
                column="vote"
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
              />
            )}
            {defaultColumns.customColumns?.map((col) => (
              <th key={col.key} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {col.label}
              </th>
            ))}
            {hasActions && (
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]"></th>
            )}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {tasks.length === 0 ? (
            <tr className="border-b transition-colors">
              <td 
                colSpan={
                  Object.values(defaultColumns).filter(Boolean).length +
                  (defaultColumns.customColumns?.length || 0) +
                  (hasActions ? 1 : 0)
                } 
                className="p-4 align-middle h-32 text-center text-muted-foreground"
              >
                {t.dashboard.noTasksFound}
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr 
                key={task.id} 
                className="border-b transition-colors cursor-pointer hover:bg-muted/30"
                onClick={() => onTaskClick(task)}
              >
                {defaultColumns.id && (
                  <td className="p-4 align-middle font-mono text-xs text-muted-foreground sticky left-0 z-10 bg-card border-r border-border/50 min-w-[80px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                    {task.id}
                  </td>
                )}
                {defaultColumns.title && (
                  <td 
                    className="p-4 align-middle sticky z-10 bg-card border-r border-border/50 min-w-[200px] shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                    style={{ left: `${titleColumnLeft}px` }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">{task.title}</span>
                      {getBienTapRoundType(task) && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {t.task.roundTypeLabel}: {getBienTapRoundType(task)}
                        </span>
                      )}
                      {task.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {task.description}
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {defaultColumns.group && (
                  <td className="p-4 align-middle">
                    {task.group ? (
                      <Badge variant="secondary" className="font-normal text-xs">
                        {task.group}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">-</span>
                    )}
                  </td>
                )}
                {defaultColumns.assignee && renderAssigneeCell(task)}
                {defaultColumns.priority && (
                  <td className="p-4 align-middle">
                    <Badge variant="outline" className={`font-normal border-0 ${priorityColorFn(task.priority)}`}>
                      {task.priority === 'Low' ? t.priority.low :
                       task.priority === 'Medium' ? t.priority.medium :
                       task.priority === 'High' ? t.priority.high :
                       task.priority === 'Critical' ? t.priority.critical : task.priority}
                    </Badge>
                  </td>
                )}
                {defaultColumns.status && (
                  <td className="p-4 align-middle">
                    <Badge variant="outline" className={`font-normal border ${statusColorFn(task.status)}`}>
                      {task.status === 'Not Started' ? t.status.notStarted :
                       task.status === 'In Progress' ? t.status.inProgress :
                       task.status === 'Completed' ? t.status.completed :
                       task.status === 'Pending' ? t.status.pending : 
                       task.status === 'Cancelled' ? t.status.cancelled : task.status}
                    </Badge>
                  </td>
                )}
                {defaultColumns.dueDate && (
                  <td className="p-4 align-middle text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateDDMMYYYY(task.dueDate) || "-"}
                  </td>
                )}
                {defaultColumns.progress && renderProgressCell(task)}
                {defaultColumns.receivedDate && (
                  <td className="p-4 align-middle text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateDDMMYYYY((task as TaskWithAssignmentDetails & { receivedAt?: string | Date | null }).receivedAt) || "—"}
                  </td>
                )}
                {defaultColumns.actualCompletedAt && (
                  <td className="p-4 align-middle text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateDDMMYYYY(task.actualCompletedAt) || "—"}
                  </td>
                )}
                {defaultColumns.vote && (
                  <td className="p-4 align-middle text-sm">
                    {getVoteLabel((task as TaskWithAssignmentDetails & { vote?: string | null }).vote)}
                  </td>
                )}
                {defaultColumns.customColumns?.map((col) => (
                  <td key={col.key} className="p-4 align-middle">
                    {col.render(task)}
                  </td>
                ))}
                {hasActions && (
                  <td className="p-4 align-middle">
                    <div className="flex items-center gap-1">
                      {actions?.onView && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.onView?.(task);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {actions?.onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.onEdit?.(task);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {actions?.onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.onDelete?.(task);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
