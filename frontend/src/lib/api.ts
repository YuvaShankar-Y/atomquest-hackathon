import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse, ErrorResponse, TokenPair } from "@/types";

const ACCESS_TOKEN_KEY = "hackathon_access_token";
const REFRESH_TOKEN_KEY = "hackathon_refresh_token";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: TokenPair): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isApiError(error: unknown): error is AxiosError<ErrorResponse> {
  return axios.isAxiosError(error) && error.response?.data?.success === false;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (isApiError(error)) {
    return error.response?.data.error.message ?? fallback;
  }
  if (axios.isAxiosError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  refreshQueue = [];
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (import.meta.env.DEV) {
    console.debug("[api] →", config.method?.toUpperCase(), config.url);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.debug("[api] ←", response.status, response.config.url);
    }
    return response;
  },
  async (error: AxiosError<ErrorResponse>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (import.meta.env.DEV) {
      console.debug("[api] ✗", error.response?.status, original?.url, error.response?.data);
    }

    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    const isAuthRoute =
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/register") ||
      original.url?.includes("/auth/refresh");

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<ApiResponse<TokenPair>>(
        `${API_BASE_URL}/api/v1/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { "Content-Type": "application/json" } },
      );
      setTokens(data.data);
      processQueue(null, data.data.access_token);
      original.headers.Authorization = `Bearer ${data.data.access_token}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
