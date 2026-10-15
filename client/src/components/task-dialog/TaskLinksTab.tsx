import React from "react";
import type { UseFormReturn } from "react-hook-form";
import type { Work, Component } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { WorkPicker } from "@/components/work-picker";
import { formatNumberAccounting } from "@/lib/utils";

interface TaskLinksTabProps {
  isWorkLinkGroup: boolean;
  form: UseFormReturn<any>;
  language: string;
  worksList: Work[];
  componentsList: Component[];
  canEditMeta: boolean;
  isNewTask: boolean;
  componentName: string;
  stageDisplay: string;
  pageCountBienTap?: number | null;
}

export function TaskLinksTab({
  isWorkLinkGroup,
  form,
  language,
  worksList,
  componentsList,
  canEditMeta,
  isNewTask,
  componentName,
  stageDisplay,
  pageCountBienTap,
}: TaskLinksTabProps) {
  if (!isWorkLinkGroup) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        {language === "vi"
          ? "Nhóm công việc này không yêu cầu liên kết tài liệu dịch thuật."
          : "This task group does not require translation document linkage."}
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <h3 className="text-base font-semibold">
        Thông tin của tài liệu dịch thuật
      </h3>
      <p className="text-sm text-muted-foreground">
        {form.watch("group") === "Biên tập"
          ? language === "vi"
            ? "Chọn tác phẩm (tài liệu) cần biên tập."
            : "Select work (document) to proofread."
          : language === "vi"
            ? "Tùy chọn: liên kết công việc với một tài liệu dịch thuật."
            : "Optional: link this task to a translation document."}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <WorkPicker
            label="Tên tài liệu dịch thuật"
            works={worksList}
            components={componentsList}
            value={form.watch("relatedWorkId") ?? null}
            onChange={(id) => form.setValue("relatedWorkId", id)}
            disabled={!canEditMeta && !isNewTask}
            placeholder={
              language === "vi"
                ? "Tìm theo tiêu đề, mã tài liệu, hợp phần, giai đoạn..."
                : "Search by title, document code..."
            }
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Hợp phần</Label>
          <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm">
            {componentName}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Giai đoạn</Label>
          <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm">
            {stageDisplay}
          </div>
        </div>
        {form.watch("group") === "Biên tập" && (
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-muted-foreground">
              Số trang tài liệu cần biên tập
            </Label>
            <div className="py-2.5 px-3 rounded-md border bg-muted/30 text-sm">
              {pageCountBienTap != null
                ? `${formatNumberAccounting(pageCountBienTap)} trang`
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === "vi"
                ? "Lấy từ tổng số trang của các hợp đồng hiệu đính gắn với tác phẩm đã chọn."
                : "From proofreading contracts linked to selected work."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
