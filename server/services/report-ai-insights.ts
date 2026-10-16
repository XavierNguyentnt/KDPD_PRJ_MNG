/**
 * =============================================================================
 * KDPD REPORT AI INSIGHTS SERVICE
 * =============================================================================
 * Trợ lý Phân tích Báo cáo Tự động cho Dự án Kinh điển phương Đông (KDPD).
 * - Sử dụng Gemini API (SDK @google/genai) khi có GEMINI_API_KEY.
 * - Tích hợp Fallback Heuristic Rule-based Expert Engine đảm bảo luôn hoạt động
 *   chính xác, bảo mật và tin cậy ngay cả khi ngoại tuyến hoặc chưa cấu hình API Key.
 * - Tuân thủ phong cách văn bản hành chính khoa học của Viện nghiên cứu.
 */

import { GoogleGenAI } from "@google/genai";
import type {
  ReportScope,
  ReportAIInsightsData,
  PersonalReportData,
  DepartmentReportData,
  OrganizationReportData,
} from "@shared/report-types";
import { formatNumberAccounting } from "@/lib/utils";

// =============================================================================
// 1. ENGINE PHÂN TÍCH CHUYÊN GIA DỰ BÒNG (HEURISTIC EXPERT RULE-ENGINE)
// =============================================================================

function generatePersonalHeuristics(data: PersonalReportData): Omit<ReportAIInsightsData, "scope" | "generatedAt" | "engine" | "hasApiKey"> {
  const { user, period, summary, roleOutput, tasks } = data;
  const highlights: string[] = [];
  const bottlenecks: string[] = [];
  const recommendations: string[] = [];

  // 1. Điểm sáng
  if (summary.completionRate >= 80) {
    highlights.push(
      `Hiệu suất hoàn thành công việc xuất sắc trong kỳ (${summary.completionRate}%), đạt ${summary.completedCount}/${summary.totalAssigned} đầu việc được giao.`,
    );
  } else if (summary.completionRate >= 50) {
    highlights.push(
      `Duy trì tiến độ hoàn thành ổn định với ${summary.completedCount} công việc đã nghiệm thu trong ${period.label}.`,
    );
  }

  if (summary.onTimeRate >= 85) {
    highlights.push(
      `Ý thức chấp hành tiến độ rất cao, tỷ lệ nộp bài/kết quả đúng hạn đạt ${summary.onTimeRate}%.`,
    );
  }

  if (roleOutput.totalEstimatedPages > 0) {
    highlights.push(
      `Đóng góp học thuật thực chất với sản lượng tích lũy ước tính ${formatNumberAccounting(roleOutput.totalEstimatedPages)} trang bản thảo (~${formatNumberAccounting(roleOutput.totalEstimatedWords)} từ).`,
    );
  }

  if (highlights.length === 0) {
    highlights.push(
      `Nhân sự đang tiếp nhận và triển khai ${summary.inProgressCount} công việc trọng tâm trong kỳ ${period.label}.`,
    );
  }

  // 2. Điểm nghẽn & Rủi ro
  const overdueTasks = tasks.filter((t) => t.isOnTime === false);
  if (summary.overdueCount > 0 || overdueTasks.length > 0) {
    const overdueNames = overdueTasks
      .slice(0, 3)
      .map((t) => `"${t.title}"${t.daysLateOrEarly ? ` (trễ ${t.daysLateOrEarly} ngày)` : ""}`)
      .join(", ");
    bottlenecks.push(
      `Hiện có ${summary.overdueCount} đầu việc quá hạn chưa dứt điểm: ${overdueNames}${overdueTasks.length > 3 ? "..." : ""}.`,
    );
  }

  if (summary.completionRate < 50 && summary.totalAssigned > 3) {
    bottlenecks.push(
      `Tỷ lệ hoàn thành công việc trong kỳ còn thấp (${summary.completionRate}%), khối lượng đang dồn ứ tại ${summary.inProgressCount} việc đang làm.`,
    );
  }

  if (bottlenecks.length === 0) {
    bottlenecks.push("Không ghi nhận rủi ro trễ hạn trọng yếu trong chu kỳ báo cáo này.");
  }

  // 3. Khuyến nghị
  if (summary.overdueCount > 0) {
    recommendations.push(
      "Ưu tiên cao nhất cho việc xử lý dứt điểm các đầu việc đang quá hạn trước khi mở thêm tác vụ mới.",
    );
  }
  if (summary.inProgressCount > 5) {
    recommendations.push(
      `Số lượng việc đang làm đồng thời khá cao (${summary.inProgressCount} việc), cần lập thứ tự ưu tiên hoặc kiến nghị Trưởng bộ phận hỗ trợ rà soát.`,
    );
  }
  recommendations.push(
    "Duy trì chế độ cập nhật tiến độ định kỳ trên hệ thống KDPD để phục vụ công tác đối soát nghiệm thu hợp đồng.",
  );

  const summaryParagraph = `Trong ${period.label}, nhân sự ${user.displayName} hoàn thành ${summary.completedCount}/${summary.totalAssigned} đầu việc (${summary.completionRate}%), tỷ lệ đúng hạn đạt ${summary.onTimeRate}%. ${summary.overdueCount > 0 ? `Cần tập trung giải quyết dứt điểm ${summary.overdueCount} đầu việc trễ hạn.` : "Tiến độ học thuật và thực thi nhiệm vụ duy trì tốt theo kế hoạch đề ra."}`;

  return { highlights, bottlenecks, recommendations, summaryParagraph };
}

