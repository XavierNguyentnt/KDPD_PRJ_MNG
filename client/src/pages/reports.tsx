import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/hooks/use-tasks";
import {
  usePersonalReport,
  useDepartmentReport,
  useOrganizationReport,
  useReportAIInsights,
  useReportSnapshots,
  useCreateReportSnapshot,
} from "@/hooks/use-reports";
import { ReportPeriodPicker } from "@/components/reports/ReportPeriodPicker";
import { PersonalReportView } from "@/components/reports/PersonalReportView";
import { DepartmentReportView } from "@/components/reports/DepartmentReportView";
import { OrganizationReportView } from "@/components/reports/OrganizationReportView";
import { ReportAiInsightsCard } from "@/components/reports/ReportAiInsightsCard";
import {
  ReportPrintHeader,
  ReportPrintSignatures,
} from "@/components/reports/ReportPrintTemplate";
import {
  ReportSnapshotLockDialog,
  ReportSnapshotsHistoryDialog,
} from "@/components/reports/ReportSnapshotModals";
import {
  exportPersonalReportToExcel,
  exportDepartmentReportToExcel,
  exportOrganizationReportToExcel,
} from "@/lib/report-excel-exporter";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FullPageSkeleton } from "@/components/ui/skeletons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileSpreadsheet,
  User,
  Users,
  Building2,
  RefreshCw,
  Printer,
  AlertCircle,
  Download,
  Sparkles,
  Lock,
  History,
} from "lucide-react";
import type { ReportPeriodType, ReportAIInsightsData } from "@shared/report-types";
import type { ReportSnapshot } from "@shared/schema";

