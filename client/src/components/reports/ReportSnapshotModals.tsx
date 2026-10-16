import React, { useState } from "react";
import type { ReportSnapshot } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Lock,
  History,
  FileSpreadsheet,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/utils";

// =============================================================================
// 1. DIALOG CHỐT SỔ KỲ BÁO CÁO (LOCK & SNAPSHOT)
// =============================================================================

interface ReportSnapshotLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: "personal" | "department" | "organization";
  periodLabel: string;
  onConfirmLock: (notes?: string) => Promise<void>;
  isLoading: boolean;
}

export function ReportSnapshotLockDialog({
  open,
  onOpenChange,
  scope,
  periodLabel,
  onConfirmLock,
  isLoading,
}: ReportSnapshotLockDialogProps) {
  const [notes, setNotes] = useState("");

  const scopeText =
    scope === "personal"
      ? "Cá nhân"
      : scope === "department"
      ? "Nhóm nghiệp vụ"
      : "Toàn thể tổ chức";

  const handleConfirm = async () => {
    await onConfirmLock(notes);
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-bold">
              Chốt sổ & Khóa Báo cáo Kỳ này
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Dữ liệu báo cáo <strong className="text-foreground">{scopeText}</strong> chu kỳ{" "}
            <strong className="text-foreground">{periodLabel}</strong> sẽ được lưu trữ bất biến vào
            cơ sở dữ liệu lịch sử để phục vụ nghiệm thu, kiểm toán và bảo lưu thành tích.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <div className="p-3 rounded-lg bg-muted/50 border border-border/60 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Phạm vi:</span>
              <span className="font-semibold text-foreground">{scopeText}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Chu kỳ:</span>
              <span className="font-semibold text-foreground">{periodLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tính bất biến:</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Khóa vĩnh viễn (Read-only)
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Ghi chú chốt sổ (Tùy chọn):
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Đã nghiệm thu bản thảo đợt 1, Ban Giám đốc phê duyệt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            <Lock className="w-3.5 h-3.5" />
            {isLoading ? "Đang chốt sổ..." : "Xác nhận Chốt sổ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// 2. DIALOG LỊCH SỬ CHỐT SỔ (SNAPSHOTS HISTORY)
// =============================================================================

interface ReportSnapshotsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshots: ReportSnapshot[];
  isLoading: boolean;
  onExportExcelSnapshot: (snapshot: ReportSnapshot) => void;
}

export function ReportSnapshotsHistoryDialog({
  open,
  onOpenChange,
  snapshots,
  isLoading,
  onExportExcelSnapshot,
}: ReportSnapshotsHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <History className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-bold">
              Lịch sử Báo cáo đã Chốt sổ
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Danh sách các bản báo cáo đã phê duyệt chốt số liệu bất biến theo chu kỳ lịch sử
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1 border rounded-lg border-border/70 my-2">
          <Table className="text-xs">
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[130px]">Chu kỳ báo cáo</TableHead>
                <TableHead className="w-[100px]">Cấp độ</TableHead>
                <TableHead className="w-[140px]">Thời điểm chốt</TableHead>
                <TableHead className="min-w-[160px]">Ghi chú chốt sổ</TableHead>
                <TableHead className="w-[90px] text-center">Trạng thái</TableHead>
                <TableHead className="w-[110px] text-right">Tác vụ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Clock className="w-4 h-4 animate-spin inline mr-1" />
                    Đang tải danh sách bản chốt sổ...
                  </TableCell>
                </TableRow>
              ) : snapshots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Chưa có bản báo cáo nào được chốt sổ trong kỳ này.
                  </TableCell>
                </TableRow>
              ) : (
                snapshots.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        {s.periodLabel}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {s.scope === "personal"
                          ? "Cá nhân"
                          : s.scope === "department"
                          ? "Nhóm"
                          : "Tổ chức"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateDDMMYYYY(s.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">
                      {s.notes || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        <Lock className="w-2.5 h-2.5 mr-0.5" />
                        Đã chốt
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        onClick={() => onExportExcelSnapshot(s)}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Excel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
