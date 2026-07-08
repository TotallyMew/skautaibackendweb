export function taskRoutePath(routeTarget: string, entityId?: string | null) {
  if (routeTarget === "inventory_list" || routeTarget.startsWith("inventory_")) return "/inventory";
  if (routeTarget === "reservation_list" || routeTarget.startsWith("reservation_list")) return "/reservations";
  if (routeTarget === "request_list" || routeTarget.startsWith("request_list")) return "/requests";
  if (routeTarget === "shared_request_list") return "/requests";
  if (routeTarget === "event_list" || routeTarget.startsWith("event_")) return "/events";
  if (routeTarget === "my_tasks") return "/tasks";
  if (entityId && routeTarget.startsWith("event_")) return "/events";
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
