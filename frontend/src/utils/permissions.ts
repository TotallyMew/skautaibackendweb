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

export function canUseRequisitions(permissions: string[] | undefined) {
  return hasPermission(permissions, "requisitions.create") ||
    hasPermission(permissions, "requisitions.approve") ||
    hasPermission(permissions, "items.request.approve.unit") ||
    hasPermission(permissions, "items.request.forward.bendras");
}

export function canUseSharedInventoryRequests(permissions: string[] | undefined) {
  return hasPermission(permissions, "items.request.bendras") ||
    hasPermission(permissions, "items.request.approve.bendras") ||
    hasPermission(permissions, "items.request.forward.bendras");
}
