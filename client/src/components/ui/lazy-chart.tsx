import type { ReactNode } from "react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

/**
 * Lazy-render wrapper for charts.
 * - Uses IntersectionObserver (180px bottom look-ahead) to detect before viewport.
 * - Before visible: shows a shimmer skeleton (7 bars + 2 line placeholders).
 * - First time visible: renders {children} permanently (no unmount on scroll-out).
 *
 * Usage:
 *   <LazyChart height={260}>
 *     <ResponsiveContainer width="100%" height="100%">...chart...</ResponsiveContainer>
 *   </LazyChart>
 */
export function LazyChart({
  height = 260,
  className,
  children,
  variant = "bar", // bar, pie, line
}: {
  height?: number | string;
  className?: string;
  children: ReactNode;
  variant?: "bar" | "pie" | "line";
}) {
  const { ref, inView } = useInView({ fireOnce: true });
  const style = typeof height === "number" ? { height: `${height}px` } : { height };
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={style}
      className={cn("relative w-full overflow-hidden", className)}
    >
      {inView ? children : <ChartSkeleton variant={variant} />}
    </div>
  );
}

export function ChartSkeleton({ variant = "bar" }: { variant?: "bar" | "pie" | "line" }) {
  return (
    <div className="absolute inset-0 p-3 sm:p-4 select-none pointer-events-none">
      {/* Top legend shimmer row */}
      <div className="flex items-center gap-2 mb-3 opacity-70">
        <div className="h-3 w-24 rounded shimmer bg-muted/60" />
        <div className="h-3 w-20 rounded shimmer bg-muted/45" />
        <div className="h-3 w-28 rounded shimmer bg-muted/35 ml-auto hidden sm:block" />
      </div>

      {variant === "pie" ? (
        <div className="flex items-center justify-center w-full" style={{ height: "calc(100% - 32px)" }}>
          <div
            className="relative rounded-full shimmer bg-muted/50"
            style={{ width: "clamp(120px,62%,220px)", aspectRatio: "1 / 1" }}
          >
            <div
              className="absolute inset-[18%] rounded-full shimmer bg-muted/25 border border-border/40"
            />
          </div>
        </div>
      ) : variant === "line" ? (
        <div className="relative w-full h-full pb-1">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between opacity-40 py-6 px-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-px w-full bg-border/50" />
            ))}
          </div>
          {/* Two sine-ish path placeholders via box-shadow dots */}
          <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="w-full h-full absolute inset-0 opacity-60">
            <path
              d="M0,110 C50,80 90,100 140,75 C200,45 240,90 300,60 C350,40 380,70 400,50"
              fill="none" stroke="currentColor" strokeWidth="5"
              className="shimmer text-muted/60 stroke-dashed"
              strokeLinecap="round"
            />
            <path
              d="M0,130 C60,115 110,128 170,105 C220,85 280,110 340,95 C370,86 390,104 400,92"
              fill="none" stroke="currentColor" strokeWidth="4"
              className="shimmer text-muted/45 stroke-dashed"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : (
        /* Bar variant default: 7 bars */
        <div className="relative w-full h-full pb-6 pt-2">
          {/* Y axis ticks */}
          <div className="absolute inset-0 flex flex-col justify-between opacity-40 pr-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-px w-full bg-border/50" />
            ))}
          </div>
          <div className="flex items-end gap-2 sm:gap-3 h-full px-2 relative">
            {[
              [38, 46],
              [72, 78],
              [54, 66],
              [22, 34],
              [86, 92],
              [48, 58],
              [62, 72],
            ].map(([hShort, hTall], i) => (
              <div key={i} className="flex-1 flex items-end justify-center gap-1">
                <div
                  className="w-[38%] shimmer bg-muted/60 rounded-sm"
                  style={{ height: `${hShort}%` }}
                />
                <div
                  className="w-[38%] shimmer bg-muted/50 rounded-sm"
                  style={{ height: `${hTall}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LazyChart;