function generateDepartmentHeuristics(data: DepartmentReportData): Omit<ReportAIInsightsData, "scope" | "generatedAt" | "engine" | "hasApiKey"> {
  const { group, period, summary, workloadByMember, specializedMetrics } = data;
  const highlights: string[] = [];
  const bottlenecks: string[] = [];
  const recommendations: string[] = [];

  // 1. Điểm sáng
  highlights.push(
    `Tập thể ${group.name} đã xử lý tổng cộng ${summary.totalTasks} đầu việc trong ${period.label}, hoàn thành ${summary.completedCount} việc (đạt ${summary.completionRate}%).`,
  );

  const topPerformer = [...workloadByMember].sort((a, b) => b.completedCount - a.completedCount)[0];
  if (topPerformer && topPerformer.completedCount > 0) {
    highlights.push(
      `Nhân sự có sản lượng hoàn thành cao nhất: ${topPerformer.displayName} (${topPerformer.completedCount} việc hoàn tất, đúng hạn ${topPerformer.onTimeRate}%).`,
    );
  }

  if (specializedMetrics.roundTypeBreakdown && specializedMetrics.roundTypeBreakdown.length > 0) {
    const roundsStr = specializedMetrics.roundTypeBreakdown
      .map((r) => `${r.roundType}: ${r.completed}/${r.count}`)
      .join(", ");
    highlights.push(`Hoạt động biên tập chuyên sâu: ${roundsStr}.`);
  }

  if (specializedMetrics.totalContractValue && specializedMetrics.totalContractValue > 0) {
    highlights.push(
      `Quản lý hành chính - tài chính: Giám sát hợp đồng với tổng giá trị ${formatNumberAccounting(specializedMetrics.totalContractValue)} VNĐ (đã tạm ứng: ${formatNumberAccounting(specializedMetrics.totalAdvanced || 0)} VNĐ).`,
    );
  }

  // 2. Điểm nghẽn
  const overloadedMembers = workloadByMember.filter((m) => m.workloadStatus === "overloaded" || m.workloadStatus === "high");
  if (overloadedMembers.length > 0) {
    const names = overloadedMembers.map((m) => m.displayName).join(", ");
    bottlenecks.push(
      `Cảnh báo quá tải tải trọng nhân sự tại: ${names} (${overloadedMembers.length} thành viên đảm nhận tải trọng công việc rất cao).`,
    );
  }

  if (summary.overdueCount > 0) {
    bottlenecks.push(
      `Toàn nhóm có ${summary.overdueCount} đầu việc đang bị trễ hạn so với mốc cam kết (tỷ lệ đúng hạn nhóm là ${summary.onTimeRate}%).`,
    );
  }

  if (bottlenecks.length === 0) {
    bottlenecks.push("Tiến độ phân bổ của nhóm đồng đều, không ghi nhận tình trạng dồn ứ nghiêm trọng.");
  }

  // 3. Khuyến nghị
  if (overloadedMembers.length > 0) {
    recommendations.push(
      "Trưởng nhóm nghiệp vụ cần rà soát lại ma trận phân công, san sẻ bớt các tác vụ thứ yếu sang các thành viên có mức tải trọng thấp hơn.",
    );
  }
  if (summary.overdueCount > 0) {
    recommendations.push(
      "Tổ chức buổi họp giao ban kỹ thuật ngắn để tháo gỡ khó khăn về mặt học thuật/dữ liệu đối với các tác vụ đang trễ hạn.",
    );
  }
  recommendations.push(
    "Chuẩn hóa hồ sơ bản thảo và biên bản thẩm định định kỳ để phục vụ tiến độ quyết toán với Ban Quản lý Dự án.",
  );

  const summaryParagraph = `Nhóm ${group.name} trong ${period.label} đạt tỷ lệ hoàn thành ${summary.completionRate}%, tỷ lệ đúng hạn ${summary.onTimeRate}%. ${summary.overdueCount > 0 ? `Toàn nhóm có ${summary.overdueCount} đầu việc trễ hạn cần tập trung đôn đốc.` : "Tải trọng và tiến độ công việc giữa các thành viên được kiểm soát tốt."}`;

  return { highlights, bottlenecks, recommendations, summaryParagraph };
}

