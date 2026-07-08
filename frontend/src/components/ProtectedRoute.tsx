import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

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

  if (auth?.type !== "super_admin" && !auth?.activeTuntasId && location.pathname !== "/tuntas") {
    return <Navigate to="/tuntas" replace />;
  }

  return <Outlet />;
}
