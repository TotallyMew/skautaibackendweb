import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, ClipboardList, Flag, Inbox, Loader2, MapPin, Package, Plus, UsersRound, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Event, Item, MyTask } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { countLabel } from "../utils/display";
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

export function DashboardPage() {
  const { auth } = useAuth();
  const activeTuntas = auth?.tuntai.find((tuntas) => tuntas.id === auth.activeTuntasId);
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
      api.listItems(auth.token, auth.activeTuntasId, { status: "ACTIVE", limit: 3, offset: 0 }),
      api.listMyTasks(auth.token, auth.activeTuntasId),
      api.listReservations(auth.token, auth.activeTuntasId, { status: "PENDING", limit: 3, offset: 0 }),
      api.listEvents(auth.token, auth.activeTuntasId, { status: "PLANNING", limit: 3, offset: 0 })
    ])
      .then(([items, tasks, reservations, events]) => {
        if (!isCancelled) {
          setDashboard({
            inventoryTotal: items.total,
            taskTotal: tasks.total,
            pendingReservationsTotal: reservations.total,
            planningEventsTotal: events.total,
            latestItems: items.items,
            tasks: tasks.tasks.slice(0, 4),
            planningEvents: events.events
          });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Nepavyko įkelti pradžios suvestinės.");
          setDashboard(null);
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
  }, [auth?.activeTuntasId, auth?.token]);

  return (
    <section className="home-page">
      <article className="home-overview">
        <span className="eyebrow">Pagrindinė apžvalga</span>
        <div className="home-overview-row">
          <div>
            <h2>Sveiki, {auth?.name ?? "Vartotojau"}</h2>
            <p>{activeTuntas?.name ?? "Pasirink tuntą, kad matytum aktyvų kontekstą."}</p>
          </div>
          <Link className="secondary-button" to="/tasks">
            <Flag size={17} aria-hidden="true" />
            Mano veiksmai
          </Link>
        </div>
        <div className="home-summary-grid">
          <SummaryTile label="Inventorius" value={formatCount(dashboard?.inventoryTotal, "įrašas", "įrašai", "įrašų")} />
          <SummaryTile label="Mano užduotys" value={formatCount(dashboard?.taskTotal, "užduotis", "užduotys", "užduočių")} />
          <SummaryTile label="Planuojami renginiai" value={formatCount(dashboard?.planningEventsTotal, "renginys", "renginiai", "renginių")} />
        </div>
      </article>

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
                  badge={task.count != null ? `${task.count} · ${taskUrgencyLabel(task.urgency)}` : taskUrgencyLabel(task.urgency)}
                />
              ))
            ) : (
              <EmptyPreview icon={Flag} title="Laukiančių veiksmų nėra" description="Nauji rezervacijų ar prašymų veiksmai atsiras čia." />
            )}
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>Inventorius</h2>
            <span className="eyebrow">Greita prieiga prie tunto, vieneto ir asmeninio inventoriaus.</span>
          </div>
        </div>
        <div className="home-action-grid">
          <ActionTile to="/inventory" icon={Package} title="Atidaryti inventorių" subtitle="Bendras sąrašas, paieška ir filtrai." />
          <ActionTile to="/inventory" icon={Plus} title="Aktyvūs įrašai" subtitle={formatCount(dashboard?.inventoryTotal, "aktyvus įrašas", "aktyvūs įrašai", "aktyvių įrašų")} />
          <ActionTile to="/inventory" icon={MapPin} title="Naujausi įrašai" subtitle={summarizeItems(dashboard?.latestItems ?? [])} />
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>Rezervacijos ir prašymai</h2>
            <span className="eyebrow">Sek aktyvias rezervacijas, pirkimus ir paėmimo prašymus.</span>
          </div>
        </div>
        <div className="home-action-grid">
          <ActionTile to="/requests" icon={CalendarDays} title="Rezervacijos" subtitle="Peržiūra, būsena ir išdavimo eiga." />
          <ActionTile to="/tasks" icon={ClipboardList} title="Mano užduotys" subtitle={formatCount(dashboard?.taskTotal, "aktyvi užduotis", "aktyvios užduotys", "aktyvių užduočių")} />
          <ActionTile to="/events" icon={Inbox} title="Renginių planai" subtitle={formatCount(dashboard?.planningEventsTotal, "planuojamas renginys", "planuojami renginiai", "planuojamų renginių")} />
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <h2>Organizacija</h2>
            <span className="eyebrow">Nariai, renginiai ir administravimo sritys.</span>
          </div>
        </div>
        <div className="home-action-grid">
          <ActionTile to="/members" icon={UsersRound} title="Nariai" subtitle="Tunto narių katalogas ir vadovavimo vaidmenys." />
          <ActionTile to="/events" icon={CalendarDays} title="Renginiai" subtitle="Renginių sąrašas, inventoriaus ir finansų suvestinės." />
          <ActionTile to="/admin" icon={Flag} title="Administravimas" subtitle="Tuntų tvirtinimas ir sistemos nustatymai." />
        </div>
      </section>
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
      <span className="status-badge">{badge}</span>
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

function ActionTile({
  to,
  icon: Icon,
  title,
  subtitle
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <Link className="home-action-tile" to={to}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </Link>
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
