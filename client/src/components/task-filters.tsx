"use client";

import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X, ChevronDown, Check, Search } from "lucide-react";
import type { User } from "@shared/schema";
import {
  compareNamesByLastNameAZ,
  getReportPeriodBounds,
  isTaskInReportPeriod,
  normalizeSearch,
  parseToLocalDate,
  type PeriodOption,
  type PeriodOptionsBundle,
  type ReportPeriodType,
  type ReportPeriodValue,
  type ReportPeriodMode,
} from "@/lib/utils";

export type ArchivedFilterMode = "active" | "archived" | "all";
export type { ReportPeriodMode } from "@/lib/utils";

export interface TaskFilterState {
  staffId: string;
  componentId: string;
  stage: string;
  status: string;
  vote: string;
  receivedYear: string;
  dateFrom: string;
  dateTo: string;
  roundType: string;
  periodType: ReportPeriodType;
  periodValue: ReportPeriodValue;
  archivedMode: ArchivedFilterMode;
  reportPeriodMode: ReportPeriodMode;
}

const DEFAULT_FILTERS: TaskFilterState = {
  staffId: "all",
  componentId: "all",
  stage: "all",
  status: "all",
  vote: "all",
  receivedYear: "all",
  dateFrom: "",
  dateTo: "",
  roundType: "all",
  periodType: "month",
  periodValue: "all",
  archivedMode: "active",
  reportPeriodMode: "overlap",
};

export function getDefaultTaskFilters(referenceDate: Date = new Date()): TaskFilterState {
  const d = referenceDate;
  const y = d.getFullYear();
  const m0 = d.getMonth();
  const currentMonthValue: string = `${y}-${m0}`;
  return {
    ...DEFAULT_FILTERS,
    periodValue: currentMonthValue as ReportPeriodValue,
  };
}

/** Apply filters to task list. Pass works to resolve relatedWorkId -> componentId/stage. */
export function applyTaskFilters<
  T extends {
    id: string;
    status: string;
    vote?: string | null;
    relatedWorkId?: string | null;
    dueDate?: string | Date | null;
    receivedAt?: string | Date | null;
    assigneeId?: string | null;
    assignments?: { userId: string }[];
    workflow?: any;
  },
