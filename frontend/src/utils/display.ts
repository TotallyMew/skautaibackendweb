export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Aktyvus",
    INACTIVE: "Neaktyvus",
    DRAFT: "Juodraštis",
    SUBMITTED: "Pateikta",
    PENDING: "Laukia",
    PENDING_APPROVAL: "Laukia tvirtinimo",
    APPROVED: "Patvirtinta",
    PARTIALLY_APPROVED: "Iš dalies patvirtinta",
    REJECTED: "Atmesta",
    ISSUED: "Išduota",
    RETURNED: "Grąžinta",
    CANCELLED: "Atšaukta",
    PLANNING: "Planuojamas",
    WRAP_UP: "Uždarymas",
    COMPLETED: "Baigta",
    PURCHASED: "Nupirkta",
    INVENTORY_ADDED: "Pridėta į inventorių",
    FORWARDED: "Perduota tuntui",
    SKIPPED: "Praleista",
    OPEN: "Vykdoma",
    CLOSED: "Uždaryta",
    DELETED: "Ištrinta",
    WRITTEN_OFF: "Nurašyta",
    UNDER_REPAIR: "Remontuojama",
    NEEDS_INSPECTION: "Reikia patikros",
    FOUND: "Rasta",
    MISSING: "Trūksta",
    MISPLACED: "Ne vietoje",
    RETURN_MARKED: "Pažymėta kaip grąžinta"
  };
  return labels[status] ?? codeLabel(status);
}

export function reviewStatusLabel(status: string) {
  const labels: Record<string, string> = {
    NOT_REQUIRED: "Nereikia",
    PENDING: "Laukia",
    APPROVED: "Patvirtinta",
    REJECTED: "Atmesta"
  };
  return labels[status] ?? statusLabel(status);
}

export function proposalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    NONE: "Nėra",
    PENDING: "Laukia",
    ACCEPTED: "Priimta",
    REJECTED: "Atmesta"
  };
  return labels[status] ?? statusLabel(status);
}

export function itemTypeLabel(type: string) {
  const labels: Record<string, string> = {
    COLLECTIVE: "Bendras",
    ASSIGNED: "Priskirtas",
    INDIVIDUAL: "Asmeninis"
  };
  return labels[type] ?? codeLabel(type);
}

export function itemConditionLabel(condition: string) {
  const labels: Record<string, string> = {
    GOOD: "Gera",
    FAIR: "Patenkinama",
    POOR: "Prasta",
    DAMAGED: "Sugadinta",
    REPAIR_NEEDED: "Reikia remonto",
    UNDER_REPAIR: "Remontuojama",
    NEEDS_INSPECTION: "Reikia patikros",
    UNKNOWN: "Nežinoma",
    LOST: "Prarasta"
  };
  return labels[condition] ?? codeLabel(condition);
}

export function itemCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    CAMPING: "Stovyklavimo įranga",
    COOKING: "Maisto gaminimas",
    TOOLS: "Įrankiai",
    UNIFORMS: "Uniformos",
    FIRST_AID: "Pirmoji pagalba",
    BOOKS: "Knygos",
    PERSONAL_LOANS: "Asmeniškai išduodama",
    SAFETY: "Saugos įranga",
    TRANSPORT: "Transportas",
    ELECTRONICS: "Elektronika",
    FURNITURE: "Baldai",
    SPORTS: "Sporto inventorius",
    HYGIENE: "Higiena",
    OTHER: "Kita"
  };
  return labels[category] ?? codeLabel(category);
}

export function itemOriginLabel(origin: string) {
  const labels: Record<string, string> = {
    UNIT_ACQUIRED: "Vieneto įsigytas",
    TRANSFERRED_FROM_TUNTAS: "Perduotas iš bendro inventoriaus"
  };
  return labels[origin] ?? codeLabel(origin);
}

export function eventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    STOVYKLA: "Stovykla",
    SUEIGA: "Sueiga",
    RENGINYS: "Renginys"
  };
  return labels[type] ?? codeLabel(type);
}

export function assignmentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    MEMBER: "Narys",
    LEADER: "Vadovas",
    CANDIDATE: "Kandidatas"
  };
  return labels[type] ?? codeLabel(type);
}

export function reservationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Laukia",
    APPROVED: "Patvirtinta",
    ACTIVE: "Aktyvi",
    REJECTED: "Atmesta",
    RETURNED: "Grąžinta",
    CANCELLED: "Atšaukta"
  };
  return labels[status] ?? statusLabel(status);
}

export function requestTypeLabel(type: string) {
  const labels: Record<string, string> = {
    NEW_ITEM: "Naujas įrašas",
    RESTOCK_EXISTING: "Esamo įrašo papildymas"
  };
  return labels[type] ?? codeLabel(type);
}

export function reviewLevelLabel(level: string) {
  const labels: Record<string, string> = {
    UNIT: "Vieneto peržiūra",
    TOP_LEVEL: "Tunto peržiūra",
    COMPLETE: "Peržiūra baigta"
  };
  return labels[level] ?? codeLabel(level);
}

export function requisitionActionLabel(action: string) {
  const labels: Record<string, string> = {
    CREATED: "Sukurta",
    UNIT_APPROVED: "Vienetas patvirtino",
    UNIT_REJECTED: "Vienetas atmetė",
    TOP_LEVEL_APPROVED: "Tuntas patvirtino",
    TOP_LEVEL_REJECTED: "Tuntas atmetė",
    FORWARDED: "Perduota tuntui",
    PURCHASED: "Pažymėta kaip nupirkta",
    INVENTORY_ADDED: "Pridėta į inventorių",
    SKIPPED: "Praleista"
  };
  return labels[action] ?? codeLabel(action);
}

export function roleLabel(role: string) {
  const labels: Record<string, string> = {
    tuntininkas: "Tuntininkas",
    tuntininko_pavaduotojas: "Tuntininko pavaduotojas",
    inventorininkas: "Inventorininkas",
    ukvedys: "Ūkvedys",
    draugininkas: "Draugininkas",
    pirmininkas: "Pirmininkas",
    pavaduotojas: "Pavaduotojas",
    eilinis_narys: "Narys"
  };
  return labels[role] ?? role.replaceAll("_", " ");
}

export function countLabel(count: number, one: string, few: string, many: string) {
  const last = Math.abs(count) % 10;
  const lastTwo = Math.abs(count) % 100;
  if (last === 1 && lastTwo !== 11) return one;
  if (last >= 2 && last <= 9 && (lastTwo < 10 || lastTwo > 20)) return few;
  return many;
}

export function finiteCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function displayTitle(value: string) {
  const normalized = value.trim();
  if (!normalized) return value;
  return normalized.charAt(0).toLocaleUpperCase("lt-LT") + normalized.slice(1);
}

export function codeLabel(value: string) {
  const normalized = value.trim().replaceAll("_", " ").toLocaleLowerCase("lt-LT");
  if (!normalized) return "—";
  return normalized.charAt(0).toLocaleUpperCase("lt-LT") + normalized.slice(1);
}
