/**
 * Admin Backup Panel — Quản lý sao lưu CSDL định kỳ
 *
 * Gắn vào trang Quản trị (admin-users.tsx). Chỉ Admin mới hiển thị.
 * Các thành phần:
 *   1. CTA "Sao lưu NGAY BÂY GIỜ"
 *   2. Cấu hình nơi lưu: Local (thư mục máy chủ) / Google Drive / OneDrive (link thư mục user cung cấp)
 *   3. Lịch trình tự động: Off / Hằng ngày / Hằng tuần / Hằng tháng + giờ phút
 *   4. Danh sách file backup (list, tải về, xoá) + lịch sử chạy gần đây
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { UserRole } from "@shared/schema";
import {
  DatabaseBackup,
  HardDriveDownload,
  Trash2,
  Play,
  Loader2,
  FolderOpen,
  Cloud,
  CloudLightning,
  CloudUpload,
  CloudOff,
  HardDrive,
  RotateCcw,
  CalendarClock,
  Save,
  ChevronRight,
  Download,
  FileArchive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types (giống server/backup.ts BackupConfig/BackupFile)
// ---------------------------------------------------------------------------
type StorageMode = "local" | "gdrive" | "onedrive";
type ScheduleMode = "off" | "daily" | "weekly" | "monthly";

interface BackupConfig {
  storageMode: StorageMode;
  localFolderPath: string;
  gdriveFolderLink: string;
  onedriveFolderLink: string;
  scheduleMode: ScheduleMode;
  scheduleHour: number;
  scheduleMinute: number;
  scheduleWeekday: number;
  scheduleDayOfMonth: number;
  lastRunAt: string | null;
  lastFileName: string | null;
  keepLastN: number;
}

interface BackupFileEntry {
  filename: string;
  sizeBytes: number;
  createdAtISO: string;
  prettySize: string;
  storageMode: StorageMode;
  trigger: "manual" | "schedule";
}

interface BackupRunLog {
  startedAtISO: string;
  endedAtISO: string | null;
  status: "running" | "success" | "failed";
  filename: string | null;
  error: string | null;
  trigger: "manual" | "schedule";
  uploadedTo?: "gdrive" | "onedrive" | null;
  uploadFileId?: string | null;
  uploadError?: string | null;
}

interface RestoreTableStats {
  tableName: string;
  rowsInDump: number;
  rowsInserted?: number;
  rowsSkipped?: number;
  rowsInTargetBefore?: number;
  error?: string | null;
}

interface RestoreStats {
  mode: "upsert" | "full";
  filename: string;
  startedAtISO: string;
  endedAtISO: string | null;
  tempSchemaName: string | null;
  totalTables: number;
  tablesProcessed: number;
  totalRowsInDump: number;
  totalRowsInserted: number;
  totalRowsSkipped: number;
  perTable: RestoreTableStats[];
  success: boolean;
  error: string | null;
  fullRestoreNote?: string | null;
}

interface RestoreRunningState {
  running: boolean;
  lastStats: RestoreStats | null;
}

const WEEKDAY_LABELS: { value: number; label: string }[] = [
  { value: 0, label: "Chủ Nhật" },
  { value: 1, label: "Thứ 2 (đề xuất)" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
];

function defaultConfig(): BackupConfig {
  return {
    storageMode: "local",
    localFolderPath: "./backups",
    gdriveFolderLink: "",
    onedriveFolderLink: "",
    scheduleMode: "off",
    scheduleHour: 2,
    scheduleMinute: 0,
    scheduleWeekday: 1,
    scheduleDayOfMonth: 1,
    lastRunAt: null,
    lastFileName: null,
    keepLastN: 14,
  };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function fetchConfig(): Promise<BackupConfig> {
  const res = await fetch("/api/backup/config", { credentials: "include" });
  if (res.status === 403) throw new Error("Chỉ Admin mới xem cấu hình sao lưu.");
  if (!res.ok) throw new Error("Không tải được cấu hình sao lưu.");
  return { ...defaultConfig(), ...(await res.json()) };
}

async function patchConfig(patch: Partial<BackupConfig>): Promise<BackupConfig> {
  const res = await fetch("/api/backup/config", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (res.status === 403) throw new Error("Chỉ Admin mới cập nhật cấu hình sao lưu.");
  if (!res.ok) throw new Error("Không lưu được cấu hình sao lưu.");
  return res.json();
}

async function fetchFiles(): Promise<BackupFileEntry[]> {
  const res = await fetch("/api/backup/files", { credentials: "include" });
  if (res.status === 403) throw new Error("Chỉ Admin mới xem danh sách sao lưu.");
  if (!res.ok) throw new Error("Không tải được danh sách file sao lưu.");
  return res.json();
}

async function fetchRunning(): Promise<boolean> {
  const res = await fetch("/api/backup/running", { credentials: "include" });
  if (!res.ok) return false;
  const j = await res.json().catch(() => ({ running: false }));
  return Boolean(j.running);
}

async function fetchLog(): Promise<BackupRunLog[]> {
  const res = await fetch("/api/backup/log", { credentials: "include" });
  if (!res.ok) return [];
  return (await res.json().catch(() => [])) as BackupRunLog[];
}

async function triggerBackupNow(): Promise<BackupFileEntry> {
  const res = await fetch("/api/backup/trigger", {
    method: "POST",
    credentials: "include",
  });
  if (res.status === 409) throw new Error("Một lượt sao lưu đang chạy. Vui lòng đợi.");
  if (res.status === 403) throw new Error("Chỉ Admin mới chạy sao lưu.");
  if (!res.ok) {
    const j = await res.json().catch(() => ({ message: "Sao lưu thất bại." }));
    throw new Error(j.message || "Sao lưu thất bại.");
  }
  return res.json() as Promise<BackupFileEntry>;
}

async function deleteFile(filename: string): Promise<void> {
  const res = await fetch(`/api/backup/files/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.message || "Xoá file backup thất bại.");
  }
}

async function fetchRestoreRunning(): Promise<RestoreRunningState> {
  const res = await fetch("/api/restore/running", { credentials: "include" });
  if (res.status === 403) return { running: false, lastStats: null };
  if (!res.ok) return { running: false, lastStats: null };
  return (await res.json().catch(() => ({ running: false, lastStats: null }))) as RestoreRunningState;
}

async function previewRestore(filename: string): Promise<RestoreStats> {
  const res = await fetch(`/api/backup/files/${encodeURIComponent(filename)}/restore-preview`, {
    method: "POST",
    credentials: "include",
  });
  if (res.status === 409) throw new Error("Một lượt khôi phục đang chạy. Vui lòng đợi.");
  if (res.status === 403) throw new Error("Chỉ Admin mới xem trước khôi phục.");
  if (!res.ok) {
    const j = await res.json().catch(() => ({ message: "Xem trước khôi phục thất bại." }));
    throw new Error(j.message || "Xem trước khôi phục thất bại.");
  }
  return res.json() as Promise<RestoreStats>;
}

async function triggerRestore(filename: string, mode: "upsert" | "full"): Promise<RestoreRunningState & { queued?: boolean; mode?: string }> {
  const qs = new URLSearchParams({ mode });
  const res = await fetch(`/api/backup/files/${encodeURIComponent(filename)}/restore?${qs.toString()}`, {
    method: "POST",
    credentials: "include",
  });
  if (res.status === 409) throw new Error("Một lượt khôi phục đang chạy. Vui lòng đợi.");
  if (res.status === 403) throw new Error("Chỉ Admin mới kích hoạt khôi phục.");
  if (!res.ok) {
    const j = await res.json().catch(() => ({ message: "Kích hoạt khôi phục thất bại." }));
    throw new Error(j.message || "Kích hoạt khôi phục thất bại.");
  }
  return res.json() as Promise<RestoreRunningState & { queued?: boolean; mode?: string }>;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return `${formatDateDDMMYYYY(d)} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AdminBackupPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const auth = useAuth();
  const role = auth.role;
  const curUserEmail = (auth.user as any)?.email ?? "anonymous";
  const curUserName = (auth.user as any)?.displayName ?? "";
  const isAdminRole = role === UserRole.ADMIN;

  const cfgQuery = useQuery<BackupConfig>({
    queryKey: ["/api/backup/config"],
    queryFn: fetchConfig,
    refetchInterval: isAdminRole ? 30_000 : false,
    enabled: isAdminRole,
    retry: 1,
  });

  const filesQuery = useQuery<BackupFileEntry[]>({
    queryKey: ["/api/backup/files"],
    queryFn: fetchFiles,
    refetchInterval: isAdminRole ? 20_000 : false,
    enabled: isAdminRole,
    retry: 1,
  });

  const logQuery = useQuery<BackupRunLog[]>({
    queryKey: ["/api/backup/log"],
    queryFn: fetchLog,
    refetchInterval: isAdminRole ? 15_000 : false,
    enabled: isAdminRole,
    retry: 1,
  });

  const runningQuery = useQuery<boolean>({
    queryKey: ["/api/backup/running"],
    queryFn: fetchRunning,
    refetchInterval: isAdminRole ? 3_000 : false,
    enabled: isAdminRole,
    retry: 1,
  });

  const restoreRunningQuery = useQuery<RestoreRunningState>({
    queryKey: ["/api/restore/running"],
    queryFn: fetchRestoreRunning,
    refetchInterval: isAdminRole ? 3_000 : false,
    enabled: isAdminRole,
    retry: 1,
  });

  const [draftCfg, setDraftCfg] = useState<BackupConfig | null>(null);
  const cfg = draftCfg ?? cfgQuery.data ?? defaultConfig();
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);

  // --- Restore dialog state
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<"upsert" | "full">("upsert");
  const [confirmFull1, setConfirmFull1] = useState(false);
  const [confirmFull2, setConfirmFull2] = useState(false);
  const [previewStats, setPreviewStats] = useState<RestoreStats | null>(null);

  // --- Tính toán lỗi 403 từ server (dùng khi user có role=admin client-side
  //     nhưng server session mất hoặc role backend khác)
  const server403Error = useMemo<string | null>(() => {
    const cfgErr = cfgQuery.error as Error | null;
    const filesErr = filesQuery.error as Error | null;
    const firstErr = cfgErr || filesErr;
    if (!firstErr) return null;
    const msg = firstErr.message || "";
    const low = msg.toLowerCase();
    if (low.includes("403") || low.includes("forbidden") || low.includes("chỉ admin")) {
      return (
        "Tài khoản đăng nhập không đủ quyền Admin (role cần: Admin / Quản trị). " +
        `Hiện tại: role = ${role}, email = ${curUserEmail}. ` +
        "Vui lòng đăng xuất và đăng nhập lại bằng tài khoản Admin."
      );
    }
    if (low.includes("401") || low.includes("unauthorized") || low.includes("session invalid")) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng xuất và đăng nhập lại.";
    }
    return firstErr.message;
  }, [cfgQuery.error, filesQuery.error, role, curUserEmail]);

  const triggerMutation = useMutation({
    mutationFn: triggerBackupNow,
    onSuccess: (file) => {
      toast({
        title: "Đã tạo sao lưu CSDL thành công",
        description: `File: ${file.filename} (${file.prettySize})`,
      });
      qc.invalidateQueries({ queryKey: ["/api/backup/files"] });
      qc.invalidateQueries({ queryKey: ["/api/backup/log"] });
      qc.invalidateQueries({ queryKey: ["/api/backup/config"] });
    },
    onError: (err: Error) => {
      // Log lỗi đầy đủ vào F12 Console → dễ debug (toast có thể bị clip).
      // eslint-disable-next-line no-console
      console.error("[admin-backup-panel] Trigger backup FAILED:", err);
      toast({
        variant: "destructive",
        title: "❌ Sao lưu thất bại",
        description: err.message,
        className:
          "[&_[data-slot=toast-description]]:whitespace-pre-wrap " +
          "[&_[data-slot=toast-description]]:text-[12px] " +
          "[&_[data-slot=toast-description]]:leading-relaxed " +
          "[&_[data-slot=toast-description]]:max-h-[42vh] " +
          "[&_[data-slot=toast-description]]:overflow-auto " +
          "[&_[data-slot=toast-description]]:break-words",
      });
    },
  });

  const saveCfgMutation = useMutation({
    mutationFn: (patch: Partial<BackupConfig>) => patchConfig(patch),
    onSuccess: () => {
      toast({ title: "Đã lưu cấu hình sao lưu." });
      qc.invalidateQueries({ queryKey: ["/api/backup/config"] });
      setDraftCfg(null);
    },
    onError: (err: Error) =>
      toast({
        variant: "destructive",
        title: "Lưu cấu hình thất bại",
        description: err.message,
        className:
          "[&_[data-slot=toast-description]]:whitespace-pre-wrap " +
          "[&_[data-slot=toast-description]]:text-[12px]",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      toast({ title: "Đã xoá file backup." });
      qc.invalidateQueries({ queryKey: ["/api/backup/files"] });
      setConfirmDeleteFile(null);
    },
    onError: (err: Error) =>
      toast({
        variant: "destructive",
        title: "Xoá thất bại",
        description: err.message,
        className:
          "[&_[data-slot=toast-description]]:whitespace-pre-wrap " +
          "[&_[data-slot=toast-description]]:text-[12px]",
      }),
  });

  const previewRestoreMutation = useMutation({
    mutationFn: (fn: string) => previewRestore(fn),
    onSuccess: (stats) => {
      setPreviewStats(stats);
    },
    onError: (err: Error) => {
      // eslint-disable-next-line no-console
      console.error("[admin-backup-panel] Preview restore FAILED:", err);
      toast({
        variant: "destructive",
        title: "❌ Xem trước khôi phục thất bại",
        description: err.message,
        className:
          "[&_[data-slot=toast-description]]:whitespace-pre-wrap " +
          "[&_[data-slot=toast-description]]:text-[12px] " +
          "[&_[data-slot=toast-description]]:leading-relaxed " +
          "[&_[data-slot=toast-description]]:max-h-[42vh] " +
          "[&_[data-slot=toast-description]]:overflow-auto " +
          "[&_[data-slot=toast-description]]:break-words",
      });
    },
  });

  const runRestoreMutation = useMutation({
    mutationFn: ({ fn, mode }: { fn: string; mode: "upsert" | "full" }) => triggerRestore(fn, mode),
    onSuccess: (_, variables) => {
      toast({
        title: variables.mode === "full" ? "Đã kích hoạt khôi phục TOÀN BỘ..." : "Đã kích hoạt khôi phục AN TOÀN...",
        description:
          "Quá trình khôi phục đang chạy nền. Theo dõi trạng thái 'Đang khôi phục...' (refresh tự động mỗi 3s). " +
          "Sau khi hoàn tất sẽ có kết quả trong Lịch sử chạy gần đây.",
      });
      qc.invalidateQueries({ queryKey: ["/api/restore/running"] });
      qc.invalidateQueries({ queryKey: ["/api/backup/files"] });
      qc.invalidateQueries({ queryKey: ["/api/backup/log"] });
      setRestoreDialogOpen(false);
      setConfirmFull1(false);
      setConfirmFull2(false);
      setPreviewStats(null);
    },
    onError: (err: Error) => {
      // eslint-disable-next-line no-console
      console.error("[admin-backup-panel] Run restore FAILED:", err);
      toast({
        variant: "destructive",
        title: "❌ Khởi chạy khôi phục thất bại",
        description: err.message,
        className:
          "[&_[data-slot=toast-description]]:whitespace-pre-wrap " +
          "[&_[data-slot=toast-description]]:text-[12px] " +
          "[&_[data-slot=toast-description]]:leading-relaxed " +
          "[&_[data-slot=toast-description]]:max-h-[42vh] " +
          "[&_[data-slot=toast-description]]:overflow-auto " +
          "[&_[data-slot=toast-description]]:break-words",
      });
    },
  });

  const isDirty = draftCfg !== null && cfgQuery.data !== undefined;
  const running = runningQuery.data ?? false;
  const restoreRunning = restoreRunningQuery.data?.running ?? false;
  const lastRun = cfgQuery.data?.lastRunAt ? formatDateTime(cfgQuery.data.lastRunAt) : "Chưa chạy";

  const scheduleSummary = useMemo(() => {
    if (!cfgQuery.data) return "Đang tải...";
    switch (cfgQuery.data.scheduleMode) {
      case "off":
        return "Tự động: TẮT";
      case "daily":
        return `Hằng ngày, lúc ${String(cfgQuery.data.scheduleHour).padStart(2, "0")}:${String(
          cfgQuery.data.scheduleMinute,
        ).padStart(2, "0")}`;
      case "weekly": {
        const w = WEEKDAY_LABELS.find((l) => l.value === cfgQuery.data.scheduleWeekday)?.label || "Thứ 2";
        return `${w} hàng tuần, lúc ${String(cfgQuery.data.scheduleHour).padStart(2, "0")}:${String(
          cfgQuery.data.scheduleMinute,
        ).padStart(2, "0")}`;
      }
      case "monthly":
        return `Ngày ${cfgQuery.data.scheduleDayOfMonth} hằng tháng, lúc ${String(
          cfgQuery.data.scheduleHour,
        ).padStart(2, "0")}:${String(cfgQuery.data.scheduleMinute).padStart(2, "0")}`;
    }
  }, [cfgQuery.data]);

  function updateDraft<K extends keyof BackupConfig>(key: K, value: BackupConfig[K]) {
    setDraftCfg((prev) => ({
      ...(prev ?? cfgQuery.data ?? defaultConfig()),
      [key]: value,
    }));
  }

  return (
    <Card className="border border-emerald-200/40 bg-gradient-to-br from-emerald-50/40 via-background to-background shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-md">
              <DatabaseBackup className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2 flex-wrap">
                Quản lý Sao lưu CSDL
                {!isAdminRole && (
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] ml-0 md:ml-0">
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    VÙNG QUYỀN ADMIN
                  </Badge>
                )}
                {running && (
                  <Badge className="bg-amber-100 text-amber-700 border border-amber-200/70 animate-pulse">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />
                    Đang sao lưu...
                  </Badge>
                )}
                {restoreRunning && (
                  <Badge className="bg-orange-100 text-orange-700 border border-orange-200/70 animate-pulse">
                    <RotateCcw className="w-3 h-3 mr-1 animate-spin inline" />
                    Đang khôi phục...
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1 max-w-2xl">
                Sao lưu toàn bộ <code className="font-mono text-xs">kdpd_db</code> bằng pg_dump.
                Admin chọn nơi lưu (máy chủ / Google Drive / OneDrive) và đặt lịch tự động
                (ngày / tuần / tháng). Lần chạy cuối: <strong>{lastRun}</strong>. Hiện tại: {scheduleSummary}.
              </CardDescription>
              {curUserName && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Đang đăng nhập với tư cách: <b>{curUserName}</b> ({curUserEmail}) · Role hiện tại: <code className="font-mono bg-muted/50 px-1 rounded">{role}</code>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-to-br from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-md"
              disabled={!isAdminRole || running || triggerMutation.isPending}
              onClick={() => triggerMutation.mutate()}>
              {running || triggerMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2 fill-current" />
              )}
              Sao lưu NGAY
            </Button>
            {isDirty && (
              <Button
                variant="outline"
                size="sm"
                disabled={!isAdminRole || saveCfgMutation.isPending}
                onClick={() =>
                  saveCfgMutation.mutate(draftCfg ?? (cfgQuery.data as BackupConfig))
                }>
                {saveCfgMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-2" />
                )}
                Lưu cấu hình
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* ----------------------------------------------------------- */}
        {/* Banner cảnh báo LỖI QUYỀN (403/401) hoặc không phải role Admin */}
        {/* ----------------------------------------------------------- */}
        {(!isAdminRole || server403Error) && (
          <div
            role="alert"
            className={cn(
              "rounded-xl border p-4 flex items-start gap-3 shadow-sm",
              server403Error
                ? "bg-rose-50 border-rose-200"
                : "bg-amber-50 border-amber-200",
            )}>
            <ShieldAlert
              className={cn(
                "w-5 h-5 shrink-0 mt-0.5",
                server403Error ? "text-rose-600" : "text-amber-600",
              )}
            />
            <div className="space-y-1 min-w-0">
              <h4
                className={cn(
                  "text-sm font-semibold leading-tight",
                  server403Error ? "text-rose-800" : "text-amber-800",
                )}>
                {server403Error
                  ? "❌ Máy chủ từ chối truy cập (403 Forbidden)"
                  : "⚠️ Tài khoản không có quyền Admin"}
              </h4>
              <p
                className={cn(
                  "text-xs leading-relaxed break-words",
                  server403Error ? "text-rose-700" : "text-amber-700",
                )}>
                {server403Error || (
                  <>
                    Chức năng này <b>yêu cầu role Admin</b> (role name: <code className="font-mono">Admin</code> / code: <code className="font-mono">admin</code>).
                    Role hiện tại của bạn là <b>{role}</b> ({curUserEmail}).
                    <br />
                    Hãy đăng xuất và đăng nhập lại bằng tài khoản có quyền <i>Quản trị viên</i>,
                    hoặc yêu cầu Admin hệ thống cấp quyền cho tài khoản này.
                    Để tránh làm đầy log, phần cấu hình & danh sách backup sẽ <b>tạm khóa</b> cho đến khi có quyền.
                  </>
                )}
              </p>
            </div>
          </div>
        )}
        <div
          className={cn(
            "space-y-6 transition-all duration-300",
            (!isAdminRole || server403Error) && "pointer-events-none opacity-40 select-none blur-[0.5px]",
          )}>
          {/* =========================================================== */}
          {/* 1. Cấu hình nơi lưu file backup                             */}
          {/* =========================================================== */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <HardDriveDownload className="w-4 h-4 text-emerald-600" />
            Bước 1. Chọn nơi lưu bản sao lưu
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              className={cn(
                "p-4 rounded-2xl border-2 cursor-pointer transition-all shadow-sm",
                cfg.storageMode === "local"
                  ? "border-emerald-500/60 bg-emerald-50/50 shadow-emerald-100"
                  : "border-border/60 hover:border-emerald-200/70 bg-background",
              )}
              onClick={() => updateDraft("storageMode", "local")}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Máy chủ (Local)</div>
                  <div className="text-xs text-muted-foreground">
                    Thư mục trên máy chủ chạy ứng dụng
                  </div>
                </div>
                <Switch
                  className="ml-auto"
                  checked={cfg.storageMode === "local"}
                  onCheckedChange={(c) => updateDraft("storageMode", c ? "local" : cfg.storageMode)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Đường dẫn thư mục</Label>
                <Input
                  className="h-9 text-sm font-mono"
                  placeholder="./backups"
                  value={cfg.localFolderPath}
                  onChange={(e) => updateDraft("localFolderPath", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Dùng đường dẫn tuyệt đối (ví dụ <code>/home/kdpd/backups</code>) hoặc tương đối
                  từ thư mục gốc project.
                </p>
              </div>
            </div>

            <div
              className={cn(
                "p-4 rounded-2xl border-2 cursor-pointer transition-all shadow-sm",
                cfg.storageMode === "gdrive"
                  ? "border-blue-500/60 bg-blue-50/50 shadow-blue-100"
                  : "border-border/60 hover:border-blue-200/70 bg-background",
              )}
              onClick={() => updateDraft("storageMode", "gdrive")}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Google Drive</div>
                  <div className="text-xs text-muted-foreground">
                    Copy-paste link thư mục chia sẻ
                  </div>
                </div>
                <Switch
                  className="ml-auto"
                  checked={cfg.storageMode === "gdrive"}
                  onCheckedChange={(c) => updateDraft("storageMode", c ? "gdrive" : cfg.storageMode)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Link thư mục Drive</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={cfg.gdriveFolderLink}
                  onChange={(e) => updateDraft("gdriveFolderLink", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Chia sẻ thư mục → quyền &quot;Editor&quot; → dán link vào đây.
                </p>
              </div>
            </div>

            <div
              className={cn(
                "p-4 rounded-2xl border-2 cursor-pointer transition-all shadow-sm",
                cfg.storageMode === "onedrive"
                  ? "border-sky-500/60 bg-sky-50/50 shadow-sky-100"
                  : "border-border/60 hover:border-sky-200/70 bg-background",
              )}
              onClick={() => updateDraft("storageMode", "onedrive")}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <CloudLightning className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm">OneDrive</div>
                  <div className="text-xs text-muted-foreground">
                    Link thư mục chia sẻ OneDrive
                  </div>
                </div>
                <Switch
                  className="ml-auto"
                  checked={cfg.storageMode === "onedrive"}
                  onCheckedChange={(c) =>
                    updateDraft("storageMode", c ? "onedrive" : cfg.storageMode)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Link thư mục OneDrive</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="https://onedrive.live.com/?id=..."
                  value={cfg.onedriveFolderLink}
                  onChange={(e) => updateDraft("onedriveFolderLink", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sử dụng &quot;Copy link&quot; trong thư mục OneDrive, dán link vào đây.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Separator className="my-2" />

        {/* =========================================================== */}
        {/* 2. Lịch trình tự động sao lưu                                */}
        {/* =========================================================== */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarClock className="w-4 h-4 text-emerald-600" />
            Bước 2. Đặt lịch sao lưu tự động
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Chu kỳ</Label>
              <Select
                value={cfg.scheduleMode}
                onValueChange={(v) => updateDraft("scheduleMode", v as ScheduleMode)}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Chọn chu kỳ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Không chạy tự động</SelectItem>
                  <SelectItem value="daily">Hằng ngày</SelectItem>
                  <SelectItem value="weekly">Hằng tuần</SelectItem>
                  <SelectItem value="monthly">Hằng tháng</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 mt-1">
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">{scheduleSummary}</p>
              </div>
            </div>

            <div
              className={cn(
                "p-4 rounded-2xl border border-border/60 bg-muted/20 grid grid-cols-1 md:grid-cols-3 gap-4",
                cfg.scheduleMode === "off" && "opacity-60 pointer-events-none",
              )}>
              <div className="grid gap-1.5">
                <Label className="text-xs">Giờ (0-23)</Label>
                <Select
                  value={String(cfg.scheduleHour)}
                  onValueChange={(v) => updateDraft("scheduleHour", Number(v))}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, "0")} giờ
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Đề xuất 2-3h sáng (thời gian ít người dùng)</p>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Phút (0-59)</Label>
                <Select
                  value={String(cfg.scheduleMinute)}
                  onValueChange={(v) => updateDraft("scheduleMinute", Number(v))}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {cfg.scheduleMode === "weekly" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Chạy vào thứ</Label>
                  <Select
                    value={String(cfg.scheduleWeekday)}
                    onValueChange={(v) => updateDraft("scheduleWeekday", Number(v))}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAY_LABELS.map((w) => (
                        <SelectItem key={w.value} value={String(w.value)}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {cfg.scheduleMode === "monthly" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Ngày trong tháng (1-28)</Label>
                  <Select
                    value={String(cfg.scheduleDayOfMonth)}
                    onValueChange={(v) => updateDraft("scheduleDayOfMonth", Number(v))}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Ngày {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {cfg.scheduleMode === "daily" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Giữ số bản backup gần nhất</Label>
                  <Select
                    value={String(cfg.keepLastN)}
                    onValueChange={(v) => updateDraft("keepLastN", Number(v))}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7, 14, 21, 30, 60, 90].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} bản ({n > 30 ? `${(n / 30).toFixed(1)} tháng` : n < 7 ? `${n} ngày` : `${Math.floor(n / 7)} tuần`})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Tự động xoá các bản cũ hơn giới hạn này mỗi khi chạy backup mới.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <Separator className="my-2" />

        {/* =========================================================== */}
        {/* 3. Danh sách file backup đã tạo + lịch sử chạy              */}
        {/* =========================================================== */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileArchive className="w-4 h-4 text-emerald-600" />
            Bước 3. Quản lý các bản sao lưu
            <Badge variant="outline" className="ml-auto">
              {filesQuery.data?.length ?? 0} bản
            </Badge>
          </div>

          <div className="rounded-2xl border border-border/60 overflow-hidden shadow-sm">
            {filesQuery.isLoading ? (
              <div className="p-10 text-center text-muted-foreground text-sm">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                Đang tải danh sách file backup...
              </div>
            ) : filesQuery.error ? (
              <div className="p-10 text-center text-destructive text-sm">
                {(filesQuery.error as Error).message}
              </div>
            ) : (filesQuery.data?.length ?? 0) === 0 ? (
              <div className="p-12 text-center space-y-2 border-dashed">
                <DatabaseBackup className="mx-auto w-12 h-12 text-muted-foreground/50" />
                <p className="font-medium text-foreground">Chưa có bản sao lưu nào.</p>
                <p className="text-sm text-muted-foreground">
                  Chọn &quot;Sao lưu NGAY&quot; ở trên để tạo bản đầu tiên.
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className="max-h-[340px]">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                      <TableRow className="bg-muted/40 hover:bg-muted/50">
                        <TableHead>Tên file</TableHead>
                        <TableHead className="w-[120px]">Kích thước</TableHead>
                        <TableHead className="w-[110px]">Loại</TableHead>
                        <TableHead className="w-[180px]">Ngày tạo</TableHead>
                        <TableHead className="w-[130px] text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(filesQuery.data ?? []).map((f) => (
                        <TableRow key={f.filename} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <FileArchive className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                              <span className="truncate">{f.filename}</span>
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">{f.prettySize}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px]",
                                f.trigger === "manual"
                                  ? "bg-amber-50 border-amber-200/60 text-amber-700"
                                  : "bg-emerald-50 border-emerald-200/60 text-emerald-700",
                              )}>
                              {f.trigger === "manual" ? "Thủ công" : "Tự động"}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums text-sm text-muted-foreground">
                            {formatDateTime(f.createdAtISO)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-sky-50 hover:text-sky-700"
                                title="Khôi phục từ file này"
                                disabled={running || restoreRunning || previewRestoreMutation.isPending || runRestoreMutation.isPending}
                                onClick={() => {
                                  if (!f || !f.filename) return;
                                  setSelectedRestoreFile(f.filename);
                                  setRestoreMode("upsert");
                                  setConfirmFull1(false);
                                  setConfirmFull2(false);
                                  setPreviewStats(null);
                                  setRestoreDialogOpen(true);
                                }}>
                                {previewRestoreMutation.isPending || runRestoreMutation.isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-emerald-50 hover:text-emerald-700"
                                title="Tải về"
                                onClick={() => {
                                  window.open(
                                    `/api/backup/files/${encodeURIComponent(f.filename)}/download`,
                                    "_blank",
                                  );
                                }}>
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-rose-50 hover:text-rose-600"
                                title="Xoá file"
                                disabled={deleteMutation.isPending || restoreRunning}
                                onClick={() => setConfirmDeleteFile(f.filename)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </>
            )}
          </div>

          {/* Lịch sử chạy gần đây */}
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
            Lịch sử chạy gần đây
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground ml-auto">
              Tự động refresh mỗi 15s
            </span>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 divide-y">
            {(logQuery.data ?? []).slice(0, 5).length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Chưa có lịch sử sao lưu.
              </div>
            ) : (
              (logQuery.data ?? []).slice(0, 5).map((l, idx) => (
                <div
                  key={`${l.startedAtISO}-${idx}`}
                  className="px-4 py-2.5 grid grid-cols-[18px_1fr_auto] items-start gap-3">
                  <div className="pt-0.5">
                    {l.status === "running" ? (
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                    ) : l.status === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-sm font-medium truncate">
                      {l.status === "running"
                        ? "Đang chạy sao lưu..."
                        : l.status === "success"
                          ? `Sao lưu thành công: ${l.filename ?? "backup.dump"}`
                          : `Lỗi: ${l.error ?? "Không xác định"}`}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {l.trigger === "manual" ? "Nút thủ công" : "Lịch tự động"} · Bắt đầu{" "}
                      {formatDateTime(l.startedAtISO)} · Hoàn thành{" "}
                      {formatDateTime(l.endedAtISO)}
                    </div>
                    {l.uploadedTo && !l.uploadError && (
                      <div className="text-[11px] inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                        <CloudUpload className="w-3 h-3" />
                        Đã upload lên {l.uploadedTo === "gdrive" ? "Google Drive" : "OneDrive"}
                        {l.uploadFileId ? (
                          <span className="font-mono opacity-70">ID: {l.uploadFileId.slice(0, 10)}…</span>
                        ) : null}
                      </div>
                    )}
                    {l.uploadError ? (
                      <div className="text-[11px] flex items-start gap-1.5 text-amber-800 bg-amber-50/80 px-2 py-1 rounded-md mt-1 border border-amber-200/70">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="break-words">
                          <b>Cảnh báo Upload Cloud:</b> {l.uploadError}
                          <br />
                          <span className="opacity-80">※ File local backup vẫn lưu thành công trên máy chủ.</span>
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap justify-end">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        l.status === "success" && "bg-emerald-50 text-emerald-700",
                        l.status === "failed" && "bg-rose-50 text-rose-700",
                        l.status === "running" && "bg-amber-50 text-amber-700",
                      )}>
                      {l.status === "running"
                        ? "Đang chạy"
                        : l.status === "success"
                          ? "Thành công"
                          : "Thất bại"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        </div>
      </CardContent>

      {/* Dialog KHÔI PHỤC dữ liệu — 3 bước: Chế độ → Preview → Xác nhận */}
      <AlertDialog
        open={restoreDialogOpen && !!selectedRestoreFile}
        onOpenChange={(o) => {
          if (!o) {
            setRestoreDialogOpen(false);
            setPreviewStats(null);
            setConfirmFull1(false);
            setConfirmFull2(false);
          }
        }}>
        <AlertDialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <AlertDialogTitle className="flex items-center gap-2 flex-wrap">
            <RotateCcw className="w-5 h-5 text-sky-600" />
            Khôi phục CSDL từ bản sao lưu
            {restoreRunning && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 ml-0 md:ml-1 text-[10px] animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />
                Đang chạy khôi phục
              </Badge>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div className="font-mono text-xs bg-muted/50 rounded-md p-2 break-all">
              {selectedRestoreFile}
            </div>

            {/* ── Bước 1: Chọn chế độ khôi phục ────────────────────────────── */}
            <div className="space-y-2 pt-1">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px]">
                  Bước 1
                </Badge>
                Chọn chế độ khôi phục
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {/* Option 1: Upsert AN TOÀN (MẶC ĐỊNH) */}
                <button
                  type="button"
                  onClick={() => setRestoreMode("upsert")}
                  className={cn(
                    "text-left rounded-xl border p-3.5 transition-all duration-200 group",
                    restoreMode === "upsert"
                      ? "border-sky-400 bg-sky-50/70 ring-2 ring-sky-300/40 shadow-sm"
                      : "border-border hover:border-sky-300 hover:bg-sky-50/30",
                  )}>
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        restoreMode === "upsert" ? "border-sky-500" : "border-muted-foreground/40 group-hover:border-sky-400",
                      )}>
                      {restoreMode === "upsert" && <div className="w-2 h-2 rounded-full bg-sky-500" />}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-sky-700">Chế độ AN TOÀN (Mặc định)</span>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Khuyến nghị
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        ✨ <strong className="text-foreground">KHÔNG GHI ĐÈ dữ liệu cũ 100%</strong>. Chỉ INSERT các
                        bản ghi <strong>MỚI</strong> (ID chưa tồn tại trong DB hiện tại) từ bản backup. Dữ liệu
                        cũ của bạn được giữ <strong>NGUYÊN VẸN</strong> kể cả ID trùng.
                      </div>
                      <div className="text-[11px] text-emerald-700/90 bg-emerald-50/60 rounded-md px-2 py-1 border border-emerald-100/70">
                        Dùng 99% trường hợp: DB vẫn còn dữ liệu, muốn thêm các bản ghi bị thiếu từ bản backup.
                      </div>
                    </div>
                  </div>
                </button>

                {/* Option 2: FULL RESTORE — phá hủy */}
                <button
                  type="button"
                  onClick={() => setRestoreMode("full")}
                  className={cn(
                    "text-left rounded-xl border p-3.5 transition-all duration-200 group",
                    restoreMode === "full"
                      ? "border-rose-400 bg-rose-50/70 ring-2 ring-rose-300/40 shadow-sm"
                      : "border-border hover:border-rose-300 hover:bg-rose-50/20",
                  )}>
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        restoreMode === "full" ? "border-rose-500" : "border-muted-foreground/40 group-hover:border-rose-400",
                      )}>
                      {restoreMode === "full" && <div className="w-2 h-2 rounded-full bg-rose-500" />}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-rose-700">FULL RESTORE (Phá hủy)</span>
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          Rủi ro cao
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        ⚠️ <strong className="text-foreground">XOÁ TOÀN BỘ dữ liệu hiện tại</strong> trong CSDL.
                        Thay thế 100% bằng nội dung bản backup này (pg_restore <code className="font-mono text-[10px] bg-muted/60 rounded px-1">--clean</code>).
                      </div>
                      <div className="text-[11px] text-rose-700/90 bg-rose-50/60 rounded-md px-2 py-1 border border-rose-100/70">
                        CHỈ DÙNG KHI: DB đang hỏng hoàn toàn, hoặc bạn đã backup dữ liệu hiện tại và muốn quay về
                        trạng thái cũ 100%.
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Full mode — 2 checkboxes BẮT BUỘC (chỉ hiện khi chọn full) */}
              {restoreMode === "full" && (
                <div className="mt-3 rounded-xl border-2 border-rose-200/70 bg-rose-50/40 p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-1">
                  <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Xác nhận chế độ phá hủy (bắt buộc tick cả 2)
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer select-none group">
                    <Checkbox
                      checked={confirmFull1}
                      onCheckedChange={(v) => setConfirmFull1(Boolean(v))}
                      className="mt-0.5 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                    />
                    <span className="text-xs text-foreground leading-relaxed group-hover:text-rose-700 transition-colors">
                      <strong>[ ] 1.</strong> Tôi đã <strong>sao lưu CSDL hiện tại thành công</strong> và chắc chắn
                      có thể khôi phục lại nếu cần.
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer select-none group">
                    <Checkbox
                      checked={confirmFull2}
                      onCheckedChange={(v) => setConfirmFull2(Boolean(v))}
                      className="mt-0.5 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                    />
                    <span className="text-xs text-foreground leading-relaxed group-hover:text-rose-700 transition-colors">
                      <strong>[ ] 2.</strong> Tôi hiểu rõ ràng: <strong>Tất cả dữ liệu mới thêm kể từ thời điểm backup này tạo ra sẽ bị MẤT vĩnh viễn</strong>, không thể khôi phục.
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* ── Bước 2: Preview thống kê (không bắt buộc nhưng khuyến nghị) ── */}
            <Separator className="my-1" />
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                  Bước 2
                </Badge>
                Xem trước thay đổi (khuyến nghị — xem thống kê trước khi chạy)
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={restoreRunning || previewRestoreMutation.isPending || !selectedRestoreFile}
                  onClick={() => {
                    if (!selectedRestoreFile) return;
                    previewRestoreMutation.mutate(selectedRestoreFile);
                  }}>
                  {previewRestoreMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <DatabaseBackup className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {previewRestoreMutation.isPending ? "Đang phân tích file backup..." : "Xem trước thay đổi"}
                </Button>
                {previewStats && !previewRestoreMutation.isPending && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Đã phân tích: {previewStats.totalTables} bảng · {previewStats.totalRowsInDump.toLocaleString()} dòng trong file
                  </Badge>
                )}
              </div>

              {/* Preview Table per-table stats */}
              {previewStats && !previewRestoreMutation.isPending && (
                <div className="mt-2 rounded-xl border border-border bg-muted/20 overflow-hidden">
                  <ScrollArea className="max-h-[34vh]">
                    <Table className="text-[12px]">
                      <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                        <TableRow className="bg-muted/60 hover:bg-muted/60">
                          <TableHead className="w-[210px] text-[11px] font-semibold">Tên bảng</TableHead>
                          <TableHead className="text-right w-[120px] text-[11px] font-semibold">
                            Dòng trong backup
                          </TableHead>
                          <TableHead className="text-right w-[120px] text-[11px] font-semibold">
                            Dòng trong DB hiện tại
                          </TableHead>
                          {restoreMode === "upsert" ? (
                            <TableHead className="text-right w-[130px] text-[11px] font-semibold text-emerald-700">
                              Ước tính thêm mới*
                            </TableHead>
                          ) : (
                            <TableHead className="text-right w-[130px] text-[11px] font-semibold text-rose-700">
                              Sẽ bị thay thế
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(previewStats.perTable || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                              Không có bảng nào trong file backup để preview.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (previewStats.perTable || []).map((t) => {
                            const before = t.rowsInTargetBefore ?? 0;
                            const dump = t.rowsInDump ?? 0;
                            const estNew = restoreMode === "upsert" ? Math.max(0, dump - before) : dump;
                            const isEmptyTarget = before === 0;
                            return (
                              <TableRow key={t.tableName} className="hover:bg-muted/40">
                                <TableCell className="font-mono text-[11px]">{t.tableName}</TableCell>
                                <TableCell className="text-right tabular-nums text-[11px]">
                                  {dump.toLocaleString()}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-right tabular-nums text-[11px]",
                                    isEmptyTarget ? "text-muted-foreground italic" : "",
                                  )}>
                                  {isEmptyTarget ? "0 (trống)" : before.toLocaleString()}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-right tabular-nums font-semibold text-[11px]",
                                    restoreMode === "upsert"
                                      ? estNew > 0
                                        ? "text-emerald-700"
                                        : "text-muted-foreground"
                                      : "text-rose-700",
                                  )}>
                                  {estNew > 0
                                    ? "+" + estNew.toLocaleString()
                                    : estNew === 0
                                      ? restoreMode === "upsert"
                                        ? "— (trùng hết)"
                                        : "0"
                                      : estNew.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {/* Footer tổng */}
                  {previewStats && (previewStats.perTable || []).length > 0 && (() => {
                    const sumDump = (previewStats.perTable || []).reduce((s, t) => s + (t.rowsInDump ?? 0), 0);
                    const sumBefore = (previewStats.perTable || []).reduce((s, t) => s + (t.rowsInTargetBefore ?? 0), 0);
                    const sumEst = (previewStats.perTable || []).reduce(
                      (s, t) =>
                        s +
                        (restoreMode === "upsert"
                          ? Math.max(0, (t.rowsInDump ?? 0) - (t.rowsInTargetBefore ?? 0))
                          : t.rowsInDump ?? 0),
                      0,
                    );
                    return (
                      <div className="border-t border-border bg-background px-3 py-2 grid grid-cols-3 gap-2 text-[11px]">
                        <div className="text-right text-muted-foreground">
                          Tổng backup: <span className="text-foreground font-semibold tabular-nums">{sumDump.toLocaleString()}</span>
                        </div>
                        <div className="text-right text-muted-foreground">
                          Tổng hiện tại: <span className="text-foreground font-semibold tabular-nums">{sumBefore.toLocaleString()}</span>
                        </div>
                        <div
                          className={cn(
                            "text-right font-semibold tabular-nums",
                            restoreMode === "upsert" ? "text-emerald-700" : "text-rose-700",
                          )}>
                          {restoreMode === "upsert" ? "Ước tính thêm: " : "Sẽ thay: "}
                          +{sumEst.toLocaleString()}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground leading-relaxed -mt-1">
                * Ước tính theo ID. Upsert mode dùng INSERT ON CONFLICT (id) DO NOTHING. Dòng nào có ID trùng
                với DB hiện tại sẽ được BỎ QUA, dữ liệu cũ KHÔNG bị ghi đè 1 bit nào.
              </p>
            </div>
          </AlertDialogDescription>

          {/* Footer: Nút hành động cuối */}
          <Separator className="-mx-6 my-0.5 w-[calc(100%+3rem)]" />
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-1">
            <AlertDialogCancel disabled={restoreRunning}>Hủy</AlertDialogCancel>
            {(() => {
              const fullOk = restoreMode === "full" && confirmFull1 && confirmFull2;
              const upsertOk = restoreMode === "upsert";
              const canRun = !restoreRunning && !runRestoreMutation.isPending && (upsertOk || fullOk) && !!selectedRestoreFile;
              if (restoreMode === "upsert") {
                return (
                  <AlertDialogAction
                    type="button"
                    disabled={!canRun}
                    className="bg-sky-600 hover:bg-sky-700 text-white"
                    onClick={() => {
                      if (!selectedRestoreFile) return;
                      runRestoreMutation.mutate({ fn: selectedRestoreFile, mode: "upsert" });
                    }}>
                    {runRestoreMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <DatabaseBackup className="w-4 h-4 mr-2" />
                    )}
                    🔵 THỰC HIỆN KHÔI PHỤC AN TOÀN
                  </AlertDialogAction>
                );
              }
              return (
                <AlertDialogAction
                  type="button"
                  disabled={!canRun}
                  className={cn(
                    "text-white",
                    confirmFull1 && confirmFull2
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-rose-400/60 hover:bg-rose-500/70 cursor-not-allowed",
                  )}
                  onClick={() => {
                    if (!selectedRestoreFile) return;
                    if (!confirmFull1 || !confirmFull2) return;
                    runRestoreMutation.mutate({ fn: selectedRestoreFile, mode: "full" });
                  }}>
                  {runRestoreMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 mr-2" />
                  )}
                  🔴 XÁC NHẬN KHÔI PHỤC TOÀN BỘ (XOÁ DỮ LIỆU HIỆN TẠI)
                </AlertDialogAction>
              );
            })()}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm xoá file */}
      <AlertDialog
        open={!!confirmDeleteFile}
        onOpenChange={(o) => !o && setConfirmDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Xoá bản sao lưu này?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div className="font-mono text-xs bg-muted/50 rounded-md p-2 break-all">
              {confirmDeleteFile}
            </div>
            File backup sẽ bị xoá vĩnh viễn khỏi nơi lưu, không thể khôi phục lại.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600 text-white"
              onClick={() =>
                confirmDeleteFile && deleteMutation.mutate(confirmDeleteFile)
              }>
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Xoá bản sao lưu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default AdminBackupPanel;
