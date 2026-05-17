import type { ApiResponse } from "./api";

export type GoalCyclePhase =
  | "goal_setting"
  | "q1_checkin"
  | "q2_checkin"
  | "q3_checkin"
  | "q4_checkin";

export interface GoalCycleRead {
  id: string;
  name: string;
  phase: GoalCyclePhase;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GoalCyclesResponse = ApiResponse<GoalCycleRead[]>;
export type ActiveGoalCycleResponse = ApiResponse<GoalCycleRead>;
