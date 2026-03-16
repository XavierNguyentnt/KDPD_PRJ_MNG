import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DayPicker } from "react-day-picker";
import {
  addDays,
  addWeeks,
  format,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
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

function getTaskAssignees(task: TaskWithAssignmentDetails): string[] {
  const fromAssignments = Array.isArray(task.assignments)
    ? task.assignments
        .map((a: any) => normalizeAssigneeName(a?.displayName))
        .filter((x: any): x is string => typeof x === "string")
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
        "w-full text-left rounded-md border border-border/60 bg-background px-2 py-1 text-xs leading-4 shadow-sm hover:bg-muted/20 transition-colors",
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
        {assignees.length > 0 ? (
          <div className="flex items-center gap-1 shrink-0">
            {assignees.slice(0, 3).map((name) => (
              <span
                key={name}
                title={name}
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: stringToHslColor(name) }}
              />
            ))}
            {assignees.length > 3 ? (
              <span className="text-[10px] text-muted-foreground">
                +{assignees.length - 3}
              </span>
            ) : null}
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
  const [gcalSyncDateField, setGcalSyncDateField] =
    useState<DateField>("dueDate");
  const [gcalBusy, setGcalBusy] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);

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
      setGcalSyncDateField(
        data.syncDateField === "receivedAt" ? "receivedAt" : "dueDate",
      );
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
      setGcalSyncDateField(
        data.syncDateField === "receivedAt" ? "receivedAt" : "dueDate",
      );
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
      const changed = (summary.created ?? 0) + (summary.updated ?? 0) + (summary.deleted ?? 0);
      const detailVi =
        `calendarId=${summary.calendarId || "primary"} · ` +
        `tạo ${summary.created ?? 0}, cập nhật ${summary.updated ?? 0}, xoá ${summary.deleted ?? 0}` +
        (summary.skippedNoDate ? `, bỏ qua ${summary.skippedNoDate} (không có ngày)` : "") +
        (summary.errors ? `, lỗi ${summary.errors}` : "");
      const detailEn =
        `calendarId=${summary.calendarId || "primary"} · ` +
        `created ${summary.created ?? 0}, updated ${summary.updated ?? 0}, deleted ${summary.deleted ?? 0}` +
        (summary.skippedNoDate ? `, skipped ${summary.skippedNoDate} (no date)` : "") +
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
      setGcalSyncDateField("dueDate");
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
  };

  const onNext = () => {
    if (calendarView === "day")
      setSelectedDate((d) => addDays(d ?? new Date(), 1));
    else if (calendarView === "week")
      setSelectedDate((d) => addWeeks(d ?? new Date(), 1));
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
    return language === "vi" ? "Tháng" : "Month";
  }, [calendarView, selectedDate, weekStart, language]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3 border border-border shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-border bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">
                {language === "vi" ? "Lịch công việc" : "Task calendar"}
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-0.5">
                {headerRangeLabel}
                {isUpdating ? (
                  <span className="ml-2">
                    {language === "vi" ? "Đang cập nhật..." : "Updating..."}
                  </span>
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
                className="border rounded-md bg-background">
                <ToggleGroupItem value="month" aria-label="Month">
                  {language === "vi" ? "Tháng" : "Month"}
                </ToggleGroupItem>
                <ToggleGroupItem value="week" aria-label="Week">
                  {language === "vi" ? "Tuần" : "Week"}
                </ToggleGroupItem>
                <ToggleGroupItem value="day" aria-label="Day">
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
                className="border rounded-md bg-background">
                <ToggleGroupItem
                  value="dueDate"
                  aria-label={language === "vi" ? "Theo hạn" : "By due date"}>
                  {language === "vi" ? "Theo hạn" : "Due"}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="receivedAt"
                  aria-label={
                    language === "vi" ? "Theo ngày nhận" : "By received date"
                  }>
                  {language === "vi" ? "Ngày nhận" : "Received"}
                </ToggleGroupItem>
              </ToggleGroup>

              {calendarView === "week" || calendarView === "day" ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={onPrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() => setSelectedDate(new Date())}>
                    {language === "vi" ? "Hôm nay" : "Today"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={onNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
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
                showOutsideDays
                weekStartsOn={1}
                captionLayout="dropdown"
                fromYear={2020}
                toYear={2035}
                modifiers={modifiers}
                className="p-3"
                classNames={{
                  months: "flex flex-col space-y-4",
                  month: "space-y-2",
                  caption:
                    "flex justify-center pt-2 pb-2 relative items-center mb-1",
                  caption_label: "text-sm font-medium hidden",
                  caption_dropdowns:
                    "flex justify-center items-center gap-2.5 pb-1",
                  dropdown: cn(
                    "h-8 px-3 pr-8 text-sm font-medium",
                    "border border-input bg-background rounded-md",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                    "transition-colors cursor-pointer",
                    "shadow-sm",
                  ),
                  dropdown_month: cn(
                    "h-8 px-3 pr-8 text-sm font-medium min-w-[130px]",
                    "border border-input bg-background rounded-md",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                    "transition-colors cursor-pointer",
                    "shadow-sm",
                  ),
                  dropdown_year: cn(
                    "h-8 px-3 pr-8 text-sm font-medium min-w-[100px]",
                    "border border-input bg-background rounded-md",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                    "transition-colors cursor-pointer",
                    "shadow-sm",
                  ),
                  dropdown_icon: "hidden",
                  nav: "hidden",
                  table: "w-full border-collapse space-y-1 mt-1",
                  head_row: "grid grid-cols-7 mb-1",
                  head_cell:
                    "text-muted-foreground rounded-md font-medium text-[0.75rem] uppercase tracking-wider text-center py-1",
                  row: "grid grid-cols-7",
                  cell: "p-0 border border-border/40 h-24 align-top relative",
                  day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-full w-full p-1 font-normal aria-selected:opacity-100 rounded-none flex flex-col items-stretch justify-start hover:bg-muted/40",
                  ),
                  day_selected:
                    "bg-primary/10 text-foreground hover:bg-primary/15 focus:bg-primary/15",
                  day_today: "bg-accent/60 text-accent-foreground",
                  day_outside: "day-outside text-muted-foreground bg-muted/10",
                }}
                components={{
                  IconLeft: ({ className, ...props }) => (
                    <ChevronLeft
                      className={cn("h-4 w-4", className)}
                      {...props}
                    />
                  ),
                  IconRight: ({ className, ...props }) => (
                    <ChevronRight
                      className={cn("h-4 w-4", className)}
                      {...props}
                    />
                  ),
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
                          <div className="text-xs tabular-nums">
                            {date.getDate()}
                          </div>
                          {hasTasks ? (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "px-1.5 py-0 text-[10px] leading-4 font-medium",
                                isSelected ? "bg-primary/20" : "",
                              )}>
                              {count}
                            </Badge>
                          ) : null}
                        </div>
                        {hasTasks ? (
                          <div className="flex flex-col gap-1 overflow-hidden">
                            {(tasksByDateKey.get(key) ?? [])
                              .slice(0, 2)
                              .map((t) => (
                                <div
                                  key={t.id}
                                  className="text-[11px] leading-4 truncate px-1 py-0.5 rounded bg-muted/30">
                                  {t.title}
                                </div>
                              ))}
                            {count > 2 ? (
                              <div className="text-[11px] leading-4 text-muted-foreground truncate px-1">
                                {language === "vi"
                                  ? `+${count - 2} việc`
                                  : `+${count - 2} more`}
                              </div>
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
                  {weekDays.map((d) => (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        "text-xs font-medium text-muted-foreground px-1",
                        toDateKey(d) === selectedDateKey
                          ? "text-foreground"
                          : "",
                      )}>
                      {language === "vi"
                        ? format(d, "EEE dd/MM")
                        : format(d, "EEE MMM dd")}
                    </div>
                  ))}
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

      <div className="lg:col-span-2 space-y-6">
        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="py-4 px-5 border-b border-border bg-muted/20">
            <CardTitle className="text-base font-semibold">
              {language === "vi" ? "Chi tiết trong ngày" : "Day details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
              <div className="text-sm font-medium">
                {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                {tasksInSelectedDate.length}{" "}
                {language === "vi" ? "công việc" : "tasks"}
              </div>
            </div>
            <ScrollArea className="h-[340px]">
              <div className="p-4 space-y-2">
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
          <CardHeader className="py-4 px-5 border-b border-border bg-muted/20">
            <CardTitle className="text-base font-semibold">
              {language === "vi" ? "Google Calendar" : "Google Calendar"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Tabs defaultValue="embed">
              <TabsList className="w-full">
                <TabsTrigger value="embed" className="flex-1">
                  {language === "vi" ? "Nhúng lịch" : "Embed"}
                </TabsTrigger>
                <TabsTrigger value="open" className="flex-1">
                  {language === "vi" ? "Mở Google Calendar" : "Open"}
                </TabsTrigger>
                <TabsTrigger value="sync" className="flex-1">
                  {language === "vi" ? "Đồng bộ" : "Sync"}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="embed" className="mt-4 space-y-3">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {language === "vi"
                      ? "Dán liên kết nhúng (embed) của Google Calendar (calendar.google.com)."
                      : "Paste a Google Calendar embed link (calendar.google.com)."}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={googleEmbedDraft}
                      onChange={(e) => setGoogleEmbedDraft(e.target.value)}
                      placeholder={
                        language === "vi"
                          ? "https://calendar.google.com/..."
                          : "https://calendar.google.com/..."
                      }
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
                          description:
                            language === "vi"
                              ? "Đã lưu liên kết Google Calendar trên trình duyệt."
                              : "Saved Google Calendar link in this browser.",
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
                      className="w-full h-[360px]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-10 border border-dashed border-border rounded-md">
                    {language === "vi"
                      ? "Chưa có liên kết nhúng."
                      : "No embed link configured."}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="open" className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {language === "vi"
                      ? "Mở Google Calendar ở tab mới."
                      : "Open Google Calendar in a new tab."}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      window.open(
                        "https://calendar.google.com/calendar/u/0/r",
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }>
                    {language === "vi" ? "Mở" : "Open"}
                  </Button>
                </div>

                {selectedDateKey ? (
                  <Button
                    type="button"
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
                    }}
                    className="w-full">
                    {language === "vi"
                      ? "Mở đúng ngày đang chọn"
                      : "Open selected day"}
                  </Button>
                ) : null}
              </TabsContent>

              <TabsContent value="sync" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {language === "vi"
                      ? "Tự động đồng bộ với Google Calendar"
                      : "Auto-sync with Google Calendar"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {language === "vi"
                      ? "Hệ thống sẽ tự tạo/cập nhật sự kiện hạn (deadline), thời gian thực hiện và cảnh báo sắp đến hạn."
                      : "The app will create/update deadline, work-span, and due-soon warning events."}
                  </div>
                </div>

                {gcalStatus?.connected ? (
                  <div className="flex items-center justify-between gap-3 border border-border/60 rounded-md px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {language === "vi" ? "Đã kết nối" : "Connected"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {language === "vi"
                          ? "Bạn có thể bật/tắt đồng bộ tự động."
                          : "You can enable/disable auto-sync."}
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
                  <div className="border border-dashed border-border rounded-md p-4 space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {language === "vi"
                        ? "Chưa kết nối Google Calendar."
                        : "Not connected to Google Calendar."}
                    </div>
                    <Button
                      type="button"
                      disabled={gcalBusy}
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
                      : "Target calendar (calendarId)"}
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

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {language === "vi"
                      ? "Sự kiện bổ sung"
                      : "Extra event"}
                  </div>
                  <ToggleGroup
                    type="single"
                    value={gcalSyncDateField}
                    onValueChange={(v) => {
                      if (v !== "dueDate" && v !== "receivedAt") return;
                      setGcalSyncDateField(v);
                      void saveGoogleCalendarSettings({ syncDateField: v });
                    }}
                    className="border rounded-md bg-background">
                    <ToggleGroupItem value="dueDate" aria-label="dueDate">
                      {language === "vi" ? "Chỉ hạn" : "Deadline only"}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="receivedAt" aria-label="receivedAt">
                      {language === "vi" ? "Thêm ngày nhận" : "Add received day"}
                    </ToggleGroupItem>
                  </ToggleGroup>
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
                        : "Đồng bộ ngay"
                      : gcalSyncing
                        ? "Syncing..."
                        : "Sync now"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!gcalStatus?.connected || gcalBusy}
                    onClick={() => void disconnectGoogleCalendarNow()}>
                    {language === "vi" ? "Ngắt" : "Disconnect"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