function generateOrganizationHeuristics(data: OrganizationReportData): Omit<ReportAIInsightsData, "scope" | "generatedAt" | "engine" | "hasApiKey"> {
  const { summary, componentsProgress, financialOverview, criticalRisks, period } = data;
  const highlights: string[] = [];
  const bottlenecks: string[] = [];
  const recommendations: string[] = [];

  // 1. Điểm sáng
  highlights.push(
    `Quy mô triển khai toàn dự án đạt ${summary.totalWorks} tác phẩm trọng điểm, với ${summary.completedTasks} nhiệm vụ đã hoàn thành trên toàn hệ thống.`,
  );

  const disbursementRate =
    financialOverview.totalContractValue > 0
      ? Math.round((financialOverview.totalPaid / financialOverview.totalContractValue) * 100)
      : 0;
  highlights.push(
    `Tài chính giải ngân đạt ${disbursementRate}% (${formatNumberAccounting(financialOverview.totalPaid)} / ${formatNumberAccounting(financialOverview.totalContractValue)} VNĐ giá trị hợp đồng).`,
  );

  const topComponent = [...componentsProgress].sort((a, b) => b.completedWorks - a.completedWorks)[0];
  if (topComponent) {
    highlights.push(
      `Hợp phần dẫn đầu sản lượng hoàn thành: "${topComponent.name}" (${topComponent.completedWorks} tác phẩm hoàn tất).`,
    );
  }

  // 2. Điểm nghẽn
  if (criticalRisks.length > 0) {
    const criticalCount = criticalRisks.filter((r) => r.severity === "critical").length;
    bottlenecks.push(
      `Hệ thống radar cảnh báo ${criticalRisks.length} điểm nóng rủi ro (trong đó có ${criticalCount} cảnh báo mức độ Nghiêm trọng về trễ hạn tác phẩm/hợp đồng).`,
    );
  }

  if (summary.overdueTasks > 0) {
    bottlenecks.push(
      `Toàn hệ thống có ${summary.overdueTasks} nhiệm vụ quá hạn cam kết (tỷ lệ đúng hạn chung toàn dự án: ${summary.systemOnTimeRate}%).`,
    );
  }

  if (financialOverview.totalOutstanding > 0) {
    bottlenecks.push(
      `Còn ${formatNumberAccounting(financialOverview.totalOutstanding)} VNĐ giá trị hợp đồng chưa hoàn tất thanh quyết toán, cần đôn đốc nghiệm thu.`,
    );
  }

  // 3. Khuyến nghị
  recommendations.push(
    "Ban Giám đốc Dự án cần chủ trì họp kiểm điểm tiến độ chuyên đề với các Hợp phần đang có số lượng tác phẩm dồn ứ ở giai đoạn dịch và hiệu đính.",
  );
  if (criticalRisks.length > 0) {
    recommendations.push(
      `Kích hoạt quy trình can thiệp khẩn cấp đối với ${Math.min(3, criticalRisks.length)} đầu việc/hợp đồng có độ trễ lớn nhất để bảo vệ mốc tiến độ bàn giao.`,
    );
  }
  recommendations.push(
    "Đẩy nhanh thủ tục nghiệm thu các giai đoạn hợp đồng đã hoàn thành để giải phóng dòng tiền và đảm bảo tiến độ giải ngân ngân sách.",
  );

  const summaryParagraph = `Trong ${period.label}, Dự án Kinh điển phương Đông duy trì nhịp độ triển khai trên ${componentsProgress.length} hợp phần chiến lược. Tỷ lệ hoàn thành nhiệm vụ toàn hệ thống đạt ${summary.systemCompletionRate}%, tỷ lệ đúng hạn ${summary.systemOnTimeRate}%. Ban Giám đốc cần tập trung chỉ đạo tháo gỡ ${criticalRisks.length} điểm nóng rủi ro để bảo đảm tiến độ tổng thể.`;

  return { highlights, bottlenecks, recommendations, summaryParagraph };
}