export default function ReportsPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const isAdminOrManager = role === UserRole.ADMIN || role === UserRole.MANAGER;

  // 1. Quản lý trạng thái Cấp độ báo cáo (Scope)
  const [activeScope, setActiveScope] = useState<
    "personal" | "department" | "organization"
  >("personal");

  // 2. Quản lý trạng thái Chu kỳ báo cáo (Period)
  const [periodType, setPeriodType] = useState<ReportPeriodType>("month");
  const now = new Date();
  const [periodValue, setPeriodValue] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();

  // 3. Quản lý nhóm được chọn khi ở Cấp Nhóm
  const [activeGroupCode, setActiveGroupCode] = useState<string>("bien_tap");

  // 4. Trạng thái xuất file, AI Insights Map & Dialogs
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [aiInsightsMap, setAiInsightsMap] = useState<Record<string, ReportAIInsightsData>>({});
  const [isLockDialogOpen, setIsLockDialogOpen] = useState<boolean>(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState<boolean>(false);

  // 5. Các Query Hooks
  const queryParams = {
    periodType,
    periodValue,
    startDate: customStart,
    endDate: customEnd,
  };

  const personalQuery = usePersonalReport(
    queryParams,
    activeScope === "personal",
  );

  const departmentQuery = useDepartmentReport(
    activeGroupCode,
    queryParams,
    activeScope === "department",
  );

  const organizationQuery = useOrganizationReport(
    queryParams,
    activeScope === "organization",
  );

  const aiInsightsMutation = useReportAIInsights();
  const createSnapshotMutation = useCreateReportSnapshot();
  const snapshotsQuery = useReportSnapshots({ scope: activeScope });

  const isCurrentLoading =
    (activeScope === "personal" && personalQuery.isLoading) ||
    (activeScope === "department" && departmentQuery.isLoading) ||
    (activeScope === "organization" && organizationQuery.isLoading);

  const isCurrentError =
    (activeScope === "personal" && personalQuery.isError) ||
    (activeScope === "department" && departmentQuery.isError) ||
    (activeScope === "organization" && organizationQuery.isError);

  const currentErrorMsg =
    personalQuery.error?.message ||
    departmentQuery.error?.message ||
    organizationQuery.error?.message ||
    "Không thể tải dữ liệu báo cáo.";

  const handlePeriodChange = (
    type: ReportPeriodType,
    val: string,
    start?: string,
    end?: string,
  ) => {
    setPeriodType(type);
    setPeriodValue(val);
    setCustomStart(start);
    setCustomEnd(end);
  };

  const handleRefresh = () => {
    if (activeScope === "personal") personalQuery.refetch();
    else if (activeScope === "department") departmentQuery.refetch();
    else if (activeScope === "organization") organizationQuery.refetch();
  };

  const handlePrint = () => {
    window.print();
  };

  // Tính key cho bản nhận định AI hiện tại
  const currentAiKey =
    activeScope === "personal"
      ? "personal"
      : activeScope === "department"
      ? `department_${activeGroupCode}`
      : "organization";

  const currentAiInsights = aiInsightsMap[currentAiKey];

  // Khởi tạo / Làm mới nhận định AI
  const handleGenerateAiInsights = async () => {
    try {
      let currentData: any = null;
      let targetId: string | undefined = undefined;

      if (activeScope === "personal") {
        currentData = personalQuery.data;
      } else if (activeScope === "department") {
        currentData = departmentQuery.data;
        targetId = activeGroupCode;
      } else if (activeScope === "organization") {
        currentData = organizationQuery.data;
      }

      if (!currentData) {
        toast({
          variant: "destructive",
          title: "Chưa có dữ liệu",
          description: "Dữ liệu báo cáo chưa sẵn sàng để AI phân tích.",
        });
        return;
      }

      const res = await aiInsightsMutation.mutateAsync({
        scope: activeScope,
        targetId,
        reportData: currentData,
      });

      setAiInsightsMap((prev) => ({
        ...prev,
        [currentAiKey]: res,
      }));

      toast({
        title: "Khởi tạo nhận định AI thành công",
        description: `Trợ lý (${res.engine === "gemini-2.5-flash" ? "Gemini 2.5 Flash" : "Chuyên gia KDPD"}) đã hoàn tất phân tích.`,
      });
    } catch (err: any) {
      console.error("Lỗi tạo AI Insights:", err);
      toast({
        variant: "destructive",
        title: "Lỗi phân tích AI",
        description: err?.message || "Không thể khởi tạo nhận định trí tuệ nhân tạo.",
      });
    }
  };

  // Xác nhận chốt sổ & Khóa dữ liệu
  const handleConfirmLock = async (notes?: string) => {
    try {
      let currentData: any = null;
      let targetId: string | undefined = undefined;

      if (activeScope === "personal") {
        currentData = personalQuery.data;
      } else if (activeScope === "department") {
        currentData = departmentQuery.data;
        targetId = activeGroupCode;
      } else if (activeScope === "organization") {
        currentData = organizationQuery.data;
        targetId = "all";
      }

      if (!currentData) {
        toast({
          variant: "destructive",
          title: "Chưa có dữ liệu",
          description: "Báo cáo chưa tải xong số liệu để chốt sổ.",
        });
        return;
      }

      await createSnapshotMutation.mutateAsync({
        scope: activeScope,
        targetId,
        periodType,
        periodValue,
        periodLabel: currentPeriodLabel,
        summaryData: currentData,
        aiInsights: currentAiInsights || null,
        notes,
      });

      snapshotsQuery.refetch();

      toast({
        title: "Chốt sổ báo cáo thành công",
        description: `Đã lưu trữ bất biến số liệu kỳ ${currentPeriodLabel} vào cơ sở dữ liệu lịch sử.`,
      });
    } catch (err: any) {
      console.error("Lỗi chốt sổ:", err);
      toast({
        variant: "destructive",
        title: "Lỗi chốt sổ",
        description: err?.message || "Không thể lưu trữ bản chốt sổ báo cáo.",
      });
    }
  };

  // Xuất Excel từ bản Snapshot lịch sử
  const handleExportSnapshotExcel = async (snapshot: ReportSnapshot) => {
    try {
      setIsExporting(true);
      let res: { ok: boolean; fileName: string } | null = null;
      if (snapshot.scope === "personal") {
        res = await exportPersonalReportToExcel(snapshot.summaryData as any, snapshot.aiInsights as any);
      } else if (snapshot.scope === "department") {
        res = await exportDepartmentReportToExcel(snapshot.summaryData as any, snapshot.aiInsights as any);
      } else if (snapshot.scope === "organization") {
        res = await exportOrganizationReportToExcel(snapshot.summaryData as any, snapshot.aiInsights as any);
      }

      if (res?.ok) {
        toast({
          title: "Xuất file Excel thành công",
          description: `Đã kết xuất báo cáo lịch sử "${res.fileName}".`,
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Lỗi xuất file",
        description: err?.message || "Không thể kết xuất dữ liệu lịch sử.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      let res: { ok: boolean; fileName: string } | null = null;

      if (activeScope === "personal") {
        if (!personalQuery.data) {
          toast({
            variant: "destructive",
            title: "Chưa có dữ liệu",
            description: "Dữ liệu báo cáo cá nhân chưa sẵn sàng để xuất Excel.",
          });
          return;
        }
        res = await exportPersonalReportToExcel(personalQuery.data, currentAiInsights);
      } else if (activeScope === "department") {
        if (!departmentQuery.data) {
          toast({
            variant: "destructive",
            title: "Chưa có dữ liệu",
            description: "Dữ liệu báo cáo nhóm nghiệp vụ chưa sẵn sàng để xuất Excel.",
          });
          return;
        }
        res = await exportDepartmentReportToExcel(departmentQuery.data, currentAiInsights);
      } else if (activeScope === "organization") {
        if (!organizationQuery.data) {
          toast({
            variant: "destructive",
            title: "Chưa có dữ liệu",
            description: "Dữ liệu báo cáo toàn thể tổ chức chưa sẵn sàng để xuất Excel.",
          });
          return;
        }
        res = await exportOrganizationReportToExcel(organizationQuery.data, currentAiInsights);
      }

      if (res?.ok) {
        toast({
          title: "Xuất file Excel thành công",
          description: `Đã hoàn tất kết xuất tập tin "${res.fileName}" kèm nhận định AI.`,
        });
      }
    } catch (err: any) {
      console.error("Lỗi xuất Excel báo cáo:", err);
      toast({
        variant: "destructive",
        title: "Lỗi kết xuất Excel",
        description: err?.message || "Không thể khởi tạo tập tin bảng tính.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Thông tin phục vụ Header và Chữ ký in ấn
  const currentPeriodLabel =
    (activeScope === "personal"
      ? personalQuery.data?.period.label
      : activeScope === "department"
      ? departmentQuery.data?.period.label
      : organizationQuery.data?.period.label) || "Kỳ báo cáo";

  const currentDateRange =
    activeScope === "personal" && personalQuery.data
      ? `${formatDateDDMMYYYY(personalQuery.data.period.startDate)} - ${formatDateDDMMYYYY(personalQuery.data.period.endDate)}`
      : activeScope === "department" && departmentQuery.data
      ? `${formatDateDDMMYYYY(departmentQuery.data.period.startDate)} - ${formatDateDDMMYYYY(departmentQuery.data.period.endDate)}`
      : activeScope === "organization" && organizationQuery.data
      ? `${formatDateDDMMYYYY(organizationQuery.data.period.startDate)} - ${formatDateDDMMYYYY(organizationQuery.data.period.endDate)}`
      : "";

  const printTitle =
    activeScope === "personal"
      ? "BÁO CÁO KẾT QUẢ THỰC HIỆN NHIỆM VỤ CÁ NHÂN"
      : activeScope === "department"
      ? `BÁO CÁO TỔNG HỢP TIẾN ĐỘ & HIỆU SUẤT NHÓM ${departmentQuery.data?.group.name?.toUpperCase() || "NGHIỆP VỤ"}`
      : "BÁO CÁO TỔNG THỂ TIẾN ĐỘ & TÀI CHÍNH DỰ ÁN KINH ĐIỂN PHƯƠNG ĐÔNG";

  const printDepartment =
    activeScope === "personal"
      ? personalQuery.data?.user.department || undefined
      : activeScope === "department"
      ? departmentQuery.data?.group.name
      : undefined;

  const printAuthor =
    activeScope === "personal"
      ? personalQuery.data?.user.displayName
      : user?.displayName;

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto px-4 sm:px-6">
      {/* HEADER SECTION (HIỂN THỊ TRÊN MÀN HÌNH WEB) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Trung tâm Báo cáo Công việc
            </h1>
            <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20">
              V.1 Tự động + AI + Chốt sổ
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Báo cáo tự động 3 cấp độ kèm trợ lý phân tích Gemini AI và cơ chế Chốt sổ lịch sử cho KDPD
          </p>
        </div>

        {/* NÚT TÁC VỤ NHANH */}
        <div className="flex items-center flex-wrap gap-2 self-start md:self-auto">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={handleRefresh}
            disabled={isCurrentLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCurrentLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setIsHistoryDialogOpen(true)}
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử Chốt sổ
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 border-amber-600/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            onClick={() => setIsLockDialogOpen(true)}
            disabled={isCurrentLoading}
          >
            <Lock className="w-3.5 h-3.5" />
            Chốt sổ kỳ này
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleGenerateAiInsights}
            disabled={isCurrentLoading || aiInsightsMutation.isPending}
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiInsightsMutation.isPending ? "animate-spin" : ""}`} />
            {aiInsightsMutation.isPending ? "Đang phân tích..." : "Nhận định AI"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            onClick={handleExportExcel}
            disabled={isExporting || isCurrentLoading}
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? "animate-bounce" : ""}`} />
            {isExporting ? "Đang xuất Excel..." : "Tải file Excel"}
          </Button>

          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            onClick={handlePrint}
            disabled={isCurrentLoading}
          >
            <Printer className="w-3.5 h-3.5" />
            In A4 / Xuất PDF
          </Button>
        </div>
      </div>

      {/* THANH ĐIỀU HƯỚNG CẤP ĐỘ (SCOPE) & BỘ CHỌN KỲ (PERIOD PICKER) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 rounded-xl bg-card border border-border/70 shadow-xs print:hidden">
        {/* Chọn Cấp độ (3 Tabs) */}
        <div className="flex items-center rounded-lg bg-muted/60 p-1 border border-border/60">
          <Button
            type="button"
            size="sm"
            variant={activeScope === "personal" ? "default" : "ghost"}
            className="h-8 px-3 text-xs font-medium gap-1.5"
            onClick={() => setActiveScope("personal")}
          >
            <User className="w-3.5 h-3.5" />
            Cá nhân
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeScope === "department" ? "default" : "ghost"}
            className="h-8 px-3 text-xs font-medium gap-1.5"
            onClick={() => setActiveScope("department")}
          >
            <Users className="w-3.5 h-3.5" />
            Nhóm nghiệp vụ
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeScope === "organization" ? "default" : "ghost"}
            className="h-8 px-3 text-xs font-medium gap-1.5"
            onClick={() => setActiveScope("organization")}
          >
            <Building2 className="w-3.5 h-3.5" />
            Toàn thể tổ chức
          </Button>
        </div>

        {/* Bộ chọn chu kỳ */}
        <ReportPeriodPicker
          periodType={periodType}
          periodValue={periodValue}
          startDate={customStart}
          endDate={customEnd}
          onChange={handlePeriodChange}
        />
      </div>

      {/* HEADER VĂN BẢN HÀNH CHÍNH CHUẨN MẪU KHỔ A4 (CHỈ HIỆN KHI IN ẤN) */}
      <ReportPrintHeader
        title={printTitle}
        scopeLabel={
          activeScope === "personal"
            ? "Cá nhân"
            : activeScope === "department"
            ? "Phòng ban"
            : "Toàn thể tổ chức"
        }
        periodLabel={currentPeriodLabel}
        dateRange={currentDateRange}
        authorName={printAuthor}
        departmentName={printDepartment}
      />

      {/* KHỐI TRỢ LÝ AI NHẬN ĐỊNH CHUYÊN MÔN (GEMINI INSIGHTS) */}
      {!isCurrentLoading && !isCurrentError && (
        <ReportAiInsightsCard
          insights={currentAiInsights}
          isLoading={aiInsightsMutation.isPending}
          onRefresh={handleGenerateAiInsights}
        />
      )}

      {/* NỘI DUNG CHÍNH (CONTENT AREA) */}
      {isCurrentLoading ? (
        <FullPageSkeleton />
      ) : isCurrentError ? (
        <Card className="border-red-200 dark:border-red-950/60 bg-red-50/20 py-8 print:hidden">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <h3 className="font-semibold text-foreground text-sm">
              Không thể tải dữ liệu báo cáo
            </h3>
            <p className="text-xs text-muted-foreground max-w-md">
              {currentErrorMsg}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs mt-2"
              onClick={handleRefresh}
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeScope === "personal" && personalQuery.data && (
            <PersonalReportView data={personalQuery.data} />
          )}

          {activeScope === "department" && departmentQuery.data && (
            <DepartmentReportView
              data={departmentQuery.data}
              activeGroupCode={activeGroupCode}
              onSelectGroup={setActiveGroupCode}
            />
          )}

          {activeScope === "organization" && organizationQuery.data && (
            <OrganizationReportView
              data={organizationQuery.data}
              isAdminOrManager={isAdminOrManager}
            />
          )}
        </>
      )}

      {/* CHỮ KÝ PHÊ DUYỆT CHUẨN THỂ THỨC HÀNH CHÍNH (CHỈ HIỆN KHI IN ẤN) */}
      <ReportPrintSignatures
        scope={activeScope}
        authorName={printAuthor}
        departmentName={printDepartment}
      />

      {/* DIALOG CHỐT SỔ KỲ BÁO CÁO */}
      <ReportSnapshotLockDialog
        open={isLockDialogOpen}
        onOpenChange={setIsLockDialogOpen}
        scope={activeScope}
        periodLabel={currentPeriodLabel}
        onConfirmLock={handleConfirmLock}
        isLoading={createSnapshotMutation.isPending}
      />

      {/* DIALOG LỊCH SỬ CHỐT SỔ */}
      <ReportSnapshotsHistoryDialog
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        snapshots={snapshotsQuery.data || []}
        isLoading={snapshotsQuery.isLoading}
        onExportExcelSnapshot={handleExportSnapshotExcel}
      />
    </div>
  );
}
