import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DayPicker } from "react-day-picker";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { TaskWithAssignmentDetails } from "@shared/schema";

import { cn, formatDateDDMMYYYY } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { useUpdateTask } from "@/hooks/use-tasks";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

type DateField = "dueDate" | "receivedAt";
type CalendarView = "month" | "week" | "day";
type GoogleCalendarSyncStatus = {
  connected: boolean;
  syncEnabled: boolean;
  calendarId: string;
  syncDateField: DateField;
};
type GoogleCalendarSyncSummary = GoogleCalendarSyncStatus & {
  totalAssignments: number;
  created: number;
  updated: number;
  deleted: number;
  skippedNoDate: number;
  skippedNoClient: number;
  skippedDisabled: number;
  skippedNoEventId: number;
  errors: number;
};
type GoogleCalendarCleanupSummary = {
  calendarId: string;
  scanned: number;
  candidates: number;
  groups: number;
  deletedEvents: number;
  linked: number;
  updatedLinks: number;
  deletedLinks: number;
  orphanGroupsDeleted: number;
  errors: number;
};

function toDateKey(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const yyyy = String(value.getFullYear());
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateKeyToLocalDate(key: string): Date | null {
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function getGoogleCalendarTemplateUrl(params: {
  title: string;
  details?: string;
  dateKey?: string | null;
}): string {
  const u = new URL("https://calendar.google.com/calendar/render");
  u.searchParams.set("action", "TEMPLATE");
  u.searchParams.set("text", params.title);
  if (params.details) u.searchParams.set("details", params.details);
  if (params.dateKey) {
    const d0 = dateKeyToLocalDate(params.dateKey);
    if (d0) {
      const start = format(d0, "yyyyMMdd");
      const end = format(addDays(d0, 1), "yyyyMMdd");
      u.searchParams.set("dates", `${start}/${end}`);
    }
  }
  return u.toString();
}

function isValidGoogleCalendarEmbedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    if (!host.endsWith("google.com")) return false;
    if (!u.pathname.includes("/calendar/")) return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeAssigneeName(
  value: string | null | undefined,
): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function stringToHslColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 45%)`;
}
function getDefaultStatusClasses(status: string | null | undefined): string {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "completed") return "bg-emerald-100 text-emerald-900";
  if (s === "in_progress" || s === "in progress")
    return "bg-blue-100 text-blue-900";
  if (s === "pending" || s === "paused") return "bg-amber-100 text-amber-900";
  if (s === "cancelled" || s === "canceled") return "bg-rose-100 text-rose-900";
  return "bg-slate-100 text-slate-900";
}

function getTaskAssignees(task: TaskWithAssignmentDetails): string[] {
  const fromAssignments = Array.isArray(task.assignments)
    ? (task.assignments as any[])
        .map((a) => normalizeAssigneeName(a?.displayName))
        .filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  if (fromAssignments.length > 0) return Array.from(new Set(fromAssignments));
  const fromAssigneeField = normalizeAssigneeName(task.assignee);
  if (!fromAssigneeField) return [];
  const parts = fromAssigneeField
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

function buildAssignmentsWithMovedDate(params: {
  task: TaskWithAssignmentDetails;
  dateField: DateField;
  newDateKey: string;
}): any[] | null {
  const list = Array.isArray(params.task.assignments)
    ? (params.task.assignments as any[])
    : null;
  if (!list || list.length === 0) return null;

  const hasAnyField = list.some((a) => a && a[params.dateField] != null);
  const target =
    params.dateField === "dueDate"
      ? { dueDate: params.newDateKey }
      : { receivedAt: params.newDateKey };

  const mapRow = (a: any) => ({
    userId: a.userId,
    stageType: a.stageType,
    roundNumber: a.roundNumber ?? 1,
    receivedAt: a.receivedAt ?? null,
    dueDate: a.dueDate ?? null,
    completedAt: a.completedAt ?? null,
    status: a.status ?? "not_started",
    progress: a.progress ?? 0,
    notes: a.notes ?? null,
  });

  if (hasAnyField) {
    return list.map((a) => {
      const base = mapRow(a);
      const shouldUpdate =
        params.dateField === "dueDate"
          ? base.dueDate != null
          : base.receivedAt != null;
      return shouldUpdate ? { ...base, ...target } : base;
    });
  }

  return list.map((a) => ({ ...mapRow(a), ...target }));
}

function DroppableDayCell({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative",
        className,
        isOver
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
          : "",
      )}>
      {children}
    </div>
  );
}

function DraggableTaskChip({
  task,
  compact,
  onClick,
}: {
  task: TaskWithAssignmentDetails;
  compact?: boolean;
  onClick: () => void;
}) {
  const id = `task|${task.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
    });
  const assignees = getTaskAssignees(task);
  const style = transform
    ? {
        transform: `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`,
      }
    : undefined;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full text-left rounded-sm px-2 py-1 text-[11px] leading-4 transition-colors",
        "border border-border/30 hover:border-border/60",
        getDefaultStatusClasses(task.status ?? null),
        compact ? "py-0.5" : "",
        isDragging ? "opacity-50" : "",
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{task.title}</div>
        </div>
        {assignees.length > 0 && !compact ? (
          <div className="text-[10px] text-muted-foreground shrink-0 truncate max-w-[120px]">
            {assignees.join(", ")}
          </div>
        ) : null}
      </div>
    </button>
  );
}

