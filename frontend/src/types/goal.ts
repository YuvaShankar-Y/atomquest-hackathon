export type GoalUomType = "numeric" | "percentage" | "timeline" | "zero";
export type GoalDirection = "min" | "max";

export interface GoalBase {
  thrust_area: string;
  title: string;
  description?: string | null;
  uom_type: GoalUomType;
  direction?: GoalDirection | null;
  target_value?: number | null;
  target_date?: string | null;
  weightage: number;
}

export interface GoalCreate extends GoalBase {}

export interface GoalUpdate {
  thrust_area?: string | null;
  title?: string | null;
  description?: string | null;
  uom_type?: GoalUomType | null;
  direction?: GoalDirection | null;
  target_value?: number | null;
  target_date?: string | null;
  weightage?: number | null;
}

export interface GoalRead extends GoalBase {
  id: string;
  goal_sheet_id: string;
  actual_value?: number | null;
  is_shared: boolean;
  shared_group_id?: string | null;
  primary_owner_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type GoalResponse = GoalRead;