// =============================================================================
// 2. HÀM CHÍNH GỌI GEMINI API HOẶC FALLBACK
// =============================================================================

export async function generateReportAIInsights(
  scope: ReportScope,
  reportData: PersonalReportData | DepartmentReportData | OrganizationReportData,
): Promise<ReportAIInsightsData> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Nếu không có API Key, sử dụng ngay Heuristic Rule-Engine
  if (!apiKey) {
    let heuristicResult;
    if (scope === "personal") {
      heuristicResult = generatePersonalHeuristics(reportData as PersonalReportData);
    } else if (scope === "department") {
      heuristicResult = generateDepartmentHeuristics(reportData as DepartmentReportData);
    } else {
      heuristicResult = generateOrganizationHeuristics(reportData as OrganizationReportData);
    }

    return {
      scope,
      generatedAt: new Date().toISOString(),
      engine: "kdpd-expert-heuristics",
      hasApiKey: false,
      ...heuristicResult,
    };
  }

  // Nếu có API Key, gọi mô hình Gemini 2.5 Flash
  try {
    const ai = new GoogleGenAI({ apiKey });

    // Tạo tóm tắt dữ liệu cô đọng để gửi tới Gemini (bảo mật, không gửi dữ liệu nhạy cảm)
    let condensedDataPrompt = "";
    if (scope === "personal") {
      const p = reportData as PersonalReportData;
      condensedDataPrompt = JSON.stringify({
        nhanSu: p.user.displayName,
        phongBan: p.user.department,
        chuKy: p.period.label,
        tongViec: p.summary.totalAssigned,
        hoanThanh: p.summary.completedCount,
        tyLeHoanThanh: `${p.summary.completionRate}%`,
        tyLeDungHan: `${p.summary.onTimeRate}%`,
        quaHan: p.summary.overdueCount,
        dungLuongTrang: p.roleOutput.totalEstimatedPages,
        danhSachQuaHan: p.tasks.filter((t) => t.isOnTime === false).map((t) => ({ ten: t.title, treNgay: t.daysLateOrEarly })),
      });
    } else if (scope === "department") {
      const d = reportData as DepartmentReportData;
      condensedDataPrompt = JSON.stringify({
        nhom: d.group.name,
        chuKy: d.period.label,
        tongViec: d.summary.totalTasks,
        hoanThanh: d.summary.completedCount,
        tyLeHoanThanh: `${d.summary.completionRate}%`,
        tyLeDungHan: `${d.summary.onTimeRate}%`,
        quaHan: d.summary.overdueCount,
        nhanSuQuaTai: d.workloadByMember.filter((m) => m.workloadStatus === "overloaded" || m.workloadStatus === "high").map((m) => m.displayName),
        nhanSuTotNhat: d.workloadByMember[0]?.displayName,
      });
    } else {
      const o = reportData as OrganizationReportData;
      condensedDataPrompt = JSON.stringify({
        chuKy: o.period.label,
        tongTacPham: o.summary.totalWorks,
        tongNhiemVu: o.summary.totalTasks,
        tyLeHoanThanhHeThong: `${o.summary.systemCompletionRate}%`,
        tyLeDungHanHeThong: `${o.summary.systemOnTimeRate}%`,
        nhiemVuQuaHan: o.summary.overdueTasks,
        taiChinh: {
          tongHopDong: o.financialOverview.totalContractValue,
          daThanhToan: o.financialOverview.totalPaid,
          conLai: o.financialOverview.totalOutstanding,
        },
        diemNongRuiRo: o.criticalRisks.slice(0, 5).map((r) => ({ ten: r.title, hopPhan: r.groupOrComponent, treNgay: r.daysOverdue })),
      });
    }

    const systemPrompt = `Bạn là Thư ký Chuyên môn Cấp cao kiêm Chuyên gia Quản trị Dự án của Dự án Biên dịch và Xuất bản Kinh điển phương Đông (KDPD).
Nhiệm vụ của bạn là đọc các con số tổng hợp báo cáo và viết bản nhận định hành chính khoa học mạch lạc, sâu sắc, ngắn gọn và thực tiễn.
Văn phong: Chuẩn mực, trang trọng, mang tính xây dựng cao theo phong cách văn bản của Viện nghiên cứu cấp nhà nước.

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (không kèm markdown ngoài JSON):
{
  "highlights": ["Điểm sáng nổi bật 1", "Điểm sáng 2"],
  "bottlenecks": ["Điểm nghẽn hoặc rủi ro 1", "Rủi ro 2"],
  "recommendations": ["Khuyến nghị hành động cụ thể 1", "Khuyến nghị 2"],
  "summaryParagraph": "Đoạn văn ngắn (2-3 câu) đúc kết tổng thể tình hình để lãnh đạo nắm bắt nhanh."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Hãy phân tích số liệu báo cáo cấp ${scope.toUpperCase()} sau đây:\n${condensedDataPrompt}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);

    return {
      scope,
      generatedAt: new Date().toISOString(),
      engine: "gemini-2.5-flash",
      hasApiKey: true,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      bottlenecks: Array.isArray(parsed.bottlenecks) ? parsed.bottlenecks : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      summaryParagraph: parsed.summaryParagraph || "Bản nhận định tự động do AI tổng hợp.",
    };
  } catch (error) {
    console.warn("Gemini API call failed, falling back to KDPD heuristics engine:", error);

    // Fallback sang Heuristics Engine nếu lỗi mạng hoặc lỗi API Key
    let heuristicResult;
    if (scope === "personal") {
      heuristicResult = generatePersonalHeuristics(reportData as PersonalReportData);
    } else if (scope === "department") {
      heuristicResult = generateDepartmentHeuristics(reportData as DepartmentReportData);
    } else {
      heuristicResult = generateOrganizationHeuristics(reportData as OrganizationReportData);
    }

    return {
      scope,
      generatedAt: new Date().toISOString(),
      engine: "kdpd-expert-heuristics",
      hasApiKey: true,
      ...heuristicResult,
    };
  }
}
