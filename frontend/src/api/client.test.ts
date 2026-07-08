import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends auth and active tuntas headers for scoped requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ permissions: [], leadershipUnitIds: [] }));

    await api.myPermissions("access-token", "tuntas-1");

    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Tuntas-Id")).toBe("tuntas-1");
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("sends inventory filters as query parameters", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ items: [], total: 0, limit: 25, offset: 0, hasMore: false }));

    await api.listItems("access-token", "tuntas-1", {
      q: "palapine",
      status: "ACTIVE",
      type: "",
      sharedOnly: true,
      limit: 25,
      offset: 50
    });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/items?q=palapine&status=ACTIVE&sharedOnly=true&limit=25&offset=50");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Tuntas-Id")).toBe("tuntas-1");
  });

  it("fetches inventory item detail with tuntas context", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        id: "item-1",
        qrToken: "qr-1",
        tuntasId: "tuntas-1",
        origin: "UNIT_ACQUIRED",
        name: "Palapine",
        type: "SHARED",
        category: "Stovyklavimas",
        condition: "Gera",
        quantity: 2,
        status: "ACTIVE",
        createdAt: "2026-07-07T10:00:00Z",
        updatedAt: "2026-07-07T10:00:00Z"
      })
    );

    await api.getItem("access-token", "tuntas-1", "item-1");

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/items/item-1");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Tuntas-Id")).toBe("tuntas-1");
  });

  it("fetches reservations with status pagination and tuntas context", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ reservations: [], total: 0, limit: 25, offset: 25, hasMore: false }));

    await api.listReservations("access-token", "tuntas-1", {
      status: "PENDING",
      limit: 25,
      offset: 25
    });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/reservations?status=PENDING&limit=25&offset=25");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Tuntas-Id")).toBe("tuntas-1");
  });

  it("fetches reservation detail with tuntas context", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        id: "reservation-1",
        title: "Savaitgalio zygiui",
        tuntasId: "tuntas-1",
        reservedByUserId: "user-1",
        totalItems: 1,
        totalQuantity: 2,
        startDate: "2026-07-07",
        endDate: "2026-07-08",
        status: "PENDING",
        createdAt: "2026-07-07T10:00:00Z",
        updatedAt: "2026-07-07T10:00:00Z",
        items: []
      })
    );

    await api.getReservation("access-token", "tuntas-1", "reservation-1");

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/reservations/reservation-1");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Tuntas-Id")).toBe("tuntas-1");
  });

  it("fetches members with tuntas context", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ members: [], total: 0 }));

    await api.listMembers("access-token", "tuntas-1");

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/members");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Tuntas-Id")).toBe("tuntas-1");
  });

  it("normalizes missing member collection fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        members: [
          {
            userId: "user-1",
            name: "Jonas",
            surname: "Jonaitis",
            email: "",
            joinedAt: "2026-07-07T10:00:00Z"
          }
        ]
      })
    );

    const response = await api.listMembers("access-token", "tuntas-1");

    expect(response.total).toBe(1);
    expect(response.members[0].unitAssignments).toEqual([]);
    expect(response.members[0].leadershipRoles).toEqual([]);
    expect(response.members[0].leadershipRoleHistory).toEqual([]);
    expect(response.members[0].ranks).toEqual([]);
  });

  it("fetches events with filters and tuntas context", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ events: [], total: 0, limit: 25, offset: 0, hasMore: false }));

    await api.listEvents("access-token", "tuntas-1", {
      status: "PLANNING",
      type: "STOVYKLA",
      limit: 25,
      offset: 0
    });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/events?status=PLANNING&type=STOVYKLA&limit=25&offset=0");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Tuntas-Id")).toBe("tuntas-1");
  });

  it("sends JSON bodies for login", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        token: "access-token",
        refreshToken: "refresh-token",
        userId: "user-1",
        email: "jonas@example.com",
        name: "Jonas",
        type: "user",
        tuntai: []
      })
    );

    await api.login({ email: "jonas@example.com", password: "secret" });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/auth/login");
    expect(init?.method).toBe("POST");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init?.body).toBe(JSON.stringify({ email: "jonas@example.com", password: "secret" }));
  });

  it("accepts invitations for an existing authenticated user", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        code: "ABC123",
        tuntasId: "tuntas-2",
        roleName: "skautas",
        tuntasName: "Antras tuntas",
        expiresAt: "2026-07-09T10:00:00Z"
      })
    );

    await api.acceptInvitation("access-token", { code: "ABC123" });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/invitations/accept");
    expect(init?.method).toBe("POST");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init?.body).toBe(JSON.stringify({ code: "ABC123" }));
  });

  it("updates the authenticated user profile", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        userId: "user-1",
        name: "Jonas",
        surname: "Jonaitis",
        email: "jonas@example.com",
        phone: "+37060000000",
        createdAt: "2026-07-07T10:00:00Z",
        updatedAt: "2026-07-08T10:00:00Z"
      })
    );

    await api.updateMyProfile("access-token", {
      name: "Jonas",
      surname: "Jonaitis",
      email: "jonas@example.com",
      phone: "+37060000000"
    });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/users/me/profile");
    expect(init?.method).toBe("PUT");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(init?.body).toBe(JSON.stringify({
      name: "Jonas",
      surname: "Jonaitis",
      email: "jonas@example.com",
      phone: "+37060000000"
    }));
  });

  it("requests account deletion with the current password", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ message: "Patvirtinimo nuoroda išsiųsta." }, 202));

    await api.requestAccountDeletion("access-token", { password: "secret123" });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/users/me/account-deletion");
    expect(init?.method).toBe("POST");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(init?.body).toBe(JSON.stringify({ password: "secret123" }));
  });

  it("fetches unread notifications with auth", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        notifications: [],
        total: 0,
        unreadCount: 0
      })
    );

    await api.listNotifications("access-token", true);

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/notifications?unreadOnly=true");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("marks a notification as read", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ message: "Notification marked as read" }));

    await api.markNotificationRead("access-token", "notification-1");

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Headers;

    expect(url).toBe("http://localhost:8081/api/notifications/notification-1/read");
    expect(init?.method).toBe("POST");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("surfaces backend error messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ error: "Bad credentials" }, 401));

    await expect(api.login({ email: "wrong@example.com", password: "bad" })).rejects.toEqual(
      new ApiError("Bad credentials", 401)
    );
  });
});
