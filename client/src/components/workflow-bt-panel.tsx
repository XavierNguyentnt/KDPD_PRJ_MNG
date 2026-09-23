import React from "react";
import { Workflow, Stage, BienTapStageType, StageStatus, BienTapWorkflowHelpers } from "@shared/workflow";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { WorkflowStepper } from "@/components/workflow-stepper";
import {
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  AlertCircle,
  User,
  Star,
  CalendarDays,
  CalendarX2,
  CalendarCheck2,
  CircleDot,
} from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/utils";

export interface WorkflowBTPanelProps {
  workflow: Workflow | null;
  vote?: string | null;
  roundType?: string;
  language?: "vi" | "en";
  className?: string;
}

type VoteValue = "tot" | "kha" | "khong_tot" | "khong_hoan_thanh";

const VI = {
  panelTitle: "Tổng quan quy trình",
  overallProgress: "Tiến độ tổng hợp",
  roleHeader: "Vai trò",
  assignee: "Người thực hiện",
  notAssigned: "Chưa giao",
  receiveDate: "Ngày nhận",
  dueDate: "Ngày hoàn thành dự kiến",
  completedDate: "Ngày hoàn thành thực tế",
  notSet: "Chưa có",
  cancelReason: "Lý do hủy",
  notes: "Ghi chú",
  voteTitle: "Đánh giá",
  perStageVote: "Đánh giá giai đoạn",
  rounds: "Các bông",
  currentRoundLabel: "Bông hiện tại",
  roleMap: {
    [BienTapStageType.BTV2]: { full: "Biên tập viên 2", short: "BTV 2" },
    [BienTapStageType.BTV1]: { full: "Biên tập viên 1", short: "BTV 1" },
    [BienTapStageType.DOC_DUYET]: { full: "Người đọc duyệt", short: "Đ. Duyệt" },
  } as Record<BienTapStageType, { full: string; short: string }>,
  voteMap: {
    tot: { label: "Hoàn thành tốt", cls: "bg-status-success/35 text-status-success-foreground border-status-success/70", icon: "★★★" },
    kha: { label: "Hoàn thành khá", cls: "bg-status-info/35 text-status-info-foreground border-status-info/70", icon: "★★" },
    khong_tot: { label: "Không tốt", cls: "bg-status-warning/35 text-status-warning-foreground border-status-warning/70", icon: "★" },
    khong_hoan_thanh: { label: "Không hoàn thành", cls: "bg-destructive/25 text-destructive border-destructive/60", icon: "✗" },
  } as Record<VoteValue, { label: string; cls: string; icon: string }>,
  emptyWF: "Chưa có quy trình",
};

const EN = {
  panelTitle: "Workflow Overview",
  overallProgress: "Overall progress",
  roleHeader: "Role",
  assignee: "Assignee",
  notAssigned: "Unassigned",
  receiveDate: "Receive date",
  dueDate: "Due date",
  completedDate: "Completed date",
  notSet: "Not set",
  cancelReason: "Cancel reason",
  notes: "Notes",
  voteTitle: "Evaluation",
  perStageVote: "Stage evaluation",
  rounds: "Rounds",
  currentRoundLabel: "Current round",
  roleMap: {
    [BienTapStageType.BTV2]: { full: "Editor 2", short: "BTV 2" },
    [BienTapStageType.BTV1]: { full: "Editor 1", short: "BTV 1" },
    [BienTapStageType.DOC_DUYET]: { full: "Proofreader", short: "Proof" },
  } as Record<BienTapStageType, { full: string; short: string }>,
  voteMap: {
    tot: { label: "Good", cls: "bg-status-success/35 text-status-success-foreground border-status-success/70", icon: "★★★" },
    kha: { label: "Fair", cls: "bg-status-info/35 text-status-info-foreground border-status-info/70", icon: "★★" },
    khong_tot: { label: "Poor", cls: "bg-status-warning/35 text-status-warning-foreground border-status-warning/70", icon: "★" },
    khong_hoan_thanh: { label: "Not completed", cls: "bg-destructive/25 text-destructive border-destructive/60", icon: "✗" },
  } as Record<VoteValue, { label: string; cls: string; icon: string }>,
  emptyWF: "No workflow available",
};

const STEP_ORDER: BienTapStageType[] = [
  BienTapStageType.BTV2,
  BienTapStageType.BTV1,
  BienTapStageType.DOC_DUYET,
];

