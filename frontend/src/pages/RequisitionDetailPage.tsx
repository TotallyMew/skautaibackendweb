import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarDays, ClipboardList, Loader2, PackagePlus, ShoppingCart, type LucideIcon } from "lucide-react";
import { api } from "../api/client";
import type { Requisition } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { reviewStatusLabel, statusLabel } from "../utils/display";

export function RequisitionDetailPage() {
  const { requisitionId } = useParams();
  const { auth } = useAuth();
  const [request, setRequest] = useState<Requisition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requisitionId || !auth?.token || !auth.activeTuntasId) {
      setRequest(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .getRequisition(auth.token, auth.activeTuntasId, requisitionId)
      .then((response) => {
        if (!isCancelled) setRequest(response);
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Nepavyko įkelti pirkimo prašymo.");
          setRequest(null);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.activeTuntasId, auth?.token, requisitionId]);

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to="/purchases">
            <ArrowLeft size={17} aria-hidden="true" />
            Grįžti į prašymus
          </Link>
          <h2>{request ? requestTitle(request) : "Pirkimo prašymas"}</h2>
        </div>
        {request && <StatusBadge status={request.status} />}
      </div>

      {isLoading && (
        <div className="data-panel">
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunamas pirkimo prašymas...
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
                <span className="eyebrow">{request.requestingUnitName ?? "Tunto prašymas"}</span>
                <h3>{requestTitle(request)}</h3>
              </div>
              <div className="quantity-card">
                <strong>{totalQuantity(request)} vnt.</strong>
                <span>{request.items.length} eil.</span>
              </div>
            </div>

            {request.notes && <p className="detail-description">{request.notes}</p>}

            <div className="info-grid">
              <InfoTile icon={ShoppingCart} label="Būsena" value={statusLabel(request.status)} />
              <InfoTile icon={ClipboardList} label="Padalinys" value={reviewStatusLabel(request.unitReviewStatus)} />
              <InfoTile icon={ClipboardList} label="Tuntas" value={reviewStatusLabel(request.topLevelReviewStatus)} />
              <InfoTile icon={CalendarDays} label="Reikia iki" value={formatOptionalDate(request.neededByDate)} />
              <InfoTile icon={PackagePlus} label="Įsigyta" value={formatOptionalDate(request.purchasedAt)} />
              <InfoTile icon={PackagePlus} label="Pridėta" value={formatOptionalDate(request.addedToInventoryAt)} />
            </div>

            <section className="detail-section">
              <h3>Prašomos eilutės</h3>
              <div className="table-wrap">
                <table className="data-table compact-data-table">
                  <thead>
                    <tr>
                      <th>Inventorius</th>
                      <th>Kiekis</th>
                      <th>Patvirtinta</th>
                      <th>Pastabos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.itemName}</strong>
                          <span>{item.itemDescription ?? item.requestType}</span>
                        </td>
                        <td>{item.quantityRequested}</td>
                        <td>{item.quantityApproved ?? "-"}</td>
                        <td>{item.rejectionReason ?? item.notes ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </article>

          <aside className="detail-side">
            <DetailFact label="Peržiūros lygis" value={request.reviewLevel} />
            <DetailFact label="Paskutinis veiksmas" value={request.lastAction} />
            <DetailFact label="Sukurta" value={formatDateTime(request.createdAt)} />
            <DetailFact label="Atnaujinta" value={formatDateTime(request.updatedAt)} />
          </aside>
        </div>
      )}
    </section>
  );
}

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

function requestTitle(request: Requisition) {
  return request.items[0]?.itemName ?? "Pirkimo prašymas";
}

function totalQuantity(request: Requisition) {
  return request.items.reduce((sum, item) => sum + item.quantityRequested, 0);
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
