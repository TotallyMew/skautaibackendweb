import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { canCreateItems, canUseRequisitions, canUseSharedInventoryRequests, canViewInventory, canViewMembers, canViewReservations, hasPermission } from "../utils/permissions";

export function ProtectedRoute() {
  const { auth, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <main className="route-loading">
        <span>Atnaujinama sesija...</span>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (auth?.type === "super_admin" && !location.pathname.startsWith("/admin")) {
    return <Navigate to="/admin" replace />;
  }

  if (auth?.type !== "super_admin" && location.pathname.startsWith("/admin")) {
    return <Navigate to="/" replace />;
  }

  if (auth?.type !== "super_admin" && !auth?.activeTuntasId && location.pathname !== "/tuntas") {
    return <Navigate to="/tuntas" replace />;
  }

  if (auth?.type !== "super_admin" && auth?.activeTuntasId && !canAccessUserRoute(location.pathname, auth.permissions)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function canAccessUserRoute(pathname: string, permissions: string[]) {
  if (pathname === "/tuntas") return true;
  if (pathname.startsWith("/profile")) return true;
  if (pathname.startsWith("/tasks")) return true;
  if (pathname.startsWith("/notifications")) return true;
  if (pathname.startsWith("/calendar")) return true;
  if (pathname.startsWith("/locations")) return true;

  if (pathname.startsWith("/inventory/new")) return canCreateItems(permissions);
  if (pathname.startsWith("/inventory")) {
    return canViewInventory(permissions) || canCreateItems(permissions) || hasPermission(permissions, "items.review");
  }
  if (pathname.startsWith("/requests")) {
    if (pathname.startsWith("/requests/reservations/new")) return hasPermission(permissions, "reservations.create");
    return canViewReservations(permissions) ||
      hasPermission(permissions, "reservations.create") ||
      canUseRequisitions(permissions) ||
      canUseSharedInventoryRequests(permissions);
  }
  if (pathname.startsWith("/units")) {
    return hasPermission(permissions, "organizational_units.view") ||
      hasPermission(permissions, "organizational_units.manage") ||
      hasPermission(permissions, "invitations.create");
  }
  if (pathname.startsWith("/members")) return canViewMembers(permissions);
  if (pathname.startsWith("/events/new")) return hasPermission(permissions, "events.create");
  if (pathname.startsWith("/events/") && pathname.endsWith("/edit")) return hasPermission(permissions, "events.manage");
  if (pathname.startsWith("/events")) return hasPermission(permissions, "events.view");

  return true;
}
