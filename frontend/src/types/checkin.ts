export type CheckInStatus = "not_started" | "on_track" | "completed";

export interface CheckInCreate {
  actual_value?: number | null;
  status: CheckInStatus;
}

export interface ManagerCommentCreate {
  manager_comment: string;
}

export interface CheckInRead {
  id: string;
  goal_id: string;
  quarter: number;
  year: number;
  actual_value?: number | null;
  status: CheckInStatus;
  manager_comment?: string | null;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface CheckInGoalRead {
  goal_id: string;
  goal_sheet_id: string;
  owner_id: string;
  goal_title: string;
  thrust_area: string;
  uom_type: string;
  direction?: string | null;
  target_value?: number | null;
  target_date?: string | null;
  current_actual?: number | null;
  quarter: number;
  year: number;
  checkin_status: CheckInStatus;
  manager_comment?: string | null;
  progress_score?: number | null;
  is_shared: boolean;
  primary_owner_id?: string | null;
}
