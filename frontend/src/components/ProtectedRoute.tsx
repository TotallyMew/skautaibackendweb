import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  canCreateEvents,
  canCreateItems,
  canCreateReservations,
  canManageEvents,
  canUseEvents,
  canUseInventory,
  canUseLocations,
  canUseMembers,
  canUseRequisitions,
  canUseReservations,
  canUseSharedInventoryRequests,
  canUseUnits
} from "../utils/permissions";

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
  if (pathname.startsWith("/locations")) return canUseLocations(permissions);

  if (pathname.startsWith("/inventory/new")) return canCreateItems(permissions);
  if (pathname.startsWith("/inventory")) return canUseInventory(permissions);
  if (pathname.startsWith("/reservations/new")) return canCreateReservations(permissions);
  if (pathname.startsWith("/reservations")) return canUseReservations(permissions);
  if (pathname.startsWith("/requests/reservations")) {
    return canUseReservations(permissions);
  }
  if (pathname.startsWith("/purchases") || pathname.startsWith("/requests/requisitions")) {
    return canUseRequisitions(permissions);
  }
  if (pathname.startsWith("/pickup-requests") || pathname.startsWith("/requests/shared")) {
    return canUseSharedInventoryRequests(permissions);
  }
  if (pathname.startsWith("/requests")) {
    return canUseRequisitions(permissions) ||
      canUseSharedInventoryRequests(permissions);
  }
  if (pathname.startsWith("/units")) return canUseUnits(permissions);
  if (pathname.startsWith("/members")) return canUseMembers(permissions);
  if (pathname.startsWith("/events/new")) return canCreateEvents(permissions);
  if (pathname.startsWith("/events/") && pathname.endsWith("/edit")) return canManageEvents(permissions);
  if (pathname.startsWith("/events")) return canUseEvents(permissions);

  return true;
}