>(
  tasks: T[],
  filters: TaskFilterState,
  works: { id: string; componentId: string | null; stage: string | null }[],
): T[] {
  let list = tasks.slice();

  if (filters.staffId && filters.staffId !== "all") {
    const uid = filters.staffId;
    list = list.filter(
      (t) =>
        t.assigneeId === uid ||
        (t.assignments && t.assignments.some((a) => a.userId === uid)),
    );
  }

  if (filters.componentId && filters.componentId !== "all") {
    const workIds = new Set(
      works
        .filter((w) => w.componentId === filters.componentId)
        .map((w) => w.id),
    );
    list = list.filter((t) => t.relatedWorkId && workIds.has(t.relatedWorkId));
  }

  if (filters.stage && filters.stage !== "all") {
    const workIds = new Set(
      works.filter((w) => w.stage === filters.stage).map((w) => w.id),
    );
    list = list.filter((t) => t.relatedWorkId && workIds.has(t.relatedWorkId));
  }

  if (filters.status && filters.status !== "all") {
    if (filters.status === "Not Finished") {
      list = list.filter(
        (t) =>
          !(t.status === "Completed" || (t as any).actualCompletedAt != null),
      );
    } else if (filters.status === "Behind Schedule") {
      list = list.filter((t) => {
        if (t.status !== "In Progress") return false;
        if ((t as any).actualCompletedAt != null) return false;
        if (!t.dueDate) return false;
        return new Date(String(t.dueDate)) < new Date();
      });
    } else {
      list = list.filter((t) => t.status === filters.status);
    }
  }

  if (filters.vote && filters.vote !== "all") {
    if (filters.vote === "unrated") {
      list = list.filter((t) => !(t.vote ?? "").trim());
    } else {
      list = list.filter(
        (t) => (t.vote ?? "").toLowerCase() === filters.vote.toLowerCase(),
      );
    }
  }

  if (filters.roundType && filters.roundType !== "all") {
    list = list.filter((t) => {
      try {
        const wf = (t as any).workflow
          ? typeof (t as any).workflow === "string"
            ? JSON.parse((t as any).workflow)
            : (t as any).workflow
          : null;
        if (!wf || !Array.isArray(wf.rounds)) return false;
        const current =
          wf.rounds.find((r: any) => r?.roundNumber === wf.currentRound) ||
          wf.rounds[0];
        const rt = current?.roundType ?? "";
        return rt === filters.roundType;
      } catch {
        return false;
      }
    });
  }

  if (filters.receivedYear && filters.receivedYear !== "all") {
    const y = String(filters.receivedYear).trim();
    list = list.filter((t) => {
      const r = (t as any).receivedAt ?? null;
      const s =
        typeof r === "string"
          ? r.slice(0, 10)
          : r instanceof Date
            ? r.toISOString().slice(0, 10)
            : "";
      return s ? s.slice(0, 4) === y : false;
    });
  }

  if (filters.dateFrom) {
    const from = filters.dateFrom.slice(0, 10);
    list = list.filter((t) => {
      const d = t.dueDate
        ? typeof t.dueDate === "string"
          ? t.dueDate.slice(0, 10)
          : (t.dueDate as Date).toISOString().slice(0, 10)
        : "";
      return d >= from;
    });
  }

  if (filters.dateTo) {
    const to = filters.dateTo.slice(0, 10);
    list = list.filter((t) => {
      if (!t.dueDate) return false;
      const d =
        typeof t.dueDate === "string"
          ? t.dueDate.slice(0, 10)
          : (t.dueDate as Date).toISOString().slice(0, 10);
      return d <= to;
    });
  }

  if (
    filters.periodType &&
    filters.periodType !== "all" &&
    filters.periodValue &&
    filters.periodValue !== "all"
  ) {
    const bounds = getReportPeriodBounds(filters.periodType, filters.periodValue);
    const mode: ReportPeriodMode = filters.reportPeriodMode ?? "overlap";
    list = list.filter((t) => isTaskInReportPeriod(t as any, bounds.start, bounds.end, mode));

    const psTuple: [number, number, number] = [
      bounds.start.getFullYear(),
      bounds.start.getMonth(),
      bounds.start.getDate(),
    ];

    const cmpBefore = (ct: [number, number, number]): boolean => {
      if (ct[0] !== psTuple[0]) return ct[0] < psTuple[0];
      if (ct[1] !== psTuple[1]) return ct[1] < psTuple[1];
      return ct[2] < psTuple[2];
    };

    // Helper: lấy actualCompletedAt tuple (task-level MAX or assignments-level MAX)
    const computeCompletedTuple = (t: any): [number, number, number] | null => {
      const top = parseToLocalDate(t.actualCompletedAt ?? null);
      let latest: [number, number, number] | null = top;
      if (t.assignments && Array.isArray(t.assignments)) {
        for (const a of t.assignments) {
          const ct = parseToLocalDate(a.completedAt ?? null);
          if (!ct) continue;
          if (!latest) { latest = ct; continue; }
          const before =
            ct[0] < latest[0] ||
            (ct[0] === latest[0] && ct[1] < latest[1]) ||
            (ct[0] === latest[0] && ct[1] === latest[1] && ct[2] < latest[2]);
          if (!before) latest = ct;
        }
      }
      return latest;
    };

    if (filters.archivedMode === "archived") {
      list = list.filter((t) => {
        const ct = computeCompletedTuple(t);
        if (!ct) return false;
        return cmpBefore(ct);
      });
    } else if (filters.archivedMode === "active") {
      list = list.filter((t) => {
        const ct = computeCompletedTuple(t);
        if (!ct) return true;
        return !cmpBefore(ct);
      });
    }
  }

  return list;
}

interface TaskFiltersProps {
  users: User[];
  components: { id: string; name: string }[];
  filters: TaskFilterState;
  onFiltersChange: (f: Partial<TaskFilterState>) => void;
  /** Unique stages from works (e.g. stage display values) */
  stages: string[];
  yearOptions?: string[];
  showVoteFilter?: boolean;
  showRoundTypeFilter?: boolean;
  roundTypeOptions?: string[];
  periodOptions?: PeriodOptionsBundle;
}

