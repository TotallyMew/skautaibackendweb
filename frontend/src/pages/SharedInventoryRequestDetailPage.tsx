import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarDays, ClipboardList, Loader2, PackageCheck, UserRound, type LucideIcon } from "lucide-react";
import { api } from "../api/client";
import type { SharedInventoryRequest } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { reviewStatusLabel, statusLabel } from "../utils/display";

export function SharedInventoryRequestDetailPage() {
  const { requestId } = useParams();
  const { auth } = useAuth();
  const [request, setRequest] = useState<SharedInventoryRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId || !auth?.token || !auth.activeTuntasId) {
      setRequest(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .getSharedInventoryRequest(auth.token, auth.activeTuntasId, requestId)
      .then((response) => {
        if (!isCancelled) setRequest(response);
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Nepavyko įkelti bendro inventoriaus prašymo.");
          setRequest(null);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, requestId]);

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to="/pickup-requests">
            <ArrowLeft size={17} aria-hidden="true" />
            Grįžti į prašymus
          </Link>
          <h2>{request ? requestTitle(request) : "Bendro inventoriaus prašymas"}</h2>
        </div>
        {request && <StatusBadge status={request.topLevelStatus} />}
      </div>

      {isLoading && (
        <div className="data-panel">
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunamas prašymas...
          </div>
        </div>
      )}

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && request && (
        <div className="detail-grid">
          <article className="detail-main">
            <div className="detail-title-row">
              <div>
                <span className="eyebrow">{request.requestingUnitName ?? request.requestedByUserName ?? "Bendras prašymas"}</span>
                <h3>{requestTitle(request)}</h3>
              </div>
              <div className="quantity-card">
                <strong>{totalQuantity(request)} vnt.</strong>
                <span>{request.items.length > 0 ? `${request.items.length} eil.` : "1 eil."}</span>
              </div>
            </div>

            {request.notes && <p className="detail-description">{request.notes}</p>}

            <div className="info-grid">
              <InfoTile icon={PackageCheck} label="Tunto būsena" value={reviewStatusLabel(request.topLevelStatus)} />
              <InfoTile icon={ClipboardList} label="Padalinio būsena" value={request.needsDraugininkasApproval ? reviewStatusLabel(request.draugininkasStatus ?? "PENDING") : "Nereikia"} />
              <InfoTile icon={CalendarDays} label="Reikia iki" value={formatOptionalDate(request.neededByDate)} />
              <InfoTile icon={UserRound} label="Pateikė" value={request.requestedByUserName ?? "-"} />
              <InfoTile icon={PackageCheck} label="Vienetas" value={request.requestingUnitName ?? "-"} />
              <InfoTile icon={ClipboardList} label="Atnaujinta" value={formatDateTime(request.updatedAt)} />
            </div>

            <section className="detail-section">
              <h3>Prašomas inventorius</h3>
              <div className="table-wrap">
                <table className="data-table compact-data-table">
                  <thead>
                    <tr>
                      <th>Inventorius</th>
                      <th>Kiekis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestItems(request).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.itemName}</strong>
                          <span>{item.itemDescription ?? "-"}</span>
                        </td>
                        <td>{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </article>

          <aside className="detail-side">
            <DetailFact label="Būsena" value={statusLabel(request.topLevelStatus)} />
            <DetailFact label="Reikia vado" value={request.needsDraugininkasApproval ? "Taip" : "Ne"} />
            <DetailFact label="Renginys" value={request.eventId ?? "-"} />
            <DetailFact label="Sukurta" value={formatDateTime(request.createdAt)} />
            <DetailFact label="Atnaujinta" value={formatDateTime(request.updatedAt)} />
          </aside>
        </div>
      )}
    </section>
  );
}

type DisplayRequestItem = {
  id: string;
  itemName: string;
  itemDescription?: string | null;
  quantity: number;
};

function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="info-tile">
      <Icon size={19} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}

function requestTitle(request: SharedInventoryRequest) {
  return request.items[0]?.itemName ?? request.itemName;
}

function requestItems(request: SharedInventoryRequest): DisplayRequestItem[] {
  if (request.items.length > 0) return request.items;
  return [{
    id: request.itemId ?? request.id,
    itemName: request.itemName,
    itemDescription: request.itemDescription,
    quantity: request.quantity
  }];
}

function totalQuantity(request: SharedInventoryRequest) {
  return requestItems(request).reduce((sum, item) => sum + item.quantity, 0);
}

function formatOptionalDate(value?: string | null) {
  return value ? formatDate(value) : "-";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
