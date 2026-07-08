import { describe, expect, it } from "vitest";
import { authFromTokenResponse, withPermissions } from "./authStorage";
import type { TokenResponse } from "../api/types";

const tokenResponse: TokenResponse = {
  token: "access-token",
  refreshToken: "refresh-token",
  userId: "user-1",
  email: "jonas@example.com",
  name: "Jonas",
  type: "user",
  tuntai: [
    {
      id: "tuntas-1",
      name: "Pirmas tuntas",
      krastas: "Vilnius",
      contactEmail: "pirmas@example.com",
      status: "ACTIVE"
    },
    {
      id: "tuntas-2",
      name: "Antras tuntas",
      krastas: "Kaunas",
      contactEmail: "antras@example.com",
      status: "ACTIVE"
    }
  ]
};

describe("authFromTokenResponse", () => {
  it("keeps a preferred active tuntas when it is still available", () => {
    const state = authFromTokenResponse(tokenResponse, "tuntas-2");

    expect(state.activeTuntasId).toBe("tuntas-2");
    expect(state.refreshToken).toBe("refresh-token");
  });

  it("requires explicit tuntas selection when more than one active tuntas is available", () => {
    const state = authFromTokenResponse(tokenResponse, "missing-tuntas");

    expect(state.activeTuntasId).toBeNull();
  });

  it("selects the only active tuntas automatically", () => {
    const state = authFromTokenResponse({
      ...tokenResponse,
      tuntai: [tokenResponse.tuntai![0]]
    });

    expect(state.activeTuntasId).toBe("tuntas-1");
  });

  it("treats APPROVED tuntas as an active legacy status", () => {
    const state = authFromTokenResponse({
      ...tokenResponse,
      tuntai: [{ ...tokenResponse.tuntai![0], status: "APPROVED" }]
    });

    expect(state.activeTuntasId).toBe("tuntas-1");
  });
});

describe("withPermissions", () => {
  it("stores permissions and leadership unit ids on the auth state", () => {
    const state = withPermissions(authFromTokenResponse(tokenResponse), {
      permissions: ["items.read", "items.write"],
      leadershipUnitIds: ["unit-1"]
    });

    expect(state.permissions).toEqual(["items.read", "items.write"]);
    expect(state.leadershipUnitIds).toEqual(["unit-1"]);
  });
});
