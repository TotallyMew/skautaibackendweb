import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminPage } from "./pages/AdminPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EventsPage } from "./pages/EventsPage";
import { InventoryDetailPage } from "./pages/InventoryDetailPage";
import { InventoryPage } from "./pages/InventoryPage";
import { LoginPage } from "./pages/LoginPage";
import { MembersPage } from "./pages/MembersPage";
import { ReservationDetailPage } from "./pages/ReservationDetailPage";
import { RequestsPage } from "./pages/RequestsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/:itemId" element={<InventoryDetailPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/reservations/:reservationId" element={<ReservationDetailPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
