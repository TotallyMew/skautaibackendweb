import type { OrganizationalUnit } from "../api/types";

export type UnitTone = "patyre" | "skautai" | "vilkai" | "gildija" | "vyr-skautai" | "vyr-skautes" | "default";

export function unitPaletteClass(unit: Pick<OrganizationalUnit, "type" | "subType">) {
  return `unit-palette-${resolveUnitTone(unit)}`;
}

export function resolveUnitTone(unit: Pick<OrganizationalUnit, "type" | "subType">): UnitTone {
  switch (unit.type) {
    case "PATYRUSIU_SKAUTU_DRAUGOVE": return "patyre";
    case "SKAUTU_DRAUGOVE": return "skautai";
    case "VILKU_DRAUGOVE": return "vilkai";
    case "GILDIJA": return "gildija";
    case "VYR_SKAUTU_VIENETAS": return "vyr-skautai";
    case "VYR_SKAUCIU_VIENETAS": return "vyr-skautes";
    default: break;
  }

  switch (unit.subType) {
    case "PATYRE_SKAUTAI": return "patyre";
    case "SKAUTAI": return "skautai";
    case "VILKAI": return "vilkai";
    case "VADOVAI": return "gildija";
    case "VYR_SKAUTAI": return "vyr-skautai";
    case "VYR_SKAUTES": return "vyr-skautes";
    default: return "default";
  }
}

export function unitTypeSortOrder(unit: Pick<OrganizationalUnit, "type" | "subType">) {
  const order: Record<UnitTone, number> = {
    "vyr-skautai": 0,
    "vyr-skautes": 1,
    gildija: 2,
    patyre: 3,
    skautai: 4,
    vilkai: 5,
    default: 6
  };
  return order[resolveUnitTone(unit)];
}
