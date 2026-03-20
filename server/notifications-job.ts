import { db } from "./db";
import * as dbStorage from "./db-storage";
import {
  buildNotificationContent,
  DUE_SOON_DAYS,
  formatDateOnly,
} from "./notifications";
import { sendNotificationEmail } from "./email";
import { sendWebPushToUser } from "./push";

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const NOTIFICATIONS_JOB_INTERVAL_MS = Number.parseInt(
  process.env.NOTIFICATIONS_JOB_INTERVAL_MS || String(DEFAULT_INTERVAL_MS),
  10
);
const NOTIFICATIONS_JOB_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.NOTIFICATIONS_JOB_CONCURRENCY || "4", 10) || 1
);
const OVERDUE_REPEAT_DAYS = Math.max(
  1,
  Number.parseInt(process.env.OVERDUE_REMINDER_REPEAT_DAYS || "7", 10) || 7,
);

let isRunning = false;

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await handler(current);
    }
  });
  await Promise.all(workers);
}

async function processUserNotifications(userId: string, today: Date): Promise<void> {
  const assignments = await dbStorage.getTaskAssignmentsWithTaskByUserId(userId);
  for (const { assignment, task } of assignments) {
    const dueDateStr = formatDateOnly(assignment.dueDate);
    if (!dueDateStr) continue;
    const dueDate = new Date(dueDateStr);
    const taskStatus = String(task.status || "");
    const assignmentStatus = String((assignment as any).status || "");
    const isTerminalStatus =
      taskStatus === "Completed" ||
      taskStatus === "Cancelled" ||
      taskStatus === "Archived" ||
      assignmentStatus === "completed" ||
      assignmentStatus === "cancelled";
    const isCompleted = assignment.completedAt != null || isTerminalStatus;
    if (isCompleted) continue;
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let type: "task_due_soon" | "task_overdue" | null = null;
    if (diffDays < 0) type = "task_overdue";
    else if (diffDays <= DUE_SOON_DAYS) type = "task_due_soon";
    if (!type) continue;

    const last = await dbStorage.getLatestNotificationByAssignmentType(
      userId,
      assignment.id,
      type,
    );
    if (last && type === "task_overdue") {
      const lastAt = last.createdAt instanceof Date ? last.createdAt : new Date(last.createdAt as any);
      const lastDay = new Date(lastAt);
      lastDay.setHours(0, 0, 0, 0);
      const daysSince = Math.floor(
        (today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSince < OVERDUE_REPEAT_DAYS) continue;
    } else if (last) {
      continue;
    }

    const content = buildNotificationContent(type, {
      taskTitle: task.title ?? "",
      taskId: assignment.taskId,
      group: task.group ?? null,
      dueDate: dueDateStr,
      daysRemaining: diffDays,
    });
    const created = await dbStorage.createNotification({
      userId,
      type,
      taskId: assignment.taskId,
      taskAssignmentId: assignment.id,
      title: content.title,
      message: content.message,
      isRead: false,
      createdAt: new Date(),
      readAt: null,
    });
    await sendNotificationEmail(userId, created, {
      dueDate: dueDateStr,
      taskTitle: task.title ?? "",
      taskId: assignment.taskId,
      group: task.group ?? null,
      daysRemaining: diffDays,
    });
    await sendWebPushToUser(userId, created, { url: "/" });
  }
}

async function runNotificationsJobOnce(): Promise<void> {
  if (!db) return;
  if (isRunning) return;
  isRunning = true;
  try {
    const users = await dbStorage.getUsers();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await runWithConcurrency(users, NOTIFICATIONS_JOB_CONCURRENCY, async (user) => {
      await processUserNotifications(user.id, today);
    });
  } catch (error) {
    console.error("Notification background job error:", error);
  } finally {
    isRunning = false;
  }
}

export function startNotificationsJob(): void {
  if (!db) return;
  if (NOTIFICATIONS_JOB_INTERVAL_MS <= 0) return;
  runNotificationsJobOnce().catch(() => {});
  setInterval(() => {
    runNotificationsJobOnce().catch(() => {});
  }, NOTIFICATIONS_JOB_INTERVAL_MS);
  console.log(
    `Notification job started (interval ${NOTIFICATIONS_JOB_INTERVAL_MS}ms, concurrency ${NOTIFICATIONS_JOB_CONCURRENCY})`
  );
}
