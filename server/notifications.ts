export const DUE_SOON_DAYS = Number.parseInt(process.env.DUE_SOON_DAYS || "7", 10);

export function formatDateOnly(input: string | Date | null | undefined): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  return input.toISOString().slice(0, 10);
}

export function buildNotificationContent(
  type: "task_assigned" | "task_due_soon" | "task_overdue" | "task_reviewed",
  taskTitle: string,
  dueDate?: string | null,
  vote?: string | null
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
  if (type === "task_overdue") {
    return {
      title: "Công việc đã quá hạn",
      message: dueDate ? `Đã quá hạn (${dueDate}): ${safeTitle}` : `Đã quá hạn: ${safeTitle}`,
    };
  }
  return {
    title: "Đánh giá công việc đã hoàn thành",
    message: vote ? `Đánh giá: ${vote} — ${safeTitle}` : `Đã đánh giá: ${safeTitle}`,
  };
}
