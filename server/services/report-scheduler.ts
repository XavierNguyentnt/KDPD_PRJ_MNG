/**
 * =============================================================================
 * KDPD REPORT SCHEDULER SERVICE
 * =============================================================================
 * Dịch vụ lập lịch nhắc nhở và tự động hóa chốt sổ báo cáo định kỳ cho Dự án KDPD.
 * - Tự động phát hiện các mốc cuối tuần (Thứ 6, Thứ 7) và cuối tháng (từ ngày 25 trở đi).
 * - Phát thông báo định kỳ vào bảng notifications cho toàn bộ nhân sự.
 * - Chống gửi lặp thông báo trong cùng một ngày.
 */

import type pg from "pg";

export async function triggerReportReminders(
  pool: pg.Pool,
  force = false,
): Promise<{ sentCount: number; message: string }> {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0: CN, 5: T6, 6: T7
    const dayOfMonth = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    // Chỉ gửi vào Thứ 6, Thứ 7 hoặc những ngày cuối tháng (từ ngày 25 trở đi), trừ khi force=true
    const isEndOfWeek = dayOfWeek === 5 || dayOfWeek === 6;
    const isEndOfMonth = dayOfMonth >= 25;

    if (!force && !isEndOfWeek && !isEndOfMonth) {
      return {
        sentCount: 0,
        message: "Hôm nay không phải mốc cuối tuần hoặc cuối tháng để kích hoạt nhắc nhở tự động.",
      };
    }

    const periodLabel = isEndOfMonth
      ? `Tháng ${month}/${year}`
      : `Tuần ${getWeekNumber(today)}/${year}`;

    const title = `[Nhắc nhở] Chốt sổ Báo cáo định kỳ ${periodLabel}`;
    const message = `Đã đến thời hạn hoàn tất và chốt sổ báo cáo công việc định kỳ ${periodLabel}. Đề nghị các nhân sự và trưởng bộ phận truy cập Trung tâm Báo cáo để đối soát và chốt số liệu.`;

    // Lấy danh sách users đang hoạt động chưa nhận thông báo nhắc nhở hôm nay
    const query = `
      SELECT u.id, u.display_name, u.email
      FROM users u
      WHERE u.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = u.id
            AND n.type = 'report_reminder'
            AND n.created_at::date = CURRENT_DATE
        )
    `;

    const usersRes = await pool.query(query);
    const targetUsers = usersRes.rows;

    if (targetUsers.length === 0) {
      return {
        sentCount: 0,
        message: "Toàn bộ nhân sự đã nhận thông báo nhắc nhở báo cáo trong ngày hôm nay.",
      };
    }

    // Chèn thông báo cho từng nhân sự
    let sentCount = 0;
    for (const u of targetUsers) {
      await pool.query(
        `
        INSERT INTO notifications (user_id, type, title, message, is_important, is_read, created_at)
        VALUES ($1, 'report_reminder', $2, $3, true, false, NOW())
      `,
        [u.id, title, message],
      );
      sentCount++;
    }

    console.log(`[ReportScheduler] Đã gửi ${sentCount} thông báo nhắc nhở báo cáo định kỳ ${periodLabel}.`);
    return {
      sentCount,
      message: `Đã phát ${sentCount} thông báo nhắc nhở báo cáo định kỳ ${periodLabel} thành công.`,
    };
  } catch (err: any) {
    console.error("[ReportScheduler] Lỗi khi gửi thông báo nhắc nhở báo cáo:", err);
    throw err;
  }
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function initReportScheduler(pool: pg.Pool | null): void {
  if (!pool) return;

  console.log("[ReportScheduler] Đã khởi tạo tiến trình lập lịch báo cáo tự động KDPD.");

  // Chạy kiểm tra sau 1 phút khởi động server, sau đó chạy mỗi 6 giờ một lần
  setTimeout(() => {
    triggerReportReminders(pool, false).catch((e) =>
      console.warn("[ReportScheduler] Lỗi kiểm tra ban đầu:", e.message),
    );
  }, 60 * 1000);

  setInterval(
    () => {
      triggerReportReminders(pool, false).catch((e) =>
        console.warn("[ReportScheduler] Lỗi kiểm tra định kỳ:", e.message),
      );
    },
    6 * 60 * 60 * 1000,
  );
}