function stageStatusClass(status: StageStatus | undefined): string {
  switch (status) {
    case StageStatus.COMPLETED:
      return "bg-status-success/40 border-status-success/80 text-status-success-foreground";
    case StageStatus.IN_PROGRESS:
      return "bg-status-info/38 border-status-info/80 text-status-info-foreground";
    case StageStatus.PENDING:
      return "bg-status-warning/38 border-status-warning/80 text-status-warning-foreground";
    case StageStatus.CANCELLED:
      return "bg-destructive/30 border-destructive/70 text-destructive";
    default:
      return "bg-muted/40 border-border/70 text-muted-foreground";
  }
}

function statusIcon(status: StageStatus | undefined, size = 16) {
  const s = { className: "h-4 w-4", width: size, height: size } as any;
  switch (status) {
    case StageStatus.COMPLETED:
      return <CheckCircle2 {...s} className={`${s.className} text-status-success-foreground`} />;
    case StageStatus.IN_PROGRESS:
      return <Clock {...s} className={`${s.className} text-status-info-foreground`} />;
    case StageStatus.PENDING:
      return <PauseCircle {...s} className={`${s.className} text-status-warning-foreground`} />;
    case StageStatus.CANCELLED:
      return <XCircle {...s} className={`${s.className} text-destructive`} />;
    default:
      return <AlertCircle {...s} className={`${s.className} text-muted-foreground`} />;
  }
}

function statusLabel(status: StageStatus | undefined, language: "vi" | "en") {
  const L = language === "vi" ? VI : EN;
  switch (status) {
    case StageStatus.COMPLETED:
      return language === "en" ? "Completed" : "Hoàn thành";
    case StageStatus.IN_PROGRESS:
      return language === "en" ? "In progress" : "Đang thực hiện";
    case StageStatus.PENDING:
      return language === "en" ? "Pending" : "Tạm dừng";
    case StageStatus.CANCELLED:
      return language === "en" ? "Cancelled" : "Đã hủy";
    default:
      return language === "en" ? "Not started" : "Chưa bắt đầu";
  }
}

