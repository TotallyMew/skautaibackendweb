import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { LoginRequest } from "../api/types";
import { authFromTokenResponse, loadAuthState, saveAuthState, withPermissions, type AuthState } from "./authStorage";

type AuthContextValue = {
  auth: AuthState | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (request: LoginRequest, mode?: "user" | "super_admin") => Promise<void>;
  logout: () => Promise<void>;
  selectTuntas: (tuntasId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuthState());
  const [isInitializing, setIsInitializing] = useState(() => Boolean(loadAuthState()?.refreshToken));

  const persist = useCallback((next: AuthState | null) => {
    setAuth(next);
    saveAuthState(next);
  }, []);

  const isSuperAdmin = (state: AuthState) => state.type === "super_admin";

  const hydratePermissions = useCallback(async (state: AuthState) => {
    if (!state.activeTuntasId || isSuperAdmin(state)) {
      persist(state);
      return;
    }
    const permissions = await api.myPermissions(state.token, state.activeTuntasId);
    persist(withPermissions(state, permissions));
  }, [persist]);

  const login = useCallback(async (request: LoginRequest, mode: "user" | "super_admin" = "user") => {
    const response = mode === "super_admin" ? await api.superAdminLogin(request) : await api.login(request);
    await hydratePermissions(authFromTokenResponse(response));
  }, [hydratePermissions]);

  useEffect(() => {
    const current = loadAuthState();
    if (!current?.refreshToken) {
      setIsInitializing(false);
      return;
    }

    const refreshToken = current.refreshToken;
    const activeTuntasId = current.activeTuntasId;
    let isCancelled = false;

    async function restoreSession() {
      try {
        const response = await api.refresh(refreshToken);
        if (!isCancelled) {
          await hydratePermissions(authFromTokenResponse(response, activeTuntasId));
        }
      } catch {
        if (!isCancelled) {
          persist(null);
        }
      } finally {
        if (!isCancelled) {
          setIsInitializing(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isCancelled = true;
    };
  }, [hydratePermissions, persist]);

  const logout = useCallback(async () => {
    const refreshToken = auth?.refreshToken;
    persist(null);
    if (refreshToken) {
      await api.logout(refreshToken).catch(() => undefined);
    }
  }, [auth?.refreshToken, persist]);

  const selectTuntas = useCallback(async (tuntasId: string) => {
    if (!auth) return;
    await hydratePermissions({ ...auth, activeTuntasId: tuntasId });
  }, [auth, hydratePermissions]);

  const value = useMemo<AuthContextValue>(() => ({
    auth,
    isInitializing,
    isAuthenticated: Boolean(auth?.token),
    login,
    logout,
    selectTuntas
  }), [auth, isInitializing, login, logout, selectTuntas]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth turi būti naudojamas AuthProvider viduje");
  }
  return context;
}
