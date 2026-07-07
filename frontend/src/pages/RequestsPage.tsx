import { useEffect, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, ClipboardList, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Reservation, ReservationListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { countLabel, reviewStatusLabel, statusLabel } from "../utils/display";

const pageSize = 25;

const statusOptions = [
  { value: "", label: "Visos būsenos" },
  { value: "PENDING", label: "Laukia" },
  { value: "APPROVED", label: "Patvirtintos" },
  { value: "REJECTED", label: "Atmestos" },
  { value: "ISSUED", label: "Išduotos" },
  { value: "RETURNED", label: "Grąžintos" },
  { value: "CANCELLED", label: "Atsauktos" }
];

export function RequestsPage() {
  const { auth } = useAuth();
  const [reservationsState, setReservationsState] = useState<ReservationListResponse | null>(null);
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = Boolean(auth?.token && auth.activeTuntasId);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) {
      setReservationsState(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .listReservations(auth.token, auth.activeTuntasId, {
        status,
        limit: pageSize,
        offset
      })
      .then((response) => {
        if (!isCancelled) {
          setReservationsState(response);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Nepavyko užkrauti rezervacijų.");
          setReservationsState(null);
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
  }, [auth?.activeTuntasId, auth?.token, offset, reloadKey, status]);

  const total = reservationsState?.total ?? 0;
  const currentPage = Math.floor(offset / pageSize) + 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="inventory-page">
      <div className="section-toolbar">
        <div className="list-summary">
          <strong>{total}</strong>
          <span>{countLabel(total, "įrašas", "įrašai", "įrašų")}</span>
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
          <div className="empty-state">
            <ClipboardList size={28} aria-hidden="true" />
            <strong>Rezervacijų pagal šį filtrą nerasta</strong>
            <span>Pakeisk būseną arba atnaujink sąrašą.</span>
          </div>
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
      {reservations.map((reservation) => (
        <article className="record-row" key={reservation.id}>
          <div className="record-icon">P</div>
          <div className="record-main">
            <Link className="record-title" to={`/requests/reservations/${reservation.id}`}>{reservation.title}</Link>
            <span>{reservation.requestingUnitName ?? reservation.notes ?? "Bendras prašymas"}</span>
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
