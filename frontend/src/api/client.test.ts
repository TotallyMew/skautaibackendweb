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

  it("surfaces backend error messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ error: "Bad credentials" }, 401));

    await expect(api.login({ email: "wrong@example.com", password: "bad" })).rejects.toEqual(
      new ApiError("Bad credentials", 401)
    );
  });
});
