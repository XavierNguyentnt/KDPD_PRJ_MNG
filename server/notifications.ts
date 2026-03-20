export const DUE_SOON_DAYS = Number.parseInt(
  process.env.DUE_SOON_DAYS || "7",
  10,
);

export function formatDateOnly(
  input: string | Date | null | undefined,
): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  return input.toISOString().slice(0, 10);
}

function getVoteLabel(vote: string | null | undefined): string | null {
  if (!vote) return null;
  const v = String(vote).toLowerCase();
  if (v === "tot") return "Hoàn thành tốt";
  if (v === "kha") return "Hoàn thành khá";
  if (v === "khong_tot") return "Không tốt";
  if (v === "khong_hoan_thanh") return "Không hoàn thành";
  return vote;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTimeVn(
  input: string | Date | null | undefined,
): string | null {
  if (!input) return null;
  const d = typeof input === "string" ? new Date(input) : input;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}

export function buildNotificationContent(
  type:
    | "task_assigned"
    | "task_due_soon"
    | "task_overdue"
    | "task_reviewed"
    | "task_completed",
  ctx: {
    taskTitle: string;
    taskId?: string | null;
    group?: string | null;
    dueDate?: string | null;
    vote?: string | null;
    assignerName?: string | null;
    assignedAt?: string | null;
    assignmentDueDate?: string | null;
    assignmentNotes?: string | null;
    recipientName?: string | null;
    daysRemaining?: number | null;
    assigneeName?: string | null;
    completedAt?: string | null;
    controllerNames?: string[] | null;
    recipientIsController?: boolean | null;
  },
) {
  const safeTitle = escapeHtml(String(ctx.taskTitle || "Công việc"));
  const safeTaskId = escapeHtml(String(ctx.taskId ?? "—"));
  const safeGroup = escapeHtml(String(ctx.group ?? "—"));
  const meta = `<div style="margin:8px 0 10px 0">
    <div><span style="color:#64748b">Mã CV:</span> <strong>${safeTaskId}</strong></div>
    <div><span style="color:#64748b">Nhóm:</span> <strong>${safeGroup}</strong></div>
  </div>`;

  if (type === "task_assigned") {
    const assignedAtStr = escapeHtml(String(formatDateTimeVn(ctx.assignedAt) ?? "—"));
    const safeAssignerName = escapeHtml(String(ctx.assignerName ?? "—"));
    const safeAssignmentDueDate = escapeHtml(String(ctx.assignmentDueDate ?? "—"));
    const safeControllerNames =
      Array.isArray(ctx.controllerNames) && ctx.controllerNames.length
        ? escapeHtml(ctx.controllerNames.map((s) => String(s)).join(", "))
        : "";
    const details = `<div style="margin-top:8px">
      <div><span style="color:#64748b">Người giao việc:</span> ${safeAssignerName}</div>
      <div><span style="color:#64748b">Thời gian giao:</span> ${assignedAtStr}</div>
      <div><span style="color:#64748b">Ngày hoàn thành dự kiến:</span> ${safeAssignmentDueDate}</div>
      ${ctx.assignmentNotes ? `<div><span style="color:#64748b">Ghi chú:</span> ${escapeHtml(String(ctx.assignmentNotes))}</div>` : ""}
      ${safeControllerNames ? `<div><span style="color:#64748b">Người kiểm soát:</span> ${safeControllerNames}</div>` : ""}
    </div>`;
    return {
      title: "Công việc mới được giao",
      message: `${meta}<div>Bạn được giao: <strong>${safeTitle}</strong></div>${details}`,
    };
  }

  if (type === "task_due_soon") {
    const safeRecipientName = escapeHtml(String(ctx.recipientName ?? "Quý anh/chị"));
    const safeDueDate = escapeHtml(String(ctx.dueDate ?? "—"));
    const remind = `<div style="margin-top:8px;color:#0f172a">Kính đề nghị ${safeRecipientName} sắp xếp thời gian hoàn thành công việc đúng hạn!</div>`;
    const days =
      typeof ctx.daysRemaining === "number"
        ? `<div><span style="color:#64748b">Còn lại:</span> ${ctx.daysRemaining} ngày</div>`
        : "";
    return {
      title: "Công việc sắp đến hạn",
      message: `${meta}<div><span style="color:#64748b">Ngày hết hạn:</span> ${safeDueDate}</div>${days}<div style="margin-top:6px">Sắp đến hạn: <strong>${safeTitle}</strong></div>${remind}`,
    };
  }

  if (type === "task_overdue") {
    const safeRecipientName = escapeHtml(String(ctx.recipientName ?? "Quý anh/chị"));
    const safeDueDate = escapeHtml(String(ctx.dueDate ?? "—"));
    const daysOver =
      typeof ctx.daysRemaining === "number"
        ? Math.abs(ctx.daysRemaining)
        : null;
    const overdueLine =
      typeof daysOver === "number"
        ? `<div><span style="color:#64748b">Quá hạn:</span> ${daysOver} ngày</div>`
        : "";
    const remind = `<div style="margin-top:8px;color:#0f172a">Kính đề nghị ${safeRecipientName} sắp xếp thời gian hoàn thành công việc đúng hạn!</div>`;
    return {
      title: "Công việc đã quá hạn",
      message: `${meta}<div><span style="color:#64748b">Ngày hết hạn:</span> ${safeDueDate}</div>${overdueLine}<div style="margin-top:6px">Đã quá hạn: <strong>${safeTitle}</strong></div>${remind}`,
    };
  }

  if (type === "task_completed") {
    const completedAtStr = escapeHtml(String(formatDateTimeVn(ctx.completedAt) ?? "—"));
    const safeAssigneeName = escapeHtml(String(ctx.assigneeName ?? "—"));
    const safeRecipientName = escapeHtml(String(ctx.recipientName ?? "Quý anh/chị"));
    const details = `<div style="margin-top:8px">
      <div><span style="color:#64748b">Người thực hiện:</span> ${safeAssigneeName}</div>
      <div><span style="color:#64748b">Thời điểm hoàn thành:</span> ${completedAtStr}</div>
    </div>`;
    const remindController = ctx.recipientIsController
      ? `<div style="margin-top:8px;color:#0f172a">Kính đề nghị ${safeRecipientName} vào đánh giá công việc của ${safeAssigneeName}.</div>`
      : "";
    return {
      title: "Công việc đã được hoàn thành",
      message: `${meta}<div>Đã hoàn thành: <strong>${safeTitle}</strong></div>${details}${remindController}`,
    };
  }

  const voteLabel = getVoteLabel(ctx.vote ?? null);
  const safeVoteLabel = escapeHtml(String(voteLabel ?? "—"));
  return {
    title: "Đánh giá công việc đã hoàn thành",
    message: `${meta}<div><span style="color:#64748b">Đánh giá:</span> ${safeVoteLabel}</div><div style="margin-top:6px"><strong>${safeTitle}</strong></div>`,
  };
}
