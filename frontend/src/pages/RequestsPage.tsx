import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, ClipboardList, Loader2, RefreshCw } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { Reservation, ReservationListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";

const pageSize = 25;

const statusOptions = [
  { value: "", label: "Visos busenos" },
  { value: "PENDING", label: "Laukia" },
  { value: "APPROVED", label: "Patvirtintos" },
  { value: "REJECTED", label: "Atmestos" },
  { value: "ISSUED", label: "Isduotos" },
  { value: "RETURNED", label: "Grazintos" },
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
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof ApiError ? cause.message : "Nepavyko uzkrauti rezervaciju.");
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

  const activeTuntasName = useMemo(
    () => auth?.tuntai.find((tuntas) => tuntas.id === auth.activeTuntasId)?.name,
    [auth?.activeTuntasId, auth?.tuntai]
  );

  const total = reservationsState?.total ?? 0;
  const currentPage = Math.floor(offset / pageSize) + 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="inventory-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{activeTuntasName ?? "Tuntas nepasirinktas"}</span>
          <h2>Prasymai ir rezervacijos</h2>
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
          <span>{total} irasu</span>
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
            <strong>Rezervaciju pagal si filtra nerasta</strong>
            <span>Pakeisk busena arba atnaujink sarasa.</span>
          </div>
        )}

        {!isLoading && !error && Boolean(reservationsState?.reservations.length) && (
          <ReservationsTable reservations={reservationsState?.reservations ?? []} />
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

function ReservationsTable({ reservations }: { reservations: Reservation[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Pavadinimas</th>
            <th>Laikotarpis</th>
            <th>Rezervavo</th>
            <th>Inventorius</th>
            <th>Perziura</th>
            <th>Busena</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => (
            <tr key={reservation.id}>
              <td>
                <strong>{reservation.title}</strong>
                <span>{reservation.requestingUnitName ?? reservation.notes ?? "Bendras prasymas"}</span>
              </td>
              <td>
                <strong>{formatDate(reservation.startDate)}</strong>
                <span>iki {formatDate(reservation.endDate)}</span>
              </td>
              <td>{reservation.reservedByName ?? "-"}</td>
              <td>
                <strong>{reservation.totalItems} irasai</strong>
                <span>{reservation.totalQuantity} vnt.</span>
                <span>{summarizeItems(reservation)}</span>
              </td>
              <td>
                <ReviewBadge label="Padalinys" status={reservation.unitReviewStatus ?? "NOT_REQUIRED"} />
                <ReviewBadge label="Tuntas" status={reservation.topLevelReviewStatus ?? "NOT_REQUIRED"} />
              </td>
              <td><StatusBadge status={reservation.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewBadge({ label, status }: { label: string; status: string }) {
  return (
    <span className={`review-badge review-${status.toLowerCase()}`}>
      {label}: {status.toLowerCase().replaceAll("_", " ")}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll("_", " ");
  return <span className={`status-badge status-${status.toLowerCase()}`}>{normalized}</span>;
}

function summarizeItems(reservation: Reservation) {
  if (reservation.items.length === 0) return "Be inventoriaus irasu";
  return reservation.items.slice(0, 2).map((item) => item.itemName).join(", ") + (reservation.items.length > 2 ? "..." : "");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium"
  }).format(date);
}
