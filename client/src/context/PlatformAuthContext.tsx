import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { platformApi, platformTokenStore } from "../api/platformClient";
import { PlatformAdminUser } from "../types/platform";

interface PlatformAuthContextValue {
  admin: PlatformAdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | undefined>(undefined);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!platformTokenStore.getAccessToken()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await platformApi.get<PlatformAdminUser>("/auth/me");
      setAdmin(data);
    } catch {
      platformTokenStore.clear();
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await platformApi.post("/auth/login", { email, password });
    platformTokenStore.setTokens(data.accessToken, data.refreshToken);
    setAdmin(data.admin);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = platformTokenStore.getRefreshToken();
    platformTokenStore.clear();
    setAdmin(null);
    if (refreshToken) {
      try {
        await platformApi.post("/auth/logout", { refreshToken });
      } catch {
        // best-effort revoke
      }
    }
  }, []);

  return (
    <PlatformAuthContext.Provider value={{ admin, loading, login, logout }}>{children}</PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error("usePlatformAuth must be used within PlatformAuthProvider");
  return ctx;
}
