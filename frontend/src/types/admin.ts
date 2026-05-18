export interface CompletionDashboardRow {
  employee_id: string;
  employee_name: string;
  manager_id: string | null;
  manager_name: string | null;
  quarter: number;
  year: number;
  total_goals: number;
  checked_in_goals: number;
  pending_goals: number;
  is_complete: boolean;
}

export interface AuditLogRead {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_at: string;
  user_id: string;
  changes: Record<string, unknown>;
}
