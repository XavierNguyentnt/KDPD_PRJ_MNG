import { memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type Pipeline8Step =
  | "signed_contract"
  | "progress_check"
  | "expert_review"
  | "project_acceptance"
  | "settlement"
  | "proofreading_completed"
  | "editing_completed"
  | "design_completed";

export const PIPELINE_8_STEPS: {
  key: Pipeline8Step;
  label: string;
  short: string;
}[] = [
  { key: "signed_contract", label: "Ký hợp đồng", short: "HĐ" },
  { key: "progress_check", label: "Kiểm tra tiến độ", short: "KT" },
  { key: "expert_review", label: "Thẩm định chuyên gia", short: "TG" },
  { key: "project_acceptance", label: "Nghiệm thu dự án", short: "NT" },
  { key: "settlement", label: "Quyết toán", short: "QT" },
  {
    key: "proofreading_completed",
    label: "Hiệu đính hoàn thành",
    short: "HĐx",
  },
  { key: "editing_completed", label: "Biên tập hoàn thành", short: "BTx" },
  { key: "design_completed", label: "Thiết kế hoàn thành", short: "TKx" },
];

export type Pipeline8StepState = "completed" | "in_progress" | "pending" | "not_started";

const nodeClassByState: Record<Pipeline8StepState, string> = {
  completed:
    "bg-status-success/40 border-status-success/80 text-slate-900 font-semibold",
  in_progress:
    "bg-status-info/38 border-status-info/80 text-slate-900 font-semibold ring-2 ring-status-info/30",
  pending:
    "bg-status-warning/38 border-status-warning/80 text-slate-900 font-medium",
  not_started:
    "bg-status-muted/40 border-status-muted/60 text-muted-foreground/80 font-normal",
};

const connectorClassByState: Record<Pipeline8StepState, string> = {
  completed: "bg-status-success/40",
  in_progress: "bg-status-info/38",
  pending: "bg-status-warning/38",
  not_started: "bg-status-muted/40",
};

export interface Pipeline8StepperProps {
  size?: "sm" | "md";
  showLabels?: boolean;
  stageNumber: number | null;
  tcSigned: boolean;
  hasProgressCheck: boolean;
  hasExpertReview: boolean;
  hasProjectAcceptance: boolean;
  hasSettlement: boolean;
  proofreadingCompleted: boolean;
  editingCompleted: boolean;
  designCompleted: boolean;
  orientation?: "horizontal" | "compact";
  className?: string;
}

function computeStates(props: {
  stageNumber: number | null;
  tcSigned: boolean;
  hasProgressCheck: boolean;
  hasExpertReview: boolean;
  hasProjectAcceptance: boolean;
  hasSettlement: boolean;
  proofreadingCompleted: boolean;
  editingCompleted: boolean;
  designCompleted: boolean;
}): Pipeline8StepState[] {
  const completed: boolean[] = [
    props.tcSigned,
    props.hasProgressCheck,
    props.hasExpertReview,
    props.hasProjectAcceptance,
    props.hasSettlement,
    props.proofreadingCompleted,
    props.editingCompleted,
    props.designCompleted,
  ];

  const states: Pipeline8StepState[] = [];
  let inProgressAssigned = false;

  for (let i = 0; i < 8; i++) {
    if (completed[i]) {
      states.push("completed");
    } else if (!inProgressAssigned) {
      const sn = props.stageNumber ?? 0;
      if (i + 1 <= sn) {
        states.push("in_progress");
      } else {
        const anyBefore = i > 0 ? states[i - 1] === "completed" || states[i - 1] === "in_progress" : sn > 0;
        states.push(anyBefore ? "pending" : "not_started");
      }
      inProgressAssigned = true;
    } else {
      states.push("not_started");
    }
  }

  return states;
}

export const Pipeline8Stepper = memo(function Pipeline8Stepper(
  props: Pipeline8StepperProps,
) {
  const {
    size = "sm",
    showLabels = false,
    orientation = "horizontal",
    className = "",
  } = props;

  const states = computeStates(props);
  const nodeSize = size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs";
  const connectorSize = size === "sm" ? "h-1 flex-1" : "h-1.5 flex-1";

  if (orientation === "compact") {
    return (
      <TooltipProvider delayDuration={100} skipDelayDuration={100}>
        <div className={`flex items-center gap-0 ${className}`} title="">
          {PIPELINE_8_STEPS.map((step, idx) => {
            const state = states[idx];
            const prevState = idx > 0 ? states[idx - 1] : null;
            const connectorState =
              idx === 0
                ? state
                : prevState === "completed" && state === "completed"
                  ? "completed"
                  : prevState === "completed" || prevState === "in_progress"
                    ? state === "not_started"
                      ? "pending"
                      : state
                    : "not_started";
            return (
              <div key={step.key} className="flex items-center shrink-0">
                {idx > 0 && (
                  <div
                    className={`${connectorSize} ${connectorClassByState[connectorState]} mx-0.5 rounded-full w-5 min-w-[20px]`}
                    aria-hidden="true"
                  />
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`inline-flex items-center justify-center rounded-full border-2 ${nodeSize} ${nodeClassByState[state]}`}
                      aria-label={step.label}>
                      {idx + 1}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <div className="font-medium">{step.label}</div>
                    <div className="text-muted-foreground capitalize">
                      {state === "completed"
                        ? "Đã hoàn thành"
                        : state === "in_progress"
                          ? "Đang thực hiện"
                          : state === "pending"
                            ? "Sắp tới"
                            : "Chưa bắt đầu"}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={100} skipDelayDuration={100}>
      <div className={`flex flex-col gap-1.5 w-full ${className}`}>
        <div className="flex items-center w-full min-w-[260px]">
          {PIPELINE_8_STEPS.map((step, idx) => {
            const state = states[idx];
            const prevState = idx > 0 ? states[idx - 1] : null;
            const connectorState: Pipeline8StepState =
              idx === 0
                ? state
                : prevState === "completed" && state === "completed"
                  ? "completed"
                  : prevState === "completed" || prevState === "in_progress"
                    ? state === "not_started"
                      ? "pending"
                      : state
                    : "not_started";
            return (
              <div key={step.key} className="flex items-center flex-1 min-w-0 last:flex-none">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`inline-flex items-center justify-center rounded-full border-2 shrink-0 ${nodeSize} ${nodeClassByState[state]}`}
                      aria-label={step.label}>
                      {idx + 1}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[180px]">
                    <div className="font-medium">{step.label}</div>
                    <div className="text-muted-foreground capitalize">
                      {state === "completed"
                        ? "Đã hoàn thành"
                        : state === "in_progress"
                          ? "Đang thực hiện"
                          : state === "pending"
                            ? "Sắp tới"
                            : "Chưa bắt đầu"}
                    </div>
                  </TooltipContent>
                </Tooltip>
                {idx < PIPELINE_8_STEPS.length - 1 && (
                  <div
                    className={`${connectorSize} ${connectorClassByState[connectorState]} mx-1 rounded-full min-w-[12px]`}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
        {showLabels && (
          <div className="flex items-start w-full min-w-[260px]">
            {PIPELINE_8_STEPS.map((step, idx) => (
              <div
                key={step.key}
                className={`flex-1 min-w-0 ${idx === 0 ? "text-left" : idx === PIPELINE_8_STEPS.length - 1 ? "text-right pl-1" : "text-center px-1"}`}>
                <span
                  className={`text-[10px] leading-tight inline-block ${states[idx] === "not_started" ? "text-muted-foreground/70" : "text-muted-foreground"}`}
                  title={step.label}>
                  {step.short}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});

export interface WorkPipelineContext {
  tcByWorkId: Map<string, TranslationContract[]>;
  pcByWorkId: Map<string, ProofreadingContract[]>;
  editingCompletionByWorkId: Map<string, string>;
  thietKeTasksByWorkId: Map<string, { status: string }[]>;
}

import type { Work, TranslationContract, ProofreadingContract } from "@shared/schema";

export function getPipelineStepperPropsForWork(
  work: Work,
  ctx: WorkPipelineContext,
): Omit<
  Pipeline8StepperProps,
  "size" | "showLabels" | "orientation" | "className"
> {
  const tcList = ctx.tcByWorkId.get(work.id) ?? [];
  const pcList = ctx.pcByWorkId.get(work.id) ?? [];
  const stageNum = (() => {
    const s = work.stage;
    if (s == null || s === "") return null;
    const n = Number(String(s).replace(/\D/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  return {
    stageNumber: stageNum,
    tcSigned: tcList.length > 0,
    hasProgressCheck: tcList.some((c) => !!c.progressCheckDate),
    hasExpertReview: tcList.some((c) => !!c.expertReviewDate),
    hasProjectAcceptance: tcList.some((c) => !!c.projectAcceptanceDate),
    hasSettlement: tcList.some((c) => c.settlementValue != null),
    proofreadingCompleted:
      pcList.length > 0 && pcList.every((p) => !!p.actualCompletionDate),
    editingCompleted: !!ctx.editingCompletionByWorkId.get(work.id),
    designCompleted: (() => {
      const tkList = ctx.thietKeTasksByWorkId.get(work.id) ?? [];
      return tkList.length > 0 && tkList.every((t) => t.status === "Completed");
    })(),
  };
}
