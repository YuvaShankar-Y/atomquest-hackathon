import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type {
  ApiResponse,
  ApprovalActionResponse,
  ApprovalGoalEditRequest,
  GoalRead,
  GoalSheetDetailRead,
} from "@/types";
import { GOAL_SHEETS_QUERY_KEY } from "./useGoals";

export const TEAM_GOAL_SHEETS_QUERY_KEY = "team-goal-sheets";

export function useTeamGoalSheets() {
  return useQuery({
    queryKey: [TEAM_GOAL_SHEETS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<GoalSheetDetailRead[]>>("/api/v1/approvals/team/goal-sheets");
      return data.data;
    },
  });
}

export function useApproveSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sheetId: string) => {
      const { data } = await api.post<ApiResponse<ApprovalActionResponse>>(`/api/v1/approvals/goal-sheets/${sheetId}/approve`);
      return data.data;
    },
    onSuccess: (_, sheetId) => {
      toast({ title: "Goal Sheet Approved", description: "The goals are now locked and active." });
      void queryClient.invalidateQueries({ queryKey: [TEAM_GOAL_SHEETS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [GOAL_SHEETS_QUERY_KEY, sheetId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not approve",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useReworkSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sheetId: string) => {
      const { data } = await api.post<ApiResponse<ApprovalActionResponse>>(`/api/v1/approvals/goal-sheets/${sheetId}/rework`);
      return data.data;
    },
    onSuccess: (_, sheetId) => {
      toast({ title: "Sent for Rework", description: "The goal sheet has been returned to the employee." });
      void queryClient.invalidateQueries({ queryKey: [TEAM_GOAL_SHEETS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [GOAL_SHEETS_QUERY_KEY, sheetId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not return for rework",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useManagerEditGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sheetId, goalId, payload }: { sheetId: string; goalId: string; payload: ApprovalGoalEditRequest }) => {
      const { data } = await api.post<ApiResponse<GoalRead>>(`/api/v1/approvals/goal-sheets/${sheetId}/edit-goal/${goalId}`, payload);
      return data.data;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Goal Updated", description: "Changes saved successfully." });
      void queryClient.invalidateQueries({ queryKey: [TEAM_GOAL_SHEETS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [GOAL_SHEETS_QUERY_KEY, variables.sheetId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not update goal",
        description: getErrorMessage(error),
      });
    },
  });
}
