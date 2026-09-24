import { useCallback, useEffect, useMemo, useState, ReactNode, ComponentType } from "react";
import { useLocation } from "wouter";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import {
  LayoutDashboard,
  ClipboardList,
  Edit3,
  Palette,
  Terminal,
  FileSignature,
  Users,
  ShieldCheck,
  Search,
  PlusCircle,
  FileSpreadsheet,
  BarChart3,
  LineChart,
  ListFilter,
  ArrowRight,
  FileText as FileTextIcon,
  UserCheck,
  Hash,
  type LucideIcon,
} from "lucide-react";
import type { TaskWithAssignmentDetails } from "@shared/schema";
import { useI18n } from "@/hooks/use-i18n";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateDDMMYYYY, getTaskPriorityColor, getTaskStatusColor } from "@/lib/utils";

function CmdShortcut({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/75 font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export type PermissionFlags = {
  canViewCVChung: boolean;
  canViewEditorial: boolean;
  canViewDesign: boolean;
  canViewCNTT: boolean;
  canViewThukyhopPhan: boolean;
  canViewTeam: boolean;
  canViewAdmin: boolean;
  canExportExcel: boolean;
  canCreateTask: boolean;
};

const defaultPerms: PermissionFlags = {
  canViewCVChung: true,
  canViewEditorial: true,
  canViewDesign: true,
  canViewCNTT: true,
  canViewThukyhopPhan: true,
  canViewTeam: true,
  canViewAdmin: false,
  canExportExcel: true,
  canCreateTask: true,
};

type NavItem = {
  path: string;
  labelVi: string;
  labelEn: string;
  icon: LucideIcon;
  perm?: keyof PermissionFlags;
};

const NAV_ITEMS: NavItem[] = [
  { path: "/", labelVi: "Báo cáo", labelEn: "Dashboard", icon: LayoutDashboard },
  { path: "/cv-chung", labelVi: "Công việc chung", labelEn: "All tasks", icon: ClipboardList, perm: "canViewCVChung" },
  { path: "/bien-tap", labelVi: "Biên tập", labelEn: "Editorial", icon: Edit3, perm: "canViewEditorial" },
  { path: "/thiet-ke", labelVi: "Thiết kế", labelEn: "Design", icon: Palette, perm: "canViewDesign" },
  { path: "/cntt", labelVi: "CNTT", labelEn: "IT", icon: Terminal, perm: "canViewCNTT" },
  { path: "/thu-ky-hop-phan", labelVi: "Thư ký hợp phần", labelEn: "Contract Secretary", icon: FileSignature, perm: "canViewThukyhopPhan" },
  { path: "/team", labelVi: "Nhóm", labelEn: "Team", icon: Users, perm: "canViewTeam" },
  { path: "/admin", labelVi: "Quản trị", labelEn: "Admin", icon: ShieldCheck, perm: "canViewAdmin" },
];

export interface CommandPaletteProps {
  tasks?: TaskWithAssignmentDetails[];
  permissions?: Partial<PermissionFlags>;
  /** Optional: if provided, selecting a task calls this (open dialog). Otherwise route navigate disabled for tasks. */
  onOpenTask?: (task: TaskWithAssignmentDetails) => void;
  /** Optional: if provided, "Create task" action calls this. Otherwise navigate to /cv-chung */
  onCreateNew?: () => void;
  /** Optional: if provided, "Export Excel" action calls this. */
  onExportExcel?: () => void;
  /** Optional: current dashboard tab value ("overview" | "details" | "tasks") */
  currentDashboardTab?: string;
  /** Optional: switch dashboard tab callback. */
  onDashboardTabChange?: (value: "overview" | "stats" | "tasks") => void;
}

function fuzzyScore(query: string, hay: string): number {
  const q = query.trim().toLowerCase();
  const h = (hay ?? "").toLowerCase();
  if (!q) return 1;
  if (h.includes(q)) return 0.95;
  // char subsequence check
  let qi = 0;
  for (let i = 0; i < h.length && qi < q.length; i++) {
    if (h[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 0.7;
  // token overlap
  const qTokens = new Set(q.split(/\s+/).filter(Boolean));
  const hTokens = new Set(h.split(/\s+/).filter(Boolean));
  let common = 0;
  for (const t of qTokens) {
    for (const ht of hTokens) {
      if (ht === t || ht.startsWith(t) || t.startsWith(ht)) {
        common++;
        break;
      }
    }
  }
  if (qTokens.size && common >= 1) return 0.45 * (common / qTokens.size);
  return 0;
}

export function CommandPalette({
  tasks = [],
  permissions,
  onOpenTask,
  onCreateNew,
  onExportExcel,
  currentDashboardTab,
  onDashboardTabChange,
}: CommandPaletteProps) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const [pathname] = useLocation();

  const perms: PermissionFlags = useMemo(
    () => ({ ...defaultPerms, ...(permissions ?? {}) }),
    [permissions],
  );

  const onDashboard = pathname === "/";

  // Toggle
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);

  // Global Ctrl/Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape" && open) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, toggle, close]);

  // Filter nav items by perms
  const navItems = useMemo(
    () =>
      NAV_ITEMS.filter((n) => (n.perm ? (perms as any)[n.perm] : true)).map((n) => ({
        ...n,
        label: language === "vi" ? n.labelVi : n.labelEn,
      })),
    [perms, language],
  );

  // Filter tasks with fuzzy search (client-side)
  const [search, setSearch] = useState("");
  const taskItems = useMemo(() => {
    if (!tasks || tasks.length === 0) return [] as { task: TaskWithAssignmentDetails; score: number; label: string }[];
    if (!search.trim()) {
      // show recent 10 by id desc
      return [...tasks]
        .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0))
        .slice(0, 10)
        .map((t) => ({ task: t, score: 1, label: taskLabel(t) }));
    }
    const scored = tasks
      .map((t) => {
        const lb = taskLabel(t);
        const assignee =
          ((t as any).assignments || [])
            .map((a: any) => `${a.userDisplayName ?? a.displayName ?? a.userName ?? ""}`.trim())
            .join(" ") +
          " " +
          ((t as any).assigneeName ?? "");
        const meta = `${lb} ${t.group ?? ""} ${(t as any).description ?? ""} ${assignee} ${String(t.id)}`;
        return { task: t, score: fuzzyScore(search, meta), label: lb };
      })
      .filter((r) => r.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    return scored;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, search]);

  function taskLabel(t: TaskWithAssignmentDetails): string {
    const tAny = t as any;
    const assignee =
      Array.isArray(tAny.assignments) && tAny.assignments.length
        ? tAny.assignments
            .map((a: any) => `${a.userDisplayName ?? a.displayName ?? a.userName ?? a.userId ?? ""}`.trim())
            .filter(Boolean)
            .slice(0, 2)
            .join(", ")
        : tAny.assigneeName ?? tAny.assigneeDisplayName ?? "";
    return `#${t.id} · ${t.title}${assignee ? ` — ${assignee}` : ""}`;
  }

  function selectNav(path: string) {
    close();
    if (path === pathname) return;
    navigate(path);
  }

  function selectDashboardTab(value: "overview" | "stats" | "tasks") {
    close();
    if (onDashboardTabChange) {
      onDashboardTabChange(value);
    } else {
      try {
        window.dispatchEvent(
          new CustomEvent("cmd:dashboard:switch-tab", { detail: value }),
        );
      } catch {
        /* noop */
      }
    }
  }

  function selectTask(item: { task: TaskWithAssignmentDetails }) {
    close();
    if (onOpenTask) onOpenTask(item.task);
  }

  function selectCreate() {
    close();
    if (onCreateNew) onCreateNew();
    else if (pathname !== "/cv-chung") navigate("/cv-chung");
  }

  function selectExport() {
    close();
    if (onExportExcel) {
      onExportExcel();
    } else if (perms.canExportExcel) {
      try {
        window.dispatchEvent(new CustomEvent("cmd:export:excel"));
      } catch {
        /* noop */
      }
    }
  }

  const cmd = t.commandPalette;

  const kbdHint = (
    <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-70">
      <kbd className="rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">
        {/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"}
      </kbd>
      <kbd className="rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">K</kbd>
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-2xl">
        <Command
          label={cmd.openShortcut}
          className="h-auto min-h-[420px] rounded-none border-none"
          filter={(value, searchTerm, keywords) => {
            if (!searchTerm.trim()) return 1;
            const hay = `${value} ${(keywords ?? []).join(" ")}`.toLowerCase();
            const q = searchTerm.toLowerCase();
            if (hay.includes(q)) return 1;
            if (fuzzyScore(searchTerm, value) > 0.45) return 0.8;
            return 0;
          }}
          loop
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={cmd.placeholder}
              className="flex h-9 w-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/80 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 border-none focus-visible:ring-0 shadow-none"
            />
            {kbdHint}
          </div>

          <CommandList className="max-h-[420px] overflow-y-auto py-2">
            <CommandEmpty className="px-4 py-10 text-center text-sm text-muted-foreground">
              {cmd.noResults}
            </CommandEmpty>

            {/* NAVIGATE GROUP */}
            <CommandGroup heading={cmd.navigateGroup}>
              {navItems.map((n) => {
                const Icon = n.icon;
                const active = pathname === n.path;
                return (
                  <CommandItem
                    key={n.path}
                    value={n.label + " " + n.path}
                    keywords={[n.path, n.label]}
                    onSelect={() => selectNav(n.path)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-4 py-2 text-sm",
                      active ? "bg-accent/50" : "",
                    )}
                  >
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary", active ? "bg-primary text-primary-foreground" : "")}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 truncate">{n.label}</span>
                    {active && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 opacity-80">
                        {language === "vi" ? "Đang mở" : "Current"}
                      </Badge>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator />

            {/* DASHBOARD TABS (only when on dashboard path) */}
            {onDashboard && (
              <>
                <CommandGroup heading={cmd.dashboardTabsGroup}>
                  {([
                    { v: "overview", label: cmd.viewOverview, icon: BarChart3, short: "Tổng quan" },
                    { v: "stats", label: cmd.viewDetails, icon: LineChart, short: "Thống kê chi tiết" },
                    { v: "tasks", label: cmd.viewList, icon: ListFilter, short: "Danh sách công việc" },
                  ] as const).map((tab) => {
                    const Icon = tab.icon;
                    const active = currentDashboardTab === tab.v;
                    return (
                      <CommandItem
                        key={tab.v}
                        value={`${cmd.dashboardTabsGroup} ${tab.label} ${tab.short}`}
                        keywords={["tab", "dashboard", tab.label, tab.short]}
                        onSelect={() => selectDashboardTab(tab.v)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-4 py-2 text-sm",
                          active ? "bg-accent/50" : "",
                        )}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning-foreground dark:text-warning">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1 truncate">{tab.label}</span>
                        {active && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 opacity-80">
                            {language === "vi" ? "Đang chọn" : "Active"}
                          </Badge>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* TASKS GROUP */}
            {(taskItems.length > 0 || tasks.length > 0) && (
              <>
                <CommandGroup
                  heading={
                    <div className="flex w-full items-center">
                      <span>{cmd.tasksGroup}</span>
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {language === "vi"
                          ? `${taskItems.length || 0}/${tasks.length}`
                          : `${taskItems.length || 0} of ${tasks.length}`}
                      </span>
                    </div>
                  }
                >
                  {taskItems.length === 0 && tasks.length > 0 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground/80">
                      {language === "vi"
                        ? "Nhập từ khóa để tìm kiếm trong danh sách…"
                        : "Type keywords to filter tasks…"}
                    </div>
                  )}
                  {taskItems.map(({ task, label }) => {
                    const pc = getTaskPriorityColor(task.priority).badge;
                    const sc = getTaskStatusColor(task.status).badge;
                    const due = (task as any).dueDate;
                    return (
                      <CommandItem
                        key={`task-${task.id}`}
                        value={label}
                        keywords={[`task#${task.id}`, task.title, task.group ?? "", task.status, task.priority]}
                        onSelect={() => selectTask({ task })}
                        disabled={!onOpenTask}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 px-4 py-2.5 text-sm",
                          !onOpenTask && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground border border-border/60">
                          <Hash className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-[13px]">{task.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="ghost" className={cn("h-5 text-[10px] px-1.5", sc)}>
                              {language === "vi"
                                ? ({
                                    "Not Started": "Chưa bắt đầu",
                                    "In Progress": "Đang thực hiện",
                                    Pending: "Tạm dừng",
                                    Completed: "Hoàn thành",
                                    Cancelled: "Đã hủy",
                                  } as Record<string, string>)[task.status] ?? task.status
                                : task.status}
                            </Badge>
                            <Badge variant="ghost" className={cn("h-5 text-[10px] px-1.5", pc)}>
                              {task.priority}
                            </Badge>
                            {task.group && (
                              <Badge variant="secondary" className="h-5 text-[10px] px-1.5 font-normal">
                                <FileTextIcon className="h-3 w-3 mr-1 opacity-70" />
                                {task.group}
                              </Badge>
                            )}
                            {due && (
                              <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-normal">
                                {formatDateDDMMYYYY(due)}
                              </Badge>
                            )}
                            {(task as any).assigneeName && (
                              <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-normal">
                                <UserCheck className="h-3 w-3 mr-1 opacity-70" />
                                {(task as any).assigneeName}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {onOpenTask ? (
                          <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        ) : (
                          <CmdShortcut className="text-[10px] mt-1">
                            {language === "vi" ? "Chưa gắn" : "N/A"}
                          </CmdShortcut>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* ACTIONS GROUP */}
            <CommandGroup heading={cmd.actionsGroup}>
              {perms.canCreateTask && (
                <CommandItem
                  value={`${cmd.createTask} new task cv-chung`}
                  keywords={["create", "new", "tạo mới", "add"]}
                  onSelect={selectCreate}
                  className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-status-success/15 text-status-success dark:text-emerald-400">
                    <PlusCircle className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{cmd.createTask}</span>
                  <CmdShortcut>
                    {language === "vi" ? "Chuyển trang CV-chung" : "Open All tasks"}
                  </CmdShortcut>
                </CommandItem>
              )}

              {perms.canExportExcel && (
                <CommandItem
                  value={`${cmd.exportExcel} excel export xlsx`}
                  keywords={["export", "excel", "xlsx", "xuất", "excel export"]}
                  onSelect={selectExport}
                  disabled={false}
                  className={cn("flex cursor-pointer items-center gap-3 px-4 py-2 text-sm")}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-status-info/15 text-status-info">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{cmd.exportExcel}</span>
                  <CmdShortcut>
                    {onExportExcel
                      ? language === "vi"
                        ? "Thực hiện ngay"
                        : "Run action"
                      : language === "vi"
                      ? "Danh sách hiện tại"
                      : "Current list"}
                  </CmdShortcut>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>

          <div className="border-t border-border/55 bg-muted/20 px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground/80">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px]">↑</kbd>
                <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px]">↓</kbd>
                <span>{language === "vi" ? "Chọn mục" : "Navigate"}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
                <span>{language === "vi" ? "Thực hiện" : "Run"}</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
              <span>{language === "vi" ? "Đóng" : "Close"}</span>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
