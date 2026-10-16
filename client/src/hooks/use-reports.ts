import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type {
  PersonalReportData,
  DepartmentReportData,
  OrganizationReportData,
  ReportPeriodType,
  ReportAIInsightsData,
  ReportAIInsightsRequest,
} from "@shared/report-types";
import type { ReportSnapshot } from "@shared/schema";

export interface ReportQueryParams {
  periodType?: ReportPeriodType;
  periodValue?: string;
  startDate?: string;
  endDate?: string;
  targetUserId?: string;
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      q.append(k, v);
    }
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function usePersonalReport(params: ReportQueryParams = {}, enabled = true) {
  const queryStr = buildQueryString({
    periodType: params.periodType,
    periodValue: params.periodValue,
    startDate: params.startDate,
    endDate: params.endDate,
    targetUserId: params.targetUserId,
  });

  return useQuery<PersonalReportData>({
    queryKey: ["reports", "personal", params],
    queryFn: async (): Promise<PersonalReportData> => {
      const res = await fetch(`${api.reports.personal.path}${queryStr}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Không thể tải báo cáo cá nhân.");
      }
      return res.json();
    },
    enabled,
    staleTime: 60 * 1000, // 1 phút
  });
}

export function useDepartmentReport(
  groupCode: string,
  params: ReportQueryParams = {},
  enabled = true,
) {
  const queryStr = buildQueryString({
    periodType: params.periodType,
    periodValue: params.periodValue,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const url = api.reports.department.path.replace(":groupCode", encodeURIComponent(groupCode));

  return useQuery<DepartmentReportData>({
    queryKey: ["reports", "department", groupCode, params],
    queryFn: async (): Promise<DepartmentReportData> => {
      const res = await fetch(`${url}${queryStr}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Không thể tải báo cáo nhóm nghiệp vụ.");
      }
      return res.json();
    },
    enabled: enabled && !!groupCode,
    staleTime: 60 * 1000,
  });
}

export function useOrganizationReport(params: ReportQueryParams = {}, enabled = true) {
  const queryStr = buildQueryString({
    periodType: params.periodType,
    periodValue: params.periodValue,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  return useQuery<OrganizationReportData>({
    queryKey: ["reports", "organization", params],
    queryFn: async (): Promise<OrganizationReportData> => {
      const res = await fetch(`${api.reports.organization.path}${queryStr}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Không thể tải báo cáo tổ chức.");
      }
      return res.json();
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useReportAIInsights() {
  return useMutation<ReportAIInsightsData, Error, ReportAIInsightsRequest>({
    mutationFn: async (payload: ReportAIInsightsRequest): Promise<ReportAIInsightsData> => {
      const res = await fetch(api.reports.aiInsights.path, {
        method: api.reports.aiInsights.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Không thể khởi tạo nhận định trí tuệ nhân tạo.",
        );
      }

      return res.json();
    },
  });
}

export function useReportSnapshots(
  filter: { scope?: string; targetId?: string; periodValue?: string } = {},
) {
  const queryStr = buildQueryString({
    scope: filter.scope,
    targetId: filter.targetId,
    periodValue: filter.periodValue,
  });

  return useQuery<ReportSnapshot[]>({
    queryKey: ["reports", "snapshots", filter],
    queryFn: async (): Promise<ReportSnapshot[]> => {
      const res = await fetch(`${api.reports.listSnapshots.path}${queryStr}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Không thể tải danh sách bản chốt sổ báo cáo.",
        );
      }
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateReportSnapshot() {
  return useMutation<
    ReportSnapshot,
    Error,
    {
      scope: "personal" | "department" | "organization";
      targetId?: string;
      periodType: string;
      periodValue: string;
      periodLabel: string;
      summaryData: any;
      aiInsights?: any;
      notes?: string;
    }
  >({
    mutationFn: async (payload) => {
      const res = await fetch(api.reports.createSnapshot.path, {
        method: api.reports.createSnapshot.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Không thể chốt sổ báo cáo.");
      }

      return res.json();
    },
  });
}

