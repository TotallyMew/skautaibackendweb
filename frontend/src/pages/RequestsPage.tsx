import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AlertCircle, Loader2, PackageCheck, RefreshCw, ShieldCheck, ShoppingCart, type LucideProps } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Requisition, RequisitionListResponse, SharedInventoryRequest, SharedInventoryRequestListResponse } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { countLabel, reviewStatusLabel, statusLabel } from "../utils/display";
import { canUseRequisitions, canUseSharedInventoryRequests } from "../utils/permissions";

type RequestTab = "requisitions" | "shared";
type RequestMode = RequestTab | "all";

export function RequestsPage({ mode = "all" }: { mode?: RequestMode }) {
  const { auth } = useAuth();
  const permissions = auth?.permissions;
  const visibleTabs = useMemo(() => {
    const tabs = [
      canUseRequisitions(permissions) ? "requisitions" as const : null,
      canUseSharedInventoryRequests(permissions) ? "shared" as const : null
    ].filter((tab): tab is RequestTab => Boolean(tab));

    if (mode === "all") return tabs;
    return tabs.includes(mode) ? [mode] : [];
  }, [mode, permissions]);

  const canFetchRequisitions = visibleTabs.includes("requisitions");
  const canFetchSharedRequests = visibleTabs.includes("shared");
  const shouldShowTabs = mode === "all" && visibleTabs.length > 1;

  const [requisitionsState, setRequisitionsState] = useState<RequisitionListResponse | null>(null);
  const [sharedRequestsState, setSharedRequestsState] = useState<SharedInventoryRequestListResponse | null>(null);
  const [activeTab, setActiveTab] = useState<RequestTab>(visibleTabs[0] ?? (mode === "shared" ? "shared" : "requisitions"));
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = Boolean(auth?.token && auth.activeTuntasId && visibleTabs.length > 0);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0]);
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    if (!auth?.token || !auth.activeTuntasId || visibleTabs.length === 0) {
      setRequisitionsState(null);
      setSharedRequestsState(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      canFetchRequisitions
        ? api.listRequisitions(auth.token, auth.activeTuntasId).catch(() => null)
        : Promise.resolve(null),
      canFetchSharedRequests
        ? api.listSharedInventoryRequests(auth.token, auth.activeTuntasId).catch(() => null)
        : Promise.resolve(null)
    ])
      .then(([requisitions, sharedRequests]) => {
        if (isCancelled) return;
        setRequisitionsState(requisitions);
        setSharedRequestsState(sharedRequests);
      })
      .catch(() => {
        if (!isCancelled) setError(`Nepavyko užkrauti ${modeLabel(mode, activeTab).toLowerCase()}.`);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab, auth?.activeTuntasId, auth?.token, canFetchRequisitions, canFetchSharedRequests, mode, reloadKey, visibleTabs.length]);

  const requisitionTotal = requisitionsState?.total ?? 0;
  const sharedTotal = sharedRequestsState?.total ?? 0;
  const total = activeTab === "requisitions" ? requisitionTotal : sharedTotal;

  if (visibleTabs.length === 0) {
    return (
      <section className="work-area">
        <ShieldCheck size={34} aria-hidden="true" />
        <div>
          <h2>{unavailableTitle(mode)}</h2>
          <p>{modeUnavailableDescription(mode)}</p>
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
        <button
          className="secondary-button"
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={!canFetch || isLoading}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Atnaujinti
        </button>
      </div>

      {shouldShowTabs && (
        <div className="segmented-tabs" role="tablist" aria-label="Prašymų tipai">
          {visibleTabs.includes("requisitions") && <TabButton active={activeTab === "requisitions"} onClick={() => setActiveTab("requisitions")} label="Pirkimai" count={requisitionTotal} />}
          {visibleTabs.includes("shared") && <TabButton active={activeTab === "shared"} onClick={() => setActiveTab("shared")} label="Paėmimai" count={sharedTotal} />}
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
          <span>{headerMeta(activeTab)}</span>
        </div>

        {isLoading && (
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunami {modeLabel(mode, activeTab).toLowerCase()}...
          </div>
        )}

        {!isLoading && !error && activeTab === "requisitions" && requisitionsState?.requests.length === 0 && (
          <RequestEmptyState icon={ShoppingCart} title="Pirkimo prašymų nėra" description="Kai vienetai pateiks pirkimo ar papildymo prašymus, jie bus rodomi čia." />
        )}

        {!isLoading && !error && activeTab === "requisitions" && Boolean(requisitionsState?.requests.length) && (
          <RequisitionsList requests={requisitionsState?.requests ?? []} />
        )}

        {!isLoading && !error && activeTab === "shared" && sharedRequestsState?.requests.length === 0 && (
          <RequestEmptyState icon={PackageCheck} title="Paėmimo prašymų nėra" description="Bendro inventoriaus paėmimo užklausos bus rodomos čia." />
        )}

        {!isLoading && !error && activeTab === "shared" && Boolean(sharedRequestsState?.requests.length) && (
          <SharedRequestsList requests={sharedRequestsState?.requests ?? []} />
        )}
      </div>
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
            <Link className="record-title" to={`/purchases/${request.id}`}>{requestTitle(request)}</Link>
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
        <span>Paėmimo prašymas</span>
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
            <Link className="record-title" to={`/pickup-requests/${request.id}`}>{sharedRequestTitle(request)}</Link>
            <span>{request.requestingUnitName ?? request.requestedByUserName ?? "Bendro inventoriaus prašymas"}</span>
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

function headerMeta(tab: RequestTab) {
  if (tab === "requisitions") return "Pirkimo ir papildymo prašymai";
  return "Bendro inventoriaus paėmimo prašymai";
}

function modeLabel(mode: RequestMode, activeTab: RequestTab) {
  if (mode === "requisitions" || activeTab === "requisitions") return "pirkimai";
  if (mode === "shared" || activeTab === "shared") return "paėmimai";
  return "prašymai";
}

function unavailableTitle(mode: RequestMode) {
  if (mode === "shared") return "Paėmimai nepasiekiami";
  if (mode === "requisitions") return "Pirkimai nepasiekiami";
  return "Prašymų sritis nepasiekiama";
}

function modeUnavailableDescription(mode: RequestMode) {
  if (mode === "shared") return "Ši sritis skirta bendro inventoriaus paėmimo prašymams.";
  if (mode === "requisitions") return "Ši sritis skirta pirkimo ir papildymo prašymams.";
  return "Ši sritis skirta pirkimo, papildymo ir bendro inventoriaus paėmimo prašymams.";
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
