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
});
