import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, CheckSquare, Users, Settings, LogOut, ChevronDown, Bell, Languages, Shield, UserCog, FileText, Menu, X, Clipboard, Edit, Palette, Code, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTasks, UserRole } from "@/hooks/use-tasks";
import { useI18n } from "@/hooks/use-i18n";
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead } from "@/hooks/use-notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TaskWithAssignmentDetails, Notification } from "@shared/schema";
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
  const displayName = user?.displayName ?? "User";
  const department = user?.department ?? "";
  const { language, setLanguage, t } = useI18n();
  const { data: tasks = [] } = useTasks();
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const { mutate: markNotificationRead } = useMarkNotificationRead();
  
  // Desktop sidebar state - load from localStorage or default to true
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? saved === "true" : true;
  });

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationStatusFilter, setNotificationStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [notificationGroupFilter, setNotificationGroupFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignmentDetails | null>(null);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebarOpen", String(sidebarOpen));
  }, [sidebarOpen]);

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

  const latestNotifications = useMemo(() => notificationList.slice(0, 5), [notificationList]);
  const notificationGroups = useMemo(() => {
    const groups = new Set<string>();
    notificationList.forEach((n) => groups.add(n.group ?? "(Không nhóm)"));
    return Array.from(groups).sort();
  }, [notificationList]);

  const filteredNotifications = useMemo(() => {
    let list = notificationList;
    if (notificationStatusFilter === "unread") list = list.filter((n) => !n.isRead);
    if (notificationStatusFilter === "read") list = list.filter((n) => n.isRead);
    if (notificationGroupFilter !== "all") list = list.filter((n) => n.group === notificationGroupFilter);
    return list;
  }, [notificationList, notificationStatusFilter, notificationGroupFilter]);

  const isThuKyHopPhan = user?.roles?.some(
    (r) => r.name === "Thư ký hợp phần" || r.code === "prj_secretary"
  );
  // Admin, Quản lý có thể xem tất cả trang quản lý công việc (kể cả Thư ký hợp phần).
  const canViewThuKyHopPhan = isThuKyHopPhan || role === UserRole.ADMIN || role === UserRole.MANAGER;

  const navItems = [
    { href: "/", label: t.dashboard.title, icon: LayoutDashboard },
    { href: "/cv-chung", label: "Công việc chung", icon: Clipboard },
    { href: "/bien-tap", label: "Biên tập", icon: Edit },
    { href: "/thiet-ke", label: "Thiết kế", icon: Palette },
    { href: "/cntt", label: "CNTT", icon: Code },
    { href: "/team", label: "Team", icon: Users },
    ...(canViewThuKyHopPhan ? [{ href: "/thu-ky-hop-phan", label: "Thư ký hợp phần", icon: FileText }] : []),
    ...(role === UserRole.ADMIN || role === UserRole.MANAGER
      ? [
          { href: "/admin", label: "Admin", icon: Shield as React.ComponentType<any> },
          { href: "/admin/users", label: "Quản lý người dùng", icon: UserCog },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 bg-card border-r border-border/50 hidden md:flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ width: "16rem" }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-display font-bold text-2xl text-primary">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <CheckSquare className="w-5 h-5" />
              </div>
              {sidebarOpen && <span>KĐPĐ</span>}
            </div>
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {sidebarOpen && (
          <>
            <nav className="flex-1 px-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200
                        ${isActive 
                          ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 shadow-sm" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </>
        )}
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
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                  <CheckSquare className="w-5 h-5" />
                </div>
                TaskMaster
              </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileSidebarOpen(false)}>
                    <div
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200
                        ${isActive 
                          ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 shadow-sm" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
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
      <main 
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? "16rem" : "0" }}
      >
        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-card/50 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {/* Desktop menu button (when sidebar is closed) */}
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-lg font-display font-semibold text-foreground hidden sm:block">
              {navItems.find(i => i.href === location)?.label || t.dashboard.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            {/* Protend-style: Create New Project CTA on Dashboard */}
            {(role === UserRole.ADMIN || role === UserRole.MANAGER) && location === "/" && (
              <Link href="/#create">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-1.5 font-medium">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.dashboard.createNewProject}</span>
                </Button>
              </Link>
            )}
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Languages className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ngôn ngữ / Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setLanguage('vi')}
                  className={language === 'vi' ? 'bg-primary/10 text-primary' : ''}
                >
                  🇻🇳 Tiếng Việt
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLanguage('en')}
                  className={language === 'en' ? 'bg-primary/10 text-primary' : ''}
                >
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
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
                    <span className="text-sm font-semibold">{t.dashboard.notification}</span>
                    <Badge variant="secondary" className="text-xs">{unreadCount?.count ?? 0}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.dashboard.unreadNotification}</p>
                </div>
                {latestNotifications.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    {t.dashboard.noTasksFound}
                  </div>
                ) : (
                  <div className="max-h-[320px] overflow-auto">
                    {latestNotifications.map((n) => {
                      const createdAt = n.createdAt ? new Date(n.createdAt as any) : null;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 border-b border-border/40 hover:bg-muted/30 transition-colors ${n.isRead ? "" : "bg-amber-50/40 dark:bg-amber-950/20"}`}
                          onClick={() => {
                            if (!n.isRead) markNotificationRead(n.id);
                            if (n.task) setSelectedTask(n.task);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 h-2 w-2 rounded-full ${n.isRead ? "bg-muted-foreground/40" : "bg-amber-500"}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{n.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                              {createdAt && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {formatDistanceToNow(createdAt, { addSuffix: true })}
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
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setNotificationDialogOpen(true)}>
                    {t.dashboard.seeAll}
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="h-6 w-px bg-border/50 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 pl-2 pr-4 h-auto py-1.5 hover:bg-muted/50 rounded-full">
                  <Avatar className="w-8 h-8 border border-border">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`} />
                    <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs hidden sm:flex">
                    <span className="font-semibold">{displayName}</span>
                    <span className="text-muted-foreground">{department || role}</span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  {language === 'vi' ? 'Tài khoản của tôi' : 'My Account'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <Settings className="w-4 h-4" /> 
                  {language === 'vi' ? 'Cài đặt' : 'Settings'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-destructive"
                  onClick={() => logout()}
                >
                  <LogOut className="w-4 h-4" /> 
                  {language === 'vi' ? 'Đăng xuất' : 'Log out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content — Protend-style: consistent padding, light bg for dashboard feel */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/20 min-h-0 animate-enter">
          {children}
        </div>
      </main>

      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.dashboard.notification}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2">
              {[
                { key: "all", label: language === "vi" ? "Tất cả" : "All" },
                { key: "unread", label: language === "vi" ? "Chưa xem" : "Unread" },
                { key: "read", label: language === "vi" ? "Đã xem" : "Read" },
              ].map((item) => (
                <Badge
                  key={item.key}
                  variant={notificationStatusFilter === item.key ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setNotificationStatusFilter(item.key as "all" | "unread" | "read")}
                >
                  {item.label}
                </Badge>
              ))}
            </div>
            <div className="flex-1 min-w-[180px]">
              <Select value={notificationGroupFilter} onValueChange={setNotificationGroupFilter}>
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
                  const createdAt = n.createdAt ? new Date(n.createdAt as any) : null;
                  return (
                    <li
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${n.isRead ? "" : "bg-amber-50/50 dark:bg-amber-950/20"}`}
                      onClick={() => {
                        if (!n.isRead) markNotificationRead(n.id);
                        if (n.task) setSelectedTask(n.task);
                      }}
                    >
                      <span className={`mt-1 h-2 w-2 rounded-full ${n.isRead ? "bg-muted-foreground/40" : "bg-amber-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {n.group}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                        {createdAt && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(createdAt, { addSuffix: true })}
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

      <TaskDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
      />
    </div>
  );
}
