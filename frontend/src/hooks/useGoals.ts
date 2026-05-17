import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type {
  ApiResponse,
  GoalCreate,
  GoalRead,
  GoalSheetCreate,
  GoalSheetDetailRead,
  GoalSheetRead,
  GoalUpdate,
  SubmitResponse,
} from "@/types";

export const GOAL_SHEETS_QUERY_KEY = "goal-sheets";

// --- Queries ---

export function useGoalSheets() {
  return useQuery({
    queryKey: [GOAL_SHEETS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<GoalSheetRead[]>>("/api/v1/goal-sheets");
      return data.data;
    },
  });
}

export function useGoalSheet(sheetId: string | undefined) {
  return useQuery({
    queryKey: [GOAL_SHEETS_QUERY_KEY, sheetId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<GoalSheetDetailRead>>(`/api/v1/goal-sheets/${sheetId}`);
      return data.data;
    },
    enabled: !!sheetId,
  });
}

// --- Mutations ---

export function useCreateGoalSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GoalSheetCreate) => {
      const { data } = await api.post<ApiResponse<GoalSheetDetailRead>>("/api/v1/goal-sheets", payload);
      return data.data;
    },
    onSuccess: () => {
      toast({ title: "Goal Sheet Created", description: "You can now add goals to your sheet." });
      void queryClient.invalidateQueries({ queryKey: [GOAL_SHEETS_QUERY_KEY] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not create goal sheet",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useAddGoalToSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sheetId, payload }: { sheetId: string; payload: GoalCreate }) => {
      const { data } = await api.post<ApiResponse<GoalSheetDetailRead>>(`/api/v1/goal-sheets/${sheetId}/goals`, payload);
      return data.data;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Goal Added", description: "The goal has been successfully added." });
      void queryClient.invalidateQueries({ queryKey: [GOAL_SHEETS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [GOAL_SHEETS_QUERY_KEY, variables.sheetId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not add goal",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, payload }: { goalId: string; payload: GoalUpdate }) => {
      const { data } = await api.put<ApiResponse<GoalRead>>(`/api/v1/goals/${goalId}`, payload);
      return data.data;
    },
    onSuccess: () => {
      toast({ title: "Goal Updated", description: "Changes saved successfully." });
      // Invalidate all goal sheets to ensure data freshness
      void queryClient.invalidateQueries({ queryKey: [GOAL_SHEETS_QUERY_KEY] });
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

export function useSubmitGoalSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sheetId: string) => {
      const { data } = await api.post<ApiResponse<SubmitResponse>>(`/api/v1/goal-sheets/${sheetId}/submit`);
      return data.data;
    },
    onSuccess: (_, sheetId) => {
      toast({ title: "Goal Sheet Submitted", description: "Your goal sheet is now pending approval." });
      void queryClient.invalidateQueries({ queryKey: [GOAL_SHEETS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [GOAL_SHEETS_QUERY_KEY, sheetId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not submit",
        description: getErrorMessage(error),
      });
    },
  });
}
