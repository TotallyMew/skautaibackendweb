export function taskRoutePath(routeTarget: string, entityId?: string | null) {
  const [target, query] = routeTarget.split("?", 2);
  const [targetKind, embeddedId = null] = target.split("/", 2);

  if (targetKind === "inventory_audit_history") return "/inventory/audits";
  if (targetKind === "inventory_audit_session") {
    const auditId = embeddedId ?? entityId;
    return auditId ? `/inventory/audits/${auditId}` : "/inventory/audits";
  }
  if (targetKind === "inventory_list" || targetKind.startsWith("inventory_")) return "/inventory";
  if (targetKind === "reservation_list") return query ? `/reservations?${query}` : "/reservations";
  if (routeTarget === "requisition_list") return "/purchases";
  if (routeTarget.startsWith("requisition_")) return entityId ? `/purchases/${entityId}` : "/purchases";
  if (routeTarget === "shared_request_list") return "/pickup-requests";
  if (routeTarget.startsWith("shared_request_")) return entityId ? `/pickup-requests/${entityId}` : "/pickup-requests";
  if (targetKind === "request_list") return query ? `/purchases?${query}` : "/purchases";
  if (targetKind === "event_list") return "/events";
  if (targetKind === "event_plan" || targetKind === "event_reconciliation" || targetKind === "event_packing") {
    const eventId = embeddedId ?? entityId;
    if (!eventId) return "/events";
    const tab = targetKind === "event_plan" ? "plan" : targetKind === "event_reconciliation" ? "reconciliation" : "logistics";
    return `/events/${eventId}/workspace?tab=${tab}`;
  }
  if (targetKind.startsWith("event_")) return entityId ? `/events/${entityId}/workspace` : "/events";
  if (routeTarget === "my_tasks") return "/tasks";
  return "/";
}

export function taskBucketLabel(bucket: string) {
  const labels: Record<string, string> = {
    URGENT: "Skubu",
    TODAY: "Šiandien",
    NEXT: "Toliau",
    WATCH: "Stebėti"
  };
  return labels[bucket] ?? bucket;
}

export function taskUrgencyLabel(urgency: string) {
  const labels: Record<string, string> = {
    CRITICAL: "Kritinis",
    HIGH: "Svarbu",
    MEDIUM: "Vidutinis",
    LOW: "Žemas"
  };
  return labels[urgency] ?? urgency;
}
