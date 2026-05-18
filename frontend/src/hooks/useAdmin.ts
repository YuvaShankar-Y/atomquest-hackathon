import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { ApiResponse, AuditLogRead, CompletionDashboardRow } from "@/types";
import { TEAM_GOAL_SHEETS_QUERY_KEY } from "./useApprovals";

export const COMPLETION_DASHBOARD_QUERY_KEY = "completion-dashboard";
export const AUDIT_LOGS_QUERY_KEY = "audit-logs";

export function useCompletionDashboard() {
  return useQuery({
    queryKey: [COMPLETION_DASHBOARD_QUERY_KEY],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CompletionDashboardRow[]>>("/api/v1/admin/completion-dashboard");
      return data.data;
    },
  });
}

export function useAuditLogs(entityType?: string) {
  return useQuery({
    queryKey: [AUDIT_LOGS_QUERY_KEY, entityType],
    queryFn: async () => {
      const url = entityType 
        ? `/api/v1/admin/audit-logs?entity_type=${encodeURIComponent(entityType)}`
        : "/api/v1/admin/audit-logs";
      const { data } = await api.get<ApiResponse<AuditLogRead[]>>(url);
      return data.data;
    },
  });
}

export function useUnlockGoalSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sheetId: string) => {
      const { data } = await api.post<ApiResponse<{ goal_sheet_id: string; status: string }>>(`/api/v1/admin/unlock-goal/${sheetId}`);
      return data.data;
    },
    onSuccess: () => {
      toast({ title: "Goal Sheet Unlocked", description: "The goal sheet has been returned to the rework state." });
      void queryClient.invalidateQueries({ queryKey: [TEAM_GOAL_SHEETS_QUERY_KEY] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not unlock goal sheet",
        description: getErrorMessage(error),
      });
    },
  });
}
