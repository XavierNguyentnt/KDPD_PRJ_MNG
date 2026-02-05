export const DUE_SOON_DAYS = Number.parseInt(process.env.DUE_SOON_DAYS || "7", 10);

export function formatDateOnly(input: string | Date | null | undefined): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  return input.toISOString().slice(0, 10);
}

export function buildNotificationContent(
  type: "task_assigned" | "task_due_soon" | "task_overdue",
  taskTitle: string,
  dueDate?: string | null
) {
  const safeTitle = taskTitle || "Công việc";
  if (type === "task_assigned") {
    return {
      title: "Công việc mới được giao",
      message: `Bạn được giao: ${safeTitle}`,
    };
  }
  if (type === "task_due_soon") {
    return {
      title: "Công việc sắp đến hạn",
      message: dueDate ? `Sắp đến hạn (${dueDate}): ${safeTitle}` : `Sắp đến hạn: ${safeTitle}`,
    };
  }
  return {
    title: "Công việc đã quá hạn",
    message: dueDate ? `Đã quá hạn (${dueDate}): ${safeTitle}` : `Đã quá hạn: ${safeTitle}`,
  };
}
