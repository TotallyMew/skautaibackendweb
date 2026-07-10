import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Flag,
  Loader2,
  Package,
  PackageCheck,
  Plus,
  ShoppingCart,
  type LucideIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Event, Item, MyTask, Reservation } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiPageShell, SkautaiStatusPill } from "../components/ui/Skautai";
import { countLabel, eventTypeLabel, itemCategoryLabel } from "../utils/display";
import { getPermissionSet } from "../utils/permissions";
import { taskRoutePath, taskUrgencyLabel } from "../utils/tasks";

type DashboardData = {
  inventoryTotal: number;
  taskTotal: number;
  pendingReservationsTotal: number;
  planningEventsTotal: number;
  inventoryItems: Item[];
  tasks: MyTask[];
  pendingReservations: Reservation[];
  planningEvents: Event[];
};

const emptyDashboard: DashboardData = {
  inventoryTotal: 0,
  taskTotal: 0,
  pendingReservationsTotal: 0,
  planningEventsTotal: 0,
  inventoryItems: [],
  tasks: [],
  pendingReservations: [],
  planningEvents: []
};

export function DashboardPage() {
  const { auth } = useAuth();
  const activeTuntas = auth?.tuntai.find((tuntas) => tuntas.id === auth.activeTuntasId);
  const permissions = auth?.permissions ?? [];
  const permissionSet = useMemo(() => getPermissionSet(permissions), [permissions]);
  const canViewInventoryArea = permissionSet.inventory;
  const canCreateInventory = permissionSet.inventoryCreate;
  const canViewReservationArea = permissionSet.reservations;
  const canCreateReservations = permissionSet.reservationsCreate;
  const canViewEvents = permissionSet.events;
  const canCreateEvents = permissionSet.eventsCreate;
  const canUsePurchases = permissionSet.requisitions;
  const canUsePickupRequests = permissionSet.sharedRequests;
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) {
      setDashboard(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      canViewInventoryArea ? api.listItems(auth.token, auth.activeTuntasId, { status: "ACTIVE", limit: 3, offset: 0 }).catch(() => null) : Promise.resolve(null),
      api.listMyTasks(auth.token, auth.activeTuntasId).catch(() => null),
      canViewReservationArea ? api.listReservations(auth.token, auth.activeTuntasId, { status: "PENDING", limit: 3, offset: 0 }).catch(() => null) : Promise.resolve(null),
      canViewEvents ? api.listEvents(auth.token, auth.activeTuntasId, { status: "PLANNING", limit: 3, offset: 0 }).catch(() => null) : Promise.resolve(null)
    ])
      .then(([items, tasks, reservations, events]) => {
        if (isCancelled) return;

        const hasAnyResponse = items != null || tasks != null || reservations != null || events != null;
        if (!hasAnyResponse) {
          setError("Nepavyko įkelti pradžios suvestinės.");
          setDashboard(emptyDashboard);
          return;
        }

        setDashboard({
          inventoryTotal: safeCount(items?.total),
          taskTotal: safeCount(tasks?.total),
          pendingReservationsTotal: safeCount(reservations?.total),
          planningEventsTotal: safeCount(events?.total),
          inventoryItems: items?.items ?? [],
          tasks: tasks?.tasks.slice(0, 4) ?? [],
          pendingReservations: reservations?.reservations ?? [],
          planningEvents: events?.events ?? []
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Nepavyko įkelti pradžios suvestinės.");
          setDashboard(emptyDashboard);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, canViewEvents, canViewInventoryArea, canViewReservationArea]);

  const isInitialLoading = Boolean(auth?.token && auth.activeTuntasId && dashboard == null && !error);
  const pageDescription = activeTuntas
    ? `${activeTuntas.name} veiklos, laukiančių darbų ir artimiausių planų suvestinė.`
    : "Pasirink tuntą, kad matytum veiklos suvestinę.";

  return (
    <SkautaiPageShell
      className="dashboard-page"
      title="Pradžia"
      description={pageDescription}
      width="standard"
    >
      <DashboardState isLoading={isLoading || isInitialLoading} error={error} />

      {!auth?.activeTuntasId && !isLoading && (
        <DashboardEmptyState
          icon={Flag}
          title="Tuntas nepasirinktas"
          description="Pasirink aktyvų tuntą, kad būtų galima įkelti operacinę suvestinę."
        />
      )}

      {!isLoading && !isInitialLoading && !error && dashboard && auth?.activeTuntasId && (
        <>
          <section className="dashboard-metrics" aria-label="Pagrindiniai rodikliai">
            <DashboardMetricTile
              icon={Package}
              label="Inventoriaus įrašai"
              value={canViewInventoryArea ? dashboard.inventoryTotal : undefined}
              to={canViewInventoryArea ? "/inventory" : undefined}
            />
            <DashboardMetricTile
              icon={ClipboardList}
              label="Laukiančios užduotys"
              value={dashboard.taskTotal}
              to="/tasks"
            />
            <DashboardMetricTile
              icon={CalendarDays}
              label="Laukiančios rezervacijos"
              value={canViewReservationArea ? dashboard.pendingReservationsTotal : undefined}
              to={canViewReservationArea ? "/reservations?status=PENDING" : undefined}
            />
            <DashboardMetricTile
              icon={CalendarDays}
              label="Planuojami renginiai"
              value={canViewEvents ? dashboard.planningEventsTotal : undefined}
              to={canViewEvents ? "/events?status=PLANNING" : undefined}
            />
          </section>

          <div className="dashboard-operational-grid">
            <div className="dashboard-primary-column">
              <DashboardSection title="Prioritetinės užduotys" actionLabel="Visos užduotys" actionTo="/tasks">
                <div className="dashboard-list">
                  {dashboard.tasks.length > 0 ? dashboard.tasks.map((task) => (
                    <DashboardListRow
                      key={task.id}
                      to={taskRoutePath(task.routeTarget, task.entityId)}
                      icon={ClipboardList}
                      title={task.title}
                      description={task.subtitle}
                      trailing={(
                        <SkautaiStatusPill tone={taskTone(task.urgency)}>
                          {task.count != null ? `${task.count} · ${taskUrgencyLabel(task.urgency)}` : taskUrgencyLabel(task.urgency)}
                        </SkautaiStatusPill>
                      )}
                    />
                  )) : (
                    <DashboardEmptyRow
                      icon={Flag}
                      title="Laukiančių veiksmų nėra"
                      description="Nauji rezervacijų, prašymų ar inventoriaus veiksmai atsiras čia."
                    />
                  )}
                </div>
              </DashboardSection>

              {canViewInventoryArea && (
                <DashboardSection title="Inventoriaus įrašų atranka" actionLabel="Visas inventorius" actionTo="/inventory">
                  <div className="dashboard-list">
                    {dashboard.inventoryItems.length > 0 ? dashboard.inventoryItems.map((item) => (
                      <DashboardListRow
                        key={item.id}
                        to={`/inventory/${item.id}`}
                        icon={Package}
                        title={item.name}
                        description={`${itemCategoryLabel(item.category)} · ${item.locationPath ?? item.locationName ?? "Vieta nenurodyta"}`}
                        trailing={<span className="dashboard-row-value">{safeCount(item.quantity)} vnt.</span>}
                      />
                    )) : (
                      <DashboardEmptyRow
                        icon={Package}
                        title="Inventoriaus įrašų nėra"
                        description="Aktyvūs inventoriaus įrašai bus rodomi šioje atrankoje."
                      />
                    )}
                  </div>
                </DashboardSection>
              )}

              {canViewReservationArea && (
                <DashboardSection title="Laukiančios rezervacijos" actionLabel="Visos rezervacijos" actionTo="/reservations">
                  <div className="dashboard-list">
                    {dashboard.pendingReservations.length > 0 ? dashboard.pendingReservations.map((reservation) => (
                      <DashboardListRow
                        key={reservation.id}
                        to={`/reservations/${reservation.id}`}
                        icon={CalendarDays}
                        title={reservation.title}
                        description={`${reservation.requestingUnitName ?? reservation.reservedByName ?? "Tunto rezervacija"} · ${formatDateRange(reservation.startDate, reservation.endDate)}`}
                        trailing={(
                          <span className="dashboard-row-value">
                            {safeCount(reservation.totalQuantity)} {countLabel(safeCount(reservation.totalQuantity), "vienetas", "vienetai", "vienetų")}
                          </span>
                        )}
                      />
                    )) : (
                      <DashboardEmptyRow
                        icon={CalendarDays}
                        title="Laukiančių rezervacijų nėra"
                        description="Naujos laukiančios rezervacijos bus rodomos čia."
                      />
                    )}
                  </div>
                </DashboardSection>
              )}
            </div>

            <aside className="dashboard-secondary-column" aria-label="Greita prieiga ir renginiai">
              <DashboardSection title="Greiti veiksmai">
                <nav className="dashboard-quick-actions" aria-label="Greiti veiksmai">
                  {canCreateInventory && (
                    <DashboardQuickAction to="/inventory/new" icon={Plus} title="Naujas inventoriaus įrašas" description="Užregistruoti daiktą ar atsargas." />
                  )}
                  {canCreateReservations && (
                    <DashboardQuickAction to="/reservations/new" icon={CalendarDays} title="Nauja rezervacija" description="Rezervuoti inventorių pasirinktam laikui." />
                  )}
                  {canCreateEvents && (
                    <DashboardQuickAction to="/events/new" icon={CalendarDays} title="Naujas renginys" description="Pradėti renginio planavimą." />
                  )}
                  {canUsePurchases && (
                    <DashboardQuickAction to="/purchases" icon={ShoppingCart} title="Pirkimų prašymai" description="Peržiūrėti pirkimo ir papildymo eigą." />
                  )}
                  {canUsePickupRequests && (
                    <DashboardQuickAction to="/pickup-requests" icon={PackageCheck} title="Paėmimo prašymai" description="Tvarkyti bendro inventoriaus paėmimus." />
                  )}
                  <DashboardQuickAction to="/tasks" icon={ClipboardList} title="Mano užduotys" description="Atidaryti visą laukiančių veiksmų sąrašą." />
                </nav>
              </DashboardSection>

              {canViewEvents && (
                <DashboardSection title="Planuojami renginiai" actionLabel="Visi renginiai" actionTo="/events">
                  <div className="dashboard-list dashboard-event-list">
                    {dashboard.planningEvents.length > 0 ? dashboard.planningEvents.map((event) => (
                      <DashboardListRow
                        key={event.id}
                        to={`/events/${event.id}`}
                        icon={CalendarDays}
                        title={event.name}
                        description={`${event.customTypeLabel || eventTypeLabel(event.type)} · ${formatDateRange(event.startDate, event.endDate)}`}
                        trailing={<SkautaiStatusPill tone="info">Planuojamas</SkautaiStatusPill>}
                      />
                    )) : (
                      <DashboardEmptyRow
                        icon={CalendarDays}
                        title="Planuojamų renginių nėra"
                        description="Nauji planuojami renginiai bus rodomi čia."
                      />
                    )}
                  </div>
                </DashboardSection>
              )}
            </aside>
          </div>
        </>
      )}
    </SkautaiPageShell>
  );
}

function DashboardMetricTile({
  icon: Icon,
  label,
  value,
  to
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  to?: string;
}) {
  const content = (
    <>
      <span className="dashboard-metric-icon" aria-hidden="true"><Icon size={19} /></span>
      <span className="dashboard-metric-copy">
        <strong>{value == null ? "—" : safeCount(value)}</strong>
        <span>{label}</span>
        {value == null && <small>Nėra prieigos</small>}
      </span>
    </>
  );

  if (to) {
    return <Link className="dashboard-metric-tile" to={to}>{content}</Link>;
  }

  return <article className="dashboard-metric-tile is-unavailable">{content}</article>;
}

function DashboardSection({
  title,
  actionLabel,
  actionTo,
  children
}: {
  title: string;
  actionLabel?: string;
  actionTo?: string;
  children: ReactNode;
}) {
  return (
    <section className="dashboard-panel">
      <header className="dashboard-panel-header">
        <h2>{title}</h2>
        {actionLabel && actionTo && (
          <Link className="dashboard-panel-link" to={actionTo}>
            {actionLabel}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function DashboardListRow({
  to,
  icon: Icon,
  title,
  description,
  trailing
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  trailing?: ReactNode;
}) {
  return (
    <Link className="dashboard-list-row" to={to}>
      <span className="dashboard-row-icon" aria-hidden="true"><Icon size={17} /></span>
      <span className="dashboard-row-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {trailing && <span className="dashboard-row-trailing">{trailing}</span>}
    </Link>
  );
}

function DashboardQuickAction({
  to,
  icon: Icon,
  title,
  description
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link className="dashboard-quick-action" to={to}>
      <span className="dashboard-quick-action-icon" aria-hidden="true"><Icon size={17} /></span>
      <span className="dashboard-quick-action-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}

function DashboardState({ isLoading, error }: { isLoading: boolean; error: string | null }) {
  if (isLoading) {
    return (
      <div className="dashboard-state" role="status">
        <Loader2 className="spin" size={22} aria-hidden="true" />
        <div>
          <strong>Kraunama suvestinė</strong>
          <span>Renkami inventoriaus, užduočių, rezervacijų ir renginių duomenys.</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-state dashboard-state-error" role="alert">
        <AlertCircle size={22} aria-hidden="true" />
        <div>
          <strong>Suvestinė nepasiekiama</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return null;
}

function DashboardEmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="dashboard-state dashboard-empty-state">
      <Icon size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}

function DashboardEmptyRow({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="dashboard-empty-row">
      <span className="dashboard-row-icon" aria-hidden="true"><Icon size={17} /></span>
      <span className="dashboard-row-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </div>
  );
}

function taskTone(urgency: string): "danger" | "warning" | "muted" | "info" {
  if (urgency === "CRITICAL") return "danger";
  if (urgency === "HIGH") return "warning";
  if (urgency === "LOW") return "muted";
  return "info";
}

function formatDateRange(startValue: string, endValue: string) {
  const start = formatDate(startValue);
  const end = formatDate(endValue);
  return start === end ? start : `${start}–${end}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium" }).format(date);
}

function safeCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
