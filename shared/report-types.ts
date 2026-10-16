/**
 * =============================================================================
 * KDPD AUTOMATED REPORTING SYSTEM: TYPE DEFINITIONS
 * =============================================================================
 * Định nghĩa kiểu dữ liệu chuẩn cho Hệ thống Báo cáo Tự động 3 cấp độ:
 * 1. Cấp Cá nhân (Personal Productivity)
 * 2. Cấp Nhóm nghiệp vụ (Departmental & Operational Workflow)
 * 3. Cấp Toàn thể Tổ chức (Executive & Governance)
 */

export type ReportPeriodType =
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom"
  | "all";

export interface ReportPeriodInfo {
  type: ReportPeriodType;
  value: string; // '2026-W42' | '2026-10' | '2026-Q4' | '2026' | 'custom' | 'all'
  startDate: string; // ISO Date YYYY-MM-DD
  endDate: string; // ISO Date YYYY-MM-DD
  label: string; // Hiển thị tiếng Việt: "Tháng 10/2026", "Quý IV/2026", "Năm 2026"...
}

// -----------------------------------------------------------------------------
// 1. BÁO CÁO CÁ NHÂN (Personal Report)
// -----------------------------------------------------------------------------
export interface PersonalReportSummary {
  totalAssigned: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  pendingCount: number;
  overdueCount: number;
  onTimeCount: number;
  onTimeRate: number; // 0 - 100 (%)
  completionRate: number; // 0 - 100 (%)
}

export interface PersonalRoleOutput {
  totalEstimatedPages: number;
  totalEstimatedWords: number;
  stageBreakdown: Array<{
    stageType: string;
    stageLabel: string;
    count: number;
    completed: number;
  }>;
}

export interface PersonalTaskItem {
  id: string;
  title: string;
  group: string | null;
  status: string;
  priority: string;
  progress: number;
  stageType: string | null;
  roundNumber: number | null;
  receivedAt: string | null;
  dueDate: string | null;
  completedAt: string | null;
  isOnTime: boolean | null; // true: đúng hạn, false: trễ hạn, null: đang làm
  daysLateOrEarly: number | null; // âm: xong sớm N ngày, dương: trễ N ngày
  workTitle: string | null;
  componentName: string | null;
  contractNumber: string | null;
}

export interface PersonalReportData {
  user: {
    id: string;
    displayName: string;
    email: string;
    department: string | null;
    avatarPath: string | null;
  };
  period: ReportPeriodInfo;
  summary: PersonalReportSummary;
  roleOutput: PersonalRoleOutput;
  tasks: PersonalTaskItem[];
  generatedAt: string;
}

// -----------------------------------------------------------------------------
// 2. BÁO CÁO NHÓM NGHIỆP VỤ (Department Report)
// -----------------------------------------------------------------------------
export interface DepartmentMemberWorkload {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  department: string | null;
  totalAssigned: number;
  completedCount: number;
  inProgressCount: number;
  overdueCount: number;
  onTimeRate: number;
  workloadStatus: "low" | "normal" | "high" | "overloaded";
}

export interface DepartmentReportData {
  group: {
    code: string;
    name: string;
    description: string | null;
  };
  period: ReportPeriodInfo;
  summary: {
    totalTasks: number;
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    pendingCount: number;
    overdueCount: number;
    onTimeRate: number;
    completionRate: number;
    totalMembers: number;
  };
  workloadByMember: DepartmentMemberWorkload[];
  specializedMetrics: {
    // Cho Biên tập: Vòng bông & Tỷ lệ làm lại
    roundTypeBreakdown?: Array<{
      roundType: string;
      count: number;
      completed: number;
    }>;
    redoCount?: number;
    // Cho Thư ký: Hợp phần, tác phẩm, hợp đồng, tài chính
    worksCountByStage?: Array<{ stage: string; count: number }>;
    totalContractValue?: number;
    totalAdvanced?: number;
    totalSettled?: number;
    // Cho CNTT / Thiết kế:
    taskTypeBreakdown?: Array<{ taskType: string; count: number }>;
  };
  tasks: PersonalTaskItem[];
  generatedAt: string;
}

// -----------------------------------------------------------------------------
// 3. BÁO CÁO TOÀN THỂ TỔ CHỨC (Organization Report)
// -----------------------------------------------------------------------------
export interface ComponentProgressItem {
  componentId: string;
  code: string;
  name: string;
  totalWorks: number;
  completedWorks: number;
  inProgressWorks: number;
  totalEstimatedPages: number;
  totalEstimatedWords: number;
  translationContractsCount: number;
  proofreadingContractsCount: number;
}

export interface OrganizationFinancialOverview {
  totalContractValue: number;
  totalAdvanced: number;
  totalSettled: number;
  totalPaid: number;
  totalOutstanding: number;
}

export interface CriticalRiskItem {
  type: "task_overdue" | "contract_overdue" | "stalled_work";
  id: string;
  title: string;
  code?: string;
  groupOrComponent: string;
  daysOverdue: number;
  dueDate: string | null;
  assigneeOrPartyB: string | null;
  severity: "medium" | "high" | "critical";
}

export interface OrganizationReportData {
  period: ReportPeriodInfo;
  summary: {
    totalWorks: number;
    worksByStage: Array<{ stage: string; count: number }>;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    systemOnTimeRate: number;
    systemCompletionRate: number;
    totalMembers: number;
  };
  componentsProgress: ComponentProgressItem[];
  financialOverview: OrganizationFinancialOverview;
  criticalRisks: CriticalRiskItem[];
  generatedAt: string;
}

// -----------------------------------------------------------------------------
// 4. BẢN NHẬN ĐỊNH TRÍ TUỆ NHÂN TẠO (AI Report Insights)
// -----------------------------------------------------------------------------
export type ReportScope = "personal" | "department" | "organization";

export interface ReportAIInsightsRequest {
  scope: ReportScope;
  targetId?: string; // userId | groupCode | 'all'
  reportData: PersonalReportData | DepartmentReportData | OrganizationReportData;
}

export interface ReportAIInsightsData {
  scope: ReportScope;
  generatedAt: string;
  engine: "gemini-2.5-flash" | "kdpd-expert-heuristics";
  hasApiKey: boolean;
  highlights: string[]; // Các điểm sáng & thành tựu nổi bật
  bottlenecks: string[]; // Các điểm nghẽn & rủi ro phát hiện
  recommendations: string[]; // Khuyến nghị hành động cụ thể
  summaryParagraph: string; // Đoạn văn tổng kết hành chính ngắn gọn
}
