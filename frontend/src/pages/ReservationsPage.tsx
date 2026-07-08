import { useEffect, useState, type ComponentType } from "react";
import { AlertCircle, CalendarCheck, ChevronLeft, ChevronRight, ClipboardList, Loader2, Plus, RefreshCw, ShieldCheck, type LucideProps } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Reservation, ReservationListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { countLabel, reviewStatusLabel, statusLabel } from "../utils/display";
import { canViewReservations, hasPermission } from "../utils/permissions";

const pageSize = 25;

const statusOptions = [
  { value: "", label: "Visos būsenos" },
  { value: "PENDING", label: "Laukia" },
  { value: "APPROVED", label: "Patvirtintos" },
  { value: "REJECTED", label: "Atmestos" },
  { value: "ISSUED", label: "Išduotos" },
  { value: "RETURNED", label: "Grąžintos" },
  { value: "CANCELLED", label: "Atšauktos" }
];

export function ReservationsPage() {
  const { auth } = useAuth();
  const [reservationsState, setReservationsState] = useState<ReservationListResponse | null>(null);
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canView = canViewReservations(auth?.permissions);
  const canCreate = hasPermission(auth?.permissions, "reservations.create");
  const canFetch = Boolean(auth?.token && auth.activeTuntasId && canView);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || !canView) {
      setReservationsState(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .listReservations(auth.token, auth.activeTuntasId, { status, limit: pageSize, offset })
      .then((response) => {
        if (!isCancelled) setReservationsState(response);
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Nepavyko užkrauti rezervacijų.");
          setReservationsState(null);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, canView, offset, reloadKey, status]);

  const total = reservationsState?.total ?? 0;
  const currentPage = Math.floor(offset / pageSize) + 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  if (!canView && !canCreate) {
    return (
      <section className="work-area">
        <ShieldCheck size={34} aria-hidden="true" />
        <div>
          <h2>Rezervacijos nepasiekiamos</h2>
          <p>Rezervacijų sritis rodoma vartotojams, kurie gali peržiūrėti arba kurti rezervacijas.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="inventory-page">
      <div className="section-toolbar">
        <div className="list-summary">
          <strong>{total}</strong>
          <span>{countLabel(total, "įrašas", "įrašai", "įrašų")}</span>
        </div>
        <div className="toolbar-actions">
          {canCreate && (
            <Link className="primary-button compact-primary-button" to="/reservations/new">
              <Plus size={17} aria-hidden="true" />
              Nauja rezervacija
            </Link>
          )}
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
      </div>

      <div className="filter-bar compact-filter-bar">
        <select value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}>
          {statusOptions.map((option) => (
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
            Kraunamos rezervacijos...
          </div>
        )}

        {!isLoading && !error && reservationsState?.reservations.length === 0 && (
          <EmptyState icon={ClipboardList} title="Rezervacijų pagal šį filtrą nerasta" description="Pakeisk būseną arba atnaujink sąrašą." />
        )}

        {!isLoading && !error && Boolean(reservationsState?.reservations.length) && (
          <ReservationsList reservations={reservationsState?.reservations ?? []} />
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
          disabled={!reservationsState?.hasMore || isLoading}
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

function ReservationsList({ reservations }: { reservations: Reservation[] }) {
  return (
    <div className="record-list">
      <div className="record-header request-record-row" aria-hidden="true">
        <span />
        <span>Rezervacija</span>
        <span>Laikas</span>
        <span>Kiekis</span>
        <span>Būsena</span>
      </div>
      {reservations.map((reservation) => (
        <article className="record-row request-record-row" key={reservation.id}>
          <div className="record-icon">
            <CalendarCheck size={18} aria-hidden="true" />
          </div>
          <div className="record-main">
            <Link className="record-title" to={`/reservations/${reservation.id}`}>{reservation.title}</Link>
            <span>{reservation.requestingUnitName ?? reservation.notes ?? "Bendra rezervacija"}</span>
            <div className="record-chip-row">
              <ReviewBadge label="Padalinys" status={reservation.unitReviewStatus ?? "NOT_REQUIRED"} />
              <ReviewBadge label="Tuntas" status={reservation.topLevelReviewStatus ?? "NOT_REQUIRED"} />
            </div>
          </div>
          <div className="record-meta record-date">
            <strong>{formatDate(reservation.startDate)}</strong>
            <span>iki {formatDate(reservation.endDate)}</span>
            <span>{reservation.reservedByName ?? "Rezervavęs narys nenurodytas"}</span>
          </div>
          <div className="record-meta record-quantity">
            <strong>{reservation.totalItems} {countLabel(reservation.totalItems, "įrašas", "įrašai", "įrašų")}</strong>
            <span>{reservation.totalQuantity} vnt.</span>
            <span>{summarizeItems(reservation)}</span>
          </div>
          <StatusBadge status={reservation.status} />
        </article>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: ComponentType<LucideProps>; title: string; description: string }) {
  return (
    <div className="empty-state">
      <Icon size={28} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function ReviewBadge({ label, status }: { label: string; status: string }) {
  return (
    <span className={`review-badge review-${status.toLowerCase()}`}>
      {label}: {reviewStatusLabel(status)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}

function summarizeItems(reservation: Reservation) {
  if (reservation.items.length === 0) return "Be inventoriaus įrašų";
  return reservation.items.slice(0, 2).map((item) => item.itemName).join(", ") + (reservation.items.length > 2 ? "..." : "");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium"
  }).format(date);
}
