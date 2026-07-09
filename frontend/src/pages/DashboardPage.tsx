import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, ClipboardList, Flag, Loader2, MapPin, Network, Package, PackageCheck, Plus, ShoppingCart, UsersRound, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Event, Item, MyTask } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiActionTile, SkautaiHeroCard, SkautaiStatusPill } from "../components/ui/Skautai";
import { countLabel } from "../utils/display";
import { getPermissionSet } from "../utils/permissions";
import { taskRoutePath, taskUrgencyLabel } from "../utils/tasks";

type DashboardData = {
  inventoryTotal: number;
  taskTotal: number;
  pendingReservationsTotal: number;
  planningEventsTotal: number;
  latestItems: Item[];
  tasks: MyTask[];
  planningEvents: Event[];
};

const emptyDashboard: DashboardData = {
  inventoryTotal: 0,
  taskTotal: 0,
  pendingReservationsTotal: 0,
  planningEventsTotal: 0,
  latestItems: [],
  tasks: [],
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
  const canViewEvents = permissionSet.events;
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
        if (!isCancelled) {
          setDashboard({
            inventoryTotal: items?.total ?? 0,
            taskTotal: tasks?.total ?? 0,
            pendingReservationsTotal: reservations?.total ?? 0,
            planningEventsTotal: events?.total ?? 0,
            latestItems: items?.items ?? [],
            tasks: tasks?.tasks.slice(0, 4) ?? [],
            planningEvents: events?.events ?? []
          });
        }
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

  const organizationTiles = useMemo(() => {
    return [
      permissionSet.locations ? <SkautaiActionTile key="locations" to="/locations" icon={MapPin} title="Lokacijos" subtitle="Sandėliai, laikinos vietos ir inventoriaus priskyrimas." /> : null,
      permissionSet.members ? <SkautaiActionTile key="members" to="/members" icon={UsersRound} title="Nariai" subtitle="Tunto narių katalogas ir vadovavimo vaidmenys." /> : null,
      permissionSet.units ? <SkautaiActionTile key="units" to="/units" icon={Network} title="Vienetai" subtitle="Draugovių ir kitų vienetų struktūra." /> : null
    ].filter(Boolean);
  }, [permissionSet.locations, permissionSet.members, permissionSet.units]);

  return (
    <section className="home-page">
      <SkautaiHeroCard
        className="home-overview"
        eyebrow="Pagrindinė apžvalga"
        title={`Sveiki, ${auth?.name ?? "Vartotojau"}`}
        subtitle={activeTuntas?.name ?? "Pasirink tuntą, kad matytum aktyvų kontekstą."}
        actions={
          <Link className="secondary-button" to="/tasks">
            <Flag size={17} aria-hidden="true" />
            Mano veiksmai
          </Link>
        }
      >
        <div className="home-summary-grid">
          <SummaryTile label="Inventorius" value={formatCount(dashboard?.inventoryTotal, "įrašas", "įrašai", "įrašų")} />
          <SummaryTile label="Mano užduotys" value={formatCount(dashboard?.taskTotal, "užduotis", "užduotys", "užduočių")} />
          <SummaryTile label="Planuojami renginiai" value={formatCount(dashboard?.planningEventsTotal, "renginys", "renginiai", "renginių")} />
        </div>
      </SkautaiHeroCard>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>Mano užduotys</h2>
            <span className="eyebrow">Trumpa svarbiausių veiksmų peržiūra.</span>
          </div>
        </div>
        <DashboardState isLoading={isLoading} error={error} />
        {!isLoading && !error && (
          <div className="dashboard-preview-list">
            {dashboard?.tasks.length ? (
              dashboard.tasks.map((task) => (
                <PreviewRow
                  key={task.id}
                  to={taskRoutePath(task.routeTarget, task.entityId)}
                  icon={ClipboardList}
                  title={task.title}
                  meta={task.subtitle}
                  badge={task.count != null ? `${task.count} / ${taskUrgencyLabel(task.urgency)}` : taskUrgencyLabel(task.urgency)}
                />
              ))
            ) : (
              <EmptyPreview icon={Flag} title="Laukiančių veiksmų nėra" description="Nauji rezervacijų ar prašymų veiksmai atsiras čia." />
            )}
          </div>
        )}
      </section>

      {canViewInventoryArea && (
        <section className="home-section">
          <div className="section-heading">
            <div>
              <h2>Inventorius</h2>
              <span className="eyebrow">Greita prieiga prie tunto, vieneto ir asmeninio inventoriaus.</span>
            </div>
          </div>
          <div className="home-action-grid">
            <SkautaiActionTile to="/inventory" icon={Package} title="Atidaryti inventorių" subtitle="Bendras sąrašas, paieška ir filtrai." />
            {canCreateInventory && <SkautaiActionTile to="/inventory/new" icon={Plus} title="Naujas įrašas" subtitle="Sukurti bendro inventoriaus įrašą." />}
            <SkautaiActionTile to="/inventory" icon={MapPin} title="Naujausi įrašai" subtitle={summarizeItems(dashboard?.latestItems ?? [])} />
          </div>
        </section>
      )}

      {(canViewReservationArea || canUsePurchases || canUsePickupRequests || canViewEvents) && (
        <section className="home-section">
          <div className="section-heading">
            <div>
              <h2>Darbų srautai</h2>
              <span className="eyebrow">Sek rezervacijas, pirkimus, paėmimus ir renginių planus.</span>
            </div>
          </div>
          <div className="home-action-grid">
            {canViewReservationArea && <SkautaiActionTile to="/reservations" icon={CalendarDays} title="Rezervacijos" subtitle="Peržiūra, būsena ir išdavimo eiga." />}
            {canUsePurchases && <SkautaiActionTile to="/purchases" icon={ShoppingCart} title="Pirkimai" subtitle="Pirkimo ir papildymo prašymų eilė." />}
            {canUsePickupRequests && <SkautaiActionTile to="/pickup-requests" icon={PackageCheck} title="Paėmimai" subtitle="Bendro inventoriaus paėmimo prašymai." />}
            <SkautaiActionTile to="/tasks" icon={ClipboardList} title="Mano užduotys" subtitle={formatCount(dashboard?.taskTotal, "aktyvi užduotis", "aktyvios užduotys", "aktyvių užduočių")} />
            {canViewEvents && <SkautaiActionTile to="/events" icon={CalendarDays} title="Renginių planai" subtitle={formatCount(dashboard?.planningEventsTotal, "planuojamas renginys", "planuojami renginiai", "planuojamų renginių")} />}
          </div>
        </section>
      )}

      {organizationTiles.length > 0 && (
        <section className="home-section">
          <div className="section-heading">
            <div>
              <h2>Organizacija</h2>
              <span className="eyebrow">Nariai, renginiai ir vieneto kontekstas.</span>
            </div>
          </div>
          <div className="home-action-grid">{organizationTiles}</div>
        </section>
      )}
    </section>
  );
}

