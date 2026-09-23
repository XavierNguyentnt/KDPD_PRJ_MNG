import * as React from "react";
import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workflow, Stage } from "@shared/workflow";
import { StageStatus, BienTapStageType } from "@shared/workflow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/hooks/use-i18n";

export type WorkflowStepperSize = "sm" | "md" | "lg";
export type WorkflowStepperOrientation = "horizontal" | "vertical";

const STEP_ORDER: BienTapStageType[] = [
  BienTapStageType.BTV2,
  BienTapStageType.BTV1,
  BienTapStageType.DOC_DUYET,
];

function stageLabel(type: BienTapStageType, language: "vi" | "en"): string {
  if (language === "vi") {
    switch (type) {
      case BienTapStageType.BTV1:
        return "BTV 1";
      case BienTapStageType.BTV2:
        return "BTV 2";
      case BienTapStageType.DOC_DUYET:
        return "Đọc duyệt";
      default:
        return String(type);
    }
  }
  switch (type) {
    case BienTapStageType.BTV1:
      return "E1";
    case BienTapStageType.BTV2:
      return "E2";
    case BienTapStageType.DOC_DUYET:
      return "Reviewer";
    default:
      return String(type);
  }
}

function stageTooltip(stage: Stage | undefined, language: "vi" | "en"): string {
  if (!stage) return language === "vi" ? "Chưa có dữ liệu" : "No data";
  const lines: string[] = [];
  lines.push(stageLabel(stage.type, language));
  const assignee = stage.assignee;
  if (assignee) {
    lines.push(
      (language === "vi" ? "Người thực hiện: " : "Assignee: ") +
        (typeof assignee === "string" ? assignee.split(" ")
            .map((p, i, arr) =>
              i === 0 || i === arr.length - 1 ? p : (p.length ? p[0] + "." : ""),
            )
            .filter(Boolean)
            .join(" ") : String(assignee)),
    );
  }
  switch (stage.status) {
    case StageStatus.COMPLETED:
      lines.push(language === "vi" ? "Hoàn thành ✓" : "Completed ✓");
      if (stage.completedDate)
        lines.push(
          (language === "vi" ? "Ngày xong: " : "Done: ") +
            stage.completedDate.slice(0, 10),
        );
      break;
    case StageStatus.IN_PROGRESS:
      lines.push(language === "vi" ? "Đang thực hiện" : "In progress");
      if (stage.progress)
        lines.push(
          (language === "vi" ? "Tiến độ: " : "Progress: ") +
            Math.round(Number(stage.progress)) +
            "%",
        );
      break;
    case StageStatus.PENDING:
      lines.push(language === "vi" ? "Tạm dừng" : "Pending");
      break;
    default:
      lines.push(language === "vi" ? "Chưa bắt đầu" : "Not started");
  }
  return lines.join("\n");
}

function stageStatusClass(status: StageStatus | undefined): string {
  switch (status) {
    case StageStatus.COMPLETED:
      return "bg-status-success/40 border-status-success/80 text-status-success-foreground";
    case StageStatus.IN_PROGRESS:
      return "bg-status-info/38 border-status-info/80 text-status-info-foreground";
    case StageStatus.PENDING:
      return "bg-status-warning/38 border-status-warning/80 text-status-warning-foreground";
    default:
      return "bg-muted/40 border-border/70 text-muted-foreground";
  }
}

function connectorClass(a: StageStatus | undefined, _b: StageStatus | undefined): string {
  if (a === StageStatus.COMPLETED) return "bg-status-success/60";
  if (a === StageStatus.IN_PROGRESS || a === StageStatus.PENDING) return "bg-status-info/40";
  return "bg-border/60";
}

export interface WorkflowStepperProps {
  workflow: Workflow | string | null | undefined;
  size?: WorkflowStepperSize;
  orientation?: WorkflowStepperOrientation;
  className?: string;
  /** Show labels under each step node. Default true on md, false on sm. */
  showLabels?: boolean;
  /** Collapse to single-line pill showing current step + count. Default false. */
  compact?: boolean;
}

function parseWorkflow(raw: WorkflowStepperProps["workflow"]): Workflow | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Workflow;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && Array.isArray((raw as Workflow).rounds)) return raw as Workflow;
  return null;
}

