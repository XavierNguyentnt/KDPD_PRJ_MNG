import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import { FilePlus, ListFilter, PenLine, ScrollText } from "lucide-react";

type EmptyStateVariant = "default" | "compact";

export interface EmptyStateCTAProps {
  variant?: EmptyStateVariant;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  hideIllustration?: boolean;
  illustration?: "scroll" | "kanban" | "calendar" | "team";
  onCreateNew?: () => void;
  createCtaLabel?: string;
  onResetFilters?: () => void;
  resetFilterLabel?: string;
  className?: string;
}

export function EmptyStateIllustration({
  kind = "scroll",
  className,
}: {
  kind?: "scroll" | "kanban" | "calendar" | "team";
  className?: string;
}) {
  const accentStroke = "hsl(var(--primary))";
  const accentFill = "hsl(var(--accent))";
  const mutedStroke = "hsl(var(--muted-foreground) / 0.45)";
  const paperFill = "hsl(var(--card))";
  const paperStroke = "hsl(var(--border))";

  if (kind === "scroll") {
    return (
      <svg
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true">
        <defs>
          <linearGradient id="es-scroll-grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={accentFill} stopOpacity="0.25" />
            <stop offset="100%" stopColor={accentStroke} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect
          x="22"
          y="30"
          width="156"
          height="98"
          rx="14"
          fill="url(#es-scroll-grad)"
          stroke={paperStroke}
          strokeDasharray="2 4"
        />
        <path
          d="M30 56h110M30 70h120M30 84h96M30 98h130M30 112h104"
          stroke={mutedStroke}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M30 70h120"
          stroke={accentStroke}
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <g transform="translate(154,96) rotate(18)">
          <path
            d="M0 20 L10 0 L22 12 L12 32 Z"
            fill={paperFill}
            stroke={accentStroke}
            strokeWidth="1.8"
          />
          <path d="M4 20 L14 0" stroke={accentStroke} strokeWidth="1.4" />
        </g>
        <circle cx="50" cy="48" r="5" fill={accentStroke} opacity="0.55" />
        <circle cx="70" cy="48" r="5" fill={accentFill} opacity="0.8" />
      </svg>
    );
  }

  if (kind === "kanban") {
    return (
      <svg
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true">
        <rect
          x="14"
          y="28"
          width="48"
          height="104"
          rx="10"
          fill={paperFill}
          stroke={paperStroke}
        />
        <rect
          x="76"
          y="28"
          width="48"
          height="104"
          rx="10"
          fill={paperFill}
          stroke={paperStroke}
        />
        <rect
          x="138"
          y="28"
          width="48"
          height="104"
          rx="10"
          fill={paperFill}
          stroke={paperStroke}
        />
        <rect x="20" y="40" width="36" height="14" rx="4" fill="hsl(var(--muted))" />
        <rect
          x="82"
          y="40"
          width="36"
          height="14"
          rx="4"
          fill={accentFill}
          opacity="0.6"
        />
        <rect x="144" y="40" width="36" height="14" rx="4" fill="hsl(var(--muted))" />
        <rect x="20" y="60" width="36" height="14" rx="4" fill="hsl(var(--muted))" />
        <rect
          x="82"
          y="60"
          width="36"
          height="14"
          rx="4"
          fill={accentStroke}
          opacity="0.45"
        />
        <rect x="20" y="80" width="36" height="14" rx="4" fill="hsl(var(--muted))" />
      </svg>
    );
  }

  if (kind === "calendar") {
    return (
      <svg
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true">
        <rect
          x="30"
          y="30"
          width="140"
          height="104"
          rx="14"
          fill={paperFill}
          stroke={paperStroke}
        />
        <rect
          x="30"
          y="30"
          width="140"
          height="26"
          rx="14"
          fill={accentStroke}
          opacity="0.2"
        />
        <path
          d="M60 20 v16M140 20 v16"
          stroke={paperStroke}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g stroke={mutedStroke} strokeWidth="1.4" strokeLinecap="round">
          <line x1="48" y1="80" x2="152" y2="80" />
          <line x1="48" y1="100" x2="152" y2="100" />
          <line x1="68" y1="62" x2="68" y2="124" />
          <line x1="94" y1="62" x2="94" y2="124" />
          <line x1="120" y1="62" x2="120" y2="124" />
        </g>
        <circle cx="82" cy="90" r="5" fill={accentStroke} opacity="0.85" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true">
      <circle cx="68" cy="64" r="18" fill={accentStroke} opacity="0.35" />
      <circle cx="132" cy="64" r="18" fill={accentFill} opacity="0.7" />
      <circle cx="100" cy="52" r="18" fill={paperFill} stroke={paperStroke} />
      <path
        d="M40 128 C 52 108, 148 108, 160 128 L160 132 L40 132 Z"
        fill={accentFill}
        opacity="0.55"
      />
    </svg>
  );
}

export function EmptyStateCTA({
  variant = "default",
  title,
  subtitle,
  icon,
  hideIllustration = false,
  illustration = "scroll",
  onCreateNew,
  createCtaLabel,
  onResetFilters,
  resetFilterLabel,
  className,
}: EmptyStateCTAProps) {
  const { t, language } = useI18n();
  const fallbackTitle =
    language === "vi" ? "Chưa có dữ liệu nào" : "Nothing here yet";
  const fallbackSubtitle =
    language === "vi"
      ? "Không có dữ liệu để hiển thị. Thử thay đổi bộ lọc hoặc tạo mục mới."
      : "There is nothing to display. Try changing filters or create something new.";

  const finalTitle =
    title ?? t.dashboard.emptyTitle ?? fallbackTitle;
  const finalSubtitle =
    subtitle ?? t.dashboard.emptySubtitle ?? fallbackSubtitle;
  const finalCreateLabel =
    createCtaLabel ??
    t.dashboard.emptyCreateCta ??
    (language === "vi" ? "Tạo mới" : "Create");
  const finalResetLabel =
    resetFilterLabel ??
    t.dashboard.emptyResetFilter ??
    (language === "vi" ? "Xóa bộ lọc" : "Clear filters");

  const showActions = typeof onCreateNew === "function" || typeof onResetFilters === "function";

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "w-full rounded-lg border border-border/60 bg-card/50 p-4 flex items-start gap-3",
          className,
        )}>
        <div className="shrink-0 text-muted-foreground/70 mt-0.5">
          {icon ?? <ScrollText className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {finalTitle}
          </div>
          <p className="text-xs text-muted-foreground leading-5">
            {finalSubtitle}
          </p>
          {showActions ? (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {typeof onCreateNew === "function" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={onCreateNew}
                  className="h-8 px-3">
                  <FilePlus className="h-3.5 w-3.5 mr-1.5" />
                  {finalCreateLabel}
                </Button>
              ) : null}
              {typeof onResetFilters === "function" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onResetFilters}
                  className="h-8 px-3">
                  <ListFilter className="h-3.5 w-3.5 mr-1.5" />
                  {finalResetLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/60 bg-gradient-to-b from-background to-muted/20",
        "p-6 sm:p-10 text-center flex flex-col items-center",
        className,
      )}>
      {!hideIllustration ? (
        <div
          className={cn(
            "mb-5 select-none pointer-events-none w-full max-w-[200px]",
          )}>
          {icon ?? (
            <EmptyStateIllustration
              kind={illustration}
              className="w-full h-auto"
            />
          )}
        </div>
      ) : icon ? (
        <div className="mb-5 text-muted-foreground/70">{icon}</div>
      ) : null}

      <h3 className="text-lg font-semibold text-foreground leading-6 mb-1.5">
        {finalTitle}
      </h3>
      <p className="max-w-md text-sm text-muted-foreground leading-6 mb-5">
        {finalSubtitle}
      </p>

      {showActions ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {typeof onCreateNew === "function" ? (
            <Button
              type="button"
              onClick={onCreateNew}
              className="h-9 px-4">
              <PenLine className="h-4 w-4 mr-1.5" />
              {finalCreateLabel}
            </Button>
          ) : null}
          {typeof onResetFilters === "function" ? (
            <Button
              type="button"
              variant="outline"
              onClick={onResetFilters}
              className="h-9 px-4">
              <ListFilter className="h-4 w-4 mr-1.5" />
              {finalResetLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default EmptyStateCTA;
