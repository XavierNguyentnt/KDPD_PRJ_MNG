import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function TaskTableSkeleton({
  rows = 8,
  columns = 8,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border bg-card overflow-hidden animate-in",
        className
      )}
    >
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
        <Skeleton className="h-8 w-48 shimmer rounded-md" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-28 shimmer rounded-md" />
          <Skeleton className="h-9 w-24 shimmer rounded-md" />
        </div>
      </div>
      <div className="filter-bar flex flex-wrap gap-3 items-center">
        <Skeleton className="h-9 w-72 shimmer rounded-md" />
        <Skeleton className="h-9 w-36 shimmer rounded-md" />
        <Skeleton className="h-9 w-36 shimmer rounded-md" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-9 shimmer rounded-md" />
          <Skeleton className="h-9 w-9 shimmer rounded-md" />
          <Skeleton className="h-9 w-9 shimmer rounded-md" />
        </div>
      </div>
      <div className="flex flex-col">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`h-${i}`}
              className={cn(
                "h-4 shimmer rounded",
                i === 0 ? "col-span-2" : i === 1 ? "col-span-3" : "col-span-1"
              )}
            />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, ri) => (
          <div
            key={`r-${ri}`}
            className={cn(
              "grid grid-cols-12 gap-3 px-4 py-3.5 items-center",
              ri !== rows - 1 ? "border-b border-border/60" : ""
            )}
          >
            {Array.from({ length: columns }).map((_, ci) => (
              <Skeleton
                key={`c-${ri}-${ci}`}
                className={cn(
                  "h-4 shimmer rounded",
                  ci === 0
                    ? "col-span-2 w-28"
                    : ci === 1
                    ? "col-span-3 w-11/12"
                    : ci === columns - 1
                    ? "col-span-1 w-20"
                    : "col-span-1 w-4/5"
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
        <Skeleton className="h-4 w-52 shimmer rounded" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 shimmer rounded-md" />
          <Skeleton className="h-8 w-8 shimmer rounded-md" />
          <Skeleton className="h-8 w-10 shimmer rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  cards = 6,
  cols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  withHeader = true,
  className,
}: {
  cards?: number;
  cols?: string;
  withHeader?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5 animate-in w-full", className)}>
      {withHeader && (
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-60 shimmer-primary rounded-md" />
          <Skeleton className="ml-auto h-8 w-32 shimmer rounded-md" />
        </div>
      )}
      <div className={cn("grid gap-4", cols)}>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={`card-${i}`}
            className="relative section-card overflow-hidden"
          >
            <div className="stat-card-accent shimmer-primary rounded-l-lg" />
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-24 shimmer rounded" />
                  <Skeleton className="h-9 w-20 shimmer-primary rounded-md" />
                </div>
                <Skeleton className="h-10 w-10 shimmer rounded-xl" />
              </div>
              <Skeleton className="h-3.5 w-4/5 shimmer rounded" />
              <Skeleton className="h-2.5 w-3/5 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FullPageSkeleton({
  withTabs = true,
  tabs = 3,
  withWelcome = true,
  className,
}: {
  withTabs?: boolean;
  tabs?: number;
  withWelcome?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 w-full animate-in p-4 sm:p-6 lg:p-8", className)}>
      {withWelcome && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-2.5 flex-1 min-w-[220px]">
            <Skeleton className="h-9 w-64 shimmer-primary rounded-md" />
            <Skeleton className="h-4 w-96 shimmer rounded max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 shimmer rounded-lg" />
            <Skeleton className="h-9 w-36 shimmer rounded-lg" />
          </div>
        </div>
      )}

      {withTabs && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 p-1 bg-muted/30 border border-border rounded-xl w-fit">
            {Array.from({ length: tabs }).map((_, i) => (
              <Skeleton
                key={`tab-${i}`}
                className={cn(
                  "h-9 rounded-lg shimmer",
                  i === 0 ? "w-32 shimmer-primary" : "w-40"
                )}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`stat-${i}`}
            className="relative section-card overflow-hidden"
          >
            <div className="stat-card-accent shimmer-primary rounded-l-lg" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-3.5 w-20 shimmer rounded" />
              <Skeleton className="h-8 w-16 shimmer-primary rounded-md" />
              <Skeleton className="h-3 w-28 shimmer rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 section-card">
          <div className="p-4 space-y-3">
            <Skeleton className="h-6 w-48 shimmer-primary rounded-md" />
            <div className="h-64 shimmer rounded-lg" />
          </div>
        </div>
        <div className="section-card space-y-0">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-6 w-40 shimmer-primary rounded-md" />
          </div>
          <div className="p-4 space-y-3.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`item-${i}`} className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 shrink-0 shimmer rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-11/12 shimmer rounded" />
                  <Skeleton className="h-3.5 w-4/5 shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
