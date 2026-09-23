import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

export interface MemberHeatmap12mProps {
  /** Monthly completed counts — length 12 (0 = Jan / 1 = Feb …). Falls back to zeros. */
  monthlyCompletions?: number[];
  accentHslVar?: string;
  className?: string;
  showLegend?: boolean;
}

const MONTHS_SHORT_VI = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

function heatToneClass(ratio: number, accentHslVar: string): string {
  if (ratio <= 0) return "bg-muted/40";
  if (ratio < 0.18) return "bg-[hsl(var(--accent)/0.08)]";
  if (ratio < 0.36) return "bg-[hsl(var(--accent)/0.2)]";
  if (ratio < 0.6) return "bg-[hsl(var(--accent)/0.42)]";
  if (ratio < 0.85) return "bg-[hsl(var(--accent)/0.68)]";
  return "bg-[hsl(var(--accent)/0.95)]";
}

function MemberHeatmap12mImpl(props: MemberHeatmap12mProps) {
  const {
    monthlyCompletions,
    className,
    showLegend = true,
  } = props;

  const { values, scaleMax } = useMemo(() => {
    const raw = Array.isArray(monthlyCompletions) ? monthlyCompletions : new Array(12).fill(0);
    const values: number[] = [];
    for (let i = 0; i < 12; i++) {
      const v = typeof raw[i] === "number" && Number.isFinite(raw[i]) ? Math.max(0, raw[i]) : 0;
      values.push(v);
    }
    const scaleMax = Math.max(1, ...values);
    return { values, scaleMax };
  }, [monthlyCompletions]);

  return (
    <div
      aria-label="Hoạt động 12 tháng gần nhất"
      className={cn("w-full space-y-2", className)}>
      <div className="grid grid-cols-12 gap-1.5">
        {MONTHS_SHORT_VI.map((label, i) => {
          const val = values[i] ?? 0;
          const ratio = val / scaleMax;
          const cls = heatToneClass(ratio, "primary");
          return (
            <div key={label} className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={cn(
                  "aspect-square w-full rounded-[5px] transition-all duration-300",
                  cls,
                )}
                title={`${label}: ${val} công việc hoàn thành`}
              />
              <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/75 truncate w-full text-center">
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {showLegend ? (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/75 pt-0.5">
          <span className="font-medium uppercase tracking-wide">Hoạt động</span>
          <div className="flex items-center gap-1.5">
            <span className="tabular-nums">Ít</span>
            <div className="flex items-center gap-[3px]">
              {[0, 0.2, 0.4, 0.6, 0.9].map((r, i) => (
                <span
                  key={i}
                  className={cn(
                    "block h-2.5 w-2.5 rounded-[3px]",
                    heatToneClass(r, "primary"),
                  )}
                />
              ))}
            </div>
            <span className="tabular-nums">Nhiều</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const MemberHeatmap12m = memo(MemberHeatmap12mImpl);
export default MemberHeatmap12m;
