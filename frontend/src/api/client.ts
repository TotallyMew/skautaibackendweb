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
  UnitMembership,
  UnitMembershipListResponse,
  UpdateLocationRequest,
  UpdateEventRequest,
  UpdateMyProfileRequest,
  UpdateOrganizationalUnitRequest,
  UserTuntas
} from "./types";
import type * as ApiTypes from "./types";

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

async function requestFormData<T>(
  path: string,
  formData: FormData,
  options: Pick<RequestOptions, "token" | "tuntasId" | "query"> = {}
): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");

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
    method: "POST",
    headers,
    body: formData
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

  return (await response.json()) as T;
}

async function requestBlob(path: string, token: string, tuntasId: string): Promise<Blob> {
  const headers = new Headers({
    Accept: "application/octet-stream",
    Authorization: `Bearer ${token}`,
    "X-Tuntas-Id": tuntasId
  });
  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      message = body.error ?? body.message ?? message;
    } catch {
      // The fallback contains the HTTP status when a file endpoint returns no JSON body.
    }
    throw new ApiError(message, response.status);
  }
  return response.blob();
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

  updateItem: (token: string, tuntasId: string, itemId: string, body: ApiTypes.UpdateItemRequest) =>
    request<Item>(`/api/items/${itemId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  deleteItem: (token: string, tuntasId: string, itemId: string) =>
    request<MessageResponse>(`/api/items/${itemId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  listItemAssignments: (token: string, tuntasId: string, itemId: string) =>
    request<ApiTypes.ItemAssignmentListResponse>(`/api/items/${itemId}/assignments`, {
      token,
      tuntasId
    }),

  listDirectItemLoans: (token: string, tuntasId: string, itemId?: string) =>
    request<ApiTypes.DirectItemLoanListResponse>(itemId ? `/api/items/${itemId}/direct-loans` : "/api/items/direct-loans", {
      token,
      tuntasId
    }),

  createDirectItemLoan: (token: string, tuntasId: string, itemId: string, body: ApiTypes.DirectItemLoanRequest) =>
    request<ApiTypes.DirectItemLoan>(`/api/items/${itemId}/direct-loans`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  returnDirectItemLoan: (token: string, tuntasId: string, itemId: string, loanId: string, body: ApiTypes.ReturnDirectItemLoanRequest) =>
    request<ApiTypes.DirectItemLoan>(`/api/items/${itemId}/direct-loans/${loanId}/return`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  listItemConditionLog: (token: string, tuntasId: string, itemId: string) =>
    request<ApiTypes.ItemConditionLogListResponse>(`/api/items/${itemId}/condition-log`, {
      token,
      tuntasId
    }),

  listItemTransfers: (token: string, tuntasId: string, itemId: string) =>
    request<ApiTypes.ItemTransferListResponse>(`/api/items/${itemId}/transfers`, {
      token,
      tuntasId
    }),

  listItemHistory: (token: string, tuntasId: string, itemId: string) =>
    request<ApiTypes.ItemHistoryListResponse>(`/api/items/${itemId}/history`, {
      token,
      tuntasId
    }),

  resolveItemQr: (token: string, tuntasId: string, qrToken: string) =>
    request<ApiTypes.ItemQrResolveResponse>(`/api/items/resolve-qr/${qrToken}`, {
      token,
      tuntasId
    }),

  restockItem: (token: string, tuntasId: string, itemId: string, body: ApiTypes.RestockItemRequest) =>
    request<Item>(`/api/items/${itemId}/restock`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  consumeItem: (token: string, tuntasId: string, itemId: string, body: ApiTypes.ConsumeItemRequest) =>
    request<Item>(`/api/items/${itemId}/consume`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  reviewItemAddition: (token: string, tuntasId: string, itemId: string, body: ApiTypes.ReviewItemAdditionRequest) =>
    request<Item>(`/api/items/${itemId}/review`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  transferItemToUnit: (token: string, tuntasId: string, itemId: string, body: ApiTypes.TransferItemToUnitRequest) =>
    request<Item>(`/api/items/${itemId}/transfer-to-unit`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  returnItemToShared: (token: string, tuntasId: string, itemId: string, body: ApiTypes.ReturnItemToSharedRequest) =>
    request<Item>(`/api/items/${itemId}/return-to-shared`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  writeOffItem: (token: string, tuntasId: string, itemId: string, body: ApiTypes.WriteOffItemRequest) =>
    request<Item>(`/api/items/${itemId}/write-off`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  listInventoryAuditSessions: (token: string, tuntasId: string) =>
    request<ApiTypes.ItemCheckSessionListResponse>("/api/items/audit-sessions", {
      token,
      tuntasId
    }),

  getInventoryAuditSession: (token: string, tuntasId: string, sessionId: string) =>
    request<ApiTypes.ItemCheckSession>(`/api/items/audit-sessions/${sessionId}`, {
      token,
      tuntasId
    }),

  createInventoryAuditSession: (token: string, tuntasId: string, body: ApiTypes.CreateStorageAuditSessionRequest) =>
    request<ApiTypes.ItemCheckSession>("/api/items/audit-sessions", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  upsertInventoryAuditChecks: (token: string, tuntasId: string, sessionId: string, body: ApiTypes.UpsertStorageAuditChecksRequest) =>
    request<ApiTypes.ItemCheckSession>(`/api/items/audit-sessions/${sessionId}/checks`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  completeInventoryAuditSession: (token: string, tuntasId: string, sessionId: string) =>
    request<ApiTypes.ItemCheckSession>(`/api/items/audit-sessions/${sessionId}/complete`, {
      token,
      tuntasId,
      method: "POST"
    }),

  listInventoryKits: (token: string, tuntasId: string, includeInactive = false) =>
    request<ApiTypes.InventoryKitListResponse>("/api/inventory-kits", {
      token,
      tuntasId,
      query: { includeInactive }
    }),

  getInventoryKit: (token: string, tuntasId: string, kitId: string) =>
    request<ApiTypes.InventoryKit>(`/api/inventory-kits/${kitId}`, {
      token,
      tuntasId
    }),

  createInventoryKit: (token: string, tuntasId: string, body: ApiTypes.CreateInventoryKitRequest) =>
    request<ApiTypes.InventoryKit>("/api/inventory-kits", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateInventoryKit: (token: string, tuntasId: string, kitId: string, body: ApiTypes.UpdateInventoryKitRequest) =>
    request<ApiTypes.InventoryKit>(`/api/inventory-kits/${kitId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  deleteInventoryKit: (token: string, tuntasId: string, kitId: string) =>
    request<MessageResponse>(`/api/inventory-kits/${kitId}`, {
      token,
      tuntasId,
      method: "DELETE"
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

  getReservationAvailability: (token: string, tuntasId: string, startDate: string, endDate: string) =>
    request<ApiTypes.ReservationAvailabilityResponse>("/api/reservations/availability", {
      token,
      tuntasId,
      query: { startDate, endDate }
    }),

  reviewReservationUnit: (token: string, tuntasId: string, reservationId: string, body: ApiTypes.ReviewReservationRequest) =>
    request<Reservation>(`/api/reservations/${reservationId}/unit-review`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  reviewReservationTopLevel: (token: string, tuntasId: string, reservationId: string, body: ApiTypes.ReviewReservationRequest) =>
    request<Reservation>(`/api/reservations/${reservationId}/top-level-review`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  listReservationMovements: (token: string, tuntasId: string, reservationId: string) =>
    request<ApiTypes.ReservationMovementListResponse>(`/api/reservations/${reservationId}/movements`, {
      token,
      tuntasId
    }),

  issueReservationItems: (token: string, tuntasId: string, reservationId: string, body: ApiTypes.ReservationMovementRequest) =>
    request<Reservation>(`/api/reservations/${reservationId}/issue`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  returnReservationItems: (token: string, tuntasId: string, reservationId: string, body: ApiTypes.ReservationMovementRequest) =>
    request<Reservation>(`/api/reservations/${reservationId}/return`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  markReservationItemsReturned: (token: string, tuntasId: string, reservationId: string, body: ApiTypes.ReservationMovementRequest) =>
    request<Reservation>(`/api/reservations/${reservationId}/mark-returned`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateReservationPickup: (token: string, tuntasId: string, reservationId: string, body: ApiTypes.UpdateReservationPickupRequest) =>
    request<Reservation>(`/api/reservations/${reservationId}/pickup-time`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  updateReservationReturnTime: (token: string, tuntasId: string, reservationId: string, body: ApiTypes.UpdateReservationReturnTimeRequest) =>
    request<Reservation>(`/api/reservations/${reservationId}/return-time`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  cancelReservation: (token: string, tuntasId: string, reservationId: string) =>
    request<MessageResponse>(`/api/reservations/${reservationId}`, {
      token,
      tuntasId,
      method: "DELETE"
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

  createRequisition: (token: string, tuntasId: string, body: ApiTypes.CreateRequisitionRequest) =>
    request<RequisitionListResponse["requests"][number]>("/api/requisitions", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  deleteRequisition: (token: string, tuntasId: string, requisitionId: string) =>
    request<MessageResponse>(`/api/requisitions/${requisitionId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  reviewRequisitionUnit: (token: string, tuntasId: string, requisitionId: string, body: ApiTypes.RequisitionUnitReviewRequest) =>
    request<RequisitionListResponse["requests"][number]>(`/api/requisitions/${requisitionId}/unit-review`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  reviewRequisitionTopLevel: (token: string, tuntasId: string, requisitionId: string, body: ApiTypes.RequisitionTopLevelReviewRequest) =>
    request<RequisitionListResponse["requests"][number]>(`/api/requisitions/${requisitionId}/top-level-review`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  markRequisitionPurchased: (token: string, tuntasId: string, requisitionId: string, body: ApiTypes.RequisitionMarkPurchasedRequest = {}) =>
    request<RequisitionListResponse["requests"][number]>(`/api/requisitions/${requisitionId}/mark-purchased`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  addRequisitionToInventory: (token: string, tuntasId: string, requisitionId: string, body: ApiTypes.AddRequisitionToInventoryRequest) =>
    request<RequisitionListResponse["requests"][number]>(`/api/requisitions/${requisitionId}/add-to-inventory`, {
      token,
      tuntasId,
      method: "POST",
      body
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

  createSharedInventoryRequest: (token: string, tuntasId: string, body: ApiTypes.CreateSharedInventoryRequestRequest) =>
    request<SharedInventoryRequestListResponse["requests"][number]>("/api/inventory-requests", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  deleteSharedInventoryRequest: (token: string, tuntasId: string, requestId: string) =>
    request<MessageResponse>(`/api/inventory-requests/${requestId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  reviewSharedInventoryRequestUnit: (token: string, tuntasId: string, requestId: string, body: ApiTypes.SharedInventoryUnitReviewRequest) =>
    request<SharedInventoryRequestListResponse["requests"][number]>(`/api/inventory-requests/${requestId}/draugininkas-review`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  reviewSharedInventoryRequestTopLevel: (token: string, tuntasId: string, requestId: string, body: ApiTypes.SharedInventoryTopLevelReviewRequest) =>
    request<SharedInventoryRequestListResponse["requests"][number]>(`/api/inventory-requests/${requestId}/top-level-review`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  listMembers: (token: string, tuntasId: string) =>
    request<MemberListResponse>("/api/members", {
      token,
      tuntasId
    }).then(normalizeMemberList),

  getMember: (token: string, tuntasId: string, userId: string) =>
    request<Member>(`/api/members/${userId}`, {
      token,
      tuntasId
    }).then(normalizeMember),

  assignLeadershipRole: (token: string, tuntasId: string, userId: string, body: ApiTypes.AssignLeadershipRoleRequest) =>
    request<Member>(`/api/members/${userId}/leadership-roles`, {
      token,
      tuntasId,
      method: "POST",
      body
    }).then(normalizeMember),

  updateLeadershipRole: (token: string, tuntasId: string, userId: string, assignmentId: string, body: ApiTypes.UpdateLeadershipRoleRequest) =>
    request<Member>(`/api/members/${userId}/leadership-roles/${assignmentId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }).then(normalizeMember),

  deleteLeadershipRole: (token: string, tuntasId: string, userId: string, assignmentId: string) =>
    request<Member>(`/api/members/${userId}/leadership-roles/${assignmentId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }).then(normalizeMember),

  stepDownLeadershipRole: (token: string, tuntasId: string, assignmentId: string) =>
    request<Member>(`/api/members/me/leadership-roles/${assignmentId}/step-down`, {
      token,
      tuntasId,
      method: "POST"
    }).then(normalizeMember),

  requestLeadershipResignation: (token: string, tuntasId: string, assignmentId: string, body: ApiTypes.CreateLeadershipChangeRequest) =>
    request<ApiTypes.LeadershipChangeRequest>(`/api/members/me/leadership-roles/${assignmentId}/resignation-request`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  transferTuntininkas: (token: string, tuntasId: string, body: ApiTypes.TransferTuntininkasRequest) =>
    request<MessageResponse>("/api/members/me/tuntininkas/transfer", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  assignRank: (token: string, tuntasId: string, userId: string, body: ApiTypes.AssignRankRequest) =>
    request<Member>(`/api/members/${userId}/ranks`, {
      token,
      tuntasId,
      method: "POST",
      body
    }).then(normalizeMember),

  deleteRank: (token: string, tuntasId: string, userId: string, rankId: string) =>
    request<Member>(`/api/members/${userId}/ranks/${rankId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }).then(normalizeMember),

  removeMember: (token: string, tuntasId: string, userId: string) =>
    request<MessageResponse>(`/api/members/${userId}/remove`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  resignMember: (token: string, tuntasId: string, userId: string) =>
    request<MessageResponse>(`/api/members/${userId}/resign`, {
      token,
      tuntasId,
      method: "POST"
    }),

  reviewLeadershipChangeRequest: (token: string, tuntasId: string, requestId: string, body: ApiTypes.ReviewLeadershipChangeRequest) =>
    request<ApiTypes.LeadershipChangeRequest>(`/api/leadership-change-requests/${requestId}/review`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  getOrganizationalUnit: (token: string, tuntasId: string, unitId: string) =>
    request<OrganizationalUnit>(`/api/organizational-units/${unitId}`, {
      token,
      tuntasId
    }),

  listOrganizationalUnitMembers: (token: string, tuntasId: string, unitId: string) =>
    request<UnitMembershipListResponse>(`/api/organizational-units/${unitId}/members`, {
      token,
      tuntasId
    }),

  addOrganizationalUnitMember: (token: string, tuntasId: string, unitId: string, body: ApiTypes.AssignUnitMemberRequest) =>
    request<UnitMembership>(`/api/organizational-units/${unitId}/members`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateOrganizationalUnitMemberVisibility: (token: string, tuntasId: string, unitId: string, userId: string, body: ApiTypes.UnitMemberVisibilityRequest) =>
    request<UnitMembership>(`/api/organizational-units/${unitId}/members/${userId}/visibility`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  moveOrganizationalUnitMember: (token: string, tuntasId: string, targetUnitId: string, userId: string) =>
    request<UnitMembership>(`/api/organizational-units/${targetUnitId}/members/${userId}/move`, {
      token,
      tuntasId,
      method: "POST"
    }),

  leaveOrganizationalUnit: (token: string, tuntasId: string, unitId: string) =>
    request<MessageResponse>(`/api/organizational-units/${unitId}/members/me/leave`, {
      token,
      tuntasId,
      method: "POST"
    }),

  removeOrganizationalUnitMember: (token: string, tuntasId: string, unitId: string, userId: string) =>
    request<MessageResponse>(`/api/organizational-units/${unitId}/members/${userId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  getOrganizationalUnitPrivacyAudit: (token: string, tuntasId: string, unitId: string) =>
    request<ApiTypes.SeniorUnitAccessAuditListResponse>(`/api/organizational-units/${unitId}/privacy-audit`, {
      token,
      tuntasId
    }),

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

  deleteEvent: (token: string, tuntasId: string, eventId: string) =>
    request<MessageResponse>(`/api/events/${eventId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  listEventCandidateMembers: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventCandidateMembersResponse>(`/api/events/${eventId}/candidate-members`, {
      token,
      tuntasId
    }),

  assignEventRole: (token: string, tuntasId: string, eventId: string, body: ApiTypes.AssignEventRoleRequest) =>
    request<ApiTypes.EventRole>(`/api/events/${eventId}/roles`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  deleteEventRole: (token: string, tuntasId: string, eventId: string, roleId: string) =>
    request<MessageResponse>(`/api/events/${eventId}/roles/${roleId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  listEventPastovykles: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.PastovykleListResponse>(`/api/events/${eventId}/pastovykles`, {
      token,
      tuntasId
    }),

  createEventPastovykle: (token: string, tuntasId: string, eventId: string, body: ApiTypes.CreatePastovykleRequest) =>
    request<ApiTypes.Pastovykle>(`/api/events/${eventId}/pastovykles`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateEventPastovykle: (token: string, tuntasId: string, eventId: string, pastovykleId: string, body: ApiTypes.UpdatePastovykleRequest) =>
    request<ApiTypes.Pastovykle>(`/api/events/${eventId}/pastovykles/${pastovykleId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  deleteEventPastovykle: (token: string, tuntasId: string, eventId: string, pastovykleId: string) =>
    request<MessageResponse>(`/api/events/${eventId}/pastovykles/${pastovykleId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  getEventPackingList: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventPackingList>(`/api/events/${eventId}/packing-list`, {
      token,
      tuntasId
    }),

  generateEventPackingList: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventPackingList>(`/api/events/${eventId}/packing-list/generate`, {
      token,
      tuntasId,
      method: "POST"
    }),

  createEventPackingContainer: (token: string, tuntasId: string, eventId: string, body: ApiTypes.CreateEventPackingContainerRequest) =>
    request<ApiTypes.EventPackingContainer>(`/api/events/${eventId}/packing-list/containers`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateEventPackingLine: (token: string, tuntasId: string, eventId: string, lineId: string, body: ApiTypes.UpdateEventPackingLineRequest) =>
    request<ApiTypes.EventPackingLine>(`/api/events/${eventId}/packing-list/lines/${lineId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  getEventInventoryPlan: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventInventoryPlan>(`/api/events/${eventId}/inventory-plan`, {
      token,
      tuntasId
    }),

  createEventInventoryBucket: (token: string, tuntasId: string, eventId: string, body: ApiTypes.CreateEventInventoryBucketRequest) =>
    request<ApiTypes.EventInventoryBucket>(`/api/events/${eventId}/inventory-buckets`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateEventInventoryBucket: (token: string, tuntasId: string, eventId: string, bucketId: string, body: ApiTypes.UpdateEventInventoryBucketRequest) =>
    request<ApiTypes.EventInventoryBucket>(`/api/events/${eventId}/inventory-buckets/${bucketId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  deleteEventInventoryBucket: (token: string, tuntasId: string, eventId: string, bucketId: string) =>
    request<MessageResponse>(`/api/events/${eventId}/inventory-buckets/${bucketId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  createEventInventoryItem: (token: string, tuntasId: string, eventId: string, body: ApiTypes.CreateEventInventoryItemRequest) =>
    request<ApiTypes.EventInventoryItem>(`/api/events/${eventId}/inventory-items`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  createEventInventoryItemsBulk: (token: string, tuntasId: string, eventId: string, body: ApiTypes.CreateEventInventoryItemsBulkRequest) =>
    request<{ items: ApiTypes.EventInventoryItem[]; total: number }>(`/api/events/${eventId}/inventory-items/bulk`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateEventInventoryItem: (token: string, tuntasId: string, eventId: string, inventoryItemId: string, body: ApiTypes.UpdateEventInventoryItemRequest) =>
    request<ApiTypes.EventInventoryItem>(`/api/events/${eventId}/inventory-items/${inventoryItemId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  deleteEventInventoryItem: (token: string, tuntasId: string, eventId: string, inventoryItemId: string) =>
    request<MessageResponse>(`/api/events/${eventId}/inventory-items/${inventoryItemId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  createEventInventorySource: (token: string, tuntasId: string, eventId: string, inventoryItemId: string, body: ApiTypes.CreateEventInventorySourceRequest) =>
    request<ApiTypes.EventInventorySource>(`/api/events/${eventId}/inventory-items/${inventoryItemId}/sources`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateEventInventorySource: (token: string, tuntasId: string, eventId: string, sourceId: string, body: ApiTypes.UpdateEventInventorySourceRequest) =>
    request<ApiTypes.EventInventorySource>(`/api/events/${eventId}/inventory-items/sources/${sourceId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  deleteEventInventorySource: (token: string, tuntasId: string, eventId: string, sourceId: string) =>
    request<MessageResponse>(`/api/events/${eventId}/inventory-items/sources/${sourceId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  createEventInventoryAllocation: (token: string, tuntasId: string, eventId: string, body: ApiTypes.CreateEventInventoryAllocationRequest) =>
    request<ApiTypes.EventInventoryAllocation>(`/api/events/${eventId}/inventory-allocations`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateEventInventoryAllocation: (token: string, tuntasId: string, eventId: string, allocationId: string, body: ApiTypes.UpdateEventInventoryAllocationRequest) =>
    request<ApiTypes.EventInventoryAllocation>(`/api/events/${eventId}/inventory-allocations/${allocationId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  deleteEventInventoryAllocation: (token: string, tuntasId: string, eventId: string, allocationId: string) =>
    request<MessageResponse>(`/api/events/${eventId}/inventory-allocations/${allocationId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  getEventInventoryReadiness: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventInventoryReadiness>(`/api/events/${eventId}/inventory-readiness`, {
      token,
      tuntasId
    }),

  listEventInventoryCustody: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventInventoryCustodyListResponse>(`/api/events/${eventId}/inventory-custody`, {
      token,
      tuntasId
    }),

  listEventInventoryMovements: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventInventoryMovementListResponse>(`/api/events/${eventId}/inventory-movements`, {
      token,
      tuntasId
    }),

  createEventInventoryMovement: (token: string, tuntasId: string, eventId: string, body: ApiTypes.CreateEventInventoryMovementRequest) =>
    request<ApiTypes.EventInventoryMovement>(`/api/events/${eventId}/inventory-movements`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  listEventInventoryTransferRequests: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventInventoryTransferRequestListResponse>(`/api/events/${eventId}/inventory-transfer-requests`, {
      token,
      tuntasId
    }),

  createEventInventoryTransferRequest: (token: string, tuntasId: string, eventId: string, body: ApiTypes.CreateEventInventoryTransferRequest) =>
    request<ApiTypes.EventInventoryTransferRequest>(`/api/events/${eventId}/inventory-transfer-requests`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  respondEventInventoryTransferRequest: (token: string, tuntasId: string, eventId: string, requestId: string, body: ApiTypes.RespondEventInventoryTransferRequest) =>
    request<ApiTypes.EventInventoryTransferRequest>(`/api/events/${eventId}/inventory-transfer-requests/${requestId}/respond`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  listEventPurchases: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventPurchaseListResponse>(`/api/events/${eventId}/purchases`, {
      token,
      tuntasId
    }),

  createEventPurchase: (token: string, tuntasId: string, eventId: string, body: ApiTypes.CreateEventPurchaseRequest) =>
    request<ApiTypes.EventPurchase>(`/api/events/${eventId}/purchases`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateEventPurchase: (token: string, tuntasId: string, eventId: string, purchaseId: string, body: ApiTypes.UpdateEventPurchaseRequest) =>
    request<ApiTypes.EventPurchase>(`/api/events/${eventId}/purchases/${purchaseId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  attachEventPurchaseInvoice: (token: string, tuntasId: string, eventId: string, purchaseId: string, body: ApiTypes.AttachEventPurchaseInvoiceRequest) =>
    request<ApiTypes.EventPurchase>(`/api/events/${eventId}/purchases/${purchaseId}/invoice`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  downloadEventPurchaseInvoice: (token: string, tuntasId: string, eventId: string, purchaseId: string, invoiceId?: string | null) =>
    requestBlob(
      invoiceId
        ? `/api/events/${eventId}/purchases/${purchaseId}/invoices/${invoiceId}/download`
        : `/api/events/${eventId}/purchases/${purchaseId}/invoice/download`,
      token,
      tuntasId
    ),

  completeEventPurchase: (token: string, tuntasId: string, eventId: string, purchaseId: string) =>
    request<ApiTypes.EventPurchase>(`/api/events/${eventId}/purchases/${purchaseId}/complete`, {
      token,
      tuntasId,
      method: "POST"
    }),

  addEventPurchaseToInventory: (token: string, tuntasId: string, eventId: string, purchaseId: string) =>
    request<ApiTypes.EventPurchase>(`/api/events/${eventId}/purchases/${purchaseId}/add-to-inventory`, {
      token,
      tuntasId,
      method: "POST"
    }),

  getEventFinance: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventFinance>(`/api/events/${eventId}/finance`, {
      token,
      tuntasId
    }),

  updateEventFinanceBudget: (token: string, tuntasId: string, eventId: string, body: ApiTypes.UpdateEventFinanceBudgetRequest) =>
    request<ApiTypes.EventFinance>(`/api/events/${eventId}/finance/budget`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  createEventExtraCost: (token: string, tuntasId: string, eventId: string, body: ApiTypes.CreateEventExtraCostRequest) =>
    request<ApiTypes.EventFinance>(`/api/events/${eventId}/finance/costs`, {
      token, tuntasId, method: "POST", body
    }),

  updateEventExtraCost: (token: string, tuntasId: string, eventId: string, costId: string, body: ApiTypes.UpdateEventExtraCostRequest) =>
    request<ApiTypes.EventFinance>(`/api/events/${eventId}/finance/costs/${costId}`, {
      token, tuntasId, method: "PUT", body
    }),

  deleteEventExtraCost: (token: string, tuntasId: string, eventId: string, costId: string) =>
    request<ApiTypes.EventFinance>(`/api/events/${eventId}/finance/costs/${costId}`, {
      token, tuntasId, method: "DELETE"
    }),

  getEventReconciliation: (token: string, tuntasId: string, eventId: string) =>
    request<ApiTypes.EventReconciliation>(`/api/events/${eventId}/reconciliation`, {
      token,
      tuntasId
    }),

  reconcileEventReturns: (token: string, tuntasId: string, eventId: string, body: ApiTypes.ReconcileEventReturnsRequest) =>
    request<ApiTypes.EventReconciliation>(`/api/events/${eventId}/reconciliation/returns`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  reconcileEventPurchases: (token: string, tuntasId: string, eventId: string, body: ApiTypes.ReconcileEventPurchasesRequest) =>
    request<ApiTypes.EventReconciliation>(`/api/events/${eventId}/reconciliation/purchases`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  completeEvent: (token: string, tuntasId: string, eventId: string) =>
    request<EventListResponse["events"][number]>(`/api/events/${eventId}/complete`, {
      token,
      tuntasId,
      method: "POST"
    }),

  listInventoryTemplates: (token: string, tuntasId: string, eventType?: string) =>
    request<ApiTypes.InventoryTemplateListResponse>("/api/inventory-templates", {
      token,
      tuntasId,
      query: { eventType }
    }),

  createInventoryTemplate: (token: string, tuntasId: string, body: ApiTypes.CreateInventoryTemplateRequest) =>
    request<ApiTypes.InventoryTemplate>("/api/inventory-templates", {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  updateInventoryTemplate: (token: string, tuntasId: string, templateId: string, body: ApiTypes.UpdateInventoryTemplateRequest) =>
    request<ApiTypes.InventoryTemplate>(`/api/inventory-templates/${templateId}`, {
      token,
      tuntasId,
      method: "PUT",
      body
    }),

  deleteInventoryTemplate: (token: string, tuntasId: string, templateId: string) =>
    request<MessageResponse>(`/api/inventory-templates/${templateId}`, {
      token,
      tuntasId,
      method: "DELETE"
    }),

  applyInventoryTemplateToEvent: (token: string, tuntasId: string, eventId: string, body: ApiTypes.ApplyInventoryTemplateRequest) =>
    request<ApiTypes.AppliedInventoryTemplateResponse>(`/api/events/${eventId}/inventory-plan/from-template`, {
      token,
      tuntasId,
      method: "POST",
      body
    }),

  applyInventoryTemplateWithReservation: (token: string, tuntasId: string, eventId: string, body: ApiTypes.ApplyInventoryTemplateRequest) =>
    request<ApiTypes.AppliedInventoryTemplateResponse>(`/api/events/${eventId}/apply-template-with-reservation`, {
      token,
      tuntasId,
      method: "POST",
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
    }),

  listSuperAdminTuntasRoles: (token: string, tuntasId: string) =>
    request<RoleListResponse>(`/api/super-admin/tuntai/${tuntasId}/roles`, {
      token
    }),

  listSuperAdminTuntasUnits: (token: string, tuntasId: string) =>
    request<OrganizationalUnitListResponse>(`/api/super-admin/tuntai/${tuntasId}/organizational-units`, {
      token
    }),

  listSuperAdminTuntasMembers: (token: string, tuntasId: string) =>
    request<MemberListResponse>(`/api/super-admin/tuntai/${tuntasId}/members`, {
      token
    }).then(normalizeMemberList),

  getSuperAdminTuntasMember: (token: string, tuntasId: string, userId: string) =>
    request<Member>(`/api/super-admin/tuntai/${tuntasId}/members/${userId}`, {
      token
    }).then(normalizeMember),

  uploadImage: (token: string, tuntasId: string, file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    return requestFormData<ApiTypes.UploadResponse>("/api/uploads/images", formData, { token, tuntasId });
  },

  uploadDocument: (token: string, tuntasId: string, file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    return requestFormData<ApiTypes.UploadResponse>("/api/uploads/documents", formData, { token, tuntasId });
  },

  liveEventsRequest: (token: string, tuntasId: string) => ({
    url: `${API_BASE_URL}/api/live/events`,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Tuntas-Id": tuntasId
    }
  })
};
