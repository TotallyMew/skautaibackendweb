import { describe, expect, it } from "vitest";
import { taskRoutePath } from "./tasks";

describe("taskRoutePath", () => {
  it("routes purchase tasks to the purchase workflow", () => {
    expect(taskRoutePath("requisition_list")).toBe("/purchases");
    expect(taskRoutePath("requisition_review", "req-1")).toBe("/purchases/req-1");
  });

  it("routes shared inventory pickup tasks to the pickup workflow", () => {
    expect(taskRoutePath("shared_request_list")).toBe("/pickup-requests");
    expect(taskRoutePath("shared_request_review", "pickup-1")).toBe("/pickup-requests/pickup-1");
  });

  it("keeps legacy mixed request list tasks usable", () => {
    expect(taskRoutePath("request_list")).toBe("/purchases");
  });

  it("preserves reservation queue filters", () => {
    expect(taskRoutePath("reservation_list?mode=assigned")).toBe("/reservations?mode=assigned");
  });

  it("opens inventory audits at the actionable record", () => {
    expect(taskRoutePath("inventory_audit_history")).toBe("/inventory/audits");
    expect(taskRoutePath("inventory_audit_session/audit-1")).toBe("/inventory/audits/audit-1");
  });

  it("opens event tasks in the matching workspace tab", () => {
    expect(taskRoutePath("event_plan/event-1")).toBe("/events/event-1/plan");
    expect(taskRoutePath("event_reconciliation/event-1")).toBe("/events/event-1/reconciliation");
    expect(taskRoutePath("event_packing/event-1")).toBe("/events/event-1/packing");
  });
});
