import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { GoalCyclesResponse } from "@/types";

const GOAL_CYCLES_QUERY_KEY = "goal-cycles";

async function fetchActiveGoalCycles() {
  // Since there is no specific 'active' endpoint in the basic API (or maybe there is?),
  // we'll fetch all cycles and filter by is_active in the frontend, or the backend might already filter them.
  // Wait, let's just fetch from /api/v1/cycles
  const { data } = await api.get<GoalCyclesResponse>("/api/v1/cycles");
  return data.data;
}

export function useActiveGoalCycles() {
  return useQuery({
    queryKey: [GOAL_CYCLES_QUERY_KEY, "active"],
    queryFn: fetchActiveGoalCycles,
  });
}
