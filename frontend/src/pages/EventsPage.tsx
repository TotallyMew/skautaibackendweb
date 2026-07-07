import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import type { Event, EventListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { countLabel, eventTypeLabel, roleLabel, statusLabel } from "../utils/display";

const pageSize = 25;

const statusOptions = [
  { value: "", label: "Visos būsenos" },
  { value: "PLANNING", label: "Planuojami" },
  { value: "ACTIVE", label: "Aktyvus" },
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
  const [eventsState, setEventsState] = useState<EventListResponse | null>(null);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = Boolean(auth?.token && auth.activeTuntasId);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) {
      setEventsState(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .listEvents(auth.token, auth.activeTuntasId, {
        status,
        type,
        limit: pageSize,
        offset
      })
      .then((response) => {
        if (!isCancelled) {
          setEventsState(response);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Nepavyko užkrauti renginių.");
          setEventsState(null);
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
  }, [auth?.activeTuntasId, auth?.token, offset, reloadKey, status, type]);

  const activeTuntasName = useMemo(
    () => auth?.tuntai.find((tuntas) => tuntas.id === auth.activeTuntasId)?.name,
    [auth?.activeTuntasId, auth?.tuntai]
  );

  const total = eventsState?.total ?? 0;
  const currentPage = Math.floor(offset / pageSize) + 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="inventory-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{activeTuntasName ?? "Tuntas nepasirinktas"}</span>
          <h2>Renginiai</h2>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setOffset(0);
            setReloadKey((value) => value + 1);
          }}
          disabled={!canFetch || isLoading}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Atnaujinti
        </button>
      </div>

      <div className="filter-bar compact-pair-filter-bar">
        <select value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select value={type} onChange={(event) => { setType(event.target.value); setOffset(0); }}>
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="data-panel">
        <div className="data-panel-header">
          <span>{total} {countLabel(total, "įrašas", "įrašai", "įrašų")}</span>
          <span>Puslapis {currentPage} / {pageCount}</span>
        </div>

        {isLoading && (
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunami renginiai...
          </div>
        )}

        {!isLoading && !error && eventsState?.events.length === 0 && (
          <div className="empty-state">
            <CalendarDays size={28} aria-hidden="true" />
            <strong>Renginių pagal šiuos filtrus nerasta</strong>
            <span>Pakeisk būseną arba tipą ir bandyk dar kartą.</span>
          </div>
        )}

        {!isLoading && !error && Boolean(eventsState?.events.length) && (
          <EventsList events={eventsState?.events ?? []} />
        )}
      </div>

      <div className="pagination-row">
        <button
          className="icon-button"
          type="button"
          disabled={offset === 0 || isLoading}
          onClick={() => setOffset(Math.max(0, offset - pageSize))}
          aria-label="Ankstesnis puslapis"
          title="Ankstesnis puslapis"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          disabled={!eventsState?.hasMore || isLoading}
          onClick={() => setOffset(offset + pageSize)}
          aria-label="Kitas puslapis"
          title="Kitas puslapis"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function EventsList({ events }: { events: Event[] }) {
  return (
    <div className="record-list">
      {events.map((event) => (
        <article className="record-row" key={event.id}>
          <div className="record-icon">R</div>
          <div className="record-main">
            <strong className="record-title">{event.name}</strong>
            <span>{event.customTypeLabel ?? eventTypeLabel(event.type)}</span>
            {event.notes && <span>{event.notes}</span>}
            <div className="record-chip-row">
              <span className="mini-chip">{summarizeRoles(event)}</span>
            </div>
          </div>
          <div className="record-meta">
            <strong>{formatDate(event.startDate)}</strong>
            <span>iki {formatDate(event.endDate)}</span>
          </div>
          <div className="record-meta">
            {inventorySummary(event)}
          </div>
          <div className="record-meta">
            {financeSummary(event)}
          </div>
          <StatusBadge status={event.status} />
        </article>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}

function summarizeRoles(event: Event) {
  if (event.eventRoles.length === 0) return "-";
  return event.eventRoles
    .slice(0, 3)
    .map((role) => role.userName ? `${roleLabel(role.role)}: ${role.userName}` : roleLabel(role.role))
    .join(", ") + (event.eventRoles.length > 3 ? "..." : "");
}

function inventorySummary(event: Event) {
  const summary = event.inventorySummary;
  if (!summary) return "-";
  return (
    <>
      <strong>{summary.totalAllocatedQuantity}/{summary.totalPlannedQuantity} suplanuota</strong>
      <span>{summary.totalShortageQuantity} trūksta</span>
      <span>{summary.itemsNeedingPurchase} pirkti</span>
    </>
  );
}

function financeSummary(event: Event) {
  const summary = event.financeSummary;
  if (!summary) return event.inventoryBudgetAmount != null ? formatPrice(event.inventoryBudgetAmount) : "-";
  return (
    <>
      <strong className={summary.overBudget ? "danger-text" : undefined}>{formatPrice(summary.spentTotal)}</strong>
      <span>{summary.remainingAmount != null ? `${formatPrice(summary.remainingAmount)} liko` : "Biudžetas nenurodytas"}</span>
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium"
  }).format(date);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}
