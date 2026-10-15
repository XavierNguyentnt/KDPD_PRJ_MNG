import { randomInt } from "crypto";
import type { User } from "@shared/schema";

/** Feature flag: Work/Contract taxonomy (theo Docs refactor – tắt được khi rollback). */
export const FEATURE_WORK_ENABLED = process.env.FEATURE_WORK_ENABLED === "true";

/** Trả về user không chứa password_hash để gửi cho client. */
export function sanitizeUser(
  user: User,
): Omit<User, "passwordHash"> & { passwordHash?: never } {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

export function generateStrongPassword(length = 8): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*()-_=+[]{}<>?,.";
  const all = upper + lower + digits + special;

  const pick = (chars: string) => chars[randomInt(chars.length)]!;
  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const t = chars[i];
    chars[i] = chars[j];
    chars[j] = t;
  }
  return chars.join("");
}

/** Validate task_type + related_contract: nếu gắn hợp đồng thì bắt buộc work và task_type không phải GENERAL. */
export function validateTaskContractLink(payload: {
  taskType?: string | null;
  relatedWorkId?: string | null;
  relatedContractId?: string | null;
}): void {
  if (!FEATURE_WORK_ENABLED) return;
  const { relatedContractId, relatedWorkId, taskType } = payload;
  if (!relatedContractId) return;
  const type = (taskType ?? "GENERAL").trim();
  if (type === "GENERAL" || type === "Admin") {
    throw new Error(
      "Task GENERAL không được gắn hợp đồng (related_contract_id). Chọn task_type TRANSLATION hoặc PROOFREADING.",
    );
  }
  if (!relatedWorkId) {
    throw new Error(
      "Khi gắn hợp đồng (related_contract_id) bắt buộc phải có related_work_id.",
    );
  }
}

export function parseDateOnly(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  const s = String(input);
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
}

export function validateContractDates(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  actualCompletionDate: string | Date | null | undefined,
): string | null {
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
}

export function hasOwnField(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

export function validateAssignmentDates(
  assignments: Array<{
    receivedAt?: string;
    dueDate?: string;
    completedAt?: string;
  }>,
): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const a of assignments) {
    const receivedAt = parseDateOnly(a.receivedAt);
    const dueDate = parseDateOnly(a.dueDate);
    const completedAt = parseDateOnly(a.completedAt);
    if (receivedAt && dueDate && dueDate.getTime() < receivedAt.getTime()) {
      return "Ngày hoàn thành dự kiến không được nhỏ hơn ngày nhận công việc.";
    }
    if (
      receivedAt &&
      completedAt &&
      completedAt.getTime() < receivedAt.getTime()
    ) {
      return "Ngày hoàn thành thực tế không được nhỏ hơn ngày nhận công việc.";
    }
    if (completedAt && completedAt.getTime() > today.getTime()) {
      return "Ngày hoàn thành thực tế không được lớn hơn ngày hiện tại.";
    }
  }
  return null;
}
