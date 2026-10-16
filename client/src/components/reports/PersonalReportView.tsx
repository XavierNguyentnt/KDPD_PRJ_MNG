import React, { useState, useMemo } from "react";
import type { PersonalReportData } from "@shared/report-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck2,
  BookOpen,
  FileText,
  Search,
  ArrowUpDown,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import { formatNumberAccounting, formatDateDDMMYYYY, getTaskStatusColor } from "@/lib/utils";

interface PersonalReportViewProps {
  data: PersonalReportData;
}

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#64748b"];

export function PersonalReportView({ data }: PersonalReportViewProps) {
  const { summary, roleOutput, tasks, user, period } = data;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dữ liệu cho biểu đồ Donut Trạng thái
  const pieData = useMemo(() => {
    return [
      { name: "Hoàn thành", value: summary.completedCount, color: "#10b981" },
      { name: "Đang làm", value: summary.inProgressCount, color: "#3b82f6" },
      { name: "Chưa bắt đầu", value: summary.notStartedCount, color: "#64748b" },
      { name: "Quá hạn", value: summary.overdueCount, color: "#ef4444" },
      { name: "Tạm hoãn", value: summary.pendingCount, color: "#f59e0b" },
    ].filter((item) => item.value > 0);
  }, [summary]);

  // Bộ lọc danh mục công việc
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        !searchTerm ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.workTitle && t.workTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.id && t.id.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchStatus = true;
      if (statusFilter === "completed") {
        matchStatus = String(t.status).toLowerCase().includes("complete") || t.completedAt != null;
      } else if (statusFilter === "in_progress") {
        matchStatus = String(t.status).toLowerCase().includes("progress");
      } else if (statusFilter === "overdue") {
        matchStatus = t.isOnTime === false;
      }

      return matchSearch && matchStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  // Phân trang
  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage]);

  return (
    <div className="space-y-6">
      {/* 1. THẺ THÔNG TIN NHÂN SỰ & CHU KỲ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/70 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20">
            {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : "NV"}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-base tracking-tight">
              Báo cáo cá nhân: {user.displayName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {user.department ? `${user.department} • ` : ""}
              {user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-3 py-1 font-semibold bg-muted/50 border-border">
            Kỳ: {period.label}
          </Badge>
        </div>
      </div>

      {/* 2. KHỐI 4 THẺ SCORECARD KPI NỔI BẬT */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Tổng việc */}
        <Card className="shadow-xs border-border/70 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tổng việc được giao
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summary.totalAssigned}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>Đang làm: <strong className="text-foreground">{summary.inProgressCount}</strong></span>
              <span>•</span>
              <span>Chưa làm: <strong className="text-foreground">{summary.notStartedCount}</strong></span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Hoàn thành */}
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
              Đạt <strong className="text-foreground">{summary.completionRate}%</strong> kế hoạch kỳ
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Tỷ lệ đúng hạn */}
        <Card className="shadow-xs border-border/70 hover:border-indigo-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tỷ lệ đúng hạn
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
              <strong className="text-foreground">{summary.onTimeCount}</strong> việc xong đúng tiến độ
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Việc quá hạn */}
        <Card className="shadow-xs border-border/70 hover:border-red-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Việc quá hạn
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {summary.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.overdueCount === 0 ? "Tiến độ rất xuất sắc" : "Cần ưu tiên xử lý sớm"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. KHỐI SẢN LƯỢNG CHUYÊN MÔN & BIỂU ĐỒ TRẠNG THÁI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái (2/3): Khối lượng sản phẩm thực tế */}
        <Card className="lg:col-span-2 shadow-sm border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Sản lượng & Khối lượng công việc tích lũy
            </CardTitle>
            <CardDescription className="text-xs">
              Dung lượng trang sách, chữ và cơ cấu vai trò đã tham gia thực hiện trong kỳ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-3.5 rounded-lg bg-muted/40 border border-border/50">
              <div>
                <span className="text-xs text-muted-foreground">Tổng số trang quy đổi:</span>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {formatNumberAccounting(roleOutput.totalEstimatedPages)} <span className="text-xs font-normal text-muted-foreground">trang</span>
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Tổng số từ ước tính:</span>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {formatNumberAccounting(roleOutput.totalEstimatedWords)} <span className="text-xs font-normal text-muted-foreground">từ</span>
                </p>
              </div>
            </div>

            {/* Bảng phân bổ theo vai trò chuyên môn */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Phân bổ theo vai trò chuyên môn
              </h4>
              <div className="space-y-2">
                {roleOutput.stageBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">Chưa có dữ liệu phân loại vai trò.</p>
                ) : (
                  roleOutput.stageBreakdown.map((st) => (
                    <div
                      key={st.stageType}
                      className="flex items-center justify-between text-xs p-2.5 rounded-md hover:bg-muted/50 border border-border/40"
                    >
                      <span className="font-medium text-foreground">{st.stageLabel}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Xong: <strong className="text-emerald-600">{st.completed}</strong>/{st.count}
                        </span>
                        <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{
                              width: `${st.count > 0 ? (st.completed / st.count) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cột phải (1/3): Biểu đồ Donut cơ cấu trạng thái */}
        <Card className="shadow-sm border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Cơ cấu trạng thái công việc
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">
                Chưa có dữ liệu trong kỳ
              </div>
            ) : (
              <LazyChart height={240} variant="pie">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip
                      formatter={(val: any, name: any) => [`${val} việc`, name]}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </LazyChart>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. BẢNG KÊ CHI TIẾT CÔNG VIỆC TRONG KỲ */}
      <Card className="shadow-sm border-border/70">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Danh mục công việc trong kỳ ({filteredTasks.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Chi tiết từng tác vụ, mốc thời gian nhận việc, hạn chót và tình trạng đúng hạn
              </CardDescription>
            </div>

            {/* Tìm kiếm & Lọc (Ẩn khi in ấn) */}
            <div className="flex items-center gap-2 print:hidden">
              <div className="relative w-48 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm việc, tác phẩm..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>
              <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/50 text-xs">
                <Button
                  size="sm"
                  variant={statusFilter === "all" ? "default" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setStatusFilter("all")}
                >
                  Tất cả
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "completed" ? "default" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setStatusFilter("completed")}
                >
                  Đã xong
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "overdue" ? "default" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setStatusFilter("overdue")}
                >
                  Quá hạn
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/60 overflow-hidden">
            <Table className="text-xs">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Mã việc</TableHead>
                  <TableHead className="min-w-[200px]">Tên công việc / Tác phẩm</TableHead>
                  <TableHead className="w-[120px]">Hợp phần</TableHead>
                  <TableHead className="w-[95px] text-center">Ngày nhận</TableHead>
                  <TableHead className="w-[95px] text-center">Hạn chót</TableHead>
                  <TableHead className="w-[95px] text-center">Hoàn thành</TableHead>
                  <TableHead className="w-[110px] text-center">Đúng hạn / Trễ</TableHead>
                  <TableHead className="w-[105px] text-center">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Không tìm thấy công việc nào phù hợp với bộ lọc trong kỳ này.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTasks.map((t) => {
                    const statusColor = getTaskStatusColor(t.status);
                    return (
                      <TableRow key={t.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-mono text-muted-foreground">{t.id}</TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{t.title}</div>
                          {t.workTitle && (
                            <div className="text-[11px] text-primary/80 mt-0.5">
                              📖 {t.workTitle}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {t.componentName || "—"}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {formatDateDDMMYYYY(t.receivedAt)}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {formatDateDDMMYYYY(t.dueDate)}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {formatDateDDMMYYYY(t.completedAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          {t.isOnTime === true ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              Đúng hạn {t.daysLateOrEarly && t.daysLateOrEarly < 0 ? `(-${Math.abs(t.daysLateOrEarly)}d)` : ""}
                            </Badge>
                          ) : t.isOnTime === false ? (
                            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                              Trễ {t.daysLateOrEarly ? `+${t.daysLateOrEarly}d` : ""}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Đang làm</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${statusColor.badge}`}>
                            {t.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Phân trang (Ẩn khi in ấn) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground print:hidden">
              <span>Trang {currentPage} / {totalPages} (Tổng {filteredTasks.length} việc)</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Trước
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
