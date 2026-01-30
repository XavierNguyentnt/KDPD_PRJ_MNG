"use client";

import { useI18n } from "@/hooks/use-i18n";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { Filter } from "lucide-react";
import type { User } from "@shared/schema";

export interface TaskFilterState {
  staffId: string;
  componentId: string;
  stage: string;
  status: string;
  vote: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: TaskFilterState = {
  staffId: "all",
  componentId: "all",
  stage: "all",
  status: "all",
  vote: "all",
  dateFrom: "",
  dateTo: "",
};

export function getDefaultTaskFilters(): TaskFilterState {
  return { ...DEFAULT_FILTERS };
}

/** Apply filters to task list. Pass works to resolve relatedWorkId -> componentId/stage. */
export function applyTaskFilters<T extends { id: string; status: string; vote?: string | null; relatedWorkId?: string | null; dueDate?: string | Date | null; assigneeId?: string | null; assignments?: { userId: string }[] }>(
  tasks: T[],
  filters: TaskFilterState,
  works: { id: string; componentId: string | null; stage: string | null }[]
): T[] {
  let list = tasks.slice();

  if (filters.staffId && filters.staffId !== "all") {
    const uid = filters.staffId;
    list = list.filter(
      (t) =>
        t.assigneeId === uid ||
        (t.assignments && t.assignments.some((a) => a.userId === uid))
    );
  }

  if (filters.componentId && filters.componentId !== "all") {
    const workIds = new Set(works.filter((w) => w.componentId === filters.componentId).map((w) => w.id));
    list = list.filter((t) => t.relatedWorkId && workIds.has(t.relatedWorkId));
  }

  if (filters.stage && filters.stage !== "all") {
    const workIds = new Set(works.filter((w) => w.stage === filters.stage).map((w) => w.id));
    list = list.filter((t) => t.relatedWorkId && workIds.has(t.relatedWorkId));
  }

  if (filters.status && filters.status !== "all") {
    list = list.filter((t) => t.status === filters.status);
  }

  if (filters.vote && filters.vote !== "all") {
    list = list.filter((t) => (t.vote ?? "").toLowerCase() === filters.vote.toLowerCase());
  }

  if (filters.dateFrom) {
    const from = filters.dateFrom.slice(0, 10);
    list = list.filter((t) => {
      const d = t.dueDate ? (typeof t.dueDate === "string" ? t.dueDate.slice(0, 10) : (t.dueDate as Date).toISOString().slice(0, 10)) : "";
      return d >= from;
    });
  }

  if (filters.dateTo) {
    const to = filters.dateTo.slice(0, 10);
    list = list.filter((t) => {
      const d = t.dueDate ? (typeof t.dueDate === "string" ? t.dueDate.slice(0, 10) : (t.dueDate as Date).toISOString().slice(0, 10)) : "";
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
  showVoteFilter?: boolean;
}

export function TaskFilters({
  users,
  components,
  filters,
  onFiltersChange,
  stages,
  showVoteFilter = true,
}: TaskFiltersProps) {
  const { t, language } = useI18n();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        <Filter className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{t.common.filter}</span>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">{t.filter.staff}</Label>
        <Select
          value={filters.staffId}
          onValueChange={(v) => onFiltersChange({ staffId: v })}
        >
          <SelectTrigger className="w-[160px] h-9 bg-background">
            <SelectValue placeholder={t.filter.allStaff} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filter.allStaff}</SelectItem>
            {users
              .filter((u) => u.isActive !== false)
              .map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.displayName || u.email || u.id}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">{t.filter.component}</Label>
        <Select
          value={filters.componentId}
          onValueChange={(v) => onFiltersChange({ componentId: v })}
        >
          <SelectTrigger className="w-[180px] h-9 bg-background">
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
        <Label className="text-xs text-muted-foreground">{t.filter.stage}</Label>
        <Select
          value={filters.stage}
          onValueChange={(v) => onFiltersChange({ stage: v })}
        >
          <SelectTrigger className="w-[140px] h-9 bg-background">
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
        <Label className="text-xs text-muted-foreground">{t.filter.status}</Label>
        <Select
          value={filters.status}
          onValueChange={(v) => onFiltersChange({ status: v })}
        >
          <SelectTrigger className="w-[150px] h-9 bg-background">
            <SelectValue placeholder={t.filter.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.dashboard.allStatus}</SelectItem>
            <SelectItem value="Not Started">{t.status.notStarted}</SelectItem>
            <SelectItem value="In Progress">{t.status.inProgress}</SelectItem>
            <SelectItem value="Completed">{t.status.completed}</SelectItem>
            <SelectItem value="Blocked">{t.status.blocked}</SelectItem>
            <SelectItem value="Cancelled">{t.status.cancelled}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showVoteFilter && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{t.filter.vote}</Label>
          <Select
            value={filters.vote}
            onValueChange={(v) => onFiltersChange({ vote: v })}
          >
            <SelectTrigger className="w-[160px] h-9 bg-background">
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
                {language === "vi" ? "Không hoàn thành" : "Not completed"}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">{t.filter.dateFrom}</Label>
        <DateInput
          value={filters.dateFrom || null}
          onChange={(v) => onFiltersChange({ dateFrom: v ?? "" })}
          placeholder="dd/mm/yyyy"
          className="h-9 w-[120px] bg-background"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">{t.filter.dateTo}</Label>
        <DateInput
          value={filters.dateTo || null}
          onChange={(v) => onFiltersChange({ dateTo: v ?? "" })}
          placeholder="dd/mm/yyyy"
          className="h-9 w-[120px] bg-background"
        />
      </div>
    </div>
  );
}
