import { Workflow, Round, Stage, BienTapStageType, StageStatus, BienTapWorkflowHelpers } from "@shared/workflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, XCircle, AlertCircle, User, PauseCircle } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { formatDateDDMMYYYY } from "@/lib/utils";

interface WorkflowViewProps {
  workflow: Workflow | null;
  compact?: boolean;
}

export function WorkflowView({ workflow, compact = false }: WorkflowViewProps) {
  const { t, language } = useI18n();

  if (!workflow || !workflow.rounds || workflow.rounds.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {language === 'vi' ? 'Chưa có workflow' : 'No workflow'}
      </div>
    );
  }

  const getStageLabel = (type: BienTapStageType): string => {
    if (language === 'vi') {
      switch (type) {
        case BienTapStageType.BTV1:
          return 'BTV 1'; // Hiển thị "BTV 1" trong UI (đọc từ cột "Nhân sự 1" trong Google Sheets)
        case BienTapStageType.BTV2:
          return 'BTV 2'; // Hiển thị "BTV 2" trong UI (đọc từ cột "Nhân sự 2" trong Google Sheets)
        case BienTapStageType.DOC_DUYET:
          return 'Người kiểm soát/Phối hợp'; // Match với header "Người kiểm soát/Phối hợp" trong Google Sheets
        default:
          return type;
      }
    } else {
      switch (type) {
        case BienTapStageType.BTV1:
          return 'Editor 1';
        case BienTapStageType.BTV2:
          return 'Editor 2';
        case BienTapStageType.DOC_DUYET:
          return 'Controller/Coordinator';
        default:
          return type;
      }
    }
  };

  const getStatusIcon = (status: StageStatus) => {
    switch (status) {
      case StageStatus.COMPLETED:
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case StageStatus.IN_PROGRESS:
        return <Clock className="w-4 h-4 text-blue-600" />;
      case StageStatus.PENDING:
        return <PauseCircle className="w-4 h-4 text-yellow-600" />;
      case StageStatus.CANCELLED:
        return <XCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: StageStatus): string => {
    switch (status) {
      case StageStatus.COMPLETED:
        return 'bg-green-100 text-green-700 border-green-300';
      case StageStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case StageStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case StageStatus.CANCELLED:
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: StageStatus): string => {
    switch (status) {
      case StageStatus.COMPLETED:
        return language === 'vi' ? 'Hoàn thành' : 'Completed';
      case StageStatus.IN_PROGRESS:
        return language === 'vi' ? 'Đang tiến hành' : 'In Progress';
      case StageStatus.PENDING:
        return language === 'vi' ? 'Tạm dừng' : 'Pending';
      case StageStatus.CANCELLED:
        return language === 'vi' ? 'Đã hủy' : 'Cancelled';
      default:
        return language === 'vi' ? 'Chưa bắt đầu' : 'Not Started';
    }
  };

  if (compact) {
    // Compact view: Show only current round summary
    const currentRound = workflow.rounds.find(r => r.roundNumber === workflow.currentRound) || workflow.rounds[0];
    const overallProgress = BienTapWorkflowHelpers.calculateProgress(workflow);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {currentRound.roundType 
              ? currentRound.roundType 
              : (language === 'vi' ? `Đọc bông ${workflow.currentRound}/${workflow.totalRounds}` : `Round ${workflow.currentRound}/${workflow.totalRounds}`)}
          </span>
          <span className="text-muted-foreground">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
        <div className="flex gap-2 flex-wrap">
          {currentRound.stages.map((stage, idx) => (
            <Badge 
              key={idx} 
              variant="outline" 
              className={`text-xs ${getStatusColor(stage.status)}`}
            >
              {getStageLabel(stage.type)}: {stage.assignee || (language === 'vi' ? 'Chưa giao' : 'Unassigned')}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  // Full view: Show all rounds
  return (
    <div className="space-y-4">
      {workflow.rounds.map((round, roundIdx) => (
        <Card key={roundIdx} className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {round.roundType || (language === 'vi' ? `Đọc bông ${round.roundNumber}` : `Round ${round.roundNumber}`)}
              </CardTitle>
              <Badge variant="outline" className={getStatusColor(round.status)}>
                {getStatusIcon(round.status)}
                <span className="ml-1">{getStatusLabel(round.status)}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {round.stages.map((stage, stageIdx) => (
              <div key={stageIdx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(stage.status)}
                    <span className="font-medium text-sm">{getStageLabel(stage.type)}</span>
                  </div>
                  <Badge variant="outline" className={getStatusColor(stage.status)}>
                    {getStatusLabel(stage.status)}
                  </Badge>
                </div>
                
                <div className="pl-6 space-y-2">
                  {stage.assignee ? (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{stage.assignee}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      {language === 'vi' ? 'Chưa giao' : 'Unassigned'}
                    </div>
                  )}
                  
                  {/* Ngày nhận, Ngày hoàn thành dự kiến, Ngày hoàn thành thực tế (dd/mm/yyyy) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground font-medium mb-0.5">
                        {language === 'vi' ? 'Ngày nhận công việc' : 'Receive Date'}:
                      </span>
                      <span className={stage.startDate ? 'text-foreground' : 'text-muted-foreground italic'}>
                        {formatDateDDMMYYYY(stage.startDate) || (language === 'vi' ? 'Chưa có' : 'Not set')}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground font-medium mb-0.5">
                        {t.task.dueDate}:
                      </span>
                      <span className={stage.dueDate ? 'text-foreground' : 'text-muted-foreground italic'}>
                        {formatDateDDMMYYYY(stage.dueDate) || (language === 'vi' ? 'Chưa có' : 'Not set')}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground font-medium mb-0.5">
                        {t.task.actualCompletedAt}:
                      </span>
                      <span className={stage.completedDate ? 'text-foreground' : 'text-muted-foreground italic'}>
                        {formatDateDDMMYYYY(stage.completedDate) || (language === 'vi' ? 'Chưa có' : 'Not set')}
                      </span>
                    </div>
                  </div>
                  {stage.cancelReason && (
                    <div className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-2 rounded border border-amber-200 dark:border-amber-800">
                      <span className="font-medium">{t.task.cancelReason}: </span>
                      {stage.cancelReason}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Progress value={stage.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground w-10 text-right">{stage.progress}%</span>
                  </div>
                  
                  {stage.notes && (
                    <div className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                      <span className="font-medium">{language === 'vi' ? 'Ghi chú' : 'Notes'}: </span>
                      {stage.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
