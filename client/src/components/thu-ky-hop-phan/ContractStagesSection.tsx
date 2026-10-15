import { SubTableSkeleton } from "@/components/ui/skeletons";
import React, { useState } from "react";
import { useQuery, useMutation, type useQueryClient } from "@tanstack/react-query";
import { parseStageNumber, formatStageDisplay } from "./thu-ky-shared";
import { useToast } from "@/hooks/use-toast";
import { api, buildUrl } from "@shared/routes";
import type { ContractStage } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

// --- Contract stages (giai đoạn hợp đồng) subsection ---
export async function fetchStages(
  translationContractId: string | null,
  proofreadingContractId: string | null,
): Promise<ContractStage[]> {
  if (translationContractId) {
    const res = await fetch(
      buildUrl(api.contractStages.listByTranslationContract.path, {
        contractId: translationContractId,
      }),
      { credentials: "include" },
    );
    if (!res.ok) return [];
    return res.json();
  }
  if (proofreadingContractId) {
    const res = await fetch(
      buildUrl(api.contractStages.listByProofreadingContract.path, {
        contractId: proofreadingContractId,
      }),
      { credentials: "include" },
    );
    if (!res.ok) return [];
    return res.json();
  }
  return [];
}

export function ContractStagesSection({
  translationContractId = null,
  proofreadingContractId = null,
  queryClient,
  readOnly = false,
}: {
  translationContractId?: string | null;
  proofreadingContractId?: string | null;
  queryClient: ReturnType<typeof useQueryClient>;
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const contractId = translationContractId ?? proofreadingContractId ?? "";
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["contract-stages", contractId],
    queryFn: () =>
      fetchStages(
        translationContractId ?? null,
        proofreadingContractId ?? null,
      ),
    enabled: !!contractId,
    retry: false,
  });

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    stageCode: "",
    stageOrder: "1",
    startDate: "",
    endDate: "",
    actualCompletionDate: "",
    note: "",
  });

  const resetForm = () => {
    setForm({
      stageCode: "",
      stageOrder: "1",
      startDate: "",
      endDate: "",
      actualCompletionDate: "",
      note: "",
    });
    setAdding(false);
    setEditingId(null);
  };

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const body = {
        ...data,
        translationContractId: translationContractId || null,
        proofreadingContractId: proofreadingContractId || null,
      };
      const res = await fetch(api.contractStages.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Thêm giai đoạn thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contract-stages", contractId],
      });
      resetForm();
      toast({ title: "Đã thêm giai đoạn" });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await fetch(
        buildUrl(api.contractStages.update.path, { id }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error("Cập nhật thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contract-stages", contractId],
      });
      resetForm();
      toast({ title: "Đã cập nhật giai đoạn" });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        buildUrl(api.contractStages.delete.path, { id }),
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) throw new Error("Xóa thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contract-stages", contractId],
      });
      toast({ title: "Đã xóa giai đoạn" });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });

  const fillForm = (s: ContractStage) => {
    setForm({
      stageCode: parseStageNumber(s.stageCode),
      stageOrder: String(s.stageOrder ?? 1),
      startDate: s.startDate ? (s.startDate as string).slice(0, 10) : "",
      endDate: s.endDate ? (s.endDate as string).slice(0, 10) : "",
      actualCompletionDate: s.actualCompletionDate
        ? (s.actualCompletionDate as string).slice(0, 10)
        : "",
      note: s.note ?? "",
    });
    setEditingId(s.id);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code =
      (form.stageCode && String(form.stageCode).replace(/\D/g, "")) || null;
    createMutation.mutate({
      stageCode: code ?? "",
      stageOrder: form.stageOrder ? parseInt(form.stageOrder, 10) : 1,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      actualCompletionDate: form.actualCompletionDate || null,
      note: form.note || null,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const code =
      (form.stageCode && String(form.stageCode).replace(/\D/g, "")) || null;
    updateMutation.mutate({
      id: editingId,
      data: {
        stageCode: code ?? "",
        stageOrder: form.stageOrder ? parseInt(form.stageOrder, 10) : 1,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        actualCompletionDate: form.actualCompletionDate || null,
        note: form.note || null,
      },
    });
  };

  return (
    <div className="space-y-2 rounded-md border p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Giai đoạn hợp đồng</Label>
        {!readOnly && !adding && !editingId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Thêm giai đoạn
          </Button>
        )}
      </div>
      {isLoading ? (
        <SubTableSkeleton rows={2} />
      ) : (
        <>
          {stages.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã GĐ</TableHead>
                    <TableHead className="w-16">Thứ tự</TableHead>
                    <TableHead>Bắt đầu</TableHead>
                    <TableHead>Kết thúc</TableHead>
                    <TableHead>HT thực tế</TableHead>
                    <TableHead className="max-w-[100px]">Ghi chú</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stages.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {formatStageDisplay(s.stageCode)}
                      </TableCell>
                      <TableCell>{s.stageOrder ?? "—"}</TableCell>
                      <TableCell>
                        {formatDateDDMMYYYY(s.startDate) || "—"}
                      </TableCell>
                      <TableCell>
                        {formatDateDDMMYYYY(s.endDate) || "—"}
                      </TableCell>
                      <TableCell>
                        {formatDateDDMMYYYY(s.actualCompletionDate) || "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-[100px] truncate"
                        title={s.note ?? undefined}>
                        {s.note ?? "—"}
                      </TableCell>
                      <TableCell>
                        {readOnly || editingId === s.id ? null : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => fillForm(s)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteMutation.mutate(s.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!readOnly && (adding || editingId) && (
            <form
              onSubmit={editingId ? handleEditSubmit : handleAddSubmit}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t">
              <Input
                type="number"
                min={1}
                placeholder="1, 2, 3..."
                value={form.stageCode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    stageCode: e.target.value.replace(/\D/g, ""),
                  }))
                }
              />
              <Input
                type="number"
                placeholder="Thứ tự"
                value={form.stageOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stageOrder: e.target.value }))
                }
              />
              <DateInput
                value={form.startDate || null}
                onChange={(v) => setForm((f) => ({ ...f, startDate: v || "" }))}
                placeholder="Bắt đầu"
              />
              <DateInput
                value={form.endDate || null}
                onChange={(v) => setForm((f) => ({ ...f, endDate: v || "" }))}
                placeholder="Kết thúc"
              />
              <DateInput
                value={form.actualCompletionDate || null}
                onChange={(v) =>
                  setForm((f) => ({ ...f, actualCompletionDate: v || "" }))
                }
                placeholder="HT thực tế"
                className="sm:col-span-2"
              />
              <Input
                placeholder="Ghi chú"
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                className="sm:col-span-2"
              />
              <div className="col-span-2 flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }>
                  {editingId ? "Cập nhật" : "Thêm"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={resetForm}>
                  Hủy
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
