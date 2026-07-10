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

type AuthFallback = {
  refreshToken?: string | null;
  tuntai?: UserTuntas[];
};

export function authFromTokenResponse(response: TokenResponse, preferredTuntasId?: string | null, fallback: AuthFallback = {}): AuthState {
  const tuntai = response.tuntai?.length ? response.tuntai : fallback.tuntai ?? [];
  const activeTuntai = tuntai.filter((tuntas) => isActiveTuntasStatus(tuntas.status));
  const hasPreferredTuntas = activeTuntai.some((tuntas) => tuntas.id === preferredTuntasId);

  return {
    token: response.token,
    refreshToken: response.refreshToken ?? fallback.refreshToken ?? null,
    userId: response.userId,
    email: response.email,
    name: response.name,
    type: response.type,
    tuntai,
    activeTuntasId: hasPreferredTuntas ? preferredTuntasId ?? null : activeTuntai.length === 1 ? activeTuntai[0].id : null,
    permissions: [],
    leadershipUnitIds: []
  };
}

export function authFromRefreshResponse(response: TokenResponse, current: AuthState): AuthState {
  const refreshed = authFromTokenResponse(response, current.activeTuntasId, {
    refreshToken: current.refreshToken,
    tuntai: current.tuntai
  });
  const previousTuntaiById = new Map(current.tuntai.map((tuntas) => [tuntas.id, tuntas]));
  const restoredTuntai = refreshed.tuntai.map((tuntas) => {
    const previous = previousTuntaiById.get(tuntas.id);
    if (!previous) return tuntas;
    return {
      ...tuntas,
      name: tuntas.name || previous.name,
      krastas: tuntas.krastas || previous.krastas,
      contactEmail: tuntas.contactEmail || previous.contactEmail,
      // Kotlin serialization omits properties that equal a DTO default unless encodeDefaults is enabled.
      status: tuntas.status || previous.status
    };
  });

  if (!current.activeTuntasId) return { ...refreshed, tuntai: restoredTuntai };

  const previouslySelectedTuntas = current.tuntai.find(
    (tuntas) => tuntas.id === current.activeTuntasId && isActiveTuntasStatus(tuntas.status)
  );
  if (!previouslySelectedTuntas) return refreshed;

  return {
    ...refreshed,
    // A refresh response can contain a partial or differently normalized membership list.
    // Keep the last validated selection while hydratePermissions verifies it server-side.
    tuntai: restoredTuntai.some((tuntas) => tuntas.id === previouslySelectedTuntas.id)
      ? restoredTuntai
      : [...restoredTuntai, previouslySelectedTuntas],
    activeTuntasId: previouslySelectedTuntas.id
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
