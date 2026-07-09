import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./auth/AuthProvider";
import { AdminPage } from "./pages/AdminPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { EventFormPage } from "./pages/EventFormPage";
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
import { ReservationsPage } from "./pages/ReservationsPage";
import { RequestsPage } from "./pages/RequestsPage";
import { SharedInventoryRequestDetailPage } from "./pages/SharedInventoryRequestDetailPage";
import { TuntasSelectPage } from "./pages/TuntasSelectPage";
import { UnitsPage } from "./pages/UnitsPage";
import { canUseRequisitions, canUseSharedInventoryRequests } from "./utils/permissions";

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
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="reservations/new" element={<ReservationCreatePage />} />
          <Route path="reservations/:reservationId" element={<ReservationDetailPage />} />
          <Route path="purchases" element={<RequestsPage mode="requisitions" />} />
          <Route path="purchases/:requisitionId" element={<RequisitionDetailPage />} />
          <Route path="pickup-requests" element={<RequestsPage mode="shared" />} />
          <Route path="pickup-requests/:requestId" element={<SharedInventoryRequestDetailPage />} />
          <Route path="requests" element={<LegacyRequestsRedirect />} />
          <Route path="requests/reservations/new" element={<Navigate to="/reservations/new" replace />} />
          <Route path="requests/reservations/:reservationId" element={<LegacyReservationRedirect />} />
          <Route path="requests/requisitions" element={<Navigate to="/purchases" replace />} />
          <Route path="requests/requisitions/:requisitionId" element={<LegacyRequisitionRedirect />} />
          <Route path="requests/shared" element={<Navigate to="/pickup-requests" replace />} />
          <Route path="requests/shared/:requestId" element={<LegacySharedRequestRedirect />} />
          <Route path="tasks" element={<MyTasksPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/new" element={<EventFormPage />} />
          <Route path="events/:eventId/edit" element={<EventFormPage />} />
          <Route path="events/:eventId" element={<EventDetailPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LegacyReservationRedirect() {
  const { reservationId } = useParams();
  return <Navigate to={reservationId ? `/reservations/${reservationId}` : "/reservations"} replace />;
}

function LegacyRequestsRedirect() {
  const { auth } = useAuth();
  const permissions = auth?.permissions;

  if (canUseRequisitions(permissions)) return <Navigate to="/purchases" replace />;
  if (canUseSharedInventoryRequests(permissions)) return <Navigate to="/pickup-requests" replace />;
  return <Navigate to="/" replace />;
}

function LegacyRequisitionRedirect() {
  const { requisitionId } = useParams();
  return <Navigate to={requisitionId ? `/purchases/${requisitionId}` : "/purchases"} replace />;
}

function LegacySharedRequestRedirect() {
  const { requestId } = useParams();
  return <Navigate to={requestId ? `/pickup-requests/${requestId}` : "/pickup-requests"} replace />;
}
