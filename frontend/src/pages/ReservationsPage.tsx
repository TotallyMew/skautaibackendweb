import { useEffect, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, ClipboardList, Eye, Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Reservation, ReservationListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiDataTable, SkautaiEmptyState, SkautaiErrorState, SkautaiPageShell, SkautaiStatusPill, SkautaiTableFooter, SkautaiToolbar, type SkautaiDataTableColumn } from "../components/ui/Skautai";
import { countLabel, finiteCount, reservationStatusLabel, reviewStatusLabel } from "../utils/display";
import { canViewReservations, hasPermission } from "../utils/permissions";

const pageSize = 25;

const statusOptions = [
  { value: "", label: "Visos būsenos" },
  { value: "PENDING", label: "Laukia" },
  { value: "APPROVED", label: "Patvirtintos" },
  { value: "REJECTED", label: "Atmestos" },
  { value: "ACTIVE", label: "Aktyvios" },
  { value: "RETURNED", label: "Grąžintos" },
  { value: "CANCELLED", label: "Atšauktos" }
];

export function ReservationsPage() {
  const { auth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStatus = searchParams.get("status") ?? "";
  const [reservationsState, setReservationsState] = useState<ReservationListResponse | null>(null);
  const [status, setStatus] = useState(() => statusOptions.some((option) => option.value === requestedStatus) ? requestedStatus : "");
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

  const total = finiteCount(reservationsState?.total);
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

  const actions = <>
    <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={!canFetch || isLoading}>
      <RefreshCw size={17} aria-hidden="true" />Atnaujinti
    </button>
    {canCreate && <Link className="primary-button compact-primary-button" to="/reservations/new"><Plus size={17} aria-hidden="true" />Nauja rezervacija</Link>}
  </>;

  function changeStatus(nextStatus: string) {
    setStatus(nextStatus);
    setOffset(0);
    const next = new URLSearchParams(searchParams);
    if (nextStatus) next.set("status", nextStatus);
    else next.delete("status");
    setSearchParams(next, { replace: true });
  }

  return (
    <SkautaiPageShell className="inventory-page" eyebrow="Darbų srautai" title="Rezervacijos"
      description="Valdykite rezervavimo laikotarpius, išdavimą, grąžinimą ir patvirtinimo eigą."
      actions={actions} width="wide">
      <SkautaiToolbar title="Filtrai">
        <div className="filter-bar compact-filter-bar management-filter-bar">
          <select value={status} aria-label="Būsena" onChange={(event) => changeStatus(event.target.value)}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </SkautaiToolbar>

      {error && <SkautaiErrorState description={error} />}
      <div className="data-panel">
        {isLoading && <div className="table-state"><Loader2 className="spin" size={22} aria-hidden="true" />Kraunamos rezervacijos...</div>}
        {!isLoading && !error && reservationsState?.reservations.length === 0 && <SkautaiEmptyState icon={ClipboardList}
          title="Rezervacijų pagal šį filtrą nerasta" description="Pakeiskite būseną arba atnaujinkite sąrašą." />}
        {!isLoading && !error && Boolean(reservationsState?.reservations.length) && <ReservationsTable reservations={reservationsState?.reservations ?? []} />}
        {!error && <SkautaiTableFooter meta={`${total} ${countLabel(total, "įrašas", "įrašai", "įrašų")} · Puslapis ${currentPage} iš ${pageCount}`}>
          <button className="icon-button" type="button" disabled={offset === 0 || isLoading}
            onClick={() => setOffset(Math.max(0, offset - pageSize))} aria-label="Ankstesnis puslapis" title="Ankstesnis puslapis">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" disabled={!reservationsState?.hasMore || isLoading}
            onClick={() => setOffset(offset + pageSize)} aria-label="Kitas puslapis" title="Kitas puslapis">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </SkautaiTableFooter>}
      </div>
    </SkautaiPageShell>
  );
}

function ReservationsTable({ reservations }: { reservations: Reservation[] }) {
  const columns: Array<SkautaiDataTableColumn<Reservation>> = [
    {
      key: "reservation",
      header: "Rezervacija",
      cell: (reservation) => (
        <div className="table-title-cell">
          <span className="record-icon table-cell-icon"><CalendarCheck size={18} aria-hidden="true" /></span>
          <div>
            <Link className="table-link" to={`/reservations/${reservation.id}`}>{reservation.title}</Link>
            <span>{reservation.notes ?? summarizeItems(reservation)}</span>
          </div>
        </div>
      )
    },
    {
      key: "requester",
      header: "Rezervavo",
      cell: (reservation) => (
        <>
          <strong>{reservation.reservedByName ?? "—"}</strong>
          <span>{reservation.requestingUnitName ?? "Tunto rezervacija"}</span>
        </>
      )
    },
    {
      key: "period",
      header: "Laikotarpis",
      cell: (reservation) => (
        <>
          <strong>{formatDate(reservation.startDate)}</strong>
          <span>iki {formatDate(reservation.endDate)}</span>
        </>
      )
    },
    {
      key: "quantity",
      header: "Inventorius",
      cell: (reservation) => {
        const itemCount = finiteCount(reservation.totalItems);
        return (
          <>
            <strong>{finiteCount(reservation.totalQuantity)} vnt.</strong>
            <span>{itemCount} {countLabel(itemCount, "įrašas", "įrašai", "įrašų")}</span>
          </>
        );
      }
    },
    {
      key: "review",
      header: "Patvirtinimas",
      cell: (reservation) => (
        <div className="review-status-stack">
          <ReviewBadge label="Padalinys" status={reservation.unitReviewStatus ?? "NOT_REQUIRED"} />
          <ReviewBadge label="Tuntas" status={reservation.topLevelReviewStatus ?? "NOT_REQUIRED"} />
        </div>
      )
    },
    {
      key: "status",
      header: "Būsena",
      cell: (reservation) => <StatusBadge status={reservation.status} />
    },
    {
      key: "actions",
      header: "",
      mobileLabel: "Veiksmai",
      className: "table-actions-cell",
      cell: (reservation) => (
        <Link className="icon-button" to={`/reservations/${reservation.id}`} aria-label={`Peržiūrėti ${reservation.title}`} title="Peržiūrėti">
          <Eye size={17} aria-hidden="true" />
        </Link>
      )
    }
  ];

  return <SkautaiDataTable rows={reservations} columns={columns} getRowKey={(reservation) => reservation.id} className="management-data-table reservations-data-table" />;
}

function ReviewBadge({ label, status }: { label: string; status: string }) {
  return (
    <span className={`review-badge review-${status.toLowerCase()}`}>
      {label}: {reviewStatusLabel(status)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <SkautaiStatusPill status={status}>{reservationStatusLabel(status)}</SkautaiStatusPill>;
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
