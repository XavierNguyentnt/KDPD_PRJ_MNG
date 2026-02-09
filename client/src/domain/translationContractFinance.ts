// src/domain/translationContractFinance.ts

export interface AdvanceConfig {
  includeOverview: boolean;
  phase1Percent?: number | null;
  phase2Percent?: number | null;
}

export interface FinanceInput {
  translationValue?: number | null;
  overviewValue?: number | null;
  contractValue?: number | null;
  settlementValue?: number | null;
  actualPageCount?: number | null;
  estimatePageCount?: number | null;
  advance: AdvanceConfig;
  isFinalized: boolean;
  payments?: Array<{ amount: number; paymentType?: string | null }>;
}

/** Base tính tạm ứng */
export function calcAdvanceBase(
  translationValue = 0,
  overviewValue = 0,
  includeOverview = false
) {
  return includeOverview ? translationValue + overviewValue : translationValue;
}

/** Tính tiền tạm ứng theo % */
export function calcAdvanceAmount(base: number, percent?: number | null) {
  if (!percent || isNaN(percent)) return 0;
  return (base * percent) / 100;
}

/** Tổng tạm ứng */
export function calcTotalAdvance(base: number, advance: AdvanceConfig) {
  return (
    calcAdvanceAmount(base, advance.phase1Percent) +
    calcAdvanceAmount(base, advance.phase2Percent)
  );
}

/** Chênh lệch số trang */
export function calcPageDiff(actual?: number | null, estimate?: number | null) {
  if (actual == null || estimate == null) return null;
  return actual - estimate;
}

/** Chênh lệch giá trị */
export function calcValueDiff(
  settlement?: number | null,
  contract?: number | null
) {
  if (settlement == null || contract == null) return null;
  return settlement - contract;
}

/**
 * Công nợ
 * - Đã tất toán: 0
 * - Có quyết toán: quyết toán - đã tạm ứng
 * - Chưa quyết toán: giá trị hợp đồng - đã tạm ứng
 */
export function calcOutstandingAmount(
  input: FinanceInput,
  totalAdvance: number
) {
  if (input.isFinalized) return 0;

  if (input.settlementValue != null && !isNaN(input.settlementValue)) {
    return input.settlementValue - totalAdvance;
  }

  if (input.contractValue != null && !isNaN(input.contractValue)) {
    return input.contractValue - totalAdvance;
  }

  return 0;
}

/** Tổng chi tiền từ payments (mọi loại) */
export function sumPayments(payments?: Array<{ amount: number; paymentType?: string | null }>) {
  if (!payments || payments.length === 0) return 0;
  return payments.reduce((s, p) => s + (isNaN(p.amount) ? 0 : Number(p.amount)), 0);
}

/** Tổng tạm ứng từ payments (lọc payment_type === 'advance') */
export function sumAdvancePayments(payments?: Array<{ amount: number; paymentType?: string | null }>) {
  if (!payments || payments.length === 0) return 0;
  return payments
    .filter((p) => (p.paymentType || "").toLowerCase() === "advance")
    .reduce((s, p) => s + (isNaN(p.amount) ? 0 : Number(p.amount)), 0);
}

/** Công nợ theo chuẩn kế toán: (settlement|contract) - SUM(payments) */
export function calcOutstandingFromPayments(input: FinanceInput) {
  const totalPaid = sumPayments(input.payments);
  const base =
    input.settlementValue != null && !isNaN(input.settlementValue)
      ? Number(input.settlementValue)
      : input.contractValue != null && !isNaN(input.contractValue)
      ? Number(input.contractValue)
      : 0;
  return base - totalPaid;
}
