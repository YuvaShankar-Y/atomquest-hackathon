import type { ApiResponse } from "./api";

/** Mirror backend/app/schemas/auth.py */

export type UserRole = "employee" | "manager" | "admin";

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
}

export type LoginResponse = ApiResponse<TokenPair>;
export type MeResponse = ApiResponse<AuthUser>;
export type RegisterResponse = ApiResponse<AuthUser>;
