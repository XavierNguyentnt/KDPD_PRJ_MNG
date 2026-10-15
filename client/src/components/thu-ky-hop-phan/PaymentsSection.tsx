import { SubTableSkeleton } from "@/components/ui/skeletons";
import React, { useState, useMemo, useEffect, Fragment } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, type useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api, buildUrl } from "@shared/routes";
import type { Payment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { NumberInput } from "@/components/ui/number-input";
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
import { formatDateDDMMYYYY, formatNumberAccounting, numberToVietnameseWords } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { fetchFinanceSummary, fetchFinanceSummaryPc } from "./thu-ky-shared";

// --- Payments (chi tiền: tạm ứng/quyết toán) subsection ---
export async function fetchPaymentsByTcId(contractId: string): Promise<Payment[]> {
  const res = await fetch(
    buildUrl(api.payments.listByTranslationContract.path, { id: contractId }),
    { credentials: "include" },
  );
  if (!res.ok) return [];
  return res.json() as Promise<Payment[]>;
}

export async function fetchPaymentsByPcId(contractId: string): Promise<Payment[]> {
  const res = await fetch(
    buildUrl(api.payments.listByProofreadingContract.path, { id: contractId }),
    { credentials: "include" },
  );
  if (!res.ok) return [];
  return res.json() as Promise<Payment[]>;
}

export function PaymentsSection({
  translationContractId,
  proofreadingContractId,
  contractValue,
  translationValue,
  settlementValue,
  queryClient,
  readOnly = false,
}: {
  translationContractId?: string;
  proofreadingContractId?: string;
  contractValue: number | null;
  translationValue: number | null;
  settlementValue: number | null;
  queryClient: ReturnType<typeof useQueryClient>;
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const isPc = !!proofreadingContractId;
  const contractId = isPc
    ? (proofreadingContractId as string)
    : (translationContractId as string);
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["payments", contractId],
    queryFn: () =>
      isPc ? fetchPaymentsByPcId(contractId) : fetchPaymentsByTcId(contractId),
    enabled: !!contractId,
  });
  const { data: summary } = useQuery({
    queryKey: ["finance-summary", contractId],
    queryFn: () =>
      isPc
        ? fetchFinanceSummaryPc(contractId)
        : fetchFinanceSummary(contractId),
    enabled: !!contractId,
    staleTime: 60_000,
  });
  const [expandedPaymentIds, setExpandedPaymentIds] = useState<Set<string>>(
    new Set(),
  );
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(
        `${isPc ? "pc" : "tc"}PaymentDetails:${contractId}`,
      );
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setExpandedPaymentIds(new Set(arr));
      }
    } catch {}
  }, [contractId, isPc]);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        `${isPc ? "pc" : "tc"}PaymentDetails:${contractId}`,
        JSON.stringify(Array.from(expandedPaymentIds)),
      );
    } catch {}
  }, [expandedPaymentIds, contractId, isPc]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    paymentType: "advance",
    voucherNo: "",
    paymentDate: "",
    amount: "",
    note: "",
  });
  const [advanceIncludeOverview, setAdvanceIncludeOverview] = useState(true);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(
        `${isPc ? "pc" : "tc"}AdvanceIncludeOverview:${contractId}`,
      );
      if (raw) setAdvanceIncludeOverview(!!JSON.parse(raw));
    } catch {}
  }, [contractId, isPc]);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        `${isPc ? "pc" : "tc"}AdvanceIncludeOverview:${contractId}`,
        JSON.stringify(advanceIncludeOverview),
      );
    } catch {}
  }, [advanceIncludeOverview, contractId, isPc]);
  const [advanceRate, setAdvanceRate] = useState<string>("");
  const computedAdvanceAmount = useMemo(() => {
    if (form.paymentType !== "advance") return null;
    const r = advanceRate.trim() === "" ? NaN : parseFloat(advanceRate) / 100;
    const base = isPc
      ? (contractValue ?? null)
      : advanceIncludeOverview
        ? (contractValue ?? null)
        : (translationValue ?? null);
    if (Number.isNaN(r) || base == null) return null;
    return base * r;
  }, [
    form.paymentType,
    advanceRate,
    advanceIncludeOverview,
    contractValue,
    translationValue,
    isPc,
  ]);
  const computedSettlementAmount = useMemo(() => {
    if (form.paymentType !== "settlement") return null;
    const adv = summary?.totalAdvance ?? null;
    if (isPc) {
      const base = contractValue ?? null;
      if (base == null || adv == null) return null;
      return Math.max(base - adv, 0);
    } else {
      const sv = settlementValue ?? null;
      if (sv == null || adv == null) return null;
      return Math.max(sv - adv, 0);
    }
  }, [
    form.paymentType,
    settlementValue,
    summary?.totalAdvance,
    contractValue,
    isPc,
  ]);
  const settlementClamped = useMemo(() => {
    if (form.paymentType !== "settlement") return false;
    const adv = summary?.totalAdvance ?? null;
    if (isPc) {
      const base = contractValue ?? null;
      if (base == null || adv == null) return false;
      return adv > base;
    } else {
      const sv = settlementValue ?? null;
      if (sv == null || adv == null) return false;
      return adv > sv;
    }
  }, [
    form.paymentType,
    settlementValue,
    summary?.totalAdvance,
    contractValue,
    isPc,
  ]);
  const formAmountNumber = useMemo(() => {
    if (form.paymentType === "advance") return computedAdvanceAmount ?? null;
    if (form.paymentType === "settlement")
      return computedSettlementAmount ?? null;
    const v = form.amount.trim() === "" ? NaN : parseFloat(form.amount);
    return Number.isNaN(v) ? null : v;
  }, [
    form.paymentType,
    form.amount,
    computedAdvanceAmount,
    computedSettlementAmount,
  ]);
  const formMgmtFee = useMemo(() => {
    if (formAmountNumber == null) return null;
    return formAmountNumber * 0.05;
  }, [formAmountNumber]);
  const formPit = useMemo(() => {
    if (formAmountNumber == null) return null;
    const m = formAmountNumber * 0.05;
    return (formAmountNumber - m) * 0.1;
  }, [formAmountNumber]);
  const formNet = useMemo(() => {
    if (formAmountNumber == null) return null;
    const m = formAmountNumber * 0.05;
    const t = (formAmountNumber - m) * 0.1;
    return formAmountNumber - m - t;
  }, [formAmountNumber]);
  const reset = () => {
    setForm({
      paymentType: "advance",
      voucherNo: "",
      paymentDate: "",
      amount: "",
      note: "",
    });
    setAdvanceRate("");
    setAdding(false);
  };
  const createMutation = useMutation({
    mutationFn: async () => {
      const amountStr =
        form.paymentType === "advance" && computedAdvanceAmount != null
          ? String(computedAdvanceAmount)
          : form.paymentType === "settlement" &&
              computedSettlementAmount != null
            ? String(computedSettlementAmount)
            : form.amount
              ? String(Number(form.amount))
              : null;
      const body = {
        contractId: contractId ?? null,
        paymentType: form.paymentType || null,
        voucherNo: form.voucherNo || null,
        paymentDate: form.paymentDate || null,
        amount: amountStr,
        note: form.note || null,
      };
      const res = await fetch(api.payments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Thêm chi tiền thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payments", contractId],
      });
      queryClient.invalidateQueries({
        queryKey: ["finance-summary", contractId],
      });
      reset();
      toast({ title: "Đã thêm chi tiền" });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(buildUrl(api.payments.delete.path, { id }), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Xóa thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payments", contractId],
      });
      queryClient.invalidateQueries({
        queryKey: ["finance-summary", contractId],
      });
      toast({ title: "Đã xóa chi tiền" });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    voucherNo: "",
    paymentDate: "",
    amount: "",
    note: "",
  });
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("Không có khoản để cập nhật");
      const body = {
        voucherNo: editForm.voucherNo || null,
        paymentDate: editForm.paymentDate || null,
        amount: editForm.amount ? String(Number(editForm.amount)) : undefined,
        note: editForm.note || null,
      };
      const res = await fetch(
        buildUrl(api.payments.update.path, { id: editingId }),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error("Cập nhật chi tiền thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payments", contractId],
      });
      queryClient.invalidateQueries({
        queryKey: ["finance-summary", contractId],
      });
      setEditingId(null);
      toast({ title: "Đã cập nhật chi tiền" });
    },
    onError: (e) =>
      toast({ title: "Lỗi", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="space-y-2 rounded-md border p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Thanh toán (tạm ứng/quyết toán)
        </Label>
        <div className="flex items-center gap-3">
          {!isPc && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={advanceIncludeOverview}
                onCheckedChange={(checked) =>
                  setAdvanceIncludeOverview(!!checked)
                }
                disabled={readOnly}
              />
              <span className="text-sm">Tạm ứng bao gồm bài tổng quan</span>
            </div>
          )}
          {!readOnly && !adding && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Thêm chi tiền
            </Button>
          )}
        </div>
      </div>
      {summary && (
        <div className="text-sm text-muted-foreground">
          Tổng đã chi:{" "}
          <span className="font-medium">
            {formatNumberAccounting(summary.totalPaid)}
          </span>{" "}
          • Tạm ứng:{" "}
          <span className="font-medium">
            {formatNumberAccounting(summary.totalAdvance)}
          </span>{" "}
          • Công nợ:{" "}
          <span className="font-medium">
            {formatNumberAccounting(summary.outstanding)}
          </span>
        </div>
      )}
      {isLoading ? (
        <SubTableSkeleton rows={2} />
      ) : (
        <>
          {payments.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số chứng từ</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead className="max-w-[100px]">Ghi chú</TableHead>
                    {!readOnly && <TableHead className="w-[80px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <Fragment key={p.id}>
                      <TableRow key={p.id}>
                        <TableCell>{p.paymentType ?? "—"}</TableCell>
                        <TableCell>{p.voucherNo ?? "—"}</TableCell>
                        <TableCell>
                          {formatDateDDMMYYYY(p.paymentDate) || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>{formatNumberAccounting(p.amount)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {numberToVietnameseWords(String(p.amount))}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="px-0 underline text-primary"
                            onClick={() =>
                              setExpandedPaymentIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(p.id)) next.delete(p.id);
                                else next.add(p.id);
                                return next;
                              })
                            }>
                            {expandedPaymentIds.has(p.id)
                              ? "Ẩn chi tiết"
                              : "Chi tiết"}
                          </Button>
                          {expandedPaymentIds.has(p.id) && (
                            <div className="mt-1 p-1 border rounded bg-muted/10 space-y-0.5">
                              <div className="text-xs">
                                Phí quản lý:{" "}
                                <span className="font-medium">
                                  {formatNumberAccounting(
                                    Number(p.amount) * 0.05,
                                  )}
                                </span>{" "}
                                (5%)
                              </div>
                              <div className="text-xs">
                                Thuế TNCN:{" "}
                                <span className="font-medium">
                                  {formatNumberAccounting(
                                    (Number(p.amount) -
                                      Number(p.amount) * 0.05) *
                                      0.1,
                                  )}
                                </span>{" "}
                                (10% sau khi trừ phí quản lý)
                              </div>
                              <div className="text-xs">
                                Giá trị thực nhận:{" "}
                                <span className="font-medium">
                                  {formatNumberAccounting(
                                    Number(p.amount) -
                                      Number(p.amount) * 0.05 -
                                      (Number(p.amount) -
                                        Number(p.amount) * 0.05) *
                                        0.1,
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell
                          className="max-w-[240px] truncate"
                          title={p.note ?? undefined}>
                          {p.note ?? "—"}
                        </TableCell>
                        {!readOnly && (
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingId(p.id);
                                setEditForm({
                                  voucherNo: p.voucherNo ?? "",
                                  paymentDate: p.paymentDate
                                    ? typeof p.paymentDate === "string"
                                      ? p.paymentDate
                                      : (p.paymentDate as Date)
                                          .toISOString()
                                          .slice(0, 10)
                                    : "",
                                  amount:
                                    (p.paymentType || "").toLowerCase() ===
                                    "other"
                                      ? String(p.amount ?? "")
                                      : "",
                                  note: p.note ?? "",
                                });
                              }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(p.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                      {editingId === p.id && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div
                              className="mt-2 p-2 border rounded bg-muted/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                              }}>
                              <div className="grid gap-1">
                                <Label>Số chứng từ</Label>
                                <Input
                                  value={editForm.voucherNo}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      voucherNo: e.target.value,
                                    }))
                                  }
                                  placeholder="VD: PT-001"
                                />
                              </div>
                              <div className="grid gap-1">
                                <Label>Ngày</Label>
                                <DateInput
                                  value={editForm.paymentDate || null}
                                  onChange={(v) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      paymentDate: v || "",
                                    }))
                                  }
                                />
                              </div>
                              <div className="grid gap-1">
                                <Label>Số tiền</Label>
                                <NumberInput
                                  value={
                                    (p.paymentType || "").toLowerCase() ===
                                    "other"
                                      ? editForm.amount
                                      : String(p.amount)
                                  }
                                  onChange={(v) =>
                                    (p.paymentType || "").toLowerCase() ===
                                    "other"
                                      ? setEditForm((f) => ({
                                          ...f,
                                          amount: v,
                                        }))
                                      : undefined
                                  }
                                  decimals={2}
                                  showFormatted={true}
                                  placeholder="0"
                                  className={
                                    (p.paymentType || "").toLowerCase() ===
                                    "other"
                                      ? undefined
                                      : "bg-muted"
                                  }
                                  readOnly={
                                    (p.paymentType || "").toLowerCase() !==
                                    "other"
                                  }
                                />
                              </div>
                              <div className="grid gap-1">
                                <Label>Ghi chú</Label>
                                <Input
                                  value={editForm.note}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      note: e.target.value,
                                    }))
                                  }
                                  placeholder="Ghi chú"
                                />
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={updateMutation.isPending}
                                  onClick={() => updateMutation.mutate()}>
                                  {updateMutation.isPending && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  )}
                                  Cập nhật
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}>
                                  Hủy
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {adding && !readOnly && (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}>
              <div className="grid gap-1">
                <Label>Loại</Label>
                <Select
                  value={form.paymentType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, paymentType: v }))
                  }>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">advance</SelectItem>
                    <SelectItem value="settlement">settlement</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.paymentType === "advance" && (
                <div className="grid gap-1">
                  <Label>Tỷ lệ tạm ứng (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={advanceRate}
                    onChange={(e) => setAdvanceRate(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
              <div className="grid gap-1">
                <Label>Số chứng từ</Label>
                <Input
                  value={form.voucherNo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, voucherNo: e.target.value }))
                  }
                  placeholder="VD: PT-001"
                />
              </div>
              <div className="grid gap-1">
                <Label>Ngày</Label>
                <DateInput
                  value={form.paymentDate || null}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, paymentDate: v || "" }))
                  }
                />
              </div>
              <div className="grid gap-1">
                <Label>Số tiền</Label>
                <NumberInput
                  value={
                    form.paymentType === "advance"
                      ? computedAdvanceAmount != null
                        ? String(computedAdvanceAmount)
                        : ""
                      : form.paymentType === "settlement"
                        ? computedSettlementAmount != null
                          ? String(computedSettlementAmount)
                          : ""
                        : form.amount
                  }
                  onChange={(v) =>
                    form.paymentType === "advance"
                      ? undefined
                      : form.paymentType === "settlement"
                        ? undefined
                        : setForm((f) => ({ ...f, amount: v }))
                  }
                  decimals={2}
                  showFormatted={true}
                  placeholder="0"
                  className={
                    form.paymentType === "advance" ||
                    form.paymentType === "settlement"
                      ? "bg-muted"
                      : undefined
                  }
                  readOnly={
                    form.paymentType === "advance" ||
                    form.paymentType === "settlement"
                  }
                />
                {form.paymentType === "settlement" && settlementClamped && (
                  <p className="text-xs text-destructive mt-1">
                    Tổng tạm ứng vượt Giá trị quyết toán; số tiền quyết toán
                    được đưa về 0.
                  </p>
                )}
                {formAmountNumber != null && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {numberToVietnameseWords(String(formAmountNumber))}
                    </p>
                    <div className="mt-1 p-2 border rounded bg-muted/10 space-y-1">
                      <div className="text-xs">
                        Phí quản lý:{" "}
                        <span className="font-medium">
                          {formatNumberAccounting(formMgmtFee ?? 0)}
                        </span>{" "}
                        (5%)
                      </div>
                      <div className="text-xs">
                        Thuế TNCN:{" "}
                        <span className="font-medium">
                          {formatNumberAccounting(formPit ?? 0)}
                        </span>{" "}
                        (10% sau khi trừ phí quản lý)
                      </div>
                      <div className="text-xs">
                        Giá trị thực nhận:{" "}
                        <span className="font-medium">
                          {formatNumberAccounting(formNet ?? 0)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="grid gap-1">
                <Label>Ghi chú</Label>
                <Input
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder="Ghi chú"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate()}>
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Thêm
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={reset}>
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
