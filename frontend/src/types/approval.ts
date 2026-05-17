import type { GoalSheetStatus } from "./goalSheet";

export interface ApprovalActionResponse {
  id: string;
  status: GoalSheetStatus;
  approved_at?: string | null;
  locked_at?: string | null;
}

export interface ApprovalGoalEditRequest {
  target_value?: number | null;
  target_date?: string | null;
  weightage?: number | null;
}
