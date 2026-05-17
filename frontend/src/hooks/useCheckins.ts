import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type {
  ApiResponse,
  CheckInCreate,
  CheckInGoalRead,
  CheckInRead,
  ManagerCommentCreate,
} from "@/types";

export const MY_CHECKINS_QUERY_KEY = "my-checkins";
export const TEAM_CHECKINS_QUERY_KEY = "team-checkins";

export function useMyCheckinGoals() {
  return useQuery({
    queryKey: [MY_CHECKINS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CheckInGoalRead[]>>("/api/v1/checkins/my-goals");
      return data.data;
    },
  });
}

export function useTeamCheckinGoals() {
  return useQuery({
    queryKey: [TEAM_CHECKINS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CheckInGoalRead[]>>("/api/v1/checkins/team");
      return data.data;
    },
  });
}

export function useLogCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, payload }: { goalId: string; payload: CheckInCreate }) => {
      const { data } = await api.post<ApiResponse<CheckInRead>>(`/api/v1/checkins/${goalId}`, payload);
      return data.data;
    },
    onSuccess: () => {
      toast({ title: "Progress Updated", description: "Your check-in has been logged." });
      void queryClient.invalidateQueries({ queryKey: [MY_CHECKINS_QUERY_KEY] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not update progress",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useManagerComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, payload }: { goalId: string; payload: ManagerCommentCreate }) => {
      const { data } = await api.post<ApiResponse<CheckInRead>>(`/api/v1/checkins/${goalId}/manager-comment`, payload);
      return data.data;
    },
    onSuccess: () => {
      toast({ title: "Comment Saved", description: "Your feedback has been saved." });
      void queryClient.invalidateQueries({ queryKey: [TEAM_CHECKINS_QUERY_KEY] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Could not save comment",
        description: getErrorMessage(error),
      });
    },
  });
}
