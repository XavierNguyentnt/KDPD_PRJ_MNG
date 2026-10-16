import React, { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Filter } from "lucide-react";
import type { ReportPeriodType } from "@shared/report-types";

interface ReportPeriodPickerProps {
  periodType: ReportPeriodType;
  periodValue: string;
  startDate?: string;
  endDate?: string;
  onChange: (type: ReportPeriodType, value: string, start?: string, end?: string) => void;
  className?: string;
}

export function ReportPeriodPicker({
  periodType,
  periodValue,
  startDate,
  endDate,
  onChange,
  className = "",
}: ReportPeriodPickerProps) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Danh sách các tháng gần nhất (12 tháng gần nhất)
  const monthOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      list.push({
        value: `${y}-${m}`,
        label: `Tháng ${m}/${y}`,
      });
    }
    return list;
  }, []);

  // Danh sách các quý (2 năm gần nhất)
  const quarterOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const roman = ["I", "II", "III", "IV"];
    for (const y of [currentYear, currentYear - 1]) {
      for (let q = 4; q >= 1; q--) {
        list.push({
          value: `${y}-Q${q}`,
          label: `Quý ${roman[q - 1]}/${y}`,
        });
      }
    }
    return list;
  }, [currentYear]);

  // Danh sách các năm (5 năm gần nhất)
  const yearOptions = useMemo(() => {
    return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => ({
      value: String(y),
      label: `Năm ${y}`,
    }));
  }, [currentYear]);

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {/* 1. Chọn loại kỳ (Type) */}
      <div className="flex items-center rounded-lg bg-muted/60 p-1 border border-border/60">
        <Button
          type="button"
          size="sm"
          variant={periodType === "month" ? "default" : "ghost"}
          className="h-7 px-2.5 text-xs font-medium"
          onClick={() => {
            const defM = monthOptions[0]?.value || `${currentYear}-10`;
            onChange("month", defM);
          }}
        >
          Tháng
        </Button>
        <Button
          type="button"
          size="sm"
          variant={periodType === "quarter" ? "default" : "ghost"}
          className="h-7 px-2.5 text-xs font-medium"
          onClick={() => {
            const q = Math.floor(now.getMonth() / 3) + 1;
            onChange("quarter", `${currentYear}-Q${q}`);
          }}
        >
          Quý
        </Button>
        <Button
          type="button"
          size="sm"
          variant={periodType === "year" ? "default" : "ghost"}
          className="h-7 px-2.5 text-xs font-medium"
          onClick={() => {
            onChange("year", String(currentYear));
          }}
        >
          Năm
        </Button>
        <Button
          type="button"
          size="sm"
          variant={periodType === "week" ? "default" : "ghost"}
          className="h-7 px-2.5 text-xs font-medium"
          onClick={() => {
            onChange("week", "current");
          }}
        >
          Tuần này
        </Button>
        <Button
          type="button"
          size="sm"
          variant={periodType === "custom" ? "default" : "ghost"}
          className="h-7 px-2.5 text-xs font-medium"
          onClick={() => {
            const nowIso = now.toISOString().slice(0, 10);
            const past30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
            onChange("custom", "custom", past30, nowIso);
          }}
        >
          Tùy chọn
        </Button>
      </div>

      {/* 2. Dropdown chọn giá trị cụ thể theo loại kỳ */}
      {periodType === "month" && (
        <Select
          value={periodValue}
          onValueChange={(val) => onChange("month", val)}
        >
          <SelectTrigger className="h-9 min-w-[145px] text-xs font-medium bg-background border-border/80">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Chọn tháng" />
          </SelectTrigger>
          <SelectContent className="max-h-[280px]">
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {periodType === "quarter" && (
        <Select
          value={periodValue}
          onValueChange={(val) => onChange("quarter", val)}
        >
          <SelectTrigger className="h-9 min-w-[140px] text-xs font-medium bg-background border-border/80">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Chọn quý" />
          </SelectTrigger>
          <SelectContent>
            {quarterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {periodType === "year" && (
        <Select
          value={periodValue}
          onValueChange={(val) => onChange("year", val)}
        >
          <SelectTrigger className="h-9 min-w-[125px] text-xs font-medium bg-background border-border/80">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Chọn năm" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {periodType === "custom" && (
        <div className="flex items-center gap-1.5 text-xs">
          <Input
            type="date"
            value={startDate || ""}
            onChange={(e) => onChange("custom", "custom", e.target.value, endDate)}
            className="h-9 w-[130px] text-xs px-2"
          />
          <span className="text-muted-foreground text-xs font-semibold">đến</span>
          <Input
            type="date"
            value={endDate || ""}
            onChange={(e) => onChange("custom", "custom", startDate, e.target.value)}
            className="h-9 w-[130px] text-xs px-2"
          />
        </div>
      )}
    </div>
  );
}
