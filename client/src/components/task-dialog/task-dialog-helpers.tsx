import React from "react";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";

export interface DueDateBlockProps {
  isNewTask: boolean;
  dueDateLabel: string;
  actualCompletedAtLabel: string;
  closeLabel: string;
  dueDateValue: string;
  actualCompletedAtValue: string;
  onDueDateChange: (value: string) => void;
  onActualCompletedAtChange: (value: string) => void;
  onActualCompletedAtSetProgress: () => void;
  canEditMeta: boolean;
  /** Khi Biên tập: hiển thị read-only theo ngày lớn nhất của các stage (dd/mm/yyyy). */
  isBienTap?: boolean;
  computedDueDisplay?: string;
  computedActualDisplay?: string;
}

/** Hiển thị giai đoạn: 1,2,3 → "GĐ 1", "GĐ 2". */
export function formatStageDisplay(stage: string | null | undefined): string {
  if (stage == null || stage === "") return "—";
  const num = String(stage).replace(/\D/g, "");
  return num ? "GĐ " + num : "GĐ " + stage;
}

/** Lấy round_number từ Loại bông theo quy ước biên tập. */
export function roundNumberFromRoundType(
  roundType: string | null | undefined,
  maxRoundHint?: number | null,
): number {
  if (!roundType || typeof roundType !== "string") return 1;
  const raw = roundType.trim();
  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  if (normalized.includes("tien bien tap")) return 1;
  if (normalized.includes("bong chuyen in")) {
    const base = maxRoundHint && maxRoundHint > 0 ? maxRoundHint : 2;
    return base + 1;
  }
  const m = raw.match(/Bông\s*(\d+)/i);
  if (m) {
    const n = Math.max(1, parseInt(m[1], 10));
    // Bông 1 (thô/tinh) = round 3, Bông 2 = round 4, ...
    return n + 2;
  }
  if (normalized.includes("bong tho")) return 2;
  return 1;
}

/** Ngày hoàn thành dự kiến + Ngày hoàn thành thực tế. Với Biên tập: tự động = max(stages), chỉ đọc, dd/mm/yyyy. */
export const DueDateBlock: React.FC<DueDateBlockProps> = ({
  isNewTask,
  dueDateLabel,
  actualCompletedAtLabel,
  closeLabel: _closeLabel,
  dueDateValue,
  actualCompletedAtValue,
  onDueDateChange,
  onActualCompletedAtChange,
  onActualCompletedAtSetProgress,
  canEditMeta,
  isBienTap,
  computedDueDisplay,
  computedActualDisplay,
}) => {
  const showAsTotal =
    isBienTap ||
    (computedDueDisplay !== undefined && computedActualDisplay !== undefined);
  const canEdit = !showAsTotal && (isNewTask || canEditMeta);
  if (showAsTotal) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>
            {dueDateLabel}
            {!isBienTap ? " (Tổng)" : ""}
          </Label>
          <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
            {computedDueDisplay || "—"}
          </div>
        </div>
        <div className="space-y-2">
          <Label>
            {actualCompletedAtLabel}
            {!isBienTap ? " (Tổng)" : ""}
          </Label>
          <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
            {computedActualDisplay || "—"}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label>{dueDateLabel}</Label>
        <DateInput
          value={dueDateValue || null}
          onChange={(v) => onDueDateChange(v || "")}
          disabled={!canEdit}
          placeholder="dd/mm/yyyy"
          className="bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label>{actualCompletedAtLabel}</Label>
        <DateInput
          value={actualCompletedAtValue || null}
          onChange={(v) => {
            onActualCompletedAtChange(v || "");
            if (v) onActualCompletedAtSetProgress();
          }}
          disabled={!canEdit}
          placeholder="dd/mm/yyyy"
          className="bg-background"
        />
      </div>
    </div>
  );
};
