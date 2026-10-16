import "dotenv/config";
import { pool } from "../server/db";
import {
  resolvePeriodInfo,
  generatePersonalReport,
  generateDepartmentReport,
  generateOrganizationReport,
} from "../server/services/report-generator";

async function runTest() {
  console.log("=== BẮT ĐẦU KIỂM THỬ BACKEND REPORT AGGREGATOR SERVICE ===");
  if (!pool) {
    console.error("Pool không khả dụng!");
    process.exit(1);
  }

  try {
    // 1. Lấy 1 user mẫu từ database
    const userRes = await pool.query("SELECT id, display_name, email FROM users WHERE is_active = true LIMIT 1");
    if (userRes.rows.length === 0) {
      console.log("Không có user nào trong database để test");
      process.exit(0);
    }
    const sampleUser = userRes.rows[0];
    console.log(`\n1. Kiểm thử Báo cáo Cá nhân cho: ${sampleUser.display_name} (${sampleUser.email})`);

    const monthPeriod = resolvePeriodInfo("month", "2026-10");
    console.log(`   Chu kỳ: ${monthPeriod.label} (${monthPeriod.startDate} -> ${monthPeriod.endDate})`);

    const personalReport = await generatePersonalReport(sampleUser.id, monthPeriod);
    console.log("   Kết quả cá nhân:");
    console.log(`   - Tổng việc được giao: ${personalReport.summary.totalAssigned}`);
    console.log(`   - Đã hoàn thành: ${personalReport.summary.completedCount}`);
    console.log(`   - Tỷ lệ đúng hạn: ${personalReport.summary.onTimeRate}%`);
    console.log(`   - Số trang quy đổi ước tính: ${personalReport.roleOutput.totalEstimatedPages}`);
    console.log(`   - Số đầu việc chi tiết trả về: ${personalReport.tasks.length}`);

    // 2. Kiểm thử Báo cáo Nhóm nghiệp vụ
    console.log("\n2. Kiểm thử Báo cáo Nhóm nghiệp vụ (Ban Biên tập - bien_tap):");
    const deptReportBT = await generateDepartmentReport("bien_tap", monthPeriod);
    console.log(`   - Nhóm: ${deptReportBT.group.name}`);
    console.log(`   - Tổng công việc nhóm: ${deptReportBT.summary.totalTasks}`);
    console.log(`   - Số thành viên có việc: ${deptReportBT.workloadByMember.length}`);
    console.log(`   - Thống kê vòng bông:`, deptReportBT.specializedMetrics.roundTypeBreakdown || "N/A");

    console.log("\n   Kiểm thử Báo cáo Nhóm Thư ký hợp phần (thu_ky_hop_phan):");
    const deptReportTK = await generateDepartmentReport("thu_ky_hop_phan", monthPeriod);
    console.log(`   - Nhóm: ${deptReportTK.group.name}`);
    console.log(`   - Tổng giá trị hợp đồng dịch thuật: ${deptReportTK.specializedMetrics.totalContractValue?.toLocaleString("vi-VN")} đ`);
    console.log(`   - Tổng tạm ứng đã chi: ${deptReportTK.specializedMetrics.totalAdvanced?.toLocaleString("vi-VN")} đ`);

    // 3. Kiểm thử Báo cáo Toàn thể Tổ chức
    console.log("\n3. Kiểm thử Báo cáo Toàn thể Tổ chức (Organization Report):");
    const orgReport = await generateOrganizationReport(monthPeriod);
    console.log(`   - Tổng tác phẩm: ${orgReport.summary.totalWorks}`);
    console.log(`   - Số hợp phần chiến lược: ${orgReport.componentsProgress.length}`);
    orgReport.componentsProgress.forEach((cp) => {
      console.log(`     * [${cp.code}] ${cp.name}: ${cp.totalWorks} tác phẩm, ${cp.completedWorks} hoàn thành, ${cp.totalEstimatedPages} trang.`);
    });
    console.log(`   - Tổng ngân sách hợp đồng: ${orgReport.financialOverview.totalContractValue.toLocaleString("vi-VN")} đ`);
    console.log(`   - Tổng tiền đã thanh toán: ${orgReport.financialOverview.totalPaid.toLocaleString("vi-VN")} đ`);
    console.log(`   - Dư nợ còn lại: ${orgReport.financialOverview.totalOutstanding.toLocaleString("vi-VN")} đ`);
    console.log(`   - Số điểm nóng rủi ro / quá hạn phát hiện: ${orgReport.criticalRisks.length}`);
    if (orgReport.criticalRisks.length > 0) {
      console.log(`     * Ví dụ rủi ro top 1: ${orgReport.criticalRisks[0].title} (Trễ ${orgReport.criticalRisks[0].daysOverdue} ngày)`);
    }

    // 4. Kiểm thử Dịch vụ Trí tuệ Nhân tạo (Gemini AI Insights)
    console.log("\n4. Kiểm thử Dịch vụ Trí tuệ Nhân tạo (AI Insights Service):");
    const { generateReportAIInsights } = await import("../server/services/report-ai-insights");

    console.log("   a) AI Insights Báo cáo Cá nhân:");
    const personalAi = await generateReportAIInsights("personal", personalReport);
    console.log(`      Engine: ${personalAi.engine} | Có API Key: ${personalAi.hasApiKey}`);
    console.log(`      Tóm tắt: "${personalAi.summaryParagraph}"`);
    console.log(`      Điểm sáng: ${personalAi.highlights.length} mục`);
    console.log(`      Nút thắt: ${personalAi.bottlenecks.length} mục`);
    console.log(`      Khuyến nghị: ${personalAi.recommendations.length} mục`);

    console.log("\n   b) AI Insights Báo cáo Toàn thể Tổ chức:");
    const orgAi = await generateReportAIInsights("organization", orgReport);
    console.log(`      Engine: ${orgAi.engine}`);
    console.log(`      Tóm tắt: "${orgAi.summaryParagraph}"`);
    console.log(`      Điểm sáng: ${orgAi.highlights[0]}`);
    console.log(`      Nút thắt: ${orgAi.bottlenecks[0]}`);
    console.log(`      Khuyến nghị: ${orgAi.recommendations[0]}`);

    console.log("\n=== TẤT CẢ KIỂM THỬ BACKEND AGGREGATOR & AI INSIGHTS HOÀN TOÀN THÀNH CÔNG! ===");
    process.exit(0);
  } catch (err) {
    console.error("Lỗi khi kiểm thử:", err);
    process.exit(1);
  }
}

runTest();