function DashboardState({ isLoading, error }: { isLoading: boolean; error: string | null }) {
  if (isLoading) {
    return (
      <div className="home-empty-card">
        <Loader2 className="spin" size={24} aria-hidden="true" />
        <div>
          <strong>Kraunama suvestinė</strong>
          <span>Renkami inventoriaus, prašymų ir renginių duomenys.</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-empty-card home-alert-card">
        <AlertCircle size={24} aria-hidden="true" />
        <div>
          <strong>Suvestinė nepasiekiama</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return null;
}

function EmptyPreview({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="home-empty-card">
      <Icon size={24} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}

function PreviewRow({
  to,
  icon: Icon,
  title,
  meta,
  badge
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  meta: string;
  badge: string;
}) {
  return (
    <Link className="dashboard-preview-row" to={to}>
      <Icon size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <SkautaiStatusPill tone="info">{badge}</SkautaiStatusPill>
    </Link>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatCount(count: number | undefined, one: string, few: string, many: string) {
  if (count == null) return "-";
  return `${count} ${countLabel(count, one, few, many)}`;
}

function summarizeItems(items: Item[]) {
  if (items.length === 0) return "Įrašų nėra";
  return items.slice(0, 2).map((item) => item.name).join(", ") + (items.length > 2 ? "..." : "");
}
