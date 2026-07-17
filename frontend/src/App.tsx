import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./auth/AuthProvider";
import { AdminPage } from "./pages/AdminPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { EventFormPage } from "./pages/EventFormPage";
import type { EventWorkspaceSection } from "./pages/EventWorkspacePage";
import { EventsPage } from "./pages/EventsPage";
import { ForgotPasswordPage, ResetPasswordPage } from "./pages/ForgotPasswordPage";
import { InventoryCreatePage } from "./pages/InventoryCreatePage";
import { InventoryAuditDetailPage } from "./pages/InventoryAuditDetailPage";
import { InventoryAuditsPage } from "./pages/InventoryAuditsPage";
import { InventoryKitsPage } from "./pages/InventoryKitsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { LocationsPage } from "./pages/LocationsPage";
import { LoginPage } from "./pages/LoginPage";
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

const EventWorkspacePage = lazy(() => import("./pages/EventWorkspacePage")
  .then((module) => ({ default: module.EventWorkspacePage })));
const InventoryDetailPage = lazy(() => import("./pages/InventoryDetailPage")
  .then((module) => ({ default: module.InventoryDetailPage })));
const InventoryQrPage = lazy(() => import("./pages/InventoryQrPage")
  .then((module) => ({ default: module.InventoryQrPage })));
const MembersPage = lazy(() => import("./pages/MembersPage")
  .then((module) => ({ default: module.MembersPage })));
const RequestCreatePage = lazy(() => import("./pages/RequestCreatePage")
  .then((module) => ({ default: module.RequestCreatePage })));

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
          <Route path="inventory/kits" element={<InventoryKitsPage />} />
          <Route path="inventory/audits" element={<InventoryAuditsPage />} />
          <Route path="inventory/audits/:sessionId" element={<InventoryAuditDetailPage />} />
          <Route path="inventory/scan" element={<DeferredRoute><InventoryQrPage /></DeferredRoute>} />
          <Route path="inventory/:itemId/edit" element={<InventoryCreatePage />} />
          <Route path="inventory/:itemId" element={<DeferredRoute><InventoryDetailPage /></DeferredRoute>} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="reservations/new" element={<ReservationCreatePage />} />
          <Route path="reservations/:reservationId" element={<ReservationDetailPage />} />
          <Route path="purchases" element={<RequestsPage mode="requisitions" />} />
          <Route path="purchases/new" element={<DeferredRoute><RequestCreatePage mode="requisition" /></DeferredRoute>} />
          <Route path="purchases/:requisitionId" element={<RequisitionDetailPage />} />
          <Route path="pickup-requests" element={<RequestsPage mode="shared" />} />
          <Route path="pickup-requests/new" element={<DeferredRoute><RequestCreatePage mode="shared" /></DeferredRoute>} />
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
          <Route path="members" element={<DeferredRoute><MembersPage /></DeferredRoute>} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/new" element={<EventFormPage />} />
          <Route path="events/:eventId/edit" element={<EventFormPage />} />
          <Route path="events/:eventId/staff" element={<EventWorkspaceRoute section="staff" />} />
          <Route path="events/:eventId/plan" element={<EventWorkspaceRoute section="plan" />} />
          <Route path="events/:eventId/pastovykles" element={<EventWorkspaceRoute section="pastovykles" />} />
          <Route path="events/:eventId/packing" element={<EventWorkspaceRoute section="packing" />} />
          <Route path="events/:eventId/movements" element={<EventWorkspaceRoute section="movements" />} />
          <Route path="events/:eventId/purchases" element={<EventWorkspaceRoute section="purchases" />} />
          <Route path="events/:eventId/reconciliation" element={<EventWorkspaceRoute section="reconciliation" />} />
          <Route path="events/:eventId/templates" element={<EventWorkspaceRoute section="templates" />} />
          <Route path="events/:eventId" element={<EventDetailPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function EventWorkspaceRoute({ section }: { section: EventWorkspaceSection }) {
  return <DeferredRoute message="Kraunama renginio darbo sritis...">
    <EventWorkspacePage section={section} />
  </DeferredRoute>;
}

function DeferredRoute({ children, message = "Kraunamas puslapis..." }: { children: ReactNode; message?: string }) {
  return <Suspense fallback={<div className="route-loading">{message}</div>}>{children}</Suspense>;
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
