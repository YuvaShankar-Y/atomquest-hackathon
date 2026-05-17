/** Standard API envelopes — mirror backend/app/schemas/common.py */

export interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown> | unknown[] | null;
}

export interface ErrorResponse {
  success: false;
  error: ErrorDetail;
  request_id?: string | null;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string | null;
  request_id?: string | null;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
  request_id?: string | null;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export type HealthStatus = "ok" | "degraded" | "error";
export type DbStatus = "connected" | "disconnected" | "unknown";

export interface HealthData {
  status: HealthStatus;
  version: string;
  db: DbStatus;
}

export interface LogoutData {
  logged_out: boolean;
}

export interface DeleteData {
  deleted: boolean;
}

/** Vite environment variables — mirror .env.example */
export interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
}

export interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Compile-time contract fixtures (no runtime test runner in Phase 0) */
export const _contractFixtures = {
  error: {
    success: false as const,
    error: { code: "NOT_FOUND", message: "Resource not found" },
  } satisfies ErrorResponse,
  paginated: {
    success: true as const,
    data: [] as string[],
    meta: { page: 1, page_size: 20, total: 0, total_pages: 0 },
  } satisfies PaginatedResponse<string>,
};
