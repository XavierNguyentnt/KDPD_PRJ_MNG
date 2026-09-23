import { memo, useMemo } from "react";
import {
  BookOpenCheck,
  ClipboardList,
  Palette,
  RefreshCw,
  ScrollText,
  ServerCog,
  ShieldAlert,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GroupCode =
  | "cvchung"
  | "bientap"
  | "thietke"
  | "cntt"
  | "thuky"
  | "admin"
  | "team"
  | "dashboard";

interface GroupMeta {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  accentVar:
    | "group-cvchung"
    | "group-bientap"
    | "group-thietke"
    | "group-cntt"
    | "group-thuky"
    | "group-admin"
    | "primary";
}

const GROUP_META: Record<GroupCode, GroupMeta> = {
  cvchung: {
    title: "Công việc chung",
    subtitle:
      "Công việc văn phòng chung · Phối hợp đa bộ phận · 3 vai trò: Kiểm soát + Nhân sự + Thực hiện chính",
    Icon: ClipboardList,
    accentVar: "group-cvchung",
  },
  bientap: {
    title: "Biên tập Hán Nôm",
    subtitle:
      "Quy trình 3 giai đoạn biên tập · BTV 1 → BTV 2 → Người đọc duyệt · Loại bông · Liên kết tác phẩm & hợp đồng",
    Icon: BookOpenCheck,
    accentVar: "group-bientap",
  },
  thietke: {
    title: "Thiết kế",
    subtitle:
      "4 vai trò · KTV chính + Trợ lý N + BTV phê duyệt + Kiểm soát · Sao chép kế thừa phân công",
    Icon: Palette,
    accentVar: "group-thietke",
  },
  cntt: {
    title: "Công nghệ thông tin",
    subtitle:
      "Hỗ trợ kỹ thuật phần mềm · Quét trùng lặp Hán Nôm đa nhân sự song song · Kiểm soát bản quyền",
    Icon: ServerCog,
    accentVar: "group-cntt",
  },
  thuky: {
    title: "Thư ký hợp phần",
    subtitle:
      "4 modules nghiệp vụ · Công việc + Danh mục tác phẩm + HĐ dịch thuật + HĐ hiệu đính · Tài chính & công nợ",
    Icon: ScrollText,
    accentVar: "group-thuky",
  },
  admin: {
    title: "Quản trị hệ thống",
    subtitle:
      "Tổng quan hệ thống · Quản lý tài khoản · Phân quyền vai trò · Audit logs toàn bộ hoạt động",
    Icon: ShieldAlert,
    accentVar: "group-admin",
  },
  team: {
    title: "Nhóm — Hiệu suất thành viên",
    subtitle:
      "Hiệu suất thành viên theo thời gian · Theo dõi công việc, đánh giá và phân bổ theo vai trò",
    Icon: UsersRound,
    accentVar: "primary",
  },
  dashboard: {
    title: "Tổng quan dự án",
    subtitle:
      "Số liệu tổng hợp, biểu đồ xu hướng và công việc của bạn trong Văn phòng Dự án Kinh điển phương Đông",
    Icon: BookOpenCheck,
    accentVar: "group-bientap",
  },
};

export interface GroupPageHeroProps {
  groupCode: GroupCode;
  title?: string;
  subtitle?: string;
  iconClassName?: string;
  /** Last successful sync timestamp. If string, format directly. If Date, format locale vi-VN. */
  syncedAt?: Date | string | null;
  /** Show refresh button (right) */
  showRefresh?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  /** Count badge "N công việc" / "N tác phẩm" to show beside subtitle if desired */
  countBadge?: { label: string; tone?: "default" | "secondary" };
  /** Additional children rendered on the right side (ex: segmented toggle CNTT / Quét TL) */
  extra?: React.ReactNode;
  className?: string;
}

function formatSyncedAt(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(value);
  } catch {
    return value.toLocaleString();
  }
}

function GroupPageHeroImpl(props: GroupPageHeroProps) {
  const {
    groupCode,
    title: titleOverride,
    subtitle: subtitleOverride,
    iconClassName,
    syncedAt,
    showRefresh = typeof props.onRefresh === "function",
    isRefreshing = false,
    onRefresh,
    countBadge,
    extra,
    className,
  } = props;

  const meta = GROUP_META[groupCode];
  const title = titleOverride ?? meta.title;
  const subtitle = subtitleOverride ?? meta.subtitle;
  const Icon = meta.Icon;

  const accentStyle = useMemo(
    () => ({
      "--hero-accent": `hsl(var(--${meta.accentVar}) / <alpha-value>)`.replace(
        " / <alpha-value>",
        "",
      ),
      "--hero-accent-15": `hsl(var(--${meta.accentVar}) / 0.15)`,
      "--hero-accent-100": `hsl(var(--${meta.accentVar}) / 1)`,
    }),
    [meta.accentVar],
  ) as React.CSSProperties;

  const syncedText = formatSyncedAt(syncedAt);

  return (
    <section
      data-group-hero={groupCode}
      style={accentStyle}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm",
        "transition-shadow duration-200 hover:shadow-[0_1px_0_hsl(var(--border))_inset,0_10px_30px_-12px_hsl(var(--muted-foreground)/0.25)]",
        className,
      )}>
      {/* 4px accent bar (left) */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
        style={{ background: "var(--hero-accent-100)" }}
      />

      <div className="flex flex-col gap-4 p-5 pl-6 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div
            aria-hidden
            className={cn(
              "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            )}
            style={{ background: "var(--hero-accent-15)" }}>
            <Icon
              className={cn(
                "h-5.5 w-5.5 shrink-0 !h-[22px] !w-[22px]",
                iconClassName,
              )}
              style={{ color: "var(--hero-accent-100)" }}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="m-0 p-0 text-2xl font-display font-bold leading-tight tracking-tight text-foreground">
                {title}
              </h1>
              {countBadge ? (
                <span
                  className={cn(
                    "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium",
                    countBadge.tone === "secondary" || !countBadge.tone
                      ? "border-border bg-muted/70 text-muted-foreground"
                      : "",
                  )}
                  style={
                    countBadge.tone === "default"
                      ? {
                          color: "var(--hero-accent-100)",
                          background: "var(--hero-accent-15)",
                          borderColor: `hsl(var(--${meta.accentVar}) / 0.25)`,
                        }
                      : undefined
                  }>
                  {countBadge.label}
                </span>
              ) : null}
            </div>
            <p className="m-0 text-sm leading-relaxed text-muted-foreground md:text-[0.92rem]">
              {subtitle}
            </p>
            {syncedText ? (
              <p className="m-0 flex items-center gap-1.5 text-xs text-muted-foreground/85">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_0_2px_hsl(var(--status-success)/0.12)]" />
                <span>Đồng bộ lúc {syncedText}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {extra}
          {showRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={cn(
                "h-9 gap-1.5 pl-3 pr-3.5",
                isRefreshing && "pointer-events-none",
              )}>
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
              <span className="text-xs font-medium sm:text-sm">
                {isRefreshing ? "Đang làm mới" : "Làm mới"}
              </span>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export const GroupPageHero = memo(GroupPageHeroImpl);
export { GROUP_META };
export default GroupPageHero;
