import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  clearTokens,
  getRefreshToken,
  refreshSession,
  saveTokens,
} from "@/lib/api";

import {
  loginRequest,
  logoutRequest,
  registerRequest,
  type LoginRequest,
  type RegisterRequest,
} from "./auth-api";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    const unauthorized = () => {
      if (active) {
        queryClient.clear();
        setIsAuthenticated(false);
      }
    };

    window.addEventListener("forma:unauthorized", unauthorized);

    async function restore() {
      if (!getRefreshToken()) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        await refreshSession();
        if (active) setIsAuthenticated(true);
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void restore();

    return () => {
      active = false;
      window.removeEventListener("forma:unauthorized", unauthorized);
    };
  }, [queryClient]);

  const login = useCallback(async (data: LoginRequest) => {
    const tokens = await loginRequest(data);
    saveTokens(tokens);
    setIsAuthenticated(true);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const tokens = await registerRequest(data);
    saveTokens(tokens);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();

    clearTokens();
    queryClient.clear();
    setIsAuthenticated(false);

    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch {
        // Сетевой сбой не должен оставлять UI залогиненным.
        // Повторную серверную ревокацию добавим отдельно.
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