function avatarName(name: string | null | undefined, L: typeof VI): string {
  if (!name || !name.trim()) return L.notAssigned;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function voteBadge(vote: string | undefined | null, L: typeof VI) {
  const v = (vote || "") as VoteValue;
  const def = L.voteMap[v];
  if (!def) return null;
  return (
    <Badge variant="outline" className={`gap-1 inline-flex items-center ${def.cls}`}>
      <Star className="h-3 w-3 fill-current" />
      <span className="font-medium">{def.icon}</span>
      <span className="ml-1 text-[11px] opacity-95">{def.label}</span>
    </Badge>
  );
}

export function WorkflowBTPanel({
  workflow,
  vote,
  roundType,
  language = "vi",
  className = "",
}: WorkflowBTPanelProps) {
  const L = language === "vi" ? { ...VI, language } : { ...EN, language };

  if (!workflow || !workflow.rounds || workflow.rounds.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground italic bg-muted/25 rounded-lg p-4 border border-border/50 ${className}`}>
        {L.emptyWF}
      </div>
    );
  }

  const currentRound = workflow.rounds.find((r) => r.roundNumber === workflow.currentRound) ?? workflow.rounds[0];
  const overallProgress = BienTapWorkflowHelpers.calculateProgress(workflow);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ============ HEADER: Round Pills + Type Badge + Overall Progress ============ */}
      <div className="flex flex-col gap-3 p-4 border rounded-xl bg-card/50 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{L.rounds}:</span>
            {workflow.rounds.map((r) => {
              const isCurrent = r.roundNumber === workflow.currentRound;
              return (
                <Badge
                  key={r.roundNumber}
                  variant="outline"
                  className={
                    isCurrent
                      ? "bg-status-info/38 border-status-info/80 text-status-info-foreground gap-1 font-semibold ring-1 ring-status-info/30"
                      : "bg-muted/30 border-border/60 text-muted-foreground"
                  }
                >
                  {isCurrent && <CircleDot className="h-3 w-3" />}
                  R{r.roundNumber}
                </Badge>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {roundType && (
              <Badge variant="secondary" className="gap-1.5 bg-status-info/15 border-status-info/40 text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-status-info/70" />
                {String(roundType)}
              </Badge>
            )}
            {voteBadge(vote, L)}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">{L.overallProgress}</span>
            <span className="font-semibold text-foreground">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2 rounded-full" />
        </div>
      </div>

      {/* ============ BODY: vertical stepper LEFT + 3 stage cards RIGHT ============ */}
      <div className="grid grid-cols-[auto,1fr] md:flex md:gap-6 gap-4 items-start">
        {/* Vertical stepper column */}
        <div className="pt-2 md:pt-4 md:px-2 md:shrink-0 md:min-w-[120px] sticky top-0 self-start z-[1]">
          <WorkflowStepper
            workflow={workflow}
            size="md"
            orientation="vertical"
            showLabels={false}
          />
        </div>

        {/* Stage cards column */}
        <div className="space-y-4 flex-1 min-w-0">
          {STEP_ORDER.map((stepType, i) => {
            const stage: Stage | undefined = currentRound.stages.find((s) => s.type === stepType);
            const status = stage?.status ?? StageStatus.NOT_STARTED;
            const role = L.roleMap[stepType];
            const isCompleted = status === StageStatus.COMPLETED;
            const isInProgress = status === StageStatus.IN_PROGRESS;

            return (
              <Card
                key={stepType}
                className={`border overflow-hidden transition-shadow ${
                  isInProgress
                    ? "border-status-info/50 shadow-[0_1px_0_0_rgba(14,165,233,0.1)_inset,0_0_0_1px_rgba(14,165,233,0.12)]"
                    : isCompleted
                      ? "border-status-success/45 shadow-[0_1px_0_0_rgba(34,197,94,0.08)_inset]"
                      : "border-border/60"
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Row 1: Role + Status badge + Vote if completed */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`inline-flex items-center justify-center rounded-full border h-7 w-7 ${stageStatusClass(
                          status,
                        )}`}
                      >
                        {statusIcon(status, 14)}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="font-semibold text-sm">{role.full}</span>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {role.short} · Step {i + 1}/3
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isCompleted && vote ? (
                        voteBadge(vote, L)
                      ) : null}
                      <Badge
                        variant="outline"
                        className={`gap-1.5 border ${stageStatusClass(status)}`}
                      >
                        {statusIcon(status, 12)}
                        <span className="text-[11px] font-medium">{statusLabel(status, language)}</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Row 2: Assignee avatar + name */}
                  <div className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2.5 border border-border/40">
                    {stage?.assignee ? (
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-status-info/40 to-status-info/20 border border-status-info/30 inline-flex items-center justify-center font-semibold text-sm text-foreground">
                        {avatarName(stage.assignee, L)}
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-muted/40 border border-border/60 inline-flex items-center justify-center text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 flex flex-col leading-tight">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {L.assignee}
                      </span>
                      <span className="font-medium truncate">
                        {stage?.assignee ? stage.assignee : <span className="text-muted-foreground italic">{L.notAssigned}</span>}
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Dates 3 columns (nhận / dự kiến / thực tế) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1 rounded-lg bg-muted/15 p-2.5 border border-border/35">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                        <CalendarDays className="h-3.5 w-3.5 opacity-70" />
                        {L.receiveDate}
                      </div>
                      <div className={`text-sm ${stage?.startDate ? "font-medium text-foreground" : "text-muted-foreground italic"}`}>
                        {formatDateDDMMYYYY(stage?.startDate) || L.notSet}
                      </div>
                    </div>
                    <div className="space-y-1 rounded-lg bg-muted/15 p-2.5 border border-border/35">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                        <CalendarX2 className="h-3.5 w-3.5 opacity-70" />
                        {L.dueDate}
                      </div>
                      <div className={`text-sm ${stage?.dueDate ? "font-medium text-foreground" : "text-muted-foreground italic"}`}>
                        {formatDateDDMMYYYY(stage?.dueDate) || L.notSet}
                      </div>
                    </div>
                    <div className="space-y-1 rounded-lg bg-muted/15 p-2.5 border border-border/35">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                        <CalendarCheck2 className="h-3.5 w-3.5 opacity-70" />
                        {L.completedDate}
                      </div>
                      <div className={`text-sm ${stage?.completedDate ? "font-semibold text-status-success-foreground" : "text-muted-foreground italic"}`}>
                        {formatDateDDMMYYYY(stage?.completedDate) || L.notSet}
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Progress per stage */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">{L.overallProgress} giai đoạn</span>
                      <span className="font-semibold text-foreground">{stage?.progress ?? 0}%</span>
                    </div>
                    <Progress value={stage?.progress ?? 0} className="h-1.5 rounded-full" />
                  </div>

                  {/* Row 5: Cancel reason (if any) */}
                  {stage?.cancelReason ? (
                    <div className="text-xs bg-status-warning/15 dark:bg-status-warning/10 border border-status-warning/40 text-status-warning-foreground p-2.5 rounded-lg">
                      <span className="font-semibold mr-1">{L.cancelReason}:</span>
                      {stage.cancelReason}
                    </div>
                  ) : null}

                  {/* Row 6: Notes (if any) */}
                  {stage?.notes ? (
                    <div className="text-xs text-muted-foreground italic bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="font-semibold mr-1 not-italic text-foreground/80">{L.notes}:</span>
                      {stage.notes}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WorkflowBTPanel;
