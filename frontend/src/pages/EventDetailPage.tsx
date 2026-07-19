import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Boxes, CalendarDays, ClipboardCheck, ClipboardList, Edit3, Euro, Flag, Loader2, PackageCheck, Play, TentTree, Trash2, UsersRound, type LucideIcon } from "lucide-react";
import { api } from "../api/client";
import type { Event } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { displayTitle, eventTypeLabel, roleLabel, statusLabel } from "../utils/display";

export function EventDetailPage() {
  const { eventId } = useParams();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const capabilities = event?.capabilities;

  useEffect(() => {
    if (!eventId || !auth?.token || !auth.activeTuntasId) {
      setEvent(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .getEvent(auth.token, auth.activeTuntasId, eventId)
      .then((response) => {
        if (!isCancelled) {
          setEvent(response);
        }
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Nepavyko įkelti renginio.");
          setEvent(null);
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
  }, [auth?.activeTuntasId, auth?.token, eventId]);

  async function changeStatus(status: "ACTIVE" | "WRAP_UP") {
    if (!eventId || !auth?.token || !auth.activeTuntasId || busyAction) return;
    setBusyAction(status); setError(null); setMessage(null);
    try { await api.updateEvent(auth.token, auth.activeTuntasId, eventId, { status }); setEvent(await api.getEvent(auth.token, auth.activeTuntasId, eventId)); setMessage(status === "ACTIVE" ? "Renginys pradėtas." : "Renginys perduotas užbaigimo etapui."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Renginio būsenos pakeisti nepavyko."); }
    finally { setBusyAction(null); }
  }

  async function cancelEvent() {
    if (!eventId || !auth?.token || !auth.activeTuntasId || busyAction || !window.confirm("Atšaukti šį renginį?")) return;
    setBusyAction("cancel"); setError(null);
    try { await api.deleteEvent(auth.token, auth.activeTuntasId, eventId); navigate("/events"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Renginio atšaukti nepavyko."); setBusyAction(null); }
  }

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to="/events">
            <ArrowLeft size={17} aria-hidden="true" />
            Grįžti į renginius
          </Link>
          <h2>{event ? displayTitle(event.name) : "Renginys"}</h2>
        </div>
        <div className="toolbar-actions event-header-toolbar">
          {event && <StatusBadge status={event.status} />}
          {event && (capabilities?.canManage || capabilities?.canStart || capabilities?.canAdvanceToWrapUp) && <div className="event-header-constructive-actions">
            {capabilities?.canManage && (
              <Link className="secondary-button" to={`/events/${event.id}/edit`}>
                <Edit3 size={17} aria-hidden="true" />
                Redaguoti
              </Link>
            )}
            {capabilities?.canStart && <button className="primary-button compact-primary-button" type="button" disabled={Boolean(busyAction)} onClick={() => void changeStatus("ACTIVE")}><Play size={17} />Pradėti</button>}
            {capabilities?.canAdvanceToWrapUp && <button className="primary-button compact-primary-button" type="button" disabled={Boolean(busyAction)} onClick={() => void changeStatus("WRAP_UP")}><Flag size={17} />Užbaigimo etapas</button>}
          </div>}
          {event && capabilities?.canCancel && <div className="event-header-danger-actions"><button className="icon-button danger-icon-button" type="button" title="Atšaukti renginį" aria-label="Atšaukti renginį" disabled={Boolean(busyAction)} onClick={() => void cancelEvent()}><Trash2 size={17} /></button></div>}
        </div>
      </div>

      {isLoading && (
        <div className="data-panel">
          <div className="table-state">
            <Loader2 className="spin" size={22} aria-hidden="true" />
            Kraunamas renginys...
          </div>
        </div>
      )}

      {error && (
        <div className="inline-alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && <p className="inline-success">{message}</p>}

      {!isLoading && event && (
        <div className="detail-grid">
          <article className="detail-main">
            <div className="detail-title-row">
              <div>
                <span className="eyebrow">{event.customTypeLabel ?? eventTypeLabel(event.type)}</span>
                <h3>{displayTitle(event.name)}</h3>
              </div>
              <div className="quantity-card">
                <strong>{formatDate(event.startDate)}</strong>
                <span>iki {formatDate(event.endDate)}</span>
              </div>
            </div>

            {event.notes && <p className="detail-description">{event.notes}</p>}

            <div className="info-grid">
              <InfoTile icon={CalendarDays} label="Pradžia" value={formatDate(event.startDate)} />
              <InfoTile icon={CalendarDays} label="Pabaiga" value={formatDate(event.endDate)} />
              <InfoTile icon={PackageCheck} label="Inventorius" value={inventorySummary(event)} />
              <InfoTile icon={ClipboardList} label="Trūksta" value={shortageSummary(event)} />
              <InfoTile icon={Euro} label="Išlaidos" value={financeSpent(event)} />
              <InfoTile icon={UsersRound} label="Komanda" value={`${event.eventRoles.length} rolės`} />
            </div>

            <section className="detail-section">
              <h3>Renginio darbo sritys</h3>
              <div className="event-workspace-launcher">
                {capabilities?.canViewStaff && <WorkspaceLink eventId={event.id} section="staff" icon={UsersRound} title="Komanda" description="Rolės ir atsakingi žmonės" />}
                {capabilities?.canViewPlan && <WorkspaceLink eventId={event.id} section="plan" icon={Boxes} title="Inventoriaus planas" description="Poreikiai, šaltiniai ir paskirstymas" />}
                {capabilities?.canViewPastovykles && <WorkspaceLink eventId={event.id} section="pastovykles" icon={TentTree} title="Pastovyklės" description="Stovyklos grupės ir vadovai" />}
                {capabilities?.canViewInventory && <WorkspaceLink eventId={event.id} section="packing" icon={PackageCheck} title="Pakavimas" description="Dėžės ir pakrovimo kontrolė" />}
                {capabilities?.canViewInventory && <WorkspaceLink eventId={event.id} section="movements" icon={ClipboardCheck} title="Judėjimas" description="Išdavimas, grąžinimas ir globa" />}
                {capabilities?.canViewFinance && <WorkspaceLink eventId={event.id} section="purchases" icon={Euro} title="Pirkimai" description="Trūkumai, sąskaitos ir biudžetas" />}
              </div>
            </section>

            <section className="detail-section">
              <h3>Renginio rolės</h3>
              {event.eventRoles.length === 0 ? (
                <p>Rolių dar nėra.</p>
              ) : (
                <div className="event-role-grid">
                  {event.eventRoles.map((role) => (
                    <div className="event-role-card" key={role.id}>
                      <strong>{roleLabel(role.role)}</strong>
                      <span>{role.userName ?? "Nepriskirta"}</span>
                      {role.targetGroup && <small>{role.targetGroup}</small>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </article>

          <aside className="detail-side event-detail-side">
            <section className="detail-fact-group">
              <h3>Renginys</h3>
              <DetailFact label="Būsena" value={statusLabel(event.status)} />
              <DetailFact label="Tipas" value={event.customTypeLabel ?? eventTypeLabel(event.type)} />
            </section>
            <section className="detail-fact-group">
              <h3>Inventoriaus parengtis</h3>
              <DetailFact label="Suplanuota" value={inventoryPlanned(event)} />
              <DetailFact label="Skirta" value={inventoryAllocated(event)} />
              <DetailFact label="Pirkti" value={itemsNeedingPurchase(event)} />
            </section>
            <section className="detail-fact-group">
              <h3>Finansai</h3>
              <DetailFact label="Biudžetas" value={event.inventoryBudgetAmount != null ? formatPrice(event.inventoryBudgetAmount) : "-"} />
              <DetailFact label="Likutis" value={financeRemaining(event)} />
            </section>
            <DetailFact label="Sukurta" value={formatDateTime(event.createdAt)} />
          </aside>
        </div>
      )}
    </section>
  );
}

function WorkspaceLink({ eventId, section, icon: Icon, title, description }: { eventId: string; section: string; icon: LucideIcon; title: string; description: string }) {
  return <Link className="workspace-launch-card" to={`/events/${eventId}/${section}`}><Icon size={20} /><strong>{title}</strong><span>{description}</span></Link>;
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

function inventorySummary(event: Event) {
  const summary = event.inventorySummary;
  if (!summary) return "-";
  return `${summary.totalAllocatedQuantity}/${summary.totalPlannedQuantity} skirta`;
}

function inventoryPlanned(event: Event) {
  return event.inventorySummary ? `${event.inventorySummary.totalPlannedQuantity} vnt.` : "-";
}

function inventoryAllocated(event: Event) {
  return event.inventorySummary ? `${event.inventorySummary.totalAllocatedQuantity} vnt.` : "-";
}

function shortageSummary(event: Event) {
  return event.inventorySummary ? `${event.inventorySummary.totalShortageQuantity} vnt.` : "-";
}

function itemsNeedingPurchase(event: Event) {
  return event.inventorySummary ? `${event.inventorySummary.itemsNeedingPurchase}` : "-";
}

function financeSpent(event: Event) {
  return event.financeSummary ? formatPrice(event.financeSummary.spentTotal) : "-";
}

function financeRemaining(event: Event) {
  if (!event.financeSummary) return "-";
  return event.financeSummary.remainingAmount != null ? formatPrice(event.financeSummary.remainingAmount) : "Nenurodyta";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium"
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("lt-LT", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("lt-LT", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}
