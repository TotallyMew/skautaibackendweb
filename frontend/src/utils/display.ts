export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Aktyvus",
    INACTIVE: "Neaktyvus",
    PENDING: "Laukia",
    PENDING_APPROVAL: "Laukia tvirtinimo",
    APPROVED: "Patvirtinta",
    REJECTED: "Atmesta",
    ISSUED: "Išduota",
    RETURNED: "Grąžinta",
    CANCELLED: "Atšaukta",
    PLANNING: "Planuojamas",
    WRAP_UP: "Uždarymas",
    COMPLETED: "Baigtas"
  };
  return labels[status] ?? status;
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
  return labels[type] ?? type;
}

export function itemOriginLabel(origin: string) {
  const labels: Record<string, string> = {
    UNIT_ACQUIRED: "Vieneto įsigytas",
    TRANSFERRED_FROM_TUNTAS: "Perduotas iš bendro inventoriaus"
  };
  return labels[origin] ?? origin;
}

export function eventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    STOVYKLA: "Stovykla",
    SUEIGA: "Sueiga",
    RENGINYS: "Renginys"
  };
  return labels[type] ?? type;
}

export function assignmentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    MEMBER: "Narys",
    LEADER: "Vadovas",
    CANDIDATE: "Kandidatas"
  };
  return labels[type] ?? type;
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