export function WorkflowStepper({
  workflow,
  size = "sm",
  orientation = "horizontal",
  className,
  showLabels,
  compact = false,
}: WorkflowStepperProps) {
  const { language } = useI18n();
  const lang = language === "vi" ? "vi" : "en";
  const wf = parseWorkflow(workflow);

  const currentRound = React.useMemo(() => {
    if (!wf) return null;
    return wf.rounds.find((r) => r.roundNumber === wf.currentRound) ?? wf.rounds[0] ?? null;
  }, [wf]);

  const stagesByType = React.useMemo(() => {
    const map = new Map<BienTapStageType, Stage>();
    if (currentRound) {
      for (const s of currentRound.stages) {
        if (!map.has(s.type)) map.set(s.type, s);
      }
    }
    return map;
  }, [currentRound]);

  const stepSizeCls =
    size === "lg" ? "h-9 w-9 min-w-[36px]" : size === "md" ? "h-7 w-7 min-w-[28px]" : "h-5 w-5 min-w-[20px]";
  const iconSizeCls = size === "lg" ? "h-4 w-4" : size === "md" ? "h-3.5 w-3.5" : "h-2.5 w-2.5";
  const textCls = size === "lg" ? "text-[11px]" : size === "md" ? "text-[10px]" : "text-[10px] tracking-tight";
  const showText = showLabels ?? size !== "sm";

  if (compact || !wf || !currentRound) {
    const completed = currentRound?.stages.filter((s) => s.status === StageStatus.COMPLETED).length ?? 0;
    const total = currentRound?.stages.length ?? 3;
    const curStage = currentRound?.stages.find((s) => s.status === StageStatus.IN_PROGRESS) ??
      currentRound?.stages.find((s) => s.status !== StageStatus.COMPLETED) ??
      null;
    const tone =
      completed === total && total > 0
        ? "bg-status-success/40 border-status-success/80 text-status-success-foreground"
        : curStage?.status === StageStatus.IN_PROGRESS
          ? "bg-status-info/38 border-status-info/80 text-status-info-foreground"
          : "bg-muted/45 border-border/80 text-muted-foreground";
    return (
      <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", tone, className)}>
        <span>{completed}/{total}</span>
        <span className="opacity-70">
          {curStage ? stageLabel(curStage.type, lang) : !wf ? (lang === "vi" ? "Chưa có quy trình" : "No workflow") : lang === "vi" ? "Hoàn tất" : "Done"}
        </span>
      </div>
    );
  }

  const nodes = STEP_ORDER.map((type) => stagesByType.get(type));
  const stagesCount = nodes.filter(Boolean).length;
  if (stagesCount === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground", className)}>
        {lang === "vi" ? "Không có quy trình" : "No workflow"}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={80}>
      <div
        data-workflow-stepper="true"
        role="group"
        aria-label={lang === "vi" ? "Trạng thái quy trình biên tập 3 bước" : "3-step editing workflow status"}
        className={cn(
          "inline-flex w-full items-center gap-1",
          orientation === "vertical" && "flex-col items-start gap-2",
          className,
        )}
      >
        {nodes.map((stage, i) => {
          const isLast = i === nodes.length - 1;
          const status = stage?.status;
          const nodeCls = stageStatusClass(status);
          return (
            <React.Fragment key={`node-${i}-${stage?.type ?? "x"}`}>
              <div className={cn("flex items-center gap-2", orientation === "vertical" && "gap-2")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-full border transition-all",
                        stepSizeCls,
                        nodeCls,
                        status === StageStatus.IN_PROGRESS &&
                          "ring-2 ring-status-info/30 ring-offset-0 animate-pulse",
                      )}
                      aria-label={stageTooltip(stage, lang)}
                    >
                      {status === StageStatus.COMPLETED ? (
                        <Check className={cn(iconSizeCls, "-translate-x-[0.5px] -translate-y-[0.5px]")} strokeWidth={3} />
                      ) : status === StageStatus.IN_PROGRESS ? (
                        <Loader2 className={cn(iconSizeCls, "animate-spin opacity-90")} strokeWidth={2.2} />
                      ) : status === StageStatus.PENDING ? (
                        <Circle className={iconSizeCls} strokeWidth={2} />
                      ) : (
                        <span className={cn("font-semibold leading-none", textCls)}>{i + 1}</span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6} className="whitespace-pre-line text-[11px] leading-snug max-w-[220px]">
                    {stageTooltip(stage, lang)}
                  </TooltipContent>
                </Tooltip>

                {showText && (
                  <span
                    className={cn(
                      "whitespace-nowrap font-medium leading-tight",
                      textCls,
                      status === StageStatus.COMPLETED && "text-status-success/90",
                      status === StageStatus.IN_PROGRESS && "text-status-info",
                      status === StageStatus.PENDING && "text-status-warning",
                      (!status || status === StageStatus.NOT_STARTED) && "text-muted-foreground/80",
                    )}
                  >
                    {stageLabel(STEP_ORDER[i], lang)}
                  </span>
                )}
              </div>

              {!isLast && (
                <div
                  aria-hidden
                  className={cn(
                    "h-[2px] min-w-[14px] flex-1 rounded-full",
                    orientation === "vertical" && "h-3 min-h-[12px] w-[2px] flex-none",
                    connectorClass(status, nodes[i + 1]?.status),
                  )}
                  style={
                    orientation === "vertical"
                      ? { marginLeft: size === "lg" ? "18px" : size === "md" ? "14px" : "10px" }
                      : undefined
                  }
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

export default WorkflowStepper;
