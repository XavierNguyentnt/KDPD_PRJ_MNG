import React, { useState, useMemo, useEffect } from "react";
import { useQuery, type useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useUsers } from "@/hooks/use-works-and-components";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  Work,
  TranslationContract,
  ProofreadingContract,
  Component,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { TranslationContractPicker } from "@/components/translation-contract-picker";
import {
  formatDateDDMMYYYY,
  formatNumberAccounting,
  numberToVietnameseWords,
} from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ContractStagesSection } from "./ContractStagesSection";
import { PaymentsSection } from "./PaymentsSection";
import { parseDateOnly, formatDurationMonths, formatStageDisplay } from "./thu-ky-shared";

export function ProofreadingContractForm({
  contract,
  works,
  translationContracts,
  translationContractMembers,
  componentsList,
  queryClient,
  onSubmit,
  isPending,
  readOnly = false,
}: {
  contract: ProofreadingContract | null;
  works: Work[];
  translationContracts: TranslationContract[];
  translationContractMembers: Array<{
    translationContractId: string;
    userId: string;
  }>;
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
  const [translationContractId, setTranslationContractId] = useState(
    contract?.translationContractId ?? "",
  );
  const [proofreaderName, setProofreaderName] = useState("");
  const [proofreaderUserId, setProofreaderUserId] = useState<string | null>(
    null,
  );
  const [selfProofreading, setSelfProofreading] = useState(false);
  const [hasUserTouchedProofreader, setHasUserTouchedProofreader] =
    useState(false);

  const filteredTranslationContracts = useMemo(() => {
    let list = translationContracts;
    if (componentId) {
      list = list.filter((c) => c.componentId === componentId);
    }
    if (workId) {
      list = list.filter((c) => c.workId === workId);
    }
    return list;
  }, [translationContracts, componentId, workId]);

  useEffect(() => {
    if (!translationContractId) return;
    const exists = filteredTranslationContracts.some(
      (c) => c.id === translationContractId,
    );
    if (!exists) setTranslationContractId("");
  }, [filteredTranslationContracts, translationContractId]);

  const { data: users = [] } = useUsers();
  const translatorForSelectedContract = useMemo(() => {
    if (!translationContractId) return null;
    const member = translationContractMembers.find(
      (m) => m.translationContractId === translationContractId && m.userId,
    );
    if (!member?.userId) return null;
    const user = users.find((u) => u.id === member.userId);
    return { id: member.userId, name: user?.displayName ?? member.userId };
  }, [translationContractId, translationContractMembers, users]);

  // Load proofreading contract members when editing
  const { data: contractMembers = [] } = useQuery({
    queryKey: ["proofreading-contract-members", contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];
      const res = await fetch(
        buildUrl(api.proofreadingContractMembers.listByContract.path, {
          contractId: contract.id,
        }),
        { credentials: "include" },
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!contract?.id,
  });

  // Set proofreader when contract members are loaded
  useEffect(() => {
    if (hasUserTouchedProofreader || selfProofreading) return;
    if (contractMembers.length > 0 && contractMembers[0]?.userId) {
      const member = contractMembers[0];
      setProofreaderUserId(member.userId);
      const user = users.find((u) => u.id === member.userId);
      if (user) {
        setProofreaderName(user.displayName);
      }
    }
  }, [contractMembers, users, hasUserTouchedProofreader, selfProofreading]);

  useEffect(() => {
    if (!selfProofreading) return;
    if (!translationContractId || !translatorForSelectedContract) {
      setProofreaderName("");
      setProofreaderUserId(null);
      return;
    }
    setProofreaderName(translatorForSelectedContract.name);
    setProofreaderUserId(translatorForSelectedContract.id);
  }, [selfProofreading, translationContractId, translatorForSelectedContract]);

  const handleSelfProofreadingChange = (checked: boolean) => {
    const next = !!checked;
    setSelfProofreading(next);
    setHasUserTouchedProofreader(true);
    if (!next) {
      setProofreaderName("");
      setProofreaderUserId(null);
    }
  };

  const [pageCount, setPageCount] = useState(
    contract?.pageCount != null ? String(contract.pageCount) : "",
  );
  const [rateRatio, setRateRatio] = useState(
    contract?.rateRatio != null ? String(Number(contract.rateRatio) * 100) : "",
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
  const [actualCompletionDate, setActualCompletionDate] = useState(
    contract?.actualCompletionDate
      ? (contract.actualCompletionDate as string).slice(0, 10)
      : "",
  );
  const [note, setNote] = useState(contract?.note ?? "");

  const selectedTranslationContract = useMemo(
    () =>
      translationContracts.find((c) => c.id === translationContractId) ?? null,
    [translationContracts, translationContractId],
  );
  const selectedWork = useMemo(
    () => works.find((w) => w.id === workId) ?? null,
    [works, workId],
  );

  useEffect(() => {
    if (!selectedTranslationContract) return;
    if (selectedTranslationContract.componentId) {
      setComponentId(selectedTranslationContract.componentId);
    }
    if (selectedTranslationContract.workId) {
      setWorkId(selectedTranslationContract.workId);
    }
    if (selectedTranslationContract.actualPageCount != null) {
      setPageCount(String(selectedTranslationContract.actualPageCount));
    } else {
      setPageCount("");
    }
  }, [selectedTranslationContract]);

  useEffect(() => {
    if (!selectedTranslationContract) return;
    const base = selectedTranslationContract.settlementValue;
    const settlement =
      base == null
        ? NaN
        : typeof base === "string"
          ? parseFloat(base)
          : Number(base);
    const ratio = rateRatio.trim() === "" ? NaN : parseFloat(rateRatio) / 100;
    if (Number.isNaN(settlement) || Number.isNaN(ratio)) {
      setContractValue("");
      return;
    }
    setContractValue((settlement * ratio).toFixed(2));
  }, [selectedTranslationContract, rateRatio]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    onSubmit({
      contractNumber: contractNumber || null,
      componentId: componentId || null,
      workId: workId || null,
      translationContractId: translationContractId || null,
      pageCount: pageCount ? parseInt(pageCount, 10) : null,
      rateRatio: rateRatio ? parseFloat(rateRatio) / 100 : null,
      contractValue: contractValue ? parseFloat(contractValue) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      actualCompletionDate: actualCompletionDate || null,
      note: note || null,
      _proofreaderUserId: proofreaderUserId, // Dùng prefix _ để không gửi vào API proofreading contract
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 overflow-y-auto pr-2 flex-1 min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2 min-w-0">
          <Label>Số hợp đồng</Label>
          <Input
            value={contractNumber}
            onChange={(e) => setContractNumber(e.target.value)}
            placeholder="Số HĐ"
            disabled={readOnly}
          />
        </div>
        <div className="grid gap-2 min-w-0">
          <Label>Hợp phần</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={componentId}
            onChange={(e) => setComponentId(e.target.value)}
            disabled={readOnly}>
            <option value="">Chọn hợp phần</option>
            {componentsList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 min-w-0">
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
          {selectedWork?.stage && (
            <p className="text-xs text-muted-foreground">
              Giai đoạn: {formatStageDisplay(selectedWork.stage)}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="grid gap-2 md:col-span-2 min-w-0">
          <TranslationContractPicker
            label="Hợp đồng dịch thuật (liên kết)"
            contracts={filteredTranslationContracts}
            works={works}
            components={componentsList}
            value={translationContractId || null}
            onChange={(id) => setTranslationContractId(id ?? "")}
            disabled={readOnly}
            placeholder="Tìm theo số HĐ, tác phẩm, mã tài liệu, hợp phần..."
            className="self-start"
          />
        </div>
        <div className="grid gap-2 md:col-span-3 min-w-0">
          <TranslatorPicker
            label="Người hiệu đính"
            value={proofreaderName}
            userId={proofreaderUserId}
            onChange={(name, id) => {
              setProofreaderName(name);
              setProofreaderUserId(id);
              setHasUserTouchedProofreader(true);
              setSelfProofreading(false);
            }}
            disabled={readOnly || selfProofreading}
            placeholder="Tìm theo tên hoặc email..."
          />
          {!readOnly && (
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="self-proofreading-checkbox"
                checked={selfProofreading}
                onCheckedChange={handleSelfProofreadingChange}
                disabled={!translatorForSelectedContract}
              />
              <label
                htmlFor="self-proofreading-checkbox"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Dịch giả tự hiệu đính
              </label>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
        <div className="grid gap-2 md:col-span-2 min-w-0">
          <Label>Số trang</Label>
          <NumberInput
            value={pageCount}
            onChange={setPageCount}
            decimals={0}
            placeholder="0"
            disabled={readOnly || !!selectedTranslationContract}
          />
          {selectedTranslationContract && (
            <p className="text-xs text-muted-foreground">
              Lấy từ số trang hoàn thành thực tế của Hợp đồng dịch thuật.
            </p>
          )}
        </div>
        <div className="grid gap-2 md:col-span-2 min-w-0">
          <Label>Tỷ lệ (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={rateRatio}
            onChange={(e) => setRateRatio(e.target.value)}
            placeholder="0"
            disabled={readOnly}
          />
        </div>
        <div className="grid gap-2 md:col-span-4 min-w-0">
          <Label>Giá trị hợp đồng hiệu đính (VNĐ)</Label>
          <NumberInput
            value={contractValue}
            onChange={setContractValue}
            decimals={2}
            showFormatted={true}
            placeholder="0"
            disabled={readOnly || !!selectedTranslationContract}
          />
          {contractValue.trim() !== "" &&
            !Number.isNaN(parseFloat(contractValue)) && (
              <p className="text-xs text-muted-foreground">
                {numberToVietnameseWords(contractValue)}
              </p>
            )}
          {selectedTranslationContract && (
            <p className="text-xs text-muted-foreground">
              Tính theo tỷ lệ (%) và giá trị quyết toán Hợp đồng dịch thuật.
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="grid gap-2 min-w-0">
          <Label>Ghi chú</Label>
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
          proofreadingContractId={contract.id}
          queryClient={queryClient}
          readOnly={readOnly}
        />
      )}
      {contract && (
        <PaymentsSection
          proofreadingContractId={contract.id}
          contractValue={
            contractValue.trim() === "" ? null : parseFloat(contractValue)
          }
          translationValue={null}
          settlementValue={null}
          queryClient={queryClient}
          readOnly={readOnly}
        />
      )}
      {!readOnly && (
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {contract ? "Cập nhật" : "Thêm"}
          </Button>
        </DialogFooter>
      )}
    </form>
  );
}
