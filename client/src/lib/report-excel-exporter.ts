/**
 * =============================================================================
 * KDPD REPORT EXCEL EXPORTER
 * =============================================================================
 * Module xuất file Excel đa sheet chuyên nghiệp cho Hệ thống Báo cáo Tự động 3 cấp độ.
 * - Tuân thủ định dạng số kế toán Việt Nam (chấm hàng nghìn, phẩy thập phân).
 * - Sử dụng lazy dynamic import XLSX để tối ưu dung lượng tải trang.
 * - Hỗ trợ merge ô, căn giữa ngày tháng, kẻ viền ô và tạo nhiều sheet báo cáo.
 */

import { loadXLSX, formatNumberAccounting, formatDateDDMMYYYY } from "./utils";
import type {
  PersonalReportData,
  DepartmentReportData,
  OrganizationReportData,
  ReportAIInsightsData,
} from "@shared/report-types";

// =============================================================================
// 1. XUẤT EXCEL BÁO CÁO CÁ NHÂN (2 Sheets: Tổng quan + Bảng kê)
// =============================================================================

export async function exportPersonalReportToExcel(
  data: PersonalReportData,
  aiInsights?: ReportAIInsightsData | null,
): Promise<{ ok: boolean; fileName: string }> {
  const XLSX = await loadXLSX();
  const { user, period, summary, roleOutput, tasks } = data;

  const workbook = XLSX.utils.book_new();

  // ---------- SHEET 1: TỔNG QUAN & CHỈ SỐ ----------
  const overviewRows: (string | number)[][] = [
    ["DỰ ÁN KINH ĐIỂN PHƯƠNG ĐÔNG (KDPD)"],
    ["BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC CÁ NHÂN"],
    [],
    ["Họ và tên nhân sự:", user.displayName],
    ["Phòng ban / Đơn vị:", user.department || "—"],
    ["Email:", user.email],
    ["Chu kỳ báo cáo:", period.label],
    ["Khoảng thời gian:", `${formatDateDDMMYYYY(period.startDate)} - ${formatDateDDMMYYYY(period.endDate)}`],
    ["Thời điểm kết xuất:", formatDateDDMMYYYY(new Date())],
    [],
    ["I. CÁC CHỈ SỐ HIỆU SUẤT TRỌNG YẾU (KPI)"],
    ["Chỉ số đo lường", "Số lượng / Tỷ lệ", "Ghi chú"],
    ["Tổng số việc được phân công", summary.totalAssigned, "Đầu việc"],
    ["Số việc đã hoàn thành", summary.completedCount, `Đạt ${summary.completionRate}% kế hoạch`],
    ["Số việc đang thực hiện", summary.inProgressCount, "Đang xử lý"],
    ["Số việc chưa bắt đầu", summary.notStartedCount, "Chờ tiếp nhận"],
    ["Số việc tạm dừng / hoãn", summary.pendingCount, ""],
    ["Số việc hoàn thành đúng hạn", summary.onTimeCount, ""],
    ["Tỷ lệ hoàn thành đúng hạn", `${summary.onTimeRate}%`, "Đúng tiến độ cam kết"],
    ["Số việc quá hạn", summary.overdueCount, summary.overdueCount > 0 ? "Cần đôn đốc" : "Xuất sắc"],
    [],
    ["II. SẢN LƯỢNG HỌC THUẬT & CHUYÊN MÔN TÍCH LŨY"],
    ["Chỉ tiêu sản lượng", "Giá trị ước tính", "Đơn vị"],
    ["Tổng dung lượng trang quy đổi", formatNumberAccounting(roleOutput.totalEstimatedPages), "Trang bản thảo"],
    ["Tổng dung lượng chữ ước tính", formatNumberAccounting(roleOutput.totalEstimatedWords), "Từ"],
    [],
    ["III. PHÂN BỔ THEO VAI TRÒ CHUYÊN MÔN"],
    ["Vai trò thực hiện", "Tổng việc tham gia", "Đã hoàn tất", "Tỷ lệ (%)"],
  ];

  for (const st of roleOutput.stageBreakdown) {
    const rate = st.count > 0 ? Math.round((st.completed / st.count) * 100) : 0;
    overviewRows.push([st.stageLabel, st.count, st.completed, `${rate}%`]);
  }

  // Bổ sung Nhận định của Trợ lý AI nếu có
  if (aiInsights) {
    overviewRows.push(
      [],
      ["IV. NHẬN ĐỊNH CỦA TRỢ LÝ TRÍ TUỆ NHÂN TẠO (AI INSIGHTS)"],
      ["Mô hình phân tích:", aiInsights.engine === "gemini-2.5-flash" ? "Google Gemini 2.5 Flash" : "KDPD Expert Rule-Engine"],
      [],
      ["1. Đánh giá tổng quan:"],
      [aiInsights.summaryParagraph],
      [],
      ["2. Điểm sáng & Thành tựu nổi bật:"],
      ...aiInsights.highlights.map((h) => [`• ${h}`]),
      [],
      ["3. Nút thắt cổ chai & Rủi ro trễ hạn:"],
      ...aiInsights.bottlenecks.map((b) => [`• ${b}`]),
      [],
      ["4. Khuyến nghị hành động cụ thể:"],
      ...aiInsights.recommendations.map((r) => [`• ${r}`]),
    );
  }

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);

  // Set column widths
  wsOverview["!cols"] = [{ wch: 32 }, { wch: 28 }, { wch: 30 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(workbook, wsOverview, "Tổng quan & Chỉ số");

  // ---------- SHEET 2: BẢNG KÊ CHI TIẾT CÔNG VIỆC ----------
  const taskHeaders = [
    "STT",
    "Mã việc",
    "Tiêu đề công việc",
    "Tác phẩm liên quan",
    "Hợp phần",
    "Nhóm nghiệp vụ",
    "Vai trò",
    "Ngày nhận",
    "Hạn nộp",
    "Ngày hoàn thành",
    "Tình trạng đúng hạn",
    "Độ lệch (ngày)",
    "Tiến độ (%)",
    "Trạng thái",
  ];

  const taskRows: (string | number)[][] = [
    ["DANH MỤC CHI TIẾT CÔNG VIỆC TRONG KỲ"],
    [`Nhân sự: ${user.displayName} | Kỳ: ${period.label}`],
    [],
    taskHeaders,
  ];

  tasks.forEach((t, idx) => {
    let onTimeText = "Đang làm";
    if (t.isOnTime === true) onTimeText = "Đúng hạn";
    else if (t.isOnTime === false) onTimeText = "Quá hạn";

    let diffText = "—";
    if (t.daysLateOrEarly != null) {
      if (t.daysLateOrEarly < 0) diffText = `Sớm ${Math.abs(t.daysLateOrEarly)} ngày`;
      else if (t.daysLateOrEarly > 0) diffText = `Trễ ${t.daysLateOrEarly} ngày`;
      else diffText = "Đúng ngày";
    }

    taskRows.push([
      idx + 1,
      t.id,
      t.title,
      t.workTitle || "—",
      t.componentName || "—",
      t.group || "—",
      t.stageType || "—",
      formatDateDDMMYYYY(t.receivedAt),
      formatDateDDMMYYYY(t.dueDate),
      formatDateDDMMYYYY(t.completedAt),
      onTimeText,
      diffText,
      `${t.progress}%`,
      t.status,
    ]);
  });

  const wsTasks = XLSX.utils.aoa_to_sheet(taskRows);
  wsTasks["!cols"] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 36 },
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 13 },
    { wch: 13 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(workbook, wsTasks, "Bảng kê Công việc");

  const fileName = `KDPD_BaoCao_CaNhan_${user.displayName.replace(/\s+/g, "_")}_${period.value}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return { ok: true, fileName };
}

// =============================================================================
// 2. XUẤT EXCEL BÁO CÁO NHÓM NGHIỆP VỤ (3 Sheets: Tổng quan + Nhân sự + Danh mục)
// =============================================================================

export async function exportDepartmentReportToExcel(
  data: DepartmentReportData,
  aiInsights?: ReportAIInsightsData | null,
): Promise<{ ok: boolean; fileName: string }> {
  const XLSX = await loadXLSX();
  const { group, period, summary, workloadByMember, specializedMetrics, tasks } = data;

  const workbook = XLSX.utils.book_new();

  // ---------- SHEET 1: TỔNG QUAN NHÓM ----------
  const overviewRows: (string | number)[][] = [
    ["DỰ ÁN KINH ĐIỂN PHƯƠNG ĐÔNG (KDPD)"],
    [`BÁO CÁO TIẾN ĐỘ & HOẠT ĐỘNG: ${group.name.toUpperCase()}`],
    [],
    ["Nhóm nghiệp vụ:", group.name],
    ["Mã nhóm:", group.code],
    ["Chu kỳ báo cáo:", period.label],
    ["Khoảng thời gian:", `${formatDateDDMMYYYY(period.startDate)} - ${formatDateDDMMYYYY(period.endDate)}`],
    ["Thời điểm xuất:", formatDateDDMMYYYY(new Date())],
    [],
    ["I. CHỈ SỐ HOẠT ĐỘNG CHUNG"],
    ["Chỉ số đo lường", "Số lượng / Tỷ lệ", "Ghi chú"],
    ["Tổng số đầu việc của nhóm", summary.totalTasks, "Đầu việc"],
    ["Số việc đã hoàn thành", summary.completedCount, `Tỷ lệ ${summary.completionRate}%`],
    ["Số việc đang triển khai", summary.inProgressCount, ""],
    ["Số việc chưa bắt đầu", summary.notStartedCount, ""],
    ["Tỷ lệ đúng hạn trung bình nhóm", `${summary.onTimeRate}%`, "Đo lường trên các việc đã xong"],
    ["Số việc quá hạn", summary.overdueCount, summary.overdueCount > 0 ? "Cần rà soát" : "Đảm bảo tiến độ"],
    ["Tổng số nhân sự tham gia", summary.totalMembers, "Thành viên"],
  ];

  // Bổ sung chỉ số chuyên biệt
  if (specializedMetrics.roundTypeBreakdown) {
    overviewRows.push([]);
    overviewRows.push(["II. TIẾN ĐỘ CÁC VÒNG BÔNG (BAN BIÊN TẬP)"]);
    overviewRows.push(["Vòng bông", "Tổng số việc", "Đã xong", "Tỷ lệ"]);
    specializedMetrics.roundTypeBreakdown.forEach((r) => {
      const rate = r.count > 0 ? Math.round((r.completed / r.count) * 100) : 0;
      overviewRows.push([r.roundType, r.count, r.completed, `${rate}%`]);
    });
    overviewRows.push(["Số lần yêu cầu sửa chữa / Redo:", specializedMetrics.redoCount || 0, "Lượt"]);
  }

  if (specializedMetrics.totalContractValue != null) {
    overviewRows.push([]);
    overviewRows.push(["II. TỔNG HỢP TÀI CHÍNH HỢP PHẦN (THƯ KÝ)"]);
    overviewRows.push(["Chỉ tiêu tài chính", "Số tiền (VNĐ)", "Đơn vị"]);
    overviewRows.push(["Tổng giá trị hợp đồng dịch", formatNumberAccounting(specializedMetrics.totalContractValue), "đồng"]);
    overviewRows.push(["Tổng số tiền đã tạm ứng", formatNumberAccounting(specializedMetrics.totalAdvanced), "đồng"]);
    overviewRows.push(["Tổng số tiền đã quyết toán", formatNumberAccounting(specializedMetrics.totalSettled), "đồng"]);
  }

  // Bổ sung Nhận định của Trợ lý AI nếu có
  if (aiInsights) {
    overviewRows.push(
      [],
      ["III. NHẬN ĐỊNH CỦA TRỢ LÝ TRÍ TUỆ NHÂN TẠO (AI INSIGHTS)"],
      ["Mô hình phân tích:", aiInsights.engine === "gemini-2.5-flash" ? "Google Gemini 2.5 Flash" : "KDPD Expert Rule-Engine"],
      [],
      ["1. Đánh giá tổng quan:"],
      [aiInsights.summaryParagraph],
      [],
      ["2. Điểm sáng & Thành tựu nổi bật:"],
      ...aiInsights.highlights.map((h) => [`• ${h}`]),
      [],
      ["3. Nút thắt cổ chai & Rủi ro trễ hạn:"],
      ...aiInsights.bottlenecks.map((b) => [`• ${b}`]),
      [],
      ["4. Khuyến nghị hành động cụ thể:"],
      ...aiInsights.recommendations.map((r) => [`• ${r}`]),
    );
  }

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
  wsOverview["!cols"] = [{ wch: 32 }, { wch: 28 }, { wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, wsOverview, "Tổng quan Nhóm");

  // ---------- SHEET 2: MA TRẬN TẢI TRỌNG NHÂN SỰ ----------
  const memberHeaders = [
    "STT",
    "Họ và tên nhân sự",
    "Phòng ban / Đơn vị",
    "Việc được giao",
    "Đã hoàn thành",
    "Đang thực hiện",
    "Quá hạn",
    "Tỷ lệ đúng hạn (%)",
    "Trạng thái tải trọng",
  ];

  const memberRows: (string | number)[][] = [
    [`BẢNG MA TRẬN PHÂN BỔ TẢI TRỌNG NHÂN SỰ: ${group.name.toUpperCase()}`],
    [`Kỳ báo cáo: ${period.label}`],
    [],
    memberHeaders,
  ];

  workloadByMember.forEach((m, idx) => {
    let statusLabel = "Bình thường";
    if (m.workloadStatus === "low") statusLabel = "Nhàn rỗi";
    else if (m.workloadStatus === "high") statusLabel = "Tải cao";
    else if (m.workloadStatus === "overloaded") statusLabel = "Quá tải (Cần hỗ trợ)";

    memberRows.push([
      idx + 1,
      m.displayName,
      m.department || "—",
      m.totalAssigned,
      m.completedCount,
      m.inProgressCount,
      m.overdueCount,
      `${m.onTimeRate}%`,
      statusLabel,
    ]);
  });

  const wsMembers = XLSX.utils.aoa_to_sheet(memberRows);
  wsMembers["!cols"] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsMembers, "Ma trận Tải trọng");

  // ---------- SHEET 3: DANH MỤC CÔNG VIỆC NHÓM ----------
  const taskHeaders = [
    "STT",
    "Mã việc",
    "Tiêu đề công việc",
    "Tác phẩm",
    "Hợp phần",
    "Ngày tạo",
    "Mức ưu tiên",
    "Tiến độ (%)",
    "Trạng thái",
  ];

  const taskRows: (string | number)[][] = [
    [`DANH MỤC CÔNG VIỆC NHÓM ${group.name.toUpperCase()}`],
    [],
    taskHeaders,
  ];

  tasks.forEach((t, idx) => {
    taskRows.push([
      idx + 1,
      t.id,
      t.title,
      t.workTitle || "—",
      t.componentName || "—",
      formatDateDDMMYYYY(t.receivedAt),
      t.priority,
      `${t.progress}%`,
      t.status,
    ]);
  });

  const wsTasks = XLSX.utils.aoa_to_sheet(taskRows);
  wsTasks["!cols"] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 38 },
    { wch: 26 },
    { wch: 20 },
    { wch: 13 },
    { wch: 14 },
    { wch: 12 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsTasks, "Danh mục Công việc");

  const fileName = `KDPD_BaoCao_Nhom_${group.code}_${period.value}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return { ok: true, fileName };
}

