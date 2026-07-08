import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { LoginRequest, RegisterTuntininkasRequest, RegisterWithInviteRequest } from "../api/types";
import { authFromTokenResponse, loadAuthState, saveAuthState, withPermissions, type AuthState } from "./authStorage";

type AuthContextValue = {
  auth: AuthState | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (request: LoginRequest) => Promise<AuthState>;
  registerTuntas: (request: RegisterTuntininkasRequest) => Promise<AuthState>;
  registerInvite: (request: RegisterWithInviteRequest) => Promise<AuthState>;
  acceptInvitation: (code: string) => Promise<AuthState>;
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

  const hydratePermissions = useCallback(async (state: AuthState): Promise<AuthState> => {
    if (!state.activeTuntasId || isSuperAdmin(state)) {
      persist(state);
      return state;
    }
    const permissions = await api.myPermissions(state.token, state.activeTuntasId);
    const nextState = withPermissions(state, permissions);
    persist(nextState);
    return nextState;
  }, [persist]);

  const login = useCallback(async (request: LoginRequest) => {
    const response = await api.login(request);
    return hydratePermissions(authFromTokenResponse(response));
  }, [hydratePermissions]);

  const registerTuntas = useCallback(async (request: RegisterTuntininkasRequest) => {
    const response = await api.registerTuntininkas(request);
    return hydratePermissions(authFromTokenResponse(response));
  }, [hydratePermissions]);

  const registerInvite = useCallback(async (request: RegisterWithInviteRequest) => {
    const response = await api.registerWithInvite(request);
    return hydratePermissions(authFromTokenResponse(response));
  }, [hydratePermissions]);

  const acceptInvitation = useCallback(async (code: string) => {
    if (!auth) throw new Error("Neprisijungta.");
    const invitation = await api.acceptInvitation(auth.token, { code: code.trim().toUpperCase() });
    const tuntai = await api.myTuntai(auth.token);
    return hydratePermissions({
      ...auth,
      tuntai,
      activeTuntasId: invitation.tuntasId,
      permissions: [],
      leadershipUnitIds: []
    });
  }, [auth, hydratePermissions]);

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
    registerTuntas,
    registerInvite,
    acceptInvitation,
    logout,
    selectTuntas
  }), [acceptInvitation, auth, isInitializing, login, logout, registerInvite, registerTuntas, selectTuntas]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth turi būti naudojamas AuthProvider viduje");
  }
  return context;
}
