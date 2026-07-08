import type {
  AcceptInvitationRequest,
  AdminTuntas,
  ApiErrorBody,
  ChangeMyPasswordRequest,
  CreateInvitationRequest,
  CreateItemRequest,
  CreateLocationRequest,
  CreateOrganizationalUnitRequest,
  CreateEventRequest,
  CreateReservationRequest,
  EventListFilters,
  EventListResponse,
  ForgotPasswordRequest,
  InvitationResponse,
  Item,
  ItemListFilters,
  ItemListResponse,
  Location,
  LocationListResponse,
  LoginRequest,
  Member,
  MemberListResponse,
  MyProfile,
  MyTaskListResponse,
  MessageResponse,
  NotificationListResponse,
  OrganizationalUnit,
  OrganizationalUnitListResponse,
  PermissionsResponse,
  RegisterTuntininkasRequest,
  RegisterWithInviteRequest,
  Reservation,
  ReservationListFilters,
  ReservationListResponse,
  RequestAccountDeletionRequest,
  ResetPasswordRequest,
  RequisitionListResponse,
  RoleListResponse,
  SharedInventoryRequestListResponse,
  SuperAdminNotificationRequest,
  TokenResponse,
  UpdateLocationRequest,
  UpdateEventRequest,
  UpdateMyProfileRequest,
  UpdateOrganizationalUnitRequest,
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

function normalizeMember(member: Member): Member {
  return {
    ...member,
    unitAssignments: member.unitAssignments ?? [],
    leadershipRoles: member.leadershipRoles ?? [],
    leadershipRoleHistory: member.leadershipRoleHistory ?? [],
    ranks: member.ranks ?? []
  };
}

function normalizeMemberList(response: MemberListResponse): MemberListResponse {
  const members = (response.members ?? []).map(normalizeMember);
  return {
    ...response,
    members,
    total: response.total ?? members.length
  };
}

export const api = {
  login: (body: LoginRequest) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body
    }),

  registerTuntininkas: (body: RegisterTuntininkasRequest) =>
    request<TokenResponse>("/api/auth/register", {
      method: "POST",
      body
    }),

  registerWithInvite: (body: RegisterWithInviteRequest) =>
    request<TokenResponse>("/api/auth/register/invite", {
      method: "POST",
      body
    }),

  forgotPassword: (body: ForgotPasswordRequest) =>
    request<MessageResponse>("/api/auth/forgot-password", {
      method: "POST",
      body
    }),

  resetPassword: (body: ResetPasswordRequest) =>
    request<MessageResponse>("/api/auth/reset-password", {
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

  myProfile: (token: string) =>
    request<MyProfile>("/api/users/me", {
      token
    }),

  updateMyProfile: (token: string, body: UpdateMyProfileRequest) =>
    request<MyProfile>("/api/users/me/profile", {
      token,
      method: "PUT",
      body
    }),

  changeMyPassword: (token: string, body: ChangeMyPasswordRequest) =>
    request<MessageResponse>("/api/users/me/password", {
      token,
      method: "PUT",
      body
    }),

  requestAccountDeletion: (token: string, body: RequestAccountDeletionRequest) =>
    request<MessageResponse>("/api/users/me/account-deletion", {
      token,
      method: "POST",
      body
    }),

  myPermissions: (token: string, tuntasId: string) =>
    request<PermissionsResponse>("/api/users/me/permissions", {
      token,
      tuntasId
    }),

  listNotifications: (token: string, unreadOnly = false) =>
    request<NotificationListResponse>("/api/notifications", {
      token,
      query: { unreadOnly }
    }),

  markNotificationRead: (token: string, notificationId: string) =>
    request<MessageResponse>(`/api/notifications/${notificationId}/read`, {
      token,
      method: "POST"
    }),

  markAllNotificationsRead: (token: string) =>
    request<MessageResponse>("/api/notifications/read-all", {
      token,
      method: "POST"
    }),

  listLocations: (token: string, tuntasId: string) =>
    request<LocationListResponse>("/api/locations", {
      token,
      tuntasId
    }),

  createLocation: (token: string, tuntasId: string, body: CreateLocationRequest) =>
    request<Location>("/api/locations", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateLocation: (token: string, tuntasId: string, locationId: string, body: UpdateLocationRequest) =>
    request<Location>(`/api/locations/${locationId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  deleteLocation: (token: string, tuntasId: string, locationId: string) =>
    request<MessageResponse>(`/api/locations/${locationId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  acceptInvitation: (token: string, body: AcceptInvitationRequest) =>
    request<InvitationResponse>("/api/invitations/accept", {
      token,
      method: "POST",
      body
    }),

  createInvitation: (token: string, tuntasId: string, body: CreateInvitationRequest) =>
    request<InvitationResponse>("/api/invitations", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  listRoles: (token: string, tuntasId: string) =>
    request<RoleListResponse>("/api/roles", {
      token,
      tuntasId
    }),

  listOrganizationalUnits: (token: string, tuntasId: string) =>
    request<OrganizationalUnitListResponse>("/api/organizational-units", {
      token,
      tuntasId
    }),

  createOrganizationalUnit: (token: string, tuntasId: string, body: CreateOrganizationalUnitRequest) =>
    request<OrganizationalUnit>("/api/organizational-units", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateOrganizationalUnit: (token: string, tuntasId: string, unitId: string, body: UpdateOrganizationalUnitRequest) =>
    request<OrganizationalUnit>(`/api/organizational-units/${unitId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  deleteOrganizationalUnit: (token: string, tuntasId: string, unitId: string) =>
    request<MessageResponse>(`/api/organizational-units/${unitId}`, {
      token,
      tuntasId,
      method: "DELETE"
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

  createItem: (token: string, tuntasId: string, body: CreateItemRequest) =>
    request<Item>("/api/items", {
      token,
      tuntasId,
      method: "POST",
      body
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

  createReservation: (token: string, tuntasId: string, body: CreateReservationRequest) =>
    request<Reservation>("/api/reservations", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  listRequisitions: (token: string, tuntasId: string) =>
    request<RequisitionListResponse>("/api/requisitions", {
      token,
      tuntasId
    }),

  getRequisition: (token: string, tuntasId: string, requisitionId: string) =>
    request<RequisitionListResponse["requests"][number]>(`/api/requisitions/${requisitionId}`, {
      token,
      tuntasId
    }),

  listSharedInventoryRequests: (token: string, tuntasId: string) =>
    request<SharedInventoryRequestListResponse>("/api/inventory-requests", {
      token,
      tuntasId
    }),

  getSharedInventoryRequest: (token: string, tuntasId: string, requestId: string) =>
    request<SharedInventoryRequestListResponse["requests"][number]>(`/api/inventory-requests/${requestId}`, {
      token,
      tuntasId
    }),

  listMembers: (token: string, tuntasId: string) =>
    request<MemberListResponse>("/api/members", {
      token,
      tuntasId
    }).then(normalizeMemberList),

  listEvents: (token: string, tuntasId: string, filters: EventListFilters = {}) =>
    request<EventListResponse>("/api/events", {
      token,
      tuntasId,
      query: filters
    }),

  getEvent: (token: string, tuntasId: string, eventId: string) =>
    request<EventListResponse["events"][number]>(`/api/events/${eventId}`, {
      token,
      tuntasId
    }),

  createEvent: (token: string, tuntasId: string, body: CreateEventRequest) =>
    request<EventListResponse["events"][number]>("/api/events", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateEvent: (token: string, tuntasId: string, eventId: string, body: UpdateEventRequest) =>
    request<EventListResponse["events"][number]>(`/api/events/${eventId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  listMyTasks: (token: string, tuntasId: string) =>
    request<MyTaskListResponse>("/api/tasks/my", {
      token,
      tuntasId
    }),

  listAdminTuntai: (token: string) =>
    request<AdminTuntas[]>("/api/super-admin/tuntai", {
      token
    }),

  approveTuntas: (token: string, tuntasId: string) =>
    request<MessageResponse>(`/api/super-admin/tuntai/${tuntasId}/approve`, {
      token,
      method: "POST"
    }),

  rejectTuntas: (token: string, tuntasId: string) =>
    request<MessageResponse>(`/api/super-admin/tuntai/${tuntasId}/reject`, {
      token,
      method: "POST"
    }),

  deleteTuntas: (token: string, tuntasId: string) =>
    request<MessageResponse>(`/api/super-admin/tuntai/${tuntasId}`, {
      token,
      method: "DELETE"
    }),

  sendSuperAdminNotification: (token: string, body: SuperAdminNotificationRequest) =>
    request<MessageResponse>("/api/super-admin/notifications", {
      token,
      method: "POST",
      body
    })
};
