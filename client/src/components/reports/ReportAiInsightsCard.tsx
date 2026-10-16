import React from "react";
import type { ReportAIInsightsData } from "@shared/report-types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Cpu,
  Layers,
} from "lucide-react";

interface ReportAiInsightsCardProps {
  insights: ReportAIInsightsData | null | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}

export function ReportAiInsightsCard({
  insights,
  isLoading,
  onRefresh,
}: ReportAiInsightsCardProps) {
  if (isLoading && !insights) {
    return (
      <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10 shadow-xs animate-pulse">
        <CardContent className="py-8 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              Trợ lý AI đang phân tích dữ liệu chuyên sâu...
            </h4>
            <p className="text-xs text-muted-foreground">
              Đang rà soát tiến độ, chỉ số KPI, điểm nghẽn và tổng hợp nhận định hành chính
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="border-dashed border-border/80 bg-card/60 shadow-xs print:hidden">
        <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Trợ lý AI Phân tích Chuyên môn (Gemini Insights)
              </h4>
              <p className="text-xs text-muted-foreground">
                Khởi tạo nhận định tự động: chỉ ra điểm sáng, nút thắt cổ chai và kiến nghị giải pháp
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Khởi tạo Nhận định AI
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isGemini = insights.engine === "gemini-2.5-flash";

  return (
    <Card className="border-primary/30 dark:border-primary/40 bg-linear-to-br from-card via-card to-primary/5 shadow-xs relative overflow-hidden">
      {/* HEADER KHỐI AI */}
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-foreground">
                  Nhận định Chuyên môn Tự động
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold px-2 py-0 gap-1 border ${
                    isGemini
                      ? "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                      : "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                  }`}
                >
                  <Cpu className="w-2.5 h-2.5" />
                  {isGemini ? "Gemini 2.5 Flash" : "KDPD Expert Rule-Engine"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Đóng vai trò Thư ký Chuyên môn Cấp cao tổng hợp đánh giá và kiến nghị
              </CardDescription>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 print:hidden self-start sm:self-auto"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Đang phân tích..." : "Cập nhật nhận định"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* ĐOẠN TỔNG KẾT HÀNH CHÍNH (LEAD SUMMARY) */}
        {insights.summaryParagraph && (
          <div className="p-3 rounded-lg bg-muted/60 dark:bg-muted/40 border border-border/60 text-xs italic text-foreground leading-relaxed">
            "{insights.summaryParagraph}"
          </div>
        )}

        {/* LƯỚI 3 CỘT: ĐIỂM SÁNG - NÚT THẮT - KHUYẾN NGHỊ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* CỘT 1: ĐIỂM SÁNG (HIGHLIGHTS) */}
          <div className="p-3.5 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold text-xs uppercase tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Điểm sáng & Thành tựu
            </div>
            <ul className="space-y-1.5 text-xs text-foreground/90">
              {insights.highlights.length === 0 ? (
                <li className="text-muted-foreground italic">Duy trì tiến độ kế hoạch.</li>
              ) : (
                insights.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-emerald-600 font-bold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* CỘT 2: NÚT THẮT & RỦI RO (BOTTLENECK RISKS) */}
          <div className="p-3.5 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Nút thắt & Rủi ro
            </div>
            <ul className="space-y-1.5 text-xs text-foreground/90">
              {insights.bottlenecks.length === 0 ? (
                <li className="text-muted-foreground italic">Không ghi nhận rủi ro đáng kể.</li>
              ) : (
                insights.bottlenecks.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* CỘT 3: KHUYẾN NGHỊ HÀNH ĐỘNG (RECOMMENDATIONS) */}
          <div className="p-3.5 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
            <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 font-semibold text-xs uppercase tracking-wide">
              <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Kiến nghị Hành động
            </div>
            <ul className="space-y-1.5 text-xs text-foreground/90">
              {insights.recommendations.length === 0 ? (
                <li className="text-muted-foreground italic">Tiếp tục duy trì quy trình hiện tại.</li>
              ) : (
                insights.recommendations.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
