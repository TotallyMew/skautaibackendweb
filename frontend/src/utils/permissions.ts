export function hasPermission(permissions: string[] | undefined, permission: string) {
  return permissions?.some((value) => value === permission || value.startsWith(`${permission}:`)) ?? false;
}

export function hasAnyPermission(permissions: string[] | undefined, permissionNames: string[]) {
  return permissionNames.some((permission) => hasPermission(permissions, permission));
}

export function canViewInventory(permissions: string[] | undefined) {
  return hasPermission(permissions, "items.view");
}

export function canCreateItems(permissions: string[] | undefined) {
  return hasPermission(permissions, "items.create") || hasPermission(permissions, "items.create.submit");
}

export function canReviewItems(permissions: string[] | undefined) {
  return hasPermission(permissions, "items.review");
}

export function canUseInventory(permissions: string[] | undefined) {
  return canViewInventory(permissions) || canCreateItems(permissions) || canReviewItems(permissions);
}

export function canViewReservations(permissions: string[] | undefined) {
  return hasPermission(permissions, "reservations.view");
}

export function canCreateReservations(permissions: string[] | undefined) {
  return hasPermission(permissions, "reservations.create");
}

export function canReviewReservations(permissions: string[] | undefined) {
  return hasPermission(permissions, "reservations.approve");
}

export function canUseReservations(permissions: string[] | undefined) {
  return canViewReservations(permissions) || canCreateReservations(permissions) || canReviewReservations(permissions);
}

export function canViewMembers(permissions: string[] | undefined) {
  return hasPermission(permissions, "members.view");
}

export function canUseMembers(permissions: string[] | undefined) {
  return canViewMembers(permissions) || hasPermission(permissions, "invitations.create");
}

export function canUseUnits(permissions: string[] | undefined) {
  return hasAnyPermission(permissions, [
    "organizational_units.view",
    "organizational_units.manage",
    "invitations.create"
  ]);
}

export function canUseLocations(permissions: string[] | undefined) {
  return hasPermission(permissions, "locations.manage");
}

export function canUseRequisitions(permissions: string[] | undefined) {
  return hasPermission(permissions, "requisitions.create") ||
    hasPermission(permissions, "requisitions.approve");
}

export function canUseSharedInventoryRequests(permissions: string[] | undefined) {
  return hasPermission(permissions, "items.request.bendras") ||
    hasPermission(permissions, "items.request.approve.unit") ||
    hasPermission(permissions, "items.request.approve.bendras") ||
    hasPermission(permissions, "items.request.forward.bendras");
}

export function canUseEvents(permissions: string[] | undefined) {
  return hasPermission(permissions, "events.view");
}

export function canCreateEvents(permissions: string[] | undefined) {
  return hasPermission(permissions, "events.create");
}

export function canManageEvents(permissions: string[] | undefined) {
  return hasPermission(permissions, "events.manage");
}

export function getPermissionSet(permissions: string[] | undefined) {
  return {
    inventory: canUseInventory(permissions),
    inventoryCreate: canCreateItems(permissions),
    inventoryReview: canReviewItems(permissions),
    reservations: canUseReservations(permissions),
    reservationsCreate: canCreateReservations(permissions),
    reservationsReview: canReviewReservations(permissions),
    requisitions: canUseRequisitions(permissions),
    sharedRequests: canUseSharedInventoryRequests(permissions),
    events: canUseEvents(permissions),
    eventsCreate: canCreateEvents(permissions),
    eventsManage: canManageEvents(permissions),
    members: canUseMembers(permissions),
    units: canUseUnits(permissions),
    locations: canUseLocations(permissions)
  };
}
