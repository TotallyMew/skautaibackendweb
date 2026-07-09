import { describe, expect, it } from "vitest";
import { canUseRequisitions, canUseSharedInventoryRequests, getPermissionSet } from "./permissions";

describe("permission helpers", () => {
  it("keeps purchase and pickup request permissions separate", () => {
    expect(canUseRequisitions(["requisitions.create:OWN_UNIT"])).toBe(true);
    expect(canUseSharedInventoryRequests(["requisitions.create:OWN_UNIT"])).toBe(false);

    expect(canUseRequisitions(["items.request.approve.unit:OWN_UNIT"])).toBe(false);
    expect(canUseSharedInventoryRequests(["items.request.approve.unit:OWN_UNIT"])).toBe(true);
  });

  it("builds a web navigation permission set", () => {
    const permissions = getPermissionSet([
      "items.view:ALL",
      "reservations.create:ALL",
      "items.request.bendras:ALL",
      "events.view:ALL",
      "locations.manage:OWN_UNIT"
    ]);

    expect(permissions.inventory).toBe(true);
    expect(permissions.reservations).toBe(true);
    expect(permissions.requisitions).toBe(false);
    expect(permissions.sharedRequests).toBe(true);
    expect(permissions.events).toBe(true);
    expect(permissions.locations).toBe(true);
  });
});
