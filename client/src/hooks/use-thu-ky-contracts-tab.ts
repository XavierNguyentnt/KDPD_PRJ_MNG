import { useCallback, useMemo, useState, useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import type {
  TranslationContract,
  ProofreadingContract,
  Work,
  Component,
  Payment,
} from "@shared/schema";
import { normalizeSearch, formatDateDDMMYYYY } from "@/lib/utils";

export type TranslationContractSortColumn =
  | "contractNumber"
  | "component"
  | "unitPrice"
  | "overviewValue"
  | "translationValue"
  | "contractValue"
  | "startDate"
  | "endDate"
  | "extensionStartDate"
  | "extensionEndDate"
  | "actualCompletionDate"
  | "actualWordCount"
  | "actualPageCount"
  | "completionRate"
  | "settlementValue";
export type ProofreadingContractSortColumn =
  | "contractNumber"
  | "component"
  | "contractValue"
  | "startDate"
  | "endDate"
  | "actualCompletionDate"
  | "pageCount"
  | "rateRatio";
type TcQuickFilter = "all" | "valid" | "completed" | "expired" | "expiring";
type ContractColumnVisibility = {
  contractNumber: boolean;
  translators: boolean;
  overviewValue: boolean;
  translationValue: boolean;
  contractValue: boolean;
  settlementValue: boolean;
  outstanding: boolean;
};
type PaymentT = any;

interface UseThuKyContractsTabParams {
  tcScoped: TranslationContract[];
  pcScoped: ProofreadingContract[];
  worksScoped: Work[];
  proofreadingContracts: ProofreadingContract[];
  componentsList: Component[];
  getComponentName: (id: string | null) => string;
  getWorkTitle: (id: string | null) => string;
  getTranslatorName: (id: string | null) => string;
  getProofreaderName: (id: string | null) => string;
  PAGE_SIZE: number;
  fetchFinanceSummary?: (
    contractId: string,
  ) => Promise<{ totalPaid: number; totalAdvance: number; outstanding: number }>;
  fetchFinanceSummaryPc?: (
    contractId: string,
  ) => Promise<{ totalPaid: number; totalAdvance: number; outstanding: number }>;
  fetchContractPayments?: (contractId: string) => Promise<PaymentT[]>;
  fetchPaymentsByPcId?: (contractId: string) => Promise<PaymentT[]>;
}

export function useThuKyContractsTab(params: UseThuKyContractsTabParams) {
  const {
    tcScoped,
    pcScoped,
    worksScoped,
    proofreadingContracts,
    componentsList,
    getComponentName,
    getWorkTitle,
    getTranslatorName,
    getProofreaderName,
    PAGE_SIZE,
    fetchFinanceSummary,
    fetchFinanceSummaryPc,
    fetchContractPayments,
    fetchPaymentsByPcId,
  } = params;

  const [tcViewMode, setTcViewMode] = useState<"table" | "card">("table");
  const [pcViewMode, setPcViewMode] = useState<"table" | "card">("table");
  const [tcPage, setTcPage] = useState(1);
  const [pcPage, setPcPage] = useState(1);
  const [tcQuickFilter, setTcQuickFilter] = useState<TcQuickFilter>("all");
  const [pcQuickFilter, setPcQuickFilter] = useState<TcQuickFilter>("all");
  const [tcSearch, setTcSearch] = useState("");
  const [tcTranslatorSearch, setTcTranslatorSearch] = useState("");
  const [tcComponentFilter, setTcComponentFilter] = useState<string>("all");
  const [tcStageFilter, setTcStageFilter] = useState<string>("all");
  const [tcSortColumns, setTcSortColumns] = useState<
    Array<{ column: TranslationContractSortColumn; dir: "asc" | "desc" }>
  >([]);
  const [pcSearch, setPcSearch] = useState("");
  const [pcProofreaderSearch, setPcProofreaderSearch] = useState("");
  const [pcComponentFilter, setPcComponentFilter] = useState<string>("all");
  const [pcStageFilter, setPcStageFilter] = useState<string>("all");
  const [pcSortColumns, setPcSortColumns] = useState<
    Array<{ column: ProofreadingContractSortColumn; dir: "asc" | "desc" }>
  >([]);
  const [tcColumnVis, setTcColumnVis] = useState<ContractColumnVisibility>({
    contractNumber: true,
    translators: true,
    overviewValue: true,
    translationValue: true,
    contractValue: true,
    settlementValue: true,
    outstanding: true,
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("tcColumnVis");
      if (raw) {
        const parsed = JSON.parse(raw);
        setTcColumnVis((s) => ({ ...s, ...parsed }));
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem("tcColumnVis", JSON.stringify(tcColumnVis));
    } catch {}
  }, [tcColumnVis]);

  const CHARS_PER_PAGE = 350;
  const charsToPages = (chars: number): number => {
    return Math.round(chars / CHARS_PER_PAGE);
  };
  const formatStageDisplay = (stage: string | null | undefined): string => {
    if (stage == null || stage === "") return "—";
    const num = String(stage).replace(/\D/g, "");
    return num ? "GĐ " + num : "GĐ " + stage;
  };
  const parseDateOnly = (
    value: string | Date | null | undefined,
  ): Date | null => {
    if (!value) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const s = String(value);
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const y = Number.parseInt(isoMatch[1], 10);
      const m = Number.parseInt(isoMatch[2], 10) - 1;
      const d = Number.parseInt(isoMatch[3], 10);
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    const parsed = new Date(s);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };
  const getTcDueDate = (c: TranslationContract): Date | null => {
    return parseDateOnly(c.extensionEndDate ?? c.endDate);
  };
  const getPcDueDate = (c: ProofreadingContract): Date | null => {
    return parseDateOnly(c.endDate);
  };
  const daysUntil = (from: Date, to: Date): number => {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
  };

  const sortTranslationContracts = (
    contracts: TranslationContract[],
    sortColumns: Array<{
      column: TranslationContractSortColumn;
      dir: "asc" | "desc";
    }>,
    getComponentNameFn: (id: string | null) => string,
  ): TranslationContract[] => {
    if (sortColumns.length === 0) return contracts.slice();
    const sorted = contracts.slice().sort((a, b) => {
      for (const { column: sortBy, dir: sortDir } of sortColumns) {
        const dir = sortDir === "asc" ? 1 : -1;
        let av: any, bv: any;
        if (sortBy === "component") {
          av = getComponentNameFn(a.componentId);
          bv = getComponentNameFn(b.componentId);
          const as = String(av ?? "");
          const bs = String(bv ?? "");
          const cmp = as.localeCompare(bs, undefined, { numeric: true });
          if (cmp !== 0) return cmp * dir;
          continue;
        } else if (
          sortBy === "startDate" ||
          sortBy === "endDate" ||
          sortBy === "extensionStartDate" ||
          sortBy === "extensionEndDate" ||
          sortBy === "actualCompletionDate"
        ) {
          av = a[sortBy]
            ? typeof a[sortBy] === "string"
              ? a[sortBy].slice(0, 10)
              : (a[sortBy] as Date).toISOString().slice(0, 10)
            : "";
          bv = b[sortBy]
            ? typeof b[sortBy] === "string"
              ? b[sortBy].slice(0, 10)
              : (b[sortBy] as Date).toISOString().slice(0, 10)
            : "";
          if (av === bv) continue;
          const cmp = av < bv ? -1 : 1;
          return cmp * dir;
          continue;
        } else if (
          sortBy === "unitPrice" ||
          sortBy === "overviewValue" ||
          sortBy === "translationValue" ||
          sortBy === "contractValue" ||
          sortBy === "actualWordCount" ||
          sortBy === "actualPageCount" ||
          sortBy === "completionRate" ||
          sortBy === "settlementValue"
        ) {
          av = a[sortBy] ?? null;
          bv = b[sortBy] ?? null;
          if (av === null && bv === null) continue;
          if (av === null) return 1 * dir;
          if (bv === null) return -1 * dir;
          const avNum = typeof av === "string" ? parseFloat(av) : Number(av);
          const bvNum = typeof bv === "string" ? parseFloat(bv) : Number(bv);
          const cmp = avNum - bvNum;
          if (cmp !== 0) return cmp * dir;
          continue;
        } else {
          av = a[sortBy as keyof TranslationContract] ?? "";
          bv = b[sortBy as keyof TranslationContract] ?? "";
          const as = String(av ?? "");
          const bs = String(bv ?? "");
          const cmp = as.localeCompare(bs, undefined, { numeric: true });
          if (cmp !== 0) return cmp * dir;
          continue;
        }
      }
      return 0;
    });
    return sorted;
  };

  const sortProofreadingContracts = (
    contracts: ProofreadingContract[],
    sortColumns: Array<{
      column: ProofreadingContractSortColumn;
      dir: "asc" | "desc";
    }>,
    getComponentNameFn: (id: string | null) => string,
  ): ProofreadingContract[] => {
    if (sortColumns.length === 0) return contracts.slice();
    const sorted = contracts.slice().sort((a, b) => {
      for (const { column: sortBy, dir: sortDir } of sortColumns) {
        const dir = sortDir === "asc" ? 1 : -1;
        let av: any, bv: any;
        if (sortBy === "component") {
          av = getComponentNameFn(a.componentId);
          bv = getComponentNameFn(b.componentId);
          const as = String(av ?? "");
          const bs = String(bv ?? "");
          const cmp = as.localeCompare(bs, undefined, { numeric: true });
          if (cmp !== 0) return cmp * dir;
          continue;
        } else if (
          sortBy === "startDate" ||
          sortBy === "endDate" ||
          sortBy === "actualCompletionDate"
        ) {
          av = a[sortBy]
            ? typeof a[sortBy] === "string"
              ? a[sortBy].slice(0, 10)
              : (a[sortBy] as Date).toISOString().slice(0, 10)
            : "";
          bv = b[sortBy]
            ? typeof b[sortBy] === "string"
              ? b[sortBy].slice(0, 10)
              : (b[sortBy] as Date).toISOString().slice(0, 10)
            : "";
          if (av === bv) continue;
          const cmp = av < bv ? -1 : 1;
          return cmp * dir;
          continue;
        } else if (
          sortBy === "contractValue" ||
          sortBy === "pageCount" ||
          sortBy === "rateRatio"
        ) {
          av = a[sortBy] ?? null;
          bv = b[sortBy] ?? null;
          if (av === null && bv === null) continue;
          if (av === null) return 1 * dir;
          if (bv === null) return -1 * dir;
          if (sortBy === "rateRatio") {
            av = typeof av === "string" ? parseFloat(av) : Number(av);
            bv = typeof bv === "string" ? parseFloat(bv) : Number(bv);
          }
          const cmp = Number(av) - Number(bv);
          if (cmp !== 0) return cmp * dir;
          continue;
        } else {
          av = a[sortBy as keyof ProofreadingContract] ?? "";
          bv = b[sortBy as keyof ProofreadingContract] ?? "";
          const as = String(av ?? "");
          const bs = String(bv ?? "");
          const cmp = as.localeCompare(bs, undefined, { numeric: true });
          if (cmp !== 0) return cmp * dir;
          continue;
        }
      }
      return 0;
    });
    return sorted;
  };

  useEffect(() => {
    setTcPage(1);
  }, [
    tcQuickFilter,
    tcComponentFilter,
    tcStageFilter,
    tcSearch,
    tcTranslatorSearch,
  ]);

  useEffect(() => {
    setPcPage(1);
  }, [pcQuickFilter, pcComponentFilter, pcStageFilter, pcSearch, pcProofreaderSearch]);

  const handleTcSort = (
    column: TranslationContractSortColumn,
    e?: React.MouseEvent,
  ) => {
    setTcSortColumns((prev) => {
      const existingIndex = prev.findIndex((s) => s.column === column);
      if (existingIndex >= 0) {
        if (prev[existingIndex].dir === "asc") {
          const newCols = [...prev];
          newCols[existingIndex] = { column, dir: "desc" };
          return newCols;
        } else {
          return prev.filter((s) => s.column !== column);
        }
      } else {
        return [...prev, { column, dir: "asc" }];
      }
    });
  };

  const handlePcSort = (
    column: ProofreadingContractSortColumn,
    e?: React.MouseEvent,
  ) => {
    setPcSortColumns((prev) => {
      const existingIndex = prev.findIndex((s) => s.column === column);
      if (existingIndex >= 0) {
        if (prev[existingIndex].dir === "asc") {
          const newCols = [...prev];
          newCols[existingIndex] = { column, dir: "desc" };
          return newCols;
        } else {
          return prev.filter((s) => s.column !== column);
        }
      } else {
        return [...prev, { column, dir: "asc" }];
      }
    });
  };

  const filteredTc = useMemo(() => {
    let list = tcScoped;
    if (tcComponentFilter && tcComponentFilter !== "all") {
      list = list.filter((c) => c.componentId === tcComponentFilter);
    }
    if (tcStageFilter && tcStageFilter !== "all") {
      const workIdsWithStage = new Set(
        worksScoped.filter((w) => w.stage === tcStageFilter).map((w) => w.id),
      );
      list = list.filter((c) => c.workId && workIdsWithStage.has(c.workId));
    }
    if (tcSearch.trim()) {
      const q = normalizeSearch(tcSearch.trim());
      list = list.filter(
        (c) =>
          (c.contractNumber && normalizeSearch(c.contractNumber).includes(q)) ||
          normalizeSearch(getComponentName(c.componentId)).includes(q) ||
          normalizeSearch(getWorkTitle(c.workId)).includes(q),
      );
    }
    if (tcTranslatorSearch.trim()) {
      const q = normalizeSearch(tcTranslatorSearch.trim());
      list = list.filter((c) => {
        const name = getTranslatorName(c.id);
        if (!name || name === "—") return false;
        return normalizeSearch(name).includes(q);
      });
    }
    return sortTranslationContracts(list, tcSortColumns, getComponentName);
  }, [
    tcScoped,
    tcSearch,
    tcTranslatorSearch,
    tcComponentFilter,
    tcStageFilter,
    tcSortColumns,
    worksScoped,
    componentsList,
    getTranslatorName,
  ]);

  const tcStats = useMemo(() => {
    const today = new Date();
    const total = filteredTc.length;
    const completed = filteredTc.filter((c) => !!c.actualCompletionDate).length;
    const valid = filteredTc.filter((c) => {
      if (c.actualCompletionDate) return false;
      const due = getTcDueDate(c);
      if (!due) return true;
      return due >= today;
    }).length;
    const expired = filteredTc.filter((c) => {
      if (c.actualCompletionDate) return false;
      const due = getTcDueDate(c);
      if (!due) return false;
      return due < today;
    }).length;
    const expiring = filteredTc.filter((c) => {
      if (c.actualCompletionDate) return false;
      const due = getTcDueDate(c);
      if (!due) return false;
      const d = daysUntil(today, due);
      return d >= 1 && d <= 90;
    }).length;
    return { total, valid, completed, expired, expiring };
  }, [filteredTc]);

  const applyTcQuickFilter = useMemo(() => {
    return (list: TranslationContract[], key: typeof tcQuickFilter) => {
      const today = new Date();
      if (key === "all") return list;
      if (key === "completed")
        return list.filter((c) => !!c.actualCompletionDate);
      if (key === "valid")
        return list.filter((c) => {
          if (c.actualCompletionDate) return false;
          const due = getTcDueDate(c);
          if (!due) return true;
          return due >= today;
        });
      if (key === "expired")
        return list.filter((c) => {
          if (c.actualCompletionDate) return false;
          const due = getTcDueDate(c);
          if (!due) return false;
          return due < today;
        });
      if (key === "expiring")
        return list.filter((c) => {
          if (c.actualCompletionDate) return false;
          const due = getTcDueDate(c);
          if (!due) return false;
          const d = daysUntil(today, due);
          return d >= 1 && d <= 90;
        });
      return list;
    };
  }, []);

  const tcDisplayList = useMemo(
    () => applyTcQuickFilter(filteredTc, tcQuickFilter),
    [filteredTc, tcQuickFilter, applyTcQuickFilter],
  );

  const filteredPc = useMemo(() => {
    let list = pcScoped;
    if (pcComponentFilter && pcComponentFilter !== "all") {
      list = list.filter((c) => c.componentId === pcComponentFilter);
    }
    if (pcStageFilter && pcStageFilter !== "all") {
      const workIdsWithStage = new Set(
        worksScoped.filter((w) => w.stage === pcStageFilter).map((w) => w.id),
      );
      list = list.filter((c) => c.workId && workIdsWithStage.has(c.workId));
    }
    if (pcProofreaderSearch.trim()) {
      const q = normalizeSearch(pcProofreaderSearch.trim());
      list = list.filter((c) =>
        normalizeSearch(getProofreaderName(c.id)).includes(q),
      );
    }
    if (pcSearch.trim()) {
      const q = normalizeSearch(pcSearch.trim());
      list = list.filter(
        (c) =>
          (c.contractNumber && normalizeSearch(c.contractNumber).includes(q)) ||
          normalizeSearch(getComponentName(c.componentId)).includes(q) ||
          normalizeSearch(getWorkTitle(c.workId)).includes(q),
      );
    }
    return sortProofreadingContracts(list, pcSortColumns, getComponentName);
  }, [
    pcScoped,
    pcSearch,
    pcProofreaderSearch,
    pcComponentFilter,
    pcStageFilter,
    pcSortColumns,
    worksScoped,
    componentsList,
  ]);

  const pcStats = useMemo(() => {
    const today = new Date();
    const total = filteredPc.length;
    const completed = filteredPc.filter((c) => !!c.actualCompletionDate).length;
    const valid = filteredPc.filter((c) => {
      if (c.actualCompletionDate) return false;
      const due = getPcDueDate(c);
      if (!due) return true;
      return due >= today;
    }).length;
    const expired = filteredPc.filter((c) => {
      if (c.actualCompletionDate) return false;
      const due = getPcDueDate(c);
      if (!due) return false;
      return due < today;
    }).length;
    const expiring = filteredPc.filter((c) => {
      if (c.actualCompletionDate) return false;
      const due = getPcDueDate(c);
      if (!due) return false;
      const d = daysUntil(today, due);
      return d >= 1 && d <= 90;
    }).length;
    return { total, valid, completed, expired, expiring };
  }, [filteredPc]);

  const applyPcQuickFilter = useMemo(() => {
    return (list: ProofreadingContract[], key: typeof pcQuickFilter) => {
      const today = new Date();
      if (key === "all") return list;
      if (key === "completed")
        return list.filter((c) => !!c.actualCompletionDate);
      if (key === "valid")
        return list.filter((c) => {
          if (c.actualCompletionDate) return false;
          const due = getPcDueDate(c);
          if (!due) return true;
          return due >= today;
        });
      if (key === "expired")
        return list.filter((c) => {
          if (c.actualCompletionDate) return false;
          const due = getPcDueDate(c);
          if (!due) return false;
          return due < today;
        });
      if (key === "expiring")
        return list.filter((c) => {
          if (c.actualCompletionDate) return false;
          const due = getPcDueDate(c);
          if (!due) return false;
          const d = daysUntil(today, due);
          return d >= 1 && d <= 90;
        });
      return list;
    };
  }, []);

  const pcDisplayList = useMemo(
    () => applyPcQuickFilter(filteredPc, pcQuickFilter),
    [filteredPc, pcQuickFilter, applyPcQuickFilter],
  );

  const proofreadingCompletionByTcId = useMemo(() => {
    const map = new Map<string, string>();
    proofreadingContracts.forEach((c) => {
      if (!c.actualCompletionDate) return;
      const date =
        typeof c.actualCompletionDate === "string"
          ? c.actualCompletionDate.slice(0, 10)
          : new Date(c.actualCompletionDate as any).toISOString().slice(0, 10);
      if (c.translationContractId) {
        const prev = map.get(c.translationContractId);
        if (!prev || date > prev) map.set(c.translationContractId, date);
      }
    });
    return map;
  }, [proofreadingContracts]);

  const paginatedTc = useMemo(() => {
    const start = (tcPage - 1) * PAGE_SIZE;
    return tcDisplayList.slice(start, start + PAGE_SIZE);
  }, [tcDisplayList, tcPage]);
  const totalTcPages = Math.max(1, Math.ceil(tcDisplayList.length / PAGE_SIZE));

  const financeQueries = useQueries({
    queries: fetchFinanceSummary
      ? paginatedTc.map((c) => ({
          queryKey: ["finance-summary", c.id],
          queryFn: () => fetchFinanceSummary(c.id),
          enabled: !!c.id,
          staleTime: 60_000,
        }))
      : [],
  });
  const outstandingById = useMemo(() => {
    if (!fetchFinanceSummary) return new Map<string, number>();
    const map = new Map<string, number>();
    financeQueries.forEach((q, idx) => {
      const id = paginatedTc[idx]?.id;
      if (id && q.data) map.set(id, Math.max(q.data.outstanding, 0));
    });
    return map;
  }, [financeQueries, paginatedTc]);

  const paymentsQueries = useQueries({
    queries: fetchContractPayments
      ? paginatedTc.map((c) => ({
          queryKey: ["payments", c.id],
          queryFn: () => fetchContractPayments(c.id),
          enabled: !!c.id,
          staleTime: 60_000,
        }))
      : [],
  });
  const paymentInfoById = useMemo(() => {
    if (!fetchContractPayments)
      return new Map<
        string,
        { advance1?: Payment; advance2?: Payment; settlement?: Payment }
      >();
    const map = new Map<
      string,
      { advance1?: Payment; advance2?: Payment; settlement?: Payment }
    >();
    paymentsQueries.forEach((q, idx) => {
      const id = paginatedTc[idx]?.id;
      const list = (q.data ?? []).slice();
      const advances = list
        .filter(
          (p) => String(p.paymentType || "").toLowerCase() === "advance",
        )
        .sort((a, b) => {
          const ad = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
          const bd = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
          return ad - bd;
        });
      const settlements = list
        .filter(
          (p) => String(p.paymentType || "").toLowerCase() === "settlement",
        )
        .sort((a, b) => {
          const ad = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
          const bd = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
          return bd - ad;
        });
      if (id) {
        map.set(id, {
          advance1: advances[0],
          advance2: advances[1],
          settlement: settlements[0],
        });
      }
    });
    return map;
  }, [paymentsQueries, paginatedTc]);

  const paginatedPc = useMemo(() => {
    const start = (pcPage - 1) * PAGE_SIZE;
    return pcDisplayList.slice(start, start + PAGE_SIZE);
  }, [pcDisplayList, pcPage]);
  const totalPcPages = Math.max(1, Math.ceil(pcDisplayList.length / PAGE_SIZE));

  const pcFinanceQueries = useQueries({
    queries: fetchFinanceSummaryPc
      ? paginatedPc.map((c) => ({
          queryKey: ["finance-summary", c.id],
          queryFn: () => fetchFinanceSummaryPc(c.id),
          enabled: !!c.id,
          staleTime: 60_000,
        }))
      : [],
  });
  const pcOutstandingById = useMemo(() => {
    if (!fetchFinanceSummaryPc) return new Map<string, number>();
    const map = new Map<string, number>();
    pcFinanceQueries.forEach((q, idx) => {
      const id = paginatedPc[idx]?.id;
      if (id && q.data) map.set(id, Math.max(q.data.outstanding, 0));
    });
    return map;
  }, [pcFinanceQueries, paginatedPc]);

  const pcPaymentsQueries = useQueries({
    queries: fetchPaymentsByPcId
      ? paginatedPc.map((c) => ({
          queryKey: ["payments", c.id],
          queryFn: () => fetchPaymentsByPcId(c.id),
          enabled: !!c.id,
          staleTime: 60_000,
        }))
      : [],
  });
  const pcPaymentInfoById = useMemo(() => {
    if (!fetchPaymentsByPcId)
      return new Map<
        string,
        { advance1?: Payment; advance2?: Payment; settlement?: Payment }
      >();
    const map = new Map<
      string,
      { advance1?: Payment; advance2?: Payment; settlement?: Payment }
    >();
    pcPaymentsQueries.forEach((q, idx) => {
      const id = paginatedPc[idx]?.id;
      const list = (q.data ?? []).slice();
      const advances = list
        .filter(
          (p) => String(p.paymentType || "").toLowerCase() === "advance",
        )
        .sort((a, b) => {
          const ad = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
          const bd = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
          return ad - bd;
        });
      const settlements = list
        .filter(
          (p) => String(p.paymentType || "").toLowerCase() === "settlement",
        )
        .sort((a, b) => {
          const ad = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
          const bd = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
          return bd - ad;
        });
      if (id) {
        map.set(id, {
          advance1: advances[0],
          advance2: advances[1],
          settlement: settlements[0],
        });
      }
    });
    return map;
  }, [pcPaymentsQueries, paginatedPc]);

  return {
    tcViewMode,
    setTcViewMode,
    pcViewMode,
    setPcViewMode,
    tcPage,
    setTcPage,
    pcPage,
    setPcPage,
    tcQuickFilter,
    setTcQuickFilter,
    pcQuickFilter,
    setPcQuickFilter,
    tcSearch,
    setTcSearch,
    tcTranslatorSearch,
    setTcTranslatorSearch,
    tcComponentFilter,
    setTcComponentFilter,
    tcStageFilter,
    setTcStageFilter,
    tcSortColumns,
    setTcSortColumns,
    pcSearch,
    setPcSearch,
    pcProofreaderSearch,
    setPcProofreaderSearch,
    pcComponentFilter,
    setPcComponentFilter,
    pcStageFilter,
    setPcStageFilter,
    pcSortColumns,
    setPcSortColumns,
    tcColumnVis,
    setTcColumnVis,
    filteredTc,
    tcStats,
    tcDisplayList,
    proofreadingCompletionByTcId,
    paginatedTc,
    totalTcPages,
    outstandingById,
    paymentInfoById,
    filteredPc,
    pcStats,
    pcDisplayList,
    paginatedPc,
    totalPcPages,
    pcOutstandingById,
    pcPaymentInfoById,
    handleTcSort,
    handlePcSort,
  };
}
