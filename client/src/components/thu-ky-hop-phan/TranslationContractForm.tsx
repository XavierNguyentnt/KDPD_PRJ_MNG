import React, { useState, useMemo, useEffect } from "react";
import { useQuery, type useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useUsers } from "@/hooks/use-works-and-components";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import type {
  Work,
  TranslationContract,
  ProofreadingContract,
  Component,
  TaskWithAssignmentDetails,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { NumberInput } from "@/components/ui/number-input";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkPicker } from "@/components/work-picker";
import { TranslatorPicker } from "@/components/translator-picker";
import {
  formatDateDDMMYYYY,
  formatNumberAccounting,
  numberToVietnameseWords,
  normalizeSearch,
} from "@/lib/utils";
import { Loader2, AlertCircle, Calendar, User as UserIcon, X } from "lucide-react";
import { ContractStagesSection } from "./ContractStagesSection";
import { PaymentsSection } from "./PaymentsSection";
import { parseDateOnly, formatDurationMonths, charsToPages } from "./thu-ky-shared";

export function TranslationContractForm({
  contract,
  works,
  tasks,
  proofreadingContracts,
  translationContracts,
  componentsList,
  queryClient,
  onSubmit,
  isPending,
  readOnly = false,
}: {
  contract: TranslationContract | null;
  works: Work[];
  tasks: TaskWithAssignmentDetails[];
  proofreadingContracts: ProofreadingContract[];
  translationContracts: TranslationContract[];
  componentsList: Component[];
  queryClient: ReturnType<typeof useQueryClient>;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
  readOnly?: boolean;
}) {
  const [contractNumber, setContractNumber] = useState(
    contract?.contractNumber ?? "",
  );
  const [componentId, setComponentId] = useState(contract?.componentId ?? "");
  const [workId, setWorkId] = useState(contract?.workId ?? "");
  const [unitPrice, setUnitPrice] = useState(
    contract?.unitPrice != null ? String(contract.unitPrice) : "",
  );
  const [overviewValue, setOverviewValue] = useState(
    contract?.overviewValue != null ? String(contract.overviewValue) : "",
  );
  const [translationValue, setTranslationValue] = useState(
    contract?.translationValue != null ? String(contract.translationValue) : "",
  );
  const [contractValue, setContractValue] = useState(
    contract?.contractValue != null ? String(contract.contractValue) : "",
  );
  const [startDate, setStartDate] = useState(
    contract?.startDate ? (contract.startDate as string).slice(0, 10) : "",
  );
  const [endDate, setEndDate] = useState(
    contract?.endDate ? (contract.endDate as string).slice(0, 10) : "",
  );
  const [extensionStartDate, setExtensionStartDate] = useState(
    contract?.extensionStartDate
      ? (contract.extensionStartDate as string).slice(0, 10)
      : "",
  );
  const [extensionEndDate, setExtensionEndDate] = useState(
    contract?.extensionEndDate
      ? (contract.extensionEndDate as string).slice(0, 10)
      : "",
  );
  const [actualCompletionDate, setActualCompletionDate] = useState(
    contract?.actualCompletionDate
      ? (contract.actualCompletionDate as string).slice(0, 10)
      : "",
  );
  const [actualWordCount, setActualWordCount] = useState(
    contract?.actualWordCount != null ? String(contract.actualWordCount) : "",
  );
  const [actualPageCount, setActualPageCount] = useState(
    contract?.actualPageCount != null ? String(contract.actualPageCount) : "",
  );
  const [completionRate, setCompletionRate] = useState(
    contract?.completionRate != null
      ? String(Number(contract.completionRate) * 100)
      : "",
  );
  const [settlementValue, setSettlementValue] = useState(
    contract?.settlementValue != null ? String(contract.settlementValue) : "",
  );
  const [advanceRate, setAdvanceRate] = useState<string>("");
  const [advanceIncludeOverview, setAdvanceIncludeOverview] = useState(true);
  useEffect(() => {
    try {
      const rawRate = window.localStorage.getItem("tcAdvanceRate");
      if (rawRate != null) setAdvanceRate(rawRate);
      const rawInc = window.localStorage.getItem("tcAdvanceIncludeOverview");
      if (rawInc) {
        const parsed = JSON.parse(rawInc);
        setAdvanceIncludeOverview(!!parsed);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem("tcAdvanceRate", advanceRate);
      window.localStorage.setItem(
        "tcAdvanceIncludeOverview",
        JSON.stringify(advanceIncludeOverview),
      );
    } catch {}
  }, [advanceRate, advanceIncludeOverview]);
  const [note, setNote] = useState(contract?.note ?? "");
  const [status, setStatus] = useState(contract?.status ?? "Active");
  const [lastManualStatus, setLastManualStatus] = useState(
    contract?.status && contract.status !== "Completed"
      ? contract.status
      : "Active",
  );
  const [translatorUsers, setTranslatorUsers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [translatorPickerName, setTranslatorPickerName] = useState("");
  const [translatorPickerUserId, setTranslatorPickerUserId] = useState<
    string | null
  >(null);

  const { data: users = [] } = useUsers();
  const duplicateTranslationContract = useMemo(() => {
    const normalizedNumber = normalizeSearch(contractNumber.trim());
    if (!componentId || !workId || !normalizedNumber) return null;
    return (
      translationContracts.find((c) => {
        if (contract?.id && c.id === contract.id) return false;
        if (c.componentId !== componentId) return false;
        if (c.workId !== workId) return false;
        const number = normalizeSearch(String(c.contractNumber ?? ""));
        return number === normalizedNumber;
      }) ?? null
    );
  }, [componentId, workId, contractNumber, translationContracts, contract?.id]);

  // Load translation contract members when editing
  const { data: contractMembers = [] } = useQuery({
    queryKey: ["translation-contract-members", contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];
      const res = await fetch(
        buildUrl(api.translationContractMembers.listByContract.path, {
          contractId: contract.id,
        }),
        { credentials: "include" },
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!contract?.id,
  });

  useEffect(() => {
    if (!contract?.id) return;

    if (contractMembers.length === 0) {
      setTranslatorUsers([]);
      return;
    }
    const mapped = contractMembers
      .map((member: { userId?: string | null }) => {
        if (!member?.userId) return null;
        const user = users.find((u) => u.id === member.userId);
        return {
          id: member.userId,
          name: user?.displayName ?? member.userId,
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string }>;
    const unique = Array.from(new Map(mapped.map((u) => [u.id, u])).values());
    setTranslatorUsers(unique);
  }, [contract?.id, contractMembers, users]);

  const handleAddTranslator = (name: string, id: string | null) => {
    if (!id) {
      setTranslatorPickerName("");
      setTranslatorPickerUserId(null);
      return;
    }
    setTranslatorUsers((prev) =>
      prev.some((u) => u.id === id)
        ? prev
        : [...prev, { id, name: name || id }],
    );
    setTranslatorPickerName("");
    setTranslatorPickerUserId(null);
  };

  const handleRemoveTranslator = (id: string) => {
    setTranslatorUsers((prev) => prev.filter((u) => u.id !== id));
  };
  const [cancelledAt, setCancelledAt] = useState(
    contract?.cancelledAt ? (contract.cancelledAt as string).slice(0, 10) : "",
  );
  const [progressCheckDate, setProgressCheckDate] = useState(
    contract?.progressCheckDate
      ? (contract.progressCheckDate as string).slice(0, 10)
      : "",
  );
  const [expertReviewDate, setExpertReviewDate] = useState(
    contract?.expertReviewDate
      ? (contract.expertReviewDate as string).slice(0, 10)
      : "",
  );
  const [projectAcceptanceDate, setProjectAcceptanceDate] = useState(
    contract?.projectAcceptanceDate
      ? (contract.projectAcceptanceDate as string).slice(0, 10)
      : "",
  );
  const [proofreadingInProgress, setProofreadingInProgress] = useState(
    !!contract?.proofreadingInProgress,
  );
  const [editingInProgress, setEditingInProgress] = useState(
    !!contract?.editingInProgress,
  );
  const [printTransferDate, setPrintTransferDate] = useState(
    contract?.printTransferDate
      ? (contract.printTransferDate as string).slice(0, 10)
      : "",
  );
  const [publishedDate, setPublishedDate] = useState(
    contract?.publishedDate
      ? (contract.publishedDate as string).slice(0, 10)
      : "",
  );
  useEffect(() => {
    if (actualCompletionDate.trim() !== "") {
      if (status !== "Completed") setStatus("Completed");
      return;
    }
    if (status === "Completed") {
      setStatus(lastManualStatus);
    }
  }, [actualCompletionDate, lastManualStatus, status]);
  const contractDateError = useMemo(() => {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    const actual = parseDateOnly(actualCompletionDate);
    if (start && end && end.getTime() < start.getTime()) {
      return "Ngày kết thúc hợp đồng không được nhỏ hơn ngày bắt đầu.";
    }
    if (start && actual && actual.getTime() < start.getTime()) {
      return "Ngày hoàn thành thực tế không được nhỏ hơn ngày bắt đầu.";
    }
    return null;
  }, [startDate, endDate, actualCompletionDate]);
  const today = () => new Date().toISOString().slice(0, 10);
  const autoEditingCompletedDate = useMemo(() => {
    if (!workId) return "";
    const bienTapTasks = tasks.filter(
      (t) => t.group === "Biên tập" && t.relatedWorkId === workId,
    );
    const completedDates = bienTapTasks
      .filter((t) => {
        const wf = t.workflow;
        let roundType = "";
        if (typeof wf === "string") {
          try {
            const parsed = JSON.parse(wf) as {
              rounds?: Array<{ roundType?: string | null }>;
            };
            roundType = parsed?.rounds?.[0]?.roundType ?? "";
          } catch {
            roundType = "";
          }
        } else if (typeof wf === "object" && wf) {
          const parsed = wf as {
            rounds?: Array<{ roundType?: string | null }>;
          };
          roundType = parsed?.rounds?.[0]?.roundType ?? "";
        }
        return roundType?.toLowerCase().includes("bông chuyển in");
      })
      .map((t) => {
        const v = t.actualCompletedAt;
        if (!v) return "";
        const date = typeof v === "string" ? new Date(v) : v;
        if (!date || Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
      })
      .filter(Boolean);
    if (completedDates.length === 0) return "";
    return completedDates.sort().slice(-1)[0];
  }, [tasks, workId]);

  const autoProofreadingCompletedDate = useMemo(() => {
    if (!contract?.id && !workId) return "";
    const matches = proofreadingContracts.filter((c) =>
      contract?.id
        ? c.translationContractId === contract.id
        : c.workId === workId,
    );
    const dates = matches
      .map((c) => c.actualCompletionDate)
      .map((v) => {
        if (!v) return "";
        const date = typeof v === "string" ? new Date(v) : v;
        if (!date || Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10);
      })
      .filter(Boolean);
    if (dates.length === 0) return "";
    return dates.sort().slice(-1)[0];
  }, [proofreadingContracts, contract?.id, workId]);

  // Kinh phí dịch thuật = đơn giá × số trang dự tính
  useEffect(() => {
    const selectedWork = works.find((w) => w.id === workId);
    const estimatePageCount =
      selectedWork?.estimatePageCount != null
        ? Number(selectedWork.estimatePageCount)
        : 0;
    const price = unitPrice.trim() === "" ? NaN : parseFloat(unitPrice);
    if (Number.isNaN(price) || estimatePageCount === 0) {
      setTranslationValue("");
      return;
    }
    setTranslationValue((estimatePageCount * price).toFixed(2));
  }, [workId, unitPrice, works]);

  // Giá trị hợp đồng = Kinh phí dịch thuật + Kinh phí viết bài tổng quan
  useEffect(() => {
    if (translationValue.trim() === "" && overviewValue.trim() === "") {
      setContractValue("");
      return;
    }
    const trans =
      translationValue.trim() === "" ? 0 : parseFloat(translationValue);
    const over = overviewValue.trim() === "" ? 0 : parseFloat(overviewValue);
    const total =
      (Number.isNaN(trans) ? 0 : trans) + (Number.isNaN(over) ? 0 : over);
    setContractValue(total.toFixed(2));
  }, [translationValue, overviewValue]);

  // Khi bản dịch đã hoàn thành (có ngày hoàn thành thực tế): tự tính Tỷ lệ hoàn thành và Giá trị quyết toán
  // Tỷ lệ hoàn thành = actual_page_count / estimate_page_count (works) * 100%
  // Giá trị quyết toán = (actual_page_count * unit_price) + overview_value
  useEffect(() => {
    if (actualCompletionDate.trim() === "") return;
    const selectedWork = works.find((w) => w.id === workId);
    const estimatePageCount =
      selectedWork?.estimatePageCount != null
        ? Number(selectedWork.estimatePageCount)
        : 0;
    const actualPages =
      actualPageCount.trim() === "" ? NaN : parseInt(actualPageCount, 10);
    const price = unitPrice.trim() === "" ? NaN : parseFloat(unitPrice);
    const over = overviewValue.trim() === "" ? 0 : parseFloat(overviewValue);
    if (Number.isNaN(actualPages)) return;
    if (estimatePageCount > 0) {
      const rate = (actualPages / estimatePageCount) * 100;
      setCompletionRate(rate.toFixed(2));
    }
    if (!Number.isNaN(price)) {
      const settlement = actualPages * price + (Number.isNaN(over) ? 0 : over);
      setSettlementValue(settlement.toFixed(2));
    }
  }, [
    actualCompletionDate,
    actualPageCount,
    workId,
    unitPrice,
    overviewValue,
    works,
  ]);
  const contractMgmtFee = useMemo(() => {
    const v = contractValue.trim() === "" ? NaN : parseFloat(contractValue);
    if (Number.isNaN(v)) return null;
    return v * 0.05;
  }, [contractValue]);
  const contractPit = useMemo(() => {
    const v = contractValue.trim() === "" ? NaN : parseFloat(contractValue);
    if (Number.isNaN(v)) return null;
    const m = v * 0.05;
    return (v - m) * 0.1;
  }, [contractValue]);
  const contractNet = useMemo(() => {
    const v = contractValue.trim() === "" ? NaN : parseFloat(contractValue);
    if (Number.isNaN(v)) return null;
    const m = v * 0.05;
    const t = (v - m) * 0.1;
    return v - m - t;
  }, [contractValue]);
  const settlementMgmtFee = useMemo(() => {
    const v = settlementValue.trim() === "" ? NaN : parseFloat(settlementValue);
    if (Number.isNaN(v)) return null;
    return v * 0.05;
  }, [settlementValue]);
  const settlementPit = useMemo(() => {
    const v = settlementValue.trim() === "" ? NaN : parseFloat(settlementValue);
    if (Number.isNaN(v)) return null;
    const m = v * 0.05;
    return (v - m) * 0.1;
  }, [settlementValue]);
  const settlementNet = useMemo(() => {
    const v = settlementValue.trim() === "" ? NaN : parseFloat(settlementValue);
    if (Number.isNaN(v)) return null;
    const m = v * 0.05;
    const t = (v - m) * 0.1;
    return v - m - t;
  }, [settlementValue]);
  const computedAdvance = useMemo(() => {
    const rateStr = advanceRate.trim();
    const r = rateStr === "" ? NaN : parseFloat(rateStr) / 100;
    const base = advanceIncludeOverview
      ? contractValue.trim() === ""
        ? NaN
        : parseFloat(contractValue)
      : translationValue.trim() === ""
        ? NaN
        : parseFloat(translationValue);
    if (Number.isNaN(r) || Number.isNaN(base)) return null;
    return base * r;
  }, [advanceRate, advanceIncludeOverview, contractValue, translationValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const computedStatus =
      actualCompletionDate.trim() !== "" ? "Completed" : status;
    if (duplicateTranslationContract) return;
    if (contractDateError) return;

    // Gửi số dưới dạng chuỗi để API/Zod (drizzle-zod numeric) không báo 400
    const num = (v: string | null) =>
      v != null && v !== "" ? String(Number(v)) : null;

    // Gọi onSubmit với data hợp đồng
    // translatorUserIds đã được xử lý trong TranslatorPicker
    onSubmit({
      contractNumber: contractNumber || null,
      componentId: componentId || null,
      workId: workId || null,
      unitPrice: unitPrice ? num(unitPrice) : null,
      overviewValue: overviewValue ? num(overviewValue) : null,
      translationValue: translationValue ? num(translationValue) : null,
      contractValue: contractValue ? num(contractValue) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      extensionStartDate: extensionStartDate || null,
      extensionEndDate: extensionEndDate || null,
      actualCompletionDate: actualCompletionDate || null,
      actualWordCount: actualWordCount ? parseInt(actualWordCount, 10) : null,
      actualPageCount: actualPageCount ? parseInt(actualPageCount, 10) : null,
      completionRate: completionRate
        ? num(String(Number(completionRate) / 100))
        : null,
      settlementValue: settlementValue ? num(settlementValue) : null,
      status: computedStatus || null,
      cancelledAt: computedStatus === "Cancel" ? cancelledAt || null : null,
      progressCheckDate: progressCheckDate || null,
      expertReviewDate: expertReviewDate || null,
      projectAcceptanceDate: projectAcceptanceDate || null,
      proofreadingInProgress,
      proofreadingCompleted: !!autoProofreadingCompletedDate,
      editingInProgress,
      editingCompleted: !!autoEditingCompletedDate,
      printTransferDate: printTransferDate || null,
      publishedDate: publishedDate || null,
      note: note || null,
      _translatorUserIds: translatorUsers.map((u) => u.id), // Dùng prefix _ để không gửi vào API translation contract
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 overflow-y-auto pr-2 flex-1 min-h-0 max-h-[80vh]">
      {/* Thông tin cơ bản */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Thông tin cơ bản
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <div className="grid gap-2">
            <Label>Số hợp đồng</Label>
            <Input
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              placeholder="Số HĐ"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Hợp phần</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={componentId}
              onChange={(e) => setComponentId(e.target.value)}
              disabled={readOnly}>
              <option value="">— Chọn hợp phần —</option>
              {componentsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <WorkPicker
            label="Tác phẩm"
            works={works}
            components={componentsList}
            value={workId || null}
            onChange={(id) => setWorkId(id ?? "")}
            disabled={readOnly}
            placeholder="Tìm theo tiêu đề, mã tài liệu, hợp phần, giai đoạn..."
            componentFilterId={componentId || null}
            className="self-start"
          />
          <div className="grid gap-2">
            <TranslatorPicker
              label="Dịch giả"
              value={translatorPickerName}
              userId={translatorPickerUserId}
              onChange={handleAddTranslator}
              disabled={readOnly}
              placeholder="Tìm theo tên hoặc email..."
              className="self-start"
            />
            {translatorUsers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {translatorUsers.map((u) => (
                  <Badge
                    key={u.id}
                    variant="secondary"
                    className="flex items-center gap-1">
                    <span className="truncate max-w-[160px]">{u.name}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTranslator(u.id)}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        aria-label="Xóa">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Chưa chọn dịch giả.
              </p>
            )}
          </div>
        </div>
        {!readOnly && duplicateTranslationContract && (
          <Alert variant="destructive">
            <AlertTitle>Trùng hợp đồng dịch thuật</AlertTitle>
            <AlertDescription>
              Tác phẩm đã có hợp đồng với số HĐ này trong cùng hợp phần. Vui
              lòng kiểm tra lại số hợp đồng hoặc tác phẩm.
            </AlertDescription>
          </Alert>
        )}
        {!readOnly && contractDateError && (
          <Alert variant="destructive">
            <AlertTitle>Ngày hợp đồng không hợp lệ</AlertTitle>
            <AlertDescription>{contractDateError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Giá trị hợp đồng */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Giá trị hợp đồng
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          <div className="grid gap-2">
            <Label>Đơn giá (VNĐ/trang)</Label>
            <NumberInput
              value={unitPrice}
              onChange={setUnitPrice}
              decimals={2}
              showFormatted={true}
              placeholder="0"
              disabled={readOnly}
            />
            {unitPrice.trim() !== "" &&
              !Number.isNaN(parseFloat(unitPrice)) && (
                <p className="text-xs text-muted-foreground">
                  {numberToVietnameseWords(unitPrice)}
                </p>
              )}
          </div>
          <div className="grid gap-2">
            <Label>Kinh phí viết bài tổng quan (VNĐ)</Label>
            <NumberInput
              value={overviewValue}
              onChange={setOverviewValue}
              decimals={2}
              showFormatted={true}
              placeholder="0"
              disabled={readOnly}
            />
            {overviewValue.trim() !== "" &&
              !Number.isNaN(parseFloat(overviewValue)) && (
                <p className="text-xs text-muted-foreground">
                  {numberToVietnameseWords(overviewValue)}
                </p>
              )}
          </div>
          <div className="grid gap-2">
            <Label>
              Kinh phí dịch thuật (VNĐ){" "}
              <span className="text-muted-foreground font-normal text-xs">
                (đơn giá × số trang dự tính)
              </span>
            </Label>
            <NumberInput
              value={translationValue}
              onChange={setTranslationValue}
              decimals={2}
              showFormatted={true}
              placeholder="0"
              className="bg-muted"
              readOnly
              disabled={readOnly}
            />
            {translationValue.trim() !== "" &&
              !Number.isNaN(parseFloat(translationValue)) && (
                <p className="text-xs text-muted-foreground">
                  {numberToVietnameseWords(translationValue)}
                </p>
              )}
          </div>
          <div className="grid gap-2">
            <Label>
              Giá trị hợp đồng (VNĐ){" "}
              <span className="text-muted-foreground font-normal text-xs">
                (kinh phí dịch thuật + kinh phí tổng quan)
              </span>
            </Label>
            <NumberInput
              value={contractValue}
              onChange={setContractValue}
              decimals={2}
              showFormatted={true}
              placeholder="0"
              className="bg-muted"
              readOnly
              disabled={readOnly}
            />
            {contractValue.trim() !== "" &&
              !Number.isNaN(parseFloat(contractValue)) && (
                <p className="text-xs text-muted-foreground">
                  {numberToVietnameseWords(contractValue)}
                </p>
              )}
          </div>
        </div>
        <div className="p-3 border rounded-md bg-muted/10 space-y-1">
          <div className="text-xs text-muted-foreground">
            Các khoản khấu trừ áp dụng cho Giá trị HĐ:
          </div>
          <div className="text-xs">
            Phí quản lý:{" "}
            <span className="font-medium">
              {contractMgmtFee != null
                ? formatNumberAccounting(contractMgmtFee)
                : "—"}
            </span>{" "}
            (5%)
          </div>
          <div className="text-xs">
            Thuế TNCN:{" "}
            <span className="font-medium">
              {contractPit != null ? formatNumberAccounting(contractPit) : "—"}
            </span>{" "}
            (10% sau khi trừ phí quản lý)
          </div>
          <div className="text-xs">
            Giá trị thực nhận:{" "}
            <span className="font-medium">
              {contractNet != null ? formatNumberAccounting(contractNet) : "—"}
            </span>
          </div>
          <div className="h-px my-1 bg-muted" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
            <div className="grid gap-1">
              <Label>Tỷ lệ tạm ứng (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={advanceRate}
                onChange={(e) => setAdvanceRate(e.target.value)}
                placeholder="0"
                disabled={readOnly}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={advanceIncludeOverview}
                onCheckedChange={(checked) =>
                  setAdvanceIncludeOverview(!!checked)
                }
                disabled={readOnly}
              />
              <span className="text-sm">Bao gồm bài tổng quan</span>
            </div>
            <div className="sm:col-span-2 text-xs">
              Giá trị tạm ứng ước tính:{" "}
              <span className="font-medium">
                {computedAdvance != null
                  ? formatNumberAccounting(computedAdvance)
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thời gian */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Thời gian</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <div className="grid gap-2">
            <Label>Ngày bắt đầu</Label>
            <DateInput
              value={startDate || null}
              onChange={(v) => setStartDate(v || "")}
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Ngày kết thúc</Label>
            <DateInput
              value={endDate || null}
              onChange={(v) => setEndDate(v || "")}
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Hoàn thành thực tế</Label>
            <DateInput
              value={actualCompletionDate || null}
              onChange={(v) => setActualCompletionDate(v || "")}
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Gia hạn từ</Label>
            <DateInput
              value={extensionStartDate || null}
              onChange={(v) => setExtensionStartDate(v || "")}
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Gia hạn đến</Label>
            <DateInput
              value={extensionEndDate || null}
              onChange={(v) => setExtensionEndDate(v || "")}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Thực tế và quyết toán */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Thực tế và quyết toán
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          <div className="grid gap-2">
            <Label>Số chữ thực tế</Label>
            <NumberInput
              value={actualWordCount}
              onChange={(v) => {
                setActualWordCount(v);
                const n = v ? parseInt(v, 10) : NaN;
                setActualPageCount(!isNaN(n) ? String(charsToPages(n)) : "");
              }}
              decimals={0}
              placeholder="0"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>
              Số trang thực tế{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (350 chữ/trang)
              </span>
            </Label>
            <NumberInput
              value={actualPageCount}
              onChange={setActualPageCount}
              decimals={0}
              placeholder="0"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Tỷ lệ hoàn thành (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={completionRate}
              onChange={(e) => setCompletionRate(e.target.value)}
              placeholder="0"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-2">
            <Label>Giá trị quyết toán (VNĐ)</Label>
            <NumberInput
              value={settlementValue}
              onChange={setSettlementValue}
              decimals={2}
              showFormatted={true}
              placeholder="0"
              disabled={readOnly}
            />
            {settlementValue.trim() !== "" &&
              !Number.isNaN(parseFloat(settlementValue)) && (
                <p className="text-xs text-muted-foreground">
                  {numberToVietnameseWords(settlementValue)}
                </p>
              )}
            <div className="mt-2 p-2 border rounded bg-muted/10 space-y-1">
              <div className="text-xs">
                Phí quản lý:{" "}
                <span className="font-medium">
                  {settlementMgmtFee != null
                    ? formatNumberAccounting(settlementMgmtFee)
                    : "—"}
                </span>{" "}
                (5%)
              </div>
              <div className="text-xs">
                Thuế TNCN:{" "}
                <span className="font-medium">
                  {settlementPit != null
                    ? formatNumberAccounting(settlementPit)
                    : "—"}
                </span>{" "}
                (10% sau khi trừ phí quản lý)
              </div>
              <div className="text-xs">
                Giá trị thực nhận:{" "}
                <span className="font-medium">
                  {settlementNet != null
                    ? formatNumberAccounting(settlementNet)
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tiến độ hợp đồng */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Tiến độ hợp đồng
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          <div className="grid gap-2">
            <Label>Trạng thái</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                if (value !== "Completed") setLastManualStatus(value);
              }}
              disabled={readOnly || actualCompletionDate.trim() !== ""}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancel">Cancel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === "Cancel" && (
            <div className="grid gap-2">
              <Label>Ngày hủy hợp đồng</Label>
              <DateInput
                value={cancelledAt || null}
                onChange={(v) => setCancelledAt(v || "")}
                disabled={readOnly}
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <Label className="text-sm font-semibold">
              Theo dõi kiểm tra tiến độ
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!progressCheckDate}
                  onCheckedChange={(checked) => {
                    if (checked)
                      setProgressCheckDate((prev) => prev || today());
                    else setProgressCheckDate("");
                  }}
                  disabled={readOnly}
                />
                <span className="text-sm">Đã kiểm tra tiến độ</span>
              </div>
              <DateInput
                value={progressCheckDate || null}
                onChange={(v) => setProgressCheckDate(v || "")}
                disabled={readOnly || !progressCheckDate}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!expertReviewDate}
                  onCheckedChange={(checked) => {
                    if (checked) setExpertReviewDate((prev) => prev || today());
                    else setExpertReviewDate("");
                  }}
                  disabled={readOnly}
                />
                <span className="text-sm">Đã thẩm định cấp chuyên gia</span>
              </div>
              <DateInput
                value={expertReviewDate || null}
                onChange={(v) => setExpertReviewDate(v || "")}
                disabled={readOnly || !expertReviewDate}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!projectAcceptanceDate}
                  onCheckedChange={(checked) => {
                    if (checked)
                      setProjectAcceptanceDate((prev) => prev || today());
                    else setProjectAcceptanceDate("");
                  }}
                  disabled={readOnly}
                />
                <span className="text-sm">Đã nghiệm thu cấp Dự án</span>
              </div>
              <DateInput
                value={projectAcceptanceDate || null}
                onChange={(v) => setProjectAcceptanceDate(v || "")}
                disabled={readOnly || !projectAcceptanceDate}
              />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <Label className="text-sm font-semibold">
              Biên tập & Hiệu đính
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={proofreadingInProgress}
                  onCheckedChange={(checked) =>
                    setProofreadingInProgress(!!checked)
                  }
                  disabled={readOnly}
                />
                <span className="text-sm">Đang hiệu đính</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!autoProofreadingCompletedDate} disabled />
                <span className="text-sm">Hoàn thành hiệu đính</span>
              </div>
              <DateInput
                value={autoProofreadingCompletedDate || null}
                onChange={() => undefined}
                disabled
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editingInProgress}
                  onCheckedChange={(checked) => setEditingInProgress(!!checked)}
                  disabled={readOnly}
                />
                <span className="text-sm">Đang biên tập</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!autoEditingCompletedDate} disabled />
                <span className="text-sm">Hoàn thành biên tập</span>
              </div>
              <DateInput
                value={autoEditingCompletedDate || null}
                onChange={() => undefined}
                disabled
              />
            </div>
          </div>
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <Label className="text-sm font-semibold">Xuất bản</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!printTransferDate}
                  onCheckedChange={(checked) => {
                    if (checked)
                      setPrintTransferDate((prev) => prev || today());
                    else setPrintTransferDate("");
                  }}
                  disabled={readOnly}
                />
                <span className="text-sm">Chuyển in</span>
              </div>
              <DateInput
                value={printTransferDate || null}
                onChange={(v) => setPrintTransferDate(v || "")}
                disabled={readOnly || !printTransferDate}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!publishedDate}
                  onCheckedChange={(checked) => {
                    if (checked) setPublishedDate((prev) => prev || today());
                    else setPublishedDate("");
                  }}
                  disabled={readOnly}
                />
                <span className="text-sm">Đã xuất bản</span>
              </div>
              <DateInput
                value={publishedDate || null}
                onChange={(v) => setPublishedDate(v || "")}
                disabled={readOnly || !publishedDate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ghi chú */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Ghi chú</h3>
        <div className="grid gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú"
            disabled={readOnly}
          />
        </div>
      </div>
      {contract && (
        <ContractStagesSection
          translationContractId={contract.id}
          queryClient={queryClient}
          readOnly={readOnly}
        />
      )}
      {contract && (
        <PaymentsSection
          translationContractId={contract.id}
          contractValue={
            contractValue.trim() === "" ? null : parseFloat(contractValue)
          }
          translationValue={
            translationValue.trim() === "" ? null : parseFloat(translationValue)
          }
          settlementValue={
            settlementValue.trim() === "" ? null : parseFloat(settlementValue)
          }
          queryClient={queryClient}
          readOnly={readOnly}
        />
      )}
      {!readOnly && (
        <DialogFooter>
          <Button
            type="submit"
            disabled={
              isPending || !!duplicateTranslationContract || !!contractDateError
            }>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {contract ? "Cập nhật" : "Thêm"}
          </Button>
        </DialogFooter>
      )}
    </form>
  );
}
