import { describe, expect, it } from "vitest";
import {
  codeLabel,
  finiteCount,
  itemCategoryLabel,
  itemConditionLabel,
  requisitionActionLabel,
  requestTypeLabel,
  reservationStatusLabel,
  reviewLevelLabel,
  statusLabel
} from "./display";

describe("display labels", () => {
  it("translates production requisition statuses", () => {
    expect(statusLabel("INVENTORY_ADDED")).toBe("Pridėta į inventorių");
    expect(statusLabel("SKIPPED")).toBe("Praleista");
    expect(statusLabel("PARTIALLY_APPROVED")).toBe("Iš dalies patvirtinta");
  });

  it("translates inventory metadata", () => {
    expect(itemCategoryLabel("CAMPING")).toBe("Stovyklavimo įranga");
    expect(itemCategoryLabel("FIRST_AID")).toBe("Pirmoji pagalba");
    expect(itemConditionLabel("GOOD")).toBe("Gera");
  });

  it("uses domain-specific request labels", () => {
    expect(reservationStatusLabel("ACTIVE")).toBe("Aktyvi");
    expect(requestTypeLabel("RESTOCK_EXISTING")).toBe("Esamo įrašo papildymas");
    expect(reviewLevelLabel("TOP_LEVEL")).toBe("Tunto peržiūra");
    expect(requisitionActionLabel("TOP_LEVEL_REJECTED")).toBe("Tuntas atmetė");
  });

  it("humanizes unknown codes instead of leaking raw enum syntax", () => {
    expect(codeLabel("SOME_NEW_VALUE")).toBe("Some new value");
    expect(codeLabel(" ")).toBe("—");
  });

  it("normalizes invalid counts", () => {
    expect(finiteCount(4)).toBe(4);
    expect(finiteCount("3")).toBe(3);
    expect(finiteCount(Number.NaN)).toBe(0);
    expect(finiteCount(undefined)).toBe(0);
    expect(finiteCount(-1)).toBe(0);
  });
});
