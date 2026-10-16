import React from "react";
import type { OrganizationReportData } from "@shared/report-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LazyChart } from "@/components/ui/lazy-chart";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookOpen,
  DollarSign,
  ShieldAlert,
  Flame,
  Award,
} from "lucide-react";
import { formatNumberAccounting, formatDateDDMMYYYY } from "@/lib/utils";

interface OrganizationReportViewProps {
  data: OrganizationReportData;
  isAdminOrManager: boolean;
}

export function OrganizationReportView({
  data,
  isAdminOrManager,
}: OrganizationReportViewProps) {
  const { summary, componentsProgress, financialOverview, criticalRisks, period } = data;

  // Tính tỷ lệ giải ngân
  const disbursementRate =
    financialOverview.totalContractValue > 0
      ? Math.round(
          (financialOverview.totalPaid / financialOverview.totalContractValue) * 100,
        )
      : 0;

  // Dữ liệu biểu đồ so sánh số tác phẩm giữa các hợp phần
  const chartComponentsData = componentsProgress.map((cp) => ({
    name: cp.name.length > 20 ? cp.name.slice(0, 18) + "..." : cp.name,
    fullName: cp.name,
    "Tổng tác phẩm": cp.totalWorks,
    "Đang triển khai": cp.inProgressWorks,
    "Đã hoàn thành": cp.completedWorks,
  }));

  return (
    <div className="space-y-6">
      {/* 1. KHỐI 4 THẺ SCORECARD KPI TOÀN DỰ ÁN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Tổng tác phẩm */}
        <Card className="shadow-xs border-border/70 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tổng tác phẩm dự án
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summary.totalWorks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Phân bổ trên <strong className="text-foreground">{componentsProgress.length}</strong> hợp phần lớn
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Tiến độ nhiệm vụ */}
        <Card className="shadow-xs border-border/70 hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Nhiệm vụ đã hoàn thành
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {summary.completedTasks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đạt <strong className="text-foreground">{summary.systemCompletionRate}%</strong> trên {summary.totalTasks} việc
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Tỷ lệ đúng hạn hệ thống */}
        <Card className="shadow-xs border-border/70 hover:border-indigo-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Đúng hạn toàn hệ thống
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {summary.systemOnTimeRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chỉ số sức khỏe vận hành dự án
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Điểm nóng rủi ro */}
        <Card className="shadow-xs border-border/70 hover:border-red-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Điểm nóng cần can thiệp
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {criticalRisks.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Hợp đồng & tác vụ chậm tiến độ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. BỨC TRANH TÀI CHÍNH & GIẢI NGÂN DỰ ÁN (Dành cho Lãnh đạo / Admin / Manager) */}
      {isAdminOrManager && (
        <Card className="shadow-sm border-border/70 bg-gradient-to-r from-card via-card to-muted/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Bức tranh tài chính & Tiến độ giải ngân ngân sách
                </CardTitle>
                <CardDescription className="text-xs">
                  Tổng hợp giá trị hợp đồng dịch thuật & hiệu đính, số tiền đã giải ngân và dư nợ cam kết
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border-emerald-300">
                Tỷ lệ giải ngân: {disbursementRate}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
              <div>
                <span className="text-xs text-muted-foreground">Tổng ngân sách hợp đồng:</span>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {formatNumberAccounting(financialOverview.totalContractValue)} đ
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Đã tạm ứng:</span>
                <p className="text-lg font-bold text-blue-600 mt-0.5">
                  {formatNumberAccounting(financialOverview.totalAdvanced)} đ
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Đã thanh quyết toán:</span>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">
                  {formatNumberAccounting(financialOverview.totalSettled)} đ
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Dư nợ cam kết còn lại:</span>
                <p className="text-lg font-bold text-amber-600 mt-0.5">
                  {formatNumberAccounting(financialOverview.totalOutstanding)} đ
                </p>
              </div>
            </div>

            {/* Thanh tiến độ giải ngân */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Tiến độ dòng tiền giải ngân</span>
                <span>{formatNumberAccounting(financialOverview.totalPaid)} đ / {formatNumberAccounting(financialOverview.totalContractValue)} đ ({disbursementRate}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, disbursementRate)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. TIẾN ĐỘ THEO CÁC HỢP PHẦN CHIẾN LƯỢC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái (2/3): Bảng tiến độ các hợp phần */}
        <Card className="lg:col-span-2 shadow-sm border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Tiến độ theo 6 hợp phần chiến lược
            </CardTitle>
            <CardDescription className="text-xs">
              Số lượng tác phẩm, dung lượng trang và hợp đồng theo từng trục phân hệ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/60 overflow-hidden">
              <Table className="text-xs">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="min-w-[170px]">Hợp phần</TableHead>
                    <TableHead className="w-[85px] text-center">Tác phẩm</TableHead>
                    <TableHead className="w-[85px] text-center">Đang làm</TableHead>
                    <TableHead className="w-[85px] text-center">Đã xong</TableHead>
                    <TableHead className="w-[100px] text-right">Dung lượng</TableHead>
                    <TableHead className="w-[90px] text-center">Hợp đồng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {componentsProgress.map((cp) => (
                    <TableRow key={cp.componentId} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        {cp.name}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {cp.totalWorks}
                      </TableCell>
                      <TableCell className="text-center text-blue-600">
                        {cp.inProgressWorks}
                      </TableCell>
                      <TableCell className="text-center text-emerald-600 font-semibold">
                        {cp.completedWorks}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatNumberAccounting(cp.totalEstimatedPages)} trang
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {cp.translationContractsCount} HĐ
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Cột phải (1/3): Biểu đồ phân bổ tác phẩm */}
        <Card className="shadow-sm border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Tác phẩm theo hợp phần
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LazyChart height={260} variant="bar">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartComponentsData}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 35, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                  <ReTooltip
                    formatter={(val: any, name: any) => [`${val} tác phẩm`, name]}
                    contentStyle={{ borderRadius: "8px", fontSize: "11px" }}
                  />
                  <Bar dataKey="Tổng tác phẩm" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </LazyChart>
          </CardContent>
        </Card>
      </div>

      {/* 4. RADAR CẢNH BÁO ĐIỂM NÓNG RỦI RO & CHẬM TIẾN ĐỘ */}
      <Card className="shadow-sm border-red-200 dark:border-red-950/60 bg-red-50/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                <ShieldAlert className="w-4 h-4" />
                Radar cảnh báo rủi ro & chậm tiến độ ({criticalRisks.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Danh sách các hợp đồng và công việc quá hạn nghiêm trọng cần Ban Chủ nhiệm chỉ đạo xử lý
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/60 overflow-hidden bg-card">
            <Table className="text-xs">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[110px]">Loại rủi ro</TableHead>
                  <TableHead className="min-w-[220px]">Nội dung / Tác phẩm</TableHead>
                  <TableHead className="w-[140px]">Hợp phần / Nhóm</TableHead>
                  <TableHead className="w-[95px] text-center">Hạn chót</TableHead>
                  <TableHead className="w-[110px] text-center">Trễ hạn</TableHead>
                  <TableHead className="w-[100px] text-center">Mức độ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalRisks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-emerald-600 font-medium">
                      ✓ Tuyệt vời! Hiện tại không phát hiện điểm nóng rủi ro trễ hạn nghiêm trọng nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  criticalRisks.map((risk) => {
                    const isCritical = risk.severity === "critical";
                    return (
                      <TableRow key={risk.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-semibold ${risk.type === "contract_overdue" ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-red-50 text-red-700 border-red-300"}`}>
                            {risk.type === "contract_overdue" ? "Hợp đồng trễ" : "Tác vụ quá hạn"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {risk.title}
                          {risk.assigneeOrPartyB && (
                            <span className="text-[11px] text-muted-foreground block">
                              Người thực hiện: {risk.assigneeOrPartyB}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {risk.groupOrComponent}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {formatDateDDMMYYYY(risk.dueDate)}
                        </TableCell>
                        <TableCell className="text-center font-bold text-red-600">
                          +{risk.daysOverdue} ngày
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${isCritical ? "bg-red-600 text-white" : "bg-amber-100 text-amber-800"}`}>
                            {isCritical ? "KHẨN CẤP" : "CẢNH BÁO"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
