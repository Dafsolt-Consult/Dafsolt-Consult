import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, tokenStore } from "../api/client";
import { AuthUser } from "../types";

interface OnboardInput {
  schoolName: string;
  slug: string;
  country?: string;
  currency?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  planTier?: "STARTER" | "GROWTH" | "PROFESSIONAL" | "ENTERPRISE";
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  onboardSchool: (input: OnboardInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!tokenStore.getAccessToken()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<AuthUser>("/auth/me");
      setUser(data);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    tokenStore.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const onboardSchool = useCallback(async (input: OnboardInput) => {
    const { data } = await api.post("/auth/onboard", input);
    tokenStore.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    tokenStore.clear();
    setUser(null);
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch {
        // best-effort revoke
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, onboardSchool, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
