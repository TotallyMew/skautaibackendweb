import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, Loader2, Plus, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Event, EventListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import {
  SkautaiDataTable,
  SkautaiEmptyState,
  SkautaiErrorState,
  SkautaiPageShell,
  SkautaiStatusPill,
  SkautaiTableFooter,
  SkautaiToolbar,
  type SkautaiDataTableColumn
} from "../components/ui/Skautai";
import { countLabel, eventTypeLabel, finiteCount, roleLabel, statusLabel } from "../utils/display";

const pageSize = 25;

const statusOptions = [
  { value: "", label: "Visos būsenos" },
  { value: "PLANNING", label: "Planuojami" },
  { value: "ACTIVE", label: "Aktyvūs" },
  { value: "WRAP_UP", label: "Uždarymas" },
  { value: "COMPLETED", label: "Baigti" },
  { value: "CANCELLED", label: "Atšaukti" }
];

const typeOptions = [
  { value: "", label: "Visi tipai" },
  { value: "STOVYKLA", label: "Stovykla" },
  { value: "SUEIGA", label: "Sueiga" },
  { value: "RENGINYS", label: "Renginys" }
];

export function EventsPage() {
  const { auth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStatus = searchParams.get("status") ?? "";
  const [eventsState, setEventsState] = useState<EventListResponse | null>(null);
  const [status, setStatus] = useState(() => statusOptions.some((option) => option.value === requestedStatus) ? requestedStatus : "");
  const [type, setType] = useState("");
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = Boolean(auth?.token && auth.activeTuntasId);
  const canCreate = auth?.permissions.some((permission) => permission === "events.create" || permission.startsWith("events.create:")) ?? false;

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) {
      setEventsState(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api.listEvents(auth.token, auth.activeTuntasId, { status, type, limit: pageSize, offset })
      .then((response) => {
        if (!isCancelled) setEventsState(response);
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Nepavyko užkrauti renginių.");
          setEventsState(null);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, offset, reloadKey, status, type]);

  const total = finiteCount(eventsState?.total);
  const currentPage = Math.floor(offset / pageSize) + 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function changeStatus(nextStatus: string) {
    setStatus(nextStatus);
    setOffset(0);
    const next = new URLSearchParams(searchParams);
    if (nextStatus) next.set("status", nextStatus);
    else next.delete("status");
    setSearchParams(next, { replace: true });
  }

  const actions = (
    <>
      <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={!canFetch || isLoading}>
        <RefreshCw size={17} aria-hidden="true" />
        Atnaujinti
      </button>
      {canCreate && (
        <Link className="primary-button compact-primary-button" to="/events/new">
          <Plus size={17} aria-hidden="true" />
          Naujas renginys
        </Link>
      )}
    </>
  );

  return (
    <SkautaiPageShell
      className="events-page"
      eyebrow="Planavimas"
      title="Renginiai"
      description="Planuokite renginius, paskirstykite inventorių ir stebėkite biudžeto bei pasirengimo būseną."
      actions={actions}
      width="wide"
    >
      <SkautaiToolbar title="Filtrai">
        <div className="filter-bar compact-pair-filter-bar management-filter-bar">
          <select value={status} aria-label="Būsena" onChange={(event) => changeStatus(event.target.value)}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={type} aria-label="Tipas" onChange={(event) => { setType(event.target.value); setOffset(0); }}>
            {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </SkautaiToolbar>

      {error && <SkautaiErrorState description={error} />}

      <section className="data-panel" aria-label="Renginių sąrašas">
        {isLoading && (
          <div className="table-state"><Loader2 className="spin" size={22} aria-hidden="true" />Kraunami renginiai...</div>
        )}
        {!isLoading && !error && eventsState?.events.length === 0 && (
          <SkautaiEmptyState icon={CalendarDays} title="Renginių pagal šiuos filtrus nerasta" description="Pakeiskite būseną arba tipą ir bandykite dar kartą." />
        )}
        {!isLoading && !error && Boolean(eventsState?.events.length) && <EventsTable events={eventsState?.events ?? []} />}
        {!error && (
          <SkautaiTableFooter meta={`${total} ${countLabel(total, "renginys", "renginiai", "renginių")} · Puslapis ${currentPage} iš ${pageCount}`}>
            <button className="icon-button" type="button" disabled={offset === 0 || isLoading} onClick={() => setOffset(Math.max(0, offset - pageSize))} aria-label="Ankstesnis puslapis" title="Ankstesnis puslapis">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" disabled={!eventsState?.hasMore || isLoading} onClick={() => setOffset(offset + pageSize)} aria-label="Kitas puslapis" title="Kitas puslapis">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </SkautaiTableFooter>
        )}
      </section>
    </SkautaiPageShell>
  );
}

function EventsTable({ events }: { events: Event[] }) {
  const columns: Array<SkautaiDataTableColumn<Event>> = [
    {
      key: "event",
      header: "Renginys",
      cell: (event) => (
        <div className="table-title-cell">
          <span className="record-icon table-cell-icon"><CalendarDays size={18} aria-hidden="true" /></span>
          <div>
            <Link className="table-link" to={`/events/${event.id}`}>{event.name}</Link>
            <span>{event.customTypeLabel ?? eventTypeLabel(event.type)}</span>
            {event.notes && <small>{event.notes}</small>}
          </div>
        </div>
      )
    },
    {
      key: "period",
      header: "Laikotarpis",
      cell: (event) => <><strong>{formatDate(event.startDate)}</strong><span>iki {formatDate(event.endDate)}</span></>
    },
    {
      key: "inventory",
      header: "Inventorius",
      cell: (event) => <InventorySummary event={event} />
    },
    {
      key: "budget",
      header: "Biudžetas",
      className: "mobile-secondary-column",
      cell: (event) => <FinanceSummary event={event} />
    },
    {
      key: "team",
      header: "Komanda",
      className: "mobile-secondary-column",
      cell: (event) => summarizeRoles(event)
    },
    {
      key: "status",
      header: "Būsena",
      cell: (event) => <SkautaiStatusPill status={event.status}>{statusLabel(event.status)}</SkautaiStatusPill>
    },
    {
      key: "actions",
      header: "",
      mobileLabel: "Veiksmai",
      className: "table-actions-cell",
      cell: (event) => (
        <Link className="icon-button" to={`/events/${event.id}`} aria-label={`Peržiūrėti ${event.name}`} title="Peržiūrėti">
          <Eye size={17} aria-hidden="true" />
        </Link>
      )
    }
  ];

  return <SkautaiDataTable rows={events} columns={columns} getRowKey={(event) => event.id} className="management-data-table events-data-table" />;
}

function InventorySummary({ event }: { event: Event }) {
  const summary = event.inventorySummary;
  if (!summary) return <span>—</span>;
  return (
    <>
      <strong>{finiteCount(summary.totalAllocatedQuantity)} iš {finiteCount(summary.totalPlannedQuantity)} paskirstyta</strong>
      <span>{finiteCount(summary.totalShortageQuantity)} trūksta · {finiteCount(summary.itemsNeedingPurchase)} pirkti</span>
    </>
  );
}

function FinanceSummary({ event }: { event: Event }) {
  const summary = event.financeSummary;
  if (!summary) return <span>{formatPrice(event.inventoryBudgetAmount)}</span>;
  return (
    <>
      <strong className={summary.overBudget ? "danger-text" : undefined}>{formatPrice(summary.spentTotal)}</strong>
      <span>{summary.remainingAmount != null ? `${formatPrice(summary.remainingAmount)} liko` : "Biudžetas nenurodytas"}</span>
    </>
  );
}

function summarizeRoles(event: Event) {
  if (event.eventRoles.length === 0) return "—";
  return event.eventRoles.slice(0, 2).map((role) => role.userName ? `${roleLabel(role.role)}: ${role.userName}` : roleLabel(role.role)).join(", ") + (event.eventRoles.length > 2 ? "…" : "");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium" }).format(date);
}

function formatPrice(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" }).format(amount);
}
