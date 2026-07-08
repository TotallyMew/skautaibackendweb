import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarDays, ClipboardList, Edit3, Euro, Loader2, PackageCheck, UsersRound, type LucideIcon } from "lucide-react";
import { api } from "../api/client";
import type { Event } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { eventTypeLabel, roleLabel, statusLabel } from "../utils/display";

export function EventDetailPage() {
  const { eventId } = useParams();
  const { auth } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = auth?.permissions.some((permission) => permission === "events.manage" || permission.startsWith("events.manage:")) ?? false;

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

  return (
    <section className="detail-page">
      <div className="section-heading">
        <div>
          <Link className="back-link" to="/events">
            <ArrowLeft size={17} aria-hidden="true" />
            Grįžti į renginius
          </Link>
          <h2>{event?.name ?? "Renginys"}</h2>
        </div>
        <div className="toolbar-actions">
          {event && canManage && (
            <Link className="secondary-button" to={`/events/${event.id}/edit`}>
              <Edit3 size={17} aria-hidden="true" />
              Redaguoti
            </Link>
          )}
          {event && <StatusBadge status={event.status} />}
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

      {!isLoading && !error && event && (
        <div className="detail-grid">
          <article className="detail-main">
            <div className="detail-title-row">
              <div>
                <span className="eyebrow">{event.customTypeLabel ?? eventTypeLabel(event.type)}</span>
                <h3>{event.name}</h3>
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

          <aside className="detail-side">
            <DetailFact label="Būsena" value={statusLabel(event.status)} />
            <DetailFact label="Tipas" value={event.customTypeLabel ?? eventTypeLabel(event.type)} />
            <DetailFact label="Suplanuota" value={inventoryPlanned(event)} />
            <DetailFact label="Skirta" value={inventoryAllocated(event)} />
            <DetailFact label="Pirkti" value={itemsNeedingPurchase(event)} />
            <DetailFact label="Biudžetas" value={event.inventoryBudgetAmount != null ? formatPrice(event.inventoryBudgetAmount) : "-"} />
            <DetailFact label="Likutis" value={financeRemaining(event)} />
            <DetailFact label="Sukurta" value={formatDateTime(event.createdAt)} />
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
