import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarDays, ClipboardList, Loader2, PackageCheck, UserRound, type LucideIcon } from "lucide-react";
import { api } from "../api/client";
import type { SharedInventoryRequest } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { reviewStatusLabel, statusLabel } from "../utils/display";
import { hasPermission } from "../utils/permissions";

export function SharedInventoryRequestDetailPage() {
  const { requestId } = useParams();
  const { auth } = useAuth();
  const [request, setRequest] = useState<SharedInventoryRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unitNotes, setUnitNotes] = useState("");
  const [topLevelNotes, setTopLevelNotes] = useState("");

  const refreshRequest = useCallback(async (showLoading: boolean) => {
    if (!requestId || !auth?.token || !auth.activeTuntasId) {
      setRequest(null);
      return false;
    }
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      setRequest(await api.getSharedInventoryRequest(auth.token, auth.activeTuntasId, requestId));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nepavyko įkelti bendro inventoriaus prašymo.");
      if (showLoading) setRequest(null);
      return false;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [auth?.activeTuntasId, auth?.token, requestId]);

  useEffect(() => { void refreshRequest(true); }, [refreshRequest]);

  async function runAction(action: string, successMessage: string, operation: () => Promise<unknown>) {
    if (busyAction) return;
    setBusyAction(action);
    setError(null);
    setMessage(null);
    try {
      await operation();
      if (await refreshRequest(false)) setMessage(successMessage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Veiksmo atlikti nepavyko.");
    } finally {
      setBusyAction(null);
    }
  }

  function review(level: "unit" | "top", action: "FORWARDED" | "APPROVED" | "REJECTED") {
    if (!requestId || !auth?.token || !auth.activeTuntasId) return;
    const notes = level === "unit" ? unitNotes : topLevelNotes;
    if (action === "REJECTED" && !notes.trim()) {
      setError("Atmetant prašymą nurodykite priežastį.");
      return;
    }
    const operation = level === "unit"
      ? () => api.reviewSharedInventoryRequestUnit(auth.token, auth.activeTuntasId!, requestId, { action, rejectionReason: action === "REJECTED" ? notes.trim() : null })
      : () => api.reviewSharedInventoryRequestTopLevel(auth.token, auth.activeTuntasId!, requestId, { action, rejectionReason: action === "REJECTED" ? notes.trim() : null });
    void runAction(`${level}-${action}`, action === "REJECTED" ? "Prašymas atmestas." : action === "FORWARDED" ? "Prašymas perduotas tunto peržiūrai." : "Prašymas patvirtintas.", operation);
  }

  function cancelRequest() {
    if (!requestId || !auth?.token || !auth.activeTuntasId || !window.confirm("Atšaukti šį paėmimo prašymą?")) return;
    void runAction("cancel", "Prašymas atšauktas.", () => api.deleteSharedInventoryRequest(auth.token, auth.activeTuntasId!, requestId));
  }

  const isOwner = request?.requestedByUserId === auth?.userId;
  const canForward = Boolean(
    request?.needsDraugininkasApproval &&
    !isOwner &&
    request.draugininkasStatus === "PENDING" &&
    request.requestingUnitId &&
    auth?.leadershipUnitIds.includes(request.requestingUnitId) &&
    hasPermission(auth?.permissions, "items.request.forward.bendras")
  );
  const canTopLevelReview = Boolean(
    request?.topLevelStatus === "PENDING" &&
    !isOwner &&
    (!request.needsDraugininkasApproval || request.draugininkasStatus === "FORWARDED") &&
    hasPermission(auth?.permissions, "items.request.approve.bendras")
  );
  const canCancel = Boolean(isOwner && request?.topLevelStatus === "PENDING");

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
      {message && <p className="inline-success" role="status">{message}</p>}

      {!isLoading && request && (
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
            {request.draugininkasRejectionReason && <DetailFact label="Vieneto atmetimo priežastis" value={request.draugininkasRejectionReason} />}
            {request.topLevelRejectionReason && <DetailFact label="Tunto atmetimo priežastis" value={request.topLevelRejectionReason} />}
          </aside>
        </div>
      )}

      {!isLoading && request && (canForward || canTopLevelReview || canCancel) && (
        <section className="form-section" aria-labelledby="shared-request-actions-heading">
          <div className="form-section-heading"><ClipboardList aria-hidden="true" /><div><h3 id="shared-request-actions-heading">Prašymo sprendimai</h3><span>Veiksmai rodomi pagal dabartinį tvirtinimo etapą ir jūsų atsakomybes.</span></div></div>
          {canForward && (
            <ReviewForm title="Vieneto peržiūra" notes={unitNotes} disabled={Boolean(busyAction)} onNotesChange={setUnitNotes} onApprove={() => review("unit", "FORWARDED")} onReject={() => review("unit", "REJECTED")} approveLabel="Perduoti tuntui" />
          )}
          {canTopLevelReview && (
            <ReviewForm title="Tunto peržiūra" notes={topLevelNotes} disabled={Boolean(busyAction)} onNotesChange={setTopLevelNotes} onApprove={() => review("top", "APPROVED")} onReject={() => review("top", "REJECTED")} approveLabel="Patvirtinti" />
          )}
          {canCancel && <div className="form-actions"><button className="primary-button compact-primary-button tone-danger" type="button" disabled={Boolean(busyAction)} onClick={cancelRequest}>Atšaukti prašymą</button></div>}
        </section>
      )}
    </section>
  );
}

function ReviewForm({ title, notes, disabled, onNotesChange, onApprove, onReject, approveLabel }: { title: string; notes: string; disabled: boolean; onNotesChange: (value: string) => void; onApprove: () => void; onReject: () => void; approveLabel: string }) {
  return (
    <form className="form-panel" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onApprove(); }}>
      <div className="form-grid"><label className="form-field wide"><span>{title}: pastabos / atmetimo priežastis</span><textarea rows={2} value={notes} onChange={(event) => onNotesChange(event.target.value)} disabled={disabled} /></label></div>
      <div className="form-actions"><button className="secondary-button" type="button" disabled={disabled} onClick={onReject}>Atmesti</button><button className="primary-button compact-primary-button" type="submit" disabled={disabled}>{approveLabel}</button></div>
    </form>
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
