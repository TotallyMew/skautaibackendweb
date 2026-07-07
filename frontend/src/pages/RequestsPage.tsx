import { useEffect, useState, type ComponentType } from "react";
import { AlertCircle, CalendarCheck, ChevronLeft, ChevronRight, ClipboardList, Loader2, PackageCheck, RefreshCw, ShoppingCart, type LucideProps } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Requisition, RequisitionListResponse, Reservation, ReservationListResponse, SharedInventoryRequest, SharedInventoryRequestListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { countLabel, reviewStatusLabel, statusLabel } from "../utils/display";

const pageSize = 25;

type RequestTab = "reservations" | "requisitions" | "shared";

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
  const [requisitionsState, setRequisitionsState] = useState<RequisitionListResponse | null>(null);
  const [sharedRequestsState, setSharedRequestsState] = useState<SharedInventoryRequestListResponse | null>(null);
  const [activeTab, setActiveTab] = useState<RequestTab>("reservations");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = Boolean(auth?.token && auth.activeTuntasId);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId) {
      setReservationsState(null);
      setRequisitionsState(null);
      setSharedRequestsState(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.allSettled([
      api.listReservations(auth.token, auth.activeTuntasId, {
        status,
        limit: pageSize,
        offset
      }),
      api.listRequisitions(auth.token, auth.activeTuntasId),
      api.listSharedInventoryRequests(auth.token, auth.activeTuntasId)
    ])
      .then(([reservations, requisitions, sharedRequests]) => {
        if (isCancelled) return;

        if (reservations.status === "fulfilled") {
          setReservationsState(reservations.value);
        } else {
          setError("Nepavyko užkrauti rezervacijų.");
          setReservationsState(null);
        }

        setRequisitionsState(requisitions.status === "fulfilled" ? requisitions.value : null);
        setSharedRequestsState(sharedRequests.status === "fulfilled" ? sharedRequests.value : null);
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

  const reservationTotal = reservationsState?.total ?? 0;
  const requisitionTotal = requisitionsState?.total ?? 0;
  const sharedTotal = sharedRequestsState?.total ?? 0;
  const total = activeTab === "reservations" ? reservationTotal : activeTab === "requisitions" ? requisitionTotal : sharedTotal;
  const currentPage = Math.floor(offset / pageSize) + 1;
  const pageCount = Math.max(1, Math.ceil(reservationTotal / pageSize));

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

      <div className="segmented-tabs" role="tablist" aria-label="Prašymų tipai">
        <TabButton active={activeTab === "reservations"} onClick={() => setActiveTab("reservations")} label="Rezervacijos" count={reservationTotal} />
        <TabButton active={activeTab === "requisitions"} onClick={() => setActiveTab("requisitions")} label="Pirkimai" count={requisitionTotal} />
        <TabButton active={activeTab === "shared"} onClick={() => setActiveTab("shared")} label="Bendras inventorius" count={sharedTotal} />
      </div>

      {activeTab === "reservations" && (
        <div className="filter-bar compact-filter-bar">
          <select value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="data-panel">
        <div className="data-panel-header">
          <span>{total} {countLabel(total, "įrašas", "įrašai", "įrašų")}</span>
          <span>{headerMeta(activeTab, currentPage, pageCount)}</span>
        </div>

        {isLoading && (
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunami prašymai...
          </div>
        )}

        {!isLoading && !error && activeTab === "reservations" && reservationsState?.reservations.length === 0 && (
          <RequestEmptyState icon={ClipboardList} title="Rezervacijų pagal šį filtrą nerasta" description="Pakeisk būseną arba atnaujink sąrašą." />
        )}

        {!isLoading && !error && activeTab === "reservations" && Boolean(reservationsState?.reservations.length) && (
          <ReservationsList reservations={reservationsState?.reservations ?? []} />
        )}

        {!isLoading && !error && activeTab === "requisitions" && (
          requisitionsState ? (
            requisitionsState.requests.length > 0 ? <RequisitionsList requests={requisitionsState.requests} /> : <RequestEmptyState icon={ShoppingCart} title="Pirkimo prašymų nėra" description="Kai vienetai pateiks pirkimo ar papildymo prašymus, jie bus rodomi čia." />
          ) : (
            <RequestEmptyState icon={ShoppingCart} title="Pirkimo prašymai nepasiekiami" description="Šiam sąrašui gali reikėti papildomų teisių." />
          )
        )}

        {!isLoading && !error && activeTab === "shared" && (
          sharedRequestsState ? (
            sharedRequestsState.requests.length > 0 ? <SharedRequestsList requests={sharedRequestsState.requests} /> : <RequestEmptyState icon={PackageCheck} title="Bendro inventoriaus prašymų nėra" description="Bendro inventoriaus paėmimo užklausos bus rodomos čia." />
          ) : (
            <RequestEmptyState icon={PackageCheck} title="Bendro inventoriaus prašymai nepasiekiami" description="Šiam sąrašui gali reikėti papildomų teisių." />
          )
        )}
      </div>

      {activeTab === "reservations" && (
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
      )}
    </section>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button className={active ? "active" : ""} type="button" onClick={onClick}>
      {label}
      <span>{count}</span>
    </button>
  );
}

function ReservationsList({ reservations }: { reservations: Reservation[] }) {
  return (
    <div className="record-list">
      <div className="record-header request-record-row" aria-hidden="true">
        <span />
        <span>Prašymas</span>
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

function RequisitionsList({ requests }: { requests: Requisition[] }) {
  return (
    <div className="record-list">
      <div className="record-header request-record-row" aria-hidden="true">
        <span />
        <span>Pirkimo prašymas</span>
        <span>Terminas</span>
        <span>Kiekis</span>
        <span>Būsena</span>
      </div>
      {requests.map((request) => (
        <article className="record-row request-record-row" key={request.id}>
          <div className="record-icon">
            <ShoppingCart size={18} aria-hidden="true" />
          </div>
          <div className="record-main">
            <Link className="record-title" to={`/requests/requisitions/${request.id}`}>{requestTitle(request)}</Link>
            <span>{request.requestingUnitName ?? "Tunto prašymas"}</span>
            <div className="record-chip-row">
              <ReviewBadge label="Padalinys" status={request.unitReviewStatus} />
              <ReviewBadge label="Tuntas" status={request.topLevelReviewStatus} />
            </div>
          </div>
          <div className="record-meta record-date">
            <strong>{formatOptionalDate(request.neededByDate)}</strong>
            <span>Sukurta {formatDate(request.createdAt)}</span>
          </div>
          <div className="record-meta record-quantity">
            <strong>{request.items.length} {countLabel(request.items.length, "eilutė", "eilutės", "eilučių")}</strong>
            <span>{requisitionQuantity(request)} vnt.</span>
            <span>{request.items.slice(0, 2).map((item) => item.itemName).join(", ")}</span>
          </div>
          <StatusBadge status={request.status} />
        </article>
      ))}
    </div>
  );
}

function SharedRequestsList({ requests }: { requests: SharedInventoryRequest[] }) {
  return (
    <div className="record-list">
      <div className="record-header request-record-row" aria-hidden="true">
        <span />
        <span>Bendro inventoriaus prašymas</span>
        <span>Terminas</span>
        <span>Kiekis</span>
        <span>Būsena</span>
      </div>
      {requests.map((request) => (
        <article className="record-row request-record-row" key={request.id}>
          <div className="record-icon">
            <PackageCheck size={18} aria-hidden="true" />
          </div>
          <div className="record-main">
            <Link className="record-title" to={`/requests/shared/${request.id}`}>{sharedRequestTitle(request)}</Link>
            <span>{request.requestingUnitName ?? request.requestedByUserName ?? "Bendras prašymas"}</span>
            <div className="record-chip-row">
              {request.needsDraugininkasApproval && <ReviewBadge label="Padalinys" status={request.draugininkasStatus ?? "PENDING"} />}
              <ReviewBadge label="Tuntas" status={request.topLevelStatus} />
            </div>
          </div>
          <div className="record-meta record-date">
            <strong>{formatOptionalDate(request.neededByDate)}</strong>
            <span>Sukurta {formatDate(request.createdAt)}</span>
          </div>
          <div className="record-meta record-quantity">
            <strong>{sharedRequestQuantity(request)} vnt.</strong>
            <span>{request.items.length > 0 ? `${request.items.length} eil.` : "1 eil."}</span>
            <span>{request.notes ?? ""}</span>
          </div>
          <StatusBadge status={request.topLevelStatus} />
        </article>
      ))}
    </div>
  );
}

function RequestEmptyState({ icon: Icon, title, description }: { icon: ComponentType<LucideProps>; title: string; description: string }) {
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

function headerMeta(tab: RequestTab, currentPage: number, pageCount: number) {
  if (tab === "reservations") return `Puslapis ${currentPage} / ${pageCount}`;
  if (tab === "requisitions") return "Pirkimo ir papildymo prašymai";
  return "Bendro inventoriaus paėmimo prašymai";
}

function summarizeItems(reservation: Reservation) {
  if (reservation.items.length === 0) return "Be inventoriaus įrašų";
  return reservation.items.slice(0, 2).map((item) => item.itemName).join(", ") + (reservation.items.length > 2 ? "..." : "");
}

function requestTitle(request: Requisition) {
  return request.items[0]?.itemName ?? "Pirkimo prašymas";
}

function requisitionQuantity(request: Requisition) {
  return request.items.reduce((sum, item) => sum + item.quantityRequested, 0);
}

function sharedRequestTitle(request: SharedInventoryRequest) {
  return request.items[0]?.itemName ?? request.itemName;
}

function sharedRequestQuantity(request: SharedInventoryRequest) {
  return request.items.length > 0 ? request.items.reduce((sum, item) => sum + item.quantity, 0) : request.quantity;
}

function formatOptionalDate(value?: string | null) {
  return value ? formatDate(value) : "Nenurodyta";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium"
  }).format(date);
}
