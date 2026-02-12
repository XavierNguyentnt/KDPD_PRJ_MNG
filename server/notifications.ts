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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  const safeTitle = ctx.taskTitle || "Công việc";
  const meta = `<div style="margin:8px 0 10px 0">
    <div><span style="color:#64748b">Mã CV:</span> <strong>${ctx.taskId ?? "—"}</strong></div>
    <div><span style="color:#64748b">Nhóm:</span> <strong>${ctx.group ?? "—"}</strong></div>
  </div>`;

  if (type === "task_assigned") {
    const assignedAtStr = formatDateTimeVn(ctx.assignedAt);
    const details = `<div style="margin-top:8px">
      <div><span style="color:#64748b">Người giao việc:</span> ${ctx.assignerName ?? "—"}</div>
      <div><span style="color:#64748b">Thời gian giao:</span> ${assignedAtStr ?? "—"}</div>
      <div><span style="color:#64748b">Ngày hoàn thành dự kiến:</span> ${ctx.assignmentDueDate ?? "—"}</div>
      ${ctx.assignmentNotes ? `<div><span style="color:#64748b">Ghi chú:</span> ${escapeHtml(ctx.assignmentNotes)}</div>` : ""}
      ${Array.isArray(ctx.controllerNames) && ctx.controllerNames.length ? `<div><span style="color:#64748b">Người kiểm soát:</span> ${ctx.controllerNames.join(", ")}</div>` : ""}
    </div>`;
    return {
      title: "Công việc mới được giao",
      message: `${meta}<div>Bạn được giao: <strong>${safeTitle}</strong></div>${details}`,
    };
  }

  if (type === "task_due_soon") {
    const remind = `<div style="margin-top:8px;color:#0f172a">Kính đề nghị ${ctx.recipientName ?? "Quý anh/chị"} sắp xếp thời gian hoàn thành công việc đúng hạn!</div>`;
    const days =
      typeof ctx.daysRemaining === "number"
        ? `<div><span style="color:#64748b">Còn lại:</span> ${ctx.daysRemaining} ngày</div>`
        : "";
    return {
      title: "Công việc sắp đến hạn",
      message: `${meta}<div><span style="color:#64748b">Ngày hết hạn:</span> ${ctx.dueDate ?? "—"}</div>${days}<div style="margin-top:6px">Sắp đến hạn: <strong>${safeTitle}</strong></div>${remind}`,
    };
  }

  if (type === "task_overdue") {
    const remind = `<div style="margin-top:8px;color:#0f172a">Kính đề nghị ${ctx.recipientName ?? "Quý anh/chị"} sắp xếp thời gian hoàn thành công việc đúng hạn!</div>`;
    return {
      title: "Công việc đã quá hạn",
      message: `${meta}<div><span style="color:#64748b">Ngày hết hạn:</span> ${ctx.dueDate ?? "—"}</div><div style="margin-top:6px">Đã quá hạn: <strong>${safeTitle}</strong></div>${remind}`,
    };
  }

  if (type === "task_completed") {
    const completedAtStr = formatDateTimeVn(ctx.completedAt);
    const details = `<div style="margin-top:8px">
      <div><span style="color:#64748b">Người thực hiện:</span> ${ctx.assigneeName ?? "—"}</div>
      <div><span style="color:#64748b">Thời điểm hoàn thành:</span> ${completedAtStr ?? "—"}</div>
    </div>`;
    const remindController = ctx.recipientIsController
      ? `<div style="margin-top:8px;color:#0f172a">Kính đề nghị ${ctx.recipientName ?? "Quý anh/chị"} vào đánh giá công việc của ${ctx.assigneeName ?? "nhân sự"}.</div>`
      : "";
    return {
      title: "Công việc đã được hoàn thành",
      message: `${meta}<div>Đã hoàn thành: <strong>${safeTitle}</strong></div>${details}${remindController}`,
    };
  }

  const voteLabel = getVoteLabel(ctx.vote ?? null);
  return {
    title: "Đánh giá công việc đã hoàn thành",
    message: `${meta}<div><span style="color:#64748b">Đánh giá:</span> ${voteLabel ?? "—"}</div><div style="margin-top:6px"><strong>${safeTitle}</strong></div>`,
  };
}
