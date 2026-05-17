import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, clearTokens, getAccessToken, setTokens } from "@/lib/api";
import type {
  ApiResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  TokenPair,
  UserRole,
} from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isLoading: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const { data } = await api.get<ApiResponse<AuthUser>>("/api/v1/users/me");
    setUser(data.data);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    await fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (getAccessToken()) {
          await fetchMe();
        }
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    void bootstrap();
  }, [fetchMe]);

  const login = useCallback(async (payload: LoginRequest) => {
    const { data } = await api.post<ApiResponse<TokenPair>>("/api/v1/auth/login", payload);
    setTokens(data.data);
    await fetchMe();
  }, [fetchMe]);

  const register = useCallback(async (payload: RegisterRequest) => {
    await api.post<ApiResponse<AuthUser>>("/api/v1/auth/register", payload);
    await login({ email: payload.email, password: payload.password });
  }, [login]);

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) {
        await api.post("/api/v1/auth/logout");
      }
    } catch {
      // Logout is best-effort when token is invalid
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) {
        return false;
      }
      return roles.includes(user.role);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      isManager: user?.role === "manager",
      isEmployee: user?.role === "employee",
      isLoading,
      hasRole,
      login,
      register,
      logout,
      refreshSession,
    }),
    [user, isLoading, hasRole, login, register, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
