import type { ApiResponse } from "./api";
import type { UserRole } from "./auth";

/** Mirror backend/app/schemas/user.py */

export interface UserRead {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
}

export type UserResponse = ApiResponse<UserRead>;
