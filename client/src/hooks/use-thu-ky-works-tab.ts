import { useCallback, useMemo, useState, useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import type {
  Work,
  Component,
  TranslationContract,
  ProofreadingContract,
  Payment,
} from "@shared/schema";
import { normalizeSearch, formatDateDDMMYYYY } from "@/lib/utils";

export type WorkSortColumn =
  | "component"
  | "titleVi"
  | "titleHannom"
  | "stage"
  | "documentCode"
  | "baseWordCount"
  | "basePageCount"
  | "estimateFactor"
  | "estimateWordCount"
  | "estimatePageCount";

export type WorksProgressFilter =
  | "all"
  | "signed_contract"
  | "progress_check"
  | "expert_review"
  | "project_acceptance"
  | "settlement"
  | "proofreading_completed"
  | "editing_completed"
  | "design_completed";

type ContractColumnVisibility = {
  contractNumber: boolean;
  translators: boolean;
  overviewValue: boolean;
  translationValue: boolean;
  contractValue: boolean;
  settlementValue: boolean;
  outstanding: boolean;
};

type TaskWAD = any;

export interface UseThuKyWorksTabParams {
  worksScoped: Work[];
  componentsList: Component[];
  tcScoped: TranslationContract[];
  pcScoped: ProofreadingContract[];
  tasks: TaskWAD[];
  proofreadingContracts: ProofreadingContract[];
  getComponentName: (id: string | null) => string;
  getTranslatorName: (id: string | null) => string;
  tcColumnVis: ContractColumnVisibility;
  PAGE_SIZE: number;
  formatStageDisplay?: (stage: string | null | undefined) => string;
  fetchFinanceSummary?: (
    contractId: string,
  ) => Promise<{ totalPaid: number; totalAdvance: number; outstanding: number }>;
}

export function useThuKyWorksTab(params: UseThuKyWorksTabParams) {
  const {
    worksScoped,
    componentsList,
    tcScoped,
    pcScoped,
    tasks,
    proofreadingContracts,
    getComponentName,
    getTranslatorName,
    tcColumnVis,
    PAGE_SIZE,
    formatStageDisplay: formatStageDisplayParam,
    fetchFinanceSummary: fetchFinanceSummaryParam,
  } = params;

  const formatStageDisplay = useCallback(
    (stage: string | null | undefined): string => {
      if (formatStageDisplayParam) return formatStageDisplayParam(stage);
      if (stage == null || stage === "") return "—";
      const num = String(stage).replace(/\D/g, "");
      return num ? "GĐ " + num : "GĐ " + stage;
    },
    [formatStageDisplayParam],
  );

  const CHS_PER_PAGE = 350;
  const charsToPages = (chars: number): number =>
    Math.round(chars / CHS_PER_PAGE);

  const parseDateOnly = (
    value: string | Date | null | undefined,
  ): Date | null => {
    if (!value) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
      );
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
    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
    );
  };

  const daysUntil = (from: Date, to: Date): number => {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const start = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate(),
    );
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
  };

  const getTcDueDate = (c: TranslationContract): Date | null =>
    parseDateOnly(c.extensionEndDate ?? c.endDate);

  const getPcDueDate = (c: ProofreadingContract): Date | null =>
    parseDateOnly(c.endDate);

  const sortWorks = (
    works: Work[],
    sortColumns: Array<{ column: WorkSortColumn; dir: "asc" | "desc" }>,
    getComponentNameFn: (id: string | null) => string,
  ): Work[] => {
    if (sortColumns.length === 0) return works.slice();

    const sorted = works.slice().sort((a, b) => {
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
        } else if (sortBy === "stage") {
          av = a.stage ?? "";
          bv = b.stage ?? "";
          const as = String(av ?? "");
          const bs = String(bv ?? "");
          const cmp = as.localeCompare(bs, undefined, { numeric: true });
          if (cmp !== 0) return cmp * dir;
          continue;
        } else if (
          sortBy === "baseWordCount" ||
          sortBy === "basePageCount" ||
          sortBy === "estimateWordCount" ||
          sortBy === "estimatePageCount"
        ) {
          av = a[sortBy] ?? null;
          bv = b[sortBy] ?? null;
          if (av === null && bv === null) continue;
          if (av === null) return 1 * dir;
          if (bv === null) return -1 * dir;
          const cmp = Number(av) - Number(bv);
          if (cmp !== 0) return cmp * dir;
          continue;
        } else if (sortBy === "estimateFactor") {
          av = a.estimateFactor ?? null;
          bv = b.estimateFactor ?? null;
          if (av === null && bv === null) continue;
          if (av === null) return 1 * dir;
          if (bv === null) return -1 * dir;
          const cmp = Number(av) - Number(bv);
          if (cmp !== 0) return cmp * dir;
          continue;
        } else {
          av = a[sortBy as keyof Work] ?? "";
          bv = b[sortBy as keyof Work] ?? "";
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

  const [worksPage, setWorksPage] = useState(1);
  const [worksViewMode, setWorksViewMode] = useState<"table" | "card">("table");
  const [worksSearch, setWorksSearch] = useState("");
  const [worksComponentFilter, setWorksComponentFilter] =
    useState<string>("all");
  const [worksStageFilter, setWorksStageFilter] = useState<string>("all");
  const [worksProgressFilter, setWorksProgressFilter] =
    useState<WorksProgressFilter>("all");
  const [worksSortColumns, setWorksSortColumns] = useState<
    Array<{ column: WorkSortColumn; dir: "asc" | "desc" }>
  >([]);
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([]);
  const [bulkDeleteWorksOpen, setBulkDeleteWorksOpen] = useState(false);

  const worksStages = useMemo(
    () =>
      Array.from(new Set(worksScoped.map((w) => w.stage).filter(Boolean))).sort() as string[],
    [worksScoped],
  );

  useEffect(() => {
    setWorksPage(1);
  }, [
    worksComponentFilter,
    worksStageFilter,
    worksProgressFilter,
    worksSearch,
  ]);

  const workById = useMemo(
    () => new Map(worksScoped.map((w) => [w.id, w])),
    [worksScoped],
  );
  const workTitleById = useMemo(
    () =>
      new Map(
        worksScoped.map((w) => [
          w.id,
          w.titleVi ?? w.documentCode ?? w.titleHannom ?? w.id.slice(0, 8),
        ]),
      ),
    [worksScoped],
  );

  const proofreadingCompletionByWorkId = useMemo(() => {
    const map = new Map<string, string>();
    proofreadingContracts.forEach((c) => {
      if (!c.actualCompletionDate || !c.workId) return;
      const date =
        typeof c.actualCompletionDate === "string"
          ? c.actualCompletionDate.slice(0, 10)
          : new Date(c.actualCompletionDate as any).toISOString().slice(0, 10);
      const prev = map.get(c.workId);
      if (!prev || date > prev) map.set(c.workId, date);
    });
    return map;
  }, [proofreadingContracts]);

  const editingCompletionByWorkId = useMemo(() => {
    const map = new Map<string, string>();
    tasks
      .filter((t: TaskWAD) => t.group === "Biên tập" && t.relatedWorkId)
      .forEach((t: TaskWAD) => {
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
        if (!roundType.toLowerCase().includes("bông chuyển in")) return;
        const v = t.actualCompletedAt;
        if (!v) return;
        const date = typeof v === "string" ? new Date(v) : v;
        if (!date || Number.isNaN(date.getTime())) return;
        const dateStr = date.toISOString().slice(0, 10);
        const key = t.relatedWorkId as string;
        const prev = map.get(key);
        if (!prev || dateStr > prev) map.set(key, dateStr);
      });
    return map;
  }, [tasks]);

  const tcByWorkId = useMemo(() => {
    const map = new Map<string, TranslationContract[]>();
    tcScoped.forEach((c) => {
      if (!c.workId) return;
      const list = map.get(c.workId) ?? [];
      list.push(c);
      map.set(c.workId, list);
    });
    return map;
  }, [tcScoped]);

  const pcByWorkId = useMemo(() => {
    const map = new Map<string, ProofreadingContract[]>();
    pcScoped.forEach((c) => {
      if (!c.workId) return;
      const list = map.get(c.workId) ?? [];
      list.push(c);
      map.set(c.workId, list);
    });
    return map;
  }, [pcScoped]);

  const bienTapTasksByWorkId = useMemo(() => {
    const map = new Map<string, TaskWAD[]>();
    (tasks || [])
      .filter((t: TaskWAD) => t.group === "Biên tập" && t.relatedWorkId)
      .forEach((t: TaskWAD) => {
        const key = t.relatedWorkId as string;
        const list = map.get(key) ?? [];
        list.push(t);
        map.set(key, list);
      });
    return map;
  }, [tasks]);

  const thietKeTasksByWorkId = useMemo(() => {
    const map = new Map<string, TaskWAD[]>();
    (tasks || [])
      .filter((t: TaskWAD) => t.group === "Thiết kế" && t.relatedWorkId)
      .forEach((t: TaskWAD) => {
        const key = t.relatedWorkId as string;
        const list = map.get(key) ?? [];
        list.push(t);
        map.set(key, list);
      });
    return map;
  }, [tasks]);

  const filteredWorks = useMemo(() => {
    let list = worksScoped;

    if (worksComponentFilter && worksComponentFilter !== "all") {
      list = list.filter((w) => w.componentId === worksComponentFilter);
    }

    if (worksStageFilter && worksStageFilter !== "all") {
      list = list.filter((w) => w.stage === worksStageFilter);
    }

    if (worksProgressFilter && worksProgressFilter !== "all") {
      list = list.filter((w) => {
        const tcList = tcByWorkId.get(w.id) ?? [];
        const pcList = pcByWorkId.get(w.id) ?? [];
        if (worksProgressFilter === "signed_contract") return tcList.length > 0;
        if (worksProgressFilter === "progress_check")
          return tcList.some((c) => !!c.progressCheckDate);
        if (worksProgressFilter === "expert_review")
          return tcList.some((c) => !!c.expertReviewDate);
        if (worksProgressFilter === "project_acceptance")
          return tcList.some((c) => !!c.projectAcceptanceDate);
        if (worksProgressFilter === "settlement")
          return tcList.some((c) => c.settlementValue != null);
        if (worksProgressFilter === "proofreading_completed")
          return (
            pcList.length > 0 && pcList.every((p) => !!p.actualCompletionDate)
          );
        if (worksProgressFilter === "editing_completed")
          return !!editingCompletionByWorkId.get(w.id);
        if (worksProgressFilter === "design_completed") {
          const tkList = thietKeTasksByWorkId.get(w.id) ?? [];
          return (
            tkList.length > 0 && tkList.every((t) => t.status === "Completed")
          );
        }
        return true;
      });
    }

    if (worksSearch.trim()) {
      const q = normalizeSearch(worksSearch.trim());
      list = list.filter(
        (w) =>
          (w.titleVi && normalizeSearch(w.titleVi).includes(q)) ||
          (w.stage &&
            (normalizeSearch(formatStageDisplay(w.stage)).includes(q) ||
              normalizeSearch(w.stage).includes(q))) ||
          (w.documentCode && normalizeSearch(w.documentCode).includes(q)) ||
          normalizeSearch(getComponentName(w.componentId)).includes(q),
      );
    }

    return sortWorks(list, worksSortColumns, getComponentName);
  }, [
    worksScoped,
    worksSearch,
    worksComponentFilter,
    worksStageFilter,
    worksProgressFilter,
    worksSortColumns,
    componentsList,
    tcByWorkId,
    pcByWorkId,
    editingCompletionByWorkId,
    thietKeTasksByWorkId,
    formatStageDisplay,
    getComponentName,
  ]);

  const handleWorksSort = (column: WorkSortColumn, e?: React.MouseEvent) => {
    setWorksSortColumns((prev) => {
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

  const paginatedWorks = useMemo(() => {
    const start = (worksPage - 1) * PAGE_SIZE;
    return filteredWorks.slice(start, start + PAGE_SIZE);
  }, [filteredWorks, worksPage, PAGE_SIZE]);
  const totalWorksPages = Math.max(
    1,
    Math.ceil(filteredWorks.length / PAGE_SIZE),
  );
  const paginatedWorkIds = useMemo(
    () => new Set(paginatedWorks.map((w) => w.id)),
    [paginatedWorks],
  );
  const selectedWorkSet = useMemo(
    () => new Set(selectedWorkIds),
    [selectedWorkIds],
  );
  const allSelectedOnPage =
    paginatedWorks.length > 0 &&
    paginatedWorks.every((w) => selectedWorkSet.has(w.id));
  const someSelectedOnPage =
    paginatedWorks.some((w) => selectedWorkSet.has(w.id)) && !allSelectedOnPage;

  const workTcIdsForOutstanding = useMemo(() => {
    if (!tcColumnVis.outstanding) return [];
    const ids = new Set<string>();
    paginatedWorks.forEach((w) => {
      const list = tcByWorkId.get(w.id) ?? [];
      list.forEach((c) => {
        if (c?.id) ids.add(c.id);
      });
    });
    return Array.from(ids);
  }, [paginatedWorks, tcByWorkId, tcColumnVis.outstanding]);

  const worksFinanceQueries = useQueries({
    queries: fetchFinanceSummaryParam
      ? workTcIdsForOutstanding.map((id) => ({
          queryKey: ["finance-summary", id],
          queryFn: () => fetchFinanceSummaryParam(id),
          enabled: !!id && tcColumnVis.outstanding,
          staleTime: 60_000,
        }))
      : [],
  });
  const outstandingByTcIdForWorks = useMemo(() => {
    if (!fetchFinanceSummaryParam) return new Map<string, number>();
    const map = new Map<string, number>();
    worksFinanceQueries.forEach((q, idx) => {
      const id = workTcIdsForOutstanding[idx];
      if (id && q.data) map.set(id, Math.max(q.data.outstanding, 0));
    });
    return map;
  }, [worksFinanceQueries, workTcIdsForOutstanding, fetchFinanceSummaryParam]);

  const getWorkContractNumbers = useMemo(() => {
    return (workId: string): string => {
      const tcList = tcByWorkId.get(workId) ?? [];
      const set = new Set<string>();
      tcList.forEach((c) => {
        const v = (c.contractNumber ?? "").trim();
        if (v) set.add(v);
      });
      return set.size ? Array.from(set).join(", ") : "—";
    };
  }, [tcByWorkId]);

  const getWorkTranslators = useMemo(() => {
    return (workId: string): string => {
      const tcList = tcByWorkId.get(workId) ?? [];
      const set = new Set<string>();
      tcList.forEach((c) => {
        const raw = (getTranslatorName(c.id) ?? "").trim();
        if (!raw || raw === "—") return;
        raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((name) => set.add(name));
      });
      return set.size ? Array.from(set).join(", ") : "—";
    };
  }, [tcByWorkId, getTranslatorName]);

  const sumTcMoneyForWork = useMemo(() => {
    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "string" ? parseFloat(v) : Number(v);
      return Number.isNaN(n) ? null : n;
    };
    return (
      workId: string,
      key:
        | "overviewValue"
        | "translationValue"
        | "contractValue"
        | "settlementValue",
    ): number | null => {
      const tcList = tcByWorkId.get(workId) ?? [];
      let sum = 0;
      let has = false;
      tcList.forEach((c) => {
        const v = toNum((c as any)[key]);
        if (v == null) return;
        sum += v;
        has = true;
      });
      return has ? sum : null;
    };
  }, [tcByWorkId]);

  const getOutstandingForWork = useMemo(() => {
    return (workId: string): number | null => {
      if (!tcColumnVis.outstanding) return null;
      const tcList = tcByWorkId.get(workId) ?? [];
      let sum = 0;
      let has = false;
      tcList.forEach((c) => {
        const v = outstandingByTcIdForWorks.get(c.id);
        if (typeof v !== "number") return;
        sum += v;
        has = true;
      });
      return has ? sum : null;
    };
  }, [tcByWorkId, outstandingByTcIdForWorks, tcColumnVis.outstanding]);

  const worksTableColSpan = useMemo(() => {
    const extra =
      (tcColumnVis.contractNumber ? 1 : 0) +
      (tcColumnVis.translators ? 1 : 0) +
      (tcColumnVis.overviewValue ? 1 : 0) +
      (tcColumnVis.translationValue ? 1 : 0) +
      (tcColumnVis.contractValue ? 1 : 0) +
      (tcColumnVis.settlementValue ? 1 : 0) +
      (tcColumnVis.outstanding ? 1 : 0);
    return 15 + extra;
  }, [tcColumnVis]);

  const workPipelineCtx = useMemo(() => {
    return {
      tcByWorkId,
      pcByWorkId,
      editingCompletionByWorkId,
      thietKeTasksByWorkId,
    };
  }, [
    tcByWorkId,
    pcByWorkId,
    editingCompletionByWorkId,
    thietKeTasksByWorkId,
  ]);

  return {
    state: {
      worksPage,
      setWorksPage,
      worksViewMode,
      setWorksViewMode,
      worksSearch,
      setWorksSearch,
      worksComponentFilter,
      setWorksComponentFilter,
      worksStageFilter,
      setWorksStageFilter,
      worksProgressFilter,
      setWorksProgressFilter,
      worksSortColumns,
      setWorksSortColumns,
      selectedWorkIds,
      setSelectedWorkIds,
      bulkDeleteWorksOpen,
      setBulkDeleteWorksOpen,
    },
    derived: {
      worksStages,
      workById,
      workTitleById,
      proofreadingCompletionByWorkId,
      editingCompletionByWorkId,
      tcByWorkId,
      pcByWorkId,
      bienTapTasksByWorkId,
      thietKeTasksByWorkId,
      filteredWorks,
      paginatedWorks,
      totalWorksPages,
      paginatedWorkIds,
      selectedWorkSet,
      allSelectedOnPage,
      someSelectedOnPage,
      workTcIdsForOutstanding,
      outstandingByTcIdForWorks,
      getWorkContractNumbers,
      getWorkTranslators,
      sumTcMoneyForWork,
      getOutstandingForWork,
      worksTableColSpan,
      workPipelineCtx,
    },
    handlers: {
      handleWorksSort,
    },
  };
}
