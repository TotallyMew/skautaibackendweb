import type { PermissionsResponse, TokenResponse, UserTuntas } from "../api/types";

const storageKey = "skautai.web.auth";

export type AuthState = {
  token: string;
  refreshToken: string | null;
  userId: string;
  email: string;
  name: string;
  type: string;
  tuntai: UserTuntas[];
  activeTuntasId: string | null;
  permissions: string[];
  leadershipUnitIds: string[];
};

export function authFromTokenResponse(response: TokenResponse, preferredTuntasId?: string | null): AuthState {
  const activeTuntai = response.tuntai?.filter((tuntas) => isActiveTuntasStatus(tuntas.status)) ?? [];
  const hasPreferredTuntas = activeTuntai.some((tuntas) => tuntas.id === preferredTuntasId);

  return {
    token: response.token,
    refreshToken: response.refreshToken ?? null,
    userId: response.userId,
    email: response.email,
    name: response.name,
    type: response.type,
    tuntai: response.tuntai ?? [],
    activeTuntasId: hasPreferredTuntas ? preferredTuntasId ?? null : activeTuntai.length === 1 ? activeTuntai[0].id : null,
    permissions: [],
    leadershipUnitIds: []
  };
}

export function isActiveTuntasStatus(status: string) {
  return status === "ACTIVE" || status === "APPROVED";
}

export function withPermissions(state: AuthState, permissions: PermissionsResponse): AuthState {
  return {
    ...state,
    permissions: permissions.permissions,
    leadershipUnitIds: permissions.leadershipUnitIds
  };
}

export function loadAuthState(): AuthState | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function saveAuthState(state: AuthState | null) {
  if (!state) {
    localStorage.removeItem(storageKey);
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(state));
}
