/**
 * =============================================================================
 * KDPD REPORTS API ROUTES
 * =============================================================================
 * Định tuyến API cho hệ thống Báo cáo Tự động 3 cấp độ:
 * 1. GET /api/reports/personal: Báo cáo cá nhân
 * 2. GET /api/reports/department/:groupCode: Báo cáo nhóm nghiệp vụ
 * 3. GET /api/reports/organization: Báo cáo toàn thể tổ chức
 */

import type { Express, Request, Response } from "express";
import { api } from "@shared/routes";
import { requireAuth } from "../middleware";
import {
  resolvePeriodInfo,
  generatePersonalReport,
  generateDepartmentReport,
  generateOrganizationReport,
} from "../services/report-generator";
import { generateReportAIInsights } from "../services/report-ai-insights";
import { triggerReportReminders } from "../services/report-scheduler";
import { pool } from "../db";

function isUserAdminOrManager(user: any): boolean {
  if (!user) return false;
  if (user.role === "Admin" || user.role === "Manager") return true;
  if (Array.isArray(user.roles)) {
    return user.roles.some(
      (r: any) =>
        r.name === "Admin" ||
        r.name === "Manager" ||
        r.code === "admin" ||
        r.code === "manager",
    );
  }
  return false;
}

function userHasAccessToGroup(user: any, targetGroupCode: string): boolean {
  if (isUserAdminOrManager(user)) return true;
  const target = targetGroupCode.toLowerCase().replace(/[_\-\s]/g, "");
  const groups = Array.isArray(user.groups) ? user.groups : [];
  return groups.some((g: any) => {
    const code = String(g.code || "").toLowerCase().replace(/[_\-\s]/g, "");
    const name = String(g.name || "").toLowerCase().replace(/[_\-\s]/g, "");
    return code.includes(target) || name.includes(target);
  });
}

