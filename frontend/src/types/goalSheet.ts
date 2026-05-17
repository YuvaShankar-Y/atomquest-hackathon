import type { GoalRead } from "./goal";

export type GoalSheetStatus = "draft" | "submitted" | "approved" | "rework";

export interface GoalSheetCreate {
  cycle_id: string;
}

export interface GoalSheetUpdate {
  cycle_id?: string | null;
  goals: GoalRead[];
}

export interface GoalSheetRead {
  id: string;
  user_id: string;
  cycle_id: string;
  status: GoalSheetStatus;
  submitted_at: string | null;
  approved_at: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalSheetDetailRead extends GoalSheetRead {
  goals: GoalRead[];
}

export type GoalSheetResponse = GoalSheetDetailRead;

export interface SubmitResponse {
  id: string;
  status: GoalSheetStatus;
  submitted_at: string;
}
