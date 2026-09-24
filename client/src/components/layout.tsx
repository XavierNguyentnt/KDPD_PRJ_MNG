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
  ChevronRight,
  ChevronLeft,
  Bell,
  Languages,
  Sun,
  Moon,
  Shield,
  FileText,
  Menu,
  X,
  Clipboard,
  Edit,
  Palette,
  Code,
  Plus,
  Star,
  MoreVertical,
  Eye,
  EyeOff,
  Download,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTasks, UserRole } from "@/hooks/use-tasks";
import { useI18n } from "@/hooks/use-i18n";
import { usePwaInstallPrompt } from "@/hooks/use-pwa-install-prompt";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkNotificationUnread,
  useSetNotificationImportant,
  useMarkAllNotificationsRead,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import EmptyStateCTA from "@/components/ui/empty-state-cta";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskDialog } from "@/components/task-dialog";
import { CommandPalette } from "@/components/ui/command-palette";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function getPasswordRequirementState(password: string) {
  const lengthOk = password.length >= 8;
  const upperOk = /[A-Z]/.test(password);
  const lowerOk = /[a-z]/.test(password);
  const numberOk = /[0-9]/.test(password);
  const specialOk = /[^A-Za-z0-9]/.test(password);
  const ok = lengthOk && upperOk && lowerOk && numberOk && specialOk;
  return { ok, lengthOk, upperOk, lowerOk, numberOk, specialOk };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { role, user, logout, refreshMe } = useAuth();
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
  const { mutate: markNotificationUnread } = useMarkNotificationUnread();
  const { mutate: setNotificationImportant } = useSetNotificationImportant();
  const { mutate: markAllNotificationsRead, isPending: isMarkingAllRead } =
    useMarkAllNotificationsRead();
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
  const {
    installPromptOpen,
    setInstallPromptOpen,
    canInstall,
    blocker,
    handleInstall,
    handleDismiss,
  } = usePwaInstallPrompt();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordMode, setChangePasswordMode] = useState(false);
  const [verifiedOldPassword, setVerifiedOldPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const currentPasswordNameRef = useRef(
    `cpw-${Math.random().toString(36).slice(2)}`,
  );
  const [hasFocusedCurrent, setHasFocusedCurrent] = useState(false);

  // Refs for layout structure
  const sidebarRef = useRef<HTMLElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const sidebarNavRef = useRef<HTMLElement | null>(null);
  const activeNavItemRef = useRef<HTMLDivElement | null>(null);
  const lastSidebarSyncAtRef = useRef<number>(0);
  const userIsInteractingSidebarRef = useRef<boolean>(false);

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

  // [G3 REMOVED] Sidebar tự đóng khi click outside đã bị loại bỏ.
  // Lý do: Cản người dùng khi muốn mở rộng sidebar làm việc dài hạn.

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
    if (!sidebarOpen) return;
    const nav = sidebarNavRef.current;
    const active = activeNavItemRef.current;
    if (!nav) return;

    let rafId = 0;
    const run = () => {
      if (active) {
        const navRect = nav.getBoundingClientRect();
        const itemRect = active.getBoundingClientRect();
        const above = itemRect.top < navRect.top + 18;
        const below = itemRect.bottom > navRect.bottom - 18;
        if (above || below) {
          active.scrollIntoView({
            block: "center",
            behavior: "smooth",
          });
          return;
        }
      }
      if (Math.abs(nav.scrollTop) > 0.5) {
        nav.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    rafId = window.requestAnimationFrame(() => {
      rafId = window.requestAnimationFrame(run);
    });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [sidebarOpen, location]);

  useEffect(() => {
    if (settingsOpen) {
      setChangePasswordMode(false);
      setVerifiedOldPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasFocusedCurrent(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }, [settingsOpen]);

  const avatarSrc =
    user?.avatarPath && user?.id
      ? `${api.users.avatar.path.replace(":id", user.id)}?v=${encodeURIComponent(String(user.updatedAt ?? ""))}`
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;

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
    () => notificationList.slice(0, 10),
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
    return [...list].sort((a, b) => {
      const ai = (a as any).isImportant ? 1 : 0;
      const bi = (b as any).isImportant ? 1 : 0;
      if (ai !== bi) return bi - ai;
      const at = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
      return bt - at;
    });
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
    ...(canViewThuKyHopPhan
      ? [{ href: "/thu-ky-hop-phan", label: "Thư ký hợp phần", icon: FileText }]
      : []),
    { href: "/team", label: language === "vi" ? "Nhóm" : "Team", icon: Users },
    ...(role === UserRole.ADMIN
      ? [
          {
            href: "/admin",
            label: language === "vi" ? "Quản trị" : "Admin",
            icon: Shield,
          },
        ]
      : []),
  ];

  return (
    <div
      className="min-h-[100dvh] bg-gray-50/50 overflow-x-hidden relative w-full"
      >
      {/* Sidebar V.3 Fixed Viewport Layer — cố định toàn bộ chiều dọc màn hình (inset-y-0 left-0)
          Không di chuyển theo scroll của trang (lên/xuống/trái/phải).
          Chiếm chiều rộng động theo expanded/collapsed state, main content bên phải tự padding-left tương ứng. */}
      <aside
        id="sidebar-nav"
        ref={sidebarRef}
        className={cn(
          "hidden md:block",
          "fixed inset-y-0 left-0 z-30",
          sidebarOpen ? "md:p-3" : "md:p-2",
        )}
        style={{
          width: sidebarOpen
            ? "var(--sidebar-width-expanded)"
            : "var(--sidebar-width-collapsed)",
          transition:
            "width 320ms cubic-bezier(0.22,1,0.36,1), padding 320ms ease",
        }}>
        <div
          className={cn(
            "sidebar-shell h-full flex flex-col overflow-hidden",
            "rounded-2xl border",
          )}
          style={{
            borderColor: "hsl(var(--sidebar-border) / 0.9)",
          }}>
          {/* NAVBAR TOP: logo area (hình tròn như tham chiếu DexignLab) + toggle Chevron đơn giản
              Khi COLLAPSED: ẩn toggle bên trong (dùng Floating Gold Bar 10px làm trigger),
              logo 44px căn giữa tuyệt đối (đồng bộ với nav items 44px bên dưới) để thẳng hàng pixel-perfect.
              Padding logo area = padding nav items (px-1 py-4) → edge left/right của 2 vùng trùng nhau = thẳng hàng tuyệt đối. */}
          <div
            className={cn(
              "relative flex-shrink-0 flex items-center transition-[padding] duration-300 ease-out",
              sidebarOpen
                ? "p-3 justify-between gap-2"
                : "px-1 py-4 justify-center items-center",
            )}
            style={{
              borderBottom: "1px solid hsl(var(--sidebar-border) / 0.7)",
              background:
                "linear-gradient(180deg, hsl(var(--sidebar-bg-elevated)), hsl(var(--sidebar-bg)))",
            }}>
            <div
              className={cn(
                "flex items-center gap-3 min-w-0",
                sidebarOpen ? "justify-start" : "justify-center w-full",
              )}>
              {/* Logo container: COLLAPSED mode = 44×44 (đồng bộ 100% kích thước nav buttons dưới)
                  Collapsed: dùng rounded-2xl thay vì rounded-full? Giữ hình tròn (brand), nhưng
                  center-align vật lý bằng w/h chính xác + flex-center. */}
              <div
                className="flex-shrink-0 relative flex items-center justify-center"
                style={{
                  width: sidebarOpen ? 48 : 44,
                  height: sidebarOpen ? 48 : 44,
                  borderRadius: sidebarOpen ? "9999px" : "16px",
                  border: sidebarOpen
                    ? "1px solid hsl(var(--sidebar-border) / 0.7)"
                    : "1px solid transparent",
                  background: sidebarOpen
                    ? "radial-gradient(ellipse at 30% 20%, hsl(var(--sidebar-glow) / 0.22), transparent 60%), hsl(var(--sidebar-bg-elevated))"
                    : "hsl(var(--sidebar-bg-elevated))",
                  boxShadow: sidebarOpen
                    ? "0 1px 0 hsl(var(--sidebar-border) / 0.5) inset, 0 8px 16px -12px hsl(var(--sidebar-glow) / 0.5)"
                    : "none",
                }}>
                <img
                  src="/logo-duan.png"
                  alt="Logo Văn phòng Dự án Kinh điển phương Đông"
                  draggable={false}
                  className="object-contain select-none m-auto block"
                  style={{
                    width: sidebarOpen ? "68%" : "70%",
                    height: sidebarOpen ? "68%" : "70%",
                    maxWidth: "100%",
                    maxHeight: "100%",
                  }}
                />
              </div>
              <div
                className={cn(
                  "flex flex-col min-w-0",
                  sidebarOpen
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden pointer-events-none",
                )}
                style={{ transition: "opacity 200ms ease 60ms" }}>
                <span
                  className="font-display font-bold tracking-tight text-[15px] leading-none truncate"
                  style={{
                    color: "hsl(var(--sidebar-fg))",
                  }}>
                  {language === "vi" ? "Văn phòng KDPD" : "KDPD Office"}
                </span>
                <span
                  className="mt-1 text-[11px] leading-none truncate"
                  style={{ color: "hsl(var(--sidebar-muted-fg))" }}>
                  {language === "vi"
                    ? "Quản lý dự án Kinh điển"
                    : "Project Management"}
                </span>
              </div>
            </div>

            {/* Toggle button Chevron — CHỈ HIỂN THỊ KHI EXPANDED (collapsed dùng Floating Gold Bar thay thế
                để tránh chồng lấn logo + không gian quá chật). */}
            <button
              type="button"
              aria-label={
                sidebarOpen
                  ? language === "vi"
                    ? "Thu gọn thanh điều hướng"
                    : "Collapse navigation"
                  : language === "vi"
                  ? "Mở rộng thanh điều hướng"
                  : "Expand navigation"
              }
              aria-expanded={sidebarOpen}
              aria-controls="sidebar-nav"
              onClick={() => setSidebarOpen((v) => !v)}
              className={cn(
                "relative flex-shrink-0 flex items-center justify-center rounded-full border cursor-pointer select-none outline-none transition-all duration-300 ease-out hover:opacity-90 active:scale-95",
                sidebarOpen
                  ? "h-9 w-9 opacity-100 scale-100 translate-x-0"
                  : "h-0 w-0 min-h-0 min-w-0 opacity-0 -translate-x-1 scale-50 pointer-events-none overflow-hidden border-0",
              )}
              style={{
                borderColor: "hsl(var(--sidebar-border) / 0.7)",
                background: "hsl(var(--sidebar-bg-elevated))",
                color: "hsl(var(--sidebar-muted-fg))",
                boxShadow: sidebarOpen
                  ? "0 1px 0 hsl(var(--sidebar-border) / 0.5) inset"
                  : "none",
              }}>
              {sidebarOpen ? (
                <ChevronLeft className="w-4.5 h-4.5 shrink-0" />
              ) : (
                <ChevronRight className="w-4.5 h-4.5 shrink-0" />
              )}
            </button>
          </div>

          <nav
            ref={(el) => {
              sidebarNavRef.current = el;
            }}
            onWheel={() => {
              userIsInteractingSidebarRef.current = true;
              window.clearTimeout(
                (userIsInteractingSidebarRef as any)._t as
                  | number
                  | undefined,
              );
              (userIsInteractingSidebarRef as any)._t = window.setTimeout(() => {
                userIsInteractingSidebarRef.current = false;
              }, 1200);
            }}
            onPointerDown={() => {
              userIsInteractingSidebarRef.current = true;
            }}
            onPointerUp={() => {
              window.clearTimeout(
                (userIsInteractingSidebarRef as any)._t as
                  | number
                  | undefined,
              );
              (userIsInteractingSidebarRef as any)._t = window.setTimeout(() => {
                userIsInteractingSidebarRef.current = false;
              }, 900);
            }}
            className={cn(
              "flex-1 space-y-1 overflow-y-auto overscroll-contain transition-[padding] duration-300 ease-out",
              sidebarOpen
                ? "px-3 py-3"
                : "px-1 py-4 md:space-y-3",
            )}>
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    ref={(el) => {
                      if (isActive) activeNavItemRef.current = el;
                    }}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        window.location.href = item.href;
                      }
                    }}
                    title={sidebarOpen ? undefined : item.label}
                    className={cn(
                      "sidebar-nav-item relative flex items-center text-xs font-medium cursor-pointer select-none",
                      sidebarOpen
                        ? "gap-3 px-3.5 py-2.5 justify-start h-11 w-full rounded-xl"
                        : "gap-0 justify-center items-center h-11 w-11 aspect-square rounded-2xl mx-auto",
                      isActive && "sidebar-nav-item-active",
                    )}>
                    <item.icon
                      className={cn(
                        "flex-shrink-0 w-[18px] h-[18px]",
                      )}
                    />
                    <span
                      className={cn(
                        "min-w-0 truncate transition-[opacity,transform,width] duration-200 ease-out font-medium",
                        sidebarOpen
                          ? "w-auto opacity-100 translate-x-0"
                          : "w-0 opacity-0 -translate-x-2 pointer-events-none overflow-hidden",
                      )}>
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Footer Action Icons Group — tham chiếu DexignLab (2 icon gradient đặc biệt ở cuối sidebar rail)
              Khi collapsed: 2 icon tròn gradient nổi bật (44px, căn giữa tuyệt đối) | Khi expanded: 2 row như nav item thường */}
          <div
            className={cn(
              "flex-shrink-0 border-t transition-[padding] duration-300 ease-out",
              sidebarOpen
                ? "px-3 pt-2 pb-1 space-y-1.5"
                : "px-1 pt-3 pb-2 space-y-3",
            )}
            style={{ borderColor: "hsl(var(--sidebar-border) / 0.6)" }}>
            {/* Settings */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSettingsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSettingsOpen(true);
                }
              }}
              title={
                language === "vi" ? "Cài đặt tài khoản" : "Account settings"
              }
              className={cn(
                "sidebar-nav-item relative flex items-center text-xs font-medium cursor-pointer select-none transition-all duration-200",
                sidebarOpen
                  ? "gap-3 px-3.5 py-2.5 justify-start h-11 w-full rounded-xl"
                  : "gap-0 justify-center items-center h-11 w-11 aspect-square mx-auto rounded-full text-white",
              )}
              style={
                !sidebarOpen
                  ? {
                      background:
                        "linear-gradient(135deg, hsl(var(--sidebar-glow)) 0%, hsl(12 78% 58%) 100%)",
                      boxShadow:
                        "0 6px 16px -8px hsl(var(--sidebar-glow) / 0.8), 0 0 0 1px hsl(var(--sidebar-glow) / 0.5) inset",
                      color: "hsl(var(--accent-foreground))",
                      border: "1px solid transparent",
                    }
                  : undefined
              }>
              <Settings className="w-[18px] h-[18px] flex-shrink-0" />
              <span
                className={cn(
                  "min-w-0 truncate transition-[opacity,transform,width] duration-200 ease-out font-medium",
                  sidebarOpen
                    ? "w-auto opacity-100 translate-x-0"
                    : "w-0 opacity-0 -translate-x-2 pointer-events-none overflow-hidden",
                )}>
                {language === "vi" ? "Cài đặt" : "Settings"}
              </span>
            </div>
            {/* PWA Install */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!installPromptOpen) setInstallPromptOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!installPromptOpen) setInstallPromptOpen(true);
                }
              }}
              title={
                language === "vi"
                  ? "Cài đặt ứng dụng"
                  : "Install application"
              }
              className={cn(
                "sidebar-nav-item relative flex items-center text-xs font-medium cursor-pointer select-none transition-all duration-200",
                sidebarOpen
                  ? "gap-3 px-3.5 py-2.5 justify-start h-11 w-full rounded-xl"
                  : "gap-0 justify-center items-center h-11 w-11 aspect-square mx-auto rounded-full text-white",
              )}
              style={
                !sidebarOpen
                  ? {
                      background:
                        "linear-gradient(135deg, hsl(192 78% 36%) 0%, hsl(274 62% 58%) 100%)",
                      boxShadow:
                        "0 6px 16px -8px hsl(192 78% 36% / 0.8), 0 0 0 1px hsl(192 78% 36% / 0.5) inset",
                      color: "hsl(var(--primary-foreground))",
                      border: "1px solid transparent",
                    }
                  : undefined
              }>
              <Smartphone className="w-[18px] h-[18px] flex-shrink-0" />
              <span
                className={cn(
                  "min-w-0 truncate transition-[opacity,transform,width] duration-200 ease-out font-medium",
                  sidebarOpen
                    ? "w-auto opacity-100 translate-x-0"
                    : "w-0 opacity-0 -translate-x-2 pointer-events-none overflow-hidden",
                )}>
                {language === "vi" ? "Ứng dụng" : "Install app"}
              </span>
            </div>
          </div>

          {/* Footer Tips card — đơn giản hóa theo tông V.3 sạch, tối giản (visible expanded only) */}
          <div
            className={cn(
              "relative mx-2 mb-2 flex-shrink-0 rounded-2xl border overflow-hidden transition-all duration-300 ease-out",
              sidebarOpen
                ? "opacity-100 p-4 mt-2 translate-y-0"
                : "opacity-0 p-2 h-0 mt-0 pointer-events-none translate-y-1",
            )}
            style={{
              borderColor: "hsl(var(--sidebar-border) / 0.7)",
              background:
                "linear-gradient(180deg, hsl(var(--sidebar-bg-elevated)), hsl(var(--sidebar-bg)))",
            }}>
            <p
              className="font-display font-bold leading-tight text-[14px]"
              style={{ color: "hsl(var(--sidebar-fg))" }}>
              {language === "vi" ? "Mẹo nhanh" : "Quick tips"}
            </p>
            <p
              className="mt-1.5 text-[11.5px] leading-snug"
              style={{ color: "hsl(var(--sidebar-muted-fg))" }}>
              {language === "vi"
                ? "Nhấn Ctrl/⌘ + K để tìm kiếm tức thì. Dùng badges lọc nhanh công việc."
                : "Press Ctrl/⌘+K for quick search. Use badges for fast task filtering."}
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 sidebar-shell border-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-[hsl(var(--sidebar-border))]/70">
              <div className="flex items-center gap-3 font-display font-bold text-2xl">
                <div className="flex items-center justify-center rounded-full border w-11 h-11" style={{
                  borderColor: "hsl(var(--sidebar-border) / 0.8)",
                  background: "hsl(var(--sidebar-bg-elevated))",
                }}>
                  <img
                    src="/logo-duan.png"
                    alt="Logo"
                    draggable={false}
                    className="h-[65%] w-[65%] object-contain select-none"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold leading-tight" style={{ color: "hsl(var(--sidebar-fg))" }}>
                    {language === "vi" ? "Văn phòng KDPD" : "KDPD Office"}
                  </span>
                </div>
              </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}>
                    <div
                      className={cn(
                        "sidebar-nav-item flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium cursor-pointer transition-all duration-200 h-11 w-full",
                        isActive && "sidebar-nav-item-active",
                      )}>
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              {/* Mobile Settings + PWA actions (consistency với desktop) */}
              <div className="mt-3 pt-3 border-t space-y-1" style={{ borderColor: "hsl(var(--sidebar-border) / 0.6)" }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    setSettingsOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMobileSidebarOpen(false);
                      setSettingsOpen(true);
                    }
                  }}
                  className={cn(
                    "sidebar-nav-item flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium cursor-pointer transition-all duration-200 h-11 w-full",
                  )}>
                  <Settings className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="font-medium">
                    {language === "vi" ? "Cài đặt" : "Settings"}
                  </span>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    if (!installPromptOpen) setInstallPromptOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMobileSidebarOpen(false);
                      if (!installPromptOpen) setInstallPromptOpen(true);
                    }
                  }}
                  className={cn(
                    "sidebar-nav-item flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium cursor-pointer transition-all duration-200 h-11 w-full",
                  )}>
                  <Smartphone className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="font-medium">
                    {language === "vi" ? "Cài ứng dụng" : "Install app"}
                  </span>
                </div>
              </div>
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main
        ref={mainContentRef}
        id="main-content"
        role="main"
        aria-label="Nội dung chính"
        className="flex flex-col min-h-[100dvh] min-w-0 bg-[hsl(var(--background))] w-full"
        style={{
          paddingLeft: sidebarOpen
            ? "var(--sidebar-width-expanded)"
            : "var(--sidebar-width-collapsed)",
          // padding-top 64px = chiều cao fixed header h-16, đảm bảo nội dung đầu (hero/tabs/...)
          // không bị che bởi header fixed (thay vì chỉ dùng sticky main-flow)
          paddingTop: "var(--app-header-height, 4rem)",
          transition:
            "padding-left 320ms cubic-bezier(0.22,1,0.36,1), padding-top 200ms ease",
        }}>
        {/* Header — LUÔN HIỂN THỊ TRÊN ĐẦU TRANG (fixed top-0 z-40)
            ĐẶC BIỆT QUAN TRỌNG: Không dùng inset-x-0 (chiếm toàn viewport) → sẽ CHE sidebar fixed left-0.
            Giải pháp: Đặt `left: sidebarWidth` (động theo expanded/collapsed) + `right: 0`
              → Header chỉ chiếm nửa PHẢI màn hình, BẮT ĐẦU NGAY TẠI MẸP PHẢI sidebar
              → Sidebar (left-0 → sidebarWidth) luôn hiển thị đầy đủ, SÁT cạnh trái header (yêu cầu user).
            Kích thước (width) header TỰ ĐỘNG THAY ĐỔI theo sidebar width:
              · Collapsed (80px): header width = 100vw - 80px
              · Expanded  (256px): header width = 100vw - 256px
              · Mobile   (no sidebar): header width = 100vw (left=0, md:hidden cho desktop logic) */}
        <header
          className="h-16 px-4 sm:px-8 flex items-center justify-between sticky-app-header"
          style={{
            left: sidebarOpen
              ? "var(--sidebar-width-expanded)"
              : "var(--sidebar-width-collapsed)",
            right: 0,
            width: "auto",
            transition:
              "left 320ms cubic-bezier(0.22,1,0.36,1), width 320ms cubic-bezier(0.22,1,0.36,1)",
          }}>
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
              <DropdownMenuContent
                align="end"
                className="w-[calc(100vw-2rem)] sm:w-[360px] p-0">
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
                  <div className="flex justify-end mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isMarkingAllRead || (unreadCount?.count ?? 0) === 0}
                      onClick={() => {
                        markAllNotificationsRead(undefined, {
                          onSuccess: (r) => {
                            toast({
                              title:
                                language === "vi"
                                  ? "Đã đánh dấu tất cả là đã đọc"
                                  : "Marked all as read",
                              description:
                                language === "vi"
                                  ? `Đã cập nhật ${r.updated} thông báo.`
                                  : `Updated ${r.updated} notifications.`,
                            });
                          },
                          onError: (err) => {
                            toast({
                              title: language === "vi" ? "Thao tác thất bại" : "Failed",
                              description:
                                err instanceof Error ? err.message : "Failed",
                              variant: "destructive",
                            });
                          },
                        });
                      }}>
                      {(t.dashboard as any).markAllReadBtn ?? (language === "vi" ? "Đánh dấu tất cả đã xem" : "Mark all as read")}
                    </Button>
                  </div>
                </div>
                {latestNotifications.length === 0 ? (
                  <div className="px-3 py-4">
                    <EmptyStateCTA
                      variant="compact"
                      illustration="scroll"
                      title={(t.dashboard as any).notificationEmptyTitle ?? (language === "vi" ? "Chưa có thông báo" : "No notifications yet")}
                    />
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
                              className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.isRead ? "bg-muted-foreground/40" : "bg-amber-500"}`}
                            />
                            <div className="min-w-0 flex-1">
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 -mt-0.5 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (n.isRead) {
                                  markNotificationUnread(n.id);
                                } else {
                                  markNotificationRead(n.id);
                                }
                              }}
                              aria-label={
                                n.isRead
                                  ? ((t.dashboard as any).markUnreadAria ?? (language === "vi" ? "Đánh dấu chưa xem" : "Mark as unread"))
                                  : ((t.dashboard as any).markReadAria ?? (language === "vi" ? "Đánh dấu đã xem" : "Mark as read"))
                              }>
                              {n.isRead ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
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
                    <AvatarImage src={avatarSrc} />
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
        <div className="flex-1 max-sm:p-3 sm:p-6 lg:p-8 bg-muted/20 min-h-0 animate-enter">
          {children}
        </div>

        {/* Footer với hoa văn nền: /HVDV - LYTRAN - PhiThien_Light.png
            - Light mode: hoa văn gốc (mực đậm/vàng thư pháp), opacity trung bình ~10-14%
            - Dark mode: sử dụng pseudo-class Tailwind `dark:` + filter invert(1) → HOÀN TOÀN ĐỔI SANG MÀU TRẮNG
              (đặc biệt, không đảo màu chữ copyright — đảo màu chỉ áp dụng cho pattern layer riêng biệt
              bằng cách đặt ảnh nền trong pseudo element ::before riêng, đảo màu chỉ trên pseudo đó
              → chữ Copyright không bị tẩy trắng/đảo) */}
        <footer
          className={cn(
            "relative overflow-hidden border-t w-full px-4 sm:px-8 py-6",
          )}
          style={{
            borderColor: "hsl(var(--border) / 0.5)",
            background:
              theme === "dark"
                ? "hsl(var(--card))"
                : "hsl(var(--card))",
          }}>
          {/* Inner 2nd scrim (light/dark): nhẹ opacity ~15-20% để tăng contrast cho text
              KHÔNG che khuất pattern artwork (pattern đặt SAO layer này với z-index cao hơn). */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                theme === "dark"
                  ? "linear-gradient(180deg, hsl(var(--card) / 0.18) 0%, hsl(var(--card) / 0.22) 100%)"
                  : "linear-gradient(180deg, hsl(var(--card) / 0.12) 0%, hsl(var(--card) / 0.18) 100%)",
            }}
          />
          {/* Pattern Artwork Layer: đặt SAU scrim (DOM order later = render trên cùng) + z-5
              Text content z-10 cao hơn pattern → text không bị ảnh hưởng */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none select-none"
            style={{
              backgroundImage:
                'url("/PhiThien_Light.png")',
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              backgroundPosition: "center 58%",
              opacity: theme === "dark" ? 0.14 : 0.12,
              zIndex: 5,
              filter:
                theme === "dark"
                  ? "invert(1) brightness(1.1) saturate(0.12)"
                  : "saturate(1.08) brightness(1.04)",
              mixBlendMode: theme === "dark" ? "normal" : "multiply",
            }}
          />
          {/* Text content z-10 trên tất cả layer (pattern + scrim + base card) → không bị ảnh hưởng filter */}
          <div className="relative z-10 text-center text-xs text-muted-foreground">
            © 2026 KDPD · All rights reserved | Bản quyền thuộc về Văn phòng Dự án Kinh điển phương Đông
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
            <Button
              type="button"
              variant="outline"
              disabled={(unreadCount?.count ?? 0) === 0 || isMarkingAllRead}
              onClick={() => {
                markAllNotificationsRead(undefined, {
                  onSuccess: (r) => {
                    toast({
                      title:
                        language === "vi"
                          ? "Đã đánh dấu tất cả là đã đọc"
                          : "Marked all as read",
                      description:
                        language === "vi"
                          ? `Đã cập nhật ${r.updated} thông báo.`
                          : `Updated ${r.updated} notifications.`,
                    });
                  },
                  onError: (err) => {
                    toast({
                      title: language === "vi" ? "Thao tác thất bại" : "Failed",
                      description:
                        err instanceof Error ? err.message : "Failed",
                      variant: "destructive",
                    });
                  },
                });
              }}>
              {language === "vi"
                ? isMarkingAllRead
                  ? "Đang xử lý..."
                  : "Đánh dấu tất cả đã đọc"
                : isMarkingAllRead
                  ? "Working..."
                  : "Mark all read"}
            </Button>
          </div>

          <div className="mt-4 max-h-[420px] overflow-auto border rounded-lg">
            {filteredNotifications.length === 0 ? (
              <div className="p-6">
                <EmptyStateCTA
                  variant="compact"
                  illustration="scroll"
                  title={t.dashboard.notificationEmptyTitle ?? (language === "vi" ? "Chưa có thông báo" : "No notifications yet")}
                />
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
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              className={`h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted/60 ${(n as any).isImportant ? "text-amber-600" : "text-muted-foreground"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotificationImportant({
                                  id: n.id,
                                  isImportant: !(
                                    (n as any).isImportant ?? false
                                  ),
                                });
                              }}
                              aria-label={
                                language === "vi"
                                  ? "Đánh dấu quan trọng"
                                  : "Mark important"
                              }>
                              <Star
                                className={`h-4 w-4 ${(n as any).isImportant ? "fill-current" : ""}`}
                              />
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted/60 text-muted-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={
                                    language === "vi" ? "Tùy chọn" : "More"
                                  }>
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {n.isRead ? (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markNotificationUnread(n.id);
                                    }}>
                                    {language === "vi"
                                      ? "Đánh dấu là chưa đọc"
                                      : "Mark as unread"}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markNotificationRead(n.id);
                                    }}>
                                    {language === "vi"
                                      ? "Đánh dấu là đã đọc"
                                      : "Mark as read"}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <Badge variant="secondary" className="text-[10px]">
                              {n.group}
                            </Badge>
                          </div>
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
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border border-border">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback>
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setAvatarFile(f);
                  }}
                />
                <Button
                  className="w-full"
                  disabled={!avatarFile || uploadingAvatar}
                  onClick={async () => {
                    if (!avatarFile) return;
                    try {
                      setUploadingAvatar(true);
                      const form = new FormData();
                      form.append("file", avatarFile);
                      const res = await fetch(api.users.uploadAvatar.path, {
                        method: api.users.uploadAvatar.method,
                        credentials: "include",
                        body: form,
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        toast({
                          title:
                            language === "vi"
                              ? "Tải ảnh thất bại"
                              : "Upload failed",
                          description: data.message ?? "",
                          variant: "destructive",
                          duration: 7000,
                        });
                        return;
                      }
                      await refreshMe();
                      setAvatarFile(null);
                      if (avatarInputRef.current)
                        avatarInputRef.current.value = "";
                      toast({
                        title:
                          language === "vi"
                            ? "Đã cập nhật avatar"
                            : "Avatar updated",
                      });
                    } finally {
                      setUploadingAvatar(false);
                    }
                  }}>
                  {language === "vi" ? "Cập nhật avatar" : "Update avatar"}
                </Button>
              </div>
            </div>
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
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
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
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowCurrentPassword((v) => !v)}
                      aria-label={
                        showCurrentPassword
                          ? language === "vi"
                            ? "Ẩn mật khẩu"
                            : "Hide password"
                          : language === "vi"
                            ? "Hiện mật khẩu"
                            : "Show password"
                      }
                      title={
                        showCurrentPassword
                          ? language === "vi"
                            ? "Ẩn mật khẩu"
                            : "Hide password"
                          : language === "vi"
                            ? "Hiện mật khẩu"
                            : "Show password"
                      }>
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
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
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder={
                        language === "vi"
                          ? "Mật khẩu mới (≥8 ký tự)"
                          : "New password (≥8 chars)"
                      }
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={
                        showNewPassword
                          ? language === "vi"
                            ? "Ẩn mật khẩu"
                            : "Hide password"
                          : language === "vi"
                            ? "Hiện mật khẩu"
                            : "Show password"
                      }
                      title={
                        showNewPassword
                          ? language === "vi"
                            ? "Ẩn mật khẩu"
                            : "Hide password"
                          : language === "vi"
                            ? "Hiện mật khẩu"
                            : "Show password"
                      }>
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {(() => {
                    const req = getPasswordRequirementState(newPassword);
                    const Item = ({
                      ok,
                      label,
                    }: {
                      ok: boolean;
                      label: string;
                    }) => (
                      <div
                        className={`text-xs ${ok ? "text-emerald-700" : "text-muted-foreground"}`}>
                        {ok ? "✓" : "•"} {label}
                      </div>
                    );
                    return (
                      <div className="grid gap-1">
                        <div className="text-xs font-medium">
                          {language === "vi"
                            ? "Yêu cầu mật khẩu"
                            : "Password requirements"}
                        </div>
                        <Item
                          ok={req.lengthOk}
                          label={
                            language === "vi"
                              ? "Tối thiểu 8 ký tự"
                              : "Minimum 8 characters"
                          }
                        />
                        <Item
                          ok={req.upperOk}
                          label={
                            language === "vi"
                              ? "Có chữ hoa (A-Z)"
                              : "Contains uppercase (A-Z)"
                          }
                        />
                        <Item
                          ok={req.lowerOk}
                          label={
                            language === "vi"
                              ? "Có chữ thường (a-z)"
                              : "Contains lowercase (a-z)"
                          }
                        />
                        <Item
                          ok={req.numberOk}
                          label={
                            language === "vi"
                              ? "Có số (0-9)"
                              : "Contains number (0-9)"
                          }
                        />
                        <Item
                          ok={req.specialOk}
                          label={
                            language === "vi"
                              ? "Có ký tự đặc biệt"
                              : "Contains special character"
                          }
                        />
                      </div>
                    );
                  })()}
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={
                        language === "vi"
                          ? "Xác nhận mật khẩu mới"
                          : "Confirm new password"
                      }
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={
                        showConfirmPassword
                          ? language === "vi"
                            ? "Ẩn mật khẩu"
                            : "Hide password"
                          : language === "vi"
                            ? "Hiện mật khẩu"
                            : "Show password"
                      }
                      title={
                        showConfirmPassword
                          ? language === "vi"
                            ? "Ẩn mật khẩu"
                            : "Hide password"
                          : language === "vi"
                            ? "Hiện mật khẩu"
                            : "Show password"
                      }>
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    className="w-full"
                    disabled={
                      changingPassword ||
                      !getPasswordRequirementState(newPassword).ok ||
                      newPassword !== confirmPassword
                    }
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
                      if (!getPasswordRequirementState(newPassword).ok) {
                        toast({
                          title:
                            language === "vi"
                              ? "Mật khẩu chưa đạt yêu cầu"
                              : "Password requirements not met",
                          description:
                            language === "vi"
                              ? "Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
                              : "Minimum 8 chars with upper/lowercase, number, and special character",
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

      {/* Floating Gold Bar Toggle — NÚT MỞ RỘNG SIDEBAR ĐỂ BÊN MẸP PHẢI CỦA SIDEBAR (theo yêu cầu).
          Khi sidebar collapsed: nút đặt ngay cạnh phải rail 80px → nhìn thấy ở biên giữa sidebar & main content.
          Tăng kích thước (16×96px) thay vì 10×96px cho dễ bấm (đạt touch target dễ dàng).
          Animation hover: rộng ra 24px, scale nhẹ, có icon Chevron hướng phải để chỉ dẫn hành động expand. */}
      {/* <button
        type="button"
        aria-label={
          sidebarOpen
            ? language === "vi"
              ? "Thu gọn thanh điều hướng"
              : "Collapse navigation"
            : language === "vi"
            ? "Mở rộng thanh điều hướng"
            : "Expand navigation"
        }
        aria-expanded={sidebarOpen}
        aria-controls="sidebar-nav"
        onClick={() => setSidebarOpen((v) => !v)}
        className={cn(
          "hidden md:flex fixed top-1/2 -translate-y-1/2 z-40",
          // Right-edge placement: left = EXACT WIDTH của sidebar (5rem = 80px khi collapsed, 16rem = 256px khi expanded)
          // Dùng JS style để động theo state, className chỉ định dạng chung
          "items-center justify-center",
          "cursor-pointer select-none outline-none",
          "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "active:scale-y-95 active:scale-x-95",
          sidebarOpen
            ? "opacity-0 -translate-x-full pointer-events-none"
            : "opacity-100 translate-x-0",
        )}
        style={{
          // LEFT-OFFSET ĐỘNG THEO WIDTH SIDEBAR → ĐẶT NGAY MẸP PHẢI CỦA SIDEBAR COLLAPSED/EXPANDED
          left: sidebarOpen
            ? "var(--sidebar-width-expanded)"
            : "var(--sidebar-width-collapsed)",
          // TĂNG KÍCH THƯỚC: 16px ngang × 96px dọc (dễ bấm hơn 10×96px cũ)
          width: 16,
          height: 96,
          borderRadius: "0 12px 12px 0",    // bo phải (left-edge của trigger gắn vào sidebar)
          background:
            "linear-gradient(180deg, hsl(var(--sidebar-glow)) 0%, hsl(39 82% 48%) 50%, hsl(var(--sidebar-glow)) 100%)",
          boxShadow:
            // Shadow đổ SANG PHẢI (vì trigger ở right-edge, hướng vào main content)
            "4px 0 16px -6px hsl(var(--sidebar-glow) / 0.75), 0 0 0 1px hsl(var(--sidebar-glow) / 0.55) inset",
        }}
        title={
          sidebarOpen
            ? language === "vi"
              ? "Thu gọn"
              : "Collapse"
            : language === "vi"
            ? "Mở rộng menu"
            : "Expand menu"
        }>
        <ChevronRight
          aria-hidden
          className="w-[14px] h-[14px] -translate-x-[1px] shrink-0 text-white/95 drop-shadow-[0_1px_1px_hsl(var(--sidebar-active-fg)/0.35)]"
          style={{ transition: "transform 260ms ease" }}
        />
      </button> */}

      <CommandPalette
        tasks={tasks}
        permissions={{
          canViewCVChung: true,
          canViewEditorial: canViewBienTap,
          canViewDesign: canViewThietKe,
          canViewCNTT,
          canViewThukyhopPhan: canViewThuKyHopPhan,
          canViewTeam: true,
          canViewAdmin: role === UserRole.ADMIN,
          canExportExcel: true,
          canCreateTask: true,
        }}
        onOpenTask={(t) => setSelectedTask(t as any)}
      />

      <AlertDialog
        open={installPromptOpen}
        onOpenChange={(open) => {
          if (!open) {
            setInstallPromptOpen(false);
            try {
              localStorage.setItem(
                "kdpd_pwa_install_dismissed_at",
                String(Date.now()),
              );
            } catch {
              // ignore
            }
          } else {
            setInstallPromptOpen(true);
          }
        }}>
        <AlertDialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-amber-500/30">
              <Smartphone className="h-7 w-7" />
            </div>
            <AlertDialogHeader className="flex-1 text-left sm:pt-1">
              <AlertDialogTitle className="text-xl leading-tight">
                {language === "vi"
                  ? "Cài KDPD vào màn hình chính"
                  : "Install KDPD to your Home Screen"}
              </AlertDialogTitle>
              <AlertDialogDescription className="pt-2 text-[14px] leading-relaxed">
                {language === "vi"
                  ? "Truy cập nhanh hơn, hoạt động ngoại tuyến và nhận thông báo đẩy theo thời gian thực — giống hệt một ứng dụng gốc."
                  : "Faster access, offline support, and real-time push notifications — just like a native app."}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          {blocker?.code === "NOT_SECURE_CONTEXT" && (
            <div className="mt-1 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-4 w-4 flex-none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div className="leading-relaxed">
                <div className="font-semibold">
                  {language === "vi"
                    ? "Không thể cài đặt trên kết nối HTTP"
                    : "Cannot install over HTTP"}
                </div>
                <div className="opacity-90">
                  {language === "vi"
                    ? "Trình duyệt yêu cầu kết nối HTTPS (hoặc localhost) để cài PWA. Vui lòng truy cập bằng https://task.kdpd.local hoặc xem hướng dẫn bật SSL trong DEPLOY.md."
                    : "Your browser requires a secure (HTTPS) connection (or localhost) to install PWAs. Please use https://task.kdpd.local or enable SSL via the DEPLOY.md guide."}
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter className="sm:space-x-2">
            <AlertDialogCancel onClick={handleDismiss}>
              {language === "vi" ? "Để sau" : "Later"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInstall}
              disabled={!canInstall}
              title={
                !canInstall && blocker
                  ? blocker.message
                  : undefined
              }>
              <Download className="-ml-1 mr-2 h-4 w-4" />
              {language === "vi" ? "Cài đặt ngay" : "Install now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