export function registerReportRoutes(app: Express): void {
  // ---------------------------------------------------------------------------
  // 1. BÁO CÁO CÁ NHÂN
  // ---------------------------------------------------------------------------
  app.get(api.reports.personal.path, requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const {
        periodType,
        periodValue,
        startDate,
        endDate,
        targetUserId,
      } = req.query as Record<string, string | undefined>;

      // Nếu yêu cầu xem báo cáo của người khác -> bắt buộc là Admin hoặc Manager
      let targetId = currentUser.id;
      if (targetUserId && targetUserId !== currentUser.id) {
        if (!isUserAdminOrManager(currentUser)) {
          return res.status(403).json({
            message: "Bạn không có quyền xem báo cáo của nhân sự khác.",
          });
        }
        targetId = targetUserId;
      }

      const period = resolvePeriodInfo(
        periodType,
        periodValue,
        startDate,
        endDate,
      );

      const reportData = await generatePersonalReport(targetId, period);
      return res.json(reportData);
    } catch (error: any) {
      console.error("[Reports] Error in /api/reports/personal:", error);
      return res.status(500).json({
        message: error?.message || "Lỗi khi tổng hợp báo cáo cá nhân.",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. BÁO CÁO NHÓM NGHIỆP VỤ
  // ---------------------------------------------------------------------------
  app.get(api.reports.department.path, requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const groupCode = String(req.params.groupCode || "").trim();
      const {
        periodType,
        periodValue,
        startDate,
        endDate,
      } = req.query as Record<string, string | undefined>;

      if (!groupCode) {
        return res.status(400).json({ message: "Thiếu mã nhóm nghiệp vụ (groupCode)." });
      }

      // Kiểm tra quyền truy cập nhóm (Admin/Manager hoặc thành viên của nhóm)
      if (!userHasAccessToGroup(currentUser, groupCode)) {
        return res.status(403).json({
          message: "Bạn không có quyền xem báo cáo của nhóm nghiệp vụ này.",
        });
      }

      const period = resolvePeriodInfo(
        periodType,
        periodValue,
        startDate,
        endDate,
      );

      const reportData = await generateDepartmentReport(groupCode, period);
      return res.json(reportData);
    } catch (error: any) {
      console.error("[Reports] Error in /api/reports/department:", error);
      return res.status(500).json({
        message: error?.message || "Lỗi khi tổng hợp báo cáo nhóm nghiệp vụ.",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. BÁO CÁO TOÀN THỂ TỔ CHỨC
  // ---------------------------------------------------------------------------
  app.get(api.reports.organization.path, requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const {
        periodType,
        periodValue,
        startDate,
        endDate,
      } = req.query as Record<string, string | undefined>;

      // Báo cáo tổ chức: dành cho Ban Giám đốc, Ban Chủ nhiệm hoặc toàn bộ nhân sự (tuỳ chính sách)
      // Để phục vụ minh bạch tiến độ, tất cả nhân viên có thể xem tiến độ chung,
      // nhưng Admin/Manager xem đầy đủ các thông tin rủi ro & tài chính.
      const period = resolvePeriodInfo(
        periodType,
        periodValue,
        startDate,
        endDate,
      );

      const reportData = await generateOrganizationReport(period);

      // Nếu không phải Admin/Manager, che bớt số liệu tài chính nhạy cảm
      if (!isUserAdminOrManager(currentUser)) {
        reportData.financialOverview = {
          totalContractValue: 0,
          totalAdvanced: 0,
          totalSettled: 0,
          totalPaid: 0,
          totalOutstanding: 0,
        };
      }

      return res.json(reportData);
    } catch (error: any) {
      console.error("[Reports] Error in /api/reports/organization:", error);
      return res.status(500).json({
        message: error?.message || "Lỗi khi tổng hợp báo cáo tổ chức.",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 4. TRỢ LÝ TRÍ TUỆ NHÂN TẠO PHÂN TÍCH BÁO CÁO (GEMINI AI INSIGHTS)
  // ---------------------------------------------------------------------------
  app.post(api.reports.aiInsights.path, requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const { scope, targetId, reportData } = req.body;

      if (!scope || !reportData) {
        return res.status(400).json({
          message: "Thiếu dữ liệu phạm vi (scope) hoặc reportData để phân tích.",
        });
      }

      // Kiểm tra quyền truy cập theo scope
      if (scope === "personal") {
        const isOwner = !targetId || targetId === currentUser.id;
        if (!isOwner && !isUserAdminOrManager(currentUser)) {
          return res.status(403).json({
            message: "Bạn không có quyền yêu cầu phân tích báo cáo của nhân sự khác.",
          });
        }
      } else if (scope === "department") {
        const groupCode = targetId || reportData.group?.code;
        if (groupCode && !userHasAccessToGroup(currentUser, groupCode)) {
          return res.status(403).json({
            message: "Bạn không có quyền yêu cầu phân tích báo cáo của nhóm này.",
          });
        }
      }

      const insights = await generateReportAIInsights(scope, reportData);
      return res.json(insights);
    } catch (error: any) {
      console.error("[Reports] Error in /api/reports/ai-insights:", error);
      return res.status(500).json({
        message: error?.message || "Lỗi khi khởi tạo nhận định trí tuệ nhân tạo.",
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 5. CHỐT SỔ KỲ BÁO CÁO (REPORT SNAPSHOTS)
  // ---------------------------------------------------------------------------
  app.post(api.reports.createSnapshot.path, requireAuth, async (req: Request, res: Response) => {
    try {
      if (!pool) return res.status(500).json({ message: "Cơ sở dữ liệu chưa sẵn sàng." });
      const currentUser = req.user as any;
      const {
        scope,
        targetId,
        periodType,
        periodValue,
        periodLabel,
        summaryData,
        aiInsights,
        notes,
      } = req.body;

      if (!scope || !periodType || !periodValue || !summaryData) {
        return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc để chốt sổ báo cáo." });
      }

      // Kiểm tra quyền chốt sổ
      if (scope === "personal") {
        const isOwner = !targetId || targetId === currentUser.id;
        if (!isOwner && !isUserAdminOrManager(currentUser)) {
          return res.status(403).json({ message: "Bạn không có quyền chốt sổ báo cáo của nhân sự khác." });
        }
      } else if (scope === "department") {
        if (!userHasAccessToGroup(currentUser, targetId || "")) {
          return res.status(403).json({ message: "Bạn không có quyền chốt sổ báo cáo của nhóm này." });
        }
      } else if (scope === "organization") {
        if (!isUserAdminOrManager(currentUser)) {
          return res.status(403).json({ message: "Chỉ Ban Giám đốc mới có quyền chốt sổ báo cáo toàn tổ chức." });
        }
      }

      const finalTargetId = targetId || (scope === "organization" ? "all" : currentUser.id);

      const reportTitle =
        req.body.title ||
        `Báo cáo ${
          scope === "personal"
            ? "Cá nhân"
            : scope === "department"
            ? "Nhóm nghiệp vụ"
            : "Toàn thể tổ chức"
        } - ${periodLabel || periodValue}`;

      const insertRes = await pool.query(
        `INSERT INTO report_snapshots (
          title, scope, target_id, period_type, period_value, period_label,
          summary_data, ai_insights, generated_by, is_locked, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
        RETURNING *`,
        [
          reportTitle,
          scope,
          finalTargetId,
          periodType,
          periodValue,
          periodLabel || periodValue,
          JSON.stringify(summaryData),
          aiInsights ? JSON.stringify(aiInsights) : null,
          currentUser.id,
          notes || null,
        ],
      );

      return res.status(201).json(insertRes.rows[0]);
    } catch (error: any) {
      console.error("[Reports] Error in POST /api/reports/snapshots:", error);
      return res.status(500).json({
        message: error?.message || "Lỗi khi chốt sổ báo cáo.",
      });
    }
  });

  // Danh sách các bản chốt sổ
  app.get(api.reports.listSnapshots.path, requireAuth, async (req: Request, res: Response) => {
    try {
      if (!pool) return res.status(500).json({ message: "Cơ sở dữ liệu chưa sẵn sàng." });
      const currentUser = req.user as any;
      const { scope, targetId, periodValue } = req.query as Record<string, string | undefined>;

      let query = "SELECT * FROM report_snapshots WHERE 1=1";
      const params: any[] = [];

      if (scope) {
        params.push(scope);
        query += ` AND scope = $${params.length}`;
      }
      if (targetId) {
        params.push(targetId);
        query += ` AND target_id = $${params.length}`;
      }
      if (periodValue) {
        params.push(periodValue);
        query += ` AND period_value = $${params.length}`;
      }

      // Bảo mật quyền đọc: nếu không phải Admin/Manager và xem scope personal
      if (!isUserAdminOrManager(currentUser) && scope === "personal") {
        params.push(currentUser.id);
        query += ` AND (target_id = $${params.length} OR generated_by = $${params.length})`;
      }

      query += " ORDER BY created_at DESC LIMIT 50";

      const listRes = await pool.query(query, params);
      return res.json(listRes.rows);
    } catch (error: any) {
      console.error("[Reports] Error in GET /api/reports/snapshots:", error);
      return res.status(500).json({
        message: error?.message || "Lỗi khi lấy danh sách báo cáo đã chốt sổ.",
      });
    }
  });

  // Chi tiết 1 bản chốt sổ
  app.get(api.reports.getSnapshot.path, requireAuth, async (req: Request, res: Response) => {
    try {
      if (!pool) return res.status(500).json({ message: "Cơ sở dữ liệu chưa sẵn sàng." });
      const { id } = req.params;
      const resData = await pool.query("SELECT * FROM report_snapshots WHERE id = $1", [id]);
      if (resData.rows.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy bản báo cáo chốt sổ này." });
      }
      return res.json(resData.rows[0]);
    } catch (error: any) {
      console.error("[Reports] Error in GET /api/reports/snapshots/:id:", error);
      return res.status(500).json({
        message: error?.message || "Lỗi khi tải chi tiết bản chốt sổ.",
      });
    }
  });

  // Kích hoạt nhắc nhở thủ công hoặc tự động
  app.post("/api/reports/trigger-reminders", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!pool) return res.status(500).json({ message: "Cơ sở dữ liệu chưa sẵn sàng." });
      const currentUser = req.user as any;
      if (!isUserAdminOrManager(currentUser)) {
        return res.status(403).json({ message: "Chỉ Quản trị viên mới có quyền kích hoạt thông báo nhắc nhở." });
      }

      const result = await triggerReportReminders(pool, true);
      return res.json(result);
    } catch (error: any) {
      console.error("[Reports] Error in POST /api/reports/trigger-reminders:", error);
      return res.status(500).json({
        message: error?.message || "Lỗi khi gửi thông báo nhắc nhở.",
      });
    }
  });
}