// =============================================================================
// 3. XUẤT EXCEL BÁO CÁO TOÀN THỂ TỔ CHỨC (3 Sheets: Tổng quan + Hợp phần + Rủi ro)
// =============================================================================

export async function exportOrganizationReportToExcel(
  data: OrganizationReportData,
  aiInsights?: ReportAIInsightsData | null,
): Promise<{ ok: boolean; fileName: string }> {
  const XLSX = await loadXLSX();
  const { summary, componentsProgress, financialOverview, criticalRisks, period } = data;

  const workbook = XLSX.utils.book_new();

  // ---------- SHEET 1: TỔNG QUAN DỰ ÁN & TÀI CHÍNH ----------
  const overviewRows: (string | number)[][] = [
    ["DỰ ÁN KINH ĐIỂN PHƯƠNG ĐÔNG (KDPD)"],
    ["BÁO CÁO TỔNG THỂ TIẾN ĐỘ & QUẢN TRỊ TOÀN DỰ ÁN"],
    [],
    ["Chu kỳ báo cáo:", period.label],
    ["Khoảng thời gian:", `${formatDateDDMMYYYY(period.startDate)} - ${formatDateDDMMYYYY(period.endDate)}`],
    ["Thời điểm xuất:", formatDateDDMMYYYY(new Date())],
    [],
    ["I. CHỈ SỐ TIẾN ĐỘ TỔNG THỂ DỰ ÁN"],
    ["Chỉ số đo lường", "Số lượng / Tỷ lệ", "Ghi chú"],
    ["Tổng số tác phẩm toàn dự án", summary.totalWorks, "Tác phẩm trong danh mục"],
    ["Tổng số nhiệm vụ toàn hệ thống", summary.totalTasks, "Tác vụ điều phối"],
    ["Số nhiệm vụ đã hoàn thành", summary.completedTasks, `Đạt ${summary.systemCompletionRate}%`],
    ["Tỷ lệ đúng hạn toàn hệ thống", `${summary.systemOnTimeRate}%`, "Chỉ số sức khỏe vận hành"],
    ["Tổng số nhân sự hoạt động", summary.totalMembers, "Nhân sự"],
    ["Số điểm nóng rủi ro / chậm tiến độ", criticalRisks.length, criticalRisks.length > 0 ? "Cần can thiệp" : "Tốt"],
    [],
    ["II. BỨC TRANH TÀI CHÍNH & GIẢI NGÂN (VNĐ)"],
    ["Khoản mục tài chính", "Số tiền (VNĐ)", "Tỷ lệ giải ngân (%)"],
    [
      "Tổng ngân sách hợp đồng dịch & hiệu đính",
      formatNumberAccounting(financialOverview.totalContractValue),
      "100%",
    ],
    [
      "Số tiền đã tạm ứng",
      formatNumberAccounting(financialOverview.totalAdvanced),
      `${financialOverview.totalContractValue > 0 ? Math.round((financialOverview.totalAdvanced / financialOverview.totalContractValue) * 100) : 0}%`,
    ],
    [
      "Số tiền đã thanh quyết toán",
      formatNumberAccounting(financialOverview.totalSettled),
      `${financialOverview.totalContractValue > 0 ? Math.round((financialOverview.totalSettled / financialOverview.totalContractValue) * 100) : 0}%`,
    ],
    [
      "Tổng số tiền đã chi trả thực tế",
      formatNumberAccounting(financialOverview.totalPaid),
      `${financialOverview.totalContractValue > 0 ? Math.round((financialOverview.totalPaid / financialOverview.totalContractValue) * 100) : 0}%`,
    ],
    [
      "Dư nợ cam kết còn lại cần bố trí vốn",
      formatNumberAccounting(financialOverview.totalOutstanding),
      "",
    ],
  ];

  // Bổ sung Nhận định của Trợ lý AI nếu có
  if (aiInsights) {
    overviewRows.push(
      [],
      ["III. NHẬN ĐỊNH CỦA TRỢ LÝ TRÍ TUỆ NHÂN TẠO (AI INSIGHTS)"],
      ["Mô hình phân tích:", aiInsights.engine === "gemini-2.5-flash" ? "Google Gemini 2.5 Flash" : "KDPD Expert Rule-Engine"],
      [],
      ["1. Đánh giá tổng quan:"],
      [aiInsights.summaryParagraph],
      [],
      ["2. Điểm sáng & Thành tựu nổi bật:"],
      ...aiInsights.highlights.map((h) => [`• ${h}`]),
      [],
      ["3. Nút thắt cổ chai & Rủi ro trễ hạn:"],
      ...aiInsights.bottlenecks.map((b) => [`• ${b}`]),
      [],
      ["4. Khuyến nghị hành động cụ thể:"],
      ...aiInsights.recommendations.map((r) => [`• ${r}`]),
    );
  }

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
  wsOverview["!cols"] = [{ wch: 38 }, { wch: 28 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, wsOverview, "Tổng quan Dự án");

  // ---------- SHEET 2: TIẾN ĐỘ CÁC HỢP PHẦN CHIẾN LƯỢC ----------
  const compHeaders = [
    "STT",
    "Mã hợp phần",
    "Tên hợp phần chiến lược",
    "Tổng tác phẩm",
    "Đang triển khai",
    "Đã hoàn thành",
    "Dung lượng trang",
    "Dung lượng chữ",
    "HĐ Dịch thuật",
    "HĐ Hiệu đính",
  ];

  const compRows: (string | number)[][] = [
    ["BẢNG THEO DÕI TIẾN ĐỘ 6 HỢP PHẦN CHIẾN LƯỢC"],
    [`Kỳ báo cáo: ${period.label}`],
    [],
    compHeaders,
  ];

  componentsProgress.forEach((cp, idx) => {
    compRows.push([
      idx + 1,
      cp.code,
      cp.name,
      cp.totalWorks,
      cp.inProgressWorks,
      cp.completedWorks,
      formatNumberAccounting(cp.totalEstimatedPages),
      formatNumberAccounting(cp.totalEstimatedWords),
      cp.translationContractsCount,
      cp.proofreadingContractsCount,
    ]);
  });

  const wsComponents = XLSX.utils.aoa_to_sheet(compRows);
  wsComponents["!cols"] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 30 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsComponents, "Tiến độ Hợp phần");

  // ---------- SHEET 3: RADAR CẢNH BÁO RỦI RO & QUÁ HẠN ----------
  const riskHeaders = [
    "STT",
    "Loại rủi ro",
    "Tên công việc / Tác phẩm / Hợp đồng",
    "Hợp phần / Nhóm",
    "Người phụ trách / Dịch giả",
    "Hạn nộp / Kết thúc",
    "Số ngày chậm trễ",
    "Mức độ cảnh báo",
  ];

  const riskRows: (string | number)[][] = [
    ["DANH MỤC ĐIỂM NÓNG RỦI RO & CHẬM TIẾN ĐỘ CẦN XỬ LÝ"],
    [],
    riskHeaders,
  ];

  criticalRisks.forEach((rk, idx) => {
    riskRows.push([
      idx + 1,
      rk.type === "contract_overdue" ? "Hợp đồng trễ hạn" : "Tác vụ quá hạn",
      rk.title,
      rk.groupOrComponent,
      rk.assigneeOrPartyB || "—",
      formatDateDDMMYYYY(rk.dueDate),
      `+${rk.daysOverdue} ngày`,
      rk.severity === "critical" ? "KHẨN CẤP" : "CẢNH BÁO",
    ]);
  });

  const wsRisks = XLSX.utils.aoa_to_sheet(riskRows);
  wsRisks["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 40 },
    { wch: 22 },
    { wch: 22 },
    { wch: 15 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsRisks, "Điểm nóng Rủi ro");

  const fileName = `KDPD_BaoCao_ToanToChuc_${period.value}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return { ok: true, fileName };
}
