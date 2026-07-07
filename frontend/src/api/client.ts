import type {
  ApiErrorBody,
  EventListFilters,
  EventListResponse,
  ItemListFilters,
  ItemListResponse,
  Item,
  LoginRequest,
  MemberListResponse,
  PermissionsResponse,
  Reservation,
  ReservationListFilters,
  ReservationListResponse,
  TokenResponse,
  UserTuntas
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export type RequestOptions = {
  token?: string | null;
  tuntasId?: string | null;
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | null | undefined>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  if (options.tuntasId) {
    headers.set("X-Tuntas-Id", options.tuntasId);
  }

  const query = new URLSearchParams();
  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const url = `${API_BASE_URL}${path}${query.size ? `?${query.toString()}` : ""}`;

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      message = body.error ?? body.message ?? message;
    } catch {
      // Keep the fallback status message when the backend does not return JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  login: (body: LoginRequest) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body
    }),

  refresh: (refreshToken: string) =>
    request<TokenResponse>("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken }
    }),

  logout: (refreshToken: string) =>
    request<void>("/api/auth/logout", {
      method: "POST",
      body: { refreshToken }
    }),

  myTuntai: (token: string) =>
    request<UserTuntas[]>("/api/users/me/tuntai", {
      token
    }),

  myPermissions: (token: string, tuntasId: string) =>
    request<PermissionsResponse>("/api/users/me/permissions", {
      token,
      tuntasId
    }),

  listItems: (token: string, tuntasId: string, filters: ItemListFilters = {}) =>
    request<ItemListResponse>("/api/items", {
      token,
      tuntasId,
      query: filters
    }),

  getItem: (token: string, tuntasId: string, itemId: string) =>
    request<Item>(`/api/items/${itemId}`, {
      token,
      tuntasId
    }),

  listReservations: (token: string, tuntasId: string, filters: ReservationListFilters = {}) =>
    request<ReservationListResponse>("/api/reservations", {
      token,
      tuntasId,
      query: filters
    }),

  getReservation: (token: string, tuntasId: string, reservationId: string) =>
    request<Reservation>(`/api/reservations/${reservationId}`, {
      token,
      tuntasId
    }),

  listMembers: (token: string, tuntasId: string) =>
    request<MemberListResponse>("/api/members", {
      token,
      tuntasId
    }),

  listEvents: (token: string, tuntasId: string, filters: EventListFilters = {}) =>
    request<EventListResponse>("/api/events", {
      token,
      tuntasId,
      query: filters
    })
};
