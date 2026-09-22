"use client";

import { useCallback, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Filter, X, ChevronDown } from "lucide-react";
import type { User } from "@shared/schema";
import { compareNamesByLastNameAZ } from "@/lib/utils";

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
};

export function getDefaultTaskFilters(): TaskFilterState {
  return { ...DEFAULT_FILTERS };
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

  const StaffControl = (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      <Label className="text-xs text-muted-foreground">
        {t.filter.staff}
      </Label>
      <Select
        value={filters.staffId}
        onValueChange={(v) => onFiltersChange({ staffId: v })}>
        <SelectTrigger className="w-full sm:w-[180px] h-9 bg-background">
          <SelectValue placeholder={t.filter.allStaff} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.filter.allStaff}</SelectItem>
          {staffOptions.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

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
