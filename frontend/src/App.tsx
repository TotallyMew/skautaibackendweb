import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminPage } from "./pages/AdminPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { EventsPage } from "./pages/EventsPage";
import { ForgotPasswordPage, ResetPasswordPage } from "./pages/ForgotPasswordPage";
import { InventoryCreatePage } from "./pages/InventoryCreatePage";
import { InventoryDetailPage } from "./pages/InventoryDetailPage";
import { InventoryPage } from "./pages/InventoryPage";
import { LocationsPage } from "./pages/LocationsPage";
import { LoginPage } from "./pages/LoginPage";
import { MembersPage } from "./pages/MembersPage";
import { MyTasksPage } from "./pages/MyTasksPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterInvitePage, RegisterPage } from "./pages/RegisterPage";
import { ReservationCreatePage } from "./pages/ReservationCreatePage";
import { RequisitionDetailPage } from "./pages/RequisitionDetailPage";
import { ReservationDetailPage } from "./pages/ReservationDetailPage";
import { RequestsPage } from "./pages/RequestsPage";
import { SharedInventoryRequestDetailPage } from "./pages/SharedInventoryRequestDetailPage";
import { TuntasSelectPage } from "./pages/TuntasSelectPage";
import { UnitsPage } from "./pages/UnitsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/password-reset/open" element={<ResetPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/invite" element={<RegisterInvitePage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="tuntas" element={<TuntasSelectPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/new" element={<InventoryCreatePage />} />
          <Route path="inventory/:itemId" element={<InventoryDetailPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/reservations/new" element={<ReservationCreatePage />} />
          <Route path="requests/reservations/:reservationId" element={<ReservationDetailPage />} />
          <Route path="requests/requisitions/:requisitionId" element={<RequisitionDetailPage />} />
          <Route path="requests/shared/:requestId" element={<SharedInventoryRequestDetailPage />} />
          <Route path="tasks" element={<MyTasksPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:eventId" element={<EventDetailPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