export interface TaskCalendarViewProps {
  tasks: TaskWithAssignmentDetails[];
  onTaskClick: (task: TaskWithAssignmentDetails) => void;
  getPriorityColor?: (priority: string) => string;
  getStatusColor?: (status: string) => string;
}

export function TaskCalendarView({
  tasks,
  onTaskClick,
  getPriorityColor = () => "bg-slate-100 text-slate-700",
  getStatusColor = () => "bg-slate-100 text-slate-700",
}: TaskCalendarViewProps) {
  const { language } = useI18n();
  const { toast } = useToast();
  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask();

  const [dateField, setDateField] = useState<DateField>("dueDate");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null);

  const [googleEmbedUrl, setGoogleEmbedUrl] = useState("");
  const [googleEmbedDraft, setGoogleEmbedDraft] = useState("");
  const [gcalStatus, setGcalStatus] = useState<GoogleCalendarSyncStatus | null>(
    null,
  );
  const [gcalCalendarId, setGcalCalendarId] = useState("primary");
  const [gcalBusy, setGcalBusy] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalCleaning, setGcalCleaning] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v =
      window.localStorage.getItem("kdpd_google_calendar_embed_url") ?? "";
    setGoogleEmbedUrl(v);
    setGoogleEmbedDraft(v);
  }, []);

  const fetchGoogleCalendarStatus = async () => {
    try {
      setGcalBusy(true);
      const res = await fetch("/api/google-calendar/status", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load Google Calendar status");
      const data = (await res.json()) as GoogleCalendarSyncStatus;
      setGcalStatus(data);
      setGcalCalendarId(data.calendarId || "primary");
    } catch (err) {
      toast({
        title: language === "vi" ? "Không thể tải trạng thái" : "Load failed",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setGcalBusy(false);
    }
  };

  const saveGoogleCalendarSettings = async (payload: {
    syncEnabled?: boolean;
    calendarId?: string;
    syncDateField?: DateField;
  }) => {
    try {
      setGcalBusy(true);
      const res = await fetch("/api/google-calendar/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(e?.message || "Failed");
      }
      const data = (await res.json()) as GoogleCalendarSyncStatus;
      setGcalStatus(data);
      setGcalCalendarId(data.calendarId || "primary");
      toast({
        title: language === "vi" ? "Đã lưu" : "Saved",
        description:
          language === "vi"
            ? "Đã cập nhật cấu hình đồng bộ."
            : "Settings updated.",
      });
    } catch (err) {
      toast({
        title: language === "vi" ? "Không thể lưu" : "Save failed",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setGcalBusy(false);
    }
  };

  const syncGoogleCalendarNow = async () => {
    try {
      setGcalSyncing(true);
      const res = await fetch("/api/google-calendar/sync-now", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(e?.message || "Failed");
      }
      const summary = (await res.json()) as GoogleCalendarSyncSummary;
      const changed =
        (summary.created ?? 0) +
        (summary.updated ?? 0) +
        (summary.deleted ?? 0);
      const detailVi =
        `calendarId=${summary.calendarId || "primary"} · ` +
        `tạo ${summary.created ?? 0}, cập nhật ${summary.updated ?? 0}, xoá ${summary.deleted ?? 0}` +
        (summary.skippedNoDate
          ? `, bỏ qua ${summary.skippedNoDate} (không có ngày)`
          : "") +
        (summary.errors ? `, lỗi ${summary.errors}` : "");
      const detailEn =
        `calendarId=${summary.calendarId || "primary"} · ` +
        `created ${summary.created ?? 0}, updated ${summary.updated ?? 0}, deleted ${summary.deleted ?? 0}` +
        (summary.skippedNoDate
          ? `, skipped ${summary.skippedNoDate} (no date)`
          : "") +
        (summary.errors ? `, errors ${summary.errors}` : "");
      toast({
        title: language === "vi" ? "Đã đồng bộ" : "Synced",
        description:
          language === "vi"
            ? changed > 0
              ? detailVi
              : `Không có sự kiện nào được tạo/cập nhật. ${detailVi}`
            : changed > 0
              ? detailEn
              : `No events were created/updated. ${detailEn}`,
      });
    } catch (err) {
      toast({
        title: language === "vi" ? "Đồng bộ thất bại" : "Sync failed",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setGcalSyncing(false);
    }
  };

  const cleanupGoogleCalendarNow = async () => {
    try {
      setGcalCleaning(true);
      const res = await fetch("/api/google-calendar/cleanup", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(e?.message || "Failed");
      }
      const summary = (await res.json()) as GoogleCalendarCleanupSummary;
      const detailVi =
        `calendarId=${summary.calendarId || "primary"} · ` +
        `xoá event ${summary.deletedEvents ?? 0}, xoá link ${summary.deletedLinks ?? 0}` +
        (summary.orphanGroupsDeleted
          ? `, xoá orphan ${summary.orphanGroupsDeleted}`
          : "") +
        (summary.errors ? `, lỗi ${summary.errors}` : "");
      const detailEn =
        `calendarId=${summary.calendarId || "primary"} · ` +
        `deleted events ${summary.deletedEvents ?? 0}, deleted links ${
          summary.deletedLinks ?? 0
        }` +
        (summary.orphanGroupsDeleted
          ? `, orphan deleted ${summary.orphanGroupsDeleted}`
          : "") +
        (summary.errors ? `, errors ${summary.errors}` : "");
      toast({
        title: language === "vi" ? "Đã dọn trùng" : "Cleanup done",
        description: language === "vi" ? detailVi : detailEn,
      });
    } catch (err) {
      toast({
        title: language === "vi" ? "Dọn trùng thất bại" : "Cleanup failed",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setGcalCleaning(false);
    }
  };

  const disconnectGoogleCalendarNow = async () => {
    try {
      setGcalBusy(true);
      const res = await fetch("/api/google-calendar/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(e?.message || "Failed");
      }
      setGcalStatus({
        connected: false,
        syncEnabled: false,
        calendarId: "primary",
        syncDateField: "dueDate",
      });
      setGcalCalendarId("primary");
      toast({
        title: language === "vi" ? "Đã ngắt kết nối" : "Disconnected",
      });
    } catch (err) {
      toast({
        title: language === "vi" ? "Không thể ngắt" : "Disconnect failed",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setGcalBusy(false);
    }
  };

  useEffect(() => {
    void fetchGoogleCalendarStatus();
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("gcal") === "connected") {
      url.searchParams.delete("gcal");
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const tasksByDateKey = useMemo(() => {
    const map = new Map<string, TaskWithAssignmentDetails[]>();
    for (const task of tasks) {
      const key =
        dateField === "dueDate"
          ? toDateKey(task.dueDate ?? null)
          : toDateKey(task.receivedAt ?? null);
      if (!key) continue;
      const prev = map.get(key);
      if (prev) prev.push(task);
      else map.set(key, [task]);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => {
        const ap = String(a.priority ?? "");
        const bp = String(b.priority ?? "");
        const order: Record<string, number> = {
          Critical: 0,
          High: 1,
          Medium: 2,
          Low: 3,
        };
        const ao = order[ap] ?? 9;
        const bo = order[bp] ?? 9;
        if (ao !== bo) return ao - bo;
        return String(a.title ?? "").localeCompare(String(b.title ?? ""));
      });
      map.set(k, list);
    }
    return map;
  }, [tasks, dateField]);

  const selectedDateKey = useMemo(
    () => toDateKey(selectedDate ?? null),
    [selectedDate],
  );
  const tasksInSelectedDate = useMemo(
    () => (selectedDateKey ? (tasksByDateKey.get(selectedDateKey) ?? []) : []),
    [tasksByDateKey, selectedDateKey],
  );

  const modifiers = useMemo(() => {
    return {
      hasTasks: (date: Date) => {
        const key = toDateKey(date);
        return key ? tasksByDateKey.has(key) : false;
      },
    };
  }, [tasksByDateKey]);

  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [k, list] of tasksByDateKey.entries()) counts[k] = list.length;
    return counts;
  }, [tasksByDateKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const weekStart = useMemo(() => {
    const d = selectedDate ?? new Date();
    return startOfWeek(d, { weekStartsOn: 1 });
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => addDays(weekStart, idx));
  }, [weekStart]);

  const monthStart = useMemo(() => {
    const d = selectedDate ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [selectedDate]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragTaskId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTaskId(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;
    if (!activeId.startsWith("task|")) return;
    if (!overId.startsWith("date|")) return;
    const taskId = activeId.slice("task|".length);
    const newDateKey = overId.slice("date|".length);
    const task = tasks.find((t) => String(t.id) === taskId);
    if (!task) return;

    const currentKey =
      dateField === "dueDate"
        ? toDateKey(task.dueDate ?? null)
        : toDateKey(task.receivedAt ?? null);
    if (currentKey === newDateKey) return;

    const assignments = buildAssignmentsWithMovedDate({
      task,
      dateField,
      newDateKey,
    });

    if (!assignments) {
      toast({
        title: language === "vi" ? "Không thể đổi ngày" : "Cannot move date",
        description:
          language === "vi"
            ? "Công việc chưa có assignments để cập nhật ngày."
            : "Task has no assignments to update dates.",
        variant: "destructive",
      });
      return;
    }

    updateTask({ id: taskId, assignments } as any);
  };

  const activeDragTask = useMemo(() => {
    if (!activeDragTaskId || !activeDragTaskId.startsWith("task|")) return null;
    const tid = activeDragTaskId.slice("task|".length);
    return tasks.find((t) => String(t.id) === tid) ?? null;
  }, [activeDragTaskId, tasks]);

  const onPrev = () => {
    if (calendarView === "day")
      setSelectedDate((d) => subDays(d ?? new Date(), 1));
    else if (calendarView === "week")
      setSelectedDate((d) => subWeeks(d ?? new Date(), 1));
    else if (calendarView === "month")
      setSelectedDate((d) => subMonths(d ?? new Date(), 1));
  };

  const onNext = () => {
    if (calendarView === "day")
      setSelectedDate((d) => addDays(d ?? new Date(), 1));
    else if (calendarView === "week")
      setSelectedDate((d) => addWeeks(d ?? new Date(), 1));
    else if (calendarView === "month")
      setSelectedDate((d) => addMonths(d ?? new Date(), 1));
  };

  const headerRangeLabel = useMemo(() => {
    if (calendarView === "day") {
      return selectedDate ? format(selectedDate, "dd/MM/yyyy") : "—";
    }
    if (calendarView === "week") {
      const start = weekStart;
      const end = addDays(weekStart, 6);
      return `${format(start, "dd/MM")} – ${format(end, "dd/MM/yyyy")}`;
    }
    const m = monthStart.getMonth() + 1;
    const y = monthStart.getFullYear();
    return language === "vi"
      ? `Tháng ${m}, ${y}`
      : format(monthStart, "MMMM yyyy");
  }, [calendarView, selectedDate, weekStart, language, monthStart]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
      <div className="space-y-4">
        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border bg-background">
            <CardTitle className="text-sm font-semibold">
              {language === "vi" ? "Tháng" : "Month"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={monthStart}
              onMonthChange={(m) => setSelectedDate(m)}
              showOutsideDays
              weekStartsOn={1}
              locale={language === "vi" ? vi : undefined}
              captionLayout="buttons"
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "flex items-center justify-between px-1",
                caption_label: "text-sm font-medium",
                nav: "flex items-center gap-1",
                nav_button: cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-7 w-7 p-0",
                ),
                table: "w-full border-collapse space-y-1 mt-1",
                head_row: "grid grid-cols-7",
                head_cell:
                  "text-muted-foreground font-medium text-[10px] text-center py-1",
                row: "grid grid-cols-7",
                cell: "p-0",
                day: cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-full",
                ),
                day_selected:
                  "bg-primary text-primary-foreground hover:bg-primary focus:bg-primary",
                day_today: "border border-primary/60",
                day_outside: "text-muted-foreground/60",
              }}
            />
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border bg-background">
            <CardTitle className="text-sm font-semibold">
              {language === "vi" ? "Chi tiết trong ngày" : "Day details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-3 bg-background">
              <div className="text-sm font-medium">
                {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                {tasksInSelectedDate.length}{" "}
                {language === "vi" ? "công việc" : "tasks"}
              </div>
            </div>
            <ScrollArea className="h-[320px]">
              <div className="p-3 space-y-2">
                {tasksInSelectedDate.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    {language === "vi" ? "Không có công việc." : "No tasks."}
                  </div>
                ) : (
                  tasksInSelectedDate.map((task) => {
                    const dateKey =
                      dateField === "dueDate"
                        ? toDateKey(task.dueDate ?? null)
                        : toDateKey(task.receivedAt ?? null);
                    const gcal = getGoogleCalendarTemplateUrl({
                      title: task.title ?? "",
                      details: task.description ?? undefined,
                      dateKey,
                    });
                    return (
                      <div
                        key={task.id}
                        className="border border-border/60 rounded-md p-3 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            className="text-left min-w-0 flex-1"
                            onClick={() => onTaskClick(task)}>
                            <div className="font-medium text-sm truncate">
                              {task.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1">
                              <span className="truncate">
                                {language === "vi" ? "Nhân sự:" : "Assignee:"}{" "}
                                {task.assignee?.trim() ||
                                  (language === "vi"
                                    ? "Chưa giao"
                                    : "Unassigned")}
                              </span>
                              {dateField === "dueDate" ? (
                                <span>
                                  {language === "vi" ? "Hạn:" : "Due:"}{" "}
                                  {formatDateDDMMYYYY(task.dueDate)}
                                </span>
                              ) : (
                                <span>
                                  {language === "vi" ? "Nhận:" : "Received:"}{" "}
                                  {formatDateDDMMYYYY(task.receivedAt)}
                                </span>
                              )}
                            </div>
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              className={cn(
                                "font-normal",
                                getStatusColor(task.status ?? ""),
                              )}>
                              {task.status}
                            </Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                window.open(
                                  gcal,
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge
                            className={cn(
                              "font-normal",
                              getPriorityColor(task.priority ?? ""),
                            )}>
                            {task.priority}
                          </Badge>
                          {task.group ? (
                            <Badge variant="outline" className="font-normal">
                              {task.group}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border bg-background">
            <CardTitle className="text-sm font-semibold">
              Google Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <Tabs defaultValue="embed">
              <TabsList className="w-full">
                <TabsTrigger value="embed" className="flex-1">
                  {language === "vi" ? "Nhúng" : "Embed"}
                </TabsTrigger>
                <TabsTrigger value="open" className="flex-1">
                  {language === "vi" ? "Mở" : "Open"}
                </TabsTrigger>
                <TabsTrigger value="sync" className="flex-1">
                  {language === "vi" ? "Đồng bộ" : "Sync"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="embed" className="mt-3 space-y-3">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {language === "vi"
                      ? "Dán liên kết nhúng (embed) từ Google Calendar."
                      : "Paste an embed link from Google Calendar."}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={googleEmbedDraft}
                      onChange={(e) => setGoogleEmbedDraft(e.target.value)}
                      placeholder="https://calendar.google.com/..."
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const v = googleEmbedDraft.trim();
                        if (v && !isValidGoogleCalendarEmbedUrl(v)) {
                          toast({
                            title:
                              language === "vi"
                                ? "Liên kết không hợp lệ"
                                : "Invalid link",
                            description:
                              language === "vi"
                                ? "Vui lòng dùng liên kết nhúng từ Google Calendar."
                                : "Please use an embed link from Google Calendar.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setGoogleEmbedUrl(v);
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem(
                            "kdpd_google_calendar_embed_url",
                            v,
                          );
                        }
                        toast({
                          title: language === "vi" ? "Đã lưu" : "Saved",
                        });
                      }}>
                      {language === "vi" ? "Lưu" : "Save"}
                    </Button>
                  </div>
                </div>

                {googleEmbedUrl ? (
                  <div className="border border-border rounded-md overflow-hidden bg-background">
                    <iframe
                      title="Google Calendar"
                      src={googleEmbedUrl}
                      className="w-full h-[240px]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-md">
                    {language === "vi"
                      ? "Chưa có liên kết nhúng."
                      : "No embed link configured."}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="open" className="mt-3 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    window.open(
                      "https://calendar.google.com/calendar/u/0/r",
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }>
                  {language === "vi"
                    ? "Mở Google Calendar"
                    : "Open Google Calendar"}
                </Button>
                {selectedDateKey ? (
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      const u = new URL(
                        "https://calendar.google.com/calendar/u/0/r/day",
                      );
                      const dt = dateKeyToLocalDate(selectedDateKey);
                      if (dt)
                        u.searchParams.set("date", format(dt, "yyyyMMdd"));
                      window.open(
                        u.toString(),
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}>
                    {language === "vi"
                      ? "Mở đúng ngày đang chọn"
                      : "Open selected day"}
                  </Button>
                ) : null}
              </TabsContent>

              <TabsContent value="sync" className="mt-3 space-y-3">
                {gcalStatus?.connected ? (
                  <div className="flex items-center justify-between gap-3 border border-border/60 rounded-md px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {language === "vi" ? "Đã kết nối" : "Connected"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {language === "vi"
                          ? "Bật/tắt đồng bộ tự động."
                          : "Enable/disable auto-sync."}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={!!gcalStatus.syncEnabled}
                        disabled={gcalBusy}
                        onCheckedChange={(checked) =>
                          void saveGoogleCalendarSettings({
                            syncEnabled: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-md p-3 space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {language === "vi"
                        ? "Chưa kết nối Google Calendar."
                        : "Not connected to Google Calendar."}
                    </div>
                    <Button
                      type="button"
                      disabled={gcalBusy}
                      className="w-full"
                      onClick={() => {
                        const returnTo =
                          typeof window !== "undefined"
                            ? window.location.pathname +
                              window.location.search +
                              window.location.hash
                            : "/";
                        window.location.href =
                          "/api/google-calendar/connect?returnTo=" +
                          encodeURIComponent(returnTo);
                      }}>
                      {language === "vi"
                        ? "Kết nối Google Calendar"
                        : "Connect Google Calendar"}
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {language === "vi"
                      ? "Lịch đích (calendarId)"
                      : "Target calendarId"}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={gcalCalendarId}
                      onChange={(e) => setGcalCalendarId(e.target.value)}
                      placeholder="primary"
                      disabled={!gcalStatus?.connected || gcalBusy}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!gcalStatus?.connected || gcalBusy}
                      onClick={() =>
                        void saveGoogleCalendarSettings({
                          calendarId: gcalCalendarId,
                        })
                      }>
                      {language === "vi" ? "Lưu" : "Save"}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={
                      !gcalStatus?.connected ||
                      !gcalStatus.syncEnabled ||
                      gcalSyncing ||
                      gcalBusy
                    }
                    onClick={() => void syncGoogleCalendarNow()}
                    className="flex-1">
                    {language === "vi"
                      ? gcalSyncing
                        ? "Đang đồng bộ..."
                        : "Đồng bộ"
                      : gcalSyncing
                        ? "Syncing..."
                        : "Sync"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !gcalStatus?.connected || gcalBusy || gcalCleaning
                    }
                    onClick={() => void cleanupGoogleCalendarNow()}>
                    {language === "vi"
                      ? gcalCleaning
                        ? "Đang dọn..."
                        : "Dọn"
                      : gcalCleaning
                        ? "Cleaning..."
                        : "Cleanup"}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!gcalStatus?.connected || gcalBusy}
                  onClick={() => void disconnectGoogleCalendarNow()}
                  className="w-full">
                  {language === "vi" ? "Ngắt kết nối" : "Disconnect"}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-sm font-semibold">
                {language === "vi" ? "Lịch" : "Calendar"}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => setSelectedDate(new Date())}>
                {language === "vi" ? "Hôm nay" : "Today"}
              </Button>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onPrev}
                  aria-label={language === "vi" ? "Trước" : "Previous"}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onNext}
                  aria-label={language === "vi" ? "Sau" : "Next"}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-w-0">
                <div className="text-lg font-medium truncate leading-6">
                  {headerRangeLabel}
                </div>
                {isUpdating ? (
                  <div className="text-[11px] text-muted-foreground">
                    {language === "vi" ? "Đang cập nhật..." : "Updating..."}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <ToggleGroup
                type="single"
                value={calendarView}
                onValueChange={(v) =>
                  v &&
                  (v === "month" || v === "week" || v === "day") &&
                  setCalendarView(v as CalendarView)
                }
                className="bg-muted/30 rounded-full p-1 border border-border/60">
                <ToggleGroupItem
                  value="month"
                  aria-label="Month"
                  className="rounded-full px-3">
                  {language === "vi" ? "Tháng" : "Month"}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="week"
                  aria-label="Week"
                  className="rounded-full px-3">
                  {language === "vi" ? "Tuần" : "Week"}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="day"
                  aria-label="Day"
                  className="rounded-full px-3">
                  {language === "vi" ? "Ngày" : "Day"}
                </ToggleGroupItem>
              </ToggleGroup>

              <ToggleGroup
                type="single"
                value={dateField}
                onValueChange={(v) =>
                  v &&
                  (v === "dueDate" || v === "receivedAt") &&
                  setDateField(v as DateField)
                }
                className="bg-muted/30 rounded-full p-1 border border-border/60">
                <ToggleGroupItem
                  value="dueDate"
                  aria-label={language === "vi" ? "Theo hạn" : "By due date"}
                  className="rounded-full px-3">
                  {language === "vi" ? "Theo hạn" : "Due"}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="receivedAt"
                  aria-label={
                    language === "vi" ? "Theo ngày nhận" : "By received date"
                  }
                  className="rounded-full px-3">
                  {language === "vi" ? "Ngày nhận" : "Received"}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}>
            {calendarView === "month" ? (
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                month={monthStart}
                onMonthChange={(m) => setSelectedDate(m)}
                showOutsideDays
                weekStartsOn={1}
                locale={language === "vi" ? vi : undefined}
                captionLayout="buttons"
                modifiers={modifiers}
                className="p-2"
                classNames={{
                  months: "flex flex-col space-y-4",
                  month: "space-y-2",
                  caption: "hidden",
                  caption_label: "hidden",
                  nav: "hidden",
                  table: "w-full border-collapse space-y-0.5 mt-1",
                  head_row: "grid grid-cols-7 mb-0.5",
                  head_cell:
                    "text-muted-foreground rounded-md font-medium text-[11px] text-center py-1",
                  row: "grid grid-cols-7",
                  cell: "p-0 border border-border/30 h-24 align-top relative bg-background",
                  day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-full w-full p-1 font-normal aria-selected:opacity-100 rounded-none flex flex-col items-stretch justify-start hover:bg-muted/30",
                  ),
                  day_selected:
                    "bg-primary/10 text-foreground hover:bg-primary/15 focus:bg-primary/15",
                  day_today: "",
                  day_outside:
                    "day-outside text-muted-foreground/70 bg-muted/5",
                }}
                components={{
                  DayContent: ({ date, activeModifiers }) => {
                    const key = toDateKey(date) ?? "";
                    const count = key ? (taskCounts[key] ?? 0) : 0;
                    const isSelected = activeModifiers?.selected ?? false;
                    const isToday = activeModifiers?.today ?? false;
                    const hasTasks = activeModifiers?.hasTasks ?? false;
                    return (
                      <div
                        className={cn(
                          "h-full w-full flex flex-col gap-1",
                          isSelected && "font-semibold",
                          isToday && !isSelected && "font-semibold",
                        )}>
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={cn(
                              "text-xs tabular-nums inline-flex items-center justify-center h-6 min-w-6 px-1 rounded-full",
                              isToday
                                ? "bg-primary text-primary-foreground"
                                : "",
                            )}>
                            {date.getDate()}
                          </div>
                        </div>
                        {hasTasks ? (
                          <div className="flex flex-col gap-1 overflow-hidden">
                            {(tasksByDateKey.get(key) ?? [])
                              .slice(0, 3)
                              .map((t) => (
                                <button
                                  type="button"
                                  key={t.id}
                                  className={cn(
                                    "w-full text-left text-[11px] leading-4 truncate px-1.5 py-0.5 rounded-sm",
                                    "border border-border/40 bg-muted/20 hover:bg-muted/30 transition-colors",
                                    getStatusColor(t.status ?? ""),
                                  )}
                                  onClick={() => onTaskClick(t)}>
                                  {t.title}
                                </button>
                              ))}
                            {count > 3 ? (
                              <button
                                type="button"
                                className="text-[11px] leading-4 text-muted-foreground truncate px-1.5 text-left hover:underline"
                                onClick={() => {
                                  setSelectedDate(date);
                                  setCalendarView("day");
                                }}>
                                {language === "vi"
                                  ? `${count - 3} mục khác`
                                  : `${count - 3} more`}
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex-1" />
                        )}
                      </div>
                    );
                  },
                }}
              />
            ) : calendarView === "week" ? (
              <div className="p-3">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {weekDays.map((d) => {
                    const key = toDateKey(d);
                    const isSel = key && key === selectedDateKey;
                    const isToday = key && key === toDateKey(new Date());
                    return (
                      <div
                        key={d.toISOString()}
                        className="px-1 flex items-center gap-2">
                        <div className="text-[11px] font-medium text-muted-foreground">
                          {language === "vi"
                            ? format(d, "EEE")
                            : format(d, "EEE")}
                        </div>
                        <div
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-sm font-medium",
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : isSel
                                ? "bg-primary/10 text-primary"
                                : "text-foreground",
                          )}>
                          {format(d, "d")}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((d) => {
                    const key = toDateKey(d) ?? "";
                    const list = key ? (tasksByDateKey.get(key) ?? []) : [];
                    return (
                      <DroppableDayCell
                        key={key}
                        id={`date|${key}`}
                        className={cn(
                          "border border-border/60 rounded-md bg-background overflow-hidden",
                          key === selectedDateKey
                            ? "ring-2 ring-primary/60"
                            : "",
                        )}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 border-b border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors"
                          onClick={() => setSelectedDate(d)}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {format(d, "dd/MM")}
                            </span>
                            {list.length > 0 ? (
                              <Badge
                                variant="secondary"
                                className="font-normal">
                                {list.length}
                              </Badge>
                            ) : null}
                          </div>
                        </button>
                        <div className="p-2 space-y-1">
                          {list.length === 0 ? (
                            <div className="text-xs text-muted-foreground px-1 py-2">
                              {language === "vi" ? "Trống" : "Empty"}
                            </div>
                          ) : (
                            list
                              .slice(0, 8)
                              .map((t) => (
                                <DraggableTaskChip
                                  key={t.id}
                                  task={t}
                                  compact
                                  onClick={() => onTaskClick(t)}
                                />
                              ))
                          )}
                          {list.length > 8 ? (
                            <div className="text-xs text-muted-foreground px-1 py-1">
                              {language === "vi"
                                ? `+${list.length - 8} công việc`
                                : `+${list.length - 8} tasks`}
                            </div>
                          ) : null}
                        </div>
                      </DroppableDayCell>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3">
                <DroppableDayCell
                  id={`date|${selectedDateKey ?? ""}`}
                  className="border border-border/60 rounded-md bg-background overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-3">
                    <div className="font-medium">
                      {selectedDate
                        ? language === "vi"
                          ? format(selectedDate, "EEEE dd/MM/yyyy")
                          : format(selectedDate, "EEEE MMM dd, yyyy")
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tasksInSelectedDate.length}{" "}
                      {language === "vi" ? "công việc" : "tasks"}
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    {tasksInSelectedDate.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        {language === "vi"
                          ? "Không có công việc."
                          : "No tasks."}
                      </div>
                    ) : (
                      tasksInSelectedDate.map((t) => (
                        <DraggableTaskChip
                          key={t.id}
                          task={t}
                          onClick={() => onTaskClick(t)}
                        />
                      ))
                    )}
                  </div>
                </DroppableDayCell>
              </div>
            )}

            <DragOverlay>
              {activeDragTask ? (
                <div className="w-[260px]">
                  <DraggableTaskChip task={activeDragTask} onClick={() => {}} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}
