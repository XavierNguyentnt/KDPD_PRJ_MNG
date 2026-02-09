import { useMemo } from "react";
import {
  // Do not import calcAdvanceBase here to avoid conflict with local declaration
  calcAdvanceAmount,
  calcTotalAdvance,
  calcOutstandingAmount,
  calcPageDiff,
  calcValueDiff,
  FinanceInput,
} from "../domain/translationContractFinance"; /** Base tính tạm ứng */
export function calcAdvanceBase(
  translationValue?: number | null,
  overviewValue?: number | null,
  includeOverview = false
) {
  const finalTranslationValue = translationValue || 0;
  const finalOverviewValue = overviewValue || 0;

  return includeOverview
    ? finalTranslationValue + finalOverviewValue
    : finalTranslationValue;
}

export function useTranslationContractFinance(input: FinanceInput) {
  const advanceBase = useMemo(
    () =>
      calcAdvanceBase(
        input.translationValue,
        input.overviewValue,
        input.advance.includeOverview
      ),
    [input.translationValue, input.overviewValue, input.advance.includeOverview]
  );

  const advancePhase1Amount = useMemo(
    () => calcAdvanceAmount(advanceBase, input.advance.phase1Percent),
    [advanceBase, input.advance.phase1Percent]
  );

  const advancePhase2Amount = useMemo(
    () => calcAdvanceAmount(advanceBase, input.advance.phase2Percent),
    [advanceBase, input.advance.phase2Percent]
  );

  const totalAdvance = useMemo(
    () => calcTotalAdvance(advanceBase, input.advance),
    [advanceBase, input.advance]
  );

  const outstandingAmount = useMemo(
    () => calcOutstandingAmount(input, totalAdvance),
    [input, totalAdvance]
  );

  const pageDiff = useMemo(
    () => calcPageDiff(input.actualPageCount, input.estimatePageCount),
    [input.actualPageCount, input.estimatePageCount]
  );

  const valueDiff = useMemo(
    () => calcValueDiff(input.settlementValue, input.contractValue),
    [input.settlementValue, input.contractValue]
  );

  return {
    advanceBase,
    advancePhase1Amount,
    advancePhase2Amount,
    totalAdvance,
    outstandingAmount,
    pageDiff,
    valueDiff,
  };
}
