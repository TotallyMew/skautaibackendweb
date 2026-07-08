export function hasPermission(permissions: string[] | undefined, permission: string) {
  return permissions?.some((value) => value === permission || value.startsWith(`${permission}:`)) ?? false;
}

export function canViewInventory(permissions: string[] | undefined) {
  return hasPermission(permissions, "items.view");
}

export function canCreateItems(permissions: string[] | undefined) {
  return hasPermission(permissions, "items.create") || hasPermission(permissions, "items.create.submit");
}

export function canViewReservations(permissions: string[] | undefined) {
  return hasPermission(permissions, "reservations.view");
}

export function canViewMembers(permissions: string[] | undefined) {
  return hasPermission(permissions, "members.view");
}
