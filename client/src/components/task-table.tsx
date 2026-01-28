import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Task } from "@shared/schema";
import { useI18n } from "@/hooks/use-i18n";
import { Workflow, BienTapWorkflowHelpers, BienTapStageType, StageStatus } from "@shared/workflow";

interface TaskTableProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  columns?: {
    id?: boolean;
    title?: boolean;
    group?: boolean;
    assignee?: boolean;
    priority?: boolean;
    status?: boolean;
    dueDate?: boolean;
    progress?: boolean;
    customColumns?: Array<{
      key: string;
      label: string;
      render: (task: Task) => React.ReactNode;
    }>;
  };
  getPriorityColor?: (priority: string) => string;
  getStatusColor?: (status: string) => string;
}

export function TaskTable({ 
  tasks, 
  onTaskClick, 
  columns = {},
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
  
  // Helper function to get status color for stage
  const getStageStatusColor = (status: StageStatus): string => {
    switch (status) {
      case StageStatus.COMPLETED:
        return 'text-green-600 bg-green-50 border-green-200'; // Đã hoàn thành: màu xanh lá
      case StageStatus.IN_PROGRESS:
        return 'text-blue-600 bg-blue-50 border-blue-200'; // Đang tiến hành: màu xanh dương
      case StageStatus.BLOCKED:
        return 'text-red-600 bg-red-50 border-red-200'; // Chậm tiến độ: màu đỏ
      case StageStatus.NOT_STARTED:
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'; // Chưa tiến hành: màu xám
    }
  };

  // Helper function to render assignee cell
  const renderAssigneeCell = (task: Task) => {
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
            <td className="p-4 align-middle">
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
    
    // Default: show regular assignee
    return (
      <td className="p-4 align-middle">
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
  const renderProgressCell = (task: Task) => {
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
      case 'Blocked': return 'bg-red-100 text-red-700 border-red-300';
      case 'Not Started': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const priorityColorFn = getPriorityColor || defaultGetPriorityColor;
  const statusColorFn = getStatusColor || defaultGetStatusColor;

  // Calculate left position for title column
  const titleColumnLeft = defaultColumns.id ? 80 : 0;
  
  return (
    <div className="relative w-full overflow-auto max-h-[calc(100vh-300px)]">
      <table className="w-full caption-bottom text-sm border-collapse">
        <thead className="[&_tr]:border-b sticky top-0 z-20">
          <tr className="border-b transition-colors hover:bg-muted/50 bg-muted/95 backdrop-blur-sm">
            {defaultColumns.id && (
              <th 
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[80px] min-w-[80px] sticky left-0 z-30 bg-muted/95 backdrop-blur-sm border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
              >
                ID
              </th>
            )}
            {defaultColumns.title && (
              <th 
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[25%] min-w-[200px] sticky z-30 bg-muted/95 backdrop-blur-sm border-r border-border/50 shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                style={{ left: `${titleColumnLeft}px` }}
              >
                {t.task.title}
              </th>
            )}
            {defaultColumns.group && (
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {t.task.group}
              </th>
            )}
            {defaultColumns.assignee && (
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {t.task.assignee}
              </th>
            )}
            {defaultColumns.priority && (
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {t.task.priority}
              </th>
            )}
            {defaultColumns.status && (
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {t.task.status}
              </th>
            )}
            {defaultColumns.dueDate && (
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {t.task.dueDate}
              </th>
            )}
            {defaultColumns.progress && (
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[15%]">
                {t.task.progress}
              </th>
            )}
            {defaultColumns.customColumns?.map((col) => (
              <th key={col.key} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {tasks.length === 0 ? (
            <tr className="border-b transition-colors">
              <td 
                colSpan={
                  Object.values(defaultColumns).filter(Boolean).length + 
                  (defaultColumns.customColumns?.length || 0)
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
                       task.status === 'Blocked' ? t.status.blocked : task.status}
                    </Badge>
                  </td>
                )}
                {defaultColumns.dueDate && (
                  <td className="p-4 align-middle text-sm text-muted-foreground whitespace-nowrap">
                    {task.dueDate || "-"}
                  </td>
                )}
                {defaultColumns.progress && renderProgressCell(task)}
                {defaultColumns.customColumns?.map((col) => (
                  <td key={col.key} className="p-4 align-middle">
                    {col.render(task)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
