import React, { useState, useMemo } from "react";
import type { DepartmentReportData } from "@shared/report-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Briefcase,
  Layers,
  Coins,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { formatNumberAccounting, formatDateDDMMYYYY, getTaskStatusColor } from "@/lib/utils";

interface DepartmentReportViewProps {
  data: DepartmentReportData;
  activeGroupCode: string;
  onSelectGroup: (code: string) => void;
}

const DEPARTMENT_TABS = [
  { code: "bien_tap", label: "Ban Biên tập" },
  { code: "thu_ky_hop_phan", label: "Thư ký Hợp phần" },
  { code: "cntt", label: "CNTT & Dữ liệu" },
  { code: "thiet_ke", label: "Thiết kế & Chế bản" },
  { code: "cv_chung", label: "Công việc chung" },
];

export function DepartmentReportView({
  data,
  activeGroupCode,
  onSelectGroup,
}: DepartmentReportViewProps) {
  const { summary, workloadByMember, specializedMetrics, group, period, tasks } = data;

  // Dữ liệu cho biểu đồ cột so sánh tải trọng giữa các thành viên
  const chartData = useMemo(() => {
    return workloadByMember.map((m) => ({
      name: m.displayName.split(" ").slice(-2).join(" ") || m.displayName, // Rút gọn 2 từ cuối của tên
      fullDisplayName: m.displayName,
      "Hoàn thành": m.completedCount,
      "Đang làm": m.inProgressCount,
      "Quá hạn": m.overdueCount,
    }));
  }, [workloadByMember]);

  return (
    <div className="space-y-6">
      {/* 1. THANH CHỌN NHÓM NGHIỆP VỤ (ẨN KHI IN ẤN) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-muted/60 border border-border/60 print:hidden">
        {DEPARTMENT_TABS.map((tab) => (
          <Button
            key={tab.code}
            type="button"
            size="sm"
            variant={activeGroupCode === tab.code ? "default" : "ghost"}
            className="text-xs font-medium h-8 px-3"
            onClick={() => onSelectGroup(tab.code)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 2. KHỐI 4 THẺ SCORECARD KPI NHÓM */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Tổng đầu việc */}
        <Card className="shadow-xs border-border/70 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tổng đầu việc nhóm
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summary.totalTasks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đang làm: <strong className="text-foreground">{summary.inProgressCount}</strong> việc
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Đã hoàn thành */}
        <Card className="shadow-xs border-border/70 hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Đã hoàn thành
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {summary.completedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đạt <strong className="text-foreground">{summary.completionRate}%</strong> chỉ tiêu nhóm
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Tỷ lệ đúng hạn nhóm */}
        <Card className="shadow-xs border-border/70 hover:border-indigo-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Đúng hạn trung bình
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {summary.onTimeRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tính trên các đầu việc đã hoàn thành
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Thành viên tham gia */}
        <Card className="shadow-xs border-border/70 hover:border-amber-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Nhân sự nhóm
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summary.totalMembers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.overdueCount > 0 ? (
                <span className="text-red-600 font-medium">{summary.overdueCount} việc quá hạn</span>
              ) : (
                <span className="text-emerald-600 font-medium">Không có việc trễ</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. BIỂU ĐỒ SO SÁNH TẢI TRỌNG & CHỈ SỐ CHUYÊN MÔN NHÓM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái (2/3): Biểu đồ phân bổ tải trọng */}
        <Card className="lg:col-span-2 shadow-sm border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Phân bổ tải trọng công việc giữa các thành viên
            </CardTitle>
            <CardDescription className="text-xs">
              So sánh số lượng công việc hoàn thành, đang làm và quá hạn của từng nhân sự trong kỳ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có dữ liệu phân công công việc trong nhóm này.
              </div>
            ) : (
              <LazyChart height={250} variant="bar">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <ReTooltip
                      formatter={(val: any, name: any) => [`${val} việc`, name]}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="Hoàn thành" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Đang làm" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Quá hạn" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </LazyChart>
            )}
          </CardContent>
        </Card>

        {/* Cột phải (1/3): Chỉ số chuyên biệt của từng phân hệ */}
        <Card className="shadow-sm border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Chỉ số chuyên môn ({group.name})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phân hệ Biên tập: Vòng bông */}
            {activeGroupCode === "bien_tap" && specializedMetrics.roundTypeBreakdown && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-muted-foreground">Số việc sửa chữa/làm lại:</span>
                  <Badge variant={specializedMetrics.redoCount ? "destructive" : "outline"} className="text-xs">
                    {specializedMetrics.redoCount || 0} lượt redo
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tiến độ các vòng bông:
                  </span>
                  {specializedMetrics.roundTypeBreakdown.map((r) => (
                    <div key={r.roundType} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40">
                      <span className="font-medium">{r.roundType}</span>
                      <span className="text-muted-foreground">
                        <strong className="text-emerald-600">{r.completed}</strong> / {r.count} xong
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phân hệ Thư ký: Tài chính & Hợp đồng */}
            {activeGroupCode === "thu_ky_hop_phan" && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50">
                  <span className="text-muted-foreground">Tổng giá trị hợp đồng dịch:</span>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {formatNumberAccounting(specializedMetrics.totalContractValue)} đ
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-[11px] text-muted-foreground">Đã tạm ứng:</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {formatNumberAccounting(specializedMetrics.totalAdvanced)} đ
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-[11px] text-muted-foreground">Đã quyết toán:</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {formatNumberAccounting(specializedMetrics.totalSettled)} đ
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Phân hệ CNTT & Thiết kế */}
            {(activeGroupCode === "cntt" || activeGroupCode === "thiet_ke") && specializedMetrics.taskTypeBreakdown && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cơ cấu loại công việc:
                </span>
                {specializedMetrics.taskTypeBreakdown.map((tt) => (
                  <div key={tt.taskType} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40">
                    <span className="font-medium">{tt.taskType}</span>
                    <Badge variant="secondary" className="text-xs">
                      {tt.count} việc
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Phân hệ Công việc chung */}
            {activeGroupCode === "cv_chung" && (
              <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1.5">
                <p>Nhóm phụ trách các công tác tổ chức sự kiện, điều phối hậu cần, văn thư và nhiệm vụ phát sinh.</p>
                <p className="font-medium text-foreground">Tiến độ kỳ này duy trì mức độ hoàn thành ổn định.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. MA TRẬN TẢI TRỌNG & HIỆU SUẤT TỪNG THÀNH VIÊN */}
      <Card className="shadow-sm border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Bảng ma trận tải trọng & tiến độ nhân sự nhóm ({workloadByMember.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Theo dõi khối lượng công việc, tỷ lệ đúng hạn và trạng thái tải trọng để Trưởng nhóm điều phối cân đối
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/60 overflow-hidden">
            <Table className="text-xs">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="min-w-[180px]">Thành viên</TableHead>
                  <TableHead className="w-[140px]">Phòng ban</TableHead>
                  <TableHead className="w-[90px] text-center">Được giao</TableHead>
                  <TableHead className="w-[90px] text-center">Đã xong</TableHead>
                  <TableHead className="w-[90px] text-center">Đang làm</TableHead>
                  <TableHead className="w-[90px] text-center">Quá hạn</TableHead>
                  <TableHead className="w-[110px] text-center">Đúng hạn (%)</TableHead>
                  <TableHead className="w-[120px] text-center">Tải trọng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workloadByMember.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Chưa có thành viên nào được phân công nhiệm vụ trong kỳ này.
                    </TableCell>
                  </TableRow>
                ) : (
                  workloadByMember.map((m) => {
                    let badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                    let badgeLabel = "Bình thường";
                    if (m.workloadStatus === "low") {
                      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      badgeLabel = "Nhàn rỗi";
                    } else if (m.workloadStatus === "high") {
                      badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                      badgeLabel = "Tải cao";
                    } else if (m.workloadStatus === "overloaded") {
                      badgeClass = "bg-red-50 text-red-700 border-red-200";
                      badgeLabel = "Quá tải";
                    }

                    return (
                      <TableRow key={m.userId} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-medium text-foreground">
                          {m.displayName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {m.department || "—"}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {m.totalAssigned}
                        </TableCell>
                        <TableCell className="text-center text-emerald-600 font-semibold">
                          {m.completedCount}
                        </TableCell>
                        <TableCell className="text-center text-blue-600">
                          {m.inProgressCount}
                        </TableCell>
                        <TableCell className="text-center text-red-600 font-semibold">
                          {m.overdueCount > 0 ? m.overdueCount : "0"}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {m.onTimeRate}%
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${badgeClass}`}>
                            {badgeLabel}
                          </Badge>
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