export function TaskFilters({
  users,
  components,
  filters,
  onFiltersChange,
  stages,
  yearOptions = [],
  showVoteFilter = true,
  showRoundTypeFilter = false,
  roundTypeOptions = [],
  periodOptions,
}: TaskFiltersProps) {
  const { t, language } = useI18n();
  const { toast } = useToast();
  const staffOptions = useMemo(() => {
    return users
      .filter((u) => u.isActive !== false)
      .map((u) => ({
        id: u.id,
        label: u.displayName || u.email || u.id,
      }))
      .sort((a, b) => compareNamesByLastNameAZ(a.label, b.label));
  }, [users]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.staffId && filters.staffId !== "all") count++;
    if (filters.componentId && filters.componentId !== "all") count++;
    if (filters.stage && filters.stage !== "all") count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.vote && filters.vote !== "all") count++;
    if (filters.receivedYear && filters.receivedYear !== "all") count++;
    if (filters.roundType && filters.roundType !== "all") count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.periodType && filters.periodType !== "all") count++;
    if (filters.archivedMode && filters.archivedMode !== "active") count++;
    if (filters.reportPeriodMode && filters.reportPeriodMode !== "overlap") count++;
    return count;
  }, [filters]);

  const warnInvalidDateRange = useCallback(() => {
    toast({
      variant: "destructive",
      title: language === "vi" ? "Khoảng ngày không hợp lệ" : "Invalid date range",
      description:
        language === "vi"
          ? "Đến ngày không được nhỏ hơn Từ ngày."
          : "End date cannot be earlier than start date.",
    });
  }, [toast, language]);

  const handleDateFromChange = useCallback(
    (v: string | null) => {
      const next = v ?? "";
      if (next && filters.dateTo && filters.dateTo < next) {
        warnInvalidDateRange();
        return;
      }
      onFiltersChange({ dateFrom: next });
    },
    [filters.dateTo, onFiltersChange, warnInvalidDateRange],
  );

  const handleDateToChange = useCallback(
    (v: string | null) => {
      const next = v ?? "";
      if (next && filters.dateFrom && next < filters.dateFrom) {
        warnInvalidDateRange();
        return;
      }
      onFiltersChange({ dateTo: next });
    },
    [filters.dateFrom, onFiltersChange, warnInvalidDateRange],
  );

  const StatusControl = (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      <Label className="text-xs text-muted-foreground">
        {t.filter.status}
      </Label>
      <Select
        value={filters.status}
        onValueChange={(v) => onFiltersChange({ status: v })}>
        <SelectTrigger className="w-full sm:w-[170px] h-9 bg-background">
          <SelectValue placeholder={t.filter.status} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.dashboard.allStatus}</SelectItem>
          <SelectItem value="Not Finished">{t.stats.notFinished}</SelectItem>
          <SelectItem value="Behind Schedule">
            {t.dashboard.behindSchedule}
          </SelectItem>
          <SelectItem value="Not Started">{t.status.notStarted}</SelectItem>
          <SelectItem value="In Progress">{t.status.inProgress}</SelectItem>
          <SelectItem value="Completed">{t.status.completed}</SelectItem>
          <SelectItem value="Pending">{t.status.pending}</SelectItem>
          <SelectItem value="Cancelled">{t.status.cancelled}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const StaffControl = (() => {
    const [staffOpen, setStaffOpen] = useState(false);
    const [staffSearch, setStaffSearch] = useState("");
    const filteredStaff = useMemo(() => {
      if (!staffSearch.trim()) return staffOptions;
      const q = normalizeSearch(staffSearch.trim());
      return staffOptions.filter((o) => normalizeSearch(o.label).includes(q));
    }, [staffOptions, staffSearch]);
    const currentStaff = staffOptions.find((u) => u.id === filters.staffId);
    return (
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <Label className="text-xs text-muted-foreground">
          {t.filter.staff}
        </Label>
        <Popover open={staffOpen} onOpenChange={(o) => {
          setStaffOpen(o);
          if (!o) setStaffSearch("");
        }}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-[200px] h-9 justify-start font-normal px-3 gap-2 bg-background">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className={`truncate ${!currentStaff ? "text-muted-foreground" : ""}`}>
                {currentStaff ? currentStaff.label : t.filter.allStaff}
              </span>
              {filters.staffId && filters.staffId !== "all" && (
                <X
                  className="w-3.5 h-3.5 ml-auto text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFiltersChange({ staffId: "all" });
                  }}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={6}
            className="w-[260px] p-0 shadow-lg">
            <div className="p-2 pb-1 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder={language === "vi" ? "Nhập tên nhân sự..." : "Type staff name..."}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            <ScrollArea className="max-h-[280px]">
              <div className="p-1">
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors hover:bg-muted ${filters.staffId === "all" ? "bg-muted text-primary font-medium" : ""}`}
                  onClick={() => {
                    onFiltersChange({ staffId: "all" });
                    setStaffOpen(false);
                  }}>
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                    {filters.staffId === "all" && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className="truncate">{t.filter.allStaff}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5 font-normal">
                    {staffOptions.length}
                  </Badge>
                </button>
                <Separator className="my-1" />
                {filteredStaff.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    {language === "vi" ? "Không tìm thấy nhân sự phù hợp" : "No matching staff found"}
                  </div>
                ) : (
                  filteredStaff.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md flex items-center gap-2 transition-colors hover:bg-muted ${filters.staffId === u.id ? "bg-muted text-primary font-medium" : ""}`}
                      onClick={() => {
                        onFiltersChange({ staffId: u.id });
                        setStaffOpen(false);
                      }}>
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {filters.staffId === u.id && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <span className="truncate">{u.label}</span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    );
  })();

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        <Filter className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{t.common.filter}</span>
        {activeFilterCount > 0 && (
          <Badge variant="destructive" className="h-5 px-1.5 text-[11px]">
            {language === "vi"
              ? `${activeFilterCount} bộ lọc`
              : `${activeFilterCount} filters`}
          </Badge>
        )}
      </div>

      {StatusControl}
      {StaffControl}

      {(() => {
        const bundle = periodOptions ?? { months: [], quarters: [], years: [] };
        const currentOptions: PeriodOption[] = (() => {
          switch (filters.periodType) {
            case "month": return bundle.months;
            case "quarter": return bundle.quarters;
            case "year": return bundle.years;
            default: return [];
          }
        })();
        const isPeriodAll = filters.periodType === "all" || filters.periodValue === "all";
        const activeCls = "ring-2 ring-primary/30 bg-primary/10";
        const baseCls =
          "inline-flex items-center gap-1 h-9 px-3 rounded-md text-xs font-medium transition-all select-none border border-border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-background";
        const setArchived = (m: ArchivedFilterMode) => {
          onFiltersChange({ archivedMode: m });
          try {
            const el = document.querySelector<HTMLElement>("[data-task-table-root]");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            else window.scrollBy({ top: 120, behavior: "smooth" });
          } catch {}
        };
        const handleKey =
          (m: ArchivedFilterMode) =>
          (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setArchived(m);
            }
          };
        return (
          <>
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">
                {language === "vi" ? "Loại kỳ" : "Period type"}
              </Label>
              <Select
                value={filters.periodType}
                onValueChange={(v) => {
                  const next = v as ReportPeriodType;
                  onFiltersChange({ periodType: next, periodValue: "all" });
                }}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 bg-background">
                  <SelectValue placeholder={language === "vi" ? "Loại kỳ" : "Period type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === "vi" ? "Tất cả" : "All"}
                  </SelectItem>
                  <SelectItem value="month">
                    {language === "vi" ? "Tháng" : "Month"}
                  </SelectItem>
                  <SelectItem value="quarter">
                    {language === "vi" ? "Quý" : "Quarter"}
                  </SelectItem>
                  <SelectItem value="year">
                    {language === "vi" ? "Năm" : "Year"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">
                {language === "vi" ? "Kỳ báo cáo" : "Report period"}
              </Label>
              <Select
                disabled={filters.periodType === "all" || currentOptions.length === 0}
                value={filters.periodValue}
                onValueChange={(v) => onFiltersChange({ periodValue: v })}>
                <SelectTrigger className="w-full sm:w-[190px] h-9 bg-background">
                  <SelectValue placeholder={language === "vi" ? "Chọn kỳ" : "Select period"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === "vi" ? "Tất cả kỳ" : "All periods"}
                  </SelectItem>
                  {currentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">
                {language === "vi" ? "Trạng thái lưu trữ" : "Archive status"}
              </Label>
              <div className="flex flex-nowrap gap-1.5 items-center">
                <div
                  role="button"
                  tabIndex={isPeriodAll ? -1 : 0}
                  aria-pressed={filters.archivedMode === "active" && !isPeriodAll}
                  aria-disabled={isPeriodAll}
                  onClick={() => !isPeriodAll && setArchived("active")}
                  onKeyDown={handleKey("active")}
                  className={`${baseCls} ${
                    (isPeriodAll && filters.archivedMode === "active") ||
                    (!isPeriodAll && filters.archivedMode === "active")
                      ? activeCls
                      : ""
                  }`}>
                  {language === "vi" ? "Đang hoạt động" : "Active"}
                </div>
                <div
                  role="button"
                  tabIndex={isPeriodAll ? -1 : 0}
                  aria-pressed={filters.archivedMode === "archived" && !isPeriodAll}
                  aria-disabled={isPeriodAll}
                  onClick={() => !isPeriodAll && setArchived("archived")}
                  onKeyDown={handleKey("archived")}
                  className={`${baseCls} ${
                    !isPeriodAll && filters.archivedMode === "archived" ? activeCls : ""
                  } ${isPeriodAll ? "opacity-60" : ""}`}>
                  {language === "vi" ? "Đã lưu trữ" : "Archived"}
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={isPeriodAll || filters.archivedMode === "all"}
                  onClick={() => setArchived("all")}
                  onKeyDown={handleKey("all")}
                  className={`${baseCls} ${
                    filters.archivedMode === "all" ? activeCls : ""
                  }`}>
                  {language === "vi" ? "Tất cả" : "All"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <Label className="text-xs text-muted-foreground">
                {language === "vi" ? "Cách đếm công việc" : "Task counting mode"}
              </Label>
              {(() => {
                const setMode = (m: ReportPeriodMode) => {
                  onFiltersChange({ reportPeriodMode: m });
                  const el = document.querySelector<HTMLElement>(
                    '[data-task-table-root="1"]',
                  );
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                };
                const modeKey = (m: ReportPeriodMode) => (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMode(m);
                  }
                };
                const segBase =
                  "h-9 px-3 inline-flex items-center justify-center rounded-md text-[12px] border border-input cursor-pointer select-none transition-colors bg-background";
                const segActive =
                  "ring-2 ring-primary/40 border-primary/70 bg-primary/10 text-primary font-semibold";
                const curMode: ReportPeriodMode =
                  filters.reportPeriodMode ?? "overlap";
                return (
                  <div className="flex flex-nowrap rounded-md overflow-hidden ring-1 ring-input">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={curMode === "overlap"}
                      onClick={() => setMode("overlap")}
                      onKeyDown={modeKey("overlap")}
                      className={`${segBase} rounded-r-none border-r-0 ${
                        curMode === "overlap" ? segActive : ""
                      }`}>
                      {language === "vi"
                        ? "Theo kỳ thực hiện"
                        : "By execution period"}
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={curMode === "completion"}
                      onClick={() => setMode("completion")}
                      onKeyDown={modeKey("completion")}
                      className={`${segBase} rounded-l-none ${
                        curMode === "completion" ? segActive : ""
                      }`}>
                      {language === "vi"
                        ? "Theo kỳ hoàn thành"
                        : "By completion period"}
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        );
      })()}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs px-3 w-full sm:w-auto shrink-0 self-end">
            {language === "vi" ? "Bộ lọc nâng cao" : "Advanced filters"}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          className="w-[min(calc(100vw-32px),640px)] p-0 shadow-lg">
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {language === "vi" ? "Bộ lọc nâng cao" : "Advanced filters"}
                </span>
                {activeFilterCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[11px]">
                    {language === "vi"
                      ? `${activeFilterCount} đang hoạt động`
                      : `${activeFilterCount} active`}
                  </Badge>
                )}
              </div>
            </div>
            <Separator className="-mx-4 mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t.filter.component}
                </Label>
                <Select
                  value={filters.componentId}
                  onValueChange={(v) =>
                    onFiltersChange({ componentId: v })
                  }>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder={t.filter.allComponents} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.filter.allComponents}</SelectItem>
                    {components.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t.filter.stage}
                </Label>
                <Select
                  value={filters.stage}
                  onValueChange={(v) => onFiltersChange({ stage: v })}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder={t.filter.allStages} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.filter.allStages}</SelectItem>
                    {stages.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t.filter.year ??
                    (language === "vi" ? "Năm nhận việc" : "Received year")}
                </Label>
                <Select
                  value={filters.receivedYear}
                  onValueChange={(v) =>
                    onFiltersChange({ receivedYear: v })
                  }>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue
                      placeholder={
                        t.filter.allYears ??
                        (language === "vi"
                          ? "Tất cả năm"
                          : "All years")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t.filter.allYears ??
                        (language === "vi"
                          ? "Tất cả năm"
                          : "All years")}
                    </SelectItem>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showVoteFilter && (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    {t.filter.vote}
                  </Label>
                  <Select
                    value={filters.vote}
                    onValueChange={(v) => onFiltersChange({ vote: v })}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder={t.filter.allVotes} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.filter.allVotes}</SelectItem>
                      <SelectItem value="tot">
                        {language === "vi" ? "Hoàn thành tốt" : "Good"}
                      </SelectItem>
                      <SelectItem value="kha">
                        {language === "vi" ? "Hoàn thành khá" : "Fair"}
                      </SelectItem>
                      <SelectItem value="khong_tot">
                        {language === "vi" ? "Không tốt" : "Poor"}
                      </SelectItem>
                      <SelectItem value="khong_hoan_thanh">
                        {language === "vi"
                          ? "Không hoàn thành"
                          : "Not completed"}
                      </SelectItem>
                      <SelectItem value="unrated">
                        {language === "vi" ? "Chưa đánh giá" : "Unrated"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showRoundTypeFilter && (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">
                    {t.filter.roundType ?? t.task.roundTypeLabel}
                  </Label>
                  <Select
                    value={filters.roundType}
                    onValueChange={(v) =>
                      onFiltersChange({ roundType: v })
                    }>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue
                        placeholder={
                          t.filter.allRoundTypes ?? t.task.selectRoundType
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t.filter.allRoundTypes ??
                          (language === "vi"
                            ? "Tất cả loại bông"
                            : "All round types")}
                      </SelectItem>
                      {(roundTypeOptions || []).map((rt) => (
                        <SelectItem key={rt} value={rt}>
                          {rt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t.filter.dateFrom}
                </Label>
                <DateInput
                  value={filters.dateFrom || null}
                  onChange={handleDateFromChange}
                  placeholder="dd/mm/yyyy"
                  className="h-9 w-full bg-background"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">
                  {t.filter.dateTo}
                </Label>
                <DateInput
                  value={filters.dateTo || null}
                  onChange={handleDateToChange}
                  placeholder="dd/mm/yyyy"
                  className="h-9 w-full bg-background"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 p-3 pt-2 border-t border-border mt-1 bg-muted/30 rounded-b-md">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onFiltersChange({ dateFrom: "", dateTo: "" })}
              disabled={!filters.dateFrom && !filters.dateTo}>
              <X className="h-3.5 w-3.5" />
              {language === "vi" ? "Xoá ngày" : "Clear dates"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onFiltersChange(getDefaultTaskFilters())}>
              <X className="h-3.5 w-3.5" />
              {language === "vi" ? "Xoá lọc" : "Clear filters"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
