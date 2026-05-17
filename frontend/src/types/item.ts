import type { ApiResponse, PaginatedResponse, PaginationParams } from "./api";

/** Mirror backend/app/schemas/item.py */

export type ItemStatus = "draft" | "active" | "archived";

export interface ItemCreate {
  title: string;
  description?: string | null;
  status?: ItemStatus;
}

export interface ItemUpdate {
  title?: string;
  description?: string | null;
  status?: ItemStatus;
}

export interface ItemRead {
  id: string;
  title: string;
  description: string | null;
  status: ItemStatus;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ItemListParams extends PaginationParams {
  status?: ItemStatus;
}

export type ItemResponse = ApiResponse<ItemRead>;
export type ItemListResponse = PaginatedResponse<ItemRead>;
export type ItemDeleteResponse = ApiResponse<{ deleted: boolean }>;
