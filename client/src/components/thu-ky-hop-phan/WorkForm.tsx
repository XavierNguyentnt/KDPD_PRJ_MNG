import React, { useState } from "react";
import type { Work, Component } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { NumberInput } from "@/components/ui/number-input";
import { parseStageNumber, charsToPages } from "./thu-ky-shared";

export function WorkForm({
  work,
  componentsList,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
}: {
  work: Work | null;
  componentsList: Component[];
  onSubmit: (data: Record<string, unknown>) => void;
  onDelete?: () => void;
  isPending: boolean;
  isDeleting?: boolean;
}) {
  const [componentId, setComponentId] = useState(work?.componentId ?? "");
  const [titleVi, setTitleVi] = useState(work?.titleVi ?? "");
  const [titleHannom, setTitleHannom] = useState(work?.titleHannom ?? "");
  const [stage, setStage] = useState(() => parseStageNumber(work?.stage));
  const [documentCode, setDocumentCode] = useState(work?.documentCode ?? "");
  const [baseWordCount, setBaseWordCount] = useState(
    work?.baseWordCount != null ? String(work.baseWordCount) : "",
  );
  const [basePageCount, setBasePageCount] = useState(
    work?.basePageCount != null ? String(work.basePageCount) : "",
  );
  const [estimateFactor, setEstimateFactor] = useState(
    work?.estimateFactor != null ? String(work.estimateFactor) : "",
  );
  const [estimateWordCount, setEstimateWordCount] = useState(
    work?.estimateWordCount != null ? String(work.estimateWordCount) : "",
  );
  const [estimatePageCount, setEstimatePageCount] = useState(
    work?.estimatePageCount != null ? String(work.estimatePageCount) : "",
  );
  const [note, setNote] = useState(work?.note ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      componentId: componentId || null,
      titleVi: titleVi || null,
      titleHannom: titleHannom || null,
      stage: (stage && String(stage).replace(/\D/g, "")) || null,
      documentCode: documentCode || null,
      baseWordCount: baseWordCount ? parseInt(baseWordCount, 10) : null,
      basePageCount: basePageCount ? parseInt(basePageCount, 10) : null,
      estimateFactor:
        estimateFactor != null && estimateFactor !== ""
          ? String(estimateFactor)
          : null,
      estimateWordCount: estimateWordCount
        ? parseInt(estimateWordCount, 10)
        : null,
      estimatePageCount: estimatePageCount
        ? parseInt(estimatePageCount, 10)
        : null,
      note: note || null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid gap-2">
        <Label>Hợp phần</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={componentId}
          onChange={(e) => setComponentId(e.target.value)}>
          <option value="">— Chọn hợp phần —</option>
          {componentsList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Tiêu đề (tiếng Việt)</Label>
          <Input
            value={titleVi}
            onChange={(e) => setTitleVi(e.target.value)}
            placeholder="VD: Phật tạng toàn dịch"
          />
        </div>
        <div className="grid gap-2">
          <Label>Tiêu đề Hán Nôm</Label>
          <Input
            value={titleHannom}
            onChange={(e) => setTitleHannom(e.target.value)}
            placeholder="Hán Nôm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Giai đoạn</Label>
          <Input
            type="number"
            min={1}
            value={stage}
            onChange={(e) => setStage(e.target.value.replace(/\D/g, ""))}
            placeholder="1, 2, 3..."
          />
        </div>
        <div className="grid gap-2">
          <Label>Mã tài liệu</Label>
          <Input
            value={documentCode}
            onChange={(e) => setDocumentCode(e.target.value)}
            placeholder="Mã tài liệu"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>Số chữ gốc</Label>
          <NumberInput
            value={baseWordCount}
            onChange={(v) => {
              setBaseWordCount(v);
              const n = v ? parseInt(v, 10) : NaN;
              setBasePageCount(!isNaN(n) ? String(charsToPages(n)) : "");
              const f = estimateFactor ? parseFloat(estimateFactor) : NaN;
              if (!isNaN(n) && !isNaN(f)) {
                setEstimateWordCount(String(Math.round(n * f)));
                setEstimatePageCount(String(charsToPages(Math.round(n * f))));
              }
            }}
            decimals={0}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>
            Số trang gốc{" "}
            <span className="text-muted-foreground font-normal">
              (350 chữ/trang)
            </span>
          </Label>
          <NumberInput
            value={basePageCount}
            onChange={setBasePageCount}
            decimals={0}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>Hệ số ước tính</Label>
          <Input
            type="number"
            step="0.0001"
            value={estimateFactor}
            onChange={(e) => {
              const v = e.target.value;
              setEstimateFactor(v);
              const base = baseWordCount ? parseInt(baseWordCount, 10) : NaN;
              const f = v ? parseFloat(v) : NaN;
              if (!isNaN(base) && !isNaN(f)) {
                const est = Math.round(base * f);
                setEstimateWordCount(String(est));
                setEstimatePageCount(String(charsToPages(est)));
              }
            }}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>
            Số chữ ước tính{" "}
            <span className="text-muted-foreground font-normal">
              (số chữ gốc × hệ số)
            </span>
          </Label>
          <NumberInput
            value={estimateWordCount}
            onChange={(v) => {
              setEstimateWordCount(v);
              const n = v ? parseInt(v, 10) : NaN;
              setEstimatePageCount(!isNaN(n) ? String(charsToPages(n)) : "");
            }}
            decimals={0}
            placeholder="0"
          />
        </div>
        <div className="grid gap-2">
          <Label>
            Số trang ước tính{" "}
            <span className="text-muted-foreground font-normal">
              (350 chữ/trang)
            </span>
          </Label>
          <NumberInput
            value={estimatePageCount}
            onChange={setEstimatePageCount}
            decimals={0}
            placeholder="0"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Ghi chú</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú"
        />
      </div>
      <DialogFooter className="flex justify-between">
        {work && onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isPending || isDeleting}>
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending || isDeleting}
          className={work && onDelete ? "ml-auto" : ""}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {work ? "Cập nhật" : "Thêm"}
        </Button>
      </DialogFooter>
    </form>
  );
}
