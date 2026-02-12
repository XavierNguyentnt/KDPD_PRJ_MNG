import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  ChevronUp,
  Bell,
  Languages,
  Sun,
  Moon,
  Shield,
  UserCog,
  FileText,
  Menu,
  X,
  Clipboard,
  Edit,
  Palette,
  Code,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTasks, UserRole } from "@/hooks/use-tasks";
import { useI18n } from "@/hooks/use-i18n";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
} from "@/hooks/use-notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TaskWithAssignmentDetails, Notification } from "@shared/schema";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskDialog } from "@/components/task-dialog";
import { formatDistanceToNow } from "date-fns";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { role, user, logout } = useAuth();
  const { toast } = useToast();
  const displayName = user?.displayName ?? "User";
  const department = user?.department ?? "";
  const { language, setLanguage, t } = useI18n();
  const { data: tasks = [] } = useTasks();
  const { data: notifications = [] } = useNotifications({
    refetchInterval: 15000,
  });
  const { data: unreadCount } = useUnreadNotificationCount();
  const { mutate: markNotificationRead } = useMarkNotificationRead();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" ? "dark" : "light";
  });

  // Desktop sidebar state - load from localStorage or default to true
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? saved === "true" : true;
  });

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationStatusFilter, setNotificationStatusFilter] = useState<
    "all" | "unread" | "read"
  >("all");
  const [notificationGroupFilter, setNotificationGroupFilter] = useState("all");
  const [selectedTask, setSelectedTask] =
    useState<TaskWithAssignmentDetails | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordMode, setChangePasswordMode] = useState(false);
  const [verifiedOldPassword, setVerifiedOldPassword] = useState(false);
  const currentPasswordNameRef = useRef(
    `cpw-${Math.random().toString(36).slice(2)}`,
  );
  const [hasFocusedCurrent, setHasFocusedCurrent] = useState(false);

  // Refs for click outside detection
  const sidebarRef = useRef<HTMLElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebarOpen", String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Auto-hide sidebar when clicking on main content (desktop only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only on desktop (md and up) and when sidebar is open
      if (window.innerWidth >= 768 && sidebarOpen) {
        const target = event.target as HTMLElement;
        // Check if click is outside sidebar and inside main content
        if (
          sidebarRef.current &&
          mainContentRef.current &&
          !sidebarRef.current.contains(target) &&
          mainContentRef.current.contains(target)
        ) {
          // Don't hide if clicking on interactive elements (buttons, dropdowns, links, etc.)
          const isInteractiveElement = target.closest(
            'button, [role="button"], a, input, select, textarea, [role="menu"], [role="menuitem"], [role="dialog"], [role="combobox"]',
          );
          // Don't hide if clicking on header area (where menu button is)
          const isHeaderArea = target.closest("header");
          if (!isInteractiveElement && !isHeaderArea) {
            setSidebarOpen(false);
          }
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (settingsOpen) {
      setChangePasswordMode(false);
      setVerifiedOldPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasFocusedCurrent(false);
    }
  }, [settingsOpen]);

  const normalizeGroupName = (g?: string | null) => {
    const s = (g ?? "").trim();
    if (s === "Công việc chung" || s === "CV chung") return "CV chung";
    return s || "(Không nhóm)";
  };

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const notificationList = useMemo(() => {
    const list = notifications.map((n) => {
      const task = n.taskId ? taskById.get(n.taskId) : undefined;
      return { ...n, task, group: normalizeGroupName(task?.group) };
    });
    return list.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
      return db - da;
    });
  }, [notifications, taskById]);

  const latestNotifications = useMemo(
    () => notificationList.slice(0, 5),
    [notificationList],
  );
  const notificationGroups = useMemo(() => {
    const groups = new Set<string>();
    notificationList.forEach((n) => groups.add(n.group ?? "(Không nhóm)"));
    return Array.from(groups).sort();
  }, [notificationList]);

  // Push-style toast khi có thông báo mới
  const lastNotifSeenRef = useRef<number>(0);
  useEffect(() => {
    const newestTs =
      notificationList.length && notificationList[0]?.createdAt
        ? new Date(notificationList[0].createdAt as any).getTime()
        : 0;
    if (lastNotifSeenRef.current === 0) {
      const stored = Number.parseInt(
        localStorage.getItem("lastNotifSeenTs") || "0",
        10,
      );
      lastNotifSeenRef.current =
        stored || (newestTs > 0 ? newestTs : lastNotifSeenRef.current);
      if (lastNotifSeenRef.current > 0) {
        localStorage.setItem(
          "lastNotifSeenTs",
          String(lastNotifSeenRef.current),
        );
      }
      return;
    }
    const newly = notificationList.filter((n) => {
      const ts = n.createdAt ? new Date(n.createdAt as any).getTime() : 0;
      return !n.isRead && ts > lastNotifSeenRef.current;
    });
    if (newly.length > 0) {
      const n = newly[0];
      toast({
        title: language === "vi" ? "Thông báo mới" : "New notification",
        description: n.title,
        action: (
          <ToastAction
            altText={language === "vi" ? "Xem" : "View"}
            onClick={() => {
              if (!n.isRead) markNotificationRead(n.id);
              if (n.task) {
                setSelectedTask(n.task as any);
              } else {
                setNotificationDialogOpen(true);
              }
            }}>
            {language === "vi"
              ? n.task
                ? "Mở công việc"
                : "Xem tất cả"
              : n.task
                ? "Open Task"
                : "View All"}
          </ToastAction>
        ),
        duration: 7000,
      });
    }
    if (newestTs > lastNotifSeenRef.current) {
      lastNotifSeenRef.current = newestTs;
      localStorage.setItem("lastNotifSeenTs", String(newestTs));
    }
  }, [notificationList]);
  const filteredNotifications = useMemo(() => {
    let list = notificationList;
    if (notificationStatusFilter === "unread")
      list = list.filter((n) => !n.isRead);
    if (notificationStatusFilter === "read")
      list = list.filter((n) => n.isRead);
    if (notificationGroupFilter !== "all")
      list = list.filter((n) => n.group === notificationGroupFilter);
    return list;
  }, [notificationList, notificationStatusFilter, notificationGroupFilter]);

  const isThuKyHopPhan = user?.roles?.some(
    (r) => r.name === "Thư ký hợp phần" || r.code === "prj_secretary",
  );
  // Admin, Quản lý có thể xem tất cả trang quản lý công việc (kể cả Thư ký hợp phần).
  const canViewThuKyHopPhan =
    isThuKyHopPhan || role === UserRole.ADMIN || role === UserRole.MANAGER;

  const hasGroup = (group: string) => {
    const target = group.toLowerCase().replace(/\s+/g, "");
    const list = user?.groups ?? [];
    return list.some((g) => {
      const name = (g.name ?? "").toLowerCase().replace(/\s+/g, "");
      const code = (g.code ?? "").toLowerCase().replace(/\s+/g, "");
      if (target === "thiếtkế" || target === "thietke") {
        return (
          name.includes("thiếtkế") ||
          code.includes("thietke") ||
          code.includes("thiet-ke")
        );
      }
      if (target === "cntt") {
        return (
          name.includes("cntt") ||
          code.includes("cntt") ||
          code.includes("it") ||
          name.includes("kỹthuật") ||
          name.includes("kythuat")
        );
      }
      if (target === "biêntập" || target === "bientap") {
        return (
          name.includes("biêntập") ||
          name.includes("bientap") ||
          code.includes("bientap") ||
          code.includes("bien-tap")
        );
      }
      return name.includes(target) || code.includes(target);
    });
  };
  const canViewGroupPages =
    role === UserRole.ADMIN || role === UserRole.MANAGER;
  const canViewThietKe = canViewGroupPages || hasGroup("Thiết kế");
  const canViewCNTT = canViewGroupPages || hasGroup("CNTT");
  const canViewBienTap = canViewGroupPages || hasGroup("Biên tập");

  const navItems = [
    { href: "/", label: t.dashboard.title, icon: LayoutDashboard },
    { href: "/cv-chung", label: "Công việc chung", icon: Clipboard },
    ...(canViewBienTap
      ? [{ href: "/bien-tap", label: "Biên tập", icon: Edit }]
      : []),
    ...(canViewThietKe
      ? [{ href: "/thiet-ke", label: "Thiết kế", icon: Palette }]
      : []),
    ...(canViewCNTT ? [{ href: "/cntt", label: "CNTT", icon: Code }] : []),
    { href: "/team", label: "Team", icon: Users },
    ...(canViewThuKyHopPhan
      ? [{ href: "/thu-ky-hop-phan", label: "Thư ký hợp phần", icon: FileText }]
      : []),
    ...(role === UserRole.ADMIN || role === UserRole.MANAGER
      ? [{ href: "/admin/users", label: "Quản lý người dùng", icon: UserCog }]
      : []),
  ];

  return (
    <div
      className="min-h-screen bg-gray-50/50 md:grid overflow-x-hidden"
      style={{
        gridTemplateColumns: sidebarOpen ? "16rem 1fr" : "0px 1fr",
        transition: "grid-template-columns 300ms ease-in-out",
      }}>
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          bg-card border-r border-border/50 hidden md:block overflow-hidden
          transition-[opacity,transform] duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"}
        `}
        style={{ willChange: "transform,opacity" }}>
        <div className="md:sticky md:top-0 md:h-screen flex flex-col">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-bold text-2xl text-primary">
                <img
                  src="/logo-duan.png"
                  alt="Logo"
                  className="h-16 w-auto rounded"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <nav
            className={`flex-1 px-4 space-y-1 transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200
                      ${
                        isActive
                          ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }
                    `}>
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center gap-2 font-display font-bold text-2xl text-primary">
                <img
                  src="/logo-duan.png"
                  alt="Logo"
                  className="h-10 w-auto rounded"
                />
              </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}>
                    <div
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200
                        ${
                          isActive
                            ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}>
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main ref={mainContentRef} className="flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            {/* Desktop menu button (when sidebar is closed) */}
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex"
                onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-lg font-display font-semibold text-foreground hidden sm:block">
              {navItems.find((i) => i.href === location)?.label ||
                t.dashboard.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            {/* Protend-style: Create New Project CTA on Dashboard */}
            {(role === UserRole.ADMIN || role === UserRole.MANAGER) &&
              location === "/" && (
                <Link href="/#create">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-1.5 font-medium">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {t.dashboard.createNewProject}
                    </span>
                  </Button>
                </Link>
              )}
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary">
                  <Languages className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ngôn ngữ / Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLanguage("vi")}
                  className={
                    language === "vi" ? "bg-primary/10 text-primary" : ""
                  }>
                  🇻🇳 Tiếng Việt
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLanguage("en")}
                  className={
                    language === "en" ? "bg-primary/10 text-primary" : ""
                  }>
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary">
                  {theme === "dark" ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Giao diện</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setTheme("light")}
                  className={
                    theme === "light" ? "bg-primary/10 text-primary" : ""
                  }>
                  Sáng (Light)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("dark")}
                  className={
                    theme === "dark" ? "bg-primary/10 text-primary" : ""
                  }>
                  Tối (Dark)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-primary">
                  <Bell className="w-5 h-5" />
                  {(unreadCount?.count ?? 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] leading-[18px] text-center rounded-full bg-red-500 text-white border-2 border-card">
                      {unreadCount?.count}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[360px] p-0">
                <div className="px-3 py-2 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {t.dashboard.notification}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount?.count ?? 0}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.dashboard.unreadNotification}
                  </p>
                </div>
                {latestNotifications.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    {t.dashboard.noTasksFound}
                  </div>
                ) : (
                  <div className="max-h-[320px] overflow-auto">
                    {latestNotifications.map((n) => {
                      const createdAt = n.createdAt
                        ? new Date(n.createdAt as any)
                        : null;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 border-b border-border/40 hover:bg-muted/30 transition-colors ${n.isRead ? "" : "bg-amber-50/40 dark:bg-amber-950/20"}`}
                          onClick={() => {
                            if (!n.isRead) markNotificationRead(n.id);
                            if (n.task) setSelectedTask(n.task);
                          }}>
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-1 h-2 w-2 rounded-full ${n.isRead ? "bg-muted-foreground/40" : "bg-amber-500"}`}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {n.title}
                              </p>
                              <div
                                className="text-xs text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: n.message }}
                              />
                              {n.task && (
                                <div className="mt-1 flex gap-3">
                                  <button
                                    type="button"
                                    className="text-[11px] text-primary underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!n.isRead) markNotificationRead(n.id);
                                      setSelectedTask(n.task!);
                                    }}>
                                    {language === "vi"
                                      ? "Mở công việc"
                                      : "Open Task"}
                                  </button>
                                  {["task_completed", "task_reviewed"].includes(
                                    String(n.type || ""),
                                  ) && (
                                    <button
                                      type="button"
                                      className="text-[11px] text-primary underline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!n.isRead)
                                          markNotificationRead(n.id);
                                        setSelectedTask(n.task!);
                                      }}>
                                      {language === "vi"
                                        ? "Mở đánh giá"
                                        : "Open Review"}
                                    </button>
                                  )}
                                </div>
                              )}
                              {createdAt && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {formatDistanceToNow(createdAt, {
                                    addSuffix: true,
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="px-3 py-2 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setNotificationDialogOpen(true)}>
                    {t.dashboard.seeAll}
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-px bg-border/50 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2 pl-2 pr-4 h-auto py-1.5 hover:bg-muted/50 rounded-full">
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                    />
                    <AvatarFallback>
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs hidden sm:flex">
                    <span className="font-semibold">{displayName}</span>
                    <span className="text-muted-foreground">
                      {department || role}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  {language === "vi" ? "Tài khoản của tôi" : "My Account"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  {language === "vi"
                    ? "Xem thông tin & đổi mật khẩu"
                    : "Profile & Change Password"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-destructive"
                  onClick={() => logout()}>
                  <LogOut className="w-4 h-4" />
                  {language === "vi" ? "Đăng xuất" : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content — Protend-style: consistent padding, light bg for dashboard feel */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/20 min-h-0 animate-enter">
          {children}
        </div>

        <footer className="border-t border-border/50 bg-card/50 px-4 sm:px-8 py-4">
          <div className="text-center text-xs text-muted-foreground">
            Copyright of Văn phòng Dự án Kinh điển phương Đông
          </div>
        </footer>
      </main>

      <Dialog
        open={notificationDialogOpen}
        onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.dashboard.notification}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2">
              {[
                { key: "all", label: language === "vi" ? "Tất cả" : "All" },
                {
                  key: "unread",
                  label: language === "vi" ? "Chưa xem" : "Unread",
                },
                { key: "read", label: language === "vi" ? "Đã xem" : "Read" },
              ].map((item) => (
                <Badge
                  key={item.key}
                  variant={
                    notificationStatusFilter === item.key
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() =>
                    setNotificationStatusFilter(
                      item.key as "all" | "unread" | "read",
                    )
                  }>
                  {item.label}
                </Badge>
              ))}
            </div>
            <div className="flex-1 min-w-[180px]">
              <Select
                value={notificationGroupFilter}
                onValueChange={setNotificationGroupFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t.dashboard.byGroup} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.dashboard.allGroups}</SelectItem>
                  {notificationGroups.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 max-h-[420px] overflow-auto border rounded-lg">
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                {t.dashboard.noTasksFound}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filteredNotifications.map((n) => {
                  const createdAt = n.createdAt
                    ? new Date(n.createdAt as any)
                    : null;
                  return (
                    <li
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${n.isRead ? "" : "bg-amber-50/50 dark:bg-amber-950/20"}`}
                      onClick={() => {
                        if (!n.isRead) markNotificationRead(n.id);
                        if (n.task) setSelectedTask(n.task);
                      }}>
                      <span
                        className={`mt-1 h-2 w-2 rounded-full ${n.isRead ? "bg-muted-foreground/40" : "bg-amber-500"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {n.title}
                          </p>
                          <Badge variant="secondary" className="text-[10px]">
                            {n.group}
                          </Badge>
                        </div>
                        <div
                          className="text-xs text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: n.message }}
                        />
                        {n.task && (
                          <div className="mt-1 flex gap-3">
                            <button
                              type="button"
                              className="text-[11px] text-primary underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!n.isRead) markNotificationRead(n.id);
                                setSelectedTask(n.task!);
                              }}>
                              {language === "vi" ? "Mở công việc" : "Open Task"}
                            </button>
                            {["task_completed", "task_reviewed"].includes(
                              String(n.type || ""),
                            ) && (
                              <button
                                type="button"
                                className="text-[11px] text-primary underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!n.isRead) markNotificationRead(n.id);
                                  setSelectedTask(n.task!);
                                }}>
                                {language === "vi"
                                  ? "Mở đánh giá"
                                  : "Open Review"}
                              </button>
                            )}
                          </div>
                        )}
                        {createdAt && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(createdAt, {
                              addSuffix: true,
                            })}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {language === "vi" ? "Cài đặt tài khoản" : "Account Settings"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="font-medium">Email</div>
              <div className="text-muted-foreground">{user?.email}</div>
              <div className="font-medium">
                {language === "vi" ? "Họ tên hiển thị" : "Display name"}
              </div>
              <div className="text-muted-foreground">{user?.displayName}</div>
              <div className="font-medium">
                {language === "vi" ? "Phòng ban" : "Department"}
              </div>
              <div className="text-muted-foreground">
                {user?.department ?? ""}
              </div>
              <div className="font-medium">Roles</div>
              <div className="text-muted-foreground">
                {(user?.roles ?? []).map((r) => r.name || r.code).join(", ")}
              </div>
              <div className="font-medium">Groups</div>
              <div className="text-muted-foreground">
                {(user?.groups ?? []).map((g) => g.name || g.code).join(", ")}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">
                {language === "vi" ? "Đổi mật khẩu" : "Change Password"}
              </div>
              {!changePasswordMode ? (
                <Button
                  className="w-full"
                  onClick={() => setChangePasswordMode(true)}>
                  {language === "vi" ? "Đổi mật khẩu" : "Change Password"}
                </Button>
              ) : !verifiedOldPassword ? (
                <div className="space-y-2">
                  <input
                    type="password"
                    name="password"
                    style={{
                      position: "absolute",
                      left: "-9999px",
                      opacity: 0,
                      width: 0,
                      height: 0,
                    }}
                    tabIndex={-1}
                    aria-hidden="true"
                    autoComplete="current-password"
                  />
                  <Input
                    type="password"
                    placeholder={
                      language === "vi"
                        ? "Vui lòng nhập mật khẩu hiện tại để xác thực"
                        : "Please enter your current password to verify"
                    }
                    name={currentPasswordNameRef.current}
                    autoComplete="off"
                    readOnly={!hasFocusedCurrent}
                    onFocus={() => setHasFocusedCurrent(true)}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    disabled={changingPassword || !currentPassword}
                    onClick={async () => {
                      try {
                        setChangingPassword(true);
                        const res = await fetch(api.auth.verifyPassword.path, {
                          method: api.auth.verifyPassword.method,
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ currentPassword }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          toast({
                            title:
                              language === "vi"
                                ? "Xác thực thất bại"
                                : "Verification failed",
                            description: data.message ?? "",
                            variant: "destructive",
                            duration: 7000,
                          });
                          return;
                        }
                        setVerifiedOldPassword(true);
                        toast({
                          title: language === "vi" ? "Đã xác thực" : "Verified",
                          description:
                            language === "vi"
                              ? "Nhập mật khẩu mới"
                              : "Enter new password",
                        });
                      } finally {
                        setChangingPassword(false);
                      }
                    }}>
                    {language === "vi" ? "Xác thực" : "Verify"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder={
                      language === "vi"
                        ? "Mật khẩu mới (≥6 ký tự)"
                        : "New password (≥6 chars)"
                    }
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={
                      language === "vi"
                        ? "Xác nhận mật khẩu mới"
                        : "Confirm new password"
                    }
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    disabled={changingPassword}
                    onClick={async () => {
                      if (!newPassword) {
                        toast({
                          title:
                            language === "vi"
                              ? "Thiếu thông tin"
                              : "Missing information",
                          description:
                            language === "vi"
                              ? "Nhập mật khẩu mới"
                              : "Enter new password",
                          variant: "destructive",
                          duration: 5000,
                        });
                        return;
                      }
                      if (newPassword.length < 6) {
                        toast({
                          title:
                            language === "vi"
                              ? "Mật khẩu quá ngắn"
                              : "Password too short",
                          description:
                            language === "vi"
                              ? "Tối thiểu 6 ký tự"
                              : "Minimum 6 characters",
                          variant: "destructive",
                          duration: 5000,
                        });
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        toast({
                          title:
                            language === "vi"
                              ? "Mật khẩu không khớp"
                              : "Password mismatch",
                          description:
                            language === "vi"
                              ? "Xác nhận lại mật khẩu mới"
                              : "Confirm new password",
                          variant: "destructive",
                          duration: 5000,
                        });
                        return;
                      }
                      try {
                        setChangingPassword(true);
                        const res = await fetch(api.auth.changePassword.path, {
                          method: api.auth.changePassword.method,
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            currentPassword,
                            newPassword,
                          }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          toast({
                            title:
                              language === "vi"
                                ? "Đổi mật khẩu thất bại"
                                : "Change password failed",
                            description: data.message ?? "",
                            variant: "destructive",
                            duration: 7000,
                          });
                          return;
                        }
                        toast({
                          title:
                            language === "vi"
                              ? "Đã đổi mật khẩu"
                              : "Password changed",
                          description:
                            language === "vi"
                              ? "Đăng nhập lại nếu cần"
                              : "Re-login if needed",
                        });
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setSettingsOpen(false);
                      } finally {
                        setChangingPassword(false);
                      }
                    }}>
                    {language === "vi" ? "Đổi mật khẩu" : "Change Password"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
      />

      <Button
        variant="default"
        size="icon"
        className={`fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full shadow-lg transition-all duration-200 ${showBackToTop ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-2"}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label={language === "vi" ? "Lên đầu trang" : "Back to top"}
        title={language === "vi" ? "Lên đầu trang" : "Back to top"}>
        <ChevronUp className="h-5 w-5" />
      </Button>
    </div>
  );
}
